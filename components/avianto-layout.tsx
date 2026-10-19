import { Children, isValidElement, type HTMLAttributes, type ReactNode } from "react";
import { ArrowLeft } from "lucide-react";

const classes = (...values: Array<string | false | null | undefined>) => values.filter(Boolean).join(" ");

export function AviantoPage({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={classes("page", "avianto-page", className)}>{children}</div>;
}

export function AviantoPageHeader({
  title,
  description,
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="page-heading avianto-page-heading">
      <div>
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
  variant = "plain",
  ...props
}: {
  children: ReactNode;
  className?: string;
  as?: "section" | "article" | "div" | "aside";
  variant?: "plain" | "section";
} & HTMLAttributes<HTMLElement>) {
  return <Component {...props} className={classes("panel", "avianto-panel", variant === "section" && "avianto-panel-section", className)}>{Children.map(children, (child) => {
    if (!isValidElement(child) || child.type !== "table") return child;
    return (
      // Keyboard users need to focus the region to scroll wide tables.
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
      <div className="avianto-table-scroll" role="region" aria-label="Tabla de registros" tabIndex={0}>{child}</div>
    );
  })}</Component>;
}

/** A branded section header for record details, checklists and payment panels. */
export function AviantoPanelHeader({ title, actions, description, headingId, level = 2 }: {
  title: ReactNode;
  actions?: ReactNode;
  description?: ReactNode;
  headingId?: string;
  level?: 2 | 3;
}) {
  const Heading = level === 3 ? "h3" : "h2";
  return <header className="panel-head avianto-panel-header">
    <div><Heading id={headingId}>{title}</Heading>{description && <p>{description}</p>}</div>
    {actions && <div className="avianto-panel-header-actions">{actions}</div>}
  </header>;
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
