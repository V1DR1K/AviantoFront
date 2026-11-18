"use client";

import type { ReactNode } from "react";
import { paymentAmount } from "../lib/format";

export function BudgetBreakdown({
  subtotalTrabajos,
  totalRepuestos,
  descuentoGlobal,
  iva,
  totalPresupuesto,
  descuentoControl,
  montoCobradoPresupuesto,
  saldoPendientePresupuesto,
  showTotal = true,
  showPaymentBalance = true,
}: {
  subtotalTrabajos: number;
  totalRepuestos: number;
  descuentoGlobal: number;
  iva: number;
  totalPresupuesto: number;
  descuentoControl?: ReactNode;
  montoCobradoPresupuesto?: number;
  saldoPendientePresupuesto?: number;
  showTotal?: boolean;
  showPaymentBalance?: boolean;
}) {
  const subtotal = Math.max(0, subtotalTrabajos - descuentoGlobal) + totalRepuestos;
  return (
    <section className="budget-breakdown" aria-label="Totales del presupuesto">
      <div className="budget-breakdown-lines">
        <div className="budget-breakdown-row"><span>Trabajos y servicios</span><strong>{paymentAmount(subtotalTrabajos)}</strong></div>
        <div className="budget-breakdown-row"><span>Repuestos y accesorios</span><strong>{paymentAmount(totalRepuestos)}</strong></div>
        {descuentoControl ? <label className="budget-breakdown-row budget-discount"><span>Descuento global</span>{descuentoControl}</label> : descuentoGlobal > 0 && <div className="budget-breakdown-row budget-discount"><span>Descuento global</span><strong>-{paymentAmount(descuentoGlobal)}</strong></div>}
        <div className="budget-breakdown-row budget-subtotal"><span>Subtotal</span><strong>{paymentAmount(subtotal)}</strong></div>
        {iva > 0 && <div className="budget-breakdown-row"><span>IVA 21%</span><strong>{paymentAmount(iva)}</strong></div>}
      </div>
      {showTotal && <div className="budget-total total"><span>Total presupuesto</span><strong>{paymentAmount(totalPresupuesto)}</strong></div>}
      {showPaymentBalance && montoCobradoPresupuesto !== undefined && saldoPendientePresupuesto !== undefined && (
        <div className="budget-payment-balance" aria-label="Saldo combinado de ficha y repuestos">
          <div><span>Cobrado (ficha + repuestos)</span><strong>{paymentAmount(montoCobradoPresupuesto)}</strong></div>
          <div><span>Saldo pendiente (ficha + repuestos)</span><strong>{paymentAmount(saldoPendientePresupuesto)}</strong></div>
        </div>
      )}
    </section>
  );
}
