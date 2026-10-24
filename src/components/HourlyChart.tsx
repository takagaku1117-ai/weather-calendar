import type { HourForecast } from "@/lib/weather";

// 3時間ごとの気温（折れ線）と降水確率（棒）を1枚の図にする。
// ライブラリは使わず、数字から点の位置を計算して SVG に描く
const W = 320;
const H = 170;
const TEMP_TOP = 26; // 気温の線を描く範囲（上端と下端）
const TEMP_BOTTOM = 78;
const BAR_TOP = 96; // 降水確率の棒を描く範囲
const BAR_BOTTOM = 140;

export default function HourlyChart({ hours }: { hours: HourForecast[] }) {
  if (hours.length === 0) return null;

  const temps = hours.map((h) => h.temp);
  const max = Math.max(...temps);
  const min = Math.min(...temps);
  // 気温差が小さい日でも線が平らになりすぎないよう、最低3°の幅をとる
  const range = Math.max(max - min, 3);
  // 幅を広げたぶんは上下に半分ずつ振って、線が真ん中あたりに来るようにする
  const low = (max + min) / 2 - range / 2;
  const step = W / hours.length;
  const x = (i: number) => step * (i + 0.5);
  const y = (temp: number) => TEMP_BOTTOM - ((temp - low) / range) * (TEMP_BOTTOM - TEMP_TOP);
  const line = hours.map((h, i) => `${x(i)},${y(h.temp)}`).join(" ");
  const barWidth = Math.min(step * 0.5, 22);

  const summary = hours.map((h) => `${h.time} ${h.temp}度 降水${h.pop}%`).join("、");

  return (
    <figure className="mt-4">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`3時間ごとのグラフ：${summary}`} className="w-full">
        {/* 降水確率の棒（背景に100%の薄い枠を置いて、どれくらいかを分かりやすく） */}
        {hours.map((h, i) => {
          const barH = (h.pop / 100) * (BAR_BOTTOM - BAR_TOP);
          return (
            <g key={`bar-${h.time}`}>
              <rect
                x={x(i) - barWidth / 2}
                y={BAR_TOP}
                width={barWidth}
                height={BAR_BOTTOM - BAR_TOP}
                rx={3}
                className="fill-accent-soft"
              />
              <rect
                x={x(i) - barWidth / 2}
                y={BAR_BOTTOM - barH}
                width={barWidth}
                height={barH}
                rx={3}
                className="fill-accent"
              />
              <text x={x(i)} y={BAR_TOP - 4} textAnchor="middle" fontSize={10} className="fill-accent">
                {h.pop}%
              </text>
            </g>
          );
        })}

        {/* 気温の折れ線 */}
        <polyline points={line} fill="none" strokeWidth={2.5} strokeLinejoin="round" className="stroke-sun" />
        {hours.map((h, i) => (
          <g key={`temp-${h.time}`}>
            <circle cx={x(i)} cy={y(h.temp)} r={3.5} className="fill-sun" />
            <text x={x(i)} y={y(h.temp) - 8} textAnchor="middle" fontSize={11} fontWeight="bold" className="fill-ink">
              {h.temp}°
            </text>
          </g>
        ))}

        {/* 時刻 */}
        {hours.map((h, i) => (
          <text key={`time-${h.time}`} x={x(i)} y={H - 12} textAnchor="middle" fontSize={10} className="fill-ink-soft">
            {h.time.replace(/^0/, "")}
          </text>
        ))}
      </svg>
      <figcaption className="mt-1 flex justify-center gap-4 text-sm text-ink-soft">
        {/* 色だけに頼らず、線と棒の形でも区別できるようにする */}
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-0.5 w-5 rounded bg-sun" />
          気温（線）
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-3 w-2.5 rounded-sm bg-accent" />
          降水確率（棒）
        </span>
      </figcaption>
    </figure>
  );
}
