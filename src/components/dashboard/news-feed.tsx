import { ExternalLink } from "lucide-react";

import { Card } from "@/components/ui/card";

import type { NewsView } from "./types";

/** The real ag-news corpus we ingest (news_items_cache) — recent headlines with
 *  their source, each clickable through to the original. */
export function NewsFeed({ news }: { news: NewsView[] }) {
  if (news.length === 0) {
    return (
      <Card className="p-4">
        <p className="text-text-secondary text-sm">No recent ag news cached right now.</p>
      </Card>
    );
  }

  return (
    <Card className="p-2">
      <ul className="grid grid-cols-1 gap-px md:grid-cols-2">
        {news.map((n, i) => (
          <li key={`${n.link}-${i}`}>
            <a
              href={n.link}
              target="_blank"
              rel="noopener noreferrer"
              className="group hover:bg-bg-elevated/50 flex h-full items-start gap-3 rounded-md px-3 py-2.5 transition-colors"
            >
              <span className="bg-[var(--accent)]/60 mt-1.5 size-1.5 shrink-0 rounded-full" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-foreground group-hover:text-[var(--accent)] line-clamp-2 text-sm leading-snug transition-colors">
                  {n.title}
                </p>
                <div className="text-text-tertiary mt-1 flex items-center gap-1.5 text-[11px]">
                  <span className="font-medium">{n.source}</span>
                  {n.publishedLabel && (
                    <>
                      <span>·</span>
                      <span className="tnum">{n.publishedLabel}</span>
                    </>
                  )}
                  <ExternalLink className="size-2.5 opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
              </div>
            </a>
          </li>
        ))}
      </ul>
    </Card>
  );
}
