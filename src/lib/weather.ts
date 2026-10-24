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
