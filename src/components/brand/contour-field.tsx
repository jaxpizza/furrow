import { cn } from "@/lib/utils";

/**
 * Faint topographic contour-line motif for heroes and empty states.
 * Maps + premium + ag, without the cliché. Renders nested irregular closed
 * curves (like elevation lines) as a non-interactive background layer.
 *
 * Keep opacity low (~3–6%). Defaults to the app text color so it reads as a
 * hairline etching rather than a graphic.
 */
export function ContourField({
  className,
  opacity = 0.05,
}: {
  className?: string;
  opacity?: number;
}) {
  return (
    <svg
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 h-full w-full select-none",
        className,
      )}
      viewBox="0 0 600 400"
      fill="none"
      preserveAspectRatio="xMidYMid slice"
      style={{ opacity }}
    >
      <g
        stroke="currentColor"
        strokeWidth="1"
        fill="none"
        vectorEffect="non-scaling-stroke"
      >
        {/* Concentric, irregular contour rings around a basin near center-right */}
        <path d="M420 60C520 70 580 140 560 230C545 305 470 360 380 360C300 360 250 310 255 240C260 175 320 50 420 60Z" />
        <path d="M418 92C500 100 548 158 532 232C518 296 458 340 384 340C318 340 280 300 284 244C288 188 336 84 418 92Z" />
        <path d="M416 124C482 130 518 176 506 234C494 288 446 322 388 322C334 322 308 290 312 248C316 200 350 118 416 124Z" />
        <path d="M414 156C462 160 488 194 480 236C472 280 436 304 392 304C350 304 334 280 338 250C342 214 366 152 414 156Z" />
        <path d="M412 188C444 191 460 214 454 240C448 272 426 288 396 288C366 288 358 270 362 252C366 228 380 185 412 188Z" />
        {/* A second, smaller basin lower-left for terrain variety */}
        <path d="M120 250C190 240 240 280 232 340C226 388 176 410 120 405C70 400 36 366 44 320C52 280 50 260 120 250Z" />
        <path d="M126 278C176 271 212 300 206 342C202 376 168 392 128 389C92 386 70 362 76 330C82 302 76 285 126 278Z" />
        <path d="M132 306C166 301 190 320 186 348C183 370 162 381 136 379C112 377 100 361 104 340C108 322 98 311 132 306Z" />
        {/* Long sweeping ridgelines crossing the panel */}
        <path d="M-20 140C90 110 160 200 300 170C430 142 500 70 620 96" />
        <path d="M-20 200C100 178 150 250 300 224C450 198 520 150 620 168" />
      </g>
    </svg>
  );
}
