"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, Check, Plus, Save, X } from "lucide-react";
import { api, objectUrl } from "../lib/api";
import { integerInput, money, parseIntegerInput, parsePrice, priceDraft, priceInput } from "../lib/format";
import { todayInAr } from "../lib/dates";
import type {
  FichaRequest,
  FichaResponse,
  MotovehiculoResponse,
  PhotoResponse,
  RepuestoResponse,
  TrabajoCatalogoResponse,
} from "../lib/types";
import { ConfirmModal, StatusBadge, type Notify } from "./ui";
import { BudgetBreakdown } from "./budget-breakdown";

type Line = {
  key: string;
  id?: string;
  descripcion: string;
  precioUnitario: number;
  descuento: number;
  realizado: boolean;
  estadoTrabajo?: "Pendiente" | "Realizado" | "Cancelado";
  observacionTrabajo?: string;
  catalogo?: boolean;
};
type PhotoDraft = { file: File; url: string };

const today = todayInAr;
const workStateClass = (estado: Line["estadoTrabajo"], realizado: boolean) =>
  estado === "Cancelado" ? " is-cancelled" : estado === "Realizado" || realizado ? " is-completed" : " is-pending";
const readAsBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`No se pudo leer ${file.name}.`));
    reader.onload = () =>
      resolve(String(reader.result).split(",").at(-1) ?? "");
    reader.readAsDataURL(file);
  });
const asWebp = async (file: File) => {
  const image = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  canvas.getContext("2d")?.drawImage(image, 0, 0);
  image.close();
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", 0.86),
  );
  if (!blob) throw new Error(`No se pudo convertir ${file.name} a WebP.`);
  return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.webp`, {
    type: "image/webp",
  });
};

function ExistingPhoto({ photo }: { photo: PhotoResponse }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    let active = true;
    void objectUrl(photo.url)
      .then((next) => {
        if (active) setUrl(next);
      })
      .catch(() => undefined);
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [photo.id]);
  if (!url) return null;
  return (
    <a className="existing-photo" href={url} target="_blank" rel="noreferrer">
      <img src={url} alt={photo.filename} />
    </a>
  );
}

export function FichaForm({
  onClose,
  onSave,
  fichaKey,
  initialMotoId,
  notify,
}: {
  onClose: () => void;
  onSave: (ficha: FichaResponse) => void;
  fichaKey?: string | null;
  initialMotoId?: string | null;
  notify: Notify;
}) {
  const editing = Boolean(fichaKey);
  const [loadedEstado, setLoadedEstado] = useState<string | null>(null);
  const editable =
    !editing || loadedEstado === "Pendiente" || loadedEstado === "En proceso";
  const [currentVehicle, setCurrentVehicle] = useState<MotovehiculoResponse | null>(null);
  const [fechaIngreso, setFechaIngreso] = useState(today());
  const [fechaEntregaEstimada, setFechaEntregaEstimada] = useState("");
  const [kilometrajeIngreso, setKilometrajeIngreso] = useState("");
  const [trabajos, setTrabajos] = useState<Line[]>([]);
  const [expandedObservations, setExpandedObservations] = useState<Set<string>>(() => new Set());
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});
  const [workQuery, setWorkQuery] = useState("");
  const [workOpen, setWorkOpen] = useState<string | null>(null);
  const [workSuggestions, setWorkSuggestions] = useState<TrabajoCatalogoResponse[]>([]);
  const [duplicateWork, setDuplicateWork] = useState<{ key: string; trabajo: TrabajoCatalogoResponse } | null>(null);
  const [notes, setNotes] = useState("");
  const [iva, setIva] = useState(false);
  const [descuentoGlobal, setDescuentoGlobal] = useState(0);
  const [photos, setPhotos] = useState<PhotoDraft[]>([]);
  const [existing, setExisting] = useState<PhotoResponse[]>([]);
  const [linkedRepuestos, setLinkedRepuestos] = useState<RepuestoResponse[] | null>(() => fichaKey ? null : []);
  const [saving, setSaving] = useState(false);
  const [closeConfirmation, setCloseConfirmation] = useState(false);
  const [startWorkConfirmation, setStartWorkConfirmation] = useState<string | null>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const photoUrls = useRef(new Set<string>());
  const existingUrls = useRef<Record<string, string>>({});

  useEffect(
    () => () => {
      photoUrls.current.forEach((url) => URL.revokeObjectURL(url));
      Object.values(existingUrls.current).forEach((url) =>
        URL.revokeObjectURL(url),
      );
    },
    [],
  );
  useEffect(() => {
    let active = true;
    void api<TrabajoCatalogoResponse[]>("/configuracion/trabajos/autocomplete", {}, { q: workQuery })
      .then((items) => { if (active) setWorkSuggestions(items); })
      .catch(() => { if (active) setWorkSuggestions([]); });
    return () => { active = false; };
  }, [workQuery]);
  useEffect(() => {
    const motoId = fichaKey ? undefined : initialMotoId;
    if (motoId) void api<MotovehiculoResponse>(`/motovehiculos/${motoId}`).then(setCurrentVehicle).catch((reason) => notify(reason instanceof Error ? reason.message : "No se pudo cargar la moto.", "error"));
  }, [fichaKey, initialMotoId, notify]);
  useEffect(() => {
    if (!fichaKey) return;
    void api<FichaResponse>(`/fichas/${fichaKey}`)
      .then((ficha) => {
        void api<MotovehiculoResponse>(`/motovehiculos/${ficha.motoId}`).then(setCurrentVehicle).catch(() => undefined);
        setLoadedEstado(ficha.estado);
        setFechaIngreso(ficha.fechaIngreso.slice(0, 10) || today());
        setFechaEntregaEstimada(ficha.fechaEntregaEstimada ?? "");
        setKilometrajeIngreso(
          ficha.kilometrajeIngreso != null
            ? String(ficha.kilometrajeIngreso)
            : "",
        );
        setNotes(ficha.observaciones ?? "");
        setIva(ficha.iva);
        setDescuentoGlobal(Number(ficha.descuentoGlobal ?? 0));
        setExisting(ficha.fotos);
        const nextTrabajos = ficha.trabajos.map((trabajo) => ({
          key: crypto.randomUUID(),
          id: trabajo.id,
          descripcion: trabajo.descripcion,
          precioUnitario: trabajo.precioUnitario,
          descuento: trabajo.descuento,
          realizado: trabajo.estadoTrabajo === "Realizado",
          estadoTrabajo: trabajo.estadoTrabajo,
          observacionTrabajo: trabajo.observacionTrabajo ?? "",
        }));
        setTrabajos(nextTrabajos);
        setExpandedObservations(new Set(nextTrabajos.filter((trabajo) => trabajo.observacionTrabajo?.trim()).map((trabajo) => trabajo.key)));
      })
      .catch((reason) =>
        notify(
          reason instanceof Error
            ? reason.message
            : "No se pudo cargar la ficha.",
          "error",
        ),
      );
  }, [fichaKey, notify]);
  useEffect(() => {
    if (!fichaKey) return;
    let active = true;
    void api<RepuestoResponse[]>(`/fichas/${fichaKey}/repuestos`)
      .then((items) => { if (active) setLinkedRepuestos(items); })
      .catch(() => { if (active) setLinkedRepuestos([]); });
    return () => { active = false; };
  }, [fichaKey]);

  const vehicleId = currentVehicle?.id ?? "";
  const clientId = currentVehicle?.propietarioId ?? "";
  const startWork = async (key: string) => {
    if (fichaKey) {
      try {
        await api(`/fichas/${fichaKey}/estado`, { method: "PATCH", body: JSON.stringify({ estado: "En proceso" }) });
        setLoadedEstado("En proceso");
      } catch (reason) {
        notify(reason instanceof Error ? reason.message : "No se pudo iniciar la ficha.", "error");
        return;
      }
    }
    updateLine(key, { realizado: true, estadoTrabajo: "Realizado" });
  };
  const subtotal = useMemo(
    () =>
      trabajos.reduce(
        (sum, trabajo) => trabajo.estadoTrabajo === "Cancelado" ? sum : sum + Number(trabajo.precioUnitario) - Number(trabajo.descuento),
        0,
      ),
    [trabajos],
  );
  const taxableSubtotal = Math.max(0, subtotal - descuentoGlobal);
  const ivaVal = iva ? taxableSubtotal * 0.21 : 0;
  const total = taxableSubtotal + ivaVal;
  const repuestosTotal = (linkedRepuestos ?? []).filter((pedido) => pedido.estado !== "Cancelado").reduce((sum, pedido) => sum + pedido.total, 0);
  const totalPresupuesto = total + repuestosTotal;
  const hasDraftContent =
    trabajos.length > 0 ||
    Boolean(notes) ||
    photos.length > 0 ||
    Boolean(fechaEntregaEstimada) ||
    Boolean(kilometrajeIngreso);
  const addTrabajo = (r?: Partial<Line>) =>
    setTrabajos((previous) => [
      ...previous,
      {
        key: crypto.randomUUID(),
        descripcion: "",
        precioUnitario: 0,
        descuento: 0,
        realizado: false,
        ...r,
      },
    ]);
  const updateLine = (key: string, changes: Partial<Line>) =>
    setTrabajos((all) =>
      all.map((line) => (line.key === key ? { ...line, ...changes } : line)),
    );
  const toggleObservation = (key: string) =>
    setExpandedObservations((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  const normalizedWork = (value: string) => value.trim().toLocaleLowerCase().replace(/\s+/g, " ");
  const chooseTrabajo = (key: string, trabajo: TrabajoCatalogoResponse, force = false) => {
    const duplicate = trabajos.some((line) => line.key !== key && normalizedWork(line.descripcion) === normalizedWork(trabajo.descripcion));
    if (duplicate && !force) {
      setDuplicateWork({ key, trabajo });
      setWorkOpen(null);
      return;
    }
    updateLine(key, { descripcion: trabajo.descripcion, precioUnitario: Number(trabajo.precioBase), catalogo: true });
    setWorkOpen(null);
  };
  const attachPhotos = async (files: File[]) => {
    try {
      const converted = await Promise.all(files.map(asWebp));
      setPhotos((current) => [
        ...current,
        ...converted.map((file) => {
          const url = URL.createObjectURL(file);
          photoUrls.current.add(url);
          return { file, url };
        }),
      ]);
    } catch (reason) {
      notify(
        reason instanceof Error
          ? reason.message
          : "No se pudieron preparar las fotos.",
        "error",
      );
    }
  };
  const removePhoto = (url: string) => {
    URL.revokeObjectURL(url);
    photoUrls.current.delete(url);
    setPhotos((all) => all.filter((photo) => photo.url !== url));
  };
  const save = async () => {
    if (!clientId || !vehicleId)
      return notify("Seleccioná un cliente y una moto.", "error");
    if (!trabajos.length)
      return notify("Cargá al menos un trabajo a realizar.", "error");
    const validWork = trabajos.filter((trabajo) => trabajo.descripcion.trim());
    if (!validWork.length)
      return notify("Cada trabajo necesita una descripción.", "error");
    if (!editable)
      return notify(
        `La ficha ya está en "${loadedEstado}" y no puede editarse desde el formulario.`,
        "error",
      );
    setSaving(true);
    try {
      const request: FichaRequest = {
        clienteId: clientId,
        motoId: vehicleId,
        fechaIngreso: fechaIngreso || today(),
        fechaEntregaEstimada: fechaEntregaEstimada || undefined,
        kilometrajeIngreso: kilometrajeIngreso
          ? parseIntegerInput(kilometrajeIngreso)
          : undefined,
        observaciones: notes || undefined,
        descuentoGlobal,
        iva,
        trabajos: validWork.map((trabajo) => ({
          descripcion: trabajo.descripcion.trim(),
          precioUnitario: trabajo.precioUnitario,
          descuento: trabajo.descuento,
          id: trabajo.id,
          estadoTrabajo: trabajo.estadoTrabajo ?? (trabajo.realizado ? "Realizado" : "Pendiente"),
          observacionTrabajo: trabajo.observacionTrabajo || undefined,
        })),
      };
      let ficha = fichaKey
        ? await api<FichaResponse>(`/fichas/${fichaKey}`, {
            method: "PUT",
            body: JSON.stringify(request),
          })
        : await api<FichaResponse>("/fichas", {
            method: "POST",
            body: JSON.stringify(request),
          });
      if (photos.length) {
        await Promise.all(
          photos.map(async ({ file }) =>
            api(`/fichas/${ficha.id}/fotos`, {
              method: "POST",
              body: JSON.stringify({
                filename: file.name,
                contentType: "image/webp",
                base64: await readAsBase64(file),
              }),
            }),
          ),
        );
        ficha = await api<FichaResponse>(`/fichas/${ficha.id}`);
      }
      onSave(ficha);
    } catch (reason) {
      notify(
        reason instanceof Error
          ? reason.message
          : "No fue posible guardar la ficha.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <section className="order-form ficha-form-page">
      <div className="page-heading">
        <div>
          <h1>
            {editing ? "Editar ficha de trabajo" : "Nueva ficha de trabajo"}
          </h1>
          <p>
            {editing
              ? "Actualizá los trabajos y las condiciones."
              : "Buscá la moto por patente y cargá los trabajos a realizar."}
          </p>
        </div>
        <button
          className="button secondary form-close"
          onClick={() =>
            hasDraftContent && !editing ? setCloseConfirmation(true) : onClose()
          }
        >
          <X size={18} />
          Cerrar
        </button>
      </div>
      {editing && !editable && (
        <p className="form-notice" role="status">
          Esta ficha ya está en &quot;{loadedEstado}&quot;. Solo se pueden
           editar fichas en &quot;Pendiente&quot; o &quot;En proceso&quot;.
        </p>
      )}
        <div className="form-layout ficha-form-layout">
        <div className="form-stack">
         <section className="panel moto-data-card ficha-moto-card">
              <h2 className="form-section-title">1. Datos de la moto</h2>
             {currentVehicle && <div className="moto-data-profile">
               <div className="panel-head"><h3>Datos de la moto</h3><span className="muted">Información del Perfil</span></div>
               <dl className="record-detail">
                 <div><dt>Marca / modelo</dt><dd>{currentVehicle.marca} {currentVehicle.modelo}</dd></div>
                 <div><dt>Patente</dt><dd>{currentVehicle.patente}</dd></div>
                 <div><dt>Año</dt><dd>{currentVehicle.anio ?? "—"}</dd></div>
                 <div><dt>Kilometraje actual</dt><dd>{currentVehicle.kilometraje?.toLocaleString("es-AR") ?? "—"}</dd></div>
                 <div><dt>Estado</dt><dd>{currentVehicle.estado}</dd></div>
                 <div><dt>Observaciones</dt><dd>{currentVehicle.observaciones || "—"}</dd></div>
               </dl>
             </div>}
             <div className="ficha-moto-fields">
               <label>Fecha ingreso<input type="date" value={fechaIngreso} onChange={(event) => setFechaIngreso(event.target.value)} /></label>
               <label>Entrega estimada<input type="date" value={fechaEntregaEstimada} onChange={(event) => setFechaEntregaEstimada(event.target.value)} /></label>
               <label>Kilometraje ingreso<input type="text" inputMode="numeric" value={integerInput(kilometrajeIngreso)} onChange={(event) => setKilometrajeIngreso(event.target.value)} placeholder="KM actual" /></label>
             </div>
            </section>
           <section className="form-section">
             <div className="form-section-heading">
               <h2 className="form-section-title">2. Trabajos a realizar</h2>
               <button className="text-button section-add-button" type="button" onClick={() => addTrabajo()}><Plus size={17} />Agregar trabajo</button>
             </div>
             <div className="line-items">
              {trabajos.map((trabajo) => (
                  <div className={`line-item${workStateClass(trabajo.estadoTrabajo, trabajo.realizado)}${workOpen === trabajo.key ? " is-work-open" : ""}`} key={trabajo.key}>
                  <label className="line-descr">
                    Descripción
                    <div className="autocomplete-field">
                      <input
                        type="text"
                        value={trabajo.descripcion}
                        readOnly={trabajo.catalogo}
                        onFocus={() => { if (trabajo.catalogo) return; setWorkOpen(trabajo.key); setWorkQuery(trabajo.descripcion); void api<TrabajoCatalogoResponse[]>("/configuracion/trabajos/autocomplete", {}, { q: trabajo.descripcion }).then(setWorkSuggestions).catch(() => setWorkSuggestions([])); }}
                        onBlur={() => window.setTimeout(() => setWorkOpen((key) => key === trabajo.key ? null : key), 120)}
                        onChange={(event) => {
                          if (trabajo.catalogo) return;
                          updateLine(trabajo.key, { descripcion: event.target.value });
                          setWorkQuery(event.target.value);
                          setWorkOpen(trabajo.key);
                        }}
                        placeholder="Ej.: Cambio de aceite"
                        autoComplete="off"
                      />
                        {workOpen === trabajo.key && <div className="suggestions">
                         {workSuggestions.length ? workSuggestions.map((option) => <button type="button" key={option.id} onMouseDown={(event) => event.preventDefault()} onClick={() => chooseTrabajo(trabajo.key, option)}><span>{option.descripcion}</span><small>{money(option.precioBase)}</small></button>) : <p>Sin trabajos coincidentes. Podés ingresar una descripción manual.</p>}
                      </div>}
                    </div>
                  </label>
                   <label className="line-price">
                     Precio
                     <input
                       type="text"
                       inputMode="decimal"
                       value={priceDrafts[trabajo.key] ?? priceInput(trabajo.precioUnitario)}
                       onFocus={() => setPriceDrafts((all) => ({ ...all, [trabajo.key]: all[trabajo.key] ?? priceDraft(trabajo.precioUnitario) }))}
                       onChange={(event) => {
                         setPriceDrafts((all) => ({ ...all, [trabajo.key]: event.target.value }));
                         updateLine(trabajo.key, { precioUnitario: parsePrice(event.target.value) });
                       }}
                       onBlur={() => setPriceDrafts((all) => {
                         const next = { ...all };
                         delete next[trabajo.key];
                         return next;
                       })}
                     />
                  </label>
                   <div className="line-total">
                     <span>Total</span>
                     <strong>
                       {trabajo.precioUnitario > 0
                         ? money(
                             Number(trabajo.precioUnitario) -
                               Number(trabajo.descuento),
                           )
                         : "A definir"}
                     </strong>
                   </div>
                    <label className="line-check work-state-check">
                    <input
                      className="work-state-input"
                      type="checkbox"
                      checked={trabajo.estadoTrabajo === "Realizado" || trabajo.realizado}
                     disabled={trabajo.estadoTrabajo === "Cancelado"}
                       onChange={(event) => {
                           if (event.target.checked && loadedEstado === "Pendiente") {
                           setStartWorkConfirmation(trabajo.key);
                           return;
                         }
                         updateLine(trabajo.key, { realizado: event.target.checked, estadoTrabajo: event.target.checked ? "Realizado" : "Pendiente" });
                       }}
                      />
                    <span className="work-state-box" aria-hidden="true"><Check size={14} strokeWidth={3} /></span>
                    Realizado
                   </label>
                    <div className={`line-observation${expandedObservations.has(trabajo.key) ? " is-expanded" : ""}`}>
                      <div className="line-observation-head">
                        <span>Observación del trabajo</span>
                        <button type="button" className="line-observation-toggle" aria-expanded={expandedObservations.has(trabajo.key)} aria-controls={`work-observation-${trabajo.key}`} onClick={() => toggleObservation(trabajo.key)}>
                          {expandedObservations.has(trabajo.key) ? "Contraer" : trabajo.observacionTrabajo?.trim() ? "Editar observación" : "Agregar observación"}
                        </button>
                      </div>
                      {expandedObservations.has(trabajo.key) ? <textarea
                        id={`work-observation-${trabajo.key}`}
                        rows={2}
                        value={trabajo.observacionTrabajo ?? ""}
                        onChange={(event) => updateLine(trabajo.key, { observacionTrabajo: event.target.value })}
                        placeholder="Ej.: revisar transmisión antes de entregar"
                      /> : trabajo.observacionTrabajo?.trim() ? <p className="line-observation-preview">{trabajo.observacionTrabajo}</p> : null}
                    </div>
                   <button
                     type="button"
                     className="line-delete"
                     aria-label="Eliminar trabajo"
                     title="Eliminar trabajo"
                    onClick={() =>
                      setTrabajos((all) =>
                        all.filter((line) => line.key !== trabajo.key),
                      )
                    }
                  >
                    <X size={18} />
                  </button>
                </div>
              ))}
            </div>
           </section>
          <section className="form-section">
             <h2 className="form-section-title">3. Fotos y observaciones</h2>
            <label>
              Observaciones
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Describí la falla o los detalles detectados."
              />
            </label>
            <input
              ref={photoInput}
              hidden
              type="file"
              accept="image/*"
              multiple
              onChange={(event) =>
                void attachPhotos(Array.from(event.target.files ?? []))
              }
            />
            <button
              className="photo-button"
              type="button"
              onClick={() => photoInput.current?.click()}
            >
              <Camera size={19} />
              {editing ? "Agregar más fotos" : "Adjuntar fotos"}
              <small>Se convierten a WebP antes de guardar.</small>
            </button>
            {existing.length > 0 && (
              <div className="photo-previews existing">
                {existing.map((photo) => (
                  <ExistingPhoto key={photo.id} photo={photo} />
                ))}
              </div>
            )}
            {photos.length > 0 && (
              <div className="photo-previews">
                {photos.map((photo) => (
                  <figure key={photo.url}>
                    <img
                      src={photo.url}
                      alt="Vista previa de la foto adjunta"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(photo.url)}
                      aria-label="Quitar foto"
                    >
                      <X size={16} />
                    </button>
                  </figure>
                ))}
              </div>
            )}
          </section>
        </div>
        <aside className="summary ficha-summary">
          <h2 className="form-section-title">Presupuesto</h2>
          <dl className="summary-facts">
            <div><dt>Cliente</dt><dd>{currentVehicle?.propietario ?? "Sin seleccionar"}</dd></div>
            <div><dt>Moto</dt><dd>{currentVehicle ? `${currentVehicle.marca} ${currentVehicle.modelo}` : "Sin seleccionar"}</dd></div>
            <div><dt>Dominio</dt><dd>{currentVehicle?.patente ?? "—"}</dd></div>
            <div><dt>Ingreso</dt><dd>{fechaIngreso || "—"}</dd></div>
            <div><dt>Entrega estimada</dt><dd>{fechaEntregaEstimada || "—"}</dd></div>
          </dl>
          <section className="summary-group">
            <h3>Trabajos y servicios</h3>
            <div className="summary-work-list" aria-label="Trabajos de la ficha">
              {trabajos.length ? trabajos.map((trabajo) => (
                <div key={trabajo.key} className={`summary-work${workStateClass(trabajo.estadoTrabajo, trabajo.realizado)}${trabajo.estadoTrabajo === "Cancelado" ? " cancelled" : ""}`}>
                  <div className="summary-work-head"><strong>{trabajo.descripcion || "Trabajo sin descripción"}</strong><strong>{money(Math.max(0, trabajo.precioUnitario - trabajo.descuento))}</strong></div>
                  <div className="summary-work-total"><small>Precio {money(trabajo.precioUnitario)}{trabajo.descuento > 0 && ` · Desc. ${money(trabajo.descuento)}`}</small><small className="work-state-label">{trabajo.estadoTrabajo === "Realizado" || trabajo.realizado ? "Realizado" : trabajo.estadoTrabajo ?? "Pendiente"}</small></div>
                  {trabajo.observacionTrabajo && <small>{trabajo.observacionTrabajo}</small>}
                </div>
              )) : <p className="summary-empty">Agregá trabajos para ver su desglose.</p>}
            </div>
          </section>
          {notes && <section className="summary-group"><h3>Observaciones</h3><p className="summary-note">{notes}</p></section>}
          <section className="summary-group">
            <h3>Repuestos y accesorios</h3>
            {linkedRepuestos === null ? <p className="summary-empty">Cargando pedidos vinculados…</p> : linkedRepuestos.length ? <div className="summary-linked-orders">{linkedRepuestos.map((pedido) => (
              <article key={pedido.id} className={`summary-linked-order${pedido.estado === "Cancelado" ? " cancelled" : ""}`}>
                <div className="summary-linked-order-head"><strong>{pedido.numero}</strong><StatusBadge status={pedido.estado} /></div>
                <small>{pedido.proveedor ? `Proveedor: ${pedido.proveedor}` : "Sin proveedor"}</small>
                <div className="summary-order-items">{pedido.items.map((item) => <div key={item.id} className={item.estado === "Cancelado" ? "cancelled" : ""}><span>{item.descripcion} · {item.tipo} · {Number(item.cantidad)} u. · {item.estado}</span><strong>{money(item.subtotal)}</strong></div>)}</div>
                {pedido.observaciones && <small>{pedido.observaciones}</small>}
                <div className="summary-work-total"><span>Total pedido</span><strong>{pedido.estado === "Cancelado" ? "—" : money(pedido.total)}</strong></div>
              </article>
            ))}</div> : <p className="summary-empty">Los pedidos de repuestos aparecerán aquí cuando se vinculen a esta ficha.</p>}
          </section>
          <label className="iva-toggle">
            <input
              type="checkbox"
              checked={iva}
              onChange={(event) => setIva(event.target.checked)}
            />
            Aplicar IVA 21%
          </label>
          <BudgetBreakdown
            subtotalTrabajos={subtotal}
            totalRepuestos={repuestosTotal}
            descuentoGlobal={descuentoGlobal}
            iva={ivaVal}
            totalPresupuesto={totalPresupuesto}
            descuentoControl={<input type="text" inputMode="decimal" value={descuentoGlobal ? priceInput(descuentoGlobal) : ""} onChange={(event) => setDescuentoGlobal(parsePrice(event.target.value))} />}
          />
          <button
            className="button primary large"
            disabled={saving || !editable}
            onClick={() => void save()}
          >
            <Save size={19} />
            {saving
              ? "Guardando..."
              : editing
                ? "Guardar cambios"
                : "Guardar ficha"}
          </button>
        </aside>
      </div>
      <ConfirmModal
        open={duplicateWork !== null}
        title="Trabajo ya agregado"
        body={`“${duplicateWork?.trabajo.descripcion ?? "Este trabajo"}” ya está en la ficha. Podés agregarlo nuevamente si corresponde a otra tarea o reparación.`}
        confirmLabel="Agregar nuevamente"
        variant="success"
        onClose={() => setDuplicateWork(null)}
        onConfirm={() => {
          if (!duplicateWork) return;
          chooseTrabajo(duplicateWork.key, duplicateWork.trabajo, true);
          setDuplicateWork(null);
        }}
      />
      <ConfirmModal
        open={closeConfirmation}
        title="¿Cerrar ficha?"
        body="Hay información cargada en esta ficha. Si cerrás ahora, se descartará el borrador."
        confirmLabel="Sí, cerrar ficha"
        onClose={() => setCloseConfirmation(false)}
        onConfirm={onClose}
      />
      <ConfirmModal
        open={startWorkConfirmation !== null}
        title="Iniciar ficha"
        body="Esta ficha se marcará como En Proceso si realizás un trabajo."
        confirmLabel="Marcar en proceso"
        variant="success"
        onClose={() => setStartWorkConfirmation(null)}
        onConfirm={() => {
          const key = startWorkConfirmation;
          setStartWorkConfirmation(null);
          if (key) void startWork(key);
        }}
      />
    </section>
  );
}
