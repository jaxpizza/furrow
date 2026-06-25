"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";

import type { FieldMarker } from "@/lib/weather/location";

import "mapbox-gl/dist/mapbox-gl.css";

type Frame = { time: number; path: string };

/**
 * Live animated precipitation radar (RainViewer, free/no-key) overlaid on a dark
 * Mapbox base. RainViewer aggregates public weather radar (NWS/NEXRAD etc.);
 * frames animate through the last ~2 hours. Markers pin each field; for "all
 * fields" the view fits to every field.
 */
export function RainRadar({
  lat,
  lon,
  markers,
}: {
  lat: number;
  lon: number;
  markers: FieldMarker[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [frameTime, setFrameTime] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  // stable signature so the effect re-runs only when the points actually change
  const markerSig = markers.map((m) => `${m.lat},${m.lon}`).join("|");

  useEffect(() => {
    if (!token || !containerRef.current || mapRef.current) return;
    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [lon, lat],
      zoom: 6.4,
      minZoom: 3.5, // radar past a continental view is pointless + tile-heavy
      attributionControl: false,
      scrollZoom: false, // inline: let the page scroll (re-enabled in fullscreen)
      dragRotate: false,
      pitchWithRotate: false,
    });
    mapRef.current = map;

    // zoom +/- and fullscreen toggle (one button enters/exits fullscreen)
    map.addControl(
      new mapboxgl.NavigationControl({ showCompass: false }),
      "top-right",
    );
    map.addControl(new mapboxgl.FullscreenControl(), "top-right");

    // field markers — pin every field, fit the view to all of them
    const pts = markers.length ? markers : [{ lat, lon, name: "" }];
    pts.forEach((p) => {
      const el = document.createElement("div");
      el.style.cssText =
        "width:11px;height:11px;border-radius:9999px;background:#EFB23E;box-shadow:0 0 0 3px rgba(239,178,62,0.25)";
      if (p.name) el.title = p.name;
      new mapboxgl.Marker({ element: el }).setLngLat([p.lon, p.lat]).addTo(map);
    });
    if (markers.length > 1) {
      const bounds = new mapboxgl.LngLatBounds();
      markers.forEach((p) => bounds.extend([p.lon, p.lat]));
      map.fitBounds(bounds, { padding: 56, maxZoom: 8, duration: 0 });
    }

    // scroll-zoom is distracting inline but wanted in fullscreen
    const onFsChange = () => {
      if (document.fullscreenElement) map.scrollZoom.enable();
      else map.scrollZoom.disable();
      map.resize();
    };
    document.addEventListener("fullscreenchange", onFsChange);

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
            // RainViewer radar tiles only exist to ~z7; cap here so Mapbox
            // upscales the z7 tile instead of requesting unavailable ones.
            maxzoom: 7,
          });
          map.addLayer({
            id,
            type: "raster",
            source: id,
            // hidden frames use visibility:none so Mapbox fetches NO tiles for
            // them — only the active frame loads, avoiding a request storm
            // (and the failed-tile console spam) when zoomed out.
            layout: { visibility: "none" },
            paint: { "raster-opacity": 0.72 },
          });
        });

        // animate through frames — toggle visibility, not opacity
        let idx = 0;
        const show = (active: number) => {
          frames.forEach((_, i) =>
            map.setLayoutProperty(
              `rv-${i}`,
              "visibility",
              i === active ? "visible" : "none",
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
      document.removeEventListener("fullscreenchange", onFsChange);
      map.remove();
      mapRef.current = null;
    };
    // markerSig is a stable signature standing in for the markers array
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lon, token, markerSig]);

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
