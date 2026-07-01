import Link from "next/link";

export default function NotFound() {
  return (
    <div className="bg-background text-foreground flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="text-[var(--accent)] text-2xl font-bold tracking-tight">Furrow</div>
      <p className="text-text-secondary max-w-sm text-sm">This page doesn&apos;t exist.</p>
      <Link
        href="/dashboard"
        className="border-border hover:bg-accent/60 rounded-md border px-3 py-1.5 text-sm transition-colors"
      >
        Back to your dashboard
      </Link>
    </div>
  );
}
