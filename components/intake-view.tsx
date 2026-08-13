"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Plus, Search } from "lucide-react";
import { api } from "../lib/api";
import { integerInput, parseIntegerInput } from "../lib/format";
import type { AutocompleteResponse, ClienteResponse, MarcaMotoResponse, PageResponse, PerfilResponse } from "../lib/types";
import { AbmFormModal } from "./modal/abm-form-modal";
import { AutocompleteField, Dialog, SelectField, StatusBadge, type Notify } from "./ui";

const loadClientOptions = (query: string) =>
  api<AutocompleteResponse[]>("/clientes/autocomplete", {}, { q: query });

export function IntakeView({ open, initialPlate, onClose, onOpenProfile, notify }: { open: boolean; initialPlate?: string; onClose: () => void; onOpenProfile: (id: string) => void; notify: Notify }) {
  const [plate, setPlate] = useState(initialPlate ?? "");
  const [searched, setSearched] = useState(false);
  const [profile, setProfile] = useState<PerfilResponse | null>(null);
  const [brands, setBrands] = useState<MarcaMotoResponse[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [clientQuery, setClientQuery] = useState("");
  const [selectedClient, setSelectedClient] = useState<AutocompleteResponse | null>(null);
  const [section, setSection] = useState<"TALLER" | "VENTA">("TALLER");
  const [newClientOpen, setNewClientOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [brandsError, setBrandsError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let active = true;
    void api<MarcaMotoResponse[]>("/configuracion/marcas-moto")
      .then((nextBrands) => { if (active) { setBrands(nextBrands.filter((item) => item.activo)); setBrandsError(null); } })
      .catch((reason) => { if (active) { const message = reason instanceof Error ? reason.message : "No se pudieron cargar las marcas."; setBrandsError(message); notify(message, "error"); } });
    return () => { active = false; };
  }, [open, notify]);

  const search = async () => {
    const normalized = plate.replace(/[^a-z0-9]/gi, "").toUpperCase();
    if (!normalized) return notify("Ingresá el dominio de la moto.", "error");
    setBusy(true); setSearched(true); setProfile(null);
    try {
      const result = await api<PageResponse<PerfilResponse>>("/perfiles", {}, { q: normalized, size: 100 });
      const existing = result.content.find((item) => item.patente.replace(/[^a-z0-9]/gi, "").toUpperCase() === normalized);
      if (existing) { setProfile(existing); setValues({ patente: existing.patente }); }
      else setValues((current) => ({ ...current, patente: normalized }));
    } catch (reason) { notify(reason instanceof Error ? reason.message : "No se pudo buscar el dominio.", "error"); }
    finally { setBusy(false); }
  };
  const set = (key: string, value: string) => setValues((current) => ({ ...current, [key]: value }));
  const chooseClient = (client: AutocompleteResponse) => {
    setSelectedClient(client);
    setClientQuery(client.label);
    set("clienteId", client.id);
  };
  const clearClient = () => {
    setSelectedClient(null);
    set("clienteId", "");
  };
  const submit = async () => {
    if (profile?.ingresada) return notify("La moto ya está ingresada.", "error");
    if (!profile && (!values.marcaId || !values.modelo)) return notify("Completá marca y modelo para crear el perfil.", "error");
    if (!profile && !selectedClient) return notify("Buscá y seleccioná un cliente antes de crear el perfil.", "error");
    setBusy(true);
    try {
      const current = profile ?? await api<PerfilResponse>("/perfiles", { method: "POST", body: JSON.stringify({ ...values, anio: values.anio ? parseIntegerInput(values.anio) : null, kilometraje: values.kilometraje ? parseIntegerInput(values.kilometraje) : null }) });
      const next = await api<PerfilResponse>(`/motovehiculos/${current.id}/ingreso`, { method: "POST", body: JSON.stringify({ seccion: section }) });
      notify(`Moto ingresada en ${section === "TALLER" ? "Taller" : "Ventas"}.`);
      onOpenProfile(next.id);
    } catch (reason) { notify(reason instanceof Error ? reason.message : "No se pudo ingresar la moto.", "error"); }
    finally { setBusy(false); }
  };
  const loadingBrands = open && !brands.length && !brandsError;
  const brandOptions = brands.length
    ? brands.map((brand) => ({ value: brand.id, label: brand.nombre }))
    : [{ value: "__brands-empty", label: loadingBrands ? "Cargando marcas..." : "No hay marcas disponibles", disabled: true }];
  const dirty = searched || Object.keys(values).length > 0 || section !== "TALLER";
  return <Dialog open={open} title="Ingresar una moto" onClose={onClose} wide className="intake-modal" dirty={dirty}>
     <p>Buscá la moto y elegí el destino operativo antes de abrir su perfil.</p>
      <section className="panel intake-card">
        <div className="intake-field">
          <label htmlFor="intake-plate">Dominio</label>
          <div className="plate-search">
            <input id="intake-plate" value={plate} onChange={(event) => { setPlate(event.target.value); setSearched(false); setProfile(null); setValues({}); setClientQuery(""); setSelectedClient(null); }} placeholder="Ej.: AB 123 CD" autoComplete="off" onKeyDown={(event) => { if (event.key === "Enter") void search(); }} />
            <button type="button" className="button secondary" disabled={busy} onClick={() => void search()}><Search size={17} />Buscar</button>
          </div>
        </div>
        {searched && profile && <div className="intake-found"><div><strong>{profile.patente}</strong><span>{profile.marca} {profile.modelo} · {profile.propietario ?? "Sin propietario"}</span></div><StatusBadge status={profile.estado} /></div>}
        {searched && !profile && <section className="intake-new-profile"><h3>Perfil nuevo</h3><div className="two-col"><SelectField label="Marca" value={values.marcaId ?? ""} onChange={(value) => set("marcaId", value)} placeholder="Seleccionar" options={brandOptions} required /><label className="intake-field">Modelo<input value={values.modelo ?? ""} onChange={(event) => set("modelo", event.target.value)} placeholder="Ej.: Wave 110, FZ 25..." autoComplete="off" required /></label><label className="intake-field">Año<input type="text" inputMode="numeric" value={integerInput(values.anio)} onChange={(event) => set("anio", event.target.value)} /></label><label className="intake-field">Kilometraje actual<input type="text" inputMode="numeric" value={integerInput(values.kilometraje)} onChange={(event) => set("kilometraje", event.target.value)} /></label><div className="intake-client-picker form-field-wide"><span>Cliente</span><AutocompleteField value={clientQuery} onChange={(value) => { setClientQuery(value); clearClient(); }} onSelect={chooseClient} onClear={clearClient} selected={selectedClient} loadOptions={loadClientOptions} minChars={2} placeholder="Nombre, apellido, DNI o teléfono" ariaLabel="Buscar cliente" emptyText="No encontramos clientes con esta búsqueda." emptyAction={<button type="button" className="autocomplete-empty-action" onClick={() => setNewClientOpen(true)}><Plus size={16} />Agregar cliente</button>} />{selectedClient ? <div className="intake-client-selection"><span>Cliente seleccionado</span><strong>{selectedClient.label}</strong>{selectedClient.secondary && <small>{selectedClient.secondary}</small>}</div> : <small>Escribí al menos dos caracteres y seleccioná un cliente existente.</small>}</div><label className="intake-field form-field-wide">Observaciones<textarea value={values.observaciones ?? ""} onChange={(event) => set("observaciones", event.target.value)} /></label></div></section>}
     </section>
     {searched && <section className="panel intake-destination"><h2>Destino de ingreso</h2><div className="intake-options"><button type="button" className={section === "TALLER" ? "selected" : ""} onClick={() => setSection("TALLER")}><strong>Taller</strong><span>Fichas de trabajo y pedidos de repuestos.</span></button><button type="button" className={section === "VENTA" ? "selected" : ""} onClick={() => setSection("VENTA")}><strong>Ventas</strong><span>Publicación y transferencia de la moto.</span></button></div><button className="button primary large" disabled={busy || Boolean(profile?.ingresada)} onClick={() => void submit()}><ArrowRight size={18} />{busy ? "Ingresando..." : "Ingresar y abrir perfil"}</button></section>}
       <AbmFormModal key={newClientOpen ? "new-client-open" : "new-client-closed"} open={newClientOpen} resource="cliente" mode="agregar" initialValues={{ nombre: clientQuery }} fields={[{ key: "nombre", label: "Nombre y apellido", required: true, wide: true }, { key: "telefono", label: "Teléfono", type: "tel", required: true }, { key: "documento", label: "DNI o CUIT" }]} onClose={() => setNewClientOpen(false)} onSubmit={async (clientValues) => { const client = await api<ClienteResponse>("/clientes", { method: "POST", body: JSON.stringify(clientValues) }); chooseClient({ id: client.id, label: client.nombre, secondary: client.documento ?? client.telefono }); setNewClientOpen(false); notify("Cliente creado y seleccionado."); }} onError={(message) => notify(message, "error")} />
   </Dialog>;
}
