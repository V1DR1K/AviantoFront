"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { api } from "../lib/api";
import { parsePrice, paymentAmount, priceInput } from "../lib/format";
import { formatDateInAr, formatDateTimeInAr, todayInAr } from "../lib/dates";
import type { PagoResponse, PaymentMethod } from "../lib/types";
import { ConfirmModal, Dialog, SelectField, StatusBadge, type Notify } from "./ui";

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
}) {
  const [payments, setPayments] = useState<PagoResponse[] | null>(null);
  const [historyError, setHistoryError] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(todayInAr());
  const [paymentMethod, setPaymentMethod] = useState<"" | PaymentMethod>("");
  const [saving, setSaving] = useState(false);
  const [paymentToAnnul, setPaymentToAnnul] = useState<PagoResponse | null>(null);
  const endpoint = `/${resource}/${documentId}/pagos`;
  const cancelled = documentState === "Cancelada" || documentState === "Cancelado";

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
        body: JSON.stringify({ monto, fecha: paymentDate || undefined, medioPago: paymentMethod || undefined }),
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
    <section className="payment-ledger" aria-labelledby={`${resource}-${documentId}-payments`}>
      <div className="payment-ledger-head">
        <div><h4 id={`${resource}-${documentId}-payments`}>Pagos</h4><StatusBadge status={estadoPago} /></div>
        <button type="button" className="button secondary payment-register" disabled={cancelled} onClick={() => setFormOpen(true)}><Plus size={16} />Registrar pago</button>
      </div>
      <div className="payment-balance" aria-label="Balance de pagos del documento">
        <div><span>Total</span><strong>{paymentAmount(total)}</strong></div>
        <div><span>Cobrado</span><strong>{paymentAmount(montoCobrado)}</strong></div>
        <div><span>Saldo pendiente</span><strong>{paymentAmount(saldoPendiente)}</strong></div>
      </div>
      {cancelled && <p className="payment-notice">Documento cancelado: no admite nuevos pagos.</p>}
      <div className="payment-history-head"><h5>Historial</h5><span>{payments ? `${payments.length} registro${payments.length === 1 ? "" : "s"}` : "Cargando..."}</span></div>
      {historyError ? <div className="payment-history-error" role="alert"><span>No se pudo cargar el historial.</span><button type="button" className="button secondary" onClick={() => void loadPayments()}>Reintentar</button></div> : payments === null ? <p className="payment-history-loading" role="status">Cargando pagos...</p> : payments.length ? (
        <ol className="payment-history">
          {payments.map((payment) => (
            <li key={payment.id} className={payment.anulado ? "is-annulled" : ""}>
              <div className="payment-history-copy">
                <strong>{paymentAmount(payment.monto)}</strong>
                <span>{formatDateInAr(payment.fecha)} · {payment.medioPago ?? "Medio no informado"}</span>
                {payment.anulado && <small>Anulado{payment.anuladoAt ? ` el ${formatDateTimeInAr(payment.anuladoAt)}` : ""}</small>}
              </div>
              {payment.anulado ? <span className="payment-annulled">Anulado</span> : <button type="button" className="button danger-outline payment-annul" onClick={() => setPaymentToAnnul(payment)}>Anular</button>}
            </li>
          ))}
        </ol>
      ) : <p className="payment-history-empty">Todavía no hay pagos registrados.</p>}
      <Dialog open={formOpen && !cancelled} title="Registrar pago" onClose={closeForm} dirty={Boolean(amount || paymentDate !== todayInAr() || paymentMethod)}>
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
      <ConfirmModal open={paymentToAnnul !== null} title="Anular pago" body={`Vas a anular el pago de ${paymentAmount(paymentToAnnul?.monto ?? 0)}. El movimiento permanecerá visible en el historial y se recalculará el saldo.`} confirmLabel="Anular pago" onClose={() => setPaymentToAnnul(null)} onConfirm={annulPayment} />
    </section>
  );
}
