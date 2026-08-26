import React, { useEffect, useState } from 'react';
import { CheckCircle2, Clock3, MessageSquareText, Search, ShieldCheck } from 'lucide-react';
import {
  listAdminEmployeeRequests,
  updateAdminEmployeeRequest,
  updateAdminProfileChangeRequest,
} from '../lib/employeeServiceClient';
import {
  EmployeeProfileChangeRequest,
  EmployeeServiceRequest,
  EmployeeServiceRequestStatus,
} from '../lib/employeeServiceTypes';
import { CorporateEntity } from '../types';

interface EmployeeRequestsViewProps {
  entities: CorporateEntity[];
  onShowNotification: (title: string, message: string, type?: 'success' | 'info') => void;
}

const statuses: Array<EmployeeServiceRequestStatus | ''> = [
  '',
  'Open',
  'In Progress',
  'Waiting for Employee',
  'Resolved',
  'Closed',
];

const statusClass = (status: string) => (
  status === 'Resolved' || status === 'Closed'
    ? 'bg-emerald-100 text-emerald-800'
    : status === 'In Progress'
      ? 'bg-blue-100 text-blue-800'
      : 'bg-amber-100 text-amber-800'
);

export default function EmployeeRequestsView({
  entities,
  onShowNotification,
}: EmployeeRequestsViewProps) {
  const [requests, setRequests] = useState<EmployeeServiceRequest[]>([]);
  const [profileChanges, setProfileChanges] = useState<EmployeeProfileChangeRequest[]>([]);
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [entityId, setEntityId] = useState('');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [reply, setReply] = useState('');
  const [assignee, setAssignee] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const load = async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams();
      if (status) query.set('status', status);
      if (priority) query.set('priority', priority);
      if (entityId) query.set('entityId', entityId);
      if (search.trim()) query.set('search', search.trim());
      const result = await listAdminEmployeeRequests(query.toString());
      setRequests(result.requests);
      setProfileChanges(result.profileChanges);
      setSelectedId((current) => (
        result.requests.some((request) => request.id === current)
          ? current
          : result.requests[0]?.id || ''
      ));
    } catch (error) {
      onShowNotification('Employee requests unavailable', error instanceof Error ? error.message : 'Could not load employee requests.', 'info');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [status, priority, entityId]);

  const selectedRequest = requests.find((request) => request.id === selectedId) || null;

  const saveRequest = async (next?: {
    status?: EmployeeServiceRequestStatus;
    assignedTo?: string;
    message?: string;
  }) => {
    if (!selectedRequest || isSaving) return;
    setIsSaving(true);
    try {
      const result = await updateAdminEmployeeRequest({
        requestId: selectedRequest.id,
        ...next,
      });
      setRequests((previous) => previous.map((request) => request.id === result.request.id ? result.request : request));
      setReply('');
      setAssignee(result.request.assignedTo || '');
      onShowNotification('Request updated', 'The employee will see the latest status and reply in the portal.', 'success');
    } catch (error) {
      onShowNotification('Request update failed', error instanceof Error ? error.message : 'Could not update the employee request.', 'info');
    } finally {
      setIsSaving(false);
    }
  };

  const reviewProfileChange = async (change: EmployeeProfileChangeRequest, nextStatus: 'Approved' | 'Rejected') => {
    const confirmed = window.confirm(
      `${nextStatus} this ${change.changeType.replace('_', ' ')} request for ${change.employeeEmail}?\n\nThis action will ${nextStatus === 'Approved' ? 'write the requested values to the employee record' : 'close the request without changing the employee record'}.`
    );
    if (!confirmed) return;
    const note = window.prompt('Optional HR note:') || '';
    setIsSaving(true);
    try {
      const result = await updateAdminProfileChangeRequest({
        requestId: change.id,
        status: nextStatus,
        reviewNote: note,
      });
      setProfileChanges((previous) => previous.map((item) => item.id === result.request.id ? result.request : item));
      onShowNotification('Profile change reviewed', `${change.employeeEmail} was marked ${nextStatus.toLowerCase()}.`, 'success');
    } catch (error) {
      onShowNotification('Approval failed', error instanceof Error ? error.message : 'Could not review the profile change.', 'info');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">Employee self-service</p>
          <h1 className="mt-1 text-2xl font-bold text-on-background">Employee Requests</h1>
          <p className="mt-1 text-sm text-on-surface-variant">Manage HR conversations, service status, and sensitive profile approvals.</p>
        </div>
        <button type="button" onClick={() => void load()} className="min-h-11 rounded-xl border border-neutral-border bg-white px-4 py-2 text-sm font-semibold text-on-surface">
          Refresh queue
        </button>
      </div>

      <div className="grid gap-3 rounded-2xl border border-neutral-border bg-white p-4 md:grid-cols-4">
        <label className="flex items-center gap-2 rounded-xl border border-neutral-border px-3">
          <Search className="h-4 w-4 text-on-surface-variant" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void load(); }} placeholder="Search employee or subject" className="min-h-11 w-full text-sm outline-none" />
        </label>
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="min-h-11 rounded-xl border border-neutral-border bg-white px-3 text-sm">
          <option value="">All statuses</option>
          {statuses.filter(Boolean).map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <select value={priority} onChange={(event) => setPriority(event.target.value)} className="min-h-11 rounded-xl border border-neutral-border bg-white px-3 text-sm">
          <option value="">All priorities</option>
          <option value="Low">Low</option>
          <option value="Normal">Normal</option>
          <option value="High">High</option>
        </select>
        <select value={entityId} onChange={(event) => setEntityId(event.target.value)} className="min-h-11 rounded-xl border border-neutral-border bg-white px-3 text-sm">
          <option value="">All companies</option>
          {entities.map((entity) => <option key={entity.id} value={entity.id}>{entity.name}</option>)}
        </select>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <section className="rounded-2xl border border-neutral-border bg-white p-4">
          <div className="flex items-center justify-between border-b border-neutral-border pb-3">
            <h2 className="font-bold text-on-background">Request queue</h2>
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">{requests.length}</span>
          </div>
          <div className="mt-3 space-y-2">
            {isLoading ? <p className="p-6 text-center text-sm text-on-surface-variant">Loading queue...</p> : requests.length === 0 ? (
              <p className="rounded-xl bg-surface-container-low p-6 text-center text-sm text-on-surface-variant">No requests match the current filters.</p>
            ) : requests.map((request) => (
              <button type="button" key={request.id} onClick={() => { setSelectedId(request.id); setAssignee(request.assignedTo || ''); }} className={`w-full rounded-xl border p-3 text-left ${selectedId === request.id ? 'border-primary bg-primary/5' : 'border-neutral-border bg-white'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-on-background">{request.subject}</p>
                    <p className="mt-1 truncate text-xs text-on-surface-variant">{request.employeeName} · {request.category}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${statusClass(request.status)}`}>{request.status}</span>
                </div>
                <p className="mt-2 text-[11px] text-on-surface-variant">{request.priority} priority · {new Date(request.updatedAt).toLocaleString()}</p>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-neutral-border bg-white p-5">
          {selectedRequest ? (
            <>
              <div className="flex flex-col gap-3 border-b border-neutral-border pb-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">{selectedRequest.category}</p>
                  <h2 className="mt-1 text-xl font-bold text-on-background">{selectedRequest.subject}</h2>
                  <p className="mt-1 text-sm text-on-surface-variant">{selectedRequest.employeeName} · {selectedRequest.employeeEmail}</p>
                </div>
                <select value={selectedRequest.status} onChange={(event) => void saveRequest({ status: event.target.value as EmployeeServiceRequestStatus })} disabled={isSaving} className={`min-h-11 rounded-xl border border-neutral-border px-3 text-sm font-semibold ${statusClass(selectedRequest.status)}`}>
                  {statuses.filter(Boolean).map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </div>
              <div className="mt-5 space-y-3">
                {selectedRequest.messages.map((message) => (
                  <div key={message.id} className={`rounded-xl p-4 text-sm ${message.authorType === 'hr' ? 'bg-surface-container-low' : 'bg-primary/5'}`}>
                    <div className="flex items-center justify-between gap-3 text-xs font-semibold">
                      <span>{message.authorName}</span>
                      <span className="text-on-surface-variant">{new Date(message.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap leading-6 text-on-surface-variant">{message.body}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]">
                <input value={assignee} onChange={(event) => setAssignee(event.target.value)} placeholder="Assigned HR owner" className="min-h-11 rounded-xl border border-neutral-border px-3 text-sm outline-none focus:border-primary" />
                <button type="button" onClick={() => void saveRequest({ assignedTo: assignee })} disabled={isSaving} className="min-h-11 rounded-xl border border-neutral-border px-4 text-sm font-semibold">Save assignee</button>
              </div>
              <div className="mt-3 space-y-3">
                <textarea value={reply} onChange={(event) => setReply(event.target.value)} rows={4} placeholder="Reply to the employee..." className="w-full rounded-xl border border-neutral-border px-3 py-2 text-sm outline-none focus:border-primary" />
                <button type="button" onClick={() => void saveRequest({ message: reply })} disabled={isSaving || !reply.trim()} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                  <MessageSquareText className="h-4 w-4" /> Send reply
                </button>
              </div>
            </>
          ) : <p className="p-10 text-center text-sm text-on-surface-variant">Select a request to review.</p>}
        </section>
      </div>

      <section className="rounded-2xl border border-neutral-border bg-white p-5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <div>
            <h2 className="font-bold text-on-background">Sensitive profile approvals</h2>
            <p className="text-xs text-on-surface-variant">Approving a request applies only its whitelisted fields and writes an audit record.</p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {profileChanges.filter((change) => change.status === 'Pending').map((change) => (
            <div key={change.id} className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-amber-950">{change.employeeEmail}</p>
                  <p className="mt-1 text-xs text-amber-900">{change.changeType.replace('_', ' ')} · {new Date(change.createdAt).toLocaleString()}</p>
                </div>
                <Clock3 className="h-4 w-4 text-amber-700" />
              </div>
              <pre className="mt-3 max-h-32 overflow-auto rounded-lg bg-white/70 p-3 text-[11px] text-amber-950">{JSON.stringify(change.requestedValues, null, 2)}</pre>
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={() => void reviewProfileChange(change, 'Approved')} disabled={isSaving} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-700 px-3 py-2 text-xs font-bold text-white"><CheckCircle2 className="h-4 w-4" /> Approve</button>
                <button type="button" onClick={() => void reviewProfileChange(change, 'Rejected')} disabled={isSaving} className="min-h-11 rounded-xl border border-rose-300 bg-white px-3 py-2 text-xs font-bold text-rose-700">Reject</button>
              </div>
            </div>
          ))}
          {profileChanges.filter((change) => change.status === 'Pending').length === 0 && (
            <p className="rounded-xl bg-surface-container-low p-5 text-sm text-on-surface-variant">No pending sensitive profile changes.</p>
          )}
        </div>
      </section>
    </div>
  );
}
