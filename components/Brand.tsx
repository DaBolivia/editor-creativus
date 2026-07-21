import Link from "next/link";

type BrandProps = {
  href?: string;
  light?: boolean;
};

export function Brand({ href = "/", light = false }: BrandProps) {
  return (
    <Link
      className={`brand${light ? " brand--light" : ""}`}
      href={href}
      aria-label="Creativus Apliques Personalizados — página inicial"
    >
      <span className="brand__mark" aria-hidden="true">
        C
      </span>
      <span className="brand__text">
        <strong>Creativus</strong>
        <small>Apliques Personalizados</small>
      </span>
    </Link>
  );
}
