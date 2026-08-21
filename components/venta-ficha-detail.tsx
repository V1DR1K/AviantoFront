"use client";

import { useEffect, useState } from "react";
import { ArrowRightLeft, CalendarClock, Check, ClipboardCheck, UserRound } from "lucide-react";
import { api } from "../lib/api";
import { formatDateInAr, todayInAr } from "../lib/dates";
import type { AutocompleteResponse, VentaChecklistItemState, VentaFichaResponse } from "../lib/types";
import { AutocompleteField, ConfirmModal, Dialog, EmptyState, SelectField, StatusBadge, type Notify } from "./ui";

const errorMessage = (reason: unknown) => reason instanceof Error ? reason.message : "No fue posible actualizar la ficha de venta.";
const checklistStates: VentaChecklistItemState[] = ["Pendiente", "Realizado", "No aplica"];

const appointmentDate = (value?: string | null) => value ? formatDateInAr(value) : "Sin fecha";
const appointmentTime = (value?: string | null) => value ? value.slice(0, 5) : "Sin horario";
const loadClientOptions = (query: string) => api<AutocompleteResponse[]>("/clientes/autocomplete", {}, { q: query });

export function VentaFichaDetail({
  fichaKey,
  onBack,
  onOpenMoto,
  canAdmin,
  notify,
}: {
  fichaKey: string;
  onBack: () => void;
  onOpenMoto: (id: string) => void;
  canAdmin: boolean;
  notify: Notify;
}) {
  const [ficha, setFicha] = useState<VentaFichaResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [buyerQuery, setBuyerQuery] = useState("");
  const [selectedBuyer, setSelectedBuyer] = useState<AutocompleteResponse | null>(null);
  const [appointmentOpen, setAppointmentOpen] = useState(false);
  const [appointmentDateValue, setAppointmentDateValue] = useState(todayInAr());
  const [appointmentTimeValue, setAppointmentTimeValue] = useState("");
  const [appointmentPlace, setAppointmentPlace] = useState("");
  const [confirmation, setConfirmation] = useState<{
    title: string;
    body: string;
    confirmLabel: string;
    action: () => Promise<void>;
  } | null>(null);

  const load = async () => {
    try {
      const next = await api<VentaFichaResponse>(`/ventas/${fichaKey}`);
      setFicha(next);
      setError(null);
    } catch (reason) {
      setError(errorMessage(reason));
      notify(errorMessage(reason), "error");
    }
  };

  useEffect(() => {
    let active = true;
    void api<VentaFichaResponse>(`/ventas/${fichaKey}`)
      .then((next) => {
        if (active) {
          setFicha(next);
          setError(null);
        }
      })
      .catch((reason) => {
        if (active) {
          setError(errorMessage(reason));
          notify(errorMessage(reason), "error");
        }
      });
    return () => { active = false; };
  }, [fichaKey, notify]);

  const updateFicha = async (key: string, path: string, init: RequestInit, message: string) => {
    if (pending) return;
    setPending(key);
    try {
      const next = await api<VentaFichaResponse>(path, init);
      setFicha(next);
      setError(null);
      notify(message);
    } catch (reason) {
      setError(errorMessage(reason));
      notify(errorMessage(reason), "error");
      throw reason;
    } finally {
      setPending(null);
    }
  };

  if (!ficha) {
    return <div className="page"><button className="back" onClick={onBack}>← Volver a ventas</button>{error ? <EmptyState title="No se pudo cargar la ficha de venta" body="Revisá la notificación y volvé a intentar." action={<button className="button secondary" onClick={() => void load()}>Reintentar</button>} /> : <div className="table-loading" role="status">Cargando ficha de venta...</div>}</div>;
  }

  const sold = ficha.estado === "Vendida";
  const cancelled = ficha.estado === "Cancelada";
  const inTransfer = ficha.estado === "Transferencia en proceso";
  const requiredItems = ficha.items.filter((item) => item.obligatorio);
  const completedRequired = requiredItems.filter((item) => item.estado === "Realizado").length;
  const checklistReady = ficha.obligatoriosCompletos;
  const transfer = ficha.transferencia?.canceladaAt ? null : ficha.transferencia;
  const cancelledTransfer = ficha.transferencia?.canceladaAt ? ficha.transferencia : null;
  const appointmentReady = Boolean(transfer?.citaFecha && transfer.citaHora && transfer.citaLugar);
  const attendanceReady = Boolean(transfer?.asistenciaAt);
  const canStartTransfer = canAdmin && !sold && !cancelled && !transfer && Boolean(ficha.compradorId) && checklistReady;
  const steps = ["Carpeta", "Comprador", "Iniciar transferencia", "Turno / proceso"] as const;
  const currentStep = cancelled ? -1 : sold ? steps.length : transfer ? 3 : ficha.compradorId ? 2 : checklistReady ? 1 : 0;
  const confirmAttendance = () => {
    if (transfer?.citaFecha && transfer.citaHora && new Date(`${transfer.citaFecha}T${transfer.citaHora}`).getTime() > Date.now()) {
      notify("La asistencia se habilita cuando termine la cita programada.", "warning");
      return;
    }
    setConfirmation({ title: "Confirmar asistencia", body: "Confirmá la asistencia una vez finalizada la cita. No se puede registrar para una cita futura.", confirmLabel: "Confirmar asistencia", action: () => updateFicha("attendance", `/ventas/${ficha.id}/transferencia/asistencia`, { method: "POST" }, "Asistencia confirmada.") });
  };

  const saveBuyer = async () => {
    if (!selectedBuyer) {
      notify("Buscá y seleccioná un comprador prospectivo.", "warning");
      return;
    }
    await updateFicha("buyer", `/ventas/${ficha.id}/comprador`, { method: "PUT", body: JSON.stringify({ compradorId: selectedBuyer.id }) }, "Comprador prospectivo actualizado.");
    setBuyerQuery(selectedBuyer.label);
  };

  const openAppointment = () => {
    setAppointmentDateValue(transfer?.citaFecha ?? todayInAr());
    setAppointmentTimeValue(transfer?.citaHora?.slice(0, 5) ?? "");
    setAppointmentPlace(transfer?.citaLugar ?? "");
    setAppointmentOpen(true);
  };

  const saveAppointment = async () => {
    if (!appointmentDateValue || !appointmentTimeValue || !appointmentPlace.trim()) {
      notify("Completá fecha, horario y lugar de la cita.", "warning");
      return;
    }
    await updateFicha("appointment", `/ventas/${ficha.id}/transferencia/cita`, {
      method: "PUT",
      body: JSON.stringify({ fecha: appointmentDateValue, hora: appointmentTimeValue, lugar: appointmentPlace.trim() }),
    }, transfer?.citaFecha ? "Cita de transferencia reprogramada." : "Cita de transferencia programada.");
    setAppointmentOpen(false);
  };

  return (
    <div className="page venta-ficha-page">
      <button className="back" onClick={onBack}>← Volver a ventas</button>
      <div className="detail-title venta-ficha-title">
        <div>
          <p>{ficha.numero}</p>
          <h1>{ficha.moto} · {ficha.patente}</h1>
          <span>Vendedor actual: {ficha.vendedor}</span>
        </div>
        <div className="detail-stack">
          <StatusBadge status={ficha.estado} />
          <button className="button secondary compact" onClick={() => onOpenMoto(ficha.motoId)}>Ver perfil de moto</button>
        </div>
      </div>

      <ol className="flow-steps sale-flow" aria-label="Etapas de la carpeta de transferencia">
        {steps.map((step, index) => <li key={step} className={`flow-step${index < currentStep ? " done" : ""}${index === currentStep ? " current" : ""}`}><span>{index < currentStep ? "✓" : index + 1}</span><strong>{step}</strong></li>)}
      </ol>

      <section className="sale-gates" aria-label="Estado de las etapas de la carpeta">
        <div className={checklistReady ? "is-ready" : ""}><ClipboardCheck size={17} aria-hidden="true" /><span>Carpeta</span><strong>{checklistReady ? "Completa" : "Incompleta"}</strong></div>
        <div className={ficha.compradorId ? "is-ready" : ""}><UserRound size={17} aria-hidden="true" /><span>Comprador</span><strong>{ficha.comprador ? "Seleccionado" : "Pendiente"}</strong></div>
        <div className={transfer ? "is-ready" : ""}><ArrowRightLeft size={17} aria-hidden="true" /><span>Iniciar transferencia</span><strong>{transfer ? "Iniciada" : "Pendiente"}</strong></div>
        <div className={sold ? "is-ready" : ""}><CalendarClock size={17} aria-hidden="true" /><span>Turno / proceso</span><strong>{sold ? "Finalizado" : transfer ? "En proceso" : "Pendiente"}</strong></div>
      </section>

      <section className="detail-grid venta-detail-grid">
        <div className="form-stack">
           {cancelled && <p className="form-notice sale-final-audit">Ficha cancelada{ficha.canceladaAt ? ` el ${appointmentDate(ficha.canceladaAt)}` : ""}{ficha.canceladaPor ? ` por ${ficha.canceladaPor}` : ""}. Motivo: {ficha.canceladaMotivo || "Sin detalle"}.</p>}
           <section className="panel sale-checklist-panel">
            <div className="panel-head">
              <div><h2>Carpeta de transferencia</h2><p>Documentación, papeles y requisitos obligatorios para avanzar con la transferencia.</p></div>
              <span className="sale-progress" aria-live="polite">{requiredItems.length ? `${completedRequired} de ${requiredItems.length} obligatorios` : "Sin ítems obligatorios"}</span>
            </div>
            {ficha.items.length ? <div className="sale-checklist" role="list" aria-label="Requisitos de la carpeta de transferencia">
              {ficha.items.map((item) => {
                 const editable = !sold && !cancelled && !inTransfer;
                const complete = item.estado === "Realizado";
                return <div className={`sale-checklist-item${complete ? " is-complete" : ""}`} key={item.id} role="listitem">
                  <label className="sale-check-toggle">
                    <input type="checkbox" checked={complete} disabled={!editable || Boolean(pending)} aria-label={`Marcar ${item.etiqueta} como realizado`} onChange={(event) => void updateFicha(`item-${item.id}`, `/ventas/${ficha.id}/items/${item.id}`, { method: "PATCH", body: JSON.stringify({ estado: event.target.checked ? "Realizado" : "Pendiente" }) }, "Carpeta de transferencia actualizada.")} />
                    <span aria-hidden="true"><Check size={14} strokeWidth={3} /></span>
                  </label>
                  <div className="sale-check-copy"><strong>{item.etiqueta}</strong><small>{item.obligatorio ? "Obligatorio" : "Opcional"}{item.realizadoPor ? ` · Realizado por ${item.realizadoPor}` : ""}</small></div>
                  <SelectField value={item.estado} onChange={(estado) => void updateFicha(`item-${item.id}`, `/ventas/${ficha.id}/items/${item.id}`, { method: "PATCH", body: JSON.stringify({ estado }) }, "Carpeta de transferencia actualizada.")} options={(item.obligatorio ? checklistStates.filter((estado) => estado !== "No aplica") : checklistStates).map((estado) => ({ value: estado, label: estado }))} ariaLabel={`Estado de ${item.etiqueta}`} disabled={!editable || Boolean(pending)} />
                </div>;
              })}
            </div> : <div className="sale-empty-checklist"><EmptyState title="Carpeta sin requisitos" body="No hay requisitos activos configurados. Administración puede agregarlos desde la sección Carpeta de transferencia." /></div>}
          </section>

          <section className="panel sale-transfer-panel">
            <div className="panel-head"><div><h2>Transferencia</h2><p>Una única transferencia pertenece a esta ficha de venta.</p></div>{transfer && <StatusBadge status={transfer.finalizadaAt ? "Finalizada" : "En proceso"} />}</div>
             {!transfer ? <div className="sale-transfer-waiting"><ArrowRightLeft size={22} aria-hidden="true" /><div><strong>{cancelledTransfer ? "Transferencia cancelada" : "Transferencia aún no iniciada"}</strong><p>{cancelledTransfer ? `Cancelada ${appointmentDate(cancelledTransfer.canceladaAt)}${cancelledTransfer.canceladaPor ? ` por ${cancelledTransfer.canceladaPor}` : ""}. Seleccioná un comprador para iniciar una nueva gestión.` : "Se habilita cuando haya comprador prospectivo y los ítems obligatorios estén realizados."}</p></div>{canAdmin && !cancelled && <button className="button primary" disabled={!canStartTransfer || Boolean(pending)} onClick={() => setConfirmation({ title: cancelledTransfer ? "Reiniciar transferencia" : "Iniciar transferencia", body: `La ficha ${ficha.numero} pasará a Transferencia en proceso. El vendedor seguirá siendo titular hasta completar la venta.`, confirmLabel: cancelledTransfer ? "Reiniciar transferencia" : "Iniciar transferencia", action: () => updateFicha("transfer", `/ventas/${ficha.id}/transferencia`, { method: "POST" }, cancelledTransfer ? "Transferencia reiniciada." : "Transferencia iniciada.") })}>{cancelledTransfer ? "Reiniciar transferencia" : "Iniciar transferencia"}</button>}</div> : <div className="sale-transfer-record">
              <div className="sale-transfer-facts"><div><span>Vendedor hasta finalizar</span><strong>{ficha.vendedor}</strong></div><div><span>{sold ? "Comprador final" : "Comprador prospectivo"}</span><strong>{ficha.comprador ?? "—"}</strong></div></div>
               <div className="sale-appointment"><div><span>Cita de transferencia</span><strong>{appointmentDate(transfer.citaFecha)} · {appointmentTime(transfer.citaHora)}</strong><small>{transfer.citaLugar || "Lugar pendiente"}</small></div>{canAdmin && !sold && !cancelled && !transfer.asistenciaAt && <button className="button secondary" disabled={Boolean(pending)} onClick={openAppointment}>{transfer.citaFecha ? "Reprogramar cita" : "Programar cita"}</button>}</div>
               <div className="sale-attendance"><div><span>Asistencia</span><strong>{transfer.asistenciaAt ? `Confirmada${transfer.asistenciaPor ? ` por ${transfer.asistenciaPor}` : ""}` : "Pendiente de confirmar"}</strong></div>{canAdmin && !sold && !cancelled && !transfer.asistenciaAt && <button className="button secondary" disabled={!appointmentReady || Boolean(pending)} onClick={confirmAttendance}>Confirmar asistencia</button>}{canAdmin && !sold && !cancelled && <button className="button danger" disabled={Boolean(pending)} onClick={() => setConfirmation({ title: "Cancelar transferencia", body: "La moto volverá a En venta. El comprador prospectivo y la cita quedarán liberados; la cancelación seguirá registrada en auditoría.", confirmLabel: "Cancelar transferencia", action: () => updateFicha("cancel-transfer", `/ventas/${ficha.id}/transferencia/cancelar`, { method: "POST" }, "Transferencia cancelada.") })}>Cancelar transferencia</button>}</div>
              {sold && <p className="sale-final-audit">Venta finalizada {ficha.finalizadaAt ? `el ${appointmentDate(ficha.finalizadaAt)}` : ""}{ficha.finalizadaPor ? ` por ${ficha.finalizadaPor}` : ""}.</p>}
            </div>}
          </section>
        </div>

        <aside className="summary sale-summary">
          <h3>Comprador y cierre</h3>
          <section className="sale-owner-summary"><span>Vendedor actual</span><strong>{ficha.vendedor}</strong><small>Conserva la titularidad hasta que la venta sea completada.</small></section>
          <section className="sale-buyer-summary">
             <span>{sold ? "Comprador final" : cancelled ? "Comprador registrado" : "Comprador prospectivo"}</span>
            <strong>{ficha.comprador ?? "Sin seleccionar"}</strong>
             {!sold && !cancelled && canAdmin && !transfer && <div className="sale-buyer-picker"><AutocompleteField value={buyerQuery} onChange={(value) => { setBuyerQuery(value); setSelectedBuyer(null); }} onSelect={(buyer) => { setSelectedBuyer(buyer); setBuyerQuery(buyer.label); }} onClear={() => setSelectedBuyer(null)} selected={selectedBuyer} loadOptions={loadClientOptions} minChars={2} placeholder="Buscar cliente" ariaLabel="Buscar comprador prospectivo" /><button className="button secondary" disabled={!selectedBuyer || Boolean(pending)} onClick={() => void saveBuyer()}>Guardar comprador</button></div>}
          </section>
            <section className="sale-finalization"><h4>Para completar la venta</h4><ul><li className={ficha.compradorId ? "complete" : ""}>Comprador seleccionado</li><li className={checklistReady ? "complete" : ""}>Carpeta completa</li><li className={appointmentReady ? "complete" : ""}>Turno con fecha, horario y lugar</li><li className={attendanceReady ? "complete" : ""}>Asistencia confirmada</li></ul>{canAdmin && !sold && !cancelled && <button className="button primary large" disabled={!inTransfer || !ficha.compradorId || !checklistReady || !appointmentReady || !attendanceReady || Boolean(pending)} onClick={() => setConfirmation({ title: "Completar venta", body: `La moto ${ficha.patente} pasará a Vendida y ${ficha.comprador ?? "el comprador"} será su nuevo titular. Esta acción queda auditada.`, confirmLabel: "Completar venta", action: () => updateFicha("complete", `/ventas/${ficha.id}/completar`, { method: "POST" }, "Venta completada.") })}>Completar venta</button>}</section>
        </aside>
      </section>

      <Dialog open={appointmentOpen} title={transfer?.citaFecha ? "Reprogramar cita de transferencia" : "Programar cita de transferencia"} onClose={() => setAppointmentOpen(false)} dirty={Boolean(appointmentTimeValue || appointmentPlace)}>
        <form className="record-form" onSubmit={(event) => { event.preventDefault(); void saveAppointment(); }}>
          <label>Fecha<input type="date" value={appointmentDateValue} onChange={(event) => setAppointmentDateValue(event.target.value)} required /></label>
          <label>Horario<input type="time" value={appointmentTimeValue} onChange={(event) => setAppointmentTimeValue(event.target.value)} required /></label>
          <label>Lugar<input value={appointmentPlace} maxLength={300} onChange={(event) => setAppointmentPlace(event.target.value)} placeholder="Ej.: Registro Seccional 1" required /></label>
          <div className="modal-actions"><button type="button" className="button secondary" onClick={() => setAppointmentOpen(false)} disabled={Boolean(pending)}>Cancelar</button><button className="button primary" disabled={Boolean(pending)}>{pending === "appointment" ? "Guardando..." : "Guardar cita"}</button></div>
        </form>
      </Dialog>
      <ConfirmModal open={confirmation !== null} title={confirmation?.title ?? ""} body={confirmation?.body ?? ""} confirmLabel={confirmation?.confirmLabel ?? "Confirmar"} variant="success" onClose={() => setConfirmation(null)} onConfirm={() => { const request = confirmation; setConfirmation(null); return request?.action(); }} />
    </div>
  );
}
