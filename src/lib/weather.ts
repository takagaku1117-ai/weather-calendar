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
