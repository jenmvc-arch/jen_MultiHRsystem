import { executeBulkPayslipZip, executeExport, writeExportAudit } from './exportService.js';
import { requireAdminSession } from './employeeAccountServer.js';

const sendError = (res: any, error: any) => {
  const message = error instanceof Error ? error.message : 'Export request failed.';
  res.status(Number(error?.statusCode || 500)).json({ error: message });
};

export async function handleExport(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }
  let actor: any;
  let request: any;
  try {
    actor = await requireAdminSession(req);
    request = req.body || {};
    if (!request.module || !request.format || !request.scope) {
      res.status(400).json({ error: 'module, format, and scope are required.' });
      return;
    }
    const result = request.format === 'zip'
      ? await executeBulkPayslipZip(actor, request)
      : await executeExport(actor, request);
    await writeExportAudit(actor, request, result, 'success');
    res.setHeader('Content-Type', request.format === 'xlsx'
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : request.format === 'pdf'
        ? 'application/pdf'
        : request.format === 'zip'
          ? 'application/zip'
          : request.format === 'csv'
            ? 'text/csv; charset=utf-8'
            : 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.status(200).send(result.buffer);
  } catch (error: any) {
    if (actor && request) await writeExportAudit(actor, request, { recordCount: 0, columns: request.columns || [] }, 'failed', error?.message);
    sendError(res, error);
  }
}
