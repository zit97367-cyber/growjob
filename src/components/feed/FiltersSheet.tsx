"use client";

import { useState } from "react";

const ROLE_OPTIONS = [
  "Engineering",
  "Marketing",
  "Design",
  "Data",
  "Product",
  "Sales",
  "Operations",
  "Community",
  "Other",
];

const REGION_OPTIONS = ["US", "Europe", "APAC", "Middle East", "Africa"];
const WORK_STYLE_OPTIONS = ["On-site", "Hybrid", "Remote"];

type Props = {
  onClose: () => void;
  roles: string[];
  regions: string[];
  workStyles: string[];
  salaryFloorK: number;
  onSave: (next: { roles: string[]; regions: string[]; workStyles: string[]; salaryFloorK: number }) => void;
};

function MultiToggle(props: { title: string; options: string[]; selected: string[]; onToggle: (value: string) => void }) {
  return (
    <div className="mt-4">
      <p className="card-title">{props.title}</p>
      <div className="tag-cloud mt-2">
        {props.options.map((option) => {
          const active = props.selected.includes(option);
          return (
            <button
              key={option}
              type="button"
              className={`filter-chip ${active ? "active" : ""}`}
              onClick={() => props.onToggle(option)}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function FiltersSheet({ onClose, roles, regions, workStyles, salaryFloorK, onSave }: Props) {
  const [draftRoles, setDraftRoles] = useState<string[]>(roles);
  const [draftRegions, setDraftRegions] = useState<string[]>(regions);
  const [draftWorkStyles, setDraftWorkStyles] = useState<string[]>(workStyles);
  const [draftSalaryFloor, setDraftSalaryFloor] = useState<number>(salaryFloorK);

  function toggleInList(list: string[], value: string, setList: (next: string[]) => void) {
    if (list.includes(value)) {
      setList(list.filter((item) => item !== value));
      return;
    }
    setList([...list, value]);
  }

  return (
    <>
      <div className="sheet-overlay open" onClick={onClose} />
      <aside className="filters-sheet open">
        <div className="flex items-center justify-between">
          <p className="card-title">Job Preferences</p>
          <button className="action-btn" onClick={onClose}>Close</button>
        </div>

        <MultiToggle
          title="Job Titles / Roles"
          options={ROLE_OPTIONS}
          selected={draftRoles}
          onToggle={(value) => toggleInList(draftRoles, value, setDraftRoles)}
        />

        <MultiToggle
          title="Locations"
          options={REGION_OPTIONS}
          selected={draftRegions}
          onToggle={(value) => toggleInList(draftRegions, value, setDraftRegions)}
        />

        <MultiToggle
          title="Work Style"
          options={WORK_STYLE_OPTIONS}
          selected={draftWorkStyles}
          onToggle={(value) => toggleInList(draftWorkStyles, value, setDraftWorkStyles)}
        />

        <div className="mt-4">
          <div className="flex items-center justify-between">
            <p className="card-title">Salary Range</p>
            <span className="soft-text">${draftSalaryFloor}k+</span>
          </div>
          <input
            className="mt-2 w-full accent-emerald-700"
            type="range"
            min={10}
            max={500}
            step={5}
            value={draftSalaryFloor}
            onChange={(e) => setDraftSalaryFloor(Number(e.target.value))}
          />
        </div>

        <button
          className="action-btn primary mt-5 w-full"
          onClick={() => {
            onSave({
              roles: draftRoles,
              regions: draftRegions,
              workStyles: draftWorkStyles,
              salaryFloorK: draftSalaryFloor,
            });
            onClose();
          }}
        >
          Save Preferences
        </button>
      </aside>
    </>
  );
}
