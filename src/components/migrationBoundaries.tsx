import type { ChartEntryDraft, Visit } from "../types";

export interface VisitDateModalProps {
  visit: Visit;
  open: boolean;
  onCancel: () => void;
  onSave: (visit: Visit) => void;
}
export function VisitDateModal(_props: VisitDateModalProps) { return null; }

export interface ChartingSidebarProps { draft: ChartEntryDraft; disabled: boolean; }
export function ChartingSidebar(_props: ChartingSidebarProps) { return null; }
