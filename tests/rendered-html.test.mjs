import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

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

test("keeps the application entrypoint, production scripts, and responsive operational controls", async () => {
  const [page, loginPage, layout, stylesheet, packageJson, controller, fichaForm, intakeView, ui, views, wiki, shell] = await Promise.all([
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
  assert.match(views, /detail-work-item\$\{!locked \? " can-mark" : ""\}\$\{canDelete \? " can-delete" : ""\}/);
  assert.match(views, /aria-label=\{`Marcar \$\{item\.descripcion\} como realizado`\}/);
  assert.match(stylesheet, /\.detail-work-list \{[\s\S]*?gap: 0;[\s\S]*?overflow: hidden;[\s\S]*?border: 1px solid var\(--line\);/);
  assert.match(stylesheet, /\.detail-work-list > \.detail-work-item \+ \.detail-work-item \{[\s\S]*?border-top: 1px solid var\(--line\);/);
  assert.match(stylesheet, /\.detail-work-item\.can-mark\.can-delete \{[\s\S]*?grid-template-areas: "check content delete";/);
  assert.match(stylesheet, /\.detail-work-item \.detail-line-check input \{[\s\S]*?width: 20px;[\s\S]*?height: 20px;/);
  assert.match(views, /Ingresada Taller[\s\S]*?Sin ficha/);
  assert.match(views, /return !ingreso \|\|/);
  assert.match(views, /\["Pendiente", "En proceso", "En revisión", "Terminada", "Entregada"\]/);
  assert.match(views, /\/fichas\/\$\{ficha\.id\}\/entregar/);
  assert.match(fichaForm, /Trabajos y servicios[\s\S]*?Pedidos vinculados[\s\S]*?Total presupuesto/);
  assert.match(fichaForm, /\/fichas\/\$\{fichaKey\}\/repuestos/);
  assert.match(views, /\/fichas\/\$\{fichaKey\}\/repuestos/);
  assert.match(views, /Pedidos de repuestos y accesorios[\s\S]*?Total presupuesto/);
  assert.match(views, /Enviar a revisión/);
  assert.match(controller, /wiki:\s*"\/wiki"/);
  assert.match(shell, /id: "wiki", label: "Wiki"/);
  assert.match(wiki, /enviar manualmente la ficha a revisión/);
  assert.match(wiki, /Disponible no significa en venta/);
  assert.match(wiki, /Transferencia en proceso/);
});
