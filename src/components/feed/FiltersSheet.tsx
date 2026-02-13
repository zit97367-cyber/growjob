"use client";

import { MAIN_CATEGORIES } from "@/lib/jobFilters";

type Props = {
  open: boolean;
  onClose: () => void;
  category: string;
  setCategory: (value: string) => void;
  salaryFloorK: number;
  setSalaryFloorK: (value: number) => void;
};

export function FiltersSheet({ open, onClose, category, setCategory, salaryFloorK, setSalaryFloorK }: Props) {
  return (
    <>
      <div className={`sheet-overlay ${open ? "open" : ""}`} onClick={onClose} />
      <aside className={`filters-sheet ${open ? "open" : ""}`}>
        <div className="flex items-center justify-between">
          <p className="card-title">Advanced Filters</p>
          <button className="action-btn" onClick={onClose}>Done</button>
        </div>

        <p className="soft-text mt-3">Main category</p>
        <div className="tag-cloud mt-2">
          {MAIN_CATEGORIES.map((item) => (
            <button
              key={item.value}
              className={`filter-chip ${category === item.value ? "active" : ""}`}
              onClick={() => setCategory(category === item.value ? "" : item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between">
            <p className="card-title">Salary floor</p>
            <span className="soft-text">${salaryFloorK}k+</span>
          </div>
          <input
            className="mt-2 w-full accent-emerald-700"
            type="range"
            min={10}
            max={500}
            step={5}
            value={salaryFloorK}
            onChange={(e) => setSalaryFloorK(Number(e.target.value))}
          />
        </div>
      </aside>
    </>
  );
}
