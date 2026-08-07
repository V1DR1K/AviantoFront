"use client";

import { useEffect, useState } from "react";
import { Eye, Plus } from "lucide-react";
import { api } from "../lib/api";
import { money } from "../lib/format";
import type {
  FichaResponse,
  MotovehiculoResponse,
  NextServiceResponse,
  PageResponse,
  RepuestoResponse,
  ServiceResponse,
} from "../lib/types";
import { Dialog, EmptyState, StatusBadge } from "./ui";

const date = (value?: string | null) => (value ? new Intl.DateTimeFormat("es-AR").format(new Date(value)) : "—");
const errorMessage = (reason: unknown) => reason instanceof Error ? reason.message : "No fue posible cargar la información.";

export function MotoDetail({
  id,
  onBack,
  onOpenFicha,
  onOpenRepuesto,
  notify,
}: {
  id: string;
  onBack: () => void;
  onOpenFicha: (ficha: FichaResponse) => void;
  onOpenRepuesto: (repuesto: RepuestoResponse) => void;
  notify: (message: string) => void;
}) {
  const [tab, setTab] = useState<"general" | "services" | "fichas" | "repuestos">("general");
  const [moto, setMoto] = useState<MotovehiculoResponse | null>(null);
  const [services, setServices] = useState<ServiceResponse[]>([]);
  const [nextService, setNextService] = useState<NextServiceResponse | null>(null);
  const [fichas, setFichas] = useState<FichaResponse[]>([]);
  const [repuestos, setRepuestos] = useState<RepuestoResponse[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [serviceOpen, setServiceOpen] = useState(false);
  const [serviceKm, setServiceKm] = useState("");
  const [serviceDate, setServiceDate] = useState("");
  const [serviceSaving, setServiceSaving] = useState(false);

  const load = () =>
    void api<MotovehiculoResponse>(`/motovehiculos/${id}`)
      .then((next) => { setMoto(next); })
      .catch((reason) => setError(errorMessage(reason)));
  useEffect(load, [id]);
  useEffect(() => {
    void api<ServiceResponse[]>(`/motovehiculos/${id}/services`).then(setServices).catch((reason) => setError(errorMessage(reason)));
    void api<NextServiceResponse[]>("/services/proximos").then((list) => setNextService(list.find((next) => next.motoId === id) ?? null)).catch(() => undefined);
    void api<PageResponse<FichaResponse>>("/fichas", {}, { motoId: id, size: 50 }).then((result) => setFichas(result.content)).catch(() => undefined);
    void api<PageResponse<RepuestoResponse>>("/repuestos", {}, { motoId: id, size: 50 }).then((result) => setRepuestos(result.content)).catch(() => undefined);
  }, [id]);

  const addService = async () => {
    if (!serviceKm) return setError("Ingresá el kilometraje del service.");
    if (serviceSaving) return;
    setServiceSaving(true);
    try {
      await api<ServiceResponse>(`/motovehiculos/${id}/services`, {
        method: "POST",
        body: JSON.stringify({ kilometraje: Number(serviceKm), fecha: serviceDate || null, observaciones: null }),
      });
      void api<ServiceResponse[]>(`/motovehiculos/${id}/services`).then(setServices);
      void api<MotovehiculoResponse>(`/motovehiculos/${id}`).then(setMoto);
      void api<NextServiceResponse[]>("/services/proximos").then((list) => setNextService(list.find((next) => next.motoId === id) ?? null));
      setServiceOpen(false);
      setServiceKm("");
      setServiceDate("");
      notify("Service registrado.");
    } catch (reason) { setError(errorMessage(reason)); } finally { setServiceSaving(false); }
  };

  if (error) return <div className="page"><button className="back" onClick={onBack}>← Volver</button><p className="login-pending">{error}</p></div>;
  if (!moto) return <div className="page">Cargando…</div>;

  const tabs: { id: typeof tab; label: string }[] = [
    { id: "general", label: "General" },
    { id: "services", label: "Service" },
    { id: "fichas", label: "Fichas" },
    { id: "repuestos", label: "Repuestos" },
  ];
  return (
    <div className="page">
      <button className="back" onClick={onBack}>← Volver a motos</button>
      <div className="detail-title">
        <div>
          <p>{moto.patente}</p>
          <h1>{moto.marca} {moto.modelo}</h1>
          <span>{moto.cliente} · KM {moto.kilometraje ?? "—"}</span>
        </div>
        <div className="detail-stack">
          <StatusBadge status={moto.estado} />
          <strong>{moto.anio ?? "—"}</strong>
        </div>
      </div>
      {nextService && (
        <section className="panel next-service">
          <h3>Próximo service</h3>
          <p>
            {nextService.sinReferencia
              ? "Sin configuración de service (periodos)."
              : nextService.atrasadoKm || nextService.atrasadoFecha
                ? <span className="text-danger">Atrasado — definí o ejecutá un service.</span>
                : `KM sugerido ${nextService.proximKm ?? "—"} · Fecha ${nextService.proximaFecha ? date(nextService.proximaFecha) : "—"}`}
          </p>
        </section>
      )}
      <nav className="tabs">
        {tabs.map((item) => (
          <button key={item.id} className={tab === item.id ? "active" : ""} onClick={() => setTab(item.id)}>{item.label}</button>
        ))}
      </nav>
      {tab === "general" && (
        <section className="panel form-stack">
          <div className="panel-head"><h2>Datos del vehículo</h2></div>
          <dl className="record-detail">
            <div><dt>Cliente</dt><dd>{moto.cliente}</dd></div>
            <div><dt>Marca / modelo</dt><dd>{moto.marca} {moto.modelo}</dd></div>
            <div><dt>Patente</dt><dd>{moto.patente}</dd></div>
            <div><dt>Año</dt><dd>{moto.anio ?? "—"}</dd></div>
            <div><dt>Kilometraje</dt><dd>{moto.kilometraje ?? "—"}</dd></div>
            <div><dt>Estado</dt><dd>{moto.estado}</dd></div>
            <div><dt>Último service KM</dt><dd>{moto.kmUltimoService ?? "—"}</dd></div>
            <div><dt>Último service fecha</dt><dd>{date(moto.fechaUltimoService)}</dd></div>
            <div><dt>Periodo KM</dt><dd>{moto.kmServicePeriodo ?? "—"} km</dd></div>
            <div><dt>Periodo meses</dt><dd>{moto.mesesServicePeriodo ?? "—"} meses</dd></div>
            <div><dt>Observaciones</dt><dd>{moto.observaciones || "—"}</dd></div>
          </dl>
        </section>
      )}
      {tab === "services" && (
        <section className="panel table-panel">
          <div className="panel-head">
            <h2>Services registrados</h2>
            <button className="button secondary" disabled={serviceSaving} onClick={() => setServiceOpen(true)}><Plus size={17} />Registrar service</button>
          </div>
          {services.length ? (
            <table>
              <thead><tr><th>Fecha</th><th>Kilometraje</th><th>Observaciones</th></tr></thead>
              <tbody>{services.map((service) => <tr key={service.id}><td data-label="Fecha">{date(service.fecha)}</td><td data-label="Kilometraje">{service.kilometraje}</td><td data-label="Observaciones">{service.observaciones || "—"}</td></tr>)}</tbody>
            </table>
          ) : <EmptyState title="Sin services" body="Registrá el primer service de la moto." />}
        </section>
      )}
      {tab === "fichas" && (
        <section className="panel table-panel">
          <div className="panel-head"><h2>Fichas de trabajo</h2></div>
          {fichas.length ? (
            <table>
              <thead><tr><th>Ficha</th><th>Estado</th><th>Pago</th><th>Total</th><th /></tr></thead>
              <tbody>{fichas.map((ficha) => <tr key={ficha.id}><td data-label="Ficha">{ficha.numero}</td><td data-label="Estado"><StatusBadge status={ficha.estado} /></td><td data-label="Pago">{ficha.estadoPago}</td><td data-label="Total">{money(ficha.total)}</td><td className="table-actions"><button onClick={() => onOpenFicha(ficha)} aria-label={`Ver ficha ${ficha.numero}`}><Eye size={17} /></button></td></tr>)}</tbody>
            </table>
          ) : <EmptyState title="Sin fichas" body="Esta moto todavía no tiene fichas de trabajo." />}
        </section>
      )}
      {tab === "repuestos" && (
        <section className="panel table-panel">
          <div className="panel-head"><h2>Pedidos de repuestos</h2></div>
          {repuestos.length ? (
            <table>
              <thead><tr><th>Pedido</th><th>Estado</th><th>Pago</th><th>Total</th><th /></tr></thead>
              <tbody>{repuestos.map((repuesto) => <tr key={repuesto.id}><td data-label="Pedido">{repuesto.numero}</td><td data-label="Estado"><StatusBadge status={repuesto.estado} /></td><td data-label="Pago">{repuesto.estadoPago}</td><td data-label="Total">{money(repuesto.total)}</td><td className="table-actions"><button onClick={() => onOpenRepuesto(repuesto)} aria-label={`Ver pedido ${repuesto.numero}`}><Eye size={17} /></button></td></tr>)}</tbody>
            </table>
          ) : <EmptyState title="Sin repuestos" body="Aún no hay pedidos de repuestos para esta moto." />}
        </section>
      )}
      <Dialog open={serviceOpen} title="Registrar service" onClose={() => setServiceOpen(false)}>
        <form className="record-form" onSubmit={(event) => { event.preventDefault(); void addService(); }}>
          <label>Kilometraje<input type="number" min="0" value={serviceKm} onChange={(event) => setServiceKm(event.target.value)} required /></label>
          <label>Fecha<input type="date" value={serviceDate} onChange={(event) => setServiceDate(event.target.value)} /></label>
          <div className="modal-actions"><button type="button" className="button secondary" onClick={() => setServiceOpen(false)}>Cancelar</button><button className="button primary" disabled={serviceSaving}>{serviceSaving ? "Guardando..." : "Guardar"}</button></div>
        </form>
      </Dialog>
    </div>
  );
}