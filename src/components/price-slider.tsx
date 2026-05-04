"use client";

import { formatPrice } from "@/lib/utils";

type PriceSliderProps = {
  min: number;
  max: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
};

export function PriceSlider({ min, max, value, onChange }: PriceSliderProps) {
  const [currentMin, currentMax] = value;
  const range = max - min;
  const left = ((currentMin - min) / range) * 100;
  const right = ((currentMax - min) / range) * 100;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-sm text-slate-600">
        <span>{formatPrice(currentMin)}</span>
        <span>{formatPrice(currentMax)}</span>
      </div>
      <div className="relative py-3">
        <div className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-slate-200" />
        <div
          className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-red-600"
          style={{ left: `${left}%`, right: `${100 - right}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={100}
          value={currentMin}
          onChange={(event) =>
            onChange([Math.min(Number(event.target.value), currentMax - 100), currentMax])
          }
          className="pointer-events-none absolute left-0 top-1/2 h-1 w-full -translate-y-1/2 appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-red-600"
        />
        <input
          type="range"
          min={min}
          max={max}
          step={100}
          value={currentMax}
          onChange={(event) =>
            onChange([currentMin, Math.max(Number(event.target.value), currentMin + 100)])
          }
          className="pointer-events-none absolute left-0 top-1/2 h-1 w-full -translate-y-1/2 appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-red-600"
        />
      </div>
    </div>
  );
}
