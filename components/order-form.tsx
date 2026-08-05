"use client";
import { useMemo, useRef, useState } from "react";
import { Camera, FileDown, Plus, Save, X } from "lucide-react";
import { catalog, clients, vehicles } from "../lib/mock-data";
import { money } from "../lib/format";
import { exportPdf } from "../lib/export";
import type { DocumentType, PedidoItemResponse } from "../lib/types";

export function OrderForm({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (payload: {
    cliente: string;
    moto: string;
    patente: string;
    documento: DocumentType;
    items: PedidoItemResponse[];
    total: number;
    observaciones: string;
  }) => void;
}) {
  const [clientId, setClientId] = useState(clients[0].id);
  const [vehicleId, setVehicleId] = useState(vehicles[0].id);
  const [documento, setDocumento] = useState<DocumentType>("Presupuesto");
  const [items, setItems] = useState<PedidoItemResponse[]>([
    {
      id: "new-1",
      descripcion: "Diagnóstico eléctrico",
      tipo: "Trabajo",
      cantidad: 1,
      precioUnitario: 18500,
      descuento: 0,
      subtotal: 18500,
    },
  ]);
  const [notes, setNotes] = useState("");
  const [query, setQuery] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const photoInput = useRef<HTMLInputElement>(null);
  const currentVehicle =
    vehicles.find((v) => v.id === vehicleId) ?? vehicles[0];
  const filteredCatalog = catalog
    .filter((item) =>
      item.descripcion.toLowerCase().includes(query.toLowerCase()),
    )
    .slice(0, 4);
  const subtotal = useMemo(
    () =>
      items.reduce(
        (sum, item) =>
          sum + item.cantidad * item.precioUnitario - item.descuento,
        0,
      ),
    [items],
  );
  const iva = documento === "Factura" ? subtotal * 0.21 : 0;
  const total = subtotal + iva;
  const addItem = (name: string, type: "Pieza" | "Trabajo", price: number) =>
    setItems((previous) => [
      ...previous,
      {
        id: `new-${Date.now()}`,
        descripcion: name,
        tipo: type,
        cantidad: 1,
        precioUnitario: price,
        descuento: 0,
        subtotal: price,
      },
    ]);
  return (
    <section className="order-form">
      <div className="page-heading">
        <div>
          <h1>Nuevo pedido</h1>
          <p>
            Capturá el diagnóstico ahora; Administración podrá completar precios
            y condiciones después.
          </p>
        </div>
        <button className="button secondary" onClick={onClose}>
          <X size={18} />
          Cerrar
        </button>
      </div>
      <div className="form-layout">
        <div className="form-stack">
          <section className="form-section">
            <h2>1. Cliente y motovehículo</h2>
            <div className="two-col">
              <label>
                Cliente
                <select
                  value={clientId}
                  onChange={(e) => {
                    setClientId(e.target.value);
                    const next = vehicles.find(
                      (v) => v.clienteId === e.target.value,
                    );
                    if (next) setVehicleId(next.id);
                  }}
                >
                  {clients.map((client) => (
                    <option value={client.id} key={client.id}>
                      {client.nombre} · {client.telefono}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Moto
                <select
                  value={vehicleId}
                  onChange={(e) => setVehicleId(e.target.value)}
                >
                  {vehicles
                    .filter((vehicle) => vehicle.clienteId === clientId)
                    .map((vehicle) => (
                      <option value={vehicle.id} key={vehicle.id}>
                        {vehicle.marca} {vehicle.modelo} · {vehicle.patente}
                      </option>
                    ))}
                </select>
              </label>
            </div>
          </section>
          <section className="form-section">
            <h2>2. Ítems y reparación</h2>
            <label className="catalog-search">
              Buscar en catálogo
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ej.: cambio de aceite"
              />
              {query && (
                <div className="suggestions">
                  {filteredCatalog.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        addItem(item.descripcion, item.tipo, item.precioBase);
                        setQuery("");
                      }}
                    >
                      <span>{item.descripcion}</span>
                      <small>
                        {item.tipo} · {money(item.precioBase)}
                      </small>
                    </button>
                  ))}
                </div>
              )}
            </label>
            <div className="line-items">
              {items.map((item) => (
                <div className="line-item" key={item.id}>
                  <div>
                    <strong>{item.descripcion}</strong>
                    <span>{item.tipo}</span>
                  </div>
                  <label>
                    Cant.
                    <input
                      type="number"
                      min="1"
                      value={item.cantidad}
                      onChange={(e) =>
                        setItems((all) =>
                          all.map((line) =>
                            line.id === item.id
                              ? { ...line, cantidad: Number(e.target.value) }
                              : line,
                          ),
                        )
                      }
                    />
                  </label>
                  <label>
                    Precio
                    <input
                      type="number"
                      value={item.precioUnitario}
                      onChange={(e) =>
                        setItems((all) =>
                          all.map((line) =>
                            line.id === item.id
                              ? {
                                  ...line,
                                  precioUnitario: Number(e.target.value),
                                }
                              : line,
                          ),
                        )
                      }
                    />
                  </label>
                  <strong>
                    {money(
                      item.cantidad * item.precioUnitario - item.descuento,
                    )}
                  </strong>
                  <button
                    aria-label={`Eliminar ${item.descripcion}`}
                    onClick={() =>
                      setItems((all) =>
                        all.filter((line) => line.id !== item.id),
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
              onClick={() => addItem("Ítem personalizado", "Trabajo", 0)}
            >
              <Plus size={17} />
              Agregar ítem personalizado
            </button>
          </section>
          <section className="form-section">
            <h2>3. Fotos y observaciones</h2>
            <label>
              Observaciones
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Describí la falla o las piezas detectadas si no encontraste el ítem exacto."
              />
            </label>
            <input ref={photoInput} hidden type="file" accept="image/*" multiple onChange={(event)=>setPhotos(Array.from(event.target.files??[]).map(file=>file.name))}/>
            <button className="photo-button" onClick={()=>photoInput.current?.click()}>
              <Camera size={19} />
              Adjuntar fotos <small>Se guardarán como base64 en el MVP</small>
            </button>
            {photos.length > 0 && <p className="photo-count">{photos.length} archivos listos para adjuntar.</p>}
          </section>
        </div>
        <aside className="summary">
          <h2>Resumen del pedido</h2>
          <div>
            <span>Moto</span>
            <strong>
              {currentVehicle.marca} {currentVehicle.modelo}
            </strong>
          </div>
          <div>
            <span>Patente</span>
            <strong>{currentVehicle.patente}</strong>
          </div>
          <hr />
          <div>
            <span>Subtotal</span>
            <strong>{money(subtotal)}</strong>
          </div>
          <label className="document-type">
            Tipo de documento
            <select
              value={documento}
              onChange={(e) => setDocumento(e.target.value as DocumentType)}
            >
              <option>Presupuesto</option>
              <option>Factura</option>
            </select>
          </label>
          <div>
            <span>IVA {documento === "Factura" ? "21%" : "(no aplicado)"}</span>
            <strong>{money(iva)}</strong>
          </div>
          <div className="total">
            <span>Total final</span>
            <strong>{money(total)}</strong>
          </div>
          <button
            className="button primary large"
            onClick={() =>
              onSave({
                cliente: clients.find((c) => c.id === clientId)?.nombre ?? "",
                moto: `${currentVehicle.marca} ${currentVehicle.modelo}`,
                patente: currentVehicle.patente,
                documento,
                items,
                total,
                observaciones: notes,
              })
            }
          >
            <Save size={19} />
            Guardar pedido
          </button>
          <button className="button secondary" onClick={()=>exportPdf("PREVISUALIZACION", clients.find((c)=>c.id===clientId)?.nombre??"", total)}>
            <FileDown size={18} />
            Vista previa PDF
          </button>
        </aside>
      </div>
    </section>
  );
}
