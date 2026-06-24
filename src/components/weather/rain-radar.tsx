"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";

import "mapbox-gl/dist/mapbox-gl.css";

type Frame = { time: number; path: string };

/**
 * Live animated precipitation radar (RainViewer, free/no-key) overlaid on a dark
 * Mapbox base, centered on the field. RainViewer aggregates public weather radar
 * (NWS/NEXRAD etc.). Frames animate through the last ~2 hours.
 */
export function RainRadar({ lat, lon }: { lat: number; lon: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [frameTime, setFrameTime] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  useEffect(() => {
    if (!token || !containerRef.current || mapRef.current) return;
    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [lon, lat],
      zoom: 6.4,
      attributionControl: false,
      scrollZoom: false, // let the page scroll
      dragRotate: false,
      pitchWithRotate: false,
    });
    mapRef.current = map;

    // field marker
    const el = document.createElement("div");
    el.style.cssText =
      "width:10px;height:10px;border-radius:9999px;background:#EFB23E;box-shadow:0 0 0 3px rgba(239,178,62,0.25)";
    new mapboxgl.Marker({ element: el }).setLngLat([lon, lat]).addTo(map);

    let cancelled = false;

    const addRadar = async () => {
      try {
        const res = await fetch(
          "https://api.rainviewer.com/public/weather-maps.json",
        );
        const data = (await res.json()) as {
          host: string;
          radar: { past: Frame[]; nowcast?: Frame[] };
        };
        const host = data.host;
        const frames = [
          ...data.radar.past,
          ...(data.radar.nowcast ?? []),
        ].slice(-12);
        if (cancelled || !mapRef.current) return;
        if (frames.length === 0) {
          setFailed(true);
          return;
        }

        frames.forEach((f, i) => {
          const id = `rv-${i}`;
          map.addSource(id, {
            type: "raster",
            tiles: [`${host}${f.path}/256/{z}/{x}/{y}/4/1_1.png`],
            tileSize: 256,
          });
          map.addLayer({
            id,
            type: "raster",
            source: id,
            paint: {
              "raster-opacity": 0,
              "raster-opacity-transition": { duration: 0 },
            },
          });
        });

        // animate through frames
        let idx = 0;
        const show = (active: number) => {
          frames.forEach((_, i) =>
            map.setPaintProperty(
              `rv-${i}`,
              "raster-opacity",
              i === active ? 0.72 : 0,
            ),
          );
          setFrameTime(
            new Date(frames[active].time * 1000).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            }),
          );
        };
        show(frames.length - 1);
        timerRef.current = setInterval(() => {
          idx = (idx + 1) % frames.length;
          show(idx);
        }, 650);
      } catch {
        if (!cancelled) setFailed(true);
      }
    };

    // The mapbox 'load' event is unreliable under React StrictMode's
    // mount→unmount→mount in dev, so poll the style state instead.
    const waitForStyle = () => {
      if (cancelled || !mapRef.current) return;
      if (map.isStyleLoaded()) addRadar();
      else setTimeout(waitForStyle, 120);
    };
    waitForStyle();

    return () => {
      cancelled = true;
      if (timerRef.current) clearInterval(timerRef.current);
      map.remove();
      mapRef.current = null;
    };
  }, [lat, lon, token]);

  if (!token) {
    return (
      <div className="bg-bg-elevated flex min-h-[220px] flex-1 items-center justify-center rounded-md text-xs text-text-tertiary">
        Radar needs a Mapbox token.
      </div>
    );
  }

  return (
    <div className="relative h-[260px] flex-1 overflow-hidden rounded-md border border-border md:h-auto md:min-h-[240px]">
      {/* h-full/w-full, not absolute: mapbox-gl.css forces position:relative,
          which cancels inset-0 and collapses the map to zero height. */}
      <div ref={containerRef} className="h-full w-full" />
      {/* label */}
      <div className="bg-bg-surface/85 pointer-events-none absolute top-2 left-2 z-10 rounded px-2 py-1 text-[10px] backdrop-blur">
        <span className="font-medium text-foreground">Rain radar</span>
        {frameTime && (
          <span className="tnum text-text-tertiary"> · {frameTime}</span>
        )}
        {failed && <span className="text-[var(--neg)]"> · unavailable</span>}
      </div>
      <div className="text-text-tertiary pointer-events-none absolute right-1.5 bottom-1 z-10 text-[9px]">
        RainViewer
      </div>
    </div>
  );
}
