import React, { useState } from 'react';
import { Download } from 'lucide-react';
import type { ExportColumn, ExportFilterSet, ExportModule } from '../lib/exportTypes';
import { EXPORT_PERMISSIONS, hasExportPermission } from '../lib/exportPermissions';
import ExportDialog from './ExportDialog';

interface ExportButtonProps {
  module: ExportModule;
  title: string;
  columns: ExportColumn[];
  filters?: ExportFilterSet;
  selectedRecordIds?: string[];
  currentUserRole?: string | null;
  onShowNotification: (title: string, message: string) => void;
}

export default function ExportButton(props: ExportButtonProps) {
  const [open, setOpen] = useState(false);
  if (!hasExportPermission(props.currentUserRole, EXPORT_PERMISSIONS[props.module])) return null;
  return <>
    <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 rounded border border-primary/30 bg-primary/5 px-3 py-2 text-xs font-bold text-primary hover:bg-primary/10"><Download className="h-4 w-4" />Export</button>
    <ExportDialog {...props} open={open} onClose={() => setOpen(false)} />
  </>;
}
