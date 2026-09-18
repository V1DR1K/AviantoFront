import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";

const classes = (...values: Array<string | false | null | undefined>) => values.filter(Boolean).join(" ");

export function AviantoPage({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={classes("page", "avianto-page", className)}>{children}</div>;
}

export function AviantoPageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  eyebrow?: ReactNode;
}) {
  return (
    <header className="page-heading avianto-page-heading">
      <div>
        {eyebrow && <span className="avianto-eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  );
}

export function AviantoPanel({
  children,
  className,
  as: Component = "section",
}: {
  children: ReactNode;
  className?: string;
  as?: "section" | "article" | "div";
}) {
  return <Component className={classes("panel", "avianto-panel", className)}>{children}</Component>;
}

export function AviantoRecordHero({
  title,
  eyebrow,
  subtitle,
  status,
  actions,
  onBack,
  backLabel = "Volver",
  children,
  className,
}: {
  title: ReactNode;
  eyebrow?: ReactNode;
  subtitle?: ReactNode;
  status?: ReactNode;
  actions?: ReactNode;
  onBack?: () => void;
  backLabel?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section className={classes("avianto-record-hero", className)}>
      {onBack && <button type="button" className="avianto-record-back" onClick={onBack}><ArrowLeft size={19} />{backLabel}</button>}
      <div className="avianto-record-hero-main">
        <div className="avianto-record-title">
          {eyebrow && <span>{eyebrow}</span>}
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {status && <div className="avianto-record-status">{status}</div>}
        {actions && <div className="avianto-record-actions">{actions}</div>}
      </div>
      {children && <div className="avianto-record-summary">{children}</div>}
    </section>
  );
}

export function ResponsiveDataView({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={classes("responsive-data-view", className)}>{children}</div>;
}

export function StickyActionBar({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={classes("avianto-sticky-actions", className)}>{children}</div>;
}
