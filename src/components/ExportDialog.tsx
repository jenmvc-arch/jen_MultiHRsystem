import React, { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import type { ExportColumn, ExportFilterSet, ExportFormat, ExportModule, ExportRequest, ExportScope } from '../lib/exportTypes';
import { requestExport } from '../lib/exportClient';
import { canExportSensitive } from '../lib/exportPermissions';

interface ExportDialogProps {
  open: boolean;
  module: ExportModule;
  title: string;
  columns: ExportColumn[];
  filters?: ExportFilterSet;
  selectedRecordIds?: string[];
  currentUserRole?: string | null;
  onClose: () => void;
  onShowNotification: (title: string, message: string) => void;
}

const getDefaultSelectedColumns = (
  columns: ExportColumn[],
  currentUserRole: string | null | undefined,
  module: ExportModule,
) => columns
  .filter(column => !column.sensitive || canExportSensitive(currentUserRole, module))
  .map(column => column.key);

export default function ExportDialog({
  open, module, title, columns, filters, selectedRecordIds = [], currentUserRole, onClose, onShowNotification
}: ExportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>('xlsx');
  const [scope, setScope] = useState<ExportScope>(selectedRecordIds.length ? 'selected' : 'filtered');
  const [selectedColumns, setSelectedColumns] = useState<string[]>(
    getDefaultSelectedColumns(columns, currentUserRole, module),
  );
  const [includeHeader, setIncludeHeader] = useState(true);
  const [includeFilters, setIncludeFilters] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setScope(selectedRecordIds.length ? 'selected' : 'filtered');
      setSelectedColumns(getDefaultSelectedColumns(columns, currentUserRole, module));
    }
  }, [open, selectedRecordIds.length, columns, currentUserRole, module]);

  if (!open) return null;
  const allowedColumns = columns.filter(column => !column.sensitive || canExportSensitive(currentUserRole, module));

  const submit = async () => {
    if (!selectedColumns.length) {
      onShowNotification('Export', 'Select at least one column.');
      return;
    }
    setBusy(true);
    try {
      await requestExport({
        module, format, scope, filters, selectedRecordIds,
        columns: selectedColumns, includeHeader, includeFilters,
        orientation: selectedColumns.length > 7 ? 'landscape' : 'portrait',
      });
      onShowNotification('Export Complete', 'Your export file has been downloaded.');
      onClose();
    } catch (error: any) {
      onShowNotification('Export Failed', error.message || 'Unable to generate the export file.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label="Export data">
      <div className="w-full max-w-xl rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-neutral-border px-5 py-4">
          <div><h2 className="text-base font-bold text-primary">Export Data</h2><p className="mt-0.5 text-xs text-on-surface-variant">{title}</p></div>
          <button type="button" onClick={onClose} aria-label="Close export dialog"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-5 p-5 text-sm">
          <div>
            <label className="mb-2 block text-xs font-bold uppercase text-on-surface-variant">Format</label>
            <div className="grid grid-cols-4 gap-2">
              {(['pdf', 'xlsx', 'csv', 'txt'] as ExportFormat[]).map(value => (
                <label key={value} className={`cursor-pointer rounded border p-2 text-center text-xs font-bold ${format === value ? 'border-primary bg-primary/5 text-primary' : 'border-neutral-border'}`}>
                  <input className="sr-only" type="radio" checked={format === value} onChange={() => setFormat(value)} />
                  {value === 'xlsx' ? 'Excel' : value.toUpperCase()}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-2 block text-xs font-bold uppercase text-on-surface-variant">Scope</label>
            <select value={scope} onChange={event => setScope(event.target.value as ExportScope)} className="w-full rounded border border-neutral-border px-3 py-2 text-xs">
              {selectedRecordIds.length > 0 && <option value="selected">Selected records ({selectedRecordIds.length})</option>}
              <option value="filtered">Current filtered results</option>
              <option value="all">All permitted records</option>
              <option value="record">Current record</option>
            </select>
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between"><label className="text-xs font-bold uppercase text-on-surface-variant">Columns</label><button type="button" className="text-xs font-bold text-primary" onClick={() => setSelectedColumns(allowedColumns.map(column => column.key))}>Select All</button></div>
            <div className="grid max-h-40 grid-cols-1 gap-1 overflow-y-auto rounded border border-neutral-border p-2 sm:grid-cols-2">
              {allowedColumns.map(column => (
                <label
                  key={column.key}
                  className="flex min-h-10 min-w-0 cursor-pointer items-center gap-3 rounded-md px-2.5 py-2 text-xs hover:bg-primary/5"
                >
                  <input
                    type="checkbox"
                    checked={selectedColumns.includes(column.key)}
                    onChange={event => setSelectedColumns(value => event.target.checked ? [...value, column.key] : value.filter(item => item !== column.key))}
                    className="h-5 w-5 shrink-0 cursor-pointer accent-primary"
                  />
                  <span className="min-w-0 truncate">{column.label}</span>
                  {column.sensitive && <span className="shrink-0 text-[10px] text-amber-700">Sensitive</span>}
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-2 text-xs">
            <label className="flex min-h-8 cursor-pointer items-center gap-3"><input className="h-5 w-5 shrink-0 cursor-pointer accent-primary" type="checkbox" checked={includeHeader} onChange={event => setIncludeHeader(event.target.checked)} />Include report header</label>
            <label className="flex min-h-8 cursor-pointer items-center gap-3"><input className="h-5 w-5 shrink-0 cursor-pointer accent-primary" type="checkbox" checked={includeFilters} onChange={event => setIncludeFilters(event.target.checked)} />Include applied filters</label>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-neutral-border px-5 py-4">
          <button type="button" onClick={onClose} className="rounded border border-neutral-border px-4 py-2 text-xs font-bold">Cancel</button>
          <button type="button" disabled={busy} onClick={() => void submit()} className="inline-flex items-center gap-2 rounded bg-primary px-4 py-2 text-xs font-bold text-white disabled:opacity-50"><Download className="h-4 w-4" />{busy ? 'Preparing...' : 'Export'}</button>
        </div>
      </div>
    </div>
  );
}
