"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import ForecastCalendar from "@/components/ForecastCalendar";
import HourlyChart from "@/components/HourlyChart";
import { getServerSnapshot, getSnapshot, subscribe, toggleFavorite } from "@/lib/favorites";
import { adviceFor, formatDate, iconToEmoji, laundryFor, type WeatherResponse } from "@/lib/weather";

// 日本語の短い地名だと同じ漢字の海外の地名が先に見つかる（「福岡」→中国の仏岡県など）ので、
// 検索には英語名＋国コードを使う
const QUICK_CITIES = [
  { label: "東京", query: "Tokyo,JP" },
  { label: "大阪", query: "Osaka,JP" },
  { label: "札幌", query: "Sapporo,JP" },
  { label: "福岡", query: "Fukuoka,JP" },
  { label: "那覇", query: "Naha,JP" },
];
const STORAGE_KEY = "weather-last-city";

type Query = { city: string } | { lat: number; lon: number };

async function fetchWeather(query: Query): Promise<WeatherResponse> {
  const params = new URLSearchParams(
    "city" in query ? { city: query.city } : { lat: String(query.lat), lon: String(query.lon) },
  );
  const res = await fetch(`/api/weather?${params}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "天気の取得に失敗しました。");
  return json as WeatherResponse;
}

export default function Home() {
  const [input, setInput] = useState("");
  const [data, setData] = useState<WeatherResponse | null>(null);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const favorites = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const show = useCallback((weather: WeatherResponse, query: Query) => {
    setData(weather);
    setSelected(weather.days[0]?.date ?? "");
    setLoading(false);
    if ("city" in query) {
      try {
        localStorage.setItem(STORAGE_KEY, query.city);
      } catch {}
    }
  }, []);

  const showError = useCallback((e: unknown) => {
    setError(e instanceof Error ? e.message : "天気の取得に失敗しました。");
    setLoading(false);
  }, []);

  function load(query: Query) {
    setNotice("");
    setLoading(true);
    setError("");
    fetchWeather(query).then((w) => show(w, query), showError);
  }

  // 最初は前回見た都市（なければ東京）を表示する
  useEffect(() => {
    let city = "東京";
    try {
      city = localStorage.getItem(STORAGE_KEY) ?? city;
    } catch {}
    fetchWeather({ city }).then((w) => show(w, { city }), showError);
  }, [show, showError]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const city = input.trim();
    if (!city) {
      setError("都市名を入力してください。");
      return;
    }
    load({ city });
  }

  function handleLocate() {
    if (!navigator.geolocation) {
      setError("このブラウザでは現在地を使えません。");
      return;
    }
    setLoading(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => load({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => {
        setLoading(false);
        setError("現在地を取得できませんでした。位置情報の許可を確認してください。");
      },
      { timeout: 10000 },
    );
  }

  const day = data?.days.find((d) => d.date === selected);
  const advice = day && adviceFor(day);
  const laundry = day && laundryFor(day);
  const isFavorite = !!data && favorites.includes(data.place);

  function handleFavorite() {
    if (!data) return;
    const added = toggleFavorite(data.place);
    setNotice(added ? `★ ${data.place}をお気に入りに追加しました` : `${data.place}をお気に入りから外しました`);
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12">
      <header className="mb-6">
        <h1 className="text-2xl font-bold sm:text-3xl">お天気カレンダー</h1>
        <p className="mt-1 text-ink-soft">都市を選んで、カレンダーから見たい日をタップしてね。</p>
      </header>

      <form onSubmit={handleSearch} className="flex gap-2">
        <label htmlFor="city" className="sr-only">
          都市名
        </label>
        <input
          id="city"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="都市名（例：横浜、London）"
          className="h-12 min-w-0 flex-1 rounded-xl border border-line bg-surface px-4 text-base outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={loading}
          className="h-12 shrink-0 rounded-xl bg-accent px-5 font-bold text-white hover:bg-accent-strong disabled:opacity-60"
        >
          検索
        </button>
      </form>

      {/* お気に入りの街。いちばんよく使うので、検索欄のすぐ下に置く */}
      <section aria-labelledby="fav-heading" className="mt-4">
        <h2 id="fav-heading" className="mb-2 text-sm font-bold text-ink-soft">
          ★ お気に入り
        </h2>
        {favorites.length === 0 ? (
          <p className="text-sm text-ink-faint">街の名前の横にある「☆ お気に入り」を押すと、ここに並びます。</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {favorites.map((city) => (
              <button
                key={city}
                type="button"
                onClick={() => load({ city })}
                disabled={loading}
                aria-current={data?.place === city ? "true" : undefined}
                className={`h-11 rounded-full border px-4 text-sm font-bold disabled:opacity-60 ${
                  data?.place === city
                    ? "border-star bg-star-soft text-ink"
                    : "border-star/60 bg-surface text-ink hover:border-star"
                }`}
              >
                <span aria-hidden className="mr-1 text-star">★</span>
                {city}
              </button>
            ))}
          </div>
        )}
      </section>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleLocate}
          disabled={loading}
          className="h-11 rounded-full border border-accent px-4 text-sm font-bold text-accent hover:bg-accent-soft disabled:opacity-60"
        >
          📍 現在地
        </button>
        {QUICK_CITIES.map(({ label, query }) => (
          <button
            key={label}
            type="button"
            onClick={() => load({ city: query })}
            disabled={loading}
            className="h-11 rounded-full border border-line bg-surface px-4 text-sm hover:border-accent disabled:opacity-60"
          >
            {label}
          </button>
        ))}
      </div>

      <div aria-live="polite" className="mt-4 min-h-6">
        {loading && <p className="text-ink-soft">天気を取りに行っています…</p>}
        {notice && !loading && !error && <p className="text-ink-soft">{notice}</p>}
        {error && !loading && (
          <p role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-danger">
            ⚠️ {error}
          </p>
        )}
      </div>

      {data && (
        <div className={`mt-2 space-y-5 transition-opacity ${loading ? "opacity-50" : ""}`}>
          {/* いまの天気 */}
          <section className="rounded-2xl bg-accent p-5 text-white shadow-md">
            <div className="flex items-start justify-between gap-3">
              <p className="pt-2 text-sm opacity-90">いまの {data.place}</p>
              <button
                type="button"
                onClick={handleFavorite}
                aria-pressed={isFavorite}
                className="h-11 shrink-0 rounded-full bg-white/15 px-4 text-sm font-bold hover:bg-white/25"
              >
                {isFavorite ? "★ お気に入り済み" : "☆ お気に入り"}
              </button>
            </div>
            <div className="mt-1 flex items-center gap-4">
              <span className="text-6xl leading-none" aria-hidden>
                {iconToEmoji(data.current.icon)}
              </span>
              <div>
                <p className="text-5xl font-bold">{data.current.temp}°C</p>
                <p className="mt-1">{data.current.description}</p>
              </div>
            </div>
            <dl className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
              <div className="rounded-xl bg-white/15 py-2">
                <dt className="opacity-90">体感</dt>
                <dd className="text-lg font-bold">{data.current.feelsLike}°</dd>
              </div>
              <div className="rounded-xl bg-white/15 py-2">
                <dt className="opacity-90">湿度</dt>
                <dd className="text-lg font-bold">{data.current.humidity}%</dd>
              </div>
              <div className="rounded-xl bg-white/15 py-2">
                <dt className="opacity-90">風速</dt>
                <dd className="text-lg font-bold">{data.current.windSpeed}m/s</dd>
              </div>
            </dl>
          </section>

          <ForecastCalendar
            days={data.days}
            today={data.today}
            selected={selected}
            onSelect={setSelected}
          />

          {/* 選んだ日の予報 */}
          {day && (
            <section className="rounded-2xl border border-line bg-surface p-5">
              <h2 className="text-lg font-bold">
                {formatDate(day.date)}
                {day.date === data.today && "・今日"}の予報
              </h2>
              <div className="mt-3 flex items-center gap-4">
                <span className="text-5xl leading-none" aria-hidden>
                  {iconToEmoji(day.icon)}
                </span>
                <p className="text-xl font-bold">{day.description}</p>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
                <div className="rounded-xl bg-background py-3">
                  <dt className="text-sm text-ink-soft">最高気温</dt>
                  <dd className="text-xl font-bold text-sun">{day.max}°C</dd>
                </div>
                <div className="rounded-xl bg-background py-3">
                  <dt className="text-sm text-ink-soft">最低気温</dt>
                  <dd className="text-xl font-bold text-sat">{day.min}°C</dd>
                </div>
                <div className="rounded-xl bg-background py-3">
                  <dt className="text-sm text-ink-soft">降水確率</dt>
                  <dd className="text-xl font-bold">{day.pop}%</dd>
                </div>
                <div className="rounded-xl bg-background py-3">
                  <dt className="text-sm text-ink-soft">湿度</dt>
                  <dd className="text-xl font-bold">{day.humidity}%</dd>
                </div>
              </dl>

              {advice && (
                <div className="mt-4 rounded-xl border border-accent bg-accent-soft p-4">
                  <h3 className="mb-2 font-bold">お出かけアドバイス</h3>
                  <ul className="space-y-1.5">
                    <li>{advice.umbrella}</li>
                    <li>{advice.clothes}</li>
                    {advice.note && <li>{advice.note}</li>}
                    {laundry && (
                      <li>
                        {laundry.label}
                        <span className="ml-1 text-sm text-ink-soft">（{laundry.reason}）</span>
                      </li>
                    )}
                  </ul>
                </div>
              )}

              <h3 className="mt-5 font-bold">3時間ごとのグラフ</h3>
              <HourlyChart hours={day.hours} />

              <h3 className="mt-4 mb-2 font-bold">3時間ごとの天気</h3>
              <ol className="flex gap-2 overflow-x-auto pb-2">
                {day.hours.map((h) => (
                  <li
                    key={h.time}
                    className="flex min-w-18 shrink-0 flex-col items-center gap-1 rounded-xl bg-background px-2 py-3 text-sm"
                  >
                    <span className="text-ink-soft">{h.time}</span>
                    <span className="text-2xl leading-none" aria-label={h.description}>
                      {iconToEmoji(h.icon)}
                    </span>
                    <span className="font-bold">{h.temp}°</span>
                    <span className="text-xs text-accent">☔ {h.pop}%</span>
                  </li>
                ))}
              </ol>
              {day.hours.length < 8 && (
                <p className="mt-1 text-sm text-ink-faint">
                  {day.date === data.today
                    ? "今日の分は、これから先の時間帯だけ表示しています。"
                    : "無料の予報は5日先までなので、この日はデータがある時間帯だけ表示しています。"}
                </p>
              )}
            </section>
          )}
        </div>
      )}

      <footer className="mt-10 text-center text-xs text-ink-faint">
        天気データ：
        <a href="https://openweathermap.org/" className="underline" target="_blank" rel="noreferrer">
          OpenWeatherMap
        </a>
      </footer>
    </main>
  );
}
