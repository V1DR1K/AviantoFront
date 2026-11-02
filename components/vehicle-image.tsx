"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, ImageOff } from "lucide-react";
import { prepareVehicleImage, vehicleImageUrl, type VehiclePhotoChange } from "../lib/vehicle-image";

// Muestra la foto de una moto solo cuando entra en pantalla: las listas no piden
// todas las imágenes a la vez. `version` (imagenActualizadaAt) invalida la caché al cambiarla.
export function VehicleImage({ motoId, version, tamano, eager = false, className = "", alt = "Foto de la moto" }: { motoId: string; version?: string | null; tamano: "miniatura" | "completa"; eager?: boolean; className?: string; alt?: string }) {
  const frame = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(eager);
  const [loaded, setLoaded] = useState<{ key: string; url?: string; failed?: boolean } | null>(null);
  const key = version ? `${motoId}:${tamano}:${version}` : null;

  useEffect(() => {
    if (!version || visible) return;
    const node = frame.current;
    if (!node) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: "240px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [version, visible]);

  useEffect(() => {
    if (!visible || !version) return;
    let active = true;
    const requested = `${motoId}:${tamano}:${version}`;
    vehicleImageUrl(motoId, tamano, version)
      .then((url) => { if (active) setLoaded({ key: requested, url }); })
      .catch(() => { if (active) setLoaded({ key: requested, failed: true }); });
    return () => { active = false; };
  }, [visible, motoId, tamano, version]);

  const current = loaded && loaded.key === key ? loaded : null;
  return (
    <div ref={frame} className={`vehicle-image ${className}`.trim()}>
      {current?.url ? <img src={current.url} alt={alt} decoding="async" /> : (
        <span className="vehicle-image-placeholder" aria-label={alt}>
          {!version ? <Camera size={26} aria-hidden="true" /> : current?.failed ? <ImageOff size={26} aria-hidden="true" /> : <span className="vehicle-image-loading" aria-hidden="true" />}
        </span>
      )}
    </div>
  );
}

// Selector de foto para formularios. El cambio queda pendiente hasta que el formulario se guarda.
export function VehiclePhotoField({ current, change, onChange, onError }: { current?: { motoId: string; version?: string | null } | null; change: VehiclePhotoChange | null; onChange: (change: VehiclePhotoChange | null) => void; onError: (message: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const hasPhoto = change?.kind === "set" || Boolean(current && change?.kind !== "remove");

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const image = await prepareVehicleImage(file);
      const previewUrl = URL.createObjectURL(image.completaBlob);
      if (change?.kind === "set") URL.revokeObjectURL(change.previewUrl);
      onChange({ kind: "set", image, previewUrl });
    } catch (reason) {
      onError(reason instanceof Error ? reason.message : "No se pudo preparar la imagen.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  const discard = () => {
    if (change?.kind === "set") URL.revokeObjectURL(change.previewUrl);
    onChange(null);
  };

  return (
    <div className="vehicle-photo-field form-field-wide">
      <span className="vehicle-photo-title">Foto de la moto</span>
      <div className="vehicle-photo-body">
        <div className="vehicle-photo-frame">
          {change?.kind === "set" ? (
            <img src={change.previewUrl} alt="Vista previa de la foto de la moto" />
          ) : current && change?.kind !== "remove" ? (
            <VehicleImage motoId={current.motoId} version={current.version} tamano="completa" eager />
          ) : (
            <span className="vehicle-image-placeholder">
              <Camera size={26} aria-hidden="true" />
              <small>{change?.kind === "remove" ? "Se quitará al guardar" : "Sin foto"}</small>
            </span>
          )}
        </div>
        <div className="vehicle-photo-actions">
          <button type="button" className="button secondary" disabled={busy} onClick={() => input.current?.click()}>
            {busy ? "Preparando la foto..." : hasPhoto ? "Cambiar foto" : "Subir foto"}
          </button>
          {hasPhoto && <button type="button" className="text-button danger-action" disabled={busy} onClick={() => onChange({ kind: "remove" })}>Quitar foto</button>}
          {change && <button type="button" className="text-button" disabled={busy} onClick={discard}>Deshacer cambio</button>}
          <small>Acepta cualquier formato de imagen. Se optimiza antes de guardarla.</small>
          <input ref={input} type="file" accept="image/*,.heic,.heif" hidden aria-label="Elegir foto de la moto" onChange={(event) => void pick(event.target.files?.[0])} />
        </div>
      </div>
    </div>
  );
}
