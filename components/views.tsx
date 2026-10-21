"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDownUp, Check, Download, Edit3, Eye, FileDown, FileText, Filter, Plus, Trash2, X } from "lucide-react";
import { api, download, objectUrl } from "../lib/api";
import { integerInput, money, parseIntegerInput, paymentAmount } from "../lib/format";
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
  VentaFichaResponse,
  VentaFichaStatus,
  VentaResponse,
  TrabajoStatus,
} from "../lib/types";
import { ConfirmModal, Dialog, EmptyState, FilterBar, LoadingState, Pagination, SearchBox, SelectField, StatusBadge, type Notify } from "./ui";
import { BudgetBreakdown } from "./budget-breakdown";
import { PaymentLedger } from "./payment-ledger";
import { MetricCard, StatusRail, VehicleCard, VehicleField } from "./avianto-mobile";
import { AviantoRecordList } from "./avianto-records";
import { AviantoPage, AviantoPageHeader, AviantoPanel, AviantoPanelHeader, AviantoRecordHero, StickyActionBar } from "./avianto-layout";

const splitVehicleName = (value: string) => {
  const [make, ...modelParts] = value.trim().split(/\s+/);
  return { make: make || "—", model: modelParts.join(" ") || "—" };
};
const displayLocalDate = (value: string | null) => value ? new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`)) : "—";
import { BrandLogo } from "./brand-logo";

const date = formatDateInAr;
const errorMessage = (reason: unknown) =>
  reason instanceof Error ? reason.message : "No fue posible cargar la información.";
const workStateClass = (estado: TrabajoStatus) =>
  estado === "Realizado" ? " is-completed" : estado === "Pendiente" ? " is-pending" : " is-cancelled";
function Metric({ label, value, tone, detail }: { label: string; value: string; tone: string; detail: string }) {
  return <section className={`metric ${tone}`}><span>{label}</span><strong>{value}</strong><small>{detail}</small></section>;
}
function OrderPhotos({ photos, onChange }: { photos: PhotoResponse[]; onChange: () => void }) {
  const [urls, setUrls] = useState<Record<string, string>>({});
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
  }, [photos]);
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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [groupBy, setGroupBy] = useState<"moto" | "ficha">("moto");
  const [section, setSection] = useState<"taller" | "ventas">(initialSection);
  const [tab, setTab] = useState<string>(initialSection === "ventas" ? "En venta" : "Ingresada Taller");
  useEffect(() => {
    void Promise.all([
      api<TallerResponse>("/dashboard/taller"),
      api<DashboardFichasResponse>("/dashboard/fichas"),
      api<VentaResponse>("/dashboard/ventas"),
    ])
      .then(([nextTaller, nextFichas, nextVentas]) => { setTaller(nextTaller); setFichasAgrupadas(nextFichas); setVentas(nextVentas); setLoadError(null); })
      .catch((reason) => { setLoadError(errorMessage(reason)); notify(errorMessage(reason), "error"); });
  }, [notify, reloadKey]);
  const talleres = taller?.estados ?? [];
  const ventasEstados = ventas?.estados ?? [];
  const motos = talleres.find((item) => item.estado === tab)?.motos ?? [];
  const fichas = fichasAgrupadas?.estados.find((item) => item.estado === tab)?.fichas ?? [];
  const estados = groupBy === "moto" ? talleres : fichasAgrupadas?.estados ?? [];
  const count = (estado: string) => talleres.find((entry) => entry.estado === estado)?.motos.length ?? 0;
  const salesCount = (estado: string) => ventasEstados.find((entry) => entry.estado === estado)?.motos.length ?? 0;
  const sales = ventasEstados.find((item) => item.estado === tab)?.motos ?? [];
  const metric = (value: number) => String(value).padStart(2, "0");
  const changeSection = (next: "taller" | "ventas") => { setSection(next); setTab(next === "ventas" ? "En venta" : groupBy === "moto" ? "Ingresada Taller" : "Pendiente"); };
  return (
    <div className="page">
      <div className="avianto-mobile-screen avianto-dashboard-screen">
        <section className="avianto-dashboard-hero">
          <BrandLogo variant="color" markOnly size="lg" />
          <h1>Estado actual del taller</h1>
          <p>{userName ? `Hola, ${userName}` : "Resumen operativo"}</p>
          <button type="button" className="avianto-mobile-cta" onClick={onIntake}>+&nbsp; Ingresar moto</button>
        </section>
        <h2 className="avianto-red-heading">Resumen</h2>
        <div className="avianto-screen-body">
          <div className="avianto-segmented" role="group" aria-label="Circuito del dashboard">
            <button type="button" aria-pressed={section === "taller"} className={section === "taller" ? "active" : ""} onClick={() => changeSection("taller")}>Taller</button>
            <button type="button" aria-pressed={section === "ventas"} className={section === "ventas" ? "active" : ""} onClick={() => changeSection("ventas")}>Ventas</button>
          </div>
          {taller && fichasAgrupadas && <div className="avianto-metric-grid">
            <MetricCard label="Total" value={metric((section === "ventas" ? ventasEstados : talleres).reduce((total, item) => total + item.motos.length, 0))} detail={section === "ventas" ? "Circuito comercial" : "Circuito del taller"} />
            <MetricCard label={section === "ventas" ? "En venta" : "En curso"} value={metric(section === "ventas" ? salesCount("En venta") : count("Ingresada Taller") + count("Pendiente") + count("En proceso") + count("En revisión"))} detail={section === "ventas" ? "Gestión comercial" : "Ingresadas y en trabajo"} />
            <MetricCard label={section === "ventas" ? "Transferencias" : "Terminadas"} value={metric(section === "ventas" ? salesCount("Transferencia en proceso") : count("Terminada"))} detail={section === "ventas" ? "En proceso" : "Listas para entregar"} />
            <MetricCard label={section === "ventas" ? "Vendidas" : "Entregadas"} value={metric(section === "ventas" ? salesCount("Vendida") : count("Entregada"))} detail={section === "ventas" ? "Venta completada" : "Entrega registrada"} tone="red" />
          </div>}
          {loadError ? <EmptyState title="No se pudo cargar el resumen" body={loadError} action={<button className="button secondary" onClick={() => setReloadKey((key) => key + 1)}>Reintentar</button>} /> : !taller && <LoadingState label="Cargando el estado del taller..." />}
        </div>
        {taller && fichasAgrupadas && <>
          <div className="avianto-screen-body">
            {section === "taller" && <div className="avianto-segmented" role="group" aria-label="Agrupar resultados">
              <button type="button" aria-pressed={groupBy === "moto"} className={groupBy === "moto" ? "active" : ""} onClick={() => { setGroupBy("moto"); setTab("Ingresada Taller"); }}>Agrupar x moto</button>
              <button type="button" aria-pressed={groupBy === "ficha"} className={groupBy === "ficha" ? "active" : ""} onClick={() => { setGroupBy("ficha"); setTab("Pendiente"); }}>Agrupar x ficha</button>
            </div>}
            <StatusRail active={tab} onChange={setTab} items={(section === "ventas" ? ventasEstados : estados).map((item) => ({ id: item.estado, label: item.estado, count: "motos" in item ? item.motos.length : item.fichas.length }))} />
            {(section === "ventas" ? sales.length === 0 : groupBy === "moto" ? motos.length === 0 : fichas.length === 0) && <EmptyState title={`Sin ${section === "taller" && groupBy === "ficha" ? "fichas" : "motos"} en ${tab.toLowerCase()}`} body="Elegí otro estado para consultar los registros del circuito." />}
            <div className="avianto-mobile-list">
              {section === "ventas" ? sales.map((moto) => <VehicleCard key={moto.motoId} variant="dashboard" plate={moto.patente} action={<button type="button" className="text-button" onClick={() => onOpenMoto(moto.motoId)}>Ver moto</button>}><VehicleField label="Moto" value={moto.moto} /><VehicleField label="Cliente" value={moto.cliente ?? "—"} /><VehicleField label="Estado" value={<StatusBadge status={moto.estado} />} tone="red" /></VehicleCard>) : groupBy === "moto" ? motos.map((moto) => { const vehicle = splitVehicleName(moto.moto); return <VehicleCard key={moto.motoId} variant="dossier" plate={moto.patente} action={<button type="button" className="text-button" onClick={() => onOpenMoto(moto.motoId)}>Ingresar al perfil</button>}><VehicleField label="Moto" value={vehicle.make} /><VehicleField label="Modelo" value={vehicle.model} /><VehicleField label="Año" value="—" /><VehicleField label="Cliente" value={moto.cliente ?? "—"} /><VehicleField label="Estado" value={<StatusBadge status={moto.estado} />} tone="red" /><VehicleField label="Km" value={moto.kilometraje?.toLocaleString("es-AR") ?? "—"} /><VehicleField label="Fecha ingreso" value={displayLocalDate(moto.fechaIngreso)} /><VehicleField label="Ficha" value={moto.fichaNumero ?? "—"} /></VehicleCard>; }) : fichas.map((ficha) => <VehicleCard key={ficha.id} variant="ficha" plate={ficha.numero} action={<button type="button" className="text-button" onClick={() => void api<FichaResponse>(`/fichas/${ficha.id}`).then(onSelect).catch((reason) => notify(errorMessage(reason), "error"))}>Ver ficha</button>}><VehicleField label="Cliente" value={ficha.cliente} /><VehicleField label="Moto" value={`${ficha.moto} · ${ficha.patente}`} /><VehicleField label="Estado" value={<StatusBadge status={ficha.estado} />} tone="red" /></VehicleCard>)}
            </div>
          </div>
        </>}
      </div>
    </div>
  );
}

const salesStatuses: VentaFichaStatus[] = ["En venta", "Transferencia en proceso", "Vendida", "Cancelada"];
const salesSortOptions = [
  { value: "createdAt", label: "Fecha de creación" },
  { value: "updatedAt", label: "Última actualización" },
  { value: "numero", label: "Número de ficha" },
];

export function VentasView({
  onIntake,
  onOpenMoto,
  onOpenSale,
  notify,
}: {
  onIntake: () => void;
  onOpenMoto: (id: string) => void;
  onOpenSale: (sale: VentaFichaResponse) => void;
  notify: Notify;
}) {
  const [result, setResult] = useState<PageResponse<VentaFichaResponse> | null>(null);
  const [status, setStatus] = useState<"Todos" | VentaFichaStatus>("Todos");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("updatedAt");
  const [direction, setDirection] = useState<"ASC" | "DESC">("DESC");
  const [page, setPage] = useState(1);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void api<PageResponse<VentaFichaResponse>>("/ventas", { signal: controller.signal }, {
      q: query || undefined,
      estado: status === "Todos" ? undefined : status,
      sortBy,
      direction,
      page: page - 1,
      size: 20,
    }).then((next) => { setResult(next); setLoadError(null); }).catch((reason) => { if (!controller.signal.aborted) { const message = errorMessage(reason); setLoadError(message); notify(message, "error"); } });
    return () => controller.abort();
  }, [query, status, sortBy, direction, page, notify, reloadKey]);
  const emptyLabel = status === "Todos" ? "para mostrar" : status.toLowerCase();
  return <AviantoPage>
    <AviantoPageHeader title="Ventas" description="Fichas persistentes para seguir comprador, requisitos y transferencia." actions={<button className="button secondary" onClick={onIntake}><Plus size={18} />Ingresar moto</button>} />
       <AviantoPanel className="record-list-panel">
       <FilterBar
          primary={<SearchBox value={query} onChange={(value) => { setQuery(value); setPage(1); }} placeholder="Ficha, patente o comprador" />}
          activeCount={(status !== "Todos" ? 1 : 0) + (sortBy !== "updatedAt" ? 1 : 0)}
        >
          <SelectField value={status} onChange={(value) => { setStatus(value as typeof status); setPage(1); }} options={[{ value: "Todos", label: "Todos los estados" }, ...salesStatuses.map((value) => ({ value, label: value }))]} icon={Filter} ariaLabel="Filtrar ventas por estado" />
          <SelectField value={sortBy} onChange={(value) => { setSortBy(value); setPage(1); }} options={salesSortOptions} icon={Filter} ariaLabel="Ordenar ventas por" />
          <button className="button secondary" onClick={() => { setDirection((value) => value === "DESC" ? "ASC" : "DESC"); setPage(1); }} aria-label="Cambiar orden de ventas"><ArrowDownUp size={16} />{direction === "DESC" ? "Más recientes" : "Más antiguas"}</button>
        </FilterBar>
        {result?.content.length ? <AviantoRecordList label="Fichas de venta" records={result.content.map((sale) => {
          const required = sale.items.filter((item) => item.obligatorio);
          const completed = required.filter((item) => item.estado === "Realizado").length;
          const appointment = sale.transferencia?.citaFecha ? `${date(sale.transferencia.citaFecha)} · ${sale.transferencia.citaHora?.slice(0, 5) ?? "—"}` : "Sin cita";
          return { id: sale.id, title: sale.numero, label: "Venta", fields: [
            { label: "Moto", value: <>{sale.patente}<small>{sale.moto}</small></>, wide: true },
            { label: sale.estado === "Vendida" ? "Comprador final" : sale.estado === "Cancelada" ? "Comprador registrado" : "Comprador prospectivo", value: sale.comprador ?? "Sin comprador", wide: true },
            { label: "Estado", value: <StatusBadge status={sale.estado} /> },
            { label: "Carpeta", value: <>{required.length ? `${completed}/${required.length} obligatorios` : "Sin ítems obligatorios"}<small>{sale.obligatoriosCompletos ? "Completa" : "Incompleta"}</small></> },
            { label: "Cita", value: <>{appointment}<small>{sale.transferencia?.asistenciaAt ? "Asistencia confirmada" : sale.transferencia ? "Asistencia pendiente" : "Esperando transferencia"}</small></> },
            { label: "Actualizada", value: date(sale.actualizadaEn) },
          ], actions: <><button type="button" className="text-button" onClick={() => onOpenSale(sale)} aria-label={`Abrir ficha de venta ${sale.numero}`}><FileText size={17} />Abrir venta</button><button type="button" className="text-button secondary" onClick={() => onOpenMoto(sale.motoId)} aria-label={`Ver moto ${sale.patente}`}><Eye size={17} />Ver moto</button></> };
        })} /> : loadError ? <EmptyState title="No se pudieron cargar las fichas de venta" body={loadError} action={<button className="button secondary" onClick={() => setReloadKey((value) => value + 1)}>Reintentar</button>} /> : result ? <EmptyState title={`Sin fichas ${emptyLabel}`} body={query ? "Probá con otra búsqueda." : "No hay fichas de venta dentro de los filtros seleccionados."} /> : <LoadingState label="Cargando fichas de venta..." />}
       <Pagination page={page} total={result?.totalPages || 1} onPage={setPage} />
      </AviantoPanel>
    </AviantoPage>;
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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [page, setPage] = useState(1);
  const pendingIntake = status === "Ingresada Taller";
  useEffect(() => {
    const controller = new AbortController();
    if (pendingIntake) {
      void api<PageResponse<MotovehiculoResponse>>("/motovehiculos", { signal: controller.signal }, {
        q: query || undefined,
        estado: "Ingresada Taller",
        page: page - 1,
        size: 20,
        sortBy: sortBy === "fechaIngreso" ? "updatedAt" : sortBy === "numero" ? "patente" : sortBy,
        direction,
      })
        .then((next) => { setPendingMotos(next); setLoadError(null); })
        .catch((reason) => { if (!controller.signal.aborted) { setLoadError(errorMessage(reason)); notify(errorMessage(reason), "error"); } });
      return () => controller.abort();
    }
    void api<PageResponse<FichaResponse>>(
      "/fichas",
      { signal: controller.signal },
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
      .then((next) => { setResult(next); setLoadError(null); })
      .catch((reason) => { if (!controller.signal.aborted) { setLoadError(errorMessage(reason)); notify(errorMessage(reason), "error"); } });
    return () => controller.abort();
  }, [query, status, paymentStatus, desde, hasta, sortBy, direction, page, pendingIntake, notify, reloadKey]);
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
    <AviantoPage>
      <AviantoPageHeader title="Fichas de trabajo" description="Consultá y administrá las órdenes de trabajo del taller." actions={<button className="button primary" onClick={onNewOrder}><Plus size={19} />Nueva ficha</button>} />
       <AviantoPanel className="record-list-panel">
         <FilterBar
            primary={<SearchBox value={query} onChange={(value) => { setQuery(value); setPage(1); }} placeholder={pendingIntake ? "Patente o moto" : "Número o cliente"} />}
            activeCount={(status !== "Todos" ? 1 : 0) + (pendingIntake ? 0 : (paymentStatus !== "Todos" ? 1 : 0) + (desde ? 1 : 0) + (hasta ? 1 : 0)) + (sortBy !== "fechaIngreso" ? 1 : 0)}
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
        {loadError ? <EmptyState title="No se pudieron cargar las fichas" body={loadError} action={<button className="button secondary" onClick={() => setReloadKey((key) => key + 1)}>Reintentar</button>} /> : pendingIntake ? pendingMotos?.content.length ? (
           <AviantoRecordList label="Motos pendientes de ficha" records={pendingMotos.content.map((moto) => ({
             id: moto.id, title: moto.patente, fields: [
               { label: "Moto", value: `${moto.marca} ${moto.modelo}`, wide: true },
               { label: "Cliente", value: moto.propietario ?? "Sin propietario", wide: true },
               { label: "Estado", value: <StatusBadge status={moto.estado} /> },
               { label: "Ficha", value: "Sin ficha" },
             ], actions: <button type="button" className="text-button" onClick={() => onOpenMoto(moto.id)} aria-label={`Ver perfil ${moto.patente}`}><Eye size={17} />Abrir perfil</button>,
           }))} />
         ) : pendingMotos ? <EmptyState title="Sin motos ingresadas" body="No hay motos en Taller pendientes de ficha." /> : <LoadingState label="Cargando motos..." /> : !result ? <LoadingState label="Cargando fichas..." /> : result.content.length ? (
          <AviantoRecordList label="Fichas de trabajo" records={result.content.map((ficha) => {
            const editable = ficha.estado === "Pendiente" || ficha.estado === "En proceso";
            return { id: ficha.id, title: ficha.numero, label: "Ficha", fields: [
              { label: "Moto", value: <>{ficha.moto}<small>{ficha.patente}</small></>, wide: true },
              { label: "Cliente", value: ficha.cliente, wide: true },
              { label: "Estado", value: <StatusBadge status={ficha.estado} /> },
              { label: "Pago", value: <StatusBadge status={ficha.estadoPago} /> },
              { label: "Fecha de ingreso", value: date(ficha.fechaIngreso) },
              { label: "Total", value: money(ficha.total) },
            ], actions: <>
              <button type="button" className="text-button" onClick={() => onSelect(ficha)} aria-label={`Ver ficha ${ficha.numero}`}><Eye size={17} />Abrir ficha</button>
              {editable && <><button type="button" className="text-button secondary" onClick={() => onEdit(ficha)} aria-label={`Editar ficha ${ficha.numero}`}><Edit3 size={17} />Editar</button><button type="button" className="text-button danger-action" onClick={() => onDelete(ficha)} aria-label={`Eliminar ficha ${ficha.numero}`}><Trash2 size={17} />Eliminar</button></>}
            </> };
          })} />
        ) : (
          <EmptyState title="No hay fichas con estos filtros" body={desde || hasta ? "No encontramos fichas en el período seleccionado. Podés ampliar la consulta a todas las fechas." : "Probá con otro cliente, número de ficha o estado."} action={desde || hasta ? <button className="button secondary" onClick={() => { setDesde(""); setHasta(""); setPage(1); }}>Ver todas las fechas</button> : undefined} />
        )}
        <Pagination page={page} total={pendingIntake ? pendingMotos?.totalPages || 1 : result?.totalPages || 1} onPage={setPage} />
      </AviantoPanel>
    </AviantoPage>
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
        <label className="revision-check detail-line-check">
          <input type="checkbox" aria-label={`Marcar ${item.descripcion} como realizado`} checked={item.estadoTrabajo === "Realizado"} disabled={item.estadoTrabajo === "Cancelado"} onChange={(event) => event.target.checked ? onStartWork() : onState("Pendiente")} />
        </label>
      )}
      <div className="detail-work-copy">
        <strong>{item.descripcion}</strong>
        <div className="detail-work-meta"><span>{money(Number(item.precioUnitario))}{item.descuento > 0 && ` · descuento ${money(Number(item.descuento))}`}</span><StatusBadge status={item.estadoTrabajo} /></div>
        {item.observacionTrabajo && <p className="work-observation">{item.observacionTrabajo}</p>}
      </div>
      {canDelete && <button type="button" className="danger-action" onClick={onDelete} aria-label={`Eliminar trabajo ${item.descripcion}`}><Trash2 size={17} />Eliminar</button>}
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
  onEdit,
  onOpenMoto,
  onOpenRepuesto,
  onNewRepuesto,
  notify,
}: {
  fichaKey: string;
  onBack: () => void;
  onConfirm: (request: { title: string; body: string; confirmLabel: string; successMessage: string; variant?: "danger" | "success"; action: () => void | Promise<void> }) => void;
  onEdit: () => void;
  onOpenMoto: (motoId: string, tab?: "services" | "fichas") => void;
  onOpenRepuesto: (repuestoId: string) => void;
  onNewRepuesto: (prefill: { motoId: string; clienteId?: string | null; fichaId: string }) => void;
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
  const [startWorkItem, setStartWorkItem] = useState<FichaTrabajoResponse | null>(null);
  const [linkedRepuestos, setLinkedRepuestos] = useState<RepuestoResponse[]>([]);
  const load = async () => {
    try {
      setFicha(await api<FichaResponse>(`/fichas/${fichaKey}`));
      setError(null);
    } catch (reason) {
      setError(errorMessage(reason));
      notify(errorMessage(reason), "error");
    }
  };
  useEffect(() => {
    let active = true;
    void api<FichaResponse>(`/fichas/${fichaKey}`)
      .then((next) => { if (active) { setFicha(next); setError(null); } })
      .catch((reason) => { if (active) { setError(errorMessage(reason)); notify(errorMessage(reason), "error"); } });
    return () => { active = false; };
  }, [fichaKey, notify]);
  useEffect(() => {
    let active = true;
    void api<RepuestoResponse[]>(`/fichas/${fichaKey}/repuestos`)
      .then((items) => { if (active) setLinkedRepuestos(items); })
      .catch((reason) => { if (active) { setLinkedRepuestos([]); notify(errorMessage(reason), "error"); } });
    return () => { active = false; };
  }, [fichaKey, notify]);
  useEffect(() => {
    if (ficha?.estado === "En revisión")
      void api<RevisionResponse>(`/fichas/${fichaKey}/revision/preparar`, { method: "POST" })
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
  if (!ficha)
    return (
      <AviantoPage className="ficha-detail-page">
        <AviantoPageHeader title="Ficha de taller" actions={<button className="button secondary" onClick={onBack}>Volver a fichas</button>} />
        {error ? <EmptyState title="No se pudo cargar la ficha" body="Revisá la notificación y volvé a intentar." action={<button className="button secondary" onClick={load}>Reintentar</button>} /> : <LoadingState label="Cargando ficha..." />}
      </AviantoPage>
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
  const repuestosActivos = linkedRepuestos.filter((pedido) => pedido.estado !== "Cancelado");
  const totalRepuestos = repuestosActivos.reduce((sum, pedido) => sum + pedido.total, 0);
  const totalPresupuesto = ficha.total + totalRepuestos;
  const montoCobradoPresupuesto = ficha.montoCobrado + repuestosActivos.reduce((sum, pedido) => sum + pedido.montoCobrado, 0);
  const saldoPendientePresupuesto = ficha.saldoPendiente + repuestosActivos.reduce((sum, pedido) => sum + pedido.saldoPendiente, 0);
  const estadoPagoPresupuesto: PagoStatus = montoCobradoPresupuesto <= 0 ? "No pagado" : saldoPendientePresupuesto <= 0 ? "Pagado" : "Parcial";
  const trabajosPendientes = ficha.trabajos.some((item) => item.estadoTrabajo !== "Realizado" && item.estadoTrabajo !== "Cancelado");
  const entregaConSaldoPendiente = saldoPendientePresupuesto > 0;
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
     bottomActions.push({ key: "revision", label: "Enviar a revisión", className: "primary", onClick: () => trabajosPendientes ? notify("Completá todos los trabajos pendientes antes de enviar la ficha a revisión.", "warning") : void update(`/fichas/${ficha.id}/estado`, { estado: "En revisión" }, "estado-revision", "Ficha enviada a revisión.") });
  else if (current === "En revisión")
    bottomActions.push({ key: "aprobar", label: "Aprobar revisión", className: "primary", onClick: openDelivery });
  else if (current === "Terminada")
    bottomActions.push({ key: "entregar", label: "Entregar moto", className: "primary", onClick: () => onConfirm({ title: entregaConSaldoPendiente ? "Entregar moto con saldo pendiente" : "Entregar moto", body: entregaConSaldoPendiente ? `La moto se entregará con un saldo pendiente de ${paymentAmount(saldoPendientePresupuesto)} entre la ficha y los repuestos activos. Podés registrar pagos después de la entrega.` : "La moto quedará entregada al cliente y se cerrará el circuito de Taller.", confirmLabel: entregaConSaldoPendiente ? "Entregar con saldo pendiente" : "Entregar moto", successMessage: entregaConSaldoPendiente ? "Moto entregada con saldo pendiente." : "Moto entregada al cliente.", variant: entregaConSaldoPendiente ? "danger" : "success", action: () => api<FichaResponse>(`/fichas/${ficha.id}/entregar`, { method: "POST" }).then(setFicha) }) });
   else if (current === "Entregada")
     bottomActions.push({ key: "service", label: "Registrar service", className: "primary", onClick: () => { setServiceKm(ficha.kilometrajeIngreso != null ? String(ficha.kilometrajeIngreso) : ""); setServiceDate(todayInAr()); setServiceOpen(true); } });
   if (current === "En proceso" || current === "En revisión")
       bottomActions.push({ key: "retroceder", label: "Volver un paso atrás", className: "secondary", onClick: () => onConfirm({ title: "Volver un paso atrás", body: `La ficha volverá de ${current} a ${current === "En revisión" ? "En proceso" : "Pendiente"}. El cambio quedará registrado en auditoría.`, confirmLabel: "Volver un paso atrás", successMessage: "Ficha retrocedida un paso.", action: () => update(`/fichas/${ficha.id}/estado`, { estado: current === "En revisión" ? "En proceso" : "Pendiente" }, "retroceder", "Ficha retrocedida un paso.") }) });
  if (current !== "Terminada" && current !== "Entregada" && current !== "Cancelada")
       bottomActions.push({ key: "cancelar", label: "Cancelar ficha", className: "danger", onClick: () => onConfirm({ title: "Cancelar ficha", body: "La ficha quedará cancelada. El historial conservará el registro para auditoría.", confirmLabel: "Cancelar ficha", successMessage: "Ficha cancelada.", action: () => api<FichaResponse>(`/fichas/${ficha.id}/estado`, { method: "PATCH", body: JSON.stringify({ estado: "Cancelada" }) }).then(setFicha) }) });
  return (
    <AviantoPage className="ficha-detail-page">
      <AviantoRecordHero
        eyebrow={ficha.numero}
        title={ficha.patente}
        subtitle={`${ficha.moto} · ${ficha.cliente}`}
        status={<><StatusBadge key={ficha.estado} status={ficha.estado} /><StatusBadge key={ficha.estadoPago} status={ficha.estadoPago} /></>}
        actions={<><strong className="avianto-record-total">{money(ficha.total)}</strong>{(current === "Pendiente" || current === "En proceso") && <button className="button secondary" onClick={onEdit}><Edit3 size={17} />Editar ficha</button>}</>}
        onBack={onBack}
        backLabel="Volver a fichas"
      />
      <ol className={`flow-steps${current === "Cancelada" ? " canceled" : ""}`} aria-label="Etapas de la ficha">
        {flowSteps.map((step) => {
          const index = flowSteps.indexOf(step);
          const done = current !== "Cancelada" && currentStep >= 0 && index < currentStep;
          const isCurrent = current !== "Cancelada" && index === currentStep;
          return (
            <li key={`${step}-${isCurrent ? "current" : done ? "done" : "pending"}`} className={`flow-step${isCurrent ? " current" : ""}${done ? " done" : ""}`} aria-current={isCurrent ? "step" : undefined}>
              <span aria-hidden="true">{done ? <Check size={18} /> : index + 1}</span>
              <strong>{step}</strong>
            </li>
          );
        })}
        {current === "Cancelada" && (
          <li className="flow-step flow-step-end current" aria-current="step">
            <span aria-hidden="true"><X size={18} /></span>
            <strong>Cancelada</strong>
          </li>
        )}
      </ol>
      {bottomActions.length > 0 && (
        <StickyActionBar className="ficha-actions">
           {bottomActions.filter((action) => action.className === "primary").map((action) => <button key={action.key} className="button large primary" disabled={Boolean(pending) || (action.key === "aprobar" && (!revision || pendingControls.length > 0))} onClick={action.onClick}>{action.label}</button>)}
          {bottomActions.some((action) => action.className !== "primary") && <MoreActions actions={bottomActions.filter((action) => action.className !== "primary")} pending={Boolean(pending)} />}
        </StickyActionBar>
      )}
      <section className="detail-grid">
        <div className="form-stack">
          <AviantoPanel variant="section" className="ficha-repair-panel">
            <AviantoPanelHeader title="Detalle de reparación" actions={<button className="button secondary" onClick={() => void download(`/fichas/${ficha.id}/pdf`, `${ficha.numero}.pdf`).catch((reason) => notify(errorMessage(reason), "error"))}>
                <FileDown size={17} />PDF
              </button>} />
            <div className="avianto-panel-body">
            <section className="ficha-observations" aria-label="Observaciones de la ficha">
              <h3>Observaciones</h3>
              <p className="observation">{ficha.observaciones || "Sin observaciones."}</p>
            </section>
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
            </div>
          </AviantoPanel>
          <AviantoPanel variant="section" className="ficha-orders-panel">
            <AviantoPanelHeader
              title="Pedidos de repuestos y accesorios"
              actions={!locked ? <button type="button" className="button secondary" onClick={() => onNewRepuesto({ motoId: ficha.motoId, clienteId: ficha.clienteId, fichaId: ficha.id })}><Plus size={17} />Nuevo pedido</button> : undefined}
            />
            <div className="avianto-panel-body">
              {linkedRepuestos.length ? <div className="summary-linked-orders">{linkedRepuestos.map((pedido) => (
                <article key={pedido.id} className={`summary-linked-order${pedido.estado === "Cancelado" ? " cancelled" : ""}`}>
                  <div className="summary-linked-order-head">
                    <strong>{pedido.numero}</strong>
                    <div className="summary-linked-order-status"><StatusBadge status={pedido.estado} /><StatusBadge status={pedido.estadoPago} /></div>
                  </div>
                  <small>{pedido.proveedor ? `Proveedor: ${pedido.proveedor}` : "Sin proveedor"}</small>
                  <div className="summary-order-items">{pedido.items.map((item) => <div key={item.id} className={item.estado === "Cancelado" ? "cancelled" : ""}><span>{item.descripcion} · {item.tipo} · {Number(item.cantidad)} u. · {item.estado}</span><strong>{money(item.subtotal)}</strong></div>)}</div>
                  {pedido.observaciones && <small>{pedido.observaciones}</small>}
                  <div className="summary-work-total"><span>Total pedido</span><strong>{pedido.estado === "Cancelado" ? "—" : money(pedido.total)}</strong></div>
                  {pedido.estado !== "Cancelado" && <div className="summary-payment-amounts"><span>Cobrado <strong>{paymentAmount(pedido.montoCobrado)}</strong></span><span>Saldo <strong>{paymentAmount(pedido.saldoPendiente)}</strong></span></div>}
                  <button type="button" className="text-button summary-linked-order-action" onClick={() => onOpenRepuesto(pedido.id)}>Abrir pedido</button>
                </article>
              ))}</div> : <p className="summary-empty">No hay pedidos vinculados a esta ficha.</p>}
              <div className="ficha-orders-total"><span>Total repuestos vinculados</span><strong>{money(totalRepuestos)}</strong></div>
            </div>
          </AviantoPanel>
          <PaymentLedger resource="fichas" documentId={ficha.id} documentState={ficha.estado} estadoPago={ficha.estadoPago} total={ficha.total} montoCobrado={ficha.montoCobrado} saldoPendiente={ficha.saldoPendiente} onDocumentChange={load} notify={notify} />
             {ficha.estado === "En revisión" && revision && (
              <AviantoPanel variant="section" className="revision-panel">
                <AviantoPanelHeader title="Revisión" description={revision.estado === "APROBADA" ? `Aprobada${revision.forzada ? " (forzada)" : ""}${revision.aprobadoAt ? ` · ${date(revision.aprobadoAt)}` : ""}` : "Controles pendientes"} />
                {revision.estado !== "APROBADA" && (
                  <div className="avianto-panel-body"><div className="line-items-list revision-control-list">
                     {revision.controles.map((control) => (
                       <div key={control.id} className="line-item revision-control">
                         <label className="revision-check">
                            <input type="checkbox" aria-label={`Marcar ${control.control} como revisado`} checked={control.estado === "Revisado"} onChange={(event) => void updateControl(control.id, { estado: event.target.checked ? "Revisado" : "Pendiente", observacion: control.observacion ?? "" })} />
                         </label>
                         <div className="revision-control-copy">
                           <strong>{control.control}</strong>
                           <span>{control.categorias}{control.obligatorio ? " · Obligatorio" : ""}</span>
                           <StatusBadge status={control.estado} />
                           {control.estado === "No aplica" && <small>No aplica</small>}
                           {control.observacion?.trim() ? <p className="revision-control-observation">{control.observacion}</p> : null}
                         </div>
                         <button type="button" className="revision-note-trigger" onClick={() => openRevisionNote(control)}>{control.observacion ? "Editar observación" : "Agregar observación"}</button>
                       </div>
                     ))}
                  </div></div>
                )}
              </AviantoPanel>
            )}
        </div>
        <AviantoPanel as="aside" variant="section" className="summary ficha-summary">
          <AviantoPanelHeader title="Presupuesto" level={3} actions={<StatusBadge status={estadoPagoPresupuesto} />} />
          <div className="avianto-panel-body">
          <div className="ficha-facts-grid">
            <VehicleField label="Ficha" value={ficha.numero} />
            <VehicleField label="Dominio" value={ficha.patente} />
            <VehicleField label="Cliente" value={ficha.cliente} wide />
            <VehicleField label="Moto" value={ficha.moto} wide />
            <VehicleField label="Ingreso" value={ficha.fechaIngreso ? date(ficha.fechaIngreso) : "—"} />
            <VehicleField label="Entrega estimada" value={ficha.fechaEntregaEstimada ? date(ficha.fechaEntregaEstimada) : "—"} />
          </div>
          <BudgetBreakdown
            subtotalTrabajos={subtotalTrabajos}
            totalRepuestos={totalRepuestos}
            descuentoGlobal={ficha.descuentoGlobal}
            iva={ivaValor}
            totalPresupuesto={totalPresupuesto}
            montoCobradoPresupuesto={montoCobradoPresupuesto}
            saldoPendientePresupuesto={saldoPendientePresupuesto}
          />
          </div>
        </AviantoPanel>
      </section>
      <Dialog open={serviceOpen} title="Registrar service" onClose={() => setServiceOpen(false)} dirty={Boolean(serviceNotes)} className="ficha-service-modal">
        <form className="record-form" onSubmit={(event) => { event.preventDefault(); void saveService(); }}>
        <label>Kilometraje<input type="text" inputMode="numeric" value={integerInput(serviceKm)} onChange={(event) => setServiceKm(event.target.value)} required /></label>
          <label>Fecha<input type="date" value={serviceDate} onChange={(event) => setServiceDate(event.target.value)} /></label>
          <label>Observación<input type="text" value={serviceNotes} onChange={(event) => setServiceNotes(event.target.value)} placeholder="Ej: cambio de aceite y filtros" /></label>
          <div className="modal-actions"><button type="button" className="button secondary" onClick={() => setServiceOpen(false)}>Cancelar</button><button className="button primary" disabled={serviceSaving}>{serviceSaving ? "Guardando..." : "Guardar"}</button></div>
        </form>
      </Dialog>
      <Dialog open={closeOpen} title="Aprobar revisión" onClose={() => setCloseOpen(false)} className="delivery-modal" dirty={selectedServiceIds.length > 0}>
         <p>Seleccioná los services previos que quieras asociar a la ficha antes de continuar.</p>
        {priorServices.length > 0 && <section className="ficha-service-options"><h3>Services previos sin ficha</h3>{priorServices.map((service) => <label key={service.id} className="line-check"><input type="checkbox" checked={selectedServiceIds.includes(service.id)} onChange={(event) => setSelectedServiceIds((ids) => event.target.checked ? [...ids, service.id] : ids.filter((id) => id !== service.id))} /><span>{date(service.fecha)} · {service.kilometraje} km{service.observaciones ? ` · ${service.observaciones}` : ""}</span></label>)}</section>}
        {!priorServices.length && <p>No hay services previos para asociar.</p>}
        <div className="modal-actions">
          <button type="button" className="button secondary" onClick={() => setCloseOpen(false)}>Cancelar</button>
          <button type="button" className="button primary" disabled={Boolean(pending)} onClick={confirmDelivery}>Aprobar revisión</button>
        </div>
      </Dialog>
      <Dialog open={revisionNoteControl !== null} title="Observación de revisión" onClose={closeRevisionNote} dirty={revisionNote !== (revisionNoteControl?.observacion ?? "")}>
        <form className="record-form" onSubmit={(event) => { event.preventDefault(); void saveRevisionNote(); }}>
          <p>Control: <strong>{revisionNoteControl?.control}</strong></p>
          <label>Observación<textarea value={revisionNote} onChange={(event) => setRevisionNote(event.target.value)} placeholder="Detalle opcional de la revisión" /></label>
          <div className="modal-actions"><button type="button" className="button secondary" disabled={revisionNoteSaving} onClick={closeRevisionNote}>Cancelar</button><button className="button primary" disabled={revisionNoteSaving}>{revisionNoteSaving ? "Guardando..." : "Guardar observación"}</button></div>
        </form>
      </Dialog>
      <ConfirmModal open={startWorkItem !== null} title="Iniciar trabajo" body="Esta ficha se marcará como En proceso si realizás un trabajo." confirmLabel="Marcar en proceso" variant="success" onClose={() => setStartWorkItem(null)} onConfirm={startWork} />
    </AviantoPage>
  );
}

export function ReportsView({ notify }: { notify: Notify }) {
  const [data, setData] = useState<{ summary: { etiqueta: string; valor: number }[]; clients: PageResponse<ClienteResponse> } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [page, setPage] = useState(1);
  useEffect(() => {
    const controller = new AbortController();
    void Promise.all([
      api<{ etiqueta: string; valor: number }[]>("/reportes/resumen", { signal: controller.signal }),
      api<PageResponse<ClienteResponse>>("/clientes", { signal: controller.signal }, { size: 20, page: page - 1 }),
    ]).then(([summary, clients]) => { setData({ summary, clients }); setLoadError(null); })
      .catch((reason) => { if (!controller.signal.aborted) { setLoadError(errorMessage(reason)); notify(errorMessage(reason), "error"); } });
    return () => controller.abort();
  }, [notify, reloadKey, page]);
  const metricDetails: Record<string, string> = { "Fichas último mes": "Ingresadas en los últimos 30 días", "Motos con service": "Con un service de referencia", "En proceso": "Pendientes, en proceso y revisión" };
  return <AviantoPage className="reports-page">
    <AviantoPageHeader title="Reportes" description="Indicadores del taller y actividad registrada por cliente." />
    {loadError ? <EmptyState title="No se pudieron cargar los reportes" body={loadError} action={<button className="button secondary" onClick={() => setReloadKey((key) => key + 1)}>Reintentar</button>} /> : !data ? <LoadingState label="Cargando indicadores..." /> : <>
      <div className="metrics avianto-metrics">{data.summary.map((item) => <Metric key={item.etiqueta} label={item.etiqueta} value={Number(item.valor).toLocaleString("es-AR")} tone="blue" detail={metricDetails[item.etiqueta] ?? "Registros del taller"} />)}</div>
      <AviantoPanel className="record-list-panel reports-clients-panel">
        <div className="panel-head"><div><h2>Fichas por cliente</h2><p>Cantidad de fichas asociadas a cada cliente del padrón.</p></div><span className="muted">{data.clients.totalElements} clientes</span></div>
        {data.clients.content.length ? <AviantoRecordList label="Fichas por cliente" records={data.clients.content.map((client) => ({ id: client.id, title: client.nombre, fields: [{ label: "Fichas registradas", value: client.fichas ?? 0, wide: true }] }))} /> : <EmptyState title="Todavía no hay clientes" body="La actividad se mostrará cuando haya clientes registrados en el taller." />}
        <Pagination page={page} total={data.clients.totalPages || 1} onPage={setPage} />
      </AviantoPanel>
    </>}
  </AviantoPage>;
}

export function ServicesView({ onOpenMoto, notify }: { onOpenMoto: (id: string) => void; notify: Notify }) {
  const [rows, setRows] = useState<NextServiceResponse[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("Todos");
  useEffect(() => {
    const controller = new AbortController();
    void api<NextServiceResponse[]>("/services/proximos", { signal: controller.signal })
      .then((next) => { setRows(next); setLoadError(null); })
      .catch((reason) => { if (!controller.signal.aborted) { setLoadError(errorMessage(reason)); notify(errorMessage(reason), "error"); } });
    return () => controller.abort();
  }, [notify, reloadKey]);
  const overdue = rows?.filter((row) => row.atrasadoKm || row.atrasadoFecha) ?? [];
  const withoutRef = rows?.filter((row) => row.sinReferencia && !row.atrasadoKm && !row.atrasadoFecha) ?? [];
  const upcoming = rows?.filter((row) => !row.sinReferencia && !row.atrasadoKm && !row.atrasadoFecha) ?? [];
  const stateFor = (row: NextServiceResponse) => row.atrasadoKm || row.atrasadoFecha ? "Atrasado" : row.sinReferencia ? "Sin services" : "Al día";
  const visible = (rows ?? []).filter((row) => (!query || `${row.patente} ${row.moto} ${row.cliente}`.toLocaleLowerCase("es-AR").includes(query.toLocaleLowerCase("es-AR"))) && (filter === "Todos" || stateFor(row) === filter));
  return <AviantoPage className="services-page">
    <AviantoPageHeader title="Services" description="Próximos vencimientos, kilometraje y mantenimiento de cada moto." />
    {rows && !loadError && <div className="metrics avianto-metrics">
      <Metric label="Atrasados" value={String(overdue.length)} tone="danger" detail="Superaron la fecha o el kilometraje" />
      <Metric label="Al día" value={String(upcoming.length)} tone="green" detail="Con el próximo service programado" />
      <Metric label="Sin services" value={String(withoutRef.length)} tone="neutral" detail="Sin un mantenimiento de referencia" />
    </div>}
    <AviantoPanel className="record-list-panel services-record-list-panel">
      <div className="panel-head"><div><h2>Planificación de services</h2><p>Consultá el próximo mantenimiento o abrí el perfil para registrar uno.</p></div></div>
      <FilterBar primary={<SearchBox value={query} onChange={setQuery} placeholder="Patente, moto o cliente" />} activeCount={filter !== "Todos" ? 1 : 0}>
        <SelectField value={filter} onChange={setFilter} options={[{ value: "Todos", label: "Todos los estados" }, { value: "Atrasado", label: "Atrasados" }, { value: "Al día", label: "Al día" }, { value: "Sin services", label: "Sin services" }]} icon={Filter} ariaLabel="Filtrar services por estado" />
      </FilterBar>
      {loadError ? <EmptyState title="No se pudieron cargar los services" body={loadError} action={<button className="button secondary" onClick={() => setReloadKey((key) => key + 1)}>Reintentar</button>} /> : !rows ? <LoadingState label="Cargando services..." /> : visible.length ? <AviantoRecordList label="Planificación de services" records={visible.map((row) => ({
        id: row.motoId, title: row.patente, fields: [
          { label: "Moto", value: row.moto, wide: true },
          { label: "Cliente", value: row.cliente ?? "Sin propietario", wide: true },
          { label: "KM actual", value: row.kilometraje != null ? `${row.kilometraje.toLocaleString("es-AR")} km` : "—" },
          { label: "Último service", value: row.kmUltimoService != null ? `${row.kmUltimoService.toLocaleString("es-AR")} km` : "Sin registro" },
          { label: "Próximo service", value: <>{row.proximKm != null ? `${row.proximKm.toLocaleString("es-AR")} km` : "Sin referencia"}{row.proximaFecha && <small>{date(row.proximaFecha)}</small>}{!row.sinReferencia && !row.atrasadoKm && row.kmFaltan != null && <small>Faltan {row.kmFaltan.toLocaleString("es-AR")} km</small>}</> },
          { label: "Estado", value: <StatusBadge status={stateFor(row)} /> },
        ], actions: <button type="button" className="text-button" onClick={() => onOpenMoto(row.motoId)}>Abrir perfil</button>,
      }))} /> : <EmptyState title="No hay services para mostrar" body="Probá con otra búsqueda o cambiá el estado seleccionado." />}
    </AviantoPanel>
  </AviantoPage>;
}
