"use client";

import { useEffect, useState } from "react";
import { Eye, Plus } from "lucide-react";
import { api } from "../lib/api";
import type { PageResponse, PerfilResponse } from "../lib/types";
import { EmptyState, Pagination, SearchBox, StatusBadge } from "./ui";

export function ProfilesView({ onNew, onOpen }: { onNew: () => void; onOpen: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<PageResponse<PerfilResponse> | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { void api<PageResponse<PerfilResponse>>("/perfiles", {}, { q: query || undefined, page: page - 1, size: 20 }).then(setResult).catch((reason) => setError(reason instanceof Error ? reason.message : "No se pudieron cargar los perfiles.")); }, [query, page]);
  return <div className="page"><div className="page-heading"><div><h1>Perfiles</h1><p>Información integral e historial de cada moto.</p></div><button className="button primary" onClick={onNew}><Plus size={19} />Nuevo perfil</button></div>{error && <p className="login-pending">{error}</p>}<section className="panel table-panel"><div className="filter-bar"><SearchBox value={query} onChange={(value) => { setQuery(value); setPage(1); }} placeholder="Dominio, moto o cliente" /></div>{result?.content.length ? <table><thead><tr><th>Dominio</th><th>Moto</th><th>Cliente</th><th>Kilometraje</th><th>Estado</th><th /></tr></thead><tbody>{result.content.map((profile) => <tr key={profile.id}><td data-label="Dominio"><strong>{profile.patente}</strong></td><td data-label="Moto">{profile.marca} {profile.modelo}</td><td data-label="Cliente">{profile.propietario ?? "Sin propietario"}</td><td data-label="Kilometraje">{profile.kilometraje?.toLocaleString("es-AR") ?? "—"}</td><td data-label="Estado"><StatusBadge status={profile.estado} /></td><td className="table-actions"><button onClick={() => onOpen(profile.id)} aria-label={`Ver perfil ${profile.patente}`}><Eye size={17} /></button></td></tr>)}</tbody></table> : <EmptyState title="No hay perfiles" body="Creá el primer Perfil de una moto." action={<button className="button primary" onClick={onNew}>Nuevo perfil</button>} />}<Pagination page={page} total={result?.totalPages || 1} onPage={setPage} /></section></div>;
}
