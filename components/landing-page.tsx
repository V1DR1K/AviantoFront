import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ClipboardList,
  FileCheck2,
  FileText,
  LogIn,
  Wrench,
} from "lucide-react";
import Link from "next/link";

export function LandingPage() {
  return (
    <main className="landing-page">
      <header className="landing-header">
        <a className="landing-brand" href="#inicio" aria-label="Avianto, volver al inicio">
          <span className="brand-mark">A</span>
          <span>Avianto<span>Software</span></span>
        </a>
        <nav className="landing-nav" aria-label="Navegación principal">
          <a href="#como-funciona">Cómo funciona</a>
          <a href="#para-talleres">Para talleres</a>
          <Link className="landing-login" href="/login"><LogIn size={16} /> Ingresar</Link>
        </nav>
      </header>

      <section className="landing-hero" id="inicio">
        <div className="landing-hero-copy">
          <h1>Cada moto tiene una historia. <em>Avianto la ordena.</em></h1>
          <p className="landing-lead">
            Convertí el diagnóstico del taller en órdenes de trabajo claras, presupuestos revisables e historial que siempre se puede consultar.
          </p>
          <div className="landing-actions">
            <a className="landing-button landing-button-primary" href="#demo">
              Conocer Avianto <ArrowUpRight size={18} />
            </a>
            <a className="landing-text-link" href="#como-funciona">Ver cómo funciona <ArrowRight size={16} /></a>
          </div>
          <p className="landing-note">Pensado para el ritmo real de un taller de motos.</p>
        </div>

        <div className="landing-hero-visual" aria-label="Ejemplo de una ficha de servicio de Avianto">
          <div className="landing-visual-caption">Vista de producto <span>Ejemplo</span></div>
          <div className="service-record">
            <div className="service-record-topline">
              <div>
                <span className="record-label">Ficha de servicio</span>
                <strong>#0248 · En revisión</strong>
              </div>
              <span className="record-status">En proceso</span>
            </div>
            <div className="record-bike">
              <div className="record-bike-mark"><Wrench size={20} /></div>
              <div><span>Motovehículo</span><strong>Honda GLH 150</strong></div>
              <div><span>Patente</span><strong>AB 123 CD</strong></div>
            </div>
            <div className="record-observation">
              <span>Observación de ingreso</span>
              <p>Revisar ruido en transmisión y realizar service general.</p>
            </div>
            <div className="record-lines">
              <div><span>01</span><strong>Service general</strong><b>$ 42.000</b></div>
              <div><span>02</span><strong>Revisión de transmisión</strong><b>$ 18.500</b></div>
              <div><span>03</span><strong>Ajuste y control final</strong><b>Por definir</b></div>
            </div>
            <div className="record-bottom">
              <div><span>Total estimado</span><strong>$ 60.500</strong></div>
              <span className="record-audit"><Check size={14} /> Historial guardado</span>
            </div>
          </div>
          <div className="landing-visual-tag landing-visual-tag-one">Diagnóstico</div>
          <div className="landing-visual-tag landing-visual-tag-two">Presupuesto</div>
        </div>
      </section>

      <section className="landing-intro" id="para-talleres">
        <div>
          <h2>Menos mensajes sueltos. Más trabajo que avanza.</h2>
        </div>
        <p>
          Avianto conecta lo que pasa junto a la moto con lo que necesita resolver administración. La información llega ordenada, cada cambio queda visible y el presupuesto se arma sobre datos concretos.
        </p>
      </section>

      <section className="landing-workflow" id="como-funciona">
        <div className="landing-workflow-heading">
          <h2>La velocidad del taller. La precisión del escritorio.</h2>
        </div>
        <div className="workflow-track">
          <article className="workflow-step workflow-step-dark">
            <div className="workflow-icon"><ClipboardList size={22} /></div>
            <div>
              <span className="workflow-number">01 · En el taller</span>
              <h3>Capturá lo importante en el momento.</h3>
              <p>Registrá cliente, moto, motivo del ingreso, notas, fotos y tareas conocidas desde el celular.</p>
            </div>
            <div className="workflow-quote">“Que el diagnóstico no dependa de acordarse después.”</div>
          </article>
          <div className="workflow-connector" aria-hidden="true"><ArrowRight size={20} /></div>
          <article className="workflow-step workflow-step-light">
            <div className="workflow-icon"><FileCheck2 size={22} /></div>
            <div>
              <span className="workflow-number">02 · En administración</span>
              <h3>Convertí la información en una decisión.</h3>
              <p>Estandarizá trabajos, ajustá precios, prepará presupuestos y mantené el historial sin sobrescribir lo anterior.</p>
            </div>
            <div className="workflow-quote">“Una ficha clara para avanzar con el cliente.”</div>
          </article>
        </div>
      </section>

      <section className="landing-capabilities">
        <div className="capabilities-aside">
          <h2>La ficha deja de ser un papel perdido.</h2>
          <p>Un registro único acompaña la moto desde que entra hasta que vuelve a la calle.</p>
        </div>
        <div className="capabilities-list">
          <div><span>01</span><div><h3>Ingresos claros</h3><p>Cliente, moto, observaciones y estado en un solo lugar.</p></div><ArrowUpRight size={18} /></div>
          <div><span>02</span><div><h3>Catálogo reutilizable</h3><p>Trabajos y repuestos frecuentes listos para volver a usar.</p></div><ArrowUpRight size={18} /></div>
          <div><span>03</span><div><h3>Presupuestos revisables</h3><p>Administración puede ordenar y ajustar antes de compartir.</p></div><ArrowUpRight size={18} /></div>
          <div><span>04</span><div><h3>Historial trazable</h3><p>Estados, cambios y antecedentes no se pierden en el camino.</p></div><ArrowUpRight size={18} /></div>
        </div>
      </section>

      <section className="landing-proof">
        <div className="landing-proof-card">
          <div className="proof-card-head"><FileText size={19} /><span>El lenguaje de Avianto</span></div>
          <p>Una consola hecha para leer rápido: estados visibles, acciones etiquetadas y datos que se pueden revisar.</p>
          <div className="proof-card-rule" />
          <div className="proof-card-meta"><span>Operario</span><strong>captura</strong><span>Administración</span><strong>estandariza</strong></div>
        </div>
        <div className="landing-proof-copy">
          <h2>Es el registro de servicio de tu taller.</h2>
          <p>Avianto está pensado para que la operación sea simple en el celular y detallada en la PC, sin obligar a todo el equipo a trabajar de la misma manera.</p>
        </div>
      </section>

      <section className="landing-cta" id="demo">
        <div>
          <h2>Conocé el flujo completo.</h2>
          <p>Entrá al sistema para ver cómo Avianto conecta el ingreso de una moto con su orden de trabajo.</p>
        </div>
        <Link className="landing-button landing-button-light" href="/login">
          Ver el sistema <ArrowUpRight size={18} />
        </Link>
      </section>

      <footer className="landing-footer">
        <a className="landing-brand" href="#inicio"><span className="brand-mark">A</span><span>Avianto<span>Software</span></span></a>
        <div><span>Gestión de taller para motos</span><Link href="/login">Ingresar al sistema <LogIn size={14} /></Link></div>
      </footer>
    </main>
  );
}
