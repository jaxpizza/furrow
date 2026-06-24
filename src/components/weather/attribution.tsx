export function WeatherAttribution() {
  return (
    <p className="text-text-tertiary mt-4 text-center text-[11px]">
      Weather data by{" "}
      <a
        href="https://open-meteo.com/"
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-foreground underline underline-offset-2"
      >
        Open-Meteo
      </a>{" "}
      · normals 1991–2020 (ERA5)
    </p>
  );
}
