"use client";

import { useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";

import { Explainer } from "@/components/common/explainer";
import { Card } from "@/components/ui/card";
import type { Sentiment, TaggedArticle } from "@/lib/news/tagging";
import type { Crop } from "@/lib/types/database";
import { cn } from "@/lib/utils";

import { SentimentTag } from "./sentiment";

type CropFilter = "all" | Crop;
type SentFilter = "all" | Sentiment;

export function NewsFeed({ articles }: { articles: TaggedArticle[] }) {
  const [crop, setCrop] = useState<CropFilter>("all");
  const [sent, setSent] = useState<SentFilter>("all");

  const shown = useMemo(() => {
    return articles.filter((a) => {
      const corn = a.tag?.corn ?? null;
      const soy = a.tag?.soy ?? null;
      // crop filter: article must bear on the chosen crop (non-null sentiment)
      if (crop === "corn" && corn == null) return false;
      if (crop === "soybean" && soy == null) return false;
      // sentiment filter: the relevant crop(s) must carry that sentiment
      if (sent !== "all") {
        if (crop === "corn") return corn === sent;
        if (crop === "soybean") return soy === sent;
        return corn === sent || soy === sent;
      }
      return true;
    });
  }, [articles, crop, sent]);

  const taggedCount = articles.filter((a) => a.tag && (a.tag.corn || a.tag.soy)).length;

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-foreground text-sm font-semibold">News feed</h2>
          <p className="text-text-tertiary text-[11px]">
            {articles.length} articles the engine ingested · {taggedCount} AI-tagged
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            value={crop}
            onChange={(v) => setCrop(v as CropFilter)}
            options={[
              { v: "all", label: "All crops" },
              { v: "corn", label: "Corn" },
              { v: "soybean", label: "Soy" },
            ]}
          />
          <Segmented
            value={sent}
            onChange={(v) => setSent(v as SentFilter)}
            options={[
              { v: "all", label: "Any read" },
              { v: "bullish", label: "Bullish" },
              { v: "bearish", label: "Bearish" },
              { v: "neutral", label: "Neutral" },
            ]}
          />
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="text-text-secondary py-8 text-center text-sm">
          No articles match this filter.
        </p>
      ) : (
        <ul className="divide-border/50 mt-3 divide-y">
          {shown.map((a) => (
            <ArticleRow key={a.link} a={a} />
          ))}
        </ul>
      )}

      <Explainer label="How the AI read works">
        Every article the engine ingests is read once — bullish, bearish, or neutral for corn and soybeans —
        and that read is <span className="text-foreground">stored</span>, not recomputed on each visit. It uses
        the same judgment the outlook engine applies to news: the surprise and direction for price, not the
        headline&apos;s tone. Articles it can&apos;t confidently read are left neutral rather than forced.
      </Explainer>
    </Card>
  );
}

function ArticleRow({ a }: { a: TaggedArticle }) {
  const tags: { crop: Crop; s: Sentiment }[] = [];
  if (a.tag?.corn) tags.push({ crop: "corn", s: a.tag.corn });
  if (a.tag?.soy) tags.push({ crop: "soybean", s: a.tag.soy });

  return (
    <li className="py-3">
      <div className="flex items-start justify-between gap-3">
        <a
          href={a.link}
          target="_blank"
          rel="noopener noreferrer"
          className="group min-w-0 flex-1"
        >
          <span className="text-foreground group-hover:text-[var(--accent)] text-sm font-medium transition-colors">
            {a.title}
            <ExternalLink className="text-text-tertiary ml-1 inline size-3 align-baseline" aria-hidden />
          </span>
        </a>
        <div className="flex shrink-0 flex-wrap justify-end gap-1">
          {tags.length > 0 ? (
            tags.map((t) => <SentimentTag key={t.crop} crop={t.crop} sentiment={t.s} />)
          ) : (
            <span className="text-text-tertiary bg-foreground/[0.06] rounded px-1.5 py-0.5 text-[11px]">
              Untagged
            </span>
          )}
        </div>
      </div>
      <div className="mt-1 flex items-center gap-2">
        <span className="text-text-tertiary text-[11px]">{a.source}</span>
        <span className="text-text-tertiary text-[11px]">·</span>
        <span className="text-text-tertiary tnum text-[11px]">{fmtDate(a.publishedAt)}</span>
      </div>
      {a.tag?.takeaway && (
        <p className="text-text-secondary mt-1.5 text-xs leading-relaxed">{a.tag.takeaway}</p>
      )}
    </li>
  );
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { v: T; label: string }[];
}) {
  return (
    <div className="border-border bg-bg-elevated/60 inline-flex gap-0.5 rounded-md border p-0.5">
      {options.map((o) => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          className={cn(
            "rounded px-2 py-0.5 text-[11px] font-medium transition-colors",
            value === o.v
              ? "bg-[var(--accent)]/15 text-[var(--accent)]"
              : "text-text-tertiary hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
