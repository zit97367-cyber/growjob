"use client";

type Props = {
  query: string;
  onQueryChange: (value: string) => void;
  onOpenPreferences: () => void;
  count: number;
  updatedAgo: string;
};

export function JobsToolbar(props: Props) {
  return (
    <section className="jobs-toolbar-card animate-rise delay-1">
      <div className="flex items-center gap-2">
        <input
          className="field jobs-search"
          placeholder="Search by job title or company"
          value={props.query}
          onChange={(e) => props.onQueryChange(e.target.value)}
        />
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <p className="results-meta">{props.count} results • Updated {props.updatedAgo}</p>
        <button className="action-btn" onClick={props.onOpenPreferences}>
          Job Preferences
        </button>
      </div>
    </section>
  );
}
