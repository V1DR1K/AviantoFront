import type { CSSProperties } from "react";

type BrandLogoProps = {
  variant?: "color" | "white";
  markOnly?: boolean;
  size?: "sm" | "md" | "lg";
  descriptor?: boolean;
  className?: string;
  priority?: boolean;
};

const sources = {
  color: {
    lockup: "/brand/avianto-lockup.png",
    mark: "/brand/avianto-isotipo.png",
  },
  white: {
    lockup: "/brand/avianto-lockup-white.png",
    mark: "/brand/avianto-isotipo-white.png",
  },
} as const;

export function BrandLogo({
  variant = "color",
  markOnly = false,
  size = "md",
  descriptor = false,
  className = "",
  priority = false,
}: BrandLogoProps) {
  const source = markOnly ? sources[variant].mark : sources[variant].lockup;
  const label = descriptor ? "Avianto, Mecánica integral de motos" : "Avianto";
  const style = { "--brand-logo-size": size === "sm" ? "112px" : size === "lg" ? "238px" : "168px" } as CSSProperties;

  return (
    <span className={`brand-logo brand-logo-${size}${markOnly ? " brand-logo-mark" : ""} ${className}`.trim()}>
      <img src={source} alt={label} style={style} width={markOnly ? 64 : 238} height={markOnly ? 64 : 64} loading={priority ? "eager" : "lazy"} />
      {descriptor && <span className="brand-logo-descriptor">Mecánica integral de motos</span>}
    </span>
  );
}
