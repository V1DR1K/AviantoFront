"use client";

import type { ReactNode } from "react";
import { money, paymentAmount } from "../lib/format";

export function BudgetBreakdown({
  subtotalTrabajos,
  totalRepuestos,
  descuentoGlobal,
  iva,
  totalPresupuesto,
  descuentoControl,
  montoCobradoPresupuesto,
  saldoPendientePresupuesto,
}: {
  subtotalTrabajos: number;
  totalRepuestos: number;
  descuentoGlobal: number;
  iva: number;
  totalPresupuesto: number;
  descuentoControl?: ReactNode;
  montoCobradoPresupuesto?: number;
  saldoPendientePresupuesto?: number;
}) {
  const subtotal = Math.max(0, subtotalTrabajos - descuentoGlobal) + totalRepuestos;
  return (
    <section className="budget-breakdown" aria-label="Totales del presupuesto">
      <div className="budget-breakdown-lines">
        <div className="budget-breakdown-row"><span>Trabajos y servicios</span><strong>{money(subtotalTrabajos)}</strong></div>
        <div className="budget-breakdown-row"><span>Repuestos y accesorios</span><strong>{money(totalRepuestos)}</strong></div>
        {descuentoControl ? <label className="budget-breakdown-row budget-discount"><span>Descuento global</span>{descuentoControl}</label> : descuentoGlobal > 0 && <div className="budget-breakdown-row budget-discount"><span>Descuento global</span><strong>-{money(descuentoGlobal)}</strong></div>}
        <div className="budget-breakdown-row budget-subtotal"><span>Subtotal</span><strong>{money(subtotal)}</strong></div>
        {iva > 0 && <div className="budget-breakdown-row"><span>IVA 21%</span><strong>{money(iva)}</strong></div>}
      </div>
      <div className="budget-total total"><span>Total presupuesto</span><strong>{money(totalPresupuesto)}</strong></div>
      {montoCobradoPresupuesto !== undefined && saldoPendientePresupuesto !== undefined && (
        <div className="budget-payment-balance" aria-label="Saldo combinado de ficha y repuestos">
          <div><span>Cobrado (ficha + repuestos)</span><strong>{paymentAmount(montoCobradoPresupuesto)}</strong></div>
          <div><span>Saldo pendiente (ficha + repuestos)</span><strong>{paymentAmount(saldoPendientePresupuesto)}</strong></div>
        </div>
      )}
    </section>
  );
}
