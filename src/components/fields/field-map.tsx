"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import centroid from "@turf/centroid";
import type { Feature, FeatureCollection, Point, Polygon } from "geojson";
import mapboxgl from "mapbox-gl";

import "mapbox-gl/dist/mapbox-gl.css";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";

import { acresFromPolygon, bboxOfPolygon } from "@/lib/geo";
import type { MapField } from "@/lib/fields";

import { DRAW_STYLES } from "./draw-styles";

// Central Illinois — a farmer-useful starting view.
const CENTRAL_IL: [number, number] = [-88.243, 40.116];
const START_ZOOM = 12;

export type FieldMapHandle = {
  startDraw: () => void;
  startEditGeometry: (field: MapField) => void;
  cancel: () => void;
  flyToField: (field: MapField) => void;
};

type Props = {
  token: string;
  fields: MapField[];
  selectedId: string | null;
  /** live acreage while drawing (null when nothing measurable yet) */
  onDrawProgress: (acres: number | null) => void;
  onDrawComplete: (geom: Polygon, acres: number) => void;
  onGeometryUpdate: (geom: Polygon, acres: number) => void;
  onSelectField: (id: string | null) => void;
};

export const FieldMap = forwardRef<FieldMapHandle, Props>(function FieldMap(
  {
    token,
    fields,
    selectedId,
    onDrawProgress,
    onDrawComplete,
    onGeometryUpdate,
    onSelectField,
  },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const drawRef = useRef<MapboxDraw | null>(null);
  const loadedRef = useRef(false);
  // 'idle' | 'drawing' | 'editing' — drives how draw events are interpreted.
  const modeRef = useRef<"idle" | "drawing" | "editing">("idle");
  const editingIdRef = useRef<string | null>(null);

  // Latest-value refs so map listeners (bound once) always see current data.
  const fieldsRef = useRef(fields);
  const selectedRef = useRef(selectedId);
  const cb = useRef({
    onDrawProgress,
    onDrawComplete,
    onGeometryUpdate,
    onSelectField,
  });
  cb.current = {
    onDrawProgress,
    onDrawComplete,
    onGeometryUpdate,
    onSelectField,
  };

  function savedCollection(): FeatureCollection<Polygon> {
    return {
      type: "FeatureCollection",
      features: fieldsRef.current
        .filter((f) => f.id !== editingIdRef.current)
        .map(
          (f): Feature<Polygon> => ({
            type: "Feature",
            id: f.id,
            properties: { id: f.id, selected: f.id === selectedRef.current },
            geometry: f.geom,
          }),
        ),
    };
  }

  function labelCollection(): FeatureCollection<Point> {
    return {
      type: "FeatureCollection",
      features: fieldsRef.current
        .filter((f) => f.id !== editingIdRef.current)
        .map((f): Feature<Point> => {
          const c = centroid(f.geom);
          return {
            type: "Feature",
            properties: { label: f.name },
            geometry: c.geometry,
          };
        }),
    };
  }

  function refreshSources() {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    (map.getSource("fields") as mapboxgl.GeoJSONSource | undefined)?.setData(
      savedCollection(),
    );
    (
      map.getSource("field-labels") as mapboxgl.GeoJSONSource | undefined
    )?.setData(labelCollection());
  }

  // ── init once ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;
    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/satellite-streets-v12",
      center: CENTRAL_IL,
      zoom: START_ZOOM,
      attributionControl: false,
      logoPosition: "bottom-right",
    });
    mapRef.current = map;

    map.addControl(
      new mapboxgl.NavigationControl({ showCompass: false }),
      "bottom-right",
    );

    const draw = new MapboxDraw({
      displayControlsDefault: false,
      styles: DRAW_STYLES as unknown as object[],
    });
    drawRef.current = draw;
    map.addControl(draw);

    map.on("load", () => {
      loadedRef.current = true;

      map.addSource("fields", { type: "geojson", data: savedCollection() });
      map.addSource("field-labels", {
        type: "geojson",
        data: labelCollection(),
      });

      map.addLayer({
        id: "fields-fill",
        type: "fill",
        source: "fields",
        paint: {
          "fill-color": "#EFB23E",
          "fill-opacity": ["case", ["get", "selected"], 0.3, 0.1],
        },
      });
      map.addLayer({
        id: "fields-line",
        type: "line",
        source: "fields",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": ["case", ["get", "selected"], "#F6C463", "#EFB23E"],
          "line-width": ["case", ["get", "selected"], 3, 1.5],
        },
      });
      map.addLayer({
        id: "fields-labels",
        type: "symbol",
        source: "field-labels",
        layout: {
          "text-field": ["get", "label"],
          "text-size": 12,
          "text-font": ["DIN Pro Medium", "Arial Unicode MS Regular"],
          "text-allow-overlap": false,
        },
        paint: {
          "text-color": "#F4F1E9",
          "text-halo-color": "#0B0D0C",
          "text-halo-width": 1.4,
        },
      });

      map.on("click", "fields-fill", (e) => {
        const id = e.features?.[0]?.properties?.id as string | undefined;
        if (id && modeRef.current === "idle") cb.current.onSelectField(id);
      });
      map.on("mouseenter", "fields-fill", () => {
        if (modeRef.current === "idle")
          map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "fields-fill", () => {
        map.getCanvas().style.cursor = "";
      });
    });

    // Live acreage while drawing.
    map.on("draw.render", () => {
      if (modeRef.current !== "drawing") return;
      const poly = drawRef.current
        ?.getAll()
        .features.find(
          (f) => f.geometry.type === "Polygon",
        ) as Feature<Polygon> | undefined;
      if (poly && poly.geometry.coordinates[0]?.length >= 4) {
        cb.current.onDrawProgress(acresFromPolygon(poly.geometry));
      } else {
        cb.current.onDrawProgress(null);
      }
    });

    map.on("draw.create", (e: { features: Feature[] }) => {
      const f = e.features[0] as Feature<Polygon>;
      if (f?.geometry?.type === "Polygon") {
        cb.current.onDrawComplete(
          f.geometry,
          acresFromPolygon(f.geometry),
        );
      }
    });

    map.on("draw.update", (e: { features: Feature[] }) => {
      if (modeRef.current !== "editing") return;
      const f = e.features[0] as Feature<Polygon>;
      if (f?.geometry?.type === "Polygon") {
        cb.current.onGeometryUpdate(
          f.geometry,
          acresFromPolygon(f.geometry),
        );
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
      loadedRef.current = false;
    };
  }, [token]);

  // keep refs + rendered sources in sync with props
  // refreshSources only reads refs/map, so it's stable; deps are the data.
  useEffect(() => {
    fieldsRef.current = fields;
    selectedRef.current = selectedId;
    refreshSources();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields, selectedId]);

  useImperativeHandle(ref, () => ({
    startDraw() {
      const draw = drawRef.current;
      if (!draw) return;
      modeRef.current = "drawing";
      editingIdRef.current = null;
      draw.deleteAll();
      draw.changeMode("draw_polygon");
    },
    startEditGeometry(field) {
      const draw = drawRef.current;
      if (!draw) return;
      modeRef.current = "editing";
      editingIdRef.current = field.id;
      refreshSources(); // hide the saved copy while editing
      draw.deleteAll();
      const [id] = draw.add({
        type: "Feature",
        properties: {},
        geometry: field.geom,
      });
      draw.changeMode("direct_select", { featureId: id });
      this.flyToField(field);
    },
    cancel() {
      modeRef.current = "idle";
      editingIdRef.current = null;
      drawRef.current?.deleteAll();
      drawRef.current?.changeMode("simple_select");
      cb.current.onDrawProgress(null);
      refreshSources();
    },
    flyToField(field) {
      const map = mapRef.current;
      if (!map) return;
      const [minLng, minLat, maxLng, maxLat] = bboxOfPolygon(field.geom);
      map.fitBounds(
        [
          [minLng, minLat],
          [maxLng, maxLat],
        ],
        { padding: 120, duration: 900, maxZoom: 16 },
      );
    },
  }));

  // h-full/w-full (not absolute) because mapbox-gl.css forces
  // `.mapboxgl-map { position: relative }`, which would cancel `inset-0`.
  return <div ref={containerRef} className="h-full w-full" />;
});
