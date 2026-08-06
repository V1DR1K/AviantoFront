"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, Plus, Save, X } from "lucide-react";
import { api } from "../lib/api";
import { money, parsePrice, priceInput } from "../lib/format";
import type { CategoriaCatalogoResponse, ClienteResponse, ItemCatalogoResponse, MarcaMotoResponse, MotovehiculoResponse, PageResponse, PedidoItemRequest, PedidoResponse } from "../lib/types";
import { ConfirmModal } from "./ui";
import { AbmFormModal, VehicleAbmModal, type AbmField } from "./modal/abm-form-modal";

type Line = PedidoItemRequest & { key: string };
type PhotoDraft = { file: File; url: string };

const today = () => new Date().toISOString().slice(0, 10);
const readAsBase64 = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onerror = () => reject(new Error(`No se pudo leer ${file.name}.`));
  reader.onload = () => resolve(String(reader.result).split(",").at(-1) ?? "");
  reader.readAsDataURL(file);
});
const asWebp = async (file: File) => {
  const image = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  canvas.getContext("2d")?.drawImage(image, 0, 0);
  image.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.86));
  if (!blob) throw new Error(`No se pudo convertir ${file.name} a WebP.`);
  return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.webp`, { type: "image/webp" });
};

const catalogFields = (categories: CategoriaCatalogoResponse[]): AbmField[] => [
  { key: "tipo", label: "Tipo", type: "select", required: true, options: [{ value: "Pieza", label: "Pieza" }, { value: "Trabajo", label: "Trabajo" }] },
  { key: "descripcion", label: "Descripción estandarizada", required: true, wide: true },
  { key: "categoriaId", label: "Categoría", type: "select", required: true, options: categories.map((category) => ({ value: category.id, label: category.nombre })) },
  { key: "precioBase", label: "Precio base", type: "currency", required: true },
  { key: "observaciones", label: "Observaciones", type: "textarea", wide: true },
];

export function OrderForm({ onClose, onSave }: { onClose: () => void; onSave: (order: PedidoResponse) => void }) {
  const [clients, setClients] = useState<ClienteResponse[]>([]);
  const [vehicles, setVehicles] = useState<MotovehiculoResponse[]>([]);
  const [brands, setBrands] = useState<MarcaMotoResponse[]>([]);
  const [categories, setCategories] = useState<CategoriaCatalogoResponse[]>([]);
  const [catalog, setCatalog] = useState<ItemCatalogoResponse[]>([]);
  const [clientId, setClientId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [documento, setDocumento] = useState<"Presupuesto" | "Factura">("Presupuesto");
  const [vencimiento, setVencimiento] = useState(today());
  const [items, setItems] = useState<Line[]>([]);
  const [notes, setNotes] = useState("");
  const [query, setQuery] = useState("");
  const [photos, setPhotos] = useState<PhotoDraft[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [closeConfirmation, setCloseConfirmation] = useState(false);
  const [newVehicleOpen, setNewVehicleOpen] = useState(false);
  const [newCatalogOpen, setNewCatalogOpen] = useState(false);
  const photoInput = useRef<HTMLInputElement>(null);
  const photoUrls = useRef(new Set<string>());

  useEffect(() => () => photoUrls.current.forEach((url) => URL.revokeObjectURL(url)), []);
  useEffect(() => { void api<PageResponse<ClienteResponse>>("/clientes", {}, { activo: true, size: 100 }).then((page) => { setClients(page.content); setClientId(page.content[0]?.id ?? ""); }).catch((reason) => setError(reason instanceof Error ? reason.message : "No se pudieron cargar los datos.")); }, []);
  useEffect(() => { if (!clientId) return; void api<PageResponse<MotovehiculoResponse>>("/motovehiculos", {}, { clienteId, activo: true, size: 100 }).then((page) => { setVehicles(page.content); setVehicleId(page.content[0]?.id ?? ""); }).catch((reason) => setError(reason instanceof Error ? reason.message : "No se pudieron cargar las motos.")); }, [clientId]);
  useEffect(() => { if (!newVehicleOpen || brands.length) return; void api<MarcaMotoResponse[]>("/configuracion/marcas-moto").then((next) => setBrands(next.filter((brand) => brand.activo))).catch((reason) => setError(reason instanceof Error ? reason.message : "No se pudieron cargar las marcas.")); }, [newVehicleOpen, brands.length]);
  useEffect(() => { if (!newCatalogOpen || categories.length) return; void api<CategoriaCatalogoResponse[]>("/configuracion/categorias-catalogo").then((next) => setCategories(next.filter((category) => category.activo))).catch((reason) => setError(reason instanceof Error ? reason.message : "No se pudieron cargar las categorías.")); }, [newCatalogOpen, categories.length]);
  useEffect(() => { const timer = window.setTimeout(() => { void api<PageResponse<ItemCatalogoResponse>>("/catalogo-items", {}, { q: query || undefined, activo: true, size: 10 }).then((page) => setCatalog(page.content)).catch((reason) => setError(reason instanceof Error ? reason.message : "No se pudo consultar el catálogo.")); }, 200); return () => window.clearTimeout(timer); }, [query]);

  const currentVehicle = vehicles.find((vehicle) => vehicle.id === vehicleId);
  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.cantidad * item.precioUnitario - item.descuento, 0), [items]);
  const iva = documento === "Factura" ? subtotal * 0.21 : 0;
  const total = subtotal + iva;
  const hasDraftContent = items.length > 0 || Boolean(notes) || photos.length > 0;
  const addItem = (item: Pick<ItemCatalogoResponse, "id" | "descripcion" | "tipo" | "precioBase">) => { setItems((previous) => previous.some((line) => line.itemCatalogoId === item.id) ? previous : [...previous, { key: crypto.randomUUID(), itemCatalogoId: item.id, descripcion: item.descripcion, tipo: item.tipo, cantidad: 1, precioUnitario: item.precioBase, descuento: 0 }]); setQuery(""); };
  const updateLine = (key: string, changes: Partial<Line>) => setItems((all) => all.map((line) => line.key === key ? { ...line, ...changes } : line));
  const attachPhotos = async (files: File[]) => { try { const converted = await Promise.all(files.map(asWebp)); setPhotos((current) => [...current, ...converted.map((file) => { const url = URL.createObjectURL(file); photoUrls.current.add(url); return { file, url }; })]); } catch (reason) { setError(reason instanceof Error ? reason.message : "No se pudieron preparar las fotos."); } };
  const removePhoto = (url: string) => { URL.revokeObjectURL(url); photoUrls.current.delete(url); setPhotos((all) => all.filter((photo) => photo.url !== url)); };
  const save = async () => {
    if (!clientId || !vehicleId || !items.length) return setError("Seleccioná un cliente, una moto y al menos un ítem.");
    if (items.some((item) => !Number.isInteger(item.cantidad) || item.cantidad < 1)) return setError("La cantidad de cada ítem debe ser un número entero mayor a cero.");
    setSaving(true); setError(null);
    try {
      const order = await api<PedidoResponse>("/pedidos", { method: "POST", body: JSON.stringify({ clienteId, motovehiculoId: vehicleId, documento, vencimiento, observaciones: notes, descuentoGlobal: 0, iva: documento === "Factura", items: items.map(({ key, ...item }) => item) }) });
      await Promise.all(photos.map(async ({ file }) => api(`/pedidos/${order.id}/fotos`, { method: "POST", body: JSON.stringify({ filename: file.name, contentType: "image/webp", base64: await readAsBase64(file) }) })));
      onSave(photos.length ? await api<PedidoResponse>(`/pedidos/${order.id}`) : order);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "No fue posible guardar el pedido."); } finally { setSaving(false); }
  };
  return <section className="order-form">
    <div className="page-heading"><div><h1>Nuevo pedido</h1><p>Registrá el diagnóstico, los ítems y las condiciones del trabajo.</p></div><button className="button secondary form-close" onClick={() => hasDraftContent ? setCloseConfirmation(true) : onClose()}><X size={18} />Cerrar</button></div>
    {error && <p className="login-pending" role="alert">{error}</p>}
    <div className="form-layout"><div className="form-stack">
      <section className="form-section"><h2>1. Cliente y motovehículo</h2><div className="two-col"><label>Cliente<select value={clientId} onChange={(event) => setClientId(event.target.value)}><option value="">Seleccionar</option>{clients.map((client) => <option value={client.id} key={client.id}>{client.nombre} · {client.telefono}</option>)}</select></label><label>Moto<select value={vehicleId} onChange={(event) => setVehicleId(event.target.value)} disabled={!clientId}><option value="">Seleccionar</option>{vehicles.map((vehicle) => <option value={vehicle.id} key={vehicle.id}>{vehicle.marca} {vehicle.modelo} · {vehicle.patente}</option>)}</select></label><button className="button secondary add-vehicle" type="button" disabled={!clientId} onClick={() => setNewVehicleOpen(true)}><Plus size={17} /><span>Agregar moto</span></button></div></section>
      <section className="form-section"><h2>2. Ítems y reparación</h2><label className="catalog-search">Buscar en catálogo<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ej.: cambio de aceite" />{catalog.length > 0 && <div className="suggestions">{catalog.map((item) => <button key={item.id} type="button" onClick={() => addItem(item)}><span>{item.descripcion}</span><small>{item.tipo} · {money(item.precioBase)}</small></button>)}</div>}</label><div className="line-items">{items.map((item) => <div className="line-item" key={item.key}><div><strong>{item.descripcion}</strong><span>{item.tipo}</span></div><label>Cant.<input type="number" min="1" step="1" value={item.cantidad} onChange={(event) => updateLine(item.key, { cantidad: Number(event.target.value) })} /></label><label>Precio<input type="text" inputMode="decimal" value={priceInput(item.precioUnitario)} onChange={(event) => updateLine(item.key, { precioUnitario: parsePrice(event.target.value) })} /></label><strong>{money(item.cantidad * item.precioUnitario - item.descuento)}</strong><button type="button" aria-label={`Eliminar ${item.descripcion}`} onClick={() => setItems((all) => all.filter((line) => line.key !== item.key))}><X size={18} /></button></div>)}</div><button className="text-button" type="button" onClick={() => setNewCatalogOpen(true)}><Plus size={17} />Agregar ítem personalizado</button></section>
      <section className="form-section"><h2>3. Fotos y observaciones</h2><label>Observaciones<textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Describí la falla o las piezas detectadas." /></label><label>Vencimiento<input type="date" value={vencimiento} onChange={(event) => setVencimiento(event.target.value)} required /></label><input ref={photoInput} hidden type="file" accept="image/*" multiple onChange={(event) => void attachPhotos(Array.from(event.target.files ?? []))} /><button className="photo-button" type="button" onClick={() => photoInput.current?.click()}><Camera size={19} />Adjuntar fotos<small>Se convierten a WebP antes de guardar.</small></button>{photos.length > 0 && <div className="photo-previews">{photos.map((photo) => <figure key={photo.url}><img src={photo.url} alt="Vista previa de la foto adjunta" /><button type="button" onClick={() => removePhoto(photo.url)} aria-label="Quitar foto"><X size={16} /></button></figure>)}</div>}</section>
    </div><aside className="summary"><h2>Resumen del pedido</h2><div><span>Moto</span><strong>{currentVehicle ? `${currentVehicle.marca} ${currentVehicle.modelo}` : "Sin seleccionar"}</strong></div><div><span>Patente</span><strong>{currentVehicle?.patente ?? "—"}</strong></div><hr /><div><span>Subtotal</span><strong>{money(subtotal)}</strong></div><label className="document-type">Tipo de documento<select value={documento} onChange={(event) => setDocumento(event.target.value as typeof documento)}><option>Presupuesto</option><option>Factura</option></select></label><div><span>IVA {documento === "Factura" ? "21%" : "(no aplicado)"}</span><strong>{money(iva)}</strong></div><div className="total"><span>Total final</span><strong>{money(total)}</strong></div><button className="button primary large" disabled={saving} onClick={() => void save()}><Save size={19} />{saving ? "Guardando..." : "Guardar pedido"}</button></aside></div>
    <VehicleAbmModal open={newVehicleOpen} mode="agregar" clientId={clientId} clientName={clients.find((client) => client.id === clientId)?.nombre} brands={brands} clients={clients} onClose={() => setNewVehicleOpen(false)} onSubmit={async (values) => { try { const vehicle = await api<MotovehiculoResponse>("/motovehiculos", { method: "POST", body: JSON.stringify({ ...values, anio: values.anio ? Number(values.anio) : null, kilometraje: values.kilometraje ? Number(values.kilometraje) : null }) }); setVehicles((all) => [...all, vehicle]); setVehicleId(vehicle.id); setNewVehicleOpen(false); } catch (reason) { setError(reason instanceof Error ? reason.message : "No se pudo guardar la moto."); } }} />
    <AbmFormModal open={newCatalogOpen} resource="ítem" mode="agregar" fields={catalogFields(categories)} onClose={() => setNewCatalogOpen(false)} onSubmit={async (values) => { try { const item = await api<ItemCatalogoResponse>("/catalogo-items", { method: "POST", body: JSON.stringify({ ...values, precioBase: parsePrice(values.precioBase) }) }); addItem(item); setNewCatalogOpen(false); } catch (reason) { setError(reason instanceof Error ? reason.message : "No se pudo guardar el ítem."); } }} />
    <ConfirmModal open={closeConfirmation} title="¿Cerrar pedido?" body="Hay información cargada en este pedido. Si cerrás ahora, se descartará el borrador." confirmLabel="Sí, cerrar pedido" onClose={() => setCloseConfirmation(false)} onConfirm={onClose} />
  </section>;
}
