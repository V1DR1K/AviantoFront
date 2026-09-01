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
    meaning: "La moto ingresó al circuito de Ventas y tiene una ficha comercial activa. El propietario actual sigue siendo el vendedor.",
    enables: "Seleccionar un comprador prospectivo y completar el checklist de venta.",
    note: "Es el único estado que representa disponibilidad comercial para vender.",
  },
  {
    status: "Transferencia en proceso",
    meaning: "La transferencia está en gestión, pero el vendedor conserva la titularidad hasta completar la venta.",
    enables: "Programar la cita, confirmar la asistencia, completar o cancelar la transferencia. Solo Administración puede hacerlo.",
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
  { status: "No pagado", meaning: "No hay pagos vigentes registrados en el documento.", enables: "Registrar un importe, con fecha y medio de pago opcional." },
  { status: "Parcial", meaning: "Los pagos vigentes cubren una parte del total del documento.", enables: "Registrar otro importe o anular un movimiento incorrecto." },
  { status: "Pagado", meaning: "Los pagos vigentes cubren el total del documento.", enables: "Consultar el historial o anular un movimiento si fue necesario." },
];

const saleFichaStates: StateEntry[] = [
  { status: "En venta", meaning: "La ficha comercial está abierta y conserva el vendedor original como titular actual.", enables: "Seleccionar comprador prospectivo y realizar el checklist." },
  { status: "Transferencia en proceso", meaning: "Se inició la gestión de transferencia para el comprador prospectivo, sin cambio de titularidad todavía.", enables: "Programar cita, confirmar asistencia, completar o cancelar la gestión." },
  { status: "Vendida", meaning: "La venta se completó con sus requisitos y el comprador pasó a ser titular de la moto.", enables: "Consultar la trazabilidad; no admite nuevas modificaciones." },
];

const saleChecklistStates: StateEntry[] = [
  { status: "Pendiente", meaning: "El requisito de venta todavía no fue resuelto.", enables: "Marcarlo como Realizado." },
  { status: "Realizado", meaning: "El requisito fue cumplido y queda auditado con usuario y fecha.", enables: "Contribuir al inicio y cierre de la venta si es obligatorio." },
  { status: "No aplica", meaning: "El requisito opcional no corresponde a esta operación.", enables: "Excluirlo sin bloquear el avance." },
];

const revisionStates: StateEntry[] = [
  { status: "Abierta", meaning: "La ficha llegó a revisión y todavía no fue aprobada.", enables: "Completar los controles requeridos." },
  { status: "Aprobada", meaning: "Los controles fueron aceptados y la ficha pasa a Terminada.", enables: "Entregar la moto al cliente." },
];

const revisionControlStates: StateEntry[] = [
  { status: "Pendiente", meaning: "Un control individual todavía necesita revisión.", enables: "Marcarlo como Revisado o No aplica." },
  { status: "Revisado", meaning: "El control individual fue validado.", enables: "Agregar una observación opcional si hace falta y cerrar la revisión cuando todos los controles estén resueltos." },
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
          <a href="#ventas">Ficha de venta</a>
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
              <p>La ficha de venta se crea al ingresar la moto. Una transferencia cancelada vuelve a En venta y conserva su auditoría; una ficha de venta cancelada conserva el motivo y la moto puede volver a Taller; una moto Vendida no puede reingresarse.</p>
            </div>
          </section>

          <section className="panel wiki-section" id="motos">
            <div className="wiki-section-title"><Bike size={21} aria-hidden="true" /><div><h2>Estados de la moto</h2><p>Reflejan la ubicación operativa y el punto exacto del circuito de Taller o Ventas.</p></div></div>
            <StateList entries={motoStates} />
          </section>

          <section className="panel wiki-section" id="ventas">
            <div className="wiki-section-title"><ClipboardCheck size={21} aria-hidden="true" /><div><h2>Ficha de venta y transferencia</h2><p>La ficha comercial concentra comprador, requisitos, cita y cierre para que la titularidad no cambie antes de tiempo.</p></div></div>
            <h3>Estados de la ficha de venta</h3>
            <StateList entries={saleFichaStates} />
            <h3>Carpeta de transferencia</h3>
            <StateList entries={saleChecklistStates} />
            <p className="wiki-payment-note">Administración mantiene los requisitos de la carpeta. Las fichas abiertas incorporan los requisitos activos que todavía no tengan; los ítems ya trabajados conservan su estado. Los ítems obligatorios deben quedar Realizados; solo los opcionales admiten No aplica.</p>
            <div className="wiki-callout"><ShieldCheck size={22} aria-hidden="true" /><p><strong>El comprador es prospectivo hasta el cierre.</strong> Para completar la venta se requiere comprador, carpeta completa, turno con fecha, horario y lugar, y asistencia confirmada. Recién entonces cambia la titularidad.</p></div>
          </section>

          <section className="panel wiki-section" id="fichas">
            <div className="wiki-section-title"><ClipboardCheck size={21} aria-hidden="true" /><div><h2>Estados de fichas</h2><p>La ficha detalla el trabajo del Taller. Sus estados se sincronizan con el estado operativo de la moto mientras está abierta.</p></div></div>
            <StateList entries={fichaStates} />
          </section>

          <section className="panel wiki-section" id="trabajos">
            <div className="wiki-section-title"><ClipboardCheck size={21} aria-hidden="true" /><div><h2>Trabajos y pagos</h2><p>Cada pago registra un importe exacto y no modifica el avance de la ficha.</p></div></div>
            <h3>Estados de trabajo</h3>
            <StateList entries={workStates} />
            <h3>Estados de pago</h3>
            <StateList entries={paymentStates} />
            <p className="wiki-payment-note">La ficha y cada pedido de repuestos conservan historiales de pago separados, aunque estén vinculados al mismo presupuesto. Un pago anulado sigue visible para auditoría y los documentos cancelados no admiten nuevos pagos.</p>
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
              <li>Operario puede actualizar el checklist mientras la ficha está En venta; Administración gestiona comprador, transferencia, cita, asistencia, cancelación y cierre.</li>
              <li>Operario y Administración pueden cambiar una moto entre Taller y Venta mientras no existan procesos operativos bloqueantes. El motivo queda registrado junto con usuario, fecha y circuitos de origen y destino.</li>
              <li>El checkbox de un requisito alterna Pendiente y Realizado; el selector expresa esos estados y también permite No aplica cuando el requisito es opcional. Ambos actualizan el mismo requisito.</li>
              <li>Cancelar una transferencia devuelve la moto a En venta, libera el comprador prospectivo y conserva el registro en auditoría.</li>
              <li>La titularidad solo cambia al completar la venta; una cita o asistencia no la modifica por sí sola.</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
