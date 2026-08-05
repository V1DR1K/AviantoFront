"use client";
import { useMemo, useState } from "react";
import {
  Download,
  Edit3,
  Eye,
  Filter,
  History,
  Plus,
  Trash2,
} from "lucide-react";
import { audit, catalog, clients, vehicles } from "../lib/mock-data";
import { exportExcel } from "../lib/export";
import { money } from "../lib/format";
import { ConfirmModal, Dialog, EmptyState, Pagination, SearchBox } from "./ui";

type Resource = "clients" | "vehicles" | "catalog" | "audit";
type Row = Record<string, string | number | boolean | undefined>;
const specification: Record<
  Exclude<Resource, "audit">,
  {
    title: string;
    singular: string;
    description: string;
    columns: string[];
    fields: { key: string; label: string; type?: string; options?: string[] }[];
    rows: Row[];
  }
> = {
  clients: {
    title: "Clientes",
    singular: "cliente",
    description:
      "Fichas de contacto, vehículos asociados e historial comercial.",
    columns: ["Nombre", "Documento", "Teléfono", "Motos", "Pedidos", "Estado"],
    fields: [
      { key: "nombre", label: "Nombre y apellido / razón social" },
      { key: "documento", label: "DNI o CUIT" },
      { key: "telefono", label: "Teléfono", type: "tel" },
      { key: "email", label: "Email", type: "email" },
      { key: "direccion", label: "Dirección" },
      { key: "observaciones", label: "Observaciones" },
    ],
    rows: clients.map((row) => ({
      id: row.id,
      nombre: row.nombre,
      documento: row.documento,
      telefono: row.telefono,
      motos: row.motos,
      pedidos: row.pedidos,
      estado: row.activo ? "Activo" : "Inactivo",
      email: "cliente@ejemplo.com",
      direccion: "Buenos Aires",
      observaciones: "Cliente habitual",
    })),
  },
  vehicles: {
    title: "Motos",
    singular: "motovehículo",
    description:
      "Un vehículo conserva su vínculo con el cliente y todo su historial.",
    columns: ["Marca y modelo", "Patente", "Cliente", "Año", "KM", "Estado"],
    fields: [
      {
        key: "cliente",
        label: "Cliente",
        options: clients.map((client) => client.nombre),
      },
      { key: "marca", label: "Marca" },
      { key: "modelo", label: "Modelo" },
      { key: "patente", label: "Patente" },
      { key: "anio", label: "Año", type: "number" },
      { key: "kilometraje", label: "Kilometraje", type: "number" },
      { key: "color", label: "Color" },
      { key: "cilindrada", label: "Cilindrada" },
    ],
    rows: vehicles.map((row) => ({
      id: row.id,
      marca: row.marca,
      modelo: row.modelo,
      patente: row.patente,
      cliente: row.cliente,
      anio: row.anio,
      kilometraje: row.kilometraje,
      color: row.color,
      cilindrada: row.cilindrada,
      estado: row.activo ? "Activo" : "Inactivo",
    })),
  },
  catalog: {
    title: "Catálogo",
    singular: "ítem",
    description:
      "Piezas y trabajos con precios base y trazabilidad de actualizaciones.",
    columns: ["Tipo", "Descripción", "Categoría", "Código", "Precio", "Estado"],
    fields: [
      { key: "tipo", label: "Tipo", options: ["Pieza", "Trabajo"] },
      { key: "descripcion", label: "Descripción estandarizada" },
      { key: "categoria", label: "Categoría" },
      { key: "codigo", label: "Código interno" },
      { key: "precioBase", label: "Precio base", type: "number" },
      { key: "observaciones", label: "Observaciones" },
    ],
    rows: catalog.map((row) => ({
      id: row.id,
      tipo: row.tipo,
      descripcion: row.descripcion,
      categoria: row.categoria,
      codigo: row.codigo,
      precioBase: row.precioBase,
      estado: row.activo ? "Activo" : "Inactivo",
      observaciones: "",
    })),
  },
};

function readCell(
  resource: Exclude<Resource, "audit">,
  row: Row,
  column: string,
) {
  if (column === "Nombre") return row.nombre;
  if (column === "Marca y modelo") return `${row.marca} ${row.modelo}`;
  if (column === "Documento") return row.documento || "—";
  if (column === "Teléfono") return row.telefono;
  if (column === "Año") return row.anio;
  if (column === "KM") return row.kilometraje;
  if (column === "Descripción") return row.descripcion;
  if (column === "Categoría") return row.categoria;
  if (column === "Código") return row.codigo;
  if (column === "Precio") return money(Number(row.precioBase));
  if (column === "Estado")
    return (
      <span
        className={`record-state ${row.estado === "Activo" ? "active" : "inactive"}`}
      >
        {row.estado}
      </span>
    );
  return (
    row[column.toLowerCase().replace(" ", "")] ??
    row[column.toLowerCase()] ??
    "—"
  );
}

export function AdminView({
  resource,
  notify,
}: {
  resource: Resource;
  notify: (message: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("Todos");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Row | null>(null);
  const [detail, setDetail] = useState<Row | null>(null);
  const [deleting, setDeleting] = useState<Row | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const setup = resource === "audit" ? null : specification[resource];
  const visible = useMemo(
    () =>
      setup
        ? setup.rows.filter(
            (row) =>
              (filter === "Todos" || row.estado === filter) &&
              JSON.stringify(row).toLowerCase().includes(query.toLowerCase()),
          )
        : [],
    [setup, query, filter],
  );
  if (resource === "audit") return <AuditView notify={notify} />;
  if (!setup) return null;
  const submit = () => {
    setSubmitted(true);
    setEditing(null);
    notify(
      `La acción sobre ${setup.singular} se registró como demostración. Los mocks no se modificaron.`,
    );
  };
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <h1>{setup.title}</h1>
          <p>{setup.description}</p>
        </div>
        <button
          className="button primary"
          onClick={() => {
            setSubmitted(false);
            setEditing({});
          }}
        >
          <Plus size={19} />
          Nuevo {setup.singular}
        </button>
      </div>
      <section className="panel table-panel">
        <div className="filter-bar">
          <SearchBox
            value={query}
            onChange={setQuery}
            placeholder={`Buscar ${setup.singular}`}
          />
          <label>
            <Filter size={16} />
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            >
              <option>Todos</option>
              <option>Activo</option>
              <option>Inactivo</option>
            </select>
          </label>
          <button
            className="button secondary"
            onClick={() => exportExcel(setup.title.toLowerCase(), visible)}
          >
            <Download size={17} />
            Exportar Excel
          </button>
        </div>
        {visible.length ? (
          <table>
            <thead>
              <tr>
                {setup.columns.map((column) => (
                  <th key={column}>{column}</th>
                ))}
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr key={String(row.id)}>
                  {setup.columns.map((column) => (
                    <td key={column}>{readCell(resource, row, column)}</td>
                  ))}
                  <td className="table-actions">
                    <button
                      onClick={() => setDetail(row)}
                      aria-label={`Ver ${setup.singular}`}
                    >
                      <Eye size={17} />
                    </button>
                    <button
                      onClick={() => {
                        setSubmitted(false);
                        setEditing(row);
                      }}
                      aria-label={`Editar ${setup.singular}`}
                    >
                      <Edit3 size={17} />
                    </button>
                    <button
                      className="danger-action"
                      onClick={() => setDeleting(row)}
                      aria-label={`Eliminar ${setup.singular}`}
                    >
                      <Trash2 size={17} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState
            title={`No hay ${setup.title.toLowerCase()} para mostrar`}
            body="Probá limpiar los filtros o crear un registro de demostración."
            action={
              <button className="button primary" onClick={() => setEditing({})}>
                Crear registro
              </button>
            }
          />
        )}
        <Pagination page={page} total={1} onPage={setPage} />
      </section>
      <RecordForm
        key={String(editing?.id ?? "new")}
        open={editing !== null}
        setup={setup}
        record={editing}
        submitted={submitted}
        onClose={() => setEditing(null)}
        onSubmit={submit}
      />
      <RecordDetail
        open={detail !== null}
        setup={setup}
        record={detail}
        onClose={() => setDetail(null)}
        onEdit={() => {
          setEditing(detail);
          setDetail(null);
        }}
      />
      <ConfirmModal
        open={deleting !== null}
        title={`Eliminar ${setup.singular}`}
        body={`El ${setup.singular} “${String(deleting?.nombre ?? deleting?.descripcion ?? deleting?.patente ?? "seleccionado")}” pasará a inactivo. Esta demostración no cambia los datos mock.`}
        confirmLabel="Sí, eliminar lógicamente"
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          setDeleting(null);
          notify(
            "Eliminación lógica simulada. El registro permanece visible en esta demostración.",
          );
        }}
      />
    </div>
  );
}

function RecordForm({
  open,
  setup,
  record,
  submitted,
  onClose,
  onSubmit,
}: {
  open: boolean;
  setup: typeof specification.clients;
  record: Row | null;
  submitted: boolean;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const effective = record ?? {};
  return (
    <Dialog
      open={open}
      title={`${effective.id ? "Editar" : "Nuevo"} ${setup.singular}`}
      onClose={onClose}
      wide
    >
      <p className="dialog-intro">
        Los campos se cargan para revisar el flujo. Guardar no modifica los
        datos del MVP.
      </p>
      <form
        className="record-form"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        {setup.fields.map((field) => (
          <label key={field.key}>
            {field.label}
            {field.options ? (
              <select
                value={values[field.key] ?? String(effective[field.key] ?? "")}
                onChange={(event) =>
                  setValues({ ...values, [field.key]: event.target.value })
                }
              >
                <option value="">Seleccionar</option>
                {field.options.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            ) : field.key === "observaciones" ? (
              <textarea
                value={values[field.key] ?? String(effective[field.key] ?? "")}
                onChange={(event) =>
                  setValues({ ...values, [field.key]: event.target.value })
                }
              />
            ) : (
              <input
                type={field.type ?? "text"}
                value={values[field.key] ?? String(effective[field.key] ?? "")}
                onChange={(event) =>
                  setValues({ ...values, [field.key]: event.target.value })
                }
              />
            )}
          </label>
        ))}
        {setup.singular === "ítem" && (
          <div className="duplicate-note">
            <History size={17} />
            <span>
              Posible coincidencia: “Cambio de aceite” ya existe en catálogo.
              Revisá antes de estandarizar.
            </span>
          </div>
        )}
        <div className="modal-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="button primary" type="submit">
            {submitted ? "Guardado" : "Guardar demostración"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
function RecordDetail({
  open,
  setup,
  record,
  onClose,
  onEdit,
}: {
  open: boolean;
  setup: typeof specification.clients;
  record: Row | null;
  onClose: () => void;
  onEdit: () => void;
}) {
  return (
    <Dialog open={open} title={`Ficha de ${setup.singular}`} onClose={onClose}>
      <dl className="record-detail">
        {setup.fields.slice(0, 6).map((field) => (
          <div key={field.key}>
            <dt>{field.label}</dt>
            <dd>{String(record?.[field.key] ?? "—")}</dd>
          </div>
        ))}
      </dl>
      {setup.singular !== "ítem" && (
        <div className="related-history">
          <h3>Historial relacionado</h3>
          <p>
            Pedidos y presupuestos vinculados disponibles al integrar el
            backend. Se muestran como contexto de demostración.
          </p>
        </div>
      )}
      <div className="modal-actions">
        <button className="button secondary" onClick={onClose}>
          Cerrar
        </button>
        <button className="button primary" onClick={onEdit}>
          Editar
        </button>
      </div>
    </Dialog>
  );
}
function AuditView({ notify }: { notify: (message: string) => void }) {
  const [query, setQuery] = useState("");
  const [module, setModule] = useState("Todos");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const auditDate = (value: string) => {
    const [date] = value.split(" ");
    const [day, month, year] = date.split("/");
    return `${year}-${month}-${day}`;
  };
  const visible = audit.filter(
    (row) =>
      (module === "Todos" || row.modulo === module) &&
      (!from || auditDate(row.fecha) >= from) &&
      (!to || auditDate(row.fecha) <= to) &&
      JSON.stringify(row).toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <h1>Auditoría</h1>
          <p>Altas, cambios de precios, ediciones y transiciones de estado.</p>
        </div>
      </div>
      <section className="panel table-panel">
        <div className="filter-bar">
          <SearchBox
            value={query}
            onChange={setQuery}
            placeholder="Usuario, módulo o descripción"
          />
          <label>
            <Filter size={16} />
            <select
              value={module}
              onChange={(event) => setModule(event.target.value)}
            >
              <option>Todos</option>
              <option>Pedidos</option>
              <option>Catálogo</option>
            </select>
          </label>
          <input
            className="filter-date"
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            aria-label="Desde"
          />
          <input
            className="filter-date"
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            aria-label="Hasta"
          />
          <button
            className="button secondary"
            onClick={() => {
              exportExcel("auditoria", visible);
              notify("Exportación de auditoría generada.");
            }}
          >
            <Download size={17} />
            Exportar Excel
          </button>
        </div>
        <table>
          <thead>
            <tr>
              <th>Fecha y hora</th>
              <th>Usuario</th>
              <th>Módulo</th>
              <th>Acción</th>
              <th>Descripción</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr key={row.id}>
                <td>{row.fecha}</td>
                <td>{row.usuario}</td>
                <td>{row.modulo}</td>
                <td>{row.accion}</td>
                <td>{row.descripcion}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination page={1} total={1} onPage={() => {}} />
      </section>
    </div>
  );
}

export function SettingsView({
  notify,
}: {
  notify: (message: string) => void;
}) {
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <h1>Administración</h1>
          <p>Preferencias preparadas para conectarse al backend.</p>
        </div>
      </div>
      <section className="panel record-detail">
        <div>
          <p className="eyebrow">Taller</p>
          <h2>Avianto Software</h2>
          <p>Buenos Aires, Argentina · Moneda ARS · IVA configurable.</p>
        </div>
        <div className="form-actions">
          <button
            className="button secondary"
            onClick={() =>
              notify(
                "La configuración de la demo no cambia datos persistentes.",
              )
            }
          >
            Revisar integraciones
          </button>
          <button
            className="button primary"
            onClick={() => notify("Preferencias guardadas como demostración.")}
          >
            Guardar preferencias
          </button>
        </div>
      </section>
    </div>
  );
}
