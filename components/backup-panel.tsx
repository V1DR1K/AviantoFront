"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Cloud, Copy, HardDrive, Loader2, Link2Off, ShieldCheck } from "lucide-react";
import { api } from "../lib/api";
import { ConfirmModal, type Notify } from "./ui";

type Run = { id: string; startedAt: string; finishedAt: string | null; trigger: "MANUAL" | "AUTO"; status: "RUNNING" | "OK" | "PARCIAL" | "ERROR"; fileName: string | null; sizeBytes: number | null; localResult: string | null; driveResult: string | null; message: string | null };
type BackupStatus = {
  running: boolean; destinoLocal: boolean; destinoDrive: boolean; autoEnabled: boolean; autoHour: number; subcarpeta: string; retentionDays: number;
  local: { hostDir: string; containerDir: string; effectiveDir: string; writable: boolean };
  drive: { hasCredentials: boolean; clientId: string | null; connected: boolean; account: string | null; folderName: string | null; redirectUri: string };
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
  const [status, setStatus] = useState<BackupStatus | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [starting, setStarting] = useState(false);
  const [credentials, setCredentials] = useState({ clientId: "", clientSecret: "" });
  const [editingCredentials, setEditingCredentials] = useState(false);
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

  // Retorno desde Google después de vincular la cuenta.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get("drive");
    if (!result) return;
    if (result === "ok") notify("Google Drive quedó vinculado.");
    else notify(params.get("detalle") ?? "No se pudo vincular Google Drive.", "error");
    window.history.replaceState(null, "", window.location.pathname);
  }, [notify]);

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

  const saveCredentials = async () => {
    try {
      const next = await api<BackupStatus>("/configuracion/backups/drive/credentials", { method: "PUT", body: JSON.stringify(credentials) });
      setStatus(next); setEditingCredentials(false); setCredentials({ clientId: "", clientSecret: "" });
      draftTouched.current = false; setDraft(draftOf(next));
      notify("Datos de Google guardados. Ahora conectá tu cuenta.");
    } catch (reason) { notify(requestError(reason), "error"); }
  };

  const connect = async () => {
    try { const { url } = await api<{ url: string }>("/configuracion/backups/drive/connect", { method: "POST" }); window.location.assign(url); }
    catch (reason) { notify(requestError(reason), "error"); }
  };

  const disconnect = async () => {
    try {
      const next = await api<BackupStatus>("/configuracion/backups/drive/disconnect", { method: "POST" });
      setStatus(next); draftTouched.current = false; setDraft(draftOf(next)); notify("Google Drive desvinculado.");
    } catch (reason) { notify(requestError(reason), "error"); throw reason; }
  };

  const copyRedirect = () => { void navigator.clipboard?.writeText(status.drive.redirectUri).then(() => notify("Dirección copiada."), () => notify("No se pudo copiar. Seleccionala y copiala a mano.", "warning")); };
  const showCredentialForm = !status.drive.hasCredentials || editingCredentials;

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
            {status.drive.connected && !editingCredentials ? <>
              <p className="bk-state ok"><CheckCircle2 size={16} aria-hidden="true" />Conectado como <strong>{status.drive.account}</strong>. Las copias se suben a la carpeta «{status.drive.folderName}» de tu Drive.</p>
              <div className="bk-actions">
                <button type="button" className="button secondary" onClick={() => setConfirmDisconnect(true)}><Link2Off size={16} aria-hidden="true" />Desvincular cuenta</button>
                <button type="button" className="button tertiary" onClick={() => { setCredentials({ clientId: status.drive.clientId ?? "", clientSecret: "" }); setEditingCredentials(true); }}>Cambiar datos de Google</button>
              </div>
            </> : <>
              {showCredentialForm ? <>
                <p>Para que Avianto pueda guardar archivos en <em>tu</em> Google Drive, Google pide crear una «llave» gratuita a nombre de tu cuenta. Se hace una sola vez y lleva unos 10 minutos.</p>
                <details className="bk-help">
                  <summary>¿Cómo la creo? Ver los pasos</summary>
                  <ol>
                    <li>Entrá a <strong>console.cloud.google.com</strong> con la cuenta de Google donde querés guardar las copias y creá un proyecto nuevo (por ejemplo «Avianto»).</li>
                    <li>En el buscador escribí <strong>Google Drive API</strong>, abrila y tocá <strong>Habilitar</strong>.</li>
                    <li>Abrí el menú <strong>Google Auth Platform</strong> (antes «Pantalla de consentimiento de OAuth») y tocá <strong>Comenzar</strong>. Nombre de la app: «Avianto»; email de asistencia: el tuyo; <strong>Público: Externo</strong>.</li>
                    <li>En <strong>Público</strong> (Audience) tocá <strong>Publicar la app</strong> / <strong>En producción</strong>. Si queda en «Prueba», Google corta la conexión cada 7 días.</li>
                    <li>En <strong>Clientes</strong> tocá <strong>Crear cliente</strong>. Tipo de aplicación: <strong>Aplicación web</strong>.</li>
                    <li>En <strong>URIs de redireccionamiento autorizados</strong> pegá exactamente esta dirección: <code className="bk-path inline">{status.drive.redirectUri}</code> <button type="button" className="button tertiary bk-inline-button" onClick={copyRedirect}><Copy size={14} aria-hidden="true" />Copiar</button></li>
                    <li>Google muestra el <strong>ID de cliente</strong> y el <strong>Secreto de cliente</strong>. Copiá el secreto en ese momento (después no se vuelve a mostrar) y pegá los dos en los campos de abajo.</li>
                  </ol>
                </details>
                <label className="bk-field"><span>ID de cliente</span><input value={credentials.clientId} autoComplete="off" spellCheck={false} placeholder="123456789-abc.apps.googleusercontent.com" onChange={(event) => setCredentials({ ...credentials, clientId: event.target.value })} /></label>
                <label className="bk-field"><span>Secreto de cliente</span><input type="password" value={credentials.clientSecret} autoComplete="new-password" spellCheck={false} placeholder={status.drive.hasCredentials ? "Dejalo vacío para conservar el actual" : "GOCSPX-..."} onChange={(event) => setCredentials({ ...credentials, clientSecret: event.target.value })} /></label>
                <div className="bk-actions">
                  <button type="button" className="button primary" disabled={!credentials.clientId.trim() || (!credentials.clientSecret.trim() && !status.drive.hasCredentials)} onClick={() => void saveCredentials()}>Guardar datos de Google</button>
                  {editingCredentials && <button type="button" className="button tertiary" onClick={() => setEditingCredentials(false)}>Cancelar</button>}
                </div>
              </> : <>
                <p className="bk-state warn"><AlertTriangle size={16} aria-hidden="true" />Los datos de Google están guardados, pero falta conectar tu cuenta.</p>
                <p>Al tocar el botón se abre Google: elegí tu cuenta y aceptá. Avianto solo podrá ver los archivos que ella misma cree (la carpeta «Avianto Backups»), nunca el resto de tu Drive.</p>
                <div className="bk-actions">
                  <button type="button" className="button primary" onClick={() => void connect()}><Cloud size={16} aria-hidden="true" />Conectar con Google</button>
                  <button type="button" className="button tertiary" onClick={() => { setCredentials({ clientId: status.drive.clientId ?? "", clientSecret: "" }); setEditingCredentials(true); }}>Cambiar datos de Google</button>
                </div>
              </>}
              {status.drive.connected && editingCredentials && <p className="bk-note">Al guardar nuevos datos se desvincula la cuenta actual y habrá que conectarla otra vez.</p>}
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
          <p className="bk-note">Las copias más viejas se borran solas para no llenar el disco. Siempre se conservan las 3 más recientes.</p>
          <div className="bk-summary" aria-live="polite">
            <ShieldCheck size={18} aria-hidden="true" />
            <span>{noDestination ? "Todavía no elegiste dónde guardar." : draft.autoEnabled ? <>Se hará una copia <strong>todos los días a las {String(draft.autoHour).padStart(2, "0")}:00</strong> y se guardará en <strong>{summary}</strong>.</> : <>La copia automática está <strong>desactivada</strong>. Solo se harán copias cuando vos lo pidas (paso 4).</>}</span>
          </div>
          <div className="bk-actions">
            <button type="button" className="button primary" disabled={!dirty || noDestination || saving} aria-busy={saving || undefined} onClick={() => void save()}>{saving ? "Guardando..." : "Guardar configuración"}</button>
            {dirty && <span className="bk-note inline">Tenés cambios sin guardar.</span>}
          </div>
        </li>

        <li className="bk-step">
          <StepTitle n={4} title="Generar una copia ahora" hint="Hacela antes de cualquier cambio importante o antes de mudar el sistema a otra PC." />
          <div className="bk-actions">
            <button type="button" className="button primary" disabled={status.running || starting || dirty || noDestination} onClick={() => void runNow()}>{status.running || starting ? <><Loader2 size={16} className="bk-spin" aria-hidden="true" />Generando copia...</> : "Generar copia ahora"}</button>
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

      <ConfirmModal open={confirmDisconnect} title="Desvincular Google Drive" body="Avianto dejará de subir copias a tu Drive. Las copias que ya están en Drive no se borran. Si la copia automática usaba Drive, pasará a guardarse solo en esta PC." confirmLabel="Desvincular" onClose={() => setConfirmDisconnect(false)} onConfirm={async () => { setConfirmDisconnect(false); await disconnect(); }} />
    </section>
  );
}

function BackupHead() {
  return <div className="bk-head"><h2 id="backup-title">Copias de seguridad</h2><p>Una copia de seguridad guarda toda la información del taller (clientes, motos, fichas, pagos y fotos) en un archivo. Si la PC falla, se rompe o se pierde, esa copia permite recuperar todo. Seguí los 4 pasos de abajo.</p></div>;
}

function StepTitle({ n, title, hint }: { n: number; title: string; hint: string }) {
  return <div className="bk-step-title"><span className="bk-number" aria-hidden="true">{n}</span><div><h3>{title}</h3><p>{hint}</p></div></div>;
}
