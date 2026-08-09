"use client";

import { useEffect, useState } from "react";
import { Search, Save, X } from "lucide-react";
import { api } from "../lib/api";
import type { MarcaMotoResponse, PageResponse, PerfilResponse } from "../lib/types";

const normalizedPlate = (value: string) => value.replace(/[^a-z0-9]/gi, "").toUpperCase();

export function ProfileForm({ onClose, onOpenProfile, onCreated }: { onClose: () => void; onOpenProfile: (id: string) => void; onCreated: (id: string) => void }) {
  const [plate, setPlate] = useState("");
  const [searched, setSearched] = useState(false);
  const [brands, setBrands] = useState<MarcaMotoResponse[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { void api<MarcaMotoResponse[]>("/configuracion/marcas-moto").then((items) => setBrands(items.filter((item) => item.activo))).catch((reason) => setError(reason instanceof Error ? reason.message : "No se pudieron cargar las marcas.")); }, []);
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
  const submit = async () => {
    if (!values.marcaId || !values.modelo || !values.clienteNombre || !values.clienteTelefono || !values.patente) return setError("Completá los datos de la moto y del cliente.");
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
    {searched && <div className="form-layout"><div className="form-stack">
      <section className="form-section"><h2>Datos de la moto</h2><div className="two-col"><label>Marca<select value={values.marcaId ?? ""} onChange={(event) => set("marcaId", event.target.value)} required><option value="">Seleccionar</option>{brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.nombre}</option>)}</select></label><label>Modelo<input value={values.modelo ?? ""} onChange={(event) => set("modelo", event.target.value)} required /></label><label>Año<input type="number" min="1900" max="2100" value={values.anio ?? ""} onChange={(event) => set("anio", event.target.value)} /></label><label>Kilometraje actual<input type="number" min="0" value={values.kilometraje ?? ""} onChange={(event) => set("kilometraje", event.target.value)} /></label><label className="form-field-wide">Dominio<input value={values.patente ?? ""} readOnly /></label><label className="form-field-wide">Observaciones<textarea value={values.observaciones ?? ""} onChange={(event) => set("observaciones", event.target.value)} /></label></div></section>
      <section className="form-section"><h2>Cliente</h2><div className="two-col"><label>Nombre y apellido<input value={values.clienteNombre ?? ""} onChange={(event) => set("clienteNombre", event.target.value)} required /></label><label>Teléfono<input type="tel" value={values.clienteTelefono ?? ""} onChange={(event) => set("clienteTelefono", event.target.value)} required /></label></div></section>
    </div><aside className="summary"><h2>Nuevo Perfil</h2><div><span>Dominio</span><strong>{values.patente}</strong></div><div><span>Estado inicial</span><strong>Disponible</strong></div><button className="button primary large" disabled={busy} onClick={() => void submit()}><Save size={19} />{busy ? "Guardando..." : "Crear perfil"}</button></aside></div>}
  </section>;
}
