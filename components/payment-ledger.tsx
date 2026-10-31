"use client";

import { useEffect, useState } from "react";
import { CircleDollarSign, Plus, X } from "lucide-react";
import { api } from "../lib/api";
import { parsePrice, paymentAmount, priceInput } from "../lib/format";
import { formatDateInAr, formatDateShortInAr, formatDateTimeInAr, todayInAr } from "../lib/dates";
import type { PagoResponse, PaymentMethod } from "../lib/types";
import { ConfirmModal, Dialog, SelectField, StatusBadge, type Notify } from "./ui";
import { AviantoPanel, AviantoPanelHeader } from "./avianto-layout";

const paymentMethods: PaymentMethod[] = ["Efectivo", "Transferencia", "Débito", "Crédito", "Mercado Pago", "Otro"];
const errorMessage = (reason: unknown) => reason instanceof Error ? reason.message : "No fue posible actualizar los pagos.";

export function PaymentLedger({
  resource,
  documentId,
  documentState,
  estadoPago,
  total,
  montoCobrado,
  saldoPendiente,
  onDocumentChange,
  notify,
  presentation = "default",
}: {
  resource: "fichas" | "repuestos";
  documentId: string;
  documentState: string;
  estadoPago: string;
  total: number;
  montoCobrado: number;
  saldoPendiente: number;
  onDocumentChange: () => Promise<void>;
  notify: Notify;
  presentation?: "default" | "ficha";
}) {
  const [payments, setPayments] = useState<PagoResponse[] | null>(null);
  const [historyError, setHistoryError] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(todayInAr());
  const [paymentMethod, setPaymentMethod] = useState<"" | PaymentMethod>("");
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [paymentToAnnul, setPaymentToAnnul] = useState<PagoResponse | null>(null);
  const [annulPickerOpen, setAnnulPickerOpen] = useState(false);
  const endpoint = `/${resource}/${documentId}/pagos`;
  const cancelled = documentState === "Cancelada" || documentState === "Cancelado";
  const settled = !cancelled && saldoPendiente <= 0;
  const canRegister = !cancelled && !settled;
  const registerLabel = cancelled ? "Documento cancelado" : settled ? "Saldo cubierto" : "Registrar pago";
  const activePayments = (payments ?? []).filter((payment) => !payment.anulado);
  const registerAction = <button type="button" className="button primary payment-register" disabled={!canRegister} onClick={() => { setIdempotencyKey(crypto.randomUUID()); setFormOpen(true); }}>{presentation === "ficha" ? <Plus size={18} aria-hidden="true" /> : <CircleDollarSign size={18} />}{registerLabel}</button>;
  const annulAction = <button type="button" className="button secondary payment-annul-open" disabled={!activePayments.length} onClick={() => setAnnulPickerOpen(true)}><X size={18} aria-hidden="true" />Anular pago</button>;

  const loadPayments = async () => {
    try {
      setPayments(await api<PagoResponse[]>(endpoint));
      setHistoryError(false);
    } catch (reason) {
      setHistoryError(true);
      notify(errorMessage(reason), "error");
    }
  };

  useEffect(() => {
    let active = true;
    void api<PagoResponse[]>(endpoint)
      .then((next) => { if (active) { setPayments(next); setHistoryError(false); } })
      .catch((reason) => { if (active) { setHistoryError(true); notify(errorMessage(reason), "error"); } });
    return () => { active = false; };
  }, [endpoint, notify]);

  const resetForm = () => {
    setFormOpen(false);
    setAmount("");
    setPaymentDate(todayInAr());
    setPaymentMethod("");
    setIdempotencyKey(null);
  };
  const closeForm = () => {
    if (!saving) resetForm();
  };
  const registerPayment = async () => {
    if (cancelled) {
      notify("El documento está cancelado y no admite nuevos pagos.", "error");
      resetForm();
      return;
    }
    const monto = parsePrice(amount);
    if (monto <= 0) {
      notify("Ingresá un monto mayor a cero.", "error");
      return;
    }
    setSaving(true);
    try {
      await api<PagoResponse>(endpoint, {
        method: "POST",
        body: JSON.stringify({ monto, fecha: paymentDate || undefined, medioPago: paymentMethod || undefined, idempotencyKey: idempotencyKey ?? crypto.randomUUID() }),
      });
      await Promise.all([loadPayments(), onDocumentChange()]);
      resetForm();
      notify(`Pago de ${paymentAmount(monto)} registrado.`);
    } catch (reason) {
      notify(errorMessage(reason), "error");
    } finally {
      setSaving(false);
    }
  };
  const annulPayment = async () => {
    if (!paymentToAnnul) return;
    try {
      await api(`${endpoint}/${paymentToAnnul.id}/anular`, { method: "POST" });
      await Promise.all([loadPayments(), onDocumentChange()]);
      notify("Pago anulado.");
      setPaymentToAnnul(null);
    } catch (reason) {
      notify(errorMessage(reason), "error");
      throw reason;
    }
  };

  return (
    <AviantoPanel variant="section" className={`payment-ledger${presentation === "ficha" ? " ficha-payment-ledger" : ""}`} aria-labelledby={`${resource}-${documentId}-payments`}>
      <AviantoPanelHeader headingId={`${resource}-${documentId}-payments`} title={presentation === "ficha" ? <>Pagos<span className="payment-state-note">Estado: <StatusBadge status={estadoPago} /></span></> : <>Pagos<StatusBadge status={estadoPago} /></>} actions={presentation === "ficha" ? undefined : registerAction} />
      <div className="avianto-panel-body">
      <div className={`payment-balance${saldoPendiente <= 0 ? " is-settled" : ""}`} aria-label="Balance de pagos del documento">
        <div><span>{presentation === "ficha" ? "Presupuesto total" : "Total"}</span><strong>{paymentAmount(total)}</strong></div>
        <div><span>{presentation === "ficha" ? "Pagado" : "Cobrado"}</span><strong>{paymentAmount(montoCobrado)}</strong></div>
        <div><span>{presentation === "ficha" ? "Pendiente" : "Saldo pendiente"}</span><strong>{paymentAmount(saldoPendiente)}</strong></div>
      </div>
      {cancelled ? <p className="payment-notice">Documento cancelado: no admite nuevos pagos.</p> : settled && <p className="payment-notice payment-settled">Saldo cubierto: no admite nuevos pagos.</p>}
      <div className="payment-history-head"><h3>Historial de pagos</h3><span>{payments ? `${payments.length} registro${payments.length === 1 ? "" : "s"}` : "Cargando..."}</span></div>
      {historyError ? <div className="payment-history-error" role="alert"><span>No se pudo cargar el historial.</span><button type="button" className="button secondary" onClick={() => void loadPayments()}>Reintentar</button></div> : payments === null ? <p className="payment-history-loading" role="status">Cargando pagos...</p> : payments.length ? (
        <ol className="payment-history">
          {payments.map((payment) => (
            <li key={payment.id} className={payment.anulado ? "is-annulled" : ""}>
              <div className="payment-history-copy">
                <strong>{paymentAmount(payment.monto)}</strong>
                <span>{presentation === "ficha" ? `${formatDateShortInAr(payment.fecha)} · ${payment.medioPago ?? "Sin medio"}` : `${formatDateInAr(payment.fecha)} · ${payment.medioPago ?? "Medio no informado"}`}</span>
                {payment.anulado && <small>Anulado{payment.anuladoAt ? ` el ${formatDateTimeInAr(payment.anuladoAt)}` : ""}</small>}
              </div>
              {payment.anulado ? <span className="payment-annulled">Anulado</span> : presentation !== "ficha" && <button type="button" className="button danger-outline payment-annul" onClick={() => setPaymentToAnnul(payment)}>Anular</button>}
            </li>
          ))}
        </ol>
      ) : <p className="payment-history-empty">Todavía no hay pagos registrados.</p>}
      {presentation === "ficha" && <div className="ficha-payment-actions">{registerAction}{annulAction}</div>}
      <Dialog open={annulPickerOpen} title="Anular pago" onClose={() => setAnnulPickerOpen(false)} className="payment-ledger-modal">
        <div className="payment-annul-picker">
          <p>Elegí el pago que querés anular. Seguirá visible en el historial y se recalculará el saldo.</p>
          <ul>
            {activePayments.map((payment) => <li key={payment.id}>
              <span>{formatDateShortInAr(payment.fecha)} · {payment.medioPago ?? "Sin medio"}<strong>{paymentAmount(payment.monto)}</strong></span>
              <button type="button" className="button danger-outline" onClick={() => { setAnnulPickerOpen(false); setPaymentToAnnul(payment); }}>Anular</button>
            </li>)}
          </ul>
          <div className="modal-actions"><button type="button" className="button secondary" onClick={() => setAnnulPickerOpen(false)}>Cancelar</button></div>
        </div>
      </Dialog>
      <Dialog open={formOpen && !cancelled} title="Registrar pago" onClose={closeForm} dirty={Boolean(amount || paymentDate !== todayInAr() || paymentMethod)} className="payment-ledger-modal">
        <form className="record-form payment-form" onSubmit={(event) => { event.preventDefault(); void registerPayment(); }}>
          <p>El importe se agregará al historial de este documento.</p>
          <div className="payment-form-grid">
            <label>Monto<input inputMode="decimal" value={priceInput(amount)} onChange={(event) => setAmount(event.target.value)} placeholder="0,00" autoComplete="off" required /></label>
            <label>Fecha<input type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} /></label>
            <SelectField label="Medio de pago (opcional)" value={paymentMethod} onChange={(value) => setPaymentMethod(value as "" | PaymentMethod)} placeholder="No especificado" options={paymentMethods.map((method) => ({ value: method, label: method }))} />
          </div>
          <div className="modal-actions"><button type="button" className="button secondary" disabled={saving} onClick={closeForm}>Cancelar</button><button className="button primary" disabled={saving}>{saving ? "Registrando..." : "Registrar pago"}</button></div>
        </form>
      </Dialog>
      <ConfirmModal open={paymentToAnnul !== null} title="Anular pago" body={`Vas a anular el pago de ${paymentAmount(paymentToAnnul?.monto ?? 0)}. El movimiento permanecerá visible en el historial y se recalculará el saldo.`} confirmLabel="Anular pago" onClose={() => setPaymentToAnnul(null)} onConfirm={annulPayment} className="payment-ledger-modal" />
      </div>
    </AviantoPanel>
  );
}
