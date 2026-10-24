"use client";

import { useState } from "react";
import { iconToEmoji, laundryFor, type DayForecast } from "@/lib/weather";

type Props = {
  days: DayForecast[];
  today: string;
  selected: string;
  onSelect: (date: string) => void;
};

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

function monthKey(date: string) {
  return date.slice(0, 7); // "2026-10"
}

function shiftMonth(key: string, diff: number) {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + diff, 1));
  return d.toISOString().slice(0, 7);
}

export default function ForecastCalendar({ days, today, selected, onSelect }: Props) {
  // 選んだ日が別の月になったら、その月を表示する
  const [shownMonth, setShownMonth] = useState(monthKey(selected));
  const [lastSelected, setLastSelected] = useState(selected);
  if (selected !== lastSelected) {
    setLastSelected(selected);
    setShownMonth(monthKey(selected));
  }

  const byDate = new Map(days.map((d) => [d.date, d]));
  const months = new Set(days.map((d) => monthKey(d.date)));
  const prevMonth = shiftMonth(shownMonth, -1);
  const nextMonth = shiftMonth(shownMonth, 1);

  const [y, m] = shownMonth.split("-").map(Number);
  const firstWeekday = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells: (string | null)[] = [
    ...Array<null>(firstWeekday).fill(null),
    ...Array.from({ length: lastDay }, (_, i) => `${shownMonth}-${String(i + 1).padStart(2, "0")}`),
  ];

  return (
    <section className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setShownMonth(prevMonth)}
          disabled={!months.has(prevMonth)}
          aria-label="前の月"
          className="h-11 w-11 rounded-full text-xl text-ink-soft hover:bg-background disabled:invisible"
        >
          ‹
        </button>
        <h2 className="text-lg font-bold">
          {y}年{m}月
        </h2>
        <button
          type="button"
          onClick={() => setShownMonth(nextMonth)}
          disabled={!months.has(nextMonth)}
          aria-label="次の月"
          className="h-11 w-11 rounded-full text-xl text-ink-soft hover:bg-background disabled:invisible"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((w, i) => (
          <div
            key={w}
            className={`pb-1 text-sm font-medium ${i === 0 ? "text-sun" : i === 6 ? "text-sat" : "text-ink-faint"}`}
          >
            {w}
          </div>
        ))}

        {cells.map((date, i) => {
          if (!date) return <div key={`blank-${i}`} />;
          const day = byDate.get(date);
          const dayNum = Number(date.slice(8));
          const isSelected = date === selected;

          if (!day) {
            return (
              <div
                key={date}
                className="flex min-h-10 items-start justify-center pt-2 text-sm text-ink-faint/60"
              >
                {dayNum}
              </div>
            );
          }

          const laundryGood = laundryFor(day).level === "good";
          return (
            <button
              key={date}
              type="button"
              onClick={() => onSelect(date)}
              aria-pressed={isSelected}
              aria-label={`${m}月${dayNum}日 ${day.description} 最高${day.max}度${laundryGood ? " 洗濯びより" : ""}`}
              className={`flex min-h-16 flex-col items-center justify-start gap-0.5 rounded-xl pt-1.5 pb-1 text-sm transition ${
                isSelected
                  ? "bg-accent text-white shadow-md"
                  : "bg-accent-soft text-ink hover:ring-2 hover:ring-accent"
              }`}
            >
              <span className="font-bold">
                {dayNum}
                {date === today && <span className="ml-0.5 text-xs font-normal">今日</span>}
              </span>
              <span className="text-lg leading-none" aria-hidden>
                {iconToEmoji(day.icon)}
              </span>
              <span className="text-xs">{day.max}°</span>
              {laundryGood && (
                <span className="text-xs leading-none" aria-hidden>
                  👕
                </span>
              )}
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-sm text-ink-faint">
        色のついた日（今日から5日先まで）をタップすると、その日の予報に切り替わります。
      </p>
      <p className="mt-1 text-sm text-ink-faint">👕 は洗濯びより（昼に雨が降りにくく、湿度も低い日）です。</p>
    </section>
  );
}
