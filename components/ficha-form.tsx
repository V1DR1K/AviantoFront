"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, Plus, Save, Search, X } from "lucide-react";
import { api, objectUrl } from "../lib/api";
import { money, parsePrice, priceInput } from "../lib/format";
import { todayInAr } from "../lib/dates";
import type {
  ClienteResponse,
  FichaRequest,
  FichaResponse,
  MotovehiculoResponse,
  PageResponse,
  PhotoResponse,
  TrabajoCatalogoResponse,
} from "../lib/types";
import { ConfirmModal } from "./ui";

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
const clientLabel = (client: ClienteResponse) =>
  `${client.nombre}${client.telefono ? ` · ${client.telefono}` : ""}`;
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
  initialClientId,
  initialMotoId,
}: {
  onClose: () => void;
  onSave: (ficha: FichaResponse) => void;
  fichaKey?: string | null;
  initialClientId?: string | null;
  initialMotoId?: string | null;
}) {
  const editing = Boolean(fichaKey);
  const [loadedEstado, setLoadedEstado] = useState<string | null>(null);
  const editable =
    !editing || loadedEstado === "Cargada" || loadedEstado === "En proceso";
  const [clients, setClients] = useState<ClienteResponse[]>([]);
  const [vehicles, setVehicles] = useState<MotovehiculoResponse[]>([]);
  const [patenteQuery, setPatenteQuery] = useState("");
  const [patenteBusy, setPatenteBusy] = useState(false);
  const [clientId, setClientId] = useState(initialClientId ?? "");
  const [clientQuery, setClientQuery] = useState("");
  const [clientOpen, setClientOpen] = useState(false);
  const [vehicleId, setVehicleId] = useState("");
  const [fechaIngreso, setFechaIngreso] = useState(today());
  const [fechaEntregaEstimada, setFechaEntregaEstimada] = useState("");
  const [vencimiento, setVencimiento] = useState("");
  const [kilometrajeIngreso, setKilometrajeIngreso] = useState("");
  const [trabajos, setTrabajos] = useState<Line[]>([]);
  const [workQuery, setWorkQuery] = useState("");
  const [workOpen, setWorkOpen] = useState<string | null>(null);
  const [workSuggestions, setWorkSuggestions] = useState<TrabajoCatalogoResponse[]>([]);
  const [notes, setNotes] = useState("");
  const [iva, setIva] = useState(false);
  const [descuentoGlobal, setDescuentoGlobal] = useState(0);
  const [photos, setPhotos] = useState<PhotoDraft[]>([]);
  const [existing, setExisting] = useState<PhotoResponse[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [closeConfirmation, setCloseConfirmation] = useState(false);
  const plateLocked = Boolean(initialMotoId);
  const prefill = useRef<{ motoId?: string } | null>(
    initialMotoId ? { motoId: initialMotoId } : null,
  );
  const [reloadKey, setReloadKey] = useState(0);
  const photoInput = useRef<HTMLInputElement>(null);
  const clientPicker = useRef<HTMLDivElement>(null);
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
  const chooseClient = (id: string) => {
    const client = clients.find((item) => item.id === id);
    setClientId(id);
    setClientQuery(client ? clientLabel(client) : "");
    setClientOpen(false);
  };
  const clientMatches = useMemo(() => {
    const query = clientQuery.trim().toLowerCase();
    return clients
      .filter(
        (client) =>
          !query ||
          [client.nombre, client.telefono, client.documento, client.email].some(
            (value) => value?.toLowerCase().includes(query),
          ),
      )
      .slice(0, 10);
  }, [clientQuery, clients]);
  useEffect(() => {
    void api<PageResponse<ClienteResponse>>(
      "/clientes",
      {},
      { activo: true, size: 100 },
    )
      .then((page) => setClients(page.content))
      .catch((reason) =>
        setError(
          reason instanceof Error
            ? reason.message
            : "No se pudieron cargar los datos.",
        ),
      );
  }, []);
  useEffect(() => {
    let active = true;
    void api<TrabajoCatalogoResponse[]>("/configuracion/trabajos/autocomplete", {}, { q: workQuery })
      .then((items) => { if (active) setWorkSuggestions(items); })
      .catch(() => { if (active) setWorkSuggestions([]); });
    return () => { active = false; };
  }, [workQuery]);
  useEffect(() => {
    if (initialMotoId) void api<MotovehiculoResponse>(`/motovehiculos/${initialMotoId}`).then((moto) => setPatenteQuery(moto.patente)).catch(() => undefined);
  }, [initialMotoId]);
  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!clientPicker.current?.contains(event.target as Node))
        setClientOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  const searchByPlate = async () => {
    const plate = patenteQuery.trim().toUpperCase();
    if (!plate) return;
    setPatenteBusy(true);
    setError(null);
    try {
      const page = await api<PageResponse<MotovehiculoResponse>>(
        "/motovehiculos",
        {},
        { q: plate, activo: true, size: 20 },
      );
      if (!page.content.length) {
        setError(
          `No se encontró la moto "${plate}". Verificá la patente o creala con el botón "Agregar moto".`,
        );
        setVehicles([]);
        setVehicleId("");
        return;
      }
      const available = page.content.filter((moto) => moto.ingresada && moto.seccion === "Taller");
      setVehicles(available);
      const owner = available.find(
        (moto) => moto.propietarioId,
      )?.propietarioId;
      if (owner) chooseClient(owner);
      setVehicleId(available[0]?.id ?? "");
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "No se pudo buscar la moto.",
      );
    } finally {
      setPatenteBusy(false);
    }
  };
  useEffect(() => {
    if (!clientId) return;
    void api<PageResponse<MotovehiculoResponse>>(
      "/motovehiculos",
      {},
      { clienteId: clientId, activo: true, size: 100 },
    )
      .then((page) => {
        const available = page.content.filter((moto) => moto.ingresada && moto.seccion === "Taller");
        let first = available[0]?.id ?? "";
        if (prefill.current?.motoId)
          first = page.content.some(
            (moto) => moto.id === prefill.current?.motoId,
          )
            ? prefill.current.motoId
            : first;
        setVehicles(available);
        setVehicleId(first);
        void (async () => {
          const missing =
            prefill.current?.motoId &&
            !page.content.some((moto) => moto.id === prefill.current?.motoId)
              ? prefill.current.motoId
              : null;
          if (missing) {
            try {
              const moto = await api<MotovehiculoResponse>(
                `/motovehiculos/${missing}`,
              );
              setVehicles((all) =>
                all.some((vehicle) => vehicle.id === moto.id)
                  ? all
                  : [moto, ...all],
              );
              setVehicleId(moto.id);
            } catch {
              /* la moto ya no existe */
            }
          }
          if (prefill.current?.motoId) prefill.current = null;
        })();
      })
      .catch((reason) =>
        setError(
          reason instanceof Error
            ? reason.message
            : "No se pudieron cargar las motos.",
        ),
      );
  }, [clientId, reloadKey]);
  useEffect(() => {
    if (!fichaKey) return;
    void api<FichaResponse>(`/fichas/${fichaKey}`)
      .then((ficha) => {
        prefill.current = { motoId: ficha.motoId };
        setLoadedEstado(ficha.estado);
        setFechaIngreso(ficha.fechaIngreso.slice(0, 10) || today());
        setFechaEntregaEstimada(ficha.fechaEntregaEstimada ?? "");
        setVencimiento(ficha.vencimiento ?? "");
        setKilometrajeIngreso(
          ficha.kilometrajeIngreso != null
            ? String(ficha.kilometrajeIngreso)
            : "",
        );
        setNotes(ficha.observaciones ?? "");
        setIva(ficha.iva);
        setDescuentoGlobal(Number(ficha.descuentoGlobal ?? 0));
        setExisting(ficha.fotos);
        setTrabajos(
          ficha.trabajos.map((trabajo) => ({
            key: crypto.randomUUID(),
            id: trabajo.id,
            descripcion: trabajo.descripcion,
            precioUnitario: trabajo.precioUnitario,
            descuento: trabajo.descuento,
            realizado: trabajo.estadoTrabajo === "Realizado",
            estadoTrabajo: trabajo.estadoTrabajo,
            observacionTrabajo: trabajo.observacionTrabajo ?? "",
          })),
        );
        setClientId(ficha.clienteId);
        setReloadKey((key) => key + 1);
      })
      .catch((reason) =>
        setError(
          reason instanceof Error
            ? reason.message
            : "No se pudo cargar la ficha.",
        ),
      );
  }, [fichaKey]);

  const currentVehicle = vehicles.find((vehicle) => vehicle.id === vehicleId);
  const selectedClient = clients.find((client) => client.id === clientId);
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
  const chooseTrabajo = (key: string, trabajo: TrabajoCatalogoResponse) => {
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
      setError(
        reason instanceof Error
          ? reason.message
          : "No se pudieron preparar las fotos.",
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
      return setError("Seleccioná un cliente y una moto.");
    if (!trabajos.length)
      return setError("Cargá al menos un trabajo a realizar.");
    const validWork = trabajos.filter((trabajo) => trabajo.descripcion.trim());
    if (!validWork.length)
      return setError("Cada trabajo necesita una descripción.");
    if (!editable)
      return setError(
        `La ficha ya está en "${loadedEstado}" y no puede editarse desde el formulario.`,
      );
    setSaving(true);
    setError(null);
    try {
      const request: FichaRequest = {
        clienteId: clientId,
        motoId: vehicleId,
        fechaIngreso: fechaIngreso || today(),
        fechaEntregaEstimada: fechaEntregaEstimada || undefined,
        vencimiento: vencimiento || undefined,
        kilometrajeIngreso: kilometrajeIngreso
          ? Number(kilometrajeIngreso)
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
      setError(
        reason instanceof Error
          ? reason.message
          : "No fue posible guardar la ficha.",
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <section className="order-form">
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
      {error && (
        <p className="login-pending" role="alert">
          {error}
        </p>
      )}
      {editing && !editable && (
        <p className="login-pending" role="alert">
          Esta ficha ya está en &quot;{loadedEstado}&quot;. Solo se pueden
          editar fichas en &quot;Cargada&quot; o &quot;En proceso&quot;.
        </p>
      )}
      <div className="form-layout">
        <div className="form-stack">
          <section className="form-section">
            <h2>1. Moto por patente</h2>
            <div className="plate-search">
              <input
                value={patenteQuery}
                readOnly={plateLocked}
                onChange={(event) => setPatenteQuery(event.target.value)}
                placeholder="Ej.: AB 123 CD"
                onKeyDown={(event) => {
                  if (!plateLocked && event.key === "Enter") void searchByPlate();
                }}
              />
              {!plateLocked && <button
                className="button secondary"
                type="button"
                disabled={patenteBusy}
                onClick={() => void searchByPlate()}
              >
                <Search size={17} />
                {patenteBusy ? "Buscando..." : "Buscar"}
              </button>}
            </div>
            <div className="two-col">
              <div className="client-picker">
                <span>Cliente (propietario)</span>
                <div className="autocomplete-field" ref={clientPicker}>
                  <input
                    value={
                      selectedClient ? clientLabel(selectedClient) : clientQuery
                    }
                    onFocus={() => setClientOpen(true)}
                    onChange={(event) => {
                      setClientQuery(event.target.value);
                      setClientOpen(true);
                      if (clientId) {
                        setClientId("");
                        setVehicleId("");
                        setVehicles([]);
                      }
                    }}
                    placeholder="Buscar cliente por nombre, teléfono o documento"
                    autoComplete="off"
                  />
                  {clientOpen && (
                    <div className="suggestions">
                      {clientMatches.length ? (
                        clientMatches.map((client) => (
                          <button
                            type="button"
                            key={client.id}
                            onClick={() => chooseClient(client.id)}
                          >
                            <span>{client.nombre}</span>
                            <small>
                              {client.telefono ||
                                client.documento ||
                                "Sin contacto"}
                            </small>
                          </button>
                        ))
                      ) : (
                        <p>Sin clientes coincidentes.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <label>
                Moto
                <select
                  value={vehicleId}
                  onChange={(event) => setVehicleId(event.target.value)}
                  disabled={!clientId}
                >
                  <option value="">Seleccionar</option>
                  {vehicles.map((vehicle) => (
                    <option value={vehicle.id} key={vehicle.id}>
                      {vehicle.marca} {vehicle.modelo} · {vehicle.patente}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Fecha ingreso
                <input
                  type="date"
                  value={fechaIngreso}
                  onChange={(event) => setFechaIngreso(event.target.value)}
                />
              </label>
              <label>
                Entrega estimada
                <input
                  type="date"
                  value={fechaEntregaEstimada}
                  onChange={(event) =>
                    setFechaEntregaEstimada(event.target.value)
                  }
                />
              </label>
              <label>
                Vencimiento
                <input type="date" value={vencimiento} onChange={(event) => setVencimiento(event.target.value)} />
              </label>
              <label>
                Kilometraje ingreso
                <input
                  type="number"
                  min="0"
                  value={kilometrajeIngreso}
                  onChange={(event) =>
                    setKilometrajeIngreso(event.target.value)
                  }
                  placeholder="KM actual"
                />
              </label>
            </div>
          </section>
          {currentVehicle && <section className="panel moto-data-card">
            <div className="panel-head"><h3>Datos de la moto</h3><span className="muted">Información del Perfil</span></div>
            <dl className="record-detail">
              <div><dt>Marca / modelo</dt><dd>{currentVehicle.marca} {currentVehicle.modelo}</dd></div>
              <div><dt>Patente</dt><dd>{currentVehicle.patente}</dd></div>
              <div><dt>Año</dt><dd>{currentVehicle.anio ?? "—"}</dd></div>
              <div><dt>Kilometraje actual</dt><dd>{currentVehicle.kilometraje?.toLocaleString("es-AR") ?? "—"}</dd></div>
              <div><dt>Estado</dt><dd>{currentVehicle.estado}</dd></div>
              <div><dt>Observaciones</dt><dd>{currentVehicle.observaciones || "—"}</dd></div>
            </dl>
          </section>}
          <section className="form-section">
            <h2>2. Trabajos a realizar</h2>
            <div className="line-items">
              {trabajos.map((trabajo) => (
                <div className="line-item" key={trabajo.key}>
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
                  <label>
                    Precio
                    <input
                      type="text"
                      inputMode="decimal"
                      value={priceInput(trabajo.precioUnitario)}
                      onChange={(event) =>
                        updateLine(trabajo.key, {
                          precioUnitario: parsePrice(event.target.value),
                        })
                      }
                    />
                  </label>
                  {trabajo.precioUnitario > 0 && (
                    <strong>
                      {money(
                        Number(trabajo.precioUnitario) -
                          Number(trabajo.descuento),
                      )}
                    </strong>
                  )}
                  <label className="line-check">
                   <input
                     type="checkbox"
                     checked={trabajo.estadoTrabajo === "Realizado" || trabajo.realizado}
                     disabled={trabajo.estadoTrabajo === "Cancelado"}
                     onChange={(event) =>
                       updateLine(trabajo.key, {
                          realizado: event.target.checked,
                          estadoTrabajo: event.target.checked ? "Realizado" : "Pendiente",
                        })
                      }
                   />
                   Realizado
                  </label>
                  <label className="form-field-wide">Observación del trabajo<input value={trabajo.observacionTrabajo ?? ""} onChange={(event) => updateLine(trabajo.key, { observacionTrabajo: event.target.value })} /></label>
                  <button
                    type="button"
                    aria-label="Eliminar trabajo"
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
            <button
              className="text-button"
              type="button"
              onClick={() => addTrabajo()}
            >
              <Plus size={17} />
              Agregar trabajo
            </button>
          </section>
          <section className="form-section">
            <h2>3. Fotos y observaciones</h2>
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
        <aside className="summary">
          <h2>Resumen de la ficha</h2>
          <div>
            <span>Moto</span>
            <strong>
              {currentVehicle
                ? `${currentVehicle.marca} ${currentVehicle.modelo}`
                : "Sin seleccionar"}
            </strong>
          </div>
          <div>
            <span>Patente</span>
            <strong>{currentVehicle?.patente ?? "—"}</strong>
          </div>
          <hr />
           <div>
             <span>Subtotal trabajos</span>
             <strong>{money(subtotal)}</strong>
           </div>
           <label>
             Descuento global
             <input type="number" min="0" step="0.01" value={descuentoGlobal || ""} onChange={(event) => setDescuentoGlobal(Number(event.target.value) || 0)} />
           </label>
           {descuentoGlobal > 0 && <div><span>Después del descuento</span><strong>{money(Math.max(0, subtotal - descuentoGlobal))}</strong></div>}
          <label className="iva-toggle">
            <input
              type="checkbox"
              checked={iva}
              onChange={(event) => setIva(event.target.checked)}
            />
            Aplicar IVA 21%
          </label>
          {iva && (
            <div>
              <span>IVA</span>
              <strong>{money(ivaVal)}</strong>
            </div>
          )}
          <div className="total">
            <span>Total final</span>
            <strong>{money(total)}</strong>
          </div>
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
        open={closeConfirmation}
        title="¿Cerrar ficha?"
        body="Hay información cargada en esta ficha. Si cerrás ahora, se descartará el borrador."
        confirmLabel="Sí, cerrar ficha"
        onClose={() => setCloseConfirmation(false)}
        onConfirm={onClose}
      />
    </section>
  );
}
