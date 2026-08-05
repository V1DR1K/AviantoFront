"use client";

import { useState } from "react";
import { Dialog } from "../ui";

export type AbmField = {
  key: string;
  label: string;
  type?: "text" | "email" | "tel" | "number" | "textarea" | "select";
  options?: string[];
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
  const valueFor = (field: AbmField) =>
    values[field.key] ?? String(initialValues[field.key] ?? "");
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
                  <option key={option}>{option}</option>
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
                type={field.type ?? "text"}
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
  brands: string[];
  clients?: string[];
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
        cliente: clientName,
        clienteId: clientId,
      }}
      onClose={onClose}
      onSubmit={onSubmit}
      fields={[
        {
          key: "cliente",
          label: "Cliente",
          type: lockedClient ? "text" : "select",
          options: lockedClient ? undefined : clients,
          readOnly: lockedClient,
          required: true,
          wide: true,
        },
        {
          key: "marca",
          label: "Marca",
          type: "select",
          options: brands,
          required: true,
        },
        { key: "modelo", label: "Modelo", required: true },
        { key: "patente", label: "Patente" },
        { key: "anio", label: "Año", type: "number", min: 1950, max: 2030 },
        { key: "kilometraje", label: "Kilometraje", type: "number", min: 0 },
        { key: "color", label: "Color" },
        { key: "cilindrada", label: "Cilindrada" },
      ]}
    />
  );
}
