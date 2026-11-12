export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`logo ${className}`} aria-label="РадиоХаб">
      <span className="logo__radio" aria-hidden>
        РАДИО
      </span>
      <span className="logo__hub" aria-hidden>
        HUB
      </span>
    </span>
  );
}
