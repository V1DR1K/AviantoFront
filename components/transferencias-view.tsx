"use client";

import { useEffect, useState } from "react";
import { ArrowDownUp, Download, Eye, FileText, Filter } from "lucide-react";
import { api, download } from "../lib/api";
import type { PageResponse, TransferResponse } from "../lib/types";
import { EmptyState, FilterBar, Pagination, SearchBox, StatusBadge, type Notify } from "./ui";

const date = (value?: string | null) => value ? new Intl.DateTimeFormat("es-AR").format(new Date(value.includes("T") ? value : `${value}T12:00:00`)) : "—";
const errorMessage = (reason: unknown) => reason instanceof Error ? reason.message : "No fue posible cargar las transferencias.";

export function TransferenciasView({
  initialMotoId,
  onOpenMoto,
  onOpenSale,
  notify,
}: {
  initialMotoId?: string;
  onOpenMoto: (id: string) => void;
  onOpenSale: (id: string) => void;
  notify: Notify;
}) {
  const [query, setQuery] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [direction, setDirection] = useState<"ASC" | "DESC">("DESC");
  const [result, setResult] = useState<PageResponse<TransferResponse> | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!initialMotoId) {
      void api<PageResponse<TransferResponse>>("/transferencias", {}, {
        q: query || undefined,
        fechaDesde: desde || undefined,
        fechaHasta: hasta || undefined,
        sortBy: "fechaTransferencia",
        direction,
        page: page - 1,
        size: 20,
      }).then((next) => { setResult(next); setLoadError(null); }).catch((reason) => { const message = errorMessage(reason); setLoadError(message); notify(message, "error"); });
      return;
    }
    void api<TransferResponse[]>(`/motovehiculos/${initialMotoId}/transferencias`)
      .then((entries) => {
        const normalized = query.trim().toLowerCase();
        const filtered = entries.filter((entry) => {
          const matchesQuery = !normalized || `${entry.patente} ${entry.moto} ${entry.clienteAnterior} ${entry.clienteNuevo} ${entry.fichaVentaId ?? ""}`.toLowerCase().includes(normalized);
          const effectiveDate = entry.fechaTransferencia ?? entry.createdAt.slice(0, 10);
          return matchesQuery && (!desde || effectiveDate >= desde) && (!hasta || effectiveDate <= hasta);
        }).sort((left, right) => {
          const leftDate = left.fechaTransferencia ?? left.createdAt;
          const rightDate = right.fechaTransferencia ?? right.createdAt;
          return direction === "DESC" ? rightDate.localeCompare(leftDate) : leftDate.localeCompare(rightDate);
        });
        setResult({ content: filtered, page: 0, size: filtered.length || 20, totalElements: filtered.length, totalPages: 1, sortBy: "fechaTransferencia", direction }); setLoadError(null);
      })
      .catch((reason) => { const message = errorMessage(reason); setLoadError(message); notify(message, "error"); });
  }, [query, desde, hasta, direction, page, initialMotoId, notify, reloadKey]);

  const params = { q: query || undefined, fechaDesde: desde || undefined, fechaHasta: hasta || undefined, sortBy: "fechaTransferencia", direction };
  return <div className="page">
    <div className="page-heading"><div><h1>Transferencias</h1><p>Registro de solo lectura conectado a las fichas de venta.</p></div></div>
    <section className="panel table-panel">
      <FilterBar primary={<SearchBox value={query} onChange={(value) => { setQuery(value); setPage(1); }} placeholder="Patente, cliente o ficha" />} activeCount={(desde ? 1 : 0) + (hasta ? 1 : 0)}>
        <label><Filter size={16} aria-hidden="true" /><span className="date-label">Desde</span><input type="date" value={desde} onChange={(event) => { setDesde(event.target.value); setPage(1); }} /></label>
        <label><Filter size={16} aria-hidden="true" /><span className="date-label">Hasta</span><input type="date" value={hasta} onChange={(event) => { setHasta(event.target.value); setPage(1); }} /></label>
        <button className="button secondary" onClick={() => { setDirection((value) => value === "DESC" ? "ASC" : "DESC"); setPage(1); }} aria-label="Cambiar orden de transferencias"><ArrowDownUp size={16} />{direction === "DESC" ? "Más recientes" : "Más antiguas"}</button>
        {!initialMotoId && <button className="button secondary" onClick={() => void download("/transferencias/export.xlsx", "transferencias.xlsx", params).catch((reason) => notify(errorMessage(reason), "error"))}><Download size={17} />Exportar Excel</button>}
      </FilterBar>
      {result?.content.length ? <table><thead><tr><th>Ficha</th><th>Moto</th><th>Partes</th><th>Cita</th><th>Asistencia</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{result.content.map((transfer) => {
        const appointment = transfer.citaFecha ? `${date(transfer.citaFecha)} · ${transfer.citaHora?.slice(0, 5) ?? "—"}` : "Sin cita";
        const state = transfer.canceladaAt ? "Cancelada" : transfer.finalizadaAt ? "Finalizada" : transfer.fichaVentaId ? "En proceso" : "Histórica";
        return <tr key={transfer.id}><td data-label="Ficha">{transfer.fichaVentaId ? <strong>Venta vinculada</strong> : "Registro histórico"}<small>{transfer.finalizadaAt ? `Efectiva ${date(transfer.fechaTransferencia)}` : transfer.canceladaAt ? `Cancelada ${date(transfer.canceladaAt)}` : "Pendiente de finalización"}</small></td><td data-label="Moto"><strong>{transfer.patente}</strong><small>{transfer.moto}</small></td><td data-label="Partes">{transfer.clienteAnterior}<small>hacia {transfer.clienteNuevo}</small></td><td data-label="Cita">{appointment}<small>{transfer.citaLugar || "Lugar pendiente"}</small></td><td data-label="Asistencia">{transfer.asistenciaAt ? "Confirmada" : "Pendiente"}<small>{transfer.asistenciaPor ?? "—"}</small></td><td data-label="Estado"><StatusBadge status={state} /></td><td className="table-actions"><button onClick={() => onOpenMoto(transfer.motoId)} aria-label={`Ver moto ${transfer.patente}`}><Eye size={17} /></button>{transfer.fichaVentaId && <button onClick={() => onOpenSale(transfer.fichaVentaId!)} aria-label={`Abrir ficha de venta de ${transfer.patente}`}><FileText size={17} /></button>}</td></tr>;
      })}</tbody></table> : loadError ? <EmptyState title="No se pudieron cargar las transferencias" body={loadError} action={<button className="button secondary" onClick={() => setReloadKey((value) => value + 1)}>Reintentar</button>} /> : result ? <EmptyState title="No hay transferencias" body={initialMotoId ? "Esta moto no tiene transferencias registradas con los filtros seleccionados." : "No se encontraron transferencias con esos filtros."} /> : <div className="table-loading" role="status">Cargando transferencias...</div>}
      {!initialMotoId && <Pagination page={page} total={result?.totalPages || 1} onPage={setPage} />}
    </section>
  </div>;
}
