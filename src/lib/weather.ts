// 画面とAPIの両方で使う型と、ちょっとした変換関数

export type HourForecast = {
  time: string; // "15:00"
  temp: number;
  pop: number; // 降水確率 0〜100
  icon: string;
  description: string;
};

export type DayForecast = {
  date: string; // "2026-10-24"（現地の日付）
  max: number;
  min: number;
  humidity: number; // その日の平均
  pop: number; // その日のいちばん高い降水確率
  icon: string;
  description: string;
  hours: HourForecast[];
};

export type CurrentWeather = {
  temp: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  icon: string;
  description: string;
};

export type WeatherResponse = {
  place: string;
  today: string; // 現地の今日の日付
  current: CurrentWeather;
  days: DayForecast[];
};

// OpenWeatherMap のアイコンコード（"10d" など）を絵文字に置き換える
const ICONS: Record<string, string> = {
  "01": "☀️",
  "02": "🌤️",
  "03": "⛅",
  "04": "☁️",
  "09": "🌧️",
  "10": "🌦️",
  "11": "⛈️",
  "13": "❄️",
  "50": "🌫️",
};

export function iconToEmoji(icon: string) {
  const emoji = ICONS[icon.slice(0, 2)] ?? "🌡️";
  // 夜の晴れは月にする
  return icon === "01n" ? "🌙" : emoji;
}

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

// "2026-10-24" → "10月24日（土）"
export function formatDate(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${m}月${d}日（${weekday}）`;
}

export type Advice = { umbrella: string; clothes: string; note?: string };

// 選んだ日の予報から、出かける前に知りたい「傘」と「服装」をひとことにする
export function adviceFor(day: DayForecast): Advice {
  // 雨が始まりそうな時間は、降水確率が50%以上になる最初のコマ
  const rainStart = day.hours.find((h) => h.pop >= 50);
  let umbrella: string;
  if (day.pop >= 50) {
    umbrella = `☂️ 傘を持っていこう（${rainStart?.time ?? ""}ごろから降水確率${rainStart?.pop ?? day.pop}%）`;
  } else if (day.pop >= 20) {
    umbrella = `🌂 折りたたみ傘があると安心（降水確率は最大${day.pop}%）`;
  } else {
    umbrella = `🙆 傘はいらなさそう（降水確率は最大${day.pop}%）`;
  }

  let clothes: string;
  if (day.max >= 28) clothes = "👕 半袖で過ごせる暑さ。水分補給も忘れずに";
  else if (day.max >= 23) clothes = "👔 長袖シャツ1枚くらいがちょうどいい";
  else if (day.max >= 18) clothes = "🧥 カーディガンや薄手の上着があると安心";
  else if (day.max >= 13) clothes = "🧥 ジャケットやパーカーを着ていこう";
  else if (day.max >= 8) clothes = "🧥 コートが必要な寒さ";
  else clothes = "🧣 厚手のコートとマフラーでしっかり防寒";

  const note =
    day.max - day.min >= 8
      ? `🌡️ 最高と最低の差が${day.max - day.min}°あるので、朝晩は脱ぎ着しやすい服で`
      : undefined;

  return { umbrella, clothes, note };
}

export type Laundry = { level: "good" | "ok" | "bad"; label: string; reason: string };

// 洗濯物を外に干す時間帯（9時〜15時）の降水確率と湿度で、乾きやすさを3段階にする
export function laundryFor(day: DayForecast): Laundry {
  const daytime = day.hours.filter((h) => h.time >= "09:00" && h.time <= "15:00");
  // 今日の夕方以降など昼のデータがないときは、ある時間帯で判断する
  const hours = daytime.length > 0 ? daytime : day.hours;
  const pop = Math.max(...hours.map((h) => h.pop));
  const reason = `昼の降水確率 最大${pop}%・湿度${day.humidity}%`;
  if (pop < 20 && day.humidity < 70) {
    return { level: "good", label: "👕 洗濯びより！外干しでよく乾きます", reason };
  }
  if (pop < 40 && day.humidity < 80) {
    return { level: "ok", label: "👕 外干しOK。乾きにくいので早めに取り込もう", reason };
  }
  return { level: "bad", label: "🏠 部屋干しがおすすめ", reason };
}

// 3時間ごとの予報から「何時ごろ降り始めて、何時ごろやむか」を文にする。
// 雨かどうかは、傘のアドバイスと同じく降水確率50%以上で判断する
export function rainTimeline(day: DayForecast): string[] {
  const { hours } = day;
  const spans: string[] = [];
  let i = 0;
  while (i < hours.length) {
    if (hours[i].pop < 50) {
      i++;
      continue;
    }
    let j = i;
    while (j + 1 < hours.length && hours[j + 1].pop >= 50) j++;
    const start = i === 0 ? `${hours[i].time}の時点で雨` : `${hours[i].time}ごろから雨`;
    const end =
      j + 1 < hours.length
        ? `${hours[j + 1].time}ごろにはやみそう`
        : `${hours[j].time}以降も続きそう`;
    spans.push(`${start}、${end}`);
    i = j + 1;
  }
  return spans;
}
