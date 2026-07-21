type CrochetVisualProps = {
  compact?: boolean;
};

function YarnIcon() {
  return (
    <svg viewBox="0 0 64 64" role="img" aria-label="Novelo de lã estilizado">
      <path d="M17 41c-5-14 4-28 18-29 13-1 23 8 23 21 0 13-10 22-23 22-7 0-13-2-18-7" />
      <path d="M18 23c8 1 17 6 24 15M14 34c11-1 23 3 33 12M32 13c-3 10-1 22 7 34M48 17c-8 7-13 17-14 29M12 48c-5 0-8 2-10 6" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg viewBox="0 0 64 64" role="img" aria-label="Coração estilizado">
      <path d="M32 52 11 31C1 20 17 6 28 17l4 4 4-4C47 6 63 20 53 31Z" />
    </svg>
  );
}

export function CrochetVisual({ compact = false }: CrochetVisualProps) {
  return (
    <div className={`product-visual${compact ? " product-visual--compact" : ""}`}>
      <div className="product-visual__glow" />

      <div className="acrylic-tag acrylic-tag--gold acrylic-tag--back">
        <span className="acrylic-tag__hole" />
        <span className="acrylic-tag__icon">
          <HeartIcon />
        </span>
        <strong>Feito com amor</strong>
      </div>

      <div className="acrylic-tag acrylic-tag--rose acrylic-tag--front">
        <span className="acrylic-tag__hole" />
        <span className="acrylic-tag__icon acrylic-tag__icon--large">
          <YarnIcon />
        </span>
        <strong>Ateliê da Ana</strong>
        <small>crochê artesanal</small>
      </div>

      <div className="acrylic-tag acrylic-tag--clear acrylic-tag--side">
        <span className="acrylic-tag__hole" />
        <span className="acrylic-tag__mini-yarn">
          <YarnIcon />
        </span>
        <strong>feito à mão</strong>
      </div>

      <div className="product-visual__thread product-visual__thread--one" />
      <div className="product-visual__thread product-visual__thread--two" />
      <div className="product-visual__spark product-visual__spark--one">✦</div>
      <div className="product-visual__spark product-visual__spark--two">✦</div>
    </div>
  );
}
