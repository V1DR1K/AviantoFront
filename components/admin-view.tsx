"use client";

import { useEffect, useState } from "react";
import { Download, Edit3, Eye, Filter, Plus, Trash2 } from "lucide-react";
import { api, download } from "../lib/api";
import type { AuditoriaResponse, ClienteResponse, ControlResponse, MarcaMotoResponse, MotovehiculoResponse, PageResponse } from "../lib/types";
import { ConfirmModal, Dialog, EmptyState, Pagination, SearchBox, SelectField, type Notify } from "./ui";
import { AbmFormModal, type AbmField, VehicleAbmModal } from "./modal/abm-form-modal";

type Resource = "clients" | "vehicles" | "catalog" | "audit";
type DataRow = Record<string, string | number | boolean | null | undefined>;
const requestError = (reason: unknown) => reason instanceof Error ? reason.message : "No fue posible completar la operación.";
const iso = (value: string) => new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));

const configs = {
  clients: { title: "Clientes", singular: "cliente", description: "Fichas de contacto, vehículos asociados e historial comercial.", endpoint: "/clientes", exportPath: "/clientes/export.xlsx", columns: ["Nombre", "Documento", "Teléfono", "Motos", "Fichas", "Estado"], fields: [{ key: "nombre", label: "Nombre y apellido / razón social", required: true }, { key: "documento", label: "DNI o CUIT" }, { key: "telefono", label: "Teléfono", type: "tel" as const, required: true }, { key: "email", label: "Email", type: "email" as const }, { key: "direccion", label: "Dirección" }, { key: "observaciones", label: "Observaciones", type: "textarea" as const, wide: true }] },
  vehicles: { title: "Motos", singular: "motovehículo", description: "Un vehículo conserva su vínculo con el cliente y todo su historial.", endpoint: "/motovehiculos", exportPath: "/motovehiculos/export.xlsx", columns: ["Marca y modelo", "Patente", "Cliente", "Año", "KM", "Estado"], fields: [] },
  catalog: { title: "Controles de revisión", singular: "control", description: "Checklist de puntos a revisar al momento de la entrega.", endpoint: "/configuracion/controles", exportPath: undefined, columns: ["Nombre", "Descripción", "Obligatorio", "Orden", "Estado"], fields: [{ key: "nombre", label: "Nombre del control", required: true }, { key: "descripcion", label: "Descripción", type: "textarea" as const, wide: true }, { key: "obligatorio", label: "Obligatorio", type: "select" as const, options: [{ value: "true", label: "Sí" }, { value: "false", label: "No" }] }, { key: "orden", label: "Orden", type: "number" as const }] },
} as const;

function rowFor(resource: Exclude<Resource, "audit">, item: ClienteResponse | MotovehiculoResponse | ControlResponse): DataRow {
  if (resource === "clients") { const client = item as ClienteResponse; return { ...client, estado: client.activo ? "Activo" : "Inactivo" }; }
  if (resource === "vehicles") { const vehicle = item as MotovehiculoResponse; return { ...vehicle, estado: vehicle.estado, activoF: vehicle.activo ? "Activo" : "Inactivo" }; }
  const control = item as ControlResponse;
  return { ...control, categorias: control.categorias.map((category) => category.nombre).join(", ") || "—", estado: control.activo ? "Activo" : "Inactivo", obligatorio: control.obligatorio ? "true" : "false" };
}

function cell(row: DataRow, column: string) {
  if (column === "Nombre") return row.nombre;
  if (column === "Marca y modelo") return `${row.marca} ${row.modelo}`;
  if (column === "Patente") return row.patente || "—";
  if (column === "Cliente") return row.cliente || "—";
  if (column === "Documento") return row.documento || "—";
  if (column === "Teléfono") return row.telefono;
  if (column === "Motos") return row.motos;
  if (column === "Fichas") return row.fichas;
  if (column === "Año") return row.anio || "—";
  if (column === "KM") return row.kilometraje || "—";
  if (column === "Descripción") return row.descripcion || "—";
  if (column === "Obligatorio") return row.obligatorio === "true" ? "Sí" : "No";
  if (column === "Orden") return row.orden || "—";
  if (column === "Estado") return <span className={`record-state ${["Activo", "Activa"].includes(String(row.estado)) ? "active" : "inactive"}`}>{String(row.estado)}</span>;
  return "—";
}

export function AdminView({ resource, notify, onOpenVehicle, onOpenServices }: { resource: Resource; notify: Notify; onOpenVehicle?: (id: string) => void; onOpenServices?: () => void }) {
  if (resource === "audit") return <AuditView notify={notify} />;
  return <Records resource={resource} notify={notify} onOpenVehicle={onOpenVehicle} onOpenServices={onOpenServices} />;
}

function Records({ resource, notify, onOpenVehicle, onOpenServices }: { resource: Exclude<Resource, "audit">; notify: Notify; onOpenVehicle?: (id: string) => void; onOpenServices?: () => void }) {
  const config = configs[resource];
  const [rows, setRows] = useState<DataRow[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("Todos");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(1);
  const [editing, setEditing] = useState<DataRow | null>(null);
  const [detail, setDetail] = useState<DataRow | null>(null);
  const [deleting, setDeleting] = useState<DataRow | null>(null);
  const [clients, setClients] = useState<ClienteResponse[]>([]);
  const [brands, setBrands] = useState<MarcaMotoResponse[]>([]);

  const load = () => {
    const params = { q: query || undefined, activo: filter === "Todos" ? undefined : filter === "Activo", page: page - 1, size: 20 };
    if (resource === "catalog") {
      void api<ControlResponse[]>("/configuracion/controles", {}, { includeDeleted: false })
        .then((list) => { setRows(list.map((item) => rowFor("catalog", item))); setTotal(1); })
        .catch((reason) => notify(requestError(reason), "error"));
      return;
    }
    void api<PageResponse<ClienteResponse | MotovehiculoResponse>>(config.endpoint, {}, params)
      .then((result) => { setRows(result.content.map((item) => rowFor(resource, item))); setTotal(result.totalPages || 1); })
      .catch((reason) => notify(requestError(reason), "error"));
  };

  useEffect(load, [resource, query, filter, page, config.endpoint, notify]);
  useEffect(() => {
    if (resource !== "vehicles") return;
    void Promise.all([
      api<PageResponse<ClienteResponse>>("/clientes", {}, { size: 100, activo: true }),
      api<MarcaMotoResponse[]>("/configuracion/marcas-moto"),
    ]).then(([clientPage, nextBrands]) => {
      setClients(clientPage.content);
      setBrands(nextBrands.filter((brand) => brand.activo));
    }).catch((reason) => notify(requestError(reason), "error"));
  }, [resource, notify]);

  const fields: AbmField[] = resource === "catalog"
    ? [...configs.catalog.fields]
    : resource === "clients"
      ? [...configs.clients.fields]
      : [
          { key: "clienteId", label: "Cliente", type: "select", options: clients.map((client) => ({ value: client.id, label: client.nombre })), required: true, wide: true },
          { key: "marcaId", label: "Marca", type: "select", options: brands.map((brand) => ({ value: brand.id, label: brand.nombre })), required: true },
          { key: "modelo", label: "Modelo", required: true },
          { key: "patente", label: "Patente", required: true },
          { key: "anio", label: "Año", type: "number", min: 1900, max: 2100 },
          { key: "kilometraje", label: "Kilometraje", type: "number", min: 0 },
          { key: "observaciones", label: "Observaciones", type: "textarea", wide: true },
        ];

  const submit = async (values: Record<string, string>) => {
    try {
      const payload = resource === "vehicles"
        ? { ...values, anio: values.anio ? Number(values.anio) : null, kilometraje: values.kilometraje ? Number(values.kilometraje) : null }
        : resource === "catalog"
          ? { nombre: values.nombre, descripcion: values.descripcion, obligatorio: values.obligatorio === "true", orden: values.orden ? Number(values.orden) : null }
          : values;
      await api(`${config.endpoint}${editing?.id ? `/${editing.id}` : ""}`, { method: editing?.id ? "PUT" : "POST", body: JSON.stringify(payload) });
      setEditing(null);
      load();
      notify(`${config.singular[0].toUpperCase()}${config.singular.slice(1)} guardado correctamente.`);
    } catch (reason) {
      notify(requestError(reason), "error");
    }
  };

  const params = { q: query || undefined, activo: filter === "Todos" ? undefined : filter === "Activo" };
  return (
    <div className="page">
      <div className="page-heading">
        <div><h1>{config.title}</h1><p>{config.description}</p></div>
        <div className="panel-actions">
          {resource === "vehicles" && onOpenServices && <button className="button secondary" onClick={onOpenServices}>Seguimiento de services</button>}
          <button className="button primary" onClick={() => setEditing({})}><Plus size={19} />Nuevo {config.singular}</button>
        </div>
      </div>
      <section className="panel table-panel">
        <div className="filter-bar">
          <SearchBox value={query} onChange={(value) => { setQuery(value); setPage(1); }} placeholder={`Buscar ${config.singular}`} />
          <SelectField value={filter} onChange={(value) => { setFilter(value); setPage(1); }} options={[{ value: "Todos", label: "Todos" }, { value: "Activo", label: "Activo" }, { value: "Inactivo", label: "Inactivo" }]} icon={Filter} ariaLabel={`Filtrar ${config.title.toLowerCase()} por estado`} />
          {config.exportPath && <button className="button secondary" onClick={() => void download(config.exportPath, `${config.title.toLowerCase()}.xlsx`, params).catch((reason) => notify(requestError(reason), "error"))}><Download size={17} />Exportar Excel</button>}
        </div>
        {rows.length ? <table><thead><tr>{config.columns.map((column) => <th key={column}>{column}</th>)}<th>Acciones</th></tr></thead><tbody>{rows.map((row) => <tr key={String(row.id)}>{config.columns.map((column) => <td key={column} data-label={column}>{cell(row, column)}</td>)}<td className="table-actions"><button onClick={() => resource === "vehicles" && onOpenVehicle ? onOpenVehicle(String(row.id)) : setDetail(row)} aria-label={`Ver ${config.singular}`}><Eye size={17} /></button><button onClick={() => setEditing(row)} aria-label={`Editar ${config.singular}`}><Edit3 size={17} /></button><button className="danger-action" onClick={() => setDeleting(row)} aria-label={`Eliminar ${config.singular}`}><Trash2 size={17} /></button></td></tr>)}</tbody></table> : <EmptyState title={`No hay ${config.title.toLowerCase()} para mostrar`} body="Probá ajustar los filtros o crear un registro." action={<button className="button primary" onClick={() => setEditing({})}>Crear registro</button>} />}
        <Pagination page={page} total={total} onPage={setPage} />
      </section>
      {resource === "vehicles" ? <VehicleAbmModal key={String(editing?.id ?? "new")} open={editing !== null} mode={editing?.id ? "modificar" : "agregar"} initialValues={editing ?? {}} brands={brands} clients={clients} onClose={() => setEditing(null)} onSubmit={submit} onError={(message) => notify(message, "error")} /> : <AbmFormModal key={String(editing?.id ?? "new")} open={editing !== null} resource={config.singular} mode={editing?.id ? "modificar" : "agregar"} fields={fields} initialValues={editing ?? {}} onClose={() => setEditing(null)} onSubmit={submit} onError={(message) => notify(message, "error")} />}
      <RecordDetail open={detail !== null} title={config.singular} record={detail} onClose={() => setDetail(null)} onEdit={() => { setEditing(detail); setDetail(null); }} />
      <ConfirmModal open={deleting !== null} title={`Eliminar ${config.singular}`} body="El registro seleccionado pasará a inactivo y conservará su historial." confirmLabel={`Eliminar ${config.singular}`} onClose={() => setDeleting(null)} onConfirm={async () => { if (!deleting) return; const selected = deleting; setDeleting(null); try { await api(`${config.endpoint}/${selected.id}`, { method: "DELETE" }); load(); notify(`${config.singular[0].toUpperCase()}${config.singular.slice(1)} eliminado correctamente.`); } catch (reason) { notify(requestError(reason), "error"); throw reason; } }} />
    </div>
  );
}

function RecordDetail({ open, title, record, onClose, onEdit }: { open: boolean; title: string; record: DataRow | null; onClose: () => void; onEdit: () => void }) {
  return <Dialog open={open} title={`Ficha de ${title}`} onClose={onClose}><dl className="record-detail">{Object.entries(record ?? {}).filter(([key]) => !["id", "activo", "estado", "createdAt", "updatedAt"].includes(key)).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{String(value ?? "—")}</dd></div>)}</dl><div className="modal-actions"><button className="button secondary" onClick={onClose}>Cerrar</button><button className="button primary" onClick={onEdit}>Editar</button></div></Dialog>;
}

function AuditView({ notify }: { notify: Notify }) {
  const [query, setQuery] = useState("");
  const [module, setModule] = useState("Todos");
  const [rows, setRows] = useState<AuditoriaResponse[]>([]);
  useEffect(() => {
    void api<AuditoriaResponse[]>("/auditoria", {}, { q: query || undefined, modulo: module === "Todos" ? undefined : module }).then(setRows).catch((reason) => notify(requestError(reason), "error"));
  }, [query, module, notify]);
  return <div className="page"><div className="page-heading"><div><h1>Auditoría</h1><p>Altas, ediciones y transiciones de estado registradas.</p></div></div><section className="panel table-panel"><div className="filter-bar"><SearchBox value={query} onChange={setQuery} placeholder="Usuario, módulo o descripción" /><SelectField value={module} onChange={setModule} options={[{ value: "Todos", label: "Todos" }, { value: "Fichas", label: "Fichas" }, { value: "Repuestos", label: "Repuestos" }, { value: "Configuración", label: "Configuración" }, { value: "Clientes", label: "Clientes" }, { value: "Motovehículos", label: "Motovehículos" }]} icon={Filter} ariaLabel="Filtrar auditoría por módulo" /></div>{rows.length ? <table><thead><tr><th>Fecha y hora</th><th>Usuario</th><th>Módulo</th><th>Acción</th><th>Descripción</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td data-label="Fecha y hora">{iso(row.fecha)}</td><td data-label="Usuario">{row.usuario}</td><td data-label="Módulo">{row.modulo}</td><td data-label="Acción">{row.accion}</td><td data-label="Descripción">{row.descripcion}</td></tr>)}</tbody></table> : <EmptyState title="No hay registros de auditoría" body="No se encontraron eventos con esos filtros." />}</section></div>;
}

type Setting = { title: string; description: string; endpoint: string; fields: AbmField[]; name: (item: DataRow) => string };
const settings: Setting[] = [{ title: "Marcas de motos", description: "Opciones disponibles en el alta y edición de motos.", endpoint: "/configuracion/marcas-moto", fields: [{ key: "nombre", label: "Marca", required: true, wide: true }], name: (item) => String(item.nombre) }, { title: "Categorías de revisión", description: "Agrupaciones de controles para el checklist de entrega.", endpoint: "/configuracion/categorias", fields: [{ key: "nombre", label: "Categoría", required: true, wide: true }], name: (item) => String(item.nombre) }, { title: "Usuarios del sistema", description: "Usuarios y perfiles de acceso del taller.", endpoint: "/configuracion/usuarios", fields: [{ key: "username", label: "Usuario", required: true }, { key: "nombre", label: "Nombre", required: true }, { key: "email", label: "Email", type: "email" }, { key: "rol", label: "Perfil", type: "select", required: true, options: [{ value: "ADMINISTRACION", label: "Administración" }, { value: "OPERARIO", label: "Operario" }] }, { key: "password", label: "Contraseña", type: "text" }], name: (item) => `${item.nombre} · ${item.rol === "ADMINISTRACION" ? "Administración" : "Operario"}` }];

export function SettingsView({ notify }: { notify: Notify }) {
  return <div className="page"><div className="page-heading"><div><h1>Administración</h1><p>Marcas, categorías y usuarios del sistema.</p></div></div><section className="settings-grid">{settings.map((setting) => <ConfigSection key={setting.endpoint} setting={setting} notify={notify} />)}</section></div>;
}

function ConfigSection({ setting, notify }: { setting: Setting; notify: Notify }) {
  const [entries, setEntries] = useState<DataRow[]>([]);
  const [editing, setEditing] = useState<DataRow | null>(null);
  const [deleting, setDeleting] = useState<DataRow | null>(null);
  const load = () => void api<DataRow[]>(setting.endpoint).then(setEntries).catch((reason) => notify(requestError(reason), "error"));
  useEffect(load, [setting.endpoint, notify]);
  const submit = async (values: Record<string, string>) => {
    try {
      const payload = { ...values, ...(editing?.id && !values.password ? { password: null } : {}) };
      await api(`${setting.endpoint}${editing?.id ? `/${editing.id}` : ""}`, { method: editing?.id ? "PUT" : "POST", body: JSON.stringify(payload) });
      setEditing(null);
      load();
      notify("Configuración guardada correctamente.");
    } catch (reason) {
      notify(requestError(reason), "error");
    }
  };
  return <section className="panel config-section"><div className="config-head"><div><h2>{setting.title}</h2><p>{setting.description}</p></div><button className="button secondary" onClick={() => setEditing({})}><Plus size={16} />Agregar</button></div><ul className="config-list">{entries.map((entry) => <li key={String(entry.id)}><span>{setting.name(entry)}</span><div className="table-actions"><button onClick={() => setEditing(entry)} aria-label={`Editar ${setting.name(entry)}`}><Edit3 size={16} /></button><button className="danger-action" onClick={() => setDeleting(entry)} aria-label={`Eliminar ${setting.name(entry)}`}><Trash2 size={16} /></button></div></li>)}</ul><AbmFormModal key={String(editing?.id ?? "new")} open={editing !== null} resource={setting.title.slice(0, -1).toLowerCase()} mode={editing?.id ? "modificar" : "agregar"} initialValues={editing ?? {}} fields={setting.fields} onClose={() => setEditing(null)} onSubmit={submit} onError={(message) => notify(message, "error")} /><ConfirmModal open={deleting !== null} title="Eliminar configuración" body={`¿Querés eliminar “${deleting ? setting.name(deleting) : ""}”?`} confirmLabel="Sí, eliminar" onClose={() => setDeleting(null)} onConfirm={async () => { if (!deleting) return; const selected = deleting; setDeleting(null); try { await api(`${setting.endpoint}/${selected.id}`, { method: "DELETE" }); load(); notify("Configuración eliminada correctamente."); } catch (reason) { notify(requestError(reason), "error"); throw reason; } }} /></section>;
}
