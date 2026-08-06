"use client";

import { useState } from "react";
import { Dialog } from "../ui";
import { priceInput } from "../../lib/format";
import type { ClienteResponse, MarcaMotoResponse } from "../../lib/types";

export type SelectOption = { value: string; label: string };

export type AbmField = {
  key: string;
  label: string;
  type?: "text" | "email" | "tel" | "number" | "currency" | "textarea" | "select";
  options?: readonly SelectOption[];
  required?: boolean;
  readOnly?: boolean;
  wide?: boolean;
  min?: number;
  max?: number;
};

export function AbmFormModal({
  open,
  resource,
  mode,
  fields,
  initialValues = {},
  onClose,
  onSubmit,
}: {
  open: boolean;
  resource: string;
  mode: "agregar" | "modificar";
  fields: AbmField[];
  initialValues?: Record<string, string | number | boolean | undefined>;
  onClose: () => void;
  onSubmit: (values: Record<string, string>) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const valueFor = (field: AbmField) => values[field.key] ?? (field.type === "currency" ? priceInput(initialValues[field.key]) : String(initialValues[field.key] ?? ""));
  return (
    <Dialog
      open={open}
      title={`${mode === "agregar" ? "Agregar" : "Modificar"} ${resource}`}
      onClose={onClose}
      wide
    >
      <form
        className="record-form"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(
            Object.fromEntries(
              fields.map((field) => [field.key, valueFor(field)]),
            ),
          );
        }}
      >
        {fields.map((field) => (
          <label
            key={field.key}
            className={
              field.wide || field.type === "textarea"
                ? "form-field-wide"
                : undefined
            }
          >
            {field.label}
            {field.type === "select" || field.options ? (
              <select
                value={valueFor(field)}
                disabled={field.readOnly}
                required={field.required}
                onChange={(event) =>
                  setValues({ ...values, [field.key]: event.target.value })
                }
              >
                <option value="">Seleccionar</option>
                {field.options?.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            ) : field.type === "textarea" ? (
              <textarea
                value={valueFor(field)}
                readOnly={field.readOnly}
                required={field.required}
                onChange={(event) =>
                  setValues({ ...values, [field.key]: event.target.value })
                }
              />
            ) : (
              <input
                type={field.type === "currency" ? "text" : field.type ?? "text"}
                inputMode={field.type === "currency" ? "decimal" : undefined}
                min={field.min}
                max={field.max}
                value={valueFor(field)}
                readOnly={field.readOnly}
                required={field.required}
                onChange={(event) =>
                  setValues({ ...values, [field.key]: event.target.value })
                }
              />
            )}
          </label>
        ))}
        <div className="modal-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="button primary" type="submit">
            {mode === "agregar" ? "Guardar" : "Guardar cambios"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

export function VehicleAbmModal({
  open,
  mode,
  clientId,
  clientName,
  initialValues,
  brands,
  clients = [],
  onClose,
  onSubmit,
}: {
  open: boolean;
  mode: "agregar" | "modificar";
  clientId?: string;
  clientName?: string;
  initialValues?: Record<string, string | number | boolean | undefined>;
  brands: MarcaMotoResponse[];
  clients?: ClienteResponse[];
  onClose: () => void;
  onSubmit: (values: Record<string, string>) => void;
}) {
  const lockedClient = Boolean(clientId);
  return (
    <AbmFormModal
      open={open}
      resource="motovehículo"
      mode={mode}
      initialValues={{
        ...initialValues,
        clienteId: clientId ?? initialValues?.clienteId,
      }}
      onClose={onClose}
      onSubmit={onSubmit}
      fields={[
        {
          key: "clienteId",
          label: "Cliente",
          type: "select",
          options: lockedClient ? [{ value: clientId!, label: clientName ?? "Cliente" }] : clients.map((client) => ({ value: client.id, label: client.nombre })),
          readOnly: lockedClient,
          required: true,
          wide: true,
        },
        {
          key: "marcaId",
          label: "Marca",
          type: "select",
          options: brands.map((brand) => ({ value: brand.id, label: brand.nombre })),
          required: true,
        },
        { key: "modelo", label: "Modelo", required: true },
        { key: "patente", label: "Patente", required: true },
        { key: "anio", label: "Año", type: "number", min: 1950, max: 2030 },
        { key: "kilometraje", label: "Kilometraje", type: "number", min: 0 },
        { key: "observaciones", label: "Observaciones", type: "textarea", wide: true },
      ]}
    />
  );
}
