import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { parsePrice, priceDraft, priceInput } from "../lib/format.ts";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request("http://localhost/", { headers: { accept: "text/html" } }), {
    ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
  }, { waitUntil() {}, passThroughOnException() {} });
}

test("server-renders motorcom landing metadata", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>motorcom \| Gestión de taller<\/title>/i);
  assert.match(html, /<meta[^>]+name="viewport"[^>]+content="width=device-width, initial-scale=1"[^>]*>/i);
  assert.doesNotMatch(html, /maximum-scale|user-scalable=no/i);
  assert.match(html, /Cada moto tiene una historia/);
  assert.match(html, /Conocer motorcom/);
  assert.doesNotMatch(html, /Your site is taking shape|codex-preview|SkeletonPreview/);
});

test("preserves large currency drafts until the field loses focus", () => {
  assert.equal(priceDraft(100000), "100000");
  assert.equal(priceInput("100000,50"), "100000,50");
  assert.equal(parsePrice(priceInput("100000,50")), 100000.5);
  assert.equal(priceInput(100000), "100.000");
});

test("keeps the application entrypoint, production scripts, and responsive operational controls", async () => {
  const [page, loginPage, layout, stylesheet, packageJson, controller, fichaForm, intakeView, ui, views, wiki, shell, budgetBreakdown, repuestosView, paymentLedger, types, apiContract] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/login/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../components/app-controller.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/ficha-form.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/intake-view.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/ui.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/views.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/wiki-view.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/app-shell.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/budget-breakdown.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/repuestos-view.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/payment-ledger.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/types.ts", import.meta.url), "utf8"),
    readFile(new URL("../docs/api-contract.md", import.meta.url), "utf8"),
  ]);
  assert.match(page, /LandingPage/);
  assert.match(loginPage, /AppController/);
  assert.match(layout, /AviantoSoftware/);
  assert.match(stylesheet, /\.order-form \.line-item \{[\s\S]*?grid-template-areas:[\s\S]*?"description price total status delete"[\s\S]*?"observation observation observation observation observation"/);
  assert.match(stylesheet, /@media \(max-width: 680px\) \{[\s\S]*?\.order-form \.line-item \{[\s\S]*?"description delete"[\s\S]*?"observation observation"/);
  assert.match(stylesheet, /@media \(max-width: 680px\) \{[\s\S]*?\.order-form input,[\s\S]*?\.order-form select,[\s\S]*?\.order-form textarea \{[\s\S]*?font-size: 16px;/);
  assert.match(packageJson, /"build"/);
  assert.match(controller, /perfiles|fichas|repuestos/);
  assert.match(fichaForm, /className="line-observation"[\s\S]*?<textarea[\s\S]*?observacionTrabajo/);
  assert.match(intakeView, /<AutocompleteField[\s\S]*?loadOptions=\{loadClientOptions\}[\s\S]*?minChars=\{2\}[\s\S]*?emptyAction=/);
  assert.match(intakeView, /"\/clientes\/autocomplete"/);
  assert.doesNotMatch(intakeView, /api<PageResponse<ClienteResponse>>\("\/clientes"/);
  assert.match(intakeView, /autoSearchedPlate\.current === initialPlate/);
  assert.match(stylesheet, /button\[aria-label\^="Ver perfil"\] \{\s*order: 1;/);
  assert.match(stylesheet, /button\[aria-label\^="Editar perfil"\] \{\s*order: 2;/);
  assert.match(stylesheet, /button\[aria-label\^="Eliminar perfil"\] \{\s*order: 3;/);
  assert.match(stylesheet, /button\[aria-label\^="Ingresar moto"\],[\s\S]*?order: 4;/);
  assert.match(ui, /emptyAction\?: ReactNode/);
  assert.match(views, /className="work-observation"/);
  assert.match(views, /className="line-items-list detail-work-list"/);
  assert.match(views, /detail-work-item\$\{workStateClass\(item\.estadoTrabajo\)\}\$\{!locked \? " can-mark" : ""\}\$\{canDelete \? " can-delete" : ""\}/);
  assert.match(views, /aria-label=\{`Marcar \$\{item\.descripcion\} como realizado`\}/);
  assert.match(views, /className="work-state-input"/);
  assert.match(fichaForm, /workStateClass\(trabajo\.estadoTrabajo, trabajo\.realizado\)/);
  assert.match(fichaForm, /className="work-state-label"/);
  assert.match(stylesheet, /\.detail-work-list \{[\s\S]*?gap: 0;[\s\S]*?overflow: hidden;[\s\S]*?border: 1px solid var\(--line\);/);
  assert.match(stylesheet, /\.detail-work-list > \.detail-work-item \+ \.detail-work-item \{[\s\S]*?border-top: 1px solid var\(--line\);/);
  assert.match(stylesheet, /\.detail-work-item\.can-mark\.can-delete \{[\s\S]*?grid-template-areas: "check content delete";/);
  assert.match(stylesheet, /\.work-state-box \{[\s\S]*?width: 20px;[\s\S]*?height: 20px;[\s\S]*?border: 2px solid var\(--red\);/);
  assert.match(stylesheet, /\.is-completed \.work-state-box \{[\s\S]*?background: var\(--green\);/);
  assert.match(stylesheet, /\.detail-work-item\.is-completed \{[\s\S]*?background: color-mix/);
  assert.match(views, /Ingresada Taller[\s\S]*?Sin ficha/);
  assert.match(views, /api<PageResponse<VentaFichaResponse>>\("\/ventas"/);
  assert.match(views, /\["Pendiente", "En proceso", "En revisión", "Terminada", "Entregada"\]/);
  assert.match(views, /\/fichas\/\$\{ficha\.id\}\/entregar/);
  assert.match(views, /Completá todos los trabajos pendientes antes de enviar la ficha a revisión/);
  assert.match(views, /saldoPendientePresupuesto > 0/);
  assert.match(views, /La moto se entregará con un saldo pendiente de/);
  assert.doesNotMatch(stylesheet, /\.ficha-summary\s*\{[^}]*max-height/);
  assert.match(views, /const estadoPagoPresupuesto: PagoStatus = montoCobradoPresupuesto <= 0 \? "No pagado" : saldoPendientePresupuesto <= 0 \? "Pagado" : "Parcial";/);
  assert.match(views, /className="summary-economic-status"[\s\S]*?Estado de pago[\s\S]*?Presupuesto total[\s\S]*?Monto pagado[\s\S]*?Saldo pendiente/);
  assert.match(stylesheet, /\.summary-economic-status \{[\s\S]*?border-top: 1px solid var\(--line\);[\s\S]*?border-bottom: 1px solid var\(--line\);/);
  assert.match(fichaForm, /<h2 className="form-section-title">Presupuesto<\/h2>/);
  assert.match(fichaForm, /const \[priceDrafts, setPriceDrafts\] = useState<Record<string, string>>\(\{\}\);/);
  assert.match(fichaForm, /onFocus=\{\(\) => setPriceDrafts/);
  assert.match(fichaForm, /onBlur=\{\(\) => setPriceDrafts/);
  assert.match(views, /<h3>Presupuesto<\/h3>/);
  assert.match(fichaForm, /Trabajos y servicios[\s\S]*?Repuestos y accesorios[\s\S]*?<BudgetBreakdown/);
  assert.match(budgetBreakdown, /Trabajos y servicios[\s\S]*?Repuestos y accesorios[\s\S]*?Subtotal[\s\S]*?IVA 21%[\s\S]*?Total presupuesto/);
  assert.match(stylesheet, /\.budget-breakdown \{[\s\S]*?margin-top: 18px;/);
  assert.match(stylesheet, /\.budget-total \{[\s\S]*?margin-top: 10px;/);
  assert.match(fichaForm, /\/fichas\/\$\{fichaKey\}\/repuestos/);
  assert.match(views, /\/fichas\/\$\{fichaKey\}\/repuestos/);
  assert.match(views, /Pedidos de repuestos y accesorios[\s\S]*?<BudgetBreakdown/);
  assert.match(views, /Enviar a revisión/);
  assert.match(views, /<\/ol>[\s\S]*?<PaymentLedger resource="fichas"[\s\S]*?<section className="detail-grid">/);
  assert.match(repuestosView, /className="detail-title"[\s\S]*?<PaymentLedger resource="repuestos"[\s\S]*?<section className="detail-grid">/);
  assert.doesNotMatch(views, /selectedPaidWorkIds|\/pago"/);
  assert.doesNotMatch(repuestosView, /selectedPaidItemIds|\/pago"/);
  assert.match(paymentLedger, /const endpoint = `\/\$\{resource\}\/\$\{documentId\}\/pagos`;/);
  assert.match(paymentLedger, /method: "POST"/);
  assert.match(paymentLedger, /\/anular/);
  assert.match(paymentLedger, /priceInput\(amount\)/);
  assert.match(paymentLedger, /parsePrice\(amount\)/);
  assert.match(paymentLedger, /paymentAmount\(total\)/);
  assert.match(paymentLedger, /Documento cancelado: no admite nuevos pagos/);
  assert.match(paymentLedger, /className="panel payment-ledger"/);
  assert.match(paymentLedger, /className="button primary payment-register"/);
  assert.match(paymentLedger, /Saldo cubierto: no admite nuevos pagos/);
  assert.match(paymentLedger, /title="Anular pago"/);
  assert.match(stylesheet, /\.payment-form-grid \{[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/);
  assert.match(stylesheet, /\.payment-balance \{[\s\S]*?grid-template-columns: repeat\(3, minmax\(0, 1fr\)\);/);
  assert.match(budgetBreakdown, /Cobrado \(ficha \+ repuestos\)[\s\S]*?Saldo pendiente \(ficha \+ repuestos\)/);
  assert.match(types, /montoCobrado: number;[\s\S]*?saldoPendiente: number;/);
  assert.match(types, /export interface PagoResponse \{[\s\S]*?medioPago\?: PaymentMethod \| null;[\s\S]*?anulado: boolean;/);
  assert.match(apiContract, /GET\/POST \/fichas\/\{id\}\/pagos/);
  assert.match(apiContract, /POST \/repuestos\/\{id\}\/pagos\/\{pagoId\}\/anular/);
  assert.match(views, /className="line-items-list revision-control-list"/);
  assert.match(views, /aria-label=\{`Marcar \$\{control\.control\} como revisado`\}/);
  assert.match(views, /observacion: control\.observacion \?\? ""/);
  assert.match(views, /Agregar observación/);
  assert.match(views, /title="Observación de revisión"/);
  assert.match(views, /if \(await updateControl\(revisionNoteControl\.id, \{ estado: revisionNoteControl\.estado, observacion: revisionNote \}\)\) setRevisionNoteControl\(null\);/);
  assert.match(stylesheet, /\.revision-control-list > \.revision-control \{[\s\S]*?grid-template-areas: "check content note";/);
  assert.match(stylesheet, /\.revision-check input \{[\s\S]*?width: 20px;[\s\S]*?height: 20px;/);
  assert.match(controller, /wiki:\s*"\/wiki"/);
  assert.match(shell, /id: "wiki", label: "Wiki"/);
  assert.match(wiki, /enviar manualmente la ficha a revisión/);
  assert.match(wiki, /observación opcional/);
  assert.match(wiki, /Disponible no significa en venta/);
  assert.match(wiki, /Transferencia en proceso/);
  assert.match(wiki, /Cada pago registra un importe exacto/);
  assert.match(wiki, /historiales de pago separados/);
});

test("keeps the sale ficha workflow, read-only transfer registry, and sale checklist contract wired to rendered routes", async () => {
  const [controller, sales, saleDetail, motoDetail, profiles, transfers, admin, intake, types, stylesheet, apiContract] = await Promise.all([
    readFile(new URL("../components/app-controller.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/views.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/venta-ficha-detail.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/moto-detail.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/profiles-view.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/transferencias-view.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/admin-view.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/intake-view.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/types.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../docs/api-contract.md", import.meta.url), "utf8"),
  ]);
  assert.match(controller, /segments\[0\] === "ventas" && segments\.length === 2/);
  assert.match(controller, /<VentaFichaDetail fichaKey=\{route\.saleId\}/);
  assert.match(sales, /api<PageResponse<VentaFichaResponse>>\("\/ventas"/);
  assert.match(sales, /Abrir ficha/);
  assert.doesNotMatch(sales, /venta\/completar/);
  assert.match(saleDetail, /Checklist de venta/);
  assert.match(saleDetail, /La plantilla de checklist está vacía\. Esta ficha no inventa documentos/);
  assert.match(saleDetail, /Comprador prospectivo/);
  assert.match(saleDetail, /\/ventas\/\$\{ficha\.id\}\/transferencia\/cita/);
  assert.match(saleDetail, /\/ventas\/\$\{ficha\.id\}\/transferencia\/cancelar/);
  assert.match(saleDetail, /item\.obligatorio \? checklistStates\.filter\(\(estado\) => estado !== "No aplica"\)/);
  assert.match(saleDetail, /\/ventas\/\$\{ficha\.id\}\/completar/);
  assert.match(motoDetail, /label: "Venta"/);
  assert.match(motoDetail, /Abrir ficha de venta/);
  assert.doesNotMatch(motoDetail, /venta\/completar/);
  assert.match(profiles, /Abrir ficha de venta/);
  assert.doesNotMatch(profiles, /venta\/completar/);
  assert.match(transfers, /Registro de solo lectura conectado a las fichas de venta/);
  assert.match(transfers, /fichaVentaId/);
  assert.match(transfers, /onOpenSale\(transfer\.fichaVentaId!\)/);
  assert.match(transfers, /canceladaAt \? "Cancelada"/);
  assert.doesNotMatch(transfers, /Nueva transferencia|Editar transferencia|Eliminar transferencia/);
  assert.match(admin, /Checklist de ventas/);
  assert.match(admin, /"\/configuracion\/ventas\/checklist"/);
  assert.match(intake, /Solo Administración puede ingresar una moto a Ventas/);
  assert.match(types, /export interface VentaFichaResponse/);
  assert.match(types, /export interface VentaTransferenciaResponse/);
  assert.match(types, /fichaVentaId\?: string \| null;/);
  assert.match(types, /canceladaAt\?: string \| null;/);
  assert.match(stylesheet, /\.sale-gates \{[\s\S]*?grid-template-columns: repeat\(4, minmax\(0, 1fr\)\);/);
  assert.match(stylesheet, /@media \(max-width: 680px\) \{[\s\S]*?\.sale-checklist-item \{[\s\S]*?grid-template-columns: 44px minmax\(0, 1fr\);/);
  assert.match(apiContract, /GET \/ventas/);
  assert.match(apiContract, /VentaFichaResponse/);
  assert.match(apiContract, /registro de solo lectura/i);
  assert.match(apiContract, /POST \/ventas\/\{id\}\/transferencia\/cancelar/);
});
