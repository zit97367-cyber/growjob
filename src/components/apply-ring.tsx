"use client";

type Props = {
  used: number;
  total: number;
};

export function ApplyRing({ used, total }: Props) {
  const safeTotal = Math.max(1, total);
  const left = Math.max(0, total - used);
  const pct = Math.max(0, Math.min(100, Math.round((left / safeTotal) * 100)));

  return (
    <div
      className="relative h-20 w-20 rounded-full p-[6px]"
      style={{
        background: `conic-gradient(#7ce5c0 ${pct}%, rgba(255,255,255,0.2) ${pct}%)`,
      }}
    >
      <div className="flex h-full w-full items-center justify-center rounded-full bg-[#0d3b32] text-white">
        <div className="text-center">
          <p className="text-2xl font-semibold leading-none">{left}</p>
          <p className="text-[9px] uppercase tracking-wide text-emerald-100/90">left</p>
        </div>
      </div>
    </div>
  );
}
