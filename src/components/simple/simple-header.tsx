import { ModeToggle } from "./mode-toggle";

/** The Furrow mark — same glyph as the app shell, kept small and calm here. */
function Mark() {
  return (
    <span className="bg-[var(--accent)] text-bg-base grid size-7 place-items-center rounded-md text-sm font-bold">
      ≈
    </span>
  );
}

/**
 * The only chrome on the Simple screen: the wordmark, the active farm, and the one
 * escape hatch to the full app. No tabs, no nav — that's the whole point.
 */
export function SimpleHeader({ farmName }: { farmName: string | null }) {
  return (
    <header className="flex items-center justify-between gap-3 py-5">
      <div className="flex items-center gap-2.5">
        <Mark />
        <div className="leading-tight">
          <div className="font-serif text-lg font-medium tracking-tight">Furrow</div>
          {farmName && <div className="text-text-tertiary text-[11px]">{farmName}</div>}
        </div>
      </div>
      <ModeToggle current="simple" />
    </header>
  );
}
