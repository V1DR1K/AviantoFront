"use client";

import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { ClientCompletionRequest, ClientCompletionResponse } from "../lib/types";
import { Dialog, EmptyState, LoadingState } from "./ui";

const messageFor = (reason: unknown) => reason instanceof Error ? reason.message : "No se pudieron cargar los datos del cliente.";

export function ClientCompletionDialog({
  clientId,
  open,
  onClose,
  onSaved,
}: {
  clientId: string | null;
  open: boolean;
  onClose: () => void;
  onSaved: (client: ClientCompletionResponse) => void;
}) {
  const [client, setClient] = useState<ClientCompletionResponse | null>(null);
  const [draft, setDraft] = useState<ClientCompletionRequest>({ documento: "", telefono: "", email: "", direccion: "", observaciones: "" });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!open || !clientId) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setClient(null);
    void api<ClientCompletionResponse>(`/clientes/${clientId}/datos-completos`, { signal: controller.signal })
      .then((result) => {
        setClient(result);
        setDraft({ documento: result.documento ?? "", telefono: result.telefono ?? "", email: result.email ?? "", direccion: result.direccion ?? "", observaciones: result.observaciones ?? "" });
      })
      .catch((reason) => { if (!controller.signal.aborted) setError(messageFor(reason)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [clientId, open, retry]);

  const dirty = Boolean(client && ((draft.documento ?? "") !== (client.documento ?? "") || (draft.telefono ?? "") !== (client.telefono ?? "") || (draft.email ?? "") !== (client.email ?? "") || (draft.direccion ?? "") !== (client.direccion ?? "") || (draft.observaciones ?? "") !== (client.observaciones ?? "")));
  const save = async () => {
    if (!client || saving) return;
    setSaving(true);
    setError(null);
    try {
      const payload = Object.fromEntries(Object.entries(draft).map(([key, value]) => [key, value?.trim() ?? null])) as unknown as ClientCompletionRequest;
      const updated = await api<ClientCompletionResponse>(`/clientes/${client.id}/datos-completos`, { method: "PATCH", body: JSON.stringify(payload) });
      setClient(updated);
      onSaved(updated);
      onClose();
    } catch (reason) {
      setError(messageFor(reason));
    } finally {
      setSaving(false);
    }
  };

  return <Dialog open={open} title="Completar datos del cliente" onClose={() => !saving && onClose()} dirty={dirty}>
    {loading ? <LoadingState label="Cargando datos del cliente…" /> : error && !client ? <EmptyState title="No se pudieron cargar los datos del cliente" body={error} action={<button type="button" className="button secondary" onClick={() => setRetry((value) => value + 1)}>Reintentar</button>} /> : client ? <form className="record-form client-completion-form" onSubmit={(event) => { event.preventDefault(); void save(); }}>
      {error && <p className="form-notice" role="alert">{error}</p>}
      <p>Cliente: <strong>{client.nombre}</strong></p>
      <label>DNI<input type="text" inputMode="numeric" autoComplete="off" maxLength={50} value={draft.documento ?? ""} onChange={(event) => setDraft((value) => ({ ...value, documento: event.target.value }))} /></label>
      <label>Teléfono<input type="tel" autoComplete="tel" maxLength={50} value={draft.telefono ?? ""} onChange={(event) => setDraft((value) => ({ ...value, telefono: event.target.value }))} /></label>
      <label>Email<input type="email" autoComplete="email" maxLength={254} value={draft.email ?? ""} onChange={(event) => setDraft((value) => ({ ...value, email: event.target.value }))} /></label>
      <label>Dirección<input type="text" autoComplete="street-address" maxLength={500} value={draft.direccion ?? ""} onChange={(event) => setDraft((value) => ({ ...value, direccion: event.target.value }))} /></label>
      <label>Observaciones<textarea maxLength={2000} value={draft.observaciones ?? ""} onChange={(event) => setDraft((value) => ({ ...value, observaciones: event.target.value }))} /></label>
      <div className="modal-actions"><button type="button" className="button secondary" disabled={saving} onClick={onClose}>Cancelar</button><button className="button primary" disabled={saving || !dirty}>{saving ? "Guardando…" : "Guardar datos"}</button></div>
    </form> : <p className="summary-empty">Seleccioná un cliente para completar sus datos.</p>}
  </Dialog>;
}
