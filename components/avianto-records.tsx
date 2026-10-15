import type { ReactNode } from "react";
import { VehicleCard, VehicleField } from "./avianto-mobile";

type RecordField = { label: string; value: ReactNode; wide?: boolean };
export type AviantoRecord = {
  id: string;
  title: ReactNode;
  label?: string;
  fields: RecordField[];
  actions?: ReactNode;
};

/** The same document layout as Perfiles, with fields chosen by each module. */
export function AviantoRecordList({ records, label }: { records: AviantoRecord[]; label: string }) {
  return <ul className="avianto-record-list" aria-label={label}>
    {records.map((record) => <li key={record.id}>
      <VehicleCard variant="record" plate={record.title} label={record.label} action={record.actions && <div className="avianto-vehicle-actions">{record.actions}</div>}>
        {record.fields.map((field) => <VehicleField key={field.label} label={field.label} value={field.value ?? "—"} wide={field.wide} />)}
      </VehicleCard>
    </li>)}
  </ul>;
}
