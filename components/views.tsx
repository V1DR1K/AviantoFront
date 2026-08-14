"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDownUp, ArrowRightLeft, Check, Download, Edit3, Eye, FileDown, Filter, LogOut, Plus, Trash2 } from "lucide-react";
import { api, download, objectUrl } from "../lib/api";
import { integerInput, money, parseIntegerInput } from "../lib/format";
import { daysAgoInAr, formatDateInAr, todayInAr } from "../lib/dates";
import type {
  ClienteResponse,
  DashboardFichasResponse,
  FichaResponse,
  FichaStatus,
  FichaTrabajoResponse,
  NextServiceResponse,
  MotovehiculoResponse,
  PagoStatus,
  PageResponse,
  PhotoResponse,
  RepuestoResponse,
  RevisionControlResponse,
  RevisionResponse,
  ServiceResponse,
  TallerResponse,
  VentaResponse,
  VentaMotoResponse,
  TrabajoStatus,
} from "../lib/types";
import { ConfirmModal, Dialog, EmptyState, FilterBar, Pagination, SearchBox, SelectField, StatusBadge, type Notify } from "./ui";
import { BudgetBreakdown } from "./budget-breakdown";

const date = formatDateInAr;
const errorMessage = (reason: unknown) =>
  reason instanceof Error ? reason.message : "No fue posible cargar la información.";
const tabKey = (estado: string) =>
  ({ "Ingresada Taller": "ingresada", "Pendiente": "pendiente", "En proceso": "en-proceso", "En revisión": "revision", "Terminada": "terminada", "Entregada": "entregada", "Cancelada": "cancelada", "En venta": "en-venta", "Transferencia en proceso": "transferencia", "Vendida": "vendida" } as Record<string, string>)[estado] ?? "estado";
const workStateClass = (estado: TrabajoStatus) =>
  estado === "Realizado" ? " is-completed" : estado === "Pendiente" ? " is-pending" : " is-cancelled";
const isPayableTrabajo = (item: FichaTrabajoResponse) => item.estadoTrabajo !== "Cancelado";
function Metric({ label, value, tone }: { label: string; value: string; tone: string }) {
  return <section className={`metric ${tone}`}><span>{label}</span><strong>{value}</strong><small>Período seleccionado</small></section>;
}
function DashboardMetric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <section className="metric"><span>{label}</span><strong>{value}</strong><small>{detail}</small></section>;
}

function OrderPhotos({ photos, onChange }: { photos: PhotoResponse[]; onChange: () => void }) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const key = photos.map((photo) => photo.id).join(",");
  useEffect(() => {
    let active = true;
    let loaded: Record<string, string> = {};
    void Promise.all(photos.map(async (photo) => [photo.id, await objectUrl(photo.url)] as const))
      .then((entries) => {
        loaded = Object.fromEntries(entries);
        if (active) setUrls(loaded);
        else Object.values(loaded).forEach(URL.revokeObjectURL);
      })
      .catch(() => undefined);
    return () => {
      active = false;
      Object.values(loaded).forEach(URL.revokeObjectURL);
    };
  }, [key]);
  if (!photos.length) return null;
  return (
    <section className="order-photos">
      <h3>Fotos adjuntas</h3>
      <div>
        {photos.map((photo) =>
          urls[photo.id] ? (
            <a key={photo.id} href={urls[photo.id]} target="_blank" rel="noreferrer">
              <img src={urls[photo.id]} alt={photo.filename} />
            </a>
          ) : (
            <span key={photo.id}>Cargando foto...</span>
          ),
        )}
      </div>
      <button className="text-button" onClick={onChange}>Recargar</button>
    </section>
  );
}

const fichaStatuses: FichaStatus[] = ["Pendiente", "En proceso", "En revisión", "Terminada", "Entregada", "Cancelada"];
const fichaFilterStatuses = ["Ingresada Taller", ...fichaStatuses] as const;
const fichaPaymentStatuses: PagoStatus[] = ["No pagado", "Parcial", "Pagado"];

export function Dashboard({
  onIntake,
  onSelect,
  onOpenMoto,
  userName,
  initialSection = "taller",
  notify,
}: {
  onIntake: () => void;
  onSelect: (ficha: FichaResponse) => void;
  onOpenMoto: (id: string) => void;
  userName?: string;
  initialSection?: "taller" | "ventas";
  notify: Notify;
}) {
  const [taller, setTaller] = useState<TallerResponse | null>(null);
  const [fichasAgrupadas, setFichasAgrupadas] = useState<DashboardFichasResponse | null>(null);
  const [ventas, setVentas] = useState<VentaResponse | null>(null);
  const [groupBy, setGroupBy] = useState<"moto" | "ficha">("moto");
  const [section, setSection] = useState<"taller" | "ventas">(initialSection);
  const [tab, setTab] = useState<string>(initialSection === "ventas" ? "En venta" : "Ingresada Taller");
  useEffect(() => {
    void Promise.all([
      api<TallerResponse>("/dashboard/taller"),
      api<DashboardFichasResponse>("/dashboard/fichas"),
      api<VentaResponse>("/dashboard/ventas"),
    ])
      .then(([nextTaller, nextFichas, nextVentas]) => { setTaller(nextTaller); setFichasAgrupadas(nextFichas); setVentas(nextVentas); })
      .catch((reason) => notify(errorMessage(reason), "error"));
  }, [notify]);
  const talleres = taller?.estados ?? [];
  const ventasEstados = ventas?.estados ?? [];
  const motos = talleres.find((item) => item.estado === tab)?.motos ?? [];
  const fichas = fichasAgrupadas?.estados.find((item) => item.estado === tab)?.fichas ?? [];
  const estados = groupBy === "moto" ? talleres : fichasAgrupadas?.estados ?? [];
  const count = (estado: string) => {
    const item = estados.find((entry) => entry.estado === estado);
    return item ? "motos" in item ? item.motos.length : item.fichas.length : 0;
  };
  const salesCount = (estado: string) => ventasEstados.find((entry) => entry.estado === estado)?.motos.length ?? 0;
  const sales = ventasEstados.find((item) => item.estado === tab)?.motos ?? [];
  const visible = section === "ventas" ? sales.length : groupBy === "moto" ? motos.length : fichas.length;
  const label = section === "ventas" ? "motos" : groupBy === "moto" ? "motos" : "fichas";
  const changeSection = (next: "taller" | "ventas") => { setSection(next); setTab(next === "ventas" ? "En venta" : groupBy === "moto" ? "Ingresada Taller" : "Pendiente"); };
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <h1>Buenos días, {userName}</h1>
          <p>Estado actual del taller.</p>
        </div>
        <div className="page-actions"><button className="button primary" onClick={onIntake}><Plus size={19} />Ingresar moto</button></div>
      </div>
      {taller && fichasAgrupadas && (
        <>
          <nav className="tabs dashboard-section-tabs" aria-label="Sección del dashboard">
            <button className={section === "taller" ? "active" : ""} onClick={() => changeSection("taller")}>Taller</button>
            <button className={section === "ventas" ? "active" : ""} onClick={() => changeSection("ventas")}>Ventas</button>
          </nav>
          <div className="metrics dashboard-metrics">
            <DashboardMetric label="En pantalla" value={`${visible} ${label}`} detail={`${tab} · ${section === "ventas" ? "ventas" : `agrupadas por ${groupBy}`}`} />
            <DashboardMetric label={section === "ventas" ? "En venta" : "En curso"} value={String(section === "ventas" ? sales.length : count("Pendiente") + count("En proceso") + count("En revisión"))} detail={section === "ventas" ? "motos disponibles o en gestión" : `${label} pendientes, en proceso o revisión`} />
            <DashboardMetric label={section === "ventas" ? "Vendidas" : "Terminadas"} value={String(section === "ventas" ? salesCount("Vendida") : count("Terminada"))} detail={section === "ventas" ? "transferencias completadas" : `${label} listas para entregar`} />
            <DashboardMetric label={section === "ventas" ? "En transferencia" : "Entregadas"} value={String(section === "ventas" ? salesCount("Transferencia en proceso") : count("Entregada"))} detail={section === "ventas" ? "operaciones en proceso" : "motos retiradas por el cliente"} />
          </div>
          {section === "ventas" ? (
            <section className="table-panel taller-panel">
              <nav className="tabs taller-tabs" aria-label="Estado de las ventas">
                {ventasEstados.map((item) => <button key={item.estado} className={`${tab === item.estado ? "active" : ""} tab-${tabKey(item.estado)}`} onClick={() => setTab(item.estado)}>{item.estado}<span className="tab-count">{item.motos.length}</span></button>)}
              </nav>
              {sales.length ? <table><thead><tr><th>Moto</th><th>Cliente</th><th>KM actual</th><th>Estado</th><th /></tr></thead><tbody>{sales.map((moto) => <tr key={moto.motoId}><td data-label="Moto">{moto.patente}<small>{moto.moto}</small></td><td data-label="Cliente">{moto.cliente ?? "—"}</td><td data-label="KM actual">{moto.kilometraje != null ? moto.kilometraje.toLocaleString("es-AR") : "—"}</td><td data-label="Estado"><StatusBadge status={moto.estado} /></td><td data-label="Acción"><button className="row-action" onClick={() => onOpenMoto(moto.motoId)}>Ver moto</button></td></tr>)}</tbody></table> : <EmptyState title={`Sin motos ${tab.toLowerCase()}`} body="No hay motos en este estado por el momento." />}
            </section>
          ) : (
          <section className="table-panel taller-panel">
            <nav className="tabs dashboard-group-tabs" aria-label="Agrupar tablero">
              <button className={groupBy === "moto" ? "active" : ""} onClick={() => { setGroupBy("moto"); setTab("Ingresada Taller"); }}>Agrupar por moto</button>
              <button className={groupBy === "ficha" ? "active" : ""} onClick={() => { setGroupBy("ficha"); setTab("Pendiente"); }}>Agrupar por ficha</button>
            </nav>
            <nav className="tabs taller-tabs" aria-label={`Estado de las ${groupBy === "moto" ? "motos" : "fichas"}`}>
              {estados.map((item) => (
                <button
                  key={item.estado}
                  className={`${tab === item.estado ? "active" : ""} tab-${tabKey(item.estado)}`}
                  onClick={() => setTab(item.estado)}
                >
                  {item.estado}
                  <span className="tab-count">{"motos" in item ? item.motos.length : item.fichas.length}</span>
                </button>
              ))}
            </nav>
            {groupBy === "moto" && (motos.length ? (
              <table>
                <thead>
                   <tr><th>Moto</th><th>Cliente</th><th>KM actual</th><th>Ingreso</th><th>Ficha</th><th>Estado</th><th /></tr>
                </thead>
                <tbody>
                  {motos.map((moto) => (
                    <tr key={moto.motoId}>
                      <td data-label="Moto">{moto.patente}<small>{moto.moto}</small></td>
                      <td data-label="Cliente">{moto.cliente}</td>
                      <td data-label="KM actual">{moto.kilometraje != null ? moto.kilometraje.toLocaleString("es-AR") : "—"}</td>
                      <td data-label="Ingreso">{moto.fechaIngreso ? date(moto.fechaIngreso) : "—"}</td>
                       <td data-label="Ficha">{moto.fichaNumero ?? "—"}</td>
                      <td data-label="Estado"><StatusBadge status={moto.estado} /></td>
                      <td data-label="Acción"><button className="row-action" onClick={() => onOpenMoto(moto.motoId)}>Ver moto</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <EmptyState title={`Sin motos en ${tab}`} body="No hay motos en este estado por el momento." />
            ))}
            {groupBy === "ficha" && (fichas.length ? (
              <table>
                <thead>
                  <tr><th>Ficha</th><th>Cliente</th><th>Moto</th><th>Ingreso</th><th>Total</th><th>Estado</th><th /></tr>
                </thead>
                <tbody>
                  {fichas.map((ficha) => (
                    <tr key={ficha.id}>
                      <td data-label="Ficha">{ficha.numero}</td>
                      <td data-label="Cliente">{ficha.cliente}</td>
                      <td data-label="Moto">{ficha.moto}<small>{ficha.patente}</small></td>
                      <td data-label="Ingreso">{ficha.fechaIngreso ? date(ficha.fechaIngreso) : "—"}</td>
                      <td data-label="Total">{money(ficha.total)}</td>
                      <td data-label="Estado"><StatusBadge status={ficha.estado} /></td>
                      <td data-label="Acción"><button className="row-action" onClick={() => void api<FichaResponse>(`/fichas/${ficha.id}`).then(onSelect).catch((reason) => notify(errorMessage(reason), "error"))}>Ver ficha</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <EmptyState title={`Sin fichas en ${tab}`} body="No hay fichas en este estado por el momento." />
            ))}
          </section>
          )}
        </>
      )}
    </div>
  );
}

const salesStatuses: VentaMotoResponse["estado"][] = ["En venta", "Transferencia en proceso", "Vendida"];
const salesSortOptions = [
  { value: "fechaIngreso", label: "Fecha de ingreso" },
  { value: "patente", label: "Dominio" },
  { value: "estado", label: "Estado" },
];

export function VentasView({
  onIntake,
  onOpenMoto,
  onOpenTransfers,
  notify,
  canCompleteSale,
}: {
  onIntake: () => void;
  onOpenMoto: (id: string) => void;
  onOpenTransfers: (id: string) => void;
  notify: Notify;
  canCompleteSale: boolean;
}) {
  const [result, setResult] = useState<VentaResponse | null>(null);
  const [status, setStatus] = useState<"Todos" | VentaMotoResponse["estado"]>("Todos");
  const [query, setQuery] = useState("");
  const [desde, setDesde] = useState(daysAgoInAr(30));
  const [hasta, setHasta] = useState(todayInAr());
  const [sortBy, setSortBy] = useState("fechaIngreso");
  const [direction, setDirection] = useState<"ASC" | "DESC">("DESC");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<{
    title: string;
    body: string;
    confirmLabel: string;
    successMessage: string;
    action: () => Promise<void>;
  } | null>(null);
  const load = () => void api<VentaResponse>("/dashboard/ventas").then(setResult).catch((reason) => notify(errorMessage(reason), "error"));
  useEffect(load, [notify]);
  const current = status === "Todos"
    ? result?.estados.flatMap((item) => item.motos) ?? []
    : result?.estados.find((item) => item.estado === status)?.motos ?? [];
  const visible = [...current]
    .filter((moto) => `${moto.patente} ${moto.moto} ${moto.cliente ?? ""}`.toLowerCase().includes(query.trim().toLowerCase()))
    .filter((moto) => {
      const ingreso = moto.fechaIngreso?.slice(0, 10);
      return !ingreso || (!desde || ingreso >= desde) && (!hasta || ingreso <= hasta);
    })
    .sort((left, right) => {
      const leftValue = sortBy === "fechaIngreso" ? left.fechaIngreso?.slice(0, 10) ?? "" : sortBy === "patente" ? left.patente : left.estado;
      const rightValue = sortBy === "fechaIngreso" ? right.fechaIngreso?.slice(0, 10) ?? "" : sortBy === "patente" ? right.patente : right.estado;
      const comparison = leftValue.localeCompare(rightValue, "es");
      return direction === "DESC" ? -comparison : comparison;
    });
  const transition = async (moto: VentaMotoResponse, action: () => Promise<unknown>, message: string) => {
    setBusyId(moto.motoId);
    try { await action(); notify(message); load(); } catch (reason) { notify(errorMessage(reason), "error"); throw reason; } finally { setBusyId(null); }
  };
  const emptyLabel = status === "Todos" ? "para mostrar" : status.toLowerCase();
  return <div className="page">
    <div className="page-heading"><div><h1>Ventas</h1><p>Seguí cada moto desde su ingreso hasta la transferencia final.</p></div><div className="page-actions"><button className="button secondary" onClick={onIntake}><Plus size={18} />Ingresar moto</button></div></div>
       <section className="panel table-panel">
       <FilterBar
         primary={<SearchBox value={query} onChange={setQuery} placeholder="Patente, moto o cliente" />}
         activeCount={(status !== "Todos" ? 1 : 0) + (desde !== daysAgoInAr(30) ? 1 : 0) + (hasta !== todayInAr() ? 1 : 0) + (sortBy !== "fechaIngreso" ? 1 : 0)}
       >
         <SelectField value={status} onChange={(value) => setStatus(value as typeof status)} options={[{ value: "Todos", label: "Todos los estados" }, ...salesStatuses.map((value) => ({ value, label: value }))]} icon={Filter} ariaLabel="Filtrar ventas por estado" />
         <label><span className="date-label">Desde</span><input type="date" value={desde} onChange={(event) => setDesde(event.target.value)} /></label>
         <label><span className="date-label">Hasta</span><input type="date" value={hasta} onChange={(event) => setHasta(event.target.value)} /></label>
         <SelectField value={sortBy} onChange={setSortBy} options={salesSortOptions} icon={Filter} ariaLabel="Ordenar ventas por" />
         <button className="button secondary" onClick={() => setDirection((value) => value === "DESC" ? "ASC" : "DESC")} aria-label="Cambiar orden de ventas"><ArrowDownUp size={16} />{direction === "DESC" ? "Más recientes" : "Más antiguas"}</button>
       </FilterBar>
      {visible.length ? <table><thead><tr><th>Moto</th><th>Cliente</th><th>KM actual</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{visible.map((moto) => {
        const busy = busyId === moto.motoId;
        return <tr key={moto.motoId}><td data-label="Moto"><strong>{moto.patente}</strong><small>{moto.moto}</small></td><td data-label="Cliente">{moto.cliente ?? "Sin propietario"}</td><td data-label="KM actual">{moto.kilometraje != null ? moto.kilometraje.toLocaleString("es-AR") : "—"}</td><td data-label="Estado"><StatusBadge status={moto.estado} /></td><td className="table-actions sales-actions"><button className="row-action" onClick={() => onOpenMoto(moto.motoId)}>Ver moto</button>{moto.estado === "En venta" && <button className="button secondary compact" disabled={busy} onClick={() => onOpenTransfers(moto.motoId)}><ArrowRightLeft size={15} />Transferir</button>}{moto.estado === "Transferencia en proceso" && canCompleteSale && <button className="button primary compact" disabled={busy} onClick={() => setConfirmation({ title: "Completar venta", body: `La venta de ${moto.patente} quedará completada y el cambio será auditado.`, confirmLabel: "Completar venta", successMessage: "Venta completada.", action: async () => { await transition(moto, () => api(`/motovehiculos/${moto.motoId}/venta/completar`, { method: "POST" }), "Venta completada."); } })}><LogOut size={15} />Completar</button>}</td></tr>;
       })}</tbody></table> : result ? <EmptyState title={`Sin motos ${emptyLabel}`} body={query ? "Probá con otra búsqueda." : "No hay motos dentro de los filtros seleccionados."} /> : <div className="table-loading" role="status">Cargando ventas...</div>}
     </section>
     <ConfirmModal open={confirmation !== null} title={confirmation?.title ?? ""} body={confirmation?.body ?? ""} confirmLabel={confirmation?.confirmLabel ?? "Confirmar"} onClose={() => setConfirmation(null)} onConfirm={() => { const request = confirmation; setConfirmation(null); if (!request) return; return request.action().then(() => notify(request.successMessage)).catch((reason) => { notify(errorMessage(reason), "error"); throw reason; }); }} />
   </div>;
}

export function FichasView({
  onNewOrder,
  onSelect,
  onOpenMoto,
  onEdit,
  onDelete,
  notify,
}: {
  onNewOrder: () => void;
  onSelect: (ficha: FichaResponse) => void;
  onOpenMoto: (id: string) => void;
  onEdit: (ficha: FichaResponse) => void;
  onDelete: (ficha: FichaResponse) => void;
  notify: Notify;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"Todos" | (typeof fichaFilterStatuses)[number]>("Todos");
  const [paymentStatus, setPaymentStatus] = useState<"Todos" | PagoStatus>("Todos");
  const [desde, setDesde] = useState(daysAgoInAr(30));
  const [hasta, setHasta] = useState(todayInAr());
  const [sortBy, setSortBy] = useState("fechaIngreso");
  const [direction, setDirection] = useState<"ASC" | "DESC">("DESC");
  const [result, setResult] = useState<PageResponse<FichaResponse> | null>(null);
  const [pendingMotos, setPendingMotos] = useState<PageResponse<MotovehiculoResponse> | null>(null);
  const [page, setPage] = useState(1);
  const pendingIntake = status === "Ingresada Taller";
  useEffect(() => {
    if (pendingIntake) {
      void api<PageResponse<MotovehiculoResponse>>("/motovehiculos", {}, {
        q: query || undefined,
        estado: "Ingresada Taller",
        page: page - 1,
        size: 20,
        sortBy: sortBy === "fechaIngreso" ? "updatedAt" : sortBy === "numero" ? "patente" : sortBy,
        direction,
      })
        .then(setPendingMotos)
        .catch((reason) => notify(errorMessage(reason), "error"));
      return;
    }
    void api<PageResponse<FichaResponse>>(
      "/fichas",
      {},
      {
        q: query || undefined,
        estado: status === "Todos" ? undefined : status,
        estadoPago: paymentStatus === "Todos" ? undefined : paymentStatus,
        fechaDesde: desde || undefined,
        fechaHasta: hasta || undefined,
        sortBy: sortBy || undefined,
        direction,
        page: page - 1,
        size: 20,
      },
    )
      .then(setResult)
      .catch((reason) => notify(errorMessage(reason), "error"));
  }, [query, status, paymentStatus, desde, hasta, sortBy, direction, page, pendingIntake, notify]);
  const params = {
    q: query || undefined,
    estado: status === "Todos" ? undefined : status,
    estadoPago: paymentStatus === "Todos" ? undefined : paymentStatus,
    fechaDesde: desde || undefined,
    fechaHasta: hasta || undefined,
    sortBy: sortBy || undefined,
    direction,
  };
  const toggleDirection = () => setDirection((d) => (d === "ASC" ? "DESC" : "ASC"));
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <h1>Fichas de trabajo</h1>
          <p>Consultá y administrá las órdenes de trabajo del taller.</p>
        </div>
        <button className="button primary" onClick={onNewOrder}>
          <Plus size={19} />Nueva ficha
        </button>
      </div>
       <section className="panel table-panel">
         <FilterBar
            primary={<SearchBox value={query} onChange={(value) => { setQuery(value); setPage(1); }} placeholder={pendingIntake ? "Patente o moto" : "Número o cliente"} />}
            activeCount={(status !== "Todos" ? 1 : 0) + (pendingIntake ? 0 : (paymentStatus !== "Todos" ? 1 : 0) + (desde !== daysAgoInAr(30) ? 1 : 0) + (hasta !== todayInAr() ? 1 : 0)) + (sortBy !== "fechaIngreso" ? 1 : 0)}
          >
            <SelectField value={status} onChange={(value) => { setStatus(value as typeof status); setSortBy("fechaIngreso"); setPage(1); }} options={[{ value: "Todos", label: "Todos los estados" }, ...fichaFilterStatuses.map((option) => ({ value: option, label: option }))]} placeholder="Todos los estados" icon={Filter} ariaLabel="Filtrar fichas por estado" />
            {!pendingIntake && <SelectField value={paymentStatus} onChange={(value) => { setPaymentStatus(value as typeof paymentStatus); setPage(1); }} options={[{ value: "Todos", label: "Todos los pagos" }, ...fichaPaymentStatuses.map((option) => ({ value: option, label: option }))]} placeholder="Todos los pagos" icon={Filter} ariaLabel="Filtrar fichas por pago" />}
            {!pendingIntake && <><label>
              <span className="date-label">Desde</span>
              <input type="date" value={desde} onChange={(event) => { setDesde(event.target.value); setPage(1); }} />
            </label>
            <label>
              <span className="date-label">Hasta</span>
              <input type="date" value={hasta} onChange={(event) => { setHasta(event.target.value); setPage(1); }} />
            </label></>}
           <SelectField value={sortBy} onChange={(value) => { setSortBy(value); setPage(1); }} options={pendingIntake ? [{ value: "fechaIngreso", label: "Última modificación" }, { value: "numero", label: "Patente" }, { value: "estado", label: "Estado" }] : [{ value: "fechaIngreso", label: "Fecha de ingreso" }, { value: "numero", label: "Número" }, { value: "total", label: "Total" }, { value: "estado", label: "Estado" }]} icon={Filter} ariaLabel="Ordenar fichas por" />
          <button className="button secondary" onClick={() => { toggleDirection(); setPage(1); }} aria-label="Cambiar orden">
            <ArrowDownUp size={16} />
            {direction === "DESC" ? "Más recientes" : "Más antiguos"}
          </button>
            {!pendingIntake && <button className="button secondary" onClick={() => void download("/fichas/export.xlsx", "fichas.xlsx", params).catch((reason) => notify(errorMessage(reason), "error"))}>
              <Download size={17} />Exportar Excel
            </button>}
         </FilterBar>
         {pendingIntake ? pendingMotos?.content.length ? (
           <table>
             <thead><tr><th>Ficha</th><th>Cliente</th><th>Moto</th><th>Estado</th><th>Pago</th><th>Total</th><th /></tr></thead>
             <tbody>{pendingMotos.content.map((moto) => <tr key={moto.id}><td data-label="Ficha">Sin ficha</td><td data-label="Cliente">{moto.propietario ?? "Sin propietario"}</td><td data-label="Moto">{moto.marca} {moto.modelo}<small>{moto.patente}</small></td><td data-label="Estado"><StatusBadge status={moto.estado} /></td><td data-label="Pago">—</td><td data-label="Total">—</td><td className="table-actions"><button onClick={() => onOpenMoto(moto.id)} aria-label={`Ver perfil ${moto.patente}`}><Eye size={17} /></button></td></tr>)}</tbody>
           </table>
         ) : pendingMotos ? <EmptyState title="Sin motos ingresadas" body="No hay motos en Taller pendientes de ficha." /> : <div className="table-loading" role="status">Cargando motos...</div> : result?.content.length ? (
          <table>
            <thead>
              <tr><th>Ficha</th><th>Cliente</th><th>Moto</th><th>Estado</th><th>Pago</th><th>Total</th><th /></tr>
            </thead>
            <tbody>
              {result.content.map((ficha) => {
                  const editable = ficha.estado === "Pendiente" || ficha.estado === "En proceso";
                return (
                  <tr key={ficha.id}>
                    <td data-label="Ficha">{ficha.numero}</td>
                    <td data-label="Cliente">{ficha.cliente}</td>
                    <td data-label="Moto">{ficha.moto}<small>{ficha.patente}</small></td>
                    <td data-label="Estado"><StatusBadge status={ficha.estado} /></td>
                    <td data-label="Pago"><StatusBadge status={ficha.estadoPago} /></td>
                    <td data-label="Total">{money(ficha.total)}</td>
                    <td className="table-actions">
                      <button onClick={() => onSelect(ficha)} aria-label={`Ver ficha ${ficha.numero}`}><Eye size={17} /></button>
                      {editable ? (
                        <>
                          <button onClick={() => onEdit(ficha)} aria-label={`Editar ficha ${ficha.numero}`}><Edit3 size={17} /></button>
                          <button className="danger-action" onClick={() => onDelete(ficha)} aria-label={`Eliminar ficha ${ficha.numero}`}><Trash2 size={17} /></button>
                        </>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <EmptyState title="No hay fichas" body="Creá una nueva o ajustá los filtros." />
        )}
        <Pagination page={page} total={pendingIntake ? pendingMotos?.totalPages || 1 : result?.totalPages || 1} onPage={setPage} />
      </section>
    </div>
  );
}

function ItemRow({
  item,
  onState,
  onDelete,
  locked,
  canDelete,
  onStartWork,
}: {
  item: FichaTrabajoResponse;
  onState: (estado: TrabajoStatus) => void;
  onDelete: () => void;
  locked: boolean;
  canDelete: boolean;
  onStartWork: () => void;
}) {
  return (
    <div className={`line-item detail-work-item${workStateClass(item.estadoTrabajo)}${!locked ? " can-mark" : ""}${canDelete ? " can-delete" : ""}${item.estadoTrabajo === "Cancelado" ? " muted" : ""}`}>
      {!locked && (
        <label className="line-check detail-line-check work-state-check">
          <input className="work-state-input" type="checkbox" aria-label={`Marcar ${item.descripcion} como realizado`} checked={item.estadoTrabajo === "Realizado"} disabled={item.estadoTrabajo === "Cancelado"} onChange={(event) => event.target.checked ? onStartWork() : onState("Pendiente")} />
          <span className="work-state-box" aria-hidden="true"><Check size={14} strokeWidth={3} /></span>
        </label>
      )}
      <div className="detail-work-copy">
        <strong>{item.descripcion}</strong>
        <span>{money(Number(item.precioUnitario))}{item.descuento > 0 && ` · descuento ${money(Number(item.descuento))}`}{item.estadoTrabajo !== "Pendiente" && ` · ${item.estadoTrabajo}`}</span>
        {item.observacionTrabajo && <p className="work-observation">{item.observacionTrabajo}</p>}
      </div>
      {canDelete && <button type="button" className="danger-action" onClick={onDelete} aria-label={`Eliminar trabajo ${item.descripcion}`}><Trash2 size={17} /></button>}
    </div>
  );
}

function MoreActions({ actions, pending }: { actions: { key: string; label: string; className: string; onClick: () => void }[]; pending: boolean }) {
  const detailsRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!detailsRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);
  return (
    <div ref={detailsRef} className={`ficha-more-actions${open ? " is-open" : ""}`} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false); }}>
      <button type="button" className="ficha-more-trigger" aria-expanded={open} onClick={() => setOpen((value) => !value)}>Más acciones</button>
      <div aria-hidden={!open}>{actions.map((action) => <button key={action.key} className={`button large ${action.className}`} disabled={pending} onClick={() => { setOpen(false); action.onClick(); }}>{action.label}</button>)}</div>
    </div>
  );
}

export function FichaDetail({
  fichaKey,
  onBack,
  onConfirm,
  onOpenMoto,
  notify,
}: {
  fichaKey: string;
  onBack: () => void;
  onConfirm: (request: { title: string; body: string; confirmLabel: string; successMessage: string; variant?: "danger" | "success"; action: () => void | Promise<void> }) => void;
  onOpenMoto: (motoId: string, tab?: "services" | "fichas") => void;
  notify: Notify;
}) {
  const [ficha, setFicha] = useState<FichaResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [serviceOpen, setServiceOpen] = useState(false);
  const [serviceKm, setServiceKm] = useState("");
  const [serviceDate, setServiceDate] = useState("");
  const [serviceNotes, setServiceNotes] = useState("");
  const [serviceSaving, setServiceSaving] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [priorServices, setPriorServices] = useState<ServiceResponse[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [revision, setRevision] = useState<RevisionResponse | null>(null);
  const [revisionNoteControl, setRevisionNoteControl] = useState<RevisionControlResponse | null>(null);
  const [revisionNote, setRevisionNote] = useState("");
  const [revisionNoteSaving, setRevisionNoteSaving] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [selectedPaidWorkIds, setSelectedPaidWorkIds] = useState<string[]>([]);
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [startWorkItem, setStartWorkItem] = useState<FichaTrabajoResponse | null>(null);
  const [linkedRepuestos, setLinkedRepuestos] = useState<RepuestoResponse[]>([]);
  const load = () =>
    void api<FichaResponse>(`/fichas/${fichaKey}`)
      .then(setFicha)
      .catch((reason) => { setError(errorMessage(reason)); notify(errorMessage(reason), "error"); });
  useEffect(load, [fichaKey, notify]);
  useEffect(() => {
    let active = true;
    void api<RepuestoResponse[]>(`/fichas/${fichaKey}/repuestos`)
      .then((items) => { if (active) setLinkedRepuestos(items); })
      .catch((reason) => { if (active) { setLinkedRepuestos([]); notify(errorMessage(reason), "error"); } });
    return () => { active = false; };
  }, [fichaKey, notify]);
  useEffect(() => {
    if (ficha?.estado === "En revisión")
      void api<RevisionResponse>(`/fichas/${fichaKey}/revision`)
        .then(setRevision)
        .catch(() => undefined);
  }, [ficha?.estado, fichaKey]);
  const pendingControls = revision?.controles.filter((control) => control.obligatorio && control.estado === "Pendiente") ?? [];
  const openDelivery = () => {
    if (!ficha) return;
    if (!revision || pendingControls.length) {
      notify("Completá los controles obligatorios antes de aprobar la revisión.", "warning");
      return;
    }
    void api<ServiceResponse[]>(`/motovehiculos/${ficha.motoId}/services`).then((services) => {
      setPriorServices(services.filter((service) => !service.fichaId));
      setSelectedServiceIds([]);
      setCloseOpen(true);
    }).catch((reason) => { setError(errorMessage(reason)); notify(errorMessage(reason), "error"); });
  };
  const aprobarRevision = async () => {
    if (pending || !ficha) return;
    setPending("aprobar-revision");
    try {
      await api(`/fichas/${fichaKey}/revision/aprobar`, {
        method: "POST",
        body: JSON.stringify({ forzada: false, serviceIds: selectedServiceIds }),
      });
       setFicha(await api<FichaResponse>(`/fichas/${fichaKey}`));
       setRevision(null);
    } catch (reason) {
      setError(errorMessage(reason));
      notify(errorMessage(reason), "error");
      throw reason;
    } finally {
      setPending(null);
    }
  };
  const confirmDelivery = () => {
    if (!ficha) return;
    setCloseOpen(false);
    onConfirm({
      title: "Aprobar revisión",
      body: "La ficha pasará a Terminada y quedará lista para entregar al cliente.",
      confirmLabel: "Aprobar revisión",
      successMessage: "Revisión aprobada. La ficha quedó terminada.",
      action: aprobarRevision,
    });
  };
  const updateControl = async (controlId: string, body: Record<string, string>) => {
    try {
      const next = await api<RevisionResponse>(`/fichas/${fichaKey}/revision/controles/${controlId}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      setRevision(next);
      notify("Control de revisión actualizado.");
      return true;
    } catch (reason) {
      setError(errorMessage(reason));
      notify(errorMessage(reason), "error");
      return false;
    }
  };
  const openRevisionNote = (control: RevisionControlResponse) => {
    setRevisionNoteControl(control);
    setRevisionNote(control.observacion ?? "");
  };
  const closeRevisionNote = () => {
    if (!revisionNoteSaving) setRevisionNoteControl(null);
  };
  const saveRevisionNote = async () => {
    if (!revisionNoteControl || revisionNoteSaving) return;
    setRevisionNoteSaving(true);
    try {
      if (await updateControl(revisionNoteControl.id, { estado: revisionNoteControl.estado, observacion: revisionNote })) setRevisionNoteControl(null);
    } finally {
      setRevisionNoteSaving(false);
    }
  };
  const openPartialPayment = () => {
    if (!ficha) return;
    setSelectedPaidWorkIds(ficha.trabajos.filter((item) => isPayableTrabajo(item) && item.pagado).map((item) => item.id));
    setPaymentOpen(true);
  };
  const savePartialPayment = async () => {
    if (!ficha || paymentSaving) return;
    setPaymentSaving(true);
    try {
      const eligibleCount = ficha.trabajos.filter(isPayableTrabajo).length;
      const estadoPago = !selectedPaidWorkIds.length ? "No pagado" : selectedPaidWorkIds.length === eligibleCount ? "Pagado" : "Parcial";
      const next = await api<FichaResponse>(`/fichas/${ficha.id}/pago`, { method: "PATCH", body: JSON.stringify({ estadoPago, itemIds: selectedPaidWorkIds }) });
      setFicha(next); setPaymentOpen(false);
    } catch (reason) { setError(errorMessage(reason)); throw reason; }
    finally { setPaymentSaving(false); }
  };
  const confirmPartialPayment = () => {
    const eligibleCount = ficha?.trabajos.filter(isPayableTrabajo).length ?? 0;
    const nextStatus = !selectedPaidWorkIds.length ? "No pagado" : selectedPaidWorkIds.length === eligibleCount ? "Pagado" : "Parcial";
    setPaymentOpen(false);
    onConfirm({
      title: "Guardar pago parcial",
      body: `La ficha quedará con el estado de pago ${nextStatus}. El cambio se registrará en auditoría.`,
      confirmLabel: "Guardar pago",
      successMessage: `Pago actualizado a ${nextStatus}.`,
      variant: "success",
      action: savePartialPayment,
    });
  };
  if (!ficha)
    return (
      <div className="page">
        <button className="back" onClick={onBack}>← Volver a fichas</button>
        {error ? <EmptyState title="No se pudo cargar la ficha" body="Revisá la notificación y volvé a intentar." action={<button className="button secondary" onClick={load}>Reintentar</button>} /> : <div className="table-loading" role="status">Cargando ficha...</div>}
      </div>
    );
  const update = async (path: string, body: Record<string, string>, id: string, successMessage?: string) => {
    if (pending) return;
    setPending(id);
    try {
      const next = await api<FichaResponse>(path, { method: "PATCH", body: JSON.stringify(body) });
      setFicha(next);
      if (successMessage) notify(successMessage);
    } catch (reason) {
      setError(errorMessage(reason));
      notify(errorMessage(reason), "error");
      throw reason;
    } finally {
      setPending(null);
    }
  };
  const startWork = async () => {
    if (!startWorkItem) return;
    const item = startWorkItem;
    setStartWorkItem(null);
    await update(`/fichas/${fichaKey}/estado`, { estado: "En proceso" }, "estado-en-proceso", "Ficha marcada en proceso.");
    await update(`/fichas/${fichaKey}/trabajos/${item.id}/estado`, { estado: "Realizado" }, `item-${item.id}`, "Trabajo actualizado.");
  };
  const current = ficha.estado;
  const subtotalTrabajos = ficha.trabajos.filter((item) => item.estadoTrabajo !== "Cancelado").reduce((sum, item) => sum + item.subtotal, 0);
  const subtotalDespuesDescuento = Math.max(0, subtotalTrabajos - ficha.descuentoGlobal);
  const ivaValor = ficha.iva ? ficha.total - subtotalDespuesDescuento : 0;
  const totalRepuestos = linkedRepuestos.filter((pedido) => pedido.estado !== "Cancelado").reduce((sum, pedido) => sum + pedido.total, 0);
  const totalPresupuesto = ficha.total + totalRepuestos;
  const saveService = async () => {
    if (!serviceKm) return notify("Ingresá el kilometraje del service.", "error");
    if (serviceSaving) return;
    setServiceSaving(true);
    try {
      await api(`/motovehiculos/${ficha.motoId}/services`, {
        method: "POST",
        body: JSON.stringify({
          fichaId: ficha.id,
          kilometraje: parseIntegerInput(serviceKm),
          fecha: serviceDate || null,
          observaciones: serviceNotes || null,
        }),
      });
      setServiceOpen(false);
      setServiceKm("");
      setServiceDate("");
      setServiceNotes("");
      onOpenMoto(ficha.motoId, "services");
      notify("Service registrado.");
    } catch (reason) {
      setError(errorMessage(reason));
      notify(errorMessage(reason), "error");
    } finally {
      setServiceSaving(false);
    }
  };
  const locked = current === "Cancelada" || current === "Terminada" || current === "Entregada";
  const flowSteps: FichaStatus[] = ["Pendiente", "En proceso", "En revisión", "Terminada", "Entregada"];
  const currentStep = flowSteps.indexOf(current);
  const bottomActions: { key: string; label: string; className: string; onClick: () => void }[] = [];
   if (current === "Pendiente")
     bottomActions.push({ key: "iniciar", label: "Comenzar trabajo", className: "primary", onClick: () => void update(`/fichas/${ficha.id}/estado`, { estado: "En proceso" }, "estado-en-proceso", "Ficha marcada en proceso.") });
   else if (current === "En proceso")
     bottomActions.push({ key: "revision", label: "Enviar a revisión", className: "primary", onClick: () => void update(`/fichas/${ficha.id}/estado`, { estado: "En revisión" }, "estado-revision", "Ficha enviada a revisión.") });
  else if (current === "En revisión")
    bottomActions.push({ key: "aprobar", label: "Aprobar revisión", className: "primary", onClick: openDelivery });
  else if (current === "Terminada")
    bottomActions.push({ key: "entregar", label: "Entregar moto", className: "primary", onClick: () => onConfirm({ title: "Entregar moto", body: "La moto quedará entregada al cliente y se cerrará el circuito de Taller.", confirmLabel: "Entregar moto", successMessage: "Moto entregada al cliente.", action: () => api<FichaResponse>(`/fichas/${ficha.id}/entregar`, { method: "POST" }).then(setFicha) }) });
   else if (current === "Entregada")
     bottomActions.push({ key: "service", label: "Registrar service", className: "primary", onClick: () => { setServiceKm(ficha.kilometrajeIngreso != null ? String(ficha.kilometrajeIngreso) : ""); setServiceDate(todayInAr()); setServiceOpen(true); } });
    if (current !== "Cancelada") {
      if (ficha.estadoPago === "Pagado")
        bottomActions.push({ key: "pago-no", label: "Marcar como no pagada", className: "secondary", onClick: () => onConfirm({ title: "Revertir pago", body: "La ficha volverá al estado No pagado. Esta acción quedará registrada en auditoría.", confirmLabel: "Marcar como no pagada", successMessage: "Pago marcado como no pagado.", variant: "success", action: () => update(`/fichas/${ficha.id}/pago`, { estadoPago: "No pagado" }, "pago-no", "Pago marcado como no pagado.") }) });
      else {
        bottomActions.push({ key: "pago", label: "Marcar como pagada", className: "secondary", onClick: () => onConfirm({ title: "Confirmar pago", body: "Todos los trabajos no cancelados se marcarán como Pagados, aunque estén pendientes. El cambio quedará registrado en auditoría.", confirmLabel: "Marcar como pagada", successMessage: "Pago marcado como pagado.", variant: "success", action: () => update(`/fichas/${ficha.id}/pago`, { estadoPago: "Pagado" }, "pago-pagado", "Pago marcado como completado.") }) });
        bottomActions.push({ key: "pago-parcial", label: ficha.estadoPago === "Parcial" ? "Editar pago parcial" : "Pago parcial", className: "secondary", onClick: openPartialPayment });
      }
    }
   if (current === "En proceso" || current === "En revisión")
       bottomActions.push({ key: "retroceder", label: "Volver un paso atrás", className: "secondary", onClick: () => onConfirm({ title: "Volver un paso atrás", body: `La ficha volverá de ${current} a ${current === "En revisión" ? "En proceso" : "Pendiente"}. El cambio quedará registrado en auditoría.`, confirmLabel: "Volver un paso atrás", successMessage: "Ficha retrocedida un paso.", action: () => update(`/fichas/${ficha.id}/estado`, { estado: current === "En revisión" ? "En proceso" : "Pendiente" }, "retroceder", "Ficha retrocedida un paso.") }) });
  if (current !== "Terminada" && current !== "Entregada" && current !== "Cancelada")
       bottomActions.push({ key: "cancelar", label: "Cancelar ficha", className: "danger", onClick: () => onConfirm({ title: "Cancelar ficha", body: "La ficha quedará cancelada. El historial conservará el registro para auditoría.", confirmLabel: "Cancelar ficha", successMessage: "Ficha cancelada.", action: () => api<FichaResponse>(`/fichas/${ficha.id}/estado`, { method: "PATCH", body: JSON.stringify({ estado: "Cancelada" }) }).then(setFicha) }) });
  return (
    <div className="page">
      <button className="back" onClick={onBack}>← Volver a fichas</button>
      <div className="detail-title">
        <div>
          <p>{ficha.numero}</p>
          <h1>{ficha.moto} · {ficha.patente}</h1>
          <span>{ficha.cliente}</span>
        </div>
        <div className="detail-stack">
          <StatusBadge key={ficha.estado} status={ficha.estado} />
          <StatusBadge key={ficha.estadoPago} status={ficha.estadoPago} />
          <strong>{money(ficha.total)}</strong>
        </div>
      </div>
      <ol className={`flow-steps${current === "Cancelada" ? " canceled" : ""}`}>
        {flowSteps.map((step) => {
          const index = flowSteps.indexOf(step);
          const done = current !== "Cancelada" && currentStep >= 0 && index < currentStep;
          const isCurrent = current !== "Cancelada" && index === currentStep;
          return (
            <li key={`${step}-${isCurrent ? "current" : done ? "done" : "pending"}`} className={`flow-step${isCurrent ? " current" : ""}${done ? " done" : ""}`}>
              <span>{done ? "✓" : index + 1}</span>
              <strong>{step}</strong>
            </li>
          );
        })}
        {current === "Cancelada" && (
          <li className="flow-step flow-step-end current">
            <span>✕</span>
            <strong>Cancelada</strong>
          </li>
        )}
      </ol>
      {bottomActions.length > 0 && (
        <div className="ficha-actions">
           {bottomActions.filter((action) => action.className === "primary").map((action) => <button key={action.key} className="button large primary" disabled={Boolean(pending) || (action.key === "aprobar" && (!revision || pendingControls.length > 0))} onClick={action.onClick}>{action.label}</button>)}
          {bottomActions.some((action) => action.className !== "primary") && <MoreActions actions={bottomActions.filter((action) => action.className !== "primary")} pending={Boolean(pending)} />}
        </div>
      )}
      <section className="detail-grid">
        <div className="form-stack">
          <section className="panel">
            <div className="panel-head">
              <h2>Detalle de reparación</h2>
              <button className="button secondary" onClick={() => void download(`/fichas/${ficha.id}/pdf`, `${ficha.numero}.pdf`).catch((reason) => notify(errorMessage(reason), "error"))}>
                <FileDown size={17} />PDF
              </button>
            </div>
            <p className="observation">{ficha.observaciones || "Sin observaciones."}</p>
             {current !== "En revisión" && <div className="line-items-list detail-work-list">
               {ficha.trabajos.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  locked={locked}
                   canDelete={current === "En proceso"}
                   onDelete={() => onConfirm({ title: "Eliminar trabajo", body: "El trabajo se quitará de la ficha y la acción quedará registrada en auditoría.", confirmLabel: "Eliminar trabajo", successMessage: "Trabajo eliminado de la ficha.", action: () => api(`/fichas/${ficha.id}/trabajos/${item.id}`, { method: "DELETE" }).then(load) })}
                    onStartWork={() => current === "Pendiente" ? setStartWorkItem(item) : void update(`/fichas/${ficha.id}/trabajos/${item.id}/estado`, { estado: "Realizado" }, `item-${item.id}`, "Trabajo actualizado.")}
                   onState={(estado) => void update(`/fichas/${ficha.id}/trabajos/${item.id}/estado`, { estado }, `item-${item.id}`, "Trabajo actualizado.")}
                />
              ))}
            </div>}
            <OrderPhotos photos={ficha.fotos} onChange={() => void load()} />
             {ficha.estado === "En revisión" && revision && (
              <section className="revision-panel">
                <div className="panel-head">
                  <h3>Revisión</h3>
                  <span className="muted">{revision.estado === "APROBADA" ? `Aprobada${revision.forzada ? " (forzada)" : ""}${revision.aprobadoAt ? ` · ${date(revision.aprobadoAt)}` : ""}` : "Controles pendientes"}</span>
                </div>
                {revision.estado !== "APROBADA" && (
                  <div className="line-items-list revision-control-list">
                     {revision.controles.map((control) => (
                       <div key={control.id} className="line-item revision-control">
                         <label className="revision-check">
                            <input type="checkbox" aria-label={`Marcar ${control.control} como revisado`} checked={control.estado === "Revisado"} onChange={(event) => void updateControl(control.id, { estado: event.target.checked ? "Revisado" : "Pendiente", observacion: control.observacion ?? "" })} />
                         </label>
                         <div className="revision-control-copy">
                           <strong>{control.control}</strong>
                           <span>{control.categorias}{control.obligatorio ? " · Obligatorio" : ""}</span>
                           {control.estado === "No aplica" && <small>No aplica</small>}
                         </div>
                         <button type="button" className="revision-note-trigger" onClick={() => openRevisionNote(control)}>{control.observacion ? "Editar observación" : "Agregar observación"}</button>
                       </div>
                     ))}
                  </div>
                )}
              </section>
            )}
          </section>
        </div>
        <aside className="summary ficha-summary">
          <h3>Presupuesto</h3>
          <dl className="summary-facts">
            <div><dt>Ficha</dt><dd>{ficha.numero}</dd></div>
            <div><dt>Cliente</dt><dd>{ficha.cliente}</dd></div>
            <div><dt>Moto</dt><dd>{ficha.moto}</dd></div>
            <div><dt>Dominio</dt><dd>{ficha.patente}</dd></div>
            <div><dt>Ingreso</dt><dd>{ficha.fechaIngreso ? date(ficha.fechaIngreso) : "—"}</dd></div>
            <div><dt>Entrega estimada</dt><dd>{ficha.fechaEntregaEstimada ? date(ficha.fechaEntregaEstimada) : "—"}</dd></div>
          </dl>
          {ficha.observaciones && <section className="summary-group"><h4>Observaciones</h4><p className="summary-note">{ficha.observaciones}</p></section>}
          <section className="summary-work-list" aria-label="Trabajos de la ficha">
            <h4>Trabajos y servicios</h4>
            {ficha.trabajos.map((item) => (
                <div key={item.id} className={`summary-work${workStateClass(item.estadoTrabajo)}${item.estadoTrabajo === "Cancelado" ? " cancelled" : ""}`}>
                  <div className="summary-work-head"><strong>{item.descripcion}</strong><strong>{money(item.subtotal)}</strong></div>
                  <div className="summary-work-total"><small>Precio {money(item.precioUnitario)}{item.descuento > 0 && ` · Descuento ${money(item.descuento)}`}</small><small className="work-state-label">{item.estadoTrabajo}</small></div>
                {item.observacionTrabajo && <small>{item.observacionTrabajo}</small>}
              </div>
            ))}
          </section>
          <section className="summary-group">
            <h4>Pedidos de repuestos y accesorios</h4>
            {linkedRepuestos.length ? <div className="summary-linked-orders">{linkedRepuestos.map((pedido) => (
              <article key={pedido.id} className={`summary-linked-order${pedido.estado === "Cancelado" ? " cancelled" : ""}`}>
                <div className="summary-linked-order-head"><strong>{pedido.numero}</strong><StatusBadge status={pedido.estado} /></div>
                <small>{pedido.proveedor ? `Proveedor: ${pedido.proveedor}` : "Sin proveedor"}</small>
                <div className="summary-order-items">{pedido.items.map((item) => <div key={item.id} className={item.estado === "Cancelado" ? "cancelled" : ""}><span>{item.descripcion} · {item.tipo} · {Number(item.cantidad)} u. · {item.estado}</span><strong>{money(item.subtotal)}</strong></div>)}</div>
                {pedido.observaciones && <small>{pedido.observaciones}</small>}
                <div className="summary-work-total"><span>Total pedido</span><strong>{pedido.estado === "Cancelado" ? "—" : money(pedido.total)}</strong></div>
              </article>
            ))}</div> : <p className="summary-empty">No hay pedidos vinculados a esta ficha.</p>}
          </section>
          <BudgetBreakdown
            subtotalTrabajos={subtotalTrabajos}
            totalRepuestos={totalRepuestos}
            descuentoGlobal={ficha.descuentoGlobal}
            iva={ivaValor}
            totalPresupuesto={totalPresupuesto}
          />
        </aside>
      </section>
      <Dialog open={serviceOpen} title="Registrar service" onClose={() => setServiceOpen(false)} dirty={Boolean(serviceNotes)}>
        <form className="record-form" onSubmit={(event) => { event.preventDefault(); void saveService(); }}>
        <label>Kilometraje<input type="text" inputMode="numeric" value={integerInput(serviceKm)} onChange={(event) => setServiceKm(event.target.value)} required /></label>
          <label>Fecha<input type="date" value={serviceDate} onChange={(event) => setServiceDate(event.target.value)} /></label>
          <label>Observación<input type="text" value={serviceNotes} onChange={(event) => setServiceNotes(event.target.value)} placeholder="Ej: cambio de aceite y filtros" /></label>
          <div className="modal-actions"><button type="button" className="button secondary" onClick={() => setServiceOpen(false)}>Cancelar</button><button className="button primary" disabled={serviceSaving}>{serviceSaving ? "Guardando..." : "Guardar"}</button></div>
        </form>
      </Dialog>
      <Dialog open={closeOpen} title="Aprobar revisión" onClose={() => setCloseOpen(false)} className="delivery-modal" dirty={selectedServiceIds.length > 0}>
         <p>Seleccioná los services previos que quieras asociar a la ficha antes de continuar.</p>
        {priorServices.length > 0 && <section className="line-items-list"><h3>Services previos sin ficha</h3>{priorServices.map((service) => <label key={service.id} className="line-check"><input type="checkbox" checked={selectedServiceIds.includes(service.id)} onChange={(event) => setSelectedServiceIds((ids) => event.target.checked ? [...ids, service.id] : ids.filter((id) => id !== service.id))} />{date(service.fecha)} · {service.kilometraje} km{service.observaciones ? ` · ${service.observaciones}` : ""}</label>)}</section>}
        {!priorServices.length && <p>No hay services previos para asociar.</p>}
        <div className="modal-actions">
          <button type="button" className="button secondary" onClick={() => setCloseOpen(false)}>Cancelar</button>
          <button type="button" className="button primary" disabled={Boolean(pending)} onClick={confirmDelivery}>Aprobar revisión</button>
        </div>
      </Dialog>
      <Dialog open={paymentOpen} title="Registrar pago parcial" onClose={() => setPaymentOpen(false)} dirty={selectedPaidWorkIds.length > 0}>
        <p>Seleccioná los trabajos no cancelados que fueron pagados. Podés registrarlos aunque sigan pendientes.</p>
        <div className="line-items-list">{ficha.trabajos.filter(isPayableTrabajo).map((item) => <label key={item.id} className="line-check"><input type="checkbox" checked={selectedPaidWorkIds.includes(item.id)} onChange={(event) => {
           if (!event.target.checked && item.pagado) {
             onConfirm({ title: "Desmarcar trabajo pagado", body: `“${item.descripcion}” ya fue marcado y persistido como pagado. ¿Estás seguro de que querés desmarcarlo?`, confirmLabel: "Desmarcar como pagado", successMessage: "Trabajo desmarcado del pago.", action: () => setSelectedPaidWorkIds((ids) => ids.filter((id) => id !== item.id)) });
             return;
           }
           setSelectedPaidWorkIds((ids) => event.target.checked ? [...ids, item.id] : ids.filter((id) => id !== item.id));
         }} />{item.descripcion}<strong>{money(item.subtotal)}</strong></label>)}</div>
        {!ficha.trabajos.some(isPayableTrabajo) && <p>No hay trabajos no cancelados para seleccionar.</p>}
        <div className="modal-actions"><button type="button" className="button secondary" onClick={() => {
           const persistedIds = ficha.trabajos.filter((item) => isPayableTrabajo(item) && item.pagado && selectedPaidWorkIds.includes(item.id)).map((item) => item.id);
           if (!persistedIds.length) { setSelectedPaidWorkIds([]); return; }
           onConfirm({ title: "Desmarcar trabajos pagados", body: "Hay trabajos que ya fueron marcados y persistidos como pagados. ¿Estás seguro de que querés desmarcarlos todos?", confirmLabel: "Desmarcar pagos", successMessage: "Trabajos desmarcados del pago.", action: () => setSelectedPaidWorkIds([]) });
         }}>No pagar ninguno</button><button type="button" className="button secondary" onClick={() => setPaymentOpen(false)}>Cancelar</button><button type="button" className="button primary" disabled={paymentSaving} onClick={confirmPartialPayment}>{paymentSaving ? "Guardando..." : "Guardar pago"}</button></div>
      </Dialog>
      <Dialog open={revisionNoteControl !== null} title="Observación de revisión" onClose={closeRevisionNote} dirty={revisionNote !== (revisionNoteControl?.observacion ?? "")}>
        <form className="record-form" onSubmit={(event) => { event.preventDefault(); void saveRevisionNote(); }}>
          <p>Control: <strong>{revisionNoteControl?.control}</strong></p>
          <label>Observación<textarea value={revisionNote} onChange={(event) => setRevisionNote(event.target.value)} placeholder="Detalle opcional de la revisión" /></label>
          <div className="modal-actions"><button type="button" className="button secondary" disabled={revisionNoteSaving} onClick={closeRevisionNote}>Cancelar</button><button className="button primary" disabled={revisionNoteSaving}>{revisionNoteSaving ? "Guardando..." : "Guardar observación"}</button></div>
        </form>
      </Dialog>
      <ConfirmModal open={startWorkItem !== null} title="Iniciar trabajo" body="Esta ficha se marcará como En proceso si realizás un trabajo." confirmLabel="Marcar en proceso" variant="success" onClose={() => setStartWorkItem(null)} onConfirm={startWork} />
    </div>
  );
}

export function ReportsView({ notify }: { notify: Notify }) {
  const [rows, setRows] = useState<{ etiqueta: string; valor: number }[]>([]);
  const [clients, setClients] = useState<ClienteResponse[]>([]);
  useEffect(() => {
    void Promise.all([
      api<{ etiqueta: string; valor: number }[]>("/reportes/resumen"),
      api<PageResponse<ClienteResponse>>("/clientes", {}, { size: 20 }),
    ])
      .then(([nextSummary, page]) => { setRows(nextSummary); setClients(page.content); })
      .catch((reason) => notify(errorMessage(reason), "error"));
  }, [notify]);
  return (
    <div className="page">
      <div className="page-heading"><div><h1>Reportes</h1><p>Indicadores actuales del taller.</p></div></div>
      <div className="metrics">
        {rows.map((item) => (
          <Metric key={item.etiqueta} label={item.etiqueta} value={money(item.valor)} tone="blue" />
        ))}
      </div>
      <section className="panel"><h2>Clientes</h2><table><tbody>{clients.map((client) => <tr key={client.id}><td data-label="Cliente">{client.nombre}</td><td data-label="Fichas">{client.fichas} fichas</td></tr>)}</tbody></table></section>
    </div>
  );
}

export function ServicesView({ onOpenMoto, notify }: { onOpenMoto: (id: string) => void; notify: Notify }) {
  const [rows, setRows] = useState<NextServiceResponse[] | null>(null);
  useEffect(() => {
    void api<NextServiceResponse[]>("/services/proximos").then(setRows).catch((reason) => notify(errorMessage(reason), "error"));
  }, [notify]);
  const overdue = rows?.filter((row) => row.atrasadoKm || row.atrasadoFecha) ?? [];
  const withoutRef = rows?.filter((row) => row.sinReferencia && !row.atrasadoKm && !row.atrasadoFecha) ?? [];
  const upcoming = rows?.filter((row) => !row.sinReferencia && !row.atrasadoKm && !row.atrasadoFecha) ?? [];
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <h1>Service</h1>
          <p>Seguimiento del próximo service por motovehículo.</p>
        </div>
      </div>
      {rows && (
        <div className="metrics">
          <Metric label="Atrasados" value={String(overdue.length)} tone="danger" />
          <Metric label="Próximos" value={String(upcoming.length)} tone="green" />
          <Metric label="Sin services" value={String(withoutRef.length)} tone="neutral" />
        </div>
      )}
      <section className="panel table-panel">
        {rows?.length ? (
          <table>
            <thead>
              <tr><th>Moto</th><th>Cliente</th><th>KM actual</th><th>Último service</th><th>Próximo</th><th>Estado</th><th /></tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.motoId}>
                  <td data-label="Moto">{row.patente}<small>{row.moto}</small></td>
                  <td data-label="Cliente">{row.cliente}</td>
                  <td data-label="KM actual">{row.kilometraje != null ? row.kilometraje.toLocaleString("es-AR") : "—"}</td>
                  <td data-label="Último service">{row.kmUltimoService != null ? `${row.kmUltimoService.toLocaleString("es-AR")} km` : "—"}</td>
                  <td data-label="Próximo">{row.sinReferencia || row.atrasadoKm || row.atrasadoFecha
                    ? <span>{row.proximKm ? `KM ${row.proximKm.toLocaleString("es-AR")}` : "—"}{row.proximaFecha ? ` · ${date(row.proximaFecha)}` : ""}</span>
                    : <span>{row.proximKm ? `KM ${row.proximKm.toLocaleString("es-AR")}` : "—"}{row.kmFaltan != null ? ` (faltan ${row.kmFaltan.toLocaleString("es-AR")})` : ""}{row.proximaFecha ? ` · ${date(row.proximaFecha)}` : ""}</span>}</td>
                  <td data-label="Estado"><StatusBadge status={row.sinReferencia ? "Sin services" : row.atrasadoKm || row.atrasadoFecha ? "Atrasado" : "Al día"} /></td>
                  <td data-label="Acción"><button className="row-action" onClick={() => onOpenMoto(row.motoId)}>Ver moto</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState title="Sin motovehículos" body="No hay motos para planificar el próximo service." />
        )}
      </section>
    </div>
  );
}
