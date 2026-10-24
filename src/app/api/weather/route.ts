import type { NextRequest } from "next/server";
import type { DayForecast, HourForecast, WeatherResponse } from "@/lib/weather";

// APIキーはサーバー側だけで読む。NEXT_PUBLIC_ を付けないのでブラウザには渡らない
const API_KEY = process.env.OPENWEATHER_API_KEY;
const BASE = "https://api.openweathermap.org";

type OwmItem = {
  dt: number;
  main: { temp: number; temp_min: number; temp_max: number; humidity: number };
  weather: { description: string; icon: string }[];
  pop?: number;
};

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function owm<T>(path: string, params: Record<string, string>): Promise<T> {
  const query = new URLSearchParams({ ...params, appid: API_KEY ?? "" });
  const res = await fetch(`${BASE}${path}?${query}`, { cache: "no-store" });
  if (res.status === 401) {
    throw new ApiError(
      "APIキーが使えません。発行したばかりのキーは有効になるまで最大2時間ほどかかります。",
      502,
    );
  }
  if (!res.ok) {
    throw new ApiError("天気の取得に失敗しました。少し時間をおいて試してください。", 502);
  }
  return res.json() as Promise<T>;
}

// 都市名 → 緯度経度（日本語名があれば日本語で表示する）
async function geocode(city: string) {
  const list = await owm<
    { name: string; lat: number; lon: number; local_names?: Record<string, string> }[]
  >("/geo/1.0/direct", { q: city, limit: "1" });
  if (list.length === 0) {
    throw new ApiError(`「${city}」が見つかりませんでした。別の書き方で試してください。`, 404);
  }
  const hit = list[0];
  return { lat: String(hit.lat), lon: String(hit.lon), name: hit.local_names?.ja ?? hit.name };
}

// UNIX時間とタイムゾーンのずれ（秒）から、現地の日付と時刻を作る
function localParts(dt: number, offset: number) {
  const iso = new Date((dt + offset) * 1000).toISOString();
  return { date: iso.slice(0, 10), time: iso.slice(11, 16) };
}

// 3時間ごとの予報を日ごとにまとめる
function groupByDay(items: OwmItem[], offset: number): DayForecast[] {
  const byDate = new Map<string, { item: OwmItem; time: string }[]>();
  for (const item of items) {
    const { date, time } = localParts(item.dt, offset);
    byDate.set(date, [...(byDate.get(date) ?? []), { item, time }]);
  }

  return [...byDate].map(([date, entries]) => {
    const hours: HourForecast[] = entries.map(({ item, time }) => ({
      time,
      temp: Math.round(item.main.temp),
      pop: Math.round((item.pop ?? 0) * 100),
      icon: item.weather[0].icon,
      description: item.weather[0].description,
    }));
    // その日の代表の天気は、お昼に近い時間帯のものを使う
    const noon = entries.reduce((best, e) =>
      Math.abs(Number(e.time.slice(0, 2)) - 12) < Math.abs(Number(best.time.slice(0, 2)) - 12)
        ? e
        : best,
    ).item;
    return {
      date,
      max: Math.round(Math.max(...entries.map((e) => e.item.main.temp_max))),
      min: Math.round(Math.min(...entries.map((e) => e.item.main.temp_min))),
      humidity: Math.round(
        entries.reduce((sum, e) => sum + e.item.main.humidity, 0) / entries.length,
      ),
      pop: Math.max(...hours.map((h) => h.pop)),
      icon: noon.weather[0].icon,
      description: noon.weather[0].description,
      hours,
    };
  });
}

export async function GET(request: NextRequest) {
  if (!API_KEY) {
    return Response.json(
      { error: "サーバーにAPIキー（OPENWEATHER_API_KEY）が設定されていません。" },
      { status: 500 },
    );
  }

  const params = request.nextUrl.searchParams;
  const city = params.get("city")?.trim();
  const lat = params.get("lat");
  const lon = params.get("lon");

  try {
    let place: { lat: string; lon: string; name?: string };
    if (lat && lon) {
      place = { lat, lon };
    } else if (city) {
      place = await geocode(city);
    } else {
      throw new ApiError("都市名か現在地を指定してください。", 400);
    }

    const common = { lat: place.lat, lon: place.lon, units: "metric", lang: "ja" };
    const [current, forecast] = await Promise.all([
      owm<{
        name: string;
        timezone: number;
        dt: number;
        main: { temp: number; feels_like: number; humidity: number };
        wind: { speed: number };
        weather: { description: string; icon: string }[];
      }>("/data/2.5/weather", common),
      owm<{ list: OwmItem[]; city: { timezone: number } }>("/data/2.5/forecast", common),
    ]);

    const body: WeatherResponse = {
      place: place.name ?? current.name,
      today: localParts(current.dt, current.timezone).date,
      current: {
        temp: Math.round(current.main.temp),
        feelsLike: Math.round(current.main.feels_like),
        humidity: current.main.humidity,
        windSpeed: Math.round(current.wind.speed * 10) / 10,
        icon: current.weather[0].icon,
        description: current.weather[0].description,
      },
      days: groupByDay(forecast.list, forecast.city.timezone),
    };
    return Response.json(body);
  } catch (e) {
    if (e instanceof ApiError) {
      return Response.json({ error: e.message }, { status: e.status });
    }
    return Response.json({ error: "予期しないエラーが起きました。" }, { status: 500 });
  }
}
