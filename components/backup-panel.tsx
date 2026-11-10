"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePermission } from "./permissions-context";
import { AlertTriangle, CheckCircle2, Cloud, Copy, HardDrive, Link2Off, Loader2, ShieldCheck } from "lucide-react";
import { api, apiUrl } from "../lib/api";
import { authenticatedFetch } from "../lib/auth";
import { ConfirmModal, type Notify } from "./ui";

type Run = { id: string; startedAt: string; finishedAt: string | null; trigger: "MANUAL" | "AUTO"; status: "RUNNING" | "OK" | "PARCIAL" | "ERROR"; fileName: string | null; sizeBytes: number | null; localResult: string | null; driveResult: string | null; message: string | null };
type BackupStatus = {
  running: boolean; destinoLocal: boolean; destinoDrive: boolean; autoEnabled: boolean; autoHour: number; subcarpeta: string; retentionDays: number;
  local: { hostDir: string; containerDir: string; effectiveDir: string; writable: boolean };
  drive: { connected: boolean; account: string | null; folderName: string | null };
  history: Run[];
};
type Draft = { destinoLocal: boolean; destinoDrive: boolean; autoEnabled: boolean; autoHour: number; subcarpeta: string; retentionDays: number };

const requestError = (reason: unknown) => reason instanceof Error ? reason.message : "No fue posible completar la operación.";
const when = (value: string) => new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
const megabytes = (bytes: number | null) => bytes == null ? "—" : bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
const hours = Array.from({ length: 24 }, (_, hour) => ({ value: String(hour), label: `${String(hour).padStart(2, "0")}:00` }));
const retentionOptions = [7, 14, 30, 60, 90, 180, 365];
const draftOf = (status: BackupStatus): Draft => ({ destinoLocal: status.destinoLocal, destinoDrive: status.destinoDrive, autoEnabled: status.autoEnabled, autoHour: status.autoHour, subcarpeta: status.subcarpeta, retentionDays: status.retentionDays });
const statusLabel = { OK: "Correcta", PARCIAL: "Parcial", ERROR: "Con error", RUNNING: "En curso" } as const;

export function BackupSection({ notify }: { notify: Notify }) {
  const can = usePermission();
  const canEdit = can("respaldos.editar");
  const canRun = can("respaldos.ejecutar");
  const [status, setStatus] = useState<BackupStatus | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [starting, setStarting] = useState(false);
  const [scriptUrl, setScriptUrl] = useState("");
  const [editingLink, setEditingLink] = useState(false);
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [copying, setCopying] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const wasRunning = useRef(false);
  const draftTouched = useRef(false);

  const load = useCallback((signal?: AbortSignal) => api<BackupStatus>("/configuracion/backups", { signal })
    .then((next) => {
      setStatus(next); setLoadError(null);
      setDraft((current) => (current && draftTouched.current ? current : draftOf(next)));
    })
    .catch((reason) => { if (!signal?.aborted) setLoadError(requestError(reason)); }), []);

  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort(); }, [load]);

  // Mientras hay una copia en curso se consulta el estado cada 2 segundos.
  useEffect(() => {
    if (!status?.running) {
      if (wasRunning.current) {
        wasRunning.current = false;
        const last = status?.history[0];
        if (last?.status === "OK") notify("La copia se generó correctamente.");
        else if (last?.status === "PARCIAL") notify("La copia se guardó solo en uno de los destinos. Revisá el detalle.", "warning");
        else if (last?.status === "ERROR") notify("La copia no se pudo generar. Revisá el detalle.", "error");
      }
      return;
    }
    wasRunning.current = true;
    const timer = window.setInterval(() => void load(), 2000);
    return () => window.clearInterval(timer);
  }, [status?.running, status?.history, load, notify]);

  if (loadError) return <section className="panel backup-section"><BackupHead /><p className="bk-alert bk-alert-error" role="alert">{loadError} <button type="button" className="button secondary" onClick={() => void load()}>Reintentar</button></p></section>;
  if (!status || !draft) return <section className="panel backup-section"><BackupHead /><div className="table-loading" role="status">Cargando copias de seguridad...</div></section>;

  const dirty = JSON.stringify(draft) !== JSON.stringify(draftOf(status));
  const set = (patch: Partial<Draft>) => { draftTouched.current = true; setDraft({ ...draft, ...patch }); };
  const noDestination = !draft.destinoLocal && !draft.destinoDrive;
  const last = status.history[0];
  const summary = [draft.destinoLocal && "esta PC", draft.destinoDrive && "Google Drive"].filter(Boolean).join(" y ");

  const save = async () => {
    setSaving(true);
    try {
      const next = await api<BackupStatus>("/configuracion/backups", { method: "PUT", body: JSON.stringify(draft) });
      setStatus(next); draftTouched.current = false; setDraft(draftOf(next));
      notify("Configuración de copias guardada.");
    } catch (reason) { notify(requestError(reason), "error"); } finally { setSaving(false); }
  };

  const runNow = async () => {
    setStarting(true);
    try { await api("/configuracion/backups/run", { method: "POST" }); await load(); }
    catch (reason) { notify(requestError(reason), "error"); await load(); } finally { setStarting(false); }
  };

  const copyScript = async () => {
    setCopying(true);
    try {
      const response = await authenticatedFetch(apiUrl("/configuracion/backups/drive/script"));
      if (!response.ok) throw new Error("No se pudo preparar el script. Probá de nuevo.");
      const code = await response.text();
      if (!navigator.clipboard) throw new Error("Este navegador no permite copiar. Probá con otro navegador.");
      await navigator.clipboard.writeText(code);
      notify("Script copiado. Pegalo en script.google.com.");
    } catch (reason) { notify(requestError(reason), "error"); } finally { setCopying(false); }
  };

  const link = async () => {
    setLinking(true); setLinkError(null);
    try {
      const next = await api<BackupStatus>("/configuracion/backups/drive/link", { method: "PUT", body: JSON.stringify({ scriptUrl: scriptUrl.trim() }) });
      setStatus(next); setScriptUrl(""); setEditingLink(false); draftTouched.current = false; setDraft(draftOf(next));
      notify(`Google Drive quedó vinculado como ${next.drive.account ?? "tu cuenta"}.`);
    } catch (reason) { setLinkError(requestError(reason)); } finally { setLinking(false); }
  };

  const disconnect = async () => {
    try {
      const next = await api<BackupStatus>("/configuracion/backups/drive/disconnect", { method: "POST" });
      setStatus(next); draftTouched.current = false; setDraft(draftOf(next)); notify("Google Drive desvinculado.");
    } catch (reason) { notify(requestError(reason), "error"); throw reason; }
  };

  const showLinkForm = !status.drive.connected || editingLink;

  return (
    <section className="panel backup-section" aria-labelledby="backup-title">
      <BackupHead />

      <ol className="bk-steps">
        <li className="bk-step">
          <StepTitle n={1} title="¿Dónde querés guardar las copias?" hint="Podés elegir uno o los dos. Lo más seguro es guardar en los dos: si la PC se rompe, la copia de Google Drive sigue disponible." />
          <div className="bk-options">
            <label className={`bk-option ${draft.destinoLocal ? "selected" : ""}`}>
              <input type="checkbox" checked={draft.destinoLocal} onChange={(event) => set({ destinoLocal: event.target.checked })} />
              <HardDrive size={22} aria-hidden="true" />
              <span><strong>En esta PC</strong><small>Rápido y no necesita internet. Pero si la PC se rompe o se pierde, la copia se pierde con ella.</small></span>
            </label>
            <label className={`bk-option ${draft.destinoDrive ? "selected" : ""} ${!status.drive.connected ? "disabled" : ""}`}>
              <input type="checkbox" checked={draft.destinoDrive} disabled={!status.drive.connected} onChange={(event) => set({ destinoDrive: event.target.checked })} />
              <Cloud size={22} aria-hidden="true" />
              <span><strong>En Google Drive</strong><small>{status.drive.connected ? "Queda en tu cuenta de Google, a salvo de cualquier problema de la PC. Necesita internet." : "Primero hay que vincular tu cuenta en el paso 2. Después podés marcar esta opción."}</small></span>
            </label>
          </div>
          {noDestination && <p className="bk-alert bk-alert-warning"><AlertTriangle size={16} aria-hidden="true" />Elegí al menos un lugar para poder guardar.</p>}
        </li>

        <li className="bk-step">
          <StepTitle n={2} title="Revisá cada lugar" hint="Acá ves a dónde va a ir cada copia y si está todo listo." />
          <div className="bk-card">
            <h3><HardDrive size={18} aria-hidden="true" />Esta PC</h3>
            <p>Las copias se guardan en esta carpeta de la PC:</p>
            <code className="bk-path">{status.local.effectiveDir}</code>
            <p className={`bk-state ${status.local.writable ? "ok" : "bad"}`}>{status.local.writable ? <><CheckCircle2 size={16} aria-hidden="true" />La carpeta funciona correctamente.</> : <><AlertTriangle size={16} aria-hidden="true" />No se puede escribir en esa carpeta. Revisá los permisos o la ruta configurada en la instalación.</>}</p>
            <label className="bk-field"><span>Subcarpeta (opcional)</span>
              <input value={draft.subcarpeta} maxLength={60} placeholder="Ej: diarias" onChange={(event) => set({ subcarpeta: event.target.value })} />
              <small>Si querés ordenar las copias en una carpeta propia dentro de la ruta de arriba. Si la dejás vacía, se guardan directamente ahí.</small>
            </label>
            <p className="bk-note">La carpeta principal la define quien instaló el sistema (archivo <code>.env</code>, variable <code>AVIANTO_BACKUP_DIR</code>). Para cambiarla seguí la sección «Cambiar la carpeta de las copias» del tutorial de instalación.</p>
          </div>

          <div className="bk-card">
            <h3><Cloud size={18} aria-hidden="true" />Google Drive</h3>
            {!showLinkForm ? <>
              <p className="bk-state ok"><CheckCircle2 size={16} aria-hidden="true" />Conectado como <strong>{status.drive.account}</strong>. Las copias se suben a la carpeta «{status.drive.folderName}» de tu Drive.</p>
              <div className="bk-actions">
                <button type="button" className="button secondary" disabled={!canEdit} onClick={() => setConfirmDisconnect(true)}><Link2Off size={16} aria-hidden="true" />Desvincular cuenta</button>
                <button type="button" className="button tertiary" disabled={!canEdit} onClick={() => { setScriptUrl(""); setLinkError(null); setEditingLink(true); }}>Cambiar script</button>
              </div>
            </> : <>
              <p>Avianto guarda las copias en tu Google Drive mediante un script que publicás desde tu propia cuenta de Google. No hace falta crear nada en la consola de Google. Se hace una sola vez y lleva unos 5 minutos.</p>
              <details className="bk-help">
                <summary>¿Cómo lo vinculo? Ver los pasos</summary>
                <ol>
                  <li>Tocá <strong>Copiar script</strong>. Se copia el código de Avianto al portapapeles. Contiene la clave de conexión: no lo compartas.</li>
                  <li>Entrá a <strong>script.google.com</strong> con la cuenta de Google donde querés guardar las copias. Tocá <strong>Nuevo proyecto</strong>, borrá lo que tenga y pegá el código.</li>
                  <li>Elegí la función <strong>probar</strong> en la barra de arriba y tocá <strong>Ejecutar</strong>. Google pide permisos para ver y crear archivos en tu Drive: aceptalos. Si aparece una advertencia de que la aplicación no está verificada, tocá <strong>Configuración avanzada</strong> y seguí. Es tu propio script.</li>
                  <li>Tocá <strong>Implementar</strong> → <strong>Nueva implementación</strong> → tipo <strong>Aplicación web</strong>. En «Ejecutar como» elegí <strong>Yo</strong> y en «Quién tiene acceso» elegí <strong>Cualquier persona</strong>. Tocá <strong>Implementar</strong>.</li>
                  <li>Copiá la <strong>URL de la aplicación web</strong> (termina en <code>/exec</code>) y pegala abajo.</li>
                </ol>
              </details>
              <div className="bk-actions">
                <button type="button" className="button primary" disabled={copying} onClick={() => void copyScript()}><Copy size={16} aria-hidden="true" />{copying ? "Copiando..." : "Copiar script"}</button>
              </div>
              <label className="bk-field"><span>URL de la aplicación web</span>
                <input value={scriptUrl} autoComplete="off" spellCheck={false} placeholder="https://script.google.com/macros/s/.../exec" onChange={(event) => { setScriptUrl(event.target.value); setLinkError(null); }} />
                <small>Tiene que empezar con <code>https://script.google.com/macros/s/</code> y terminar en <code>/exec</code>.</small>
              </label>
              {linkError && <p className="bk-alert bk-alert-error" role="alert"><AlertTriangle size={16} aria-hidden="true" />{linkError}</p>}
              <div className="bk-actions">
                <button type="button" className="button primary" disabled={!canEdit || !scriptUrl.trim() || linking} aria-busy={linking || undefined} onClick={() => void link()}>{linking ? "Probando conexión..." : "Vincular y probar"}</button>
                {editingLink && <button type="button" className="button tertiary" onClick={() => setEditingLink(false)}>Cancelar</button>}
              </div>
              <p className="bk-note">Si cambiás el código del script, volvé a implementarlo con Implementar → Administrar implementaciones → Editar → Nueva versión. Crear una «Nueva implementación» cambia la URL y hay que pegar la nueva acá.</p>
            </>}
          </div>
        </li>

        <li className="bk-step">
          <StepTitle n={3} title="Copia automática todos los días" hint="Opcional. Así no depende de que alguien se acuerde." />
          <label className="bk-switch"><input type="checkbox" role="switch" checked={draft.autoEnabled} onChange={(event) => set({ autoEnabled: event.target.checked })} /><span>Hacer una copia automática todos los días</span></label>
          {draft.autoEnabled && <div className="bk-auto">
            <label className="bk-field inline"><span>¿A qué hora?</span>
              <select value={String(draft.autoHour)} onChange={(event) => set({ autoHour: Number(event.target.value) })}>{hours.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
            </label>
            <p className="bk-note">Elegí un horario en que no se esté trabajando. La PC y el sistema tienen que estar encendidos: si estaban apagados a esa hora, la copia se hace apenas se enciendan ese mismo día.</p>
          </div>}
          <label className="bk-field inline"><span>¿Cuánto tiempo conservar las copias?</span>
            <select value={String(draft.retentionDays)} onChange={(event) => set({ retentionDays: Number(event.target.value) })}>{retentionOptions.map((days) => <option key={days} value={days}>{days} días</option>)}</select>
          </label>
          <p className="bk-note">Las copias más viejas se borran solas para no llenar el disco. Siempre se conservan las 3 más recientes. En Google Drive, las copias borradas van a la papelera de Drive.</p>
          <div className="bk-summary" aria-live="polite">
            <ShieldCheck size={18} aria-hidden="true" />
            <span>{noDestination ? "Todavía no elegiste dónde guardar." : draft.autoEnabled ? <>Se hará una copia <strong>todos los días a las {String(draft.autoHour).padStart(2, "0")}:00</strong> y se guardará en <strong>{summary}</strong>.</> : <>La copia automática está <strong>desactivada</strong>. Solo se harán copias cuando vos lo pidas (paso 4).</>}</span>
          </div>
          <div className="bk-actions">
            <button type="button" className="button primary" disabled={!canEdit || !dirty || noDestination || saving} aria-busy={saving || undefined} onClick={() => void save()}>{saving ? "Guardando..." : "Guardar configuración"}</button>
            {dirty && <span className="bk-note inline">Tenés cambios sin guardar.</span>}
          </div>
        </li>

        <li className="bk-step">
          <StepTitle n={4} title="Generar una copia ahora" hint="Hacela antes de cualquier cambio importante o antes de mudar el sistema a otra PC." />
          <div className="bk-actions">
            <button type="button" className="button primary" disabled={!canRun || status.running || starting || dirty || noDestination} onClick={() => void runNow()}>{status.running || starting ? <><Loader2 size={16} className="bk-spin" aria-hidden="true" />Generando copia...</> : "Generar copia ahora"}</button>
            {dirty && <span className="bk-note inline">Guardá la configuración (paso 3) para poder generar la copia.</span>}
          </div>
          {status.running && <p className="bk-note" role="status">La copia está en curso. Puede tardar unos minutos según la cantidad de fotos. Podés seguir usando el sistema.</p>}
          {last && last.status !== "RUNNING" && <div className={`bk-result ${last.status.toLowerCase()}`} role="status">
            <strong>{last.status === "OK" ? <CheckCircle2 size={18} aria-hidden="true" /> : <AlertTriangle size={18} aria-hidden="true" />}Última copia ({last.trigger === "AUTO" ? "automática" : "manual"}): {statusLabel[last.status]}</strong>
            <span>{when(last.startedAt)}{last.fileName ? ` · ${last.fileName} · ${megabytes(last.sizeBytes)}` : ""}</span>
            {last.localResult && <span>En esta PC: {last.localResult}</span>}
            {last.driveResult && <span>En Google Drive: {last.driveResult}</span>}
            {last.message && <span>{last.message}</span>}
          </div>}
          {status.history.length > 1 && <details className="bk-history"><summary>Ver historial de copias ({status.history.length})</summary>
            <ul>{status.history.map((run) => <li key={run.id}><span className={`bk-dot ${run.status.toLowerCase()}`} aria-hidden="true" /><div><strong>{when(run.startedAt)} · {run.trigger === "AUTO" ? "Automática" : "Manual"} · {statusLabel[run.status]}</strong><small>{run.fileName ? `${run.fileName} · ${megabytes(run.sizeBytes)}` : run.message ?? "—"}</small></div></li>)}</ul>
          </details>}
          <p className="bk-note">¿Necesitás recuperar una copia? Eso se hace desde la PC donde está instalado el sistema, no desde esta pantalla. Seguí la sección «Restaurar una copia» del tutorial de instalación.</p>
        </li>
      </ol>

      <ConfirmModal open={confirmDisconnect} title="Desvincular Google Drive" body="Avianto dejará de subir copias a tu Drive. Las copias que ya están en Drive no se borran, y el script queda en tu cuenta de Google (podés borrarlo cuando quieras). Si la copia automática usaba Drive, pasará a guardarse solo en esta PC." confirmLabel="Desvincular" onClose={() => setConfirmDisconnect(false)} onConfirm={async () => { setConfirmDisconnect(false); await disconnect(); }} />
    </section>
  );
}

function BackupHead() {
  return <div className="bk-head"><h2 id="backup-title">Copias de seguridad</h2><p>Una copia de seguridad guarda toda la información del taller (clientes, motos, fichas, pagos y fotos) en un archivo. Si la PC falla, se rompe o se pierde, esa copia permite recuperar todo. Seguí los 4 pasos de abajo.</p></div>;
}

function StepTitle({ n, title, hint }: { n: number; title: string; hint: string }) {
  return <div className="bk-step-title"><span className="bk-number" aria-hidden="true">{n}</span><div><h3>{title}</h3><p>{hint}</p></div></div>;
}
