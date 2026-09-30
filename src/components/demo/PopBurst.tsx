const SHARDS = Array.from({ length: 8 }, (_, i) => {
  const angle = (i / 8) * Math.PI * 2 + 0.3;
  const dist = 38 + (i % 3) * 14;
  return {
    dx: `${Math.round(Math.cos(angle) * dist)}px`,
    dy: `${Math.round(Math.sin(angle) * dist)}px`,
    size: 4 + (i % 3) * 2,
  };
});

/** CSS-only particle burst played when an event bubble pops. */
export function PopBurst({ color }: { color: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center">
      <div
        className="rally-burst absolute size-full rounded-full border-2"
        style={{ borderColor: color }}
      />
      {SHARDS.map((s, i) => (
        <span
          key={i}
          className="rally-shard absolute rounded-full"
          style={
            {
              width: s.size,
              height: s.size,
              background: color,
              "--dx": s.dx,
              "--dy": s.dy,
              animationDelay: `${i * 12}ms`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
