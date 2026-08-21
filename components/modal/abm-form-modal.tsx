"use client";

import { useState, type FormEvent } from "react";
import { Dialog, SelectField, type SelectOption } from "../ui";
import { integerInput, parseIntegerInput, priceInput, yearInput } from "../../lib/format";
import type { ClienteResponse, MarcaMotoResponse } from "../../lib/types";

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
  onError,
}: {
  open: boolean;
  resource: string;
  mode: "agregar" | "modificar";
  fields: AbmField[];
  initialValues?: unknown;
  onClose: () => void;
  onSubmit: (values: Record<string, string>) => void | Promise<unknown>;
  onError?: (message: string) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const initial = initialValues && typeof initialValues === "object" ? initialValues as Record<string, string | number | boolean | null | undefined> : {};
  const valueFor = (field: AbmField) => {
    const value = values[field.key] ?? initial[field.key];
    if (field.type === "currency") return priceInput(value as number | string | null | undefined);
    if (field.type === "number") return field.key === "anio" ? yearInput(value as number | string | null | undefined) : integerInput(value as number | string | null | undefined);
    return String(value ?? "");
  };
  const baselineFor = (field: AbmField) => field.type === "number" ? (field.key === "anio" ? yearInput(initial[field.key] as number | string | null | undefined) : integerInput(initial[field.key] as number | string | null | undefined)) : field.type === "currency" ? priceInput(initial[field.key]) : String(initial[field.key] ?? "");
  const dirty = fields.some((field) => valueFor(field) !== baselineFor(field));
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      await onSubmit(Object.fromEntries(fields.map((field) => [field.key, field.type === "number" && valueFor(field).trim() ? String(parseIntegerInput(valueFor(field))) : valueFor(field)])));
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "No fue posible guardar el registro.";
      onError?.(message);
    } finally {
      setSaving(false);
    }
  };
  return (
    <Dialog
      open={open}
      title={`${mode === "agregar" ? "Agregar" : "Modificar"} ${resource}`}
      onClose={onClose}
      wide
      dirty={dirty}
    >
      <form
        className="record-form"
        onSubmit={(event) => void submit(event)}
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
              <SelectField
                value={valueFor(field)}
                onChange={(value) => setValues({ ...values, [field.key]: value })}
                disabled={field.readOnly}
                required={field.required}
                placeholder="Seleccionar"
                options={[...(field.options ?? [])]}
              />
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
                type={field.type === "currency" || field.type === "number" ? "text" : field.type ?? "text"}
                inputMode={field.type === "currency" ? "decimal" : field.type === "number" ? "numeric" : undefined}
                min={field.min}
                max={field.max}
                value={valueFor(field)}
                readOnly={field.readOnly}
                required={field.required}
                onBlur={(event) => field.type === "number" && setValues({ ...values, [field.key]: integerInput(event.target.value) })}
                onChange={(event) =>
                  setValues({ ...values, [field.key]: event.target.value })
                }
              />
            )}
          </label>
        ))}
        <div className="modal-actions">
          <button type="button" className="button secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button className="button primary" type="submit" disabled={saving}>
            {saving ? "Guardando..." : mode === "agregar" ? "Guardar" : "Guardar cambios"}
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
  onError,
}: {
  open: boolean;
  mode: "agregar" | "modificar";
  clientId?: string;
  clientName?: string;
  initialValues?: Record<string, string | number | boolean | null | undefined>;
  brands: MarcaMotoResponse[];
  clients?: ClienteResponse[];
  onClose: () => void;
  onSubmit: (values: Record<string, string>) => void;
  onError?: (message: string) => void;
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
      onError={onError}
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
         { key: "anio", label: "Año", type: "number", min: 1900, max: 2100 },
        { key: "kilometraje", label: "Kilometraje", type: "number", min: 0 },
        { key: "observaciones", label: "Observaciones", type: "textarea", wide: true },
      ]}
    />
  );
}
