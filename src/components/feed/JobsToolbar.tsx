"use client";

type Props = {
  query: string;
  onQueryChange: (value: string) => void;
  remoteOnly: boolean;
  setRemoteOnly: (value: boolean) => void;
  verifiedOnly: boolean;
  setVerifiedOnly: (value: boolean) => void;
  freshOnly: boolean;
  setFreshOnly: (value: boolean) => void;
  onOpenFilters: () => void;
  count: number;
  updatedAgo: string;
  newCount: number;
};

function Chip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button className={`quick-chip ${active ? "active" : ""}`} onClick={onClick}>
      {label}
    </button>
  );
}

export function JobsToolbar(props: Props) {
  return (
    <section className="section-card mt-3 animate-rise delay-1">
      <div className="flex items-center gap-2">
        <input
          className="field"
          placeholder="Search job title or company"
          value={props.query}
          onChange={(e) => props.onQueryChange(e.target.value)}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Chip active={props.remoteOnly} onClick={() => props.setRemoteOnly(!props.remoteOnly)} label="Remote" />
        <Chip active={props.verifiedOnly} onClick={() => props.setVerifiedOnly(!props.verifiedOnly)} label="Verified only" />
        <Chip active={props.freshOnly} onClick={() => props.setFreshOnly(!props.freshOnly)} label="Fresh 7 days" />
        <button className="action-btn ml-auto" onClick={props.onOpenFilters}>
          Filters
        </button>
      </div>

      <p className="soft-text mt-3">
        {props.count} roles • Updated {props.updatedAgo} • New {props.newCount}
      </p>
    </section>
  );
}
