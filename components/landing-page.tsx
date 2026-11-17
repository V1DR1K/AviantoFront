"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import {
  ArrowRight,
  ArrowRightLeft,
  ArrowUpRight,
  Banknote,
  Bike,
  BookOpen,
  Check,
  ClipboardList,
  FileBarChart,
  FileText,
  Hammer,
  History,
  LayoutDashboard,
  LogIn,
  MessageCircle,
  Package,
  Receipt,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { BrandLogo } from "./brand-logo";

const WHATSAPP_URL = "https://wa.me/5493412639357?text=Hola%2C%20quiero%20conocer%20Avianto";
const LOGIN_URL = "/login";
const PAYMENT_TOTAL = 60500;
const STAGE_INTERVAL_MS = 6500;

const money = (value: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(value);

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const noopSubscribe = () => () => {};

/* Devuelve true sólo en el navegador, ya hidratado (sin setState dentro de un efecto). */
function useIsMounted() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

function useReducedMotion() {
  return useSyncExternalStore(
    (notify) => {
      const query = window.matchMedia("(prefers-reduced-motion: reduce)");
      query.addEventListener("change", notify);
      return () => query.removeEventListener("change", notify);
    },
    () => prefersReducedMotion(),
    () => false,
  );
}

/* ---------- Hooks y piezas de movimiento ---------- */

function useInView<T extends Element>(threshold = 0.2) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold]);

  return [ref, inView] as const;
}

function useCountUp(target: number, active: boolean, duration = 1400) {
  const reduced = useReducedMotion();
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active || reduced) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      setValue(Math.round(target * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, reduced, target, duration]);

  return reduced ? target : value;
}

function Reveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  const [ref, inView] = useInView<HTMLDivElement>(0.15);
  return (
    <div
      ref={ref}
      className={`lp-reveal${inView ? " is-in" : ""} ${className}`.trim()}
      style={{ "--d": `${delay}ms` } as CSSProperties}
    >
      {children}
    </div>
  );
}

function SplitWords({ text, startDelay = 0 }: { text: string; startDelay?: number }) {
  // El espacio va fuera del span animado: dentro de un inline-block se colapsa.
  return (
    <>
      {text.split(" ").map((word, index, all) => (
        <span key={`${word}-${index}`}>
          <span className="lp-word" style={{ "--d": `${startDelay + index * 90}ms` } as CSSProperties}>{word}</span>
          {index < all.length - 1 ? " " : null}
        </span>
      ))}
    </>
  );
}

/* ---------- Hero: ficha de servicio viva ---------- */

const TALLER_STEPS = ["Pendiente", "En proceso", "En revisión", "Terminada", "Entregada"];
const HERO_LINES = [
  { name: "Service general", price: 42000 },
  { name: "Revisión de transmisión", price: 18500 },
  { name: "Ajuste y control final", price: null },
];

function HeroRecord() {
  const reduced = useReducedMotion();
  const [cycle, setCycle] = useState(0);
  const tiltRef = useRef<HTMLDivElement>(null);
  // Con movimiento reducido se muestra el estado final (ficha entregada y guardada).
  const phase = reduced ? 5 : cycle;

  useEffect(() => {
    if (reduced) return;
    const timer = window.setInterval(() => setCycle((current) => (current + 1) % 6), 1700);
    return () => window.clearInterval(timer);
  }, [reduced]);

  const stepIndex = Math.min(phase, 4);
  const checked = [phase >= 1, phase >= 2, phase >= 3];
  const total = (checked[0] ? HERO_LINES[0].price ?? 0 : 0) + (checked[1] ? HERO_LINES[1].price ?? 0 : 0);

  const handleMove = (event: PointerEvent<HTMLDivElement>) => {
    const node = tiltRef.current;
    if (!node || event.pointerType !== "mouse") return;
    const rect = node.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    node.style.setProperty("--rx", `${(-y * 7).toFixed(2)}deg`);
    node.style.setProperty("--ry", `${(x * 9).toFixed(2)}deg`);
  };

  const resetTilt = () => {
    const node = tiltRef.current;
    if (!node) return;
    node.style.setProperty("--rx", "0deg");
    node.style.setProperty("--ry", "0deg");
  };

  return (
    <div className="lp-hero-stage">
      <div className="lp-hero-watermark" aria-hidden="true" />
      <div
        ref={tiltRef}
        className="lp-hero-record"
        onPointerMove={handleMove}
        onPointerLeave={resetTilt}
        aria-label="Ejemplo animado de una ficha de servicio de Avianto"
      >
        <div className="lp-record-top">
          <div>
            <span className="lp-kicker">Ficha de servicio</span>
            <strong className="lp-record-title">#0248 · Taller</strong>
          </div>
          <span key={stepIndex} className="lp-status-pill lp-pop">{TALLER_STEPS[stepIndex]}</span>
        </div>

        <div className="lp-record-bike">
          <span className="lp-bike-mark"><Wrench size={20} aria-hidden="true" /></span>
          <div>
            <span className="lp-kicker">Motovehículo</span>
            <strong>Honda GLH 150</strong>
          </div>
          <div className="lp-record-plate">
            <span className="lp-kicker">Dominio</span>
            <strong>AB 123 CD</strong>
          </div>
        </div>

        <ol className="lp-track" aria-label="Circuito de taller" style={{ "--p": stepIndex / (TALLER_STEPS.length - 1) } as CSSProperties}>
          {TALLER_STEPS.map((step, index) => (
            <li key={step} className={index < stepIndex ? "is-done" : index === stepIndex ? "is-current" : ""}>
              <span className="lp-track-dot" aria-hidden="true">{index < stepIndex ? <Check size={11} /> : null}</span>
              <span className="lp-track-label">{step}</span>
            </li>
          ))}
        </ol>

        <ul className="lp-record-lines">
          {HERO_LINES.map((line, index) => (
            <li key={line.name} className={checked[index] ? "is-checked" : ""}>
              <span className="lp-line-box" aria-hidden="true">{checked[index] ? <Check size={12} /> : null}</span>
              <span className="lp-line-name">{line.name}</span>
              <b>{line.price === null ? (checked[index] ? "Listo" : "Por definir") : money(line.price)}</b>
            </li>
          ))}
        </ul>

        <div className="lp-record-total">
          <div>
            <span className="lp-kicker">Total estimado</span>
            <strong key={total} className="lp-total-value lp-pop">{money(total)}</strong>
          </div>
          <span className={`lp-stamp${phase >= 4 ? " is-on" : ""}`}>
            <Check size={14} aria-hidden="true" /> Historial guardado
          </span>
        </div>
      </div>

      <span className="lp-float-tag lp-float-one">Diagnóstico</span>
      <span className="lp-float-tag lp-float-two">Presupuesto</span>
      <span className="lp-float-tag lp-float-three">Pago registrado</span>
    </div>
  );
}

/* ---------- Ticker de módulos ---------- */

const TICKER_ITEMS = [
  "Perfiles",
  "Fichas",
  "Pedidos de repuestos",
  "Services",
  "Ventas",
  "Transferencias",
  "Pagos",
  "Trabajos",
  "Reportes",
  "Auditoría",
  "Roles",
  "Wiki operativa",
];

function Ticker() {
  return (
    <div className="lp-ticker" aria-label="Módulos de Avianto">
      <div className="lp-ticker-track">
        {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, index) => (
          <span key={`${item}-${index}`} aria-hidden={index >= TICKER_ITEMS.length || undefined}>
            {item}
            <i aria-hidden="true" />
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------- Recorrido por módulos ---------- */

type FlowStage = {
  id: string;
  label: string;
  icon: LucideIcon;
  title: string;
  lead: string;
  bullets: string[];
  visual: ReactNode;
};

const FLOW_STAGES: FlowStage[] = [
  {
    id: "perfiles",
    label: "Perfiles",
    icon: ClipboardList,
    title: "Cada moto entra por su dominio.",
    lead: "Buscás la moto o la registrás como nueva, asociás el cliente y el kilometraje, y el perfil reúne toda su historia.",
    bullets: [
      "Búsqueda por dominio, marca, modelo o cliente antes de crear un perfil nuevo.",
      "Elegís el destino operativo de la moto: Taller o Venta.",
      "Desde el perfil se abren sus fichas, pedidos, ventas y pagos.",
    ],
    visual: (
      <div className="lp-mock">
        <div className="lp-mock-search">
          <Search size={16} aria-hidden="true" />
          <span className="lp-typed">AB 123 CD</span>
        </div>
        <div className="lp-mock-profile">
          <span className="lp-plate">AB 123 CD</span>
          <div>
            <strong>Honda GLH 150</strong>
            <span>Cliente registrado · 18.240 km</span>
          </div>
        </div>
        <div className="lp-mock-counters">
          <div><b>3</b><span>Fichas</span></div>
          <div><b>2</b><span>Pedidos</span></div>
          <div><b>1</b><span>Venta</span></div>
        </div>
      </div>
    ),
  },
  {
    id: "fichas",
    label: "Fichas",
    icon: FileText,
    title: "La ficha documenta cada trabajo.",
    lead: "Observaciones del ingreso, trabajos del catálogo y un estado que acompaña a la moto en cada paso del taller.",
    bullets: [
      "Trabajos con precio de referencia y observaciones del ingreso.",
      "Estados que se sincronizan con la ubicación operativa de la moto.",
      "Presupuesto con total visible y desglose opcional.",
    ],
    visual: (
      <div className="lp-mock">
        <div className="lp-mock-states">
          {["Pendiente", "En proceso", "En revisión", "Terminada"].map((state, index) => (
            <span key={state} className={index < 2 ? "is-done" : index === 2 ? "is-current" : ""}>{state}</span>
          ))}
        </div>
        <ul className="lp-mock-works">
          <li><span>01</span><strong>Service general</strong><b>$ 42.000</b></li>
          <li><span>02</span><strong>Revisión de transmisión</strong><b>$ 18.500</b></li>
          <li><span>03</span><strong>Ajuste y control final</strong><b>Por definir</b></li>
        </ul>
        <div className="lp-mock-total"><span>Total del presupuesto</span><strong>$ 60.500</strong></div>
      </div>
    ),
  },
  {
    id: "repuestos",
    label: "Repuestos",
    icon: Package,
    title: "Costo y precio final, siempre separados.",
    lead: "El taller ve cuánto pagó por cada repuesto. El cliente ve el precio final con el recargo aplicado, sin mezclar ambos datos.",
    bullets: [
      "Costo real del taller y precio final con recargo.",
      "Sólo el precio final aparece en la ficha PDF y en los presupuestos.",
      "Seguimiento del pedido desde que se hace hasta que se entrega.",
    ],
    visual: (
      <div className="lp-mock">
        <div className="lp-mock-head"><span>Pedidos de repuestos</span><em>Ejemplo</em></div>
        <table className="lp-mock-table">
          <thead>
            <tr><th scope="col">Repuesto</th><th scope="col">Costo</th><th scope="col">Precio final</th></tr>
          </thead>
          <tbody>
            <tr><td>Pastillas de freno delanteras</td><td>$ 9.000</td><td><b>$ 11.700</b></td></tr>
            <tr><td>Kit de arrastre</td><td>$ 38.000</td><td><b>$ 49.400</b></td></tr>
          </tbody>
        </table>
        <div className="lp-mock-chip">Recargo aplicado: +30 %</div>
      </div>
    ),
  },
  {
    id: "pagos",
    label: "Pagos",
    icon: Banknote,
    title: "Cada pago queda registrado.",
    lead: "Presupuesto, pagado y pendiente se actualizan juntos. Las anulaciones piden confirmación y quedan auditadas.",
    bullets: [
      "Historial con fecha, medio e importe de cada pago.",
      "La ficha pasa a Pagado cuando el presupuesto queda cubierto.",
      "Probá el saldo en vivo en la demo de Pagos.",
    ],
    visual: (
      <div className="lp-mock">
        <div className="lp-balance">
          <div><span>Presupuesto total</span><strong>$ 60.500</strong><i style={{ "--w": "100%" } as CSSProperties} /></div>
          <div><span>Pagado</span><strong>$ 30.000</strong><i className="is-paid" style={{ "--w": "50%" } as CSSProperties} /></div>
          <div><span>Pendiente</span><strong>$ 30.500</strong><i className="is-pending" style={{ "--w": "50%" } as CSSProperties} /></div>
        </div>
        <div className="lp-mock-chip">Historial: 15/11/26 · Transferencia · $ 30.000</div>
      </div>
    ),
  },
  {
    id: "transferencias",
    label: "Transferencias",
    icon: ArrowRightLeft,
    title: "La titularidad cambia al cerrar.",
    lead: "Administración arma la carpeta de transferencia y programa el turno. Recién con la asistencia confirmada, la moto cambia de dueño.",
    bullets: [
      "Requisitos obligatorios que deben quedar realizados para cerrar.",
      "Turno con fecha, horario y lugar.",
      "Una transferencia cancelada vuelve a En venta con su auditoría.",
    ],
    visual: (
      <div className="lp-mock">
        <div className="lp-mock-head"><span>Carpeta de transferencia</span><em>2 de 4</em></div>
        <ul className="lp-checklist">
          <li className="is-done"><Check size={14} aria-hidden="true" /> Comprador identificado</li>
          <li className="is-done"><Check size={14} aria-hidden="true" /> Requisitos completos</li>
          <li><span aria-hidden="true" /> Turno con fecha y lugar</li>
          <li><span aria-hidden="true" /> Asistencia confirmada</li>
        </ul>
        <div className="lp-progress-bar"><i style={{ "--w": "50%" } as CSSProperties} /></div>
      </div>
    ),
  },
  {
    id: "ventas",
    label: "Ventas",
    icon: Receipt,
    title: "Desde disponible hasta vendida.",
    lead: "La ficha de venta se crea al ingresar la moto al circuito comercial y conserva todo su historial de principio a fin.",
    bullets: [
      "El comprador es prospectivo hasta el cierre de la venta.",
      "Una moto vendida puede volver a Taller con su historia intacta.",
      "Disponible no es lo mismo que En venta: sólo lo segundo entra al circuito comercial.",
    ],
    visual: (
      <div className="lp-mock">
        <div className="lp-mock-sale">
          {["Disponible", "En venta", "Transferencia en proceso", "Vendida"].map((state, index) => (
            <span key={state} className={index < 2 ? "is-done" : index === 2 ? "is-current" : ""}>{state}</span>
          ))}
        </div>
        <div className="lp-mock-chip">Ficha de venta · Honda GLH 150 · Transferencia en proceso</div>
      </div>
    ),
  },
];

function FlowExplorer() {
  const [active, setActive] = useState(0);
  const [manual, setManual] = useState(false);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    if (manual || prefersReducedMotion()) return;
    const timer = window.setTimeout(() => setActive((current) => (current + 1) % FLOW_STAGES.length), STAGE_INTERVAL_MS);
    return () => window.clearTimeout(timer);
  }, [active, manual]);

  const select = (index: number, focus = false) => {
    setManual(true);
    setActive(index);
    if (focus) tabRefs.current[index]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = FLOW_STAGES.length - 1;
    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      event.preventDefault();
      select(index === last ? 0 : index + 1, true);
    } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      event.preventDefault();
      select(index === 0 ? last : index - 1, true);
    }
  };

  const stage = FLOW_STAGES[active];
  const StageIcon = stage.icon;

  return (
    <div className="lp-flow">
      <div className="lp-flow-tabs" role="tablist" aria-label="Módulos del flujo" aria-orientation="vertical">
        {FLOW_STAGES.map((item, index) => {
          const Icon = item.icon;
          const isActive = index === active;
          return (
            <button
              key={item.id}
              ref={(node) => { tabRefs.current[index] = node; }}
              type="button"
              role="tab"
              id={`lp-tab-${item.id}`}
              aria-selected={isActive}
              aria-controls={`lp-panel-${item.id}`}
              tabIndex={isActive ? 0 : -1}
              className={`lp-flow-tab${isActive ? " is-active" : ""}`}
              onClick={() => select(index)}
              onKeyDown={(event) => onKeyDown(event, index)}
            >
              <span className="lp-flow-num">{String(index + 1).padStart(2, "0")}</span>
              <Icon size={18} aria-hidden="true" />
              <span className="lp-flow-name">{item.label}</span>
              {isActive && !manual ? <i key={`bar-${active}`} className="lp-flow-bar" aria-hidden="true" /> : null}
            </button>
          );
        })}
      </div>

      <div
        key={stage.id}
        id={`lp-panel-${stage.id}`}
        role="tabpanel"
        aria-labelledby={`lp-tab-${stage.id}`}
        className="lp-flow-panel lp-stage-in"
      >
        <div className="lp-panel-band">
          <StageIcon size={20} aria-hidden="true" />
          <span>{stage.label}</span>
        </div>
        <div className="lp-panel-body">
          <div className="lp-panel-copy">
            <h3>{stage.title}</h3>
            <p>{stage.lead}</p>
            <ul>
              {stage.bullets.map((bullet) => (
                <li key={bullet}><Check size={16} aria-hidden="true" /> {bullet}</li>
              ))}
            </ul>
          </div>
          <div className="lp-panel-visual">{stage.visual}</div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Circuitos de estado ---------- */

const TALLER_CIRCUIT = ["Disponible", "Ingresada Taller", "Pendiente", "En proceso", "En revisión", "Terminada", "Entregada"];
const VENTA_CIRCUIT = ["Disponible", "En venta", "Transferencia en proceso", "Vendida"];

function Circuit({ label, steps, tone }: { label: string; steps: string[]; tone: "blue" | "red" }) {
  const [ref, inView] = useInView<HTMLDivElement>(0.3);
  return (
    <div ref={ref} className={`lp-circuit lp-circuit-${tone}${inView ? " is-live" : ""}`}>
      <span className="lp-circuit-label">{label}</span>
      <ol>
        {steps.map((step, index) => (
          <li key={step} style={{ "--i": index } as CSSProperties}>
            <span>{step}</span>
            {index < steps.length - 1 ? <ArrowRight size={16} aria-hidden="true" className="lp-circuit-arrow" /> : null}
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ---------- Demo de pagos ---------- */

type Payment = { id: number; amount: number; medio: string; fecha: string };

function PaymentDemo() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const nextId = useRef(1);

  const paid = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const pending = Math.max(PAYMENT_TOTAL - paid, 0);
  const settled = pending === 0;
  const paidPercent = Math.round((paid / PAYMENT_TOTAL) * 100);

  const pay = (amount: number) => {
    setPayments((previous) => {
      const current = previous.reduce((sum, payment) => sum + payment.amount, 0);
      const applied = Math.min(amount, PAYMENT_TOTAL - current);
      if (applied <= 0) return previous;
      const fecha = new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" });
      const medio = previous.length % 2 === 0 ? "Transferencia" : "Efectivo";
      const payment: Payment = { id: nextId.current++, amount: applied, medio, fecha };
      return [...previous, payment];
    });
  };

  return (
    <section className="lp-section lp-payments" id="pagos">
      <Reveal className="lp-section-head">
        <span className="lp-eyebrow">Pagos</span>
        <h2>Probá el saldo de una ficha.</h2>
        <p>Demo con datos de ejemplo: registrá pagos y mirá cómo se actualiza el balance en el mismo instante.</p>
      </Reveal>

      <Reveal delay={120} className="lp-ledger">
        <div className="lp-ledger-head">
          <div>
            <span className="lp-kicker">Ficha #0248 · Honda GLH 150</span>
            <strong>Balance de pagos</strong>
          </div>
          <span className={`lp-status-pill ${settled ? "is-ok" : "is-warn"}`}>{settled ? "Pagado" : "Pendiente"}</span>
        </div>

        <div className="lp-ledger-bars">
          <div>
            <span>Presupuesto total</span>
            <strong>{money(PAYMENT_TOTAL)}</strong>
            <i style={{ "--w": "100%" } as CSSProperties} />
          </div>
          <div>
            <span>Pagado</span>
            <strong>{money(paid)}</strong>
            <i className="is-paid" style={{ "--w": `${paidPercent}%` } as CSSProperties} />
          </div>
          <div>
            <span>Pendiente</span>
            <strong className={settled ? "is-ok-text" : "is-risk-text"}>{money(pending)}</strong>
            <i className={settled ? "is-paid" : "is-pending"} style={{ "--w": `${100 - paidPercent}%` } as CSSProperties} />
          </div>
        </div>

        <div className="lp-ledger-actions">
          <button type="button" onClick={() => pay(10000)} disabled={settled}>+ {money(10000)}</button>
          <button type="button" onClick={() => pay(20000)} disabled={settled}>+ {money(20000)}</button>
          <button type="button" className="is-primary" onClick={() => pay(pending)} disabled={settled}>Saldar todo</button>
          <button type="button" className="is-ghost" onClick={() => setPayments([])} disabled={payments.length === 0}>Reiniciar demo</button>
        </div>

        <div className="lp-ledger-history">
          <span className="lp-kicker">Historial de pagos</span>
          {payments.length === 0 ? (
            <p className="lp-ledger-empty">Todavía no hay pagos registrados en esta ficha.</p>
          ) : (
            <ul aria-live="polite">
              {payments.map((payment) => (
                <li key={payment.id} className="lp-pop">
                  <span>{payment.fecha}</span>
                  <span>{payment.medio}</span>
                  <b>{money(payment.amount)}</b>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Reveal>
    </section>
  );
}

/* ---------- Operario y administración ---------- */

const PHONE_TABS = [
  { id: "inicio", label: "Inicio", art: "/brand/avianto-svg/nav-home.svg" },
  { id: "perfiles", label: "Perfiles", art: "/brand/avianto-svg/nav-profiles.svg" },
  { id: "fichas", label: "Fichas", art: "/brand/avianto-svg/nav-orders.svg" },
  { id: "pedidos", label: "Pedidos", art: "/brand/avianto-svg/nav-pedidos.svg" },
  { id: "mas", label: "Más", art: "/brand/avianto-svg/nav-more.svg" },
] as const;

function PhoneScreen({ id }: { id: (typeof PHONE_TABS)[number]["id"] }) {
  if (id === "inicio") {
    return (
      <div className="lp-screen-body lp-pop">
        <span className="lp-kicker">Hoy en el taller</span>
        <div className="lp-tiles">
          <div><b>4</b><span>Fichas abiertas</span></div>
          <div><b>2</b><span>Pedidos</span></div>
          <div className="is-risk"><b>1</b><span>Pago pendiente</span></div>
        </div>
      </div>
    );
  }
  if (id === "perfiles") {
    return (
      <div className="lp-screen-body lp-pop">
        <span className="lp-kicker">Perfiles</span>
        <div className="lp-row"><span className="lp-plate">AB 123 CD</span><strong>Honda GLH 150</strong></div>
        <div className="lp-row"><span className="lp-plate">AE 456 FG</span><strong>Yamaha FZ 25</strong></div>
      </div>
    );
  }
  if (id === "fichas") {
    return (
      <div className="lp-screen-body lp-pop">
        <span className="lp-kicker">Ficha #0248</span>
        <strong className="lp-screen-title">En revisión</strong>
        <div className="lp-mini-track"><i style={{ "--w": "75%" } as CSSProperties} /></div>
        <div className="lp-row"><span>Service general</span><b>$ 42.000</b></div>
      </div>
    );
  }
  if (id === "pedidos") {
    return (
      <div className="lp-screen-body lp-pop">
        <span className="lp-kicker">Pedidos de repuestos</span>
        <div className="lp-row"><span>Pastillas de freno</span><b>$ 11.700</b></div>
        <div className="lp-row"><span>Kit de arrastre</span><b>$ 49.400</b></div>
      </div>
    );
  }
  return (
    <div className="lp-screen-body lp-pop">
      <span className="lp-kicker">Más opciones</span>
      <div className="lp-row"><span>Wiki operativa</span><ArrowRight size={14} aria-hidden="true" /></div>
      <div className="lp-row"><span>Reportes</span><ArrowRight size={14} aria-hidden="true" /></div>
      <div className="lp-row"><span>Administración</span><ArrowRight size={14} aria-hidden="true" /></div>
    </div>
  );
}

function PhoneMock() {
  const [active, setActive] = useState(0);
  const [manual, setManual] = useState(false);

  useEffect(() => {
    if (manual || prefersReducedMotion()) return;
    const timer = window.setInterval(() => setActive((current) => (current + 1) % PHONE_TABS.length), 2600);
    return () => window.clearInterval(timer);
  }, [manual]);

  const current = PHONE_TABS[active];

  return (
    <div className="lp-phone" aria-label="Vista móvil de Avianto para el operario">
      <div className="lp-phone-notch" aria-hidden="true" />
      <div className="lp-phone-screen">
        <div className="lp-phone-top">
          <BrandLogo variant="color" size="sm" />
        </div>
        <div key={current.id} className="lp-phone-content">
          <PhoneScreen id={current.id} />
        </div>
        <nav className="lp-phone-nav" aria-label="Ejemplo de navegación móvil">
          {PHONE_TABS.map((tab, index) => (
            <button
              key={tab.id}
              type="button"
              className={index === active ? "is-active" : ""}
              aria-label={tab.label}
              aria-current={index === active ? "true" : undefined}
              onClick={() => { setManual(true); setActive(index); }}
            >
              <span className="lp-nav-art" style={{ "--art": `url('${tab.art}')` } as CSSProperties} aria-hidden="true" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}

function DeskMock() {
  return (
    <div className="lp-desk">
      <div className="lp-desk-head">
        <div>
          <span className="lp-kicker">Administración · Presupuesto</span>
          <strong>Ficha #0248 · Honda GLH 150</strong>
        </div>
        <span className="lp-status-pill is-ok"><Check size={12} aria-hidden="true" /> Revisado</span>
      </div>
      <table className="lp-desk-table">
        <thead>
          <tr><th scope="col">Trabajo</th><th scope="col">Precio</th><th scope="col">Estado</th></tr>
        </thead>
        <tbody>
          <tr><td>Service general</td><td>$ 42.000</td><td>Listo</td></tr>
          <tr><td>Revisión de transmisión</td><td>$ 18.500</td><td>Listo</td></tr>
          <tr><td>Pastillas de freno (precio final)</td><td>$ 11.700</td><td>Pedido</td></tr>
        </tbody>
      </table>
      <div className="lp-desk-total">
        <span>Total del presupuesto</span>
        <strong>$ 72.200</strong>
      </div>
      <div className="lp-desk-foot">
        <span><ShieldCheck size={15} aria-hidden="true" /> Cambios auditados</span>
        <span><History size={15} aria-hidden="true" /> Precios sin sobrescribir</span>
      </div>
    </div>
  );
}

/* ---------- Módulos ---------- */

const MODULE_GROUPS: Array<{ label: string; items: Array<{ label: string; icon: LucideIcon; text: string }> }> = [
  {
    label: "Principal",
    items: [
      { label: "Inicio", icon: LayoutDashboard, text: "Resumen del taller y accesos a lo que sigue." },
      { label: "Perfiles", icon: ClipboardList, text: "Ingreso por dominio y perfil completo de cada moto." },
      { label: "Wiki", icon: BookOpen, text: "Circuitos, estados y reglas clave, siempre a mano." },
    ],
  },
  {
    label: "Taller",
    items: [
      { label: "Fichas", icon: FileText, text: "Trabajos, observaciones, presupuesto y pagos del taller." },
      { label: "Pedidos", icon: Package, text: "Repuestos con costo, precio final y seguimiento." },
      { label: "Services", icon: Wrench, text: "Mantenimientos con búsqueda y filtro por estado." },
    ],
  },
  {
    label: "Ventas",
    items: [
      { label: "Ventas", icon: Receipt, text: "Fichas de venta desde la moto disponible hasta vendida." },
      { label: "Transferencias", icon: ArrowRightLeft, text: "Carpetas, turnos y cierre de la titularidad." },
    ],
  },
  {
    label: "Registros",
    items: [
      { label: "Clientes", icon: Users, text: "Datos de contacto y motos asociadas a cada cliente." },
      { label: "Motos", icon: Bike, text: "Cada moto con su foto, datos técnicos y estado." },
      { label: "Controles", icon: SlidersHorizontal, text: "Revisiones y controles antes de la entrega." },
      { label: "Trabajos", icon: Hammer, text: "Catálogo de trabajos con precios de referencia." },
    ],
  },
  {
    label: "Gestión",
    items: [
      { label: "Reportes", icon: FileBarChart, text: "Facturación, costos y ganancia de los pedidos." },
      { label: "Roles", icon: ShieldCheck, text: "Permisos por sección del menú para cada rol." },
      { label: "Auditoría", icon: History, text: "Quién cambió qué, y cuándo, en cada registro." },
      { label: "Administración", icon: Settings, text: "Datos de la organización y copias de respaldo." },
    ],
  },
];

/* ---------- Página ---------- */

export function LandingPage() {
  const mounted = useIsMounted();
  const [statsRef, statsInView] = useInView<HTMLDivElement>(0.4);
  const modules = useCountUp(16, statsInView, 1200);
  const taller = useCountUp(7, statsInView, 900);
  const venta = useCountUp(4, statsInView, 900);

  return (
    <main className={`lp${mounted ? " is-js" : ""}`}>
      <header className="lp-header">
        <a className="lp-brand" href="#inicio" aria-label="Avianto, volver al inicio">
          <BrandLogo variant="color" size="sm" descriptor />
        </a>
        <nav className="lp-nav" aria-label="Navegación principal">
          <a href="#recorrido">Recorrido</a>
          <a href="#modulos">Módulos</a>
          <a href="#pagos">Pagos</a>
          {/* Full navigation avoids the deployed Vinext Link transition failure. */}
          <a className="lp-nav-login" href={LOGIN_URL}><LogIn size={16} aria-hidden="true" /> Ingresar</a>
          <a className="lp-nav-contact" href={WHATSAPP_URL} target="_blank" rel="noreferrer">
            <MessageCircle size={16} aria-hidden="true" /> <span className="lp-txt">Contactanos</span>
          </a>
        </nav>
      </header>

      <section className="lp-hero" id="inicio">
        <div className="lp-hero-copy">
          <span className="lp-eyebrow lp-eyebrow-live">
            <i aria-hidden="true" /> Mecánica integral de motos
          </span>
          <h1 aria-label="Cada moto tiene una historia. Avianto la ordena.">
            <span aria-hidden="true">
              <SplitWords text="Cada moto tiene una historia." />
              <em className="lp-hero-em">
                <SplitWords text="Avianto la ordena." startDelay={520} />
              </em>
            </span>
          </h1>
          <p className="lp-lead lp-fade" style={{ "--d": "900ms" } as CSSProperties}>
            Desde que la moto entra al taller hasta que se entrega o se vende: perfil, ficha, repuestos, pagos y transferencia,
            en un mismo registro que siempre se puede consultar.
          </p>
          <div className="lp-actions lp-fade" style={{ "--d": "1100ms" } as CSSProperties}>
            <a className="lp-btn lp-btn-primary" href={WHATSAPP_URL} target="_blank" rel="noreferrer">
              Conocer Avianto <ArrowUpRight size={18} aria-hidden="true" />
            </a>
            <a className="lp-btn lp-btn-ghost" href="#recorrido">Ver el recorrido</a>
          </div>
          <div className="lp-stats" ref={statsRef}>
            <div><b>{modules}</b><span>secciones conectadas</span></div>
            <div><b>{taller}</b><span>estados de taller</span></div>
            <div><b>{venta}</b><span>estados de venta</span></div>
          </div>
        </div>

        <HeroRecord />
      </section>

      <Ticker />

      <section className="lp-section" id="recorrido">
        <Reveal className="lp-section-head">
          <span className="lp-eyebrow">Recorrido completo</span>
          <h2>Del ingreso a la venta, sin perder un dato.</h2>
          <p>Recorré cada módulo: lo que se captura en el taller y lo que administración decide después.</p>
        </Reveal>
        <Reveal delay={120}>
          <FlowExplorer />
        </Reveal>
      </section>

      <section className="lp-section lp-circuits" id="circuitos">
        <Reveal className="lp-section-head">
          <span className="lp-eyebrow">Estados</span>
          <h2>Dos circuitos, un solo estado por moto.</h2>
          <p>Las transiciones salen de las acciones del sistema. Nadie elige un estado de una lista libre.</p>
        </Reveal>
        <div className="lp-circuit-stack">
          <Circuit label="Taller" steps={TALLER_CIRCUIT} tone="blue" />
          <Circuit label="Venta" steps={VENTA_CIRCUIT} tone="red" />
        </div>
        <Reveal delay={150}>
          <p className="lp-circuit-note">
            <ShieldCheck size={18} aria-hidden="true" />
            Una ficha puede cancelarse desde Pendiente, En proceso o En revisión, y la moto conserva su historial.
          </p>
        </Reveal>
      </section>

      <PaymentDemo />

      <section className="lp-section lp-roles" id="operario">
        <Reveal className="lp-section-head">
          <span className="lp-eyebrow">Dos pantallas, un mismo registro</span>
          <h2>Captura en el taller. Revisión en la PC.</h2>
          <p>
            El operario carga lo que ve en la moto desde el celular. Administración estandariza, ajusta precios y arma el
            presupuesto desde el escritorio.
          </p>
        </Reveal>
        <div className="lp-roles-grid">
          <Reveal>
            <figure className="lp-role-card">
              <PhoneMock />
              <figcaption><span>Taller</span> Captura desde el celular</figcaption>
            </figure>
          </Reveal>
          <Reveal delay={150}>
            <figure className="lp-role-card lp-role-desk">
              <DeskMock />
              <figcaption><span>Administración</span> Revisión y presupuesto en la PC</figcaption>
            </figure>
          </Reveal>
        </div>
      </section>

      <section className="lp-section lp-modules" id="modulos">
        <Reveal className="lp-section-head">
          <span className="lp-eyebrow">Módulos</span>
          <h2>Todo el flujo, en un mismo sistema.</h2>
          <p>
            Dieciséis secciones conectadas entre sí: lo que pasa en el taller queda disponible para administración, y al revés.
          </p>
        </Reveal>
        <div className="lp-module-groups">
          {MODULE_GROUPS.map((group, groupIndex) => (
            <Reveal key={group.label} delay={groupIndex * 90} className="lp-module-group">
              <h3>{group.label}</h3>
              <ul>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.label} className="lp-module-card">
                      <span className="lp-module-icon"><Icon size={20} aria-hidden="true" /></span>
                      <div>
                        <strong>{item.label}</strong>
                        <span>{item.text}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="lp-cta" id="demo">
        <div className="lp-cta-copy">
          <Reveal>
            <h2>Conocé el flujo completo con tu taller.</h2>
            <p>Escribinos y te mostramos cómo Avianto conecta el ingreso de una moto con su venta o su entrega.</p>
          </Reveal>
        </div>
        <Reveal delay={150} className="lp-cta-actions">
          <a className="lp-btn lp-btn-light" href={WHATSAPP_URL} target="_blank" rel="noreferrer">
            Contactar por WhatsApp <MessageCircle size={18} aria-hidden="true" />
          </a>
          <a className="lp-btn lp-btn-outline" href={LOGIN_URL}>Ingresar al sistema</a>
        </Reveal>
      </section>

      <footer className="lp-footer">
        <a className="lp-brand" href="#inicio" aria-label="Avianto, volver al inicio">
          <BrandLogo variant="color" size="sm" descriptor />
        </a>
        <div>
          <span>Gestión de taller para motos</span>
          <a href={WHATSAPP_URL} target="_blank" rel="noreferrer">
            Escribinos por WhatsApp <ArrowUpRight size={14} aria-hidden="true" />
          </a>
        </div>
      </footer>
    </main>
  );
}
