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

test("keeps the application entrypoint, production scripts, and mobile ficha controls", async () => {
  const [page, loginPage, layout, stylesheet, packageJson, controller] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/login/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../components/app-controller.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(page, /LandingPage/);
  assert.match(loginPage, /AppController/);
  assert.match(layout, /AviantoSoftware/);
  assert.match(stylesheet, /@media \(max-width: 680px\) \{[\s\S]*?\.order-form input,[\s\S]*?\.order-form select,[\s\S]*?\.order-form textarea \{[\s\S]*?font-size: 16px;/);
  assert.match(packageJson, /"build"/);
  assert.match(controller, /perfiles|fichas|repuestos/);
});
