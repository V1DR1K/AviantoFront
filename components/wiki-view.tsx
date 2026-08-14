import {
  ArrowRight,
  Bike,
  BookOpen,
  ClipboardCheck,
  Package,
  ShieldCheck,
} from "lucide-react";
import { StatusBadge } from "./ui";

type StateEntry = {
  status: string;
  meaning: string;
  enables: string;
  note?: string;
};

const motoStates: StateEntry[] = [
  {
    status: "Disponible",
    meaning: "La moto está registrada, pero no participa de ningún circuito operativo ni está ingresada físicamente.",
    enables: "Ingresarla a Taller o a Ventas.",
    note: "No significa que esté publicada ni disponible para vender.",
  },
  {
    status: "Ingresada Taller",
    meaning: "La moto ingresó físicamente al Taller y todavía no tiene una ficha de trabajo abierta.",
    enables: "Crear una ficha de trabajo o un pedido de repuestos.",
  },
  {
    status: "Pendiente",
    meaning: "Existe una ficha de Taller cargada; el trabajo todavía no fue iniciado.",
    enables: "Editar la ficha y comenzar el trabajo.",
  },
  {
    status: "En proceso",
    meaning: "El Taller está ejecutando al menos una tarea de la ficha.",
    enables: "Completar tareas, volver a Pendiente o, cuando todas estén resueltas, enviar manualmente la ficha a revisión.",
  },
  {
    status: "En revisión",
    meaning: "Todos los trabajos de la ficha están resueltos y requieren control antes de cerrar el trabajo.",
    enables: "Registrar controles, devolver la ficha a proceso o aprobar la revisión.",
  },
  {
    status: "Terminada",
    meaning: "La revisión fue aprobada. El trabajo terminó, pero la moto sigue dentro del Taller.",
    enables: "Registrar la entrega efectiva al cliente.",
    note: "No equivale a Entregada.",
  },
  {
    status: "Entregada",
    meaning: "La moto fue retirada por el cliente y el circuito de Taller quedó cerrado.",
    enables: "Un nuevo ingreso posterior a Taller o a Ventas.",
  },
  {
    status: "En venta",
    meaning: "La moto ingresó al circuito de Ventas y está disponible para realizar la transferencia comercial.",
    enables: "Iniciar una transferencia a otro cliente.",
    note: "Es el único estado que representa disponibilidad comercial para vender.",
  },
  {
    status: "Transferencia en proceso",
    meaning: "Se registró un nuevo titular y la operación comercial espera su confirmación final.",
    enables: "Completar la venta. Solo Administración puede hacerlo.",
  },
  {
    status: "Vendida",
    meaning: "La venta se completó y la moto dejó de estar ingresada al negocio.",
    enables: "Conservar la trazabilidad del historial y de la transferencia.",
    note: "Es un estado terminal: no puede reingresarse.",
  },
];

const fichaStates: StateEntry[] = [
  { status: "Pendiente", meaning: "La ficha fue creada y espera el inicio de los trabajos.", enables: "Editar la ficha o comenzar el trabajo." },
  { status: "En proceso", meaning: "El trabajo de la ficha está en ejecución.", enables: "Completar tareas, volver a Pendiente o, cuando todas estén resueltas, enviar manualmente a revisión." },
  { status: "En revisión", meaning: "La ficha espera la validación de sus controles de calidad.", enables: "Aprobar la revisión o devolverla a proceso." },
  { status: "Terminada", meaning: "La revisión fue aprobada y la ficha quedó cerrada para edición operativa.", enables: "Entregar la moto al cliente." },
  { status: "Entregada", meaning: "La entrega fue registrada y el trabajo finalizó completamente.", enables: "Consultar el historial y registrar un service si corresponde." },
  { status: "Cancelada", meaning: "El trabajo se interrumpió sin completar el circuito de Taller.", enables: "Conservar el registro para auditoría." },
];

const workStates: StateEntry[] = [
  { status: "Pendiente", meaning: "La tarea está incluida en la ficha, pero no fue realizada.", enables: "Marcarla como Realizado o Cancelado." },
  { status: "Realizado", meaning: "La tarea fue completada por el Taller.", enables: "Participar de la revisión de la ficha." },
  { status: "Cancelado", meaning: "La tarea no se realizará.", enables: "Mantener el motivo y el historial sin contabilizarla como trabajo pendiente." },
];

const paymentStates: StateEntry[] = [
  { status: "No pagado", meaning: "No hay ítems cobrados.", enables: "Registrar un pago total o parcial." },
  { status: "Parcial", meaning: "Se cobraron algunos ítems, pero no todos los aplicables.", enables: "Editar la selección de ítems cobrados o completar el pago." },
  { status: "Pagado", meaning: "Todos los ítems aplicables están cobrados.", enables: "Revertir el registro si fue necesario." },
];

const revisionStates: StateEntry[] = [
  { status: "Abierta", meaning: "La ficha llegó a revisión y todavía no fue aprobada.", enables: "Completar los controles requeridos." },
  { status: "Aprobada", meaning: "Los controles fueron aceptados y la ficha pasa a Terminada.", enables: "Entregar la moto al cliente." },
];

const revisionControlStates: StateEntry[] = [
  { status: "Pendiente", meaning: "Un control individual todavía necesita revisión.", enables: "Marcarlo como Revisado o No aplica." },
  { status: "Revisado", meaning: "El control individual fue validado.", enables: "Cerrar la revisión cuando todos los controles estén resueltos." },
  { status: "No aplica", meaning: "El control no corresponde a esta ficha.", enables: "Excluirlo sin bloquear la aprobación." },
];

const repuestoPedidoStates: StateEntry[] = [
  { status: "En curso", meaning: "El pedido de repuestos sigue abierto.", enables: "Gestionar sus ítems, pagos y cierre." },
  { status: "Completado", meaning: "El pedido quedó resuelto.", enables: "Consultar el historial." },
  { status: "Cancelado", meaning: "El pedido no continuará.", enables: "Conservar la trazabilidad sin nuevas modificaciones." },
];

const repuestoItemStates: StateEntry[] = [
  { status: "Pendiente de pedir", meaning: "El ítem todavía no fue solicitado al proveedor.", enables: "Marcarlo como Pedido." },
  { status: "Pedido", meaning: "El ítem fue solicitado y se espera su recepción.", enables: "Marcarlo como Recibido." },
  { status: "Recibido", meaning: "El ítem llegó al Taller.", enables: "Entregarlo o asociarlo al trabajo correspondiente." },
  { status: "Entregado", meaning: "El ítem fue entregado para cerrar el pedido o trabajo.", enables: "Mantener el historial." },
  { status: "Cancelado", meaning: "El ítem no se adquirirá ni entregará.", enables: "Mantener el historial sin considerarlo pendiente." },
];

function StateList({ entries }: { entries: StateEntry[] }) {
  return (
    <div className="wiki-state-list">
      {entries.map((entry, index) => (
        <article className="wiki-state" key={`${entry.status}-${index}`}>
          <div className="wiki-state-name"><StatusBadge status={entry.status} /></div>
          <div><strong>Representa</strong><p>{entry.meaning}</p></div>
          <div><strong>Habilita</strong><p>{entry.enables}</p>{entry.note && <small>{entry.note}</small>}</div>
        </article>
      ))}
    </div>
  );
}

function Flow({ steps, label }: { steps: string[]; label: string }) {
  return <ol className="wiki-flow" aria-label={label}>{steps.map((step, index) => <li key={step}><StatusBadge status={step} />{index < steps.length - 1 && <ArrowRight size={17} aria-hidden="true" />}</li>)}</ol>;
}

export function WikiView() {
  return (
    <div className="page wiki-page">
      <div className="page-heading">
        <div>
          <h1>Wiki operativa</h1>
          <p>Definiciones, estados y transiciones para trabajar con una única interpretación en todo el equipo.</p>
        </div>
      </div>

      <div className="wiki-layout">
        <nav className="panel wiki-toc" aria-label="Índice de Wiki">
          <strong>En esta guía</strong>
          <a href="#conceptos">Conceptos base</a>
          <a href="#circuitos">Circuitos operativos</a>
          <a href="#motos">Estados de la moto</a>
          <a href="#fichas">Estados de fichas</a>
          <a href="#trabajos">Trabajos y pagos</a>
          <a href="#revision">Revisión y controles</a>
          <a href="#repuestos">Pedidos de repuestos</a>
          <a href="#reglas">Reglas clave</a>
        </nav>

        <div className="wiki-document">
          <section className="panel wiki-section" id="conceptos">
            <div className="wiki-section-title"><BookOpen size={21} aria-hidden="true" /><div><h2>Conceptos base</h2><p>La sección, la presencia física y el estado responden preguntas distintas.</p></div></div>
            <dl className="wiki-definitions">
              <div><dt>Estado</dt><dd>Describe una situación operativa única y actual: qué está ocurriendo con la moto, ficha o ítem.</dd></div>
              <div><dt>Sección</dt><dd>Indica el circuito activo de la moto: <strong>Taller</strong> o <strong>Venta</strong>.</dd></div>
              <div><dt>Ingresada</dt><dd>Indica si la moto está físicamente bajo gestión del negocio. No reemplaza al estado.</dd></div>
            </dl>
            <div className="wiki-callout">
              <Bike size={22} aria-hidden="true" />
              <p><strong>Disponible no significa en venta.</strong> Una moto Disponible sólo está registrada en el sistema y fuera de todo circuito. Una moto En venta ya fue ingresada al circuito comercial y puede transferirse.</p>
            </div>
          </section>

          <section className="panel wiki-section" id="circuitos">
            <div className="wiki-section-title"><ArrowRight size={21} aria-hidden="true" /><div><h2>Circuitos operativos</h2><p>Las transiciones se realizan desde las acciones del sistema; no se eligen libremente desde un selector.</p></div></div>
            <div className="wiki-flow-block">
              <h3>Taller</h3>
              <Flow label="Circuito de Taller" steps={["Disponible", "Ingresada Taller", "Pendiente", "En proceso", "En revisión", "Terminada", "Entregada"]} />
              <p>La ficha puede cancelarse desde Pendiente, En proceso o En revisión. Al cancelarla, la moto sale del Taller como Entregada.</p>
            </div>
            <div className="wiki-flow-block">
              <h3>Ventas</h3>
              <Flow label="Circuito de Ventas" steps={["Disponible", "En venta", "Transferencia en proceso", "Vendida"]} />
              <p>Una moto Entregada también puede volver a ingresar a Taller o iniciar el circuito de Ventas.</p>
            </div>
          </section>

          <section className="panel wiki-section" id="motos">
            <div className="wiki-section-title"><Bike size={21} aria-hidden="true" /><div><h2>Estados de la moto</h2><p>Reflejan la ubicación operativa y el punto exacto del circuito de Taller o Ventas.</p></div></div>
            <StateList entries={motoStates} />
          </section>

          <section className="panel wiki-section" id="fichas">
            <div className="wiki-section-title"><ClipboardCheck size={21} aria-hidden="true" /><div><h2>Estados de fichas</h2><p>La ficha detalla el trabajo del Taller. Sus estados se sincronizan con el estado operativo de la moto mientras está abierta.</p></div></div>
            <StateList entries={fichaStates} />
          </section>

          <section className="panel wiki-section" id="trabajos">
            <div className="wiki-section-title"><ClipboardCheck size={21} aria-hidden="true" /><div><h2>Trabajos y pagos</h2><p>Los trabajos componen una ficha; el cobro puede registrarse sobre todos o parte de sus ítems.</p></div></div>
            <h3>Estados de trabajo</h3>
            <StateList entries={workStates} />
            <h3>Estados de pago</h3>
            <StateList entries={paymentStates} />
          </section>

          <section className="panel wiki-section" id="revision">
            <div className="wiki-section-title"><ShieldCheck size={21} aria-hidden="true" /><div><h2>Revisión y controles</h2><p>La aprobación de revisión confirma la calidad del trabajo; no registra por sí sola la entrega de la moto.</p></div></div>
            <h3>Estados de revisión</h3>
            <StateList entries={revisionStates} />
            <h3>Estados de control</h3>
            <StateList entries={revisionControlStates} />
          </section>

          <section className="panel wiki-section" id="repuestos">
            <div className="wiki-section-title"><Package size={21} aria-hidden="true" /><div><h2>Pedidos de repuestos</h2><p>El pedido tiene su propio cierre y cada ítem conserva su avance de compra o entrega.</p></div></div>
            <h3>Estados del pedido</h3>
            <StateList entries={repuestoPedidoStates} />
            <h3>Estados del ítem</h3>
            <StateList entries={repuestoItemStates} />
          </section>

          <section className="panel wiki-section" id="reglas">
            <div className="wiki-section-title"><ShieldCheck size={21} aria-hidden="true" /><div><h2>Reglas clave</h2><p>Estas reglas evitan estados ambiguos y preservan la trazabilidad.</p></div></div>
            <ul className="wiki-rules">
              <li>Una moto no puede estar Disponible y En venta al mismo tiempo.</li>
              <li>Una moto sólo puede tener una ficha de Taller abierta.</li>
              <li>Terminada significa trabajo aprobado; Entregada significa moto retirada por el cliente.</li>
              <li>Una moto Vendida no puede volver a ingresarse.</li>
              <li>Los estados Cancelada y Entregada conservan el historial: no eliminan las operaciones previas.</li>
              <li>Las transferencias y el cierre de una venta corresponden a usuarios de Administración.</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
