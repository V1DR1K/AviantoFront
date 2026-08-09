"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Save, X } from "lucide-react";
import { api } from "../lib/api";
import type { ClienteResponse, MarcaMotoResponse, PageResponse, PerfilResponse } from "../lib/types";
import { AbmFormModal } from "./modal/abm-form-modal";

const normalizedPlate = (value: string) => value.replace(/[^a-z0-9]/gi, "").toUpperCase();

export function ProfileForm({ onClose, onOpenProfile, onCreated }: { onClose: () => void; onOpenProfile: (id: string) => void; onCreated: (id: string) => void }) {
  const [plate, setPlate] = useState("");
  const [searched, setSearched] = useState(false);
  const [brands, setBrands] = useState<MarcaMotoResponse[]>([]);
  const [clients, setClients] = useState<ClienteResponse[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [clientQuery, setClientQuery] = useState("");
  const [clientOpen, setClientOpen] = useState(false);
  const [newClientOpen, setNewClientOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { void api<MarcaMotoResponse[]>("/configuracion/marcas-moto").then((items) => setBrands(items.filter((item) => item.activo))).catch((reason) => setError(reason instanceof Error ? reason.message : "No se pudieron cargar las marcas.")); }, []);
  useEffect(() => { void api<PageResponse<ClienteResponse>>("/clientes", {}, { activo: true, size: 100 }).then((page) => setClients(page.content)).catch((reason) => setError(reason instanceof Error ? reason.message : "No se pudieron cargar los clientes.")); }, []);
  const search = async () => {
    const patent = normalizedPlate(plate);
    if (!patent) return setError("Ingresá el dominio de la moto.");
    setBusy(true); setError(null);
    try {
      const result = await api<PageResponse<PerfilResponse>>("/perfiles", {}, { q: patent, size: 100 });
      const existing = result.content.find((item) => normalizedPlate(item.patente) === patent);
      if (existing) return onOpenProfile(existing.id);
      setValues((current) => ({ ...current, patente: patent }));
      setSearched(true);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "No se pudo buscar el dominio."); } finally { setBusy(false); }
  };
  const set = (key: string, value: string) => setValues((current) => ({ ...current, [key]: value }));
  const selectedClient = clients.find((client) => client.id === values.clienteId);
  const clientMatches = useMemo(() => {
    const query = clientQuery.trim().toLowerCase();
    return clients.filter((client) => !query || [client.nombre, client.telefono, client.documento, client.email].some((value) => value?.toLowerCase().includes(query))).slice(0, 10);
  }, [clientQuery, clients]);
  const chooseClient = (client: ClienteResponse) => { set("clienteId", client.id); setClientQuery(client.nombre); setClientOpen(false); };
  const submit = async () => {
    if (!values.marcaId || !values.modelo || !values.clienteId || !values.patente) return setError("Completá los datos de la moto y seleccioná un cliente.");
    setBusy(true); setError(null);
    try {
      const profile = await api<PerfilResponse>("/perfiles", { method: "POST", body: JSON.stringify({ ...values, anio: values.anio ? Number(values.anio) : null, kilometraje: values.kilometraje ? Number(values.kilometraje) : null }) });
      onCreated(profile.id);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "No se pudo crear el perfil."); } finally { setBusy(false); }
  };
  return <section className="order-form">
    <div className="page-heading"><div><h1>Nuevo perfil</h1><p>Buscá la moto por dominio. Si ya existe, se abrirá su Perfil.</p></div><button className="button secondary form-close" onClick={onClose}><X size={18} />Cerrar</button></div>
    {error && <p className="login-pending" role="alert">{error}</p>}
    <section className="form-section">
      <h2>Dominio</h2>
      <div className="plate-search"><input value={plate} onChange={(event) => { setPlate(event.target.value); setSearched(false); }} placeholder="Ej.: AB 123 CD" onKeyDown={(event) => { if (event.key === "Enter") void search(); }} /><button type="button" className="button secondary" disabled={busy} onClick={() => void search()}><Search size={17} />{busy ? "Buscando..." : "Buscar"}</button></div>
    </section>
    {searched && <div className="form-layout profile-form-layout"><div className="form-stack">
      <section className="form-section"><h2>Datos de la moto</h2><div className="two-col"><label>Marca<select value={values.marcaId ?? ""} onChange={(event) => set("marcaId", event.target.value)} required><option value="">Seleccionar</option>{brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.nombre}</option>)}</select></label><label>Modelo<input value={values.modelo ?? ""} onChange={(event) => set("modelo", event.target.value)} required /></label><label>Año<input type="number" min="1900" max="2100" value={values.anio ?? ""} onChange={(event) => set("anio", event.target.value)} /></label><label>Kilometraje actual<input type="number" min="0" value={values.kilometraje ?? ""} onChange={(event) => set("kilometraje", event.target.value)} /></label><label className="form-field-wide">Dominio<input value={values.patente ?? ""} readOnly /></label><label className="form-field-wide">Observaciones<textarea value={values.observaciones ?? ""} onChange={(event) => set("observaciones", event.target.value)} /></label></div></section>
      <section className="form-section"><div className="panel-head"><h2>Cliente</h2><button type="button" className="button secondary" onClick={() => setNewClientOpen(true)}><Plus size={17} />Agregar cliente</button></div><div className="client-picker"><span>Cliente actual</span><div className="autocomplete-field"><input value={selectedClient ? selectedClient.nombre : clientQuery} onFocus={() => setClientOpen(true)} onChange={(event) => { setClientQuery(event.target.value); set("clienteId", ""); setClientOpen(true); }} placeholder="Buscar por nombre, teléfono o documento" autoComplete="off" />{clientOpen && <div className="suggestions">{clientMatches.length ? clientMatches.map((client) => <button type="button" key={client.id} onClick={() => chooseClient(client)}><span>{client.nombre}</span><small>{client.telefono || client.documento || "Sin contacto"}</small></button>) : <p>Sin clientes coincidentes.</p>}</div>}</div></div></section>
    </div><aside className="summary"><h2>Nuevo Perfil</h2><div><span>Dominio</span><strong>{values.patente}</strong></div><div><span>Estado inicial</span><strong>Disponible</strong></div><button className="button primary large" disabled={busy} onClick={() => void submit()}><Save size={19} />{busy ? "Guardando..." : "Crear perfil"}</button></aside></div>}
    <AbmFormModal open={newClientOpen} resource="cliente" mode="agregar" fields={[{ key: "nombre", label: "Nombre y apellido", required: true, wide: true }, { key: "telefono", label: "Teléfono", type: "tel", required: true }, { key: "documento", label: "DNI o CUIT" }, { key: "email", label: "Email", type: "email" }, { key: "direccion", label: "Dirección", wide: true }, { key: "observaciones", label: "Observaciones", type: "textarea", wide: true }]} onClose={() => setNewClientOpen(false)} onSubmit={async (clientValues) => { const client = await api<ClienteResponse>("/clientes", { method: "POST", body: JSON.stringify(clientValues) }); setClients((all) => [...all, client]); chooseClient(client); setNewClientOpen(false); }} />
  </section>;
}
