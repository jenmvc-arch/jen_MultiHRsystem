import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Archive,
  Check,
  ChevronRight,
  Edit3,
  Globe2,
  Loader2,
  Mail,
  Plus,
  Save,
  Sparkles,
  UserRound,
} from 'lucide-react';
import type { CorporateEntity, EmailTemplate } from '../types';
import {
  EMAIL_TEMPLATE_FUNCTIONS,
  EMAIL_TEMPLATE_PLACEHOLDERS,
  extractEmailTemplatePlaceholders,
  getEmailTemplateFunctionLabel,
  normalizeEmailTemplate,
} from '../lib/emailTemplateTypes';
import { isSupabaseConfigured } from '../lib/supabaseClient';

const STORAGE_KEY = 'offline_email_templates';

const isAccountPreview = () => (
  typeof window !== 'undefined'
  && new URLSearchParams(window.location.search).get('accountPreview') === '1'
);

interface EmailTemplateSetupViewProps {
  activeEntityId: string;
  entities: CorporateEntity[];
  currentUserName?: string | null;
  currentUserEmail?: string | null;
  onShowNotification: (title: string, message: string, type?: 'success' | 'info' | 'error') => void;
}

const BUILT_IN_PREVIEW_VALUES: Record<string, string> = {
  employee_name: 'Alicia Tan',
  date: '9 September 2026',
  entity_name: 'Red Point Sdn Bhd',
  payslip_type: 'Monthly Payslip',
  payroll_month: 'August',
  payroll_year: '2026',
  details: 'Your payroll document is ready for review.',
  status: 'approved',
  action_link: 'https://example.com/employee-portal',
  otp: '123456',
  action: 'sign in',
  request_subject: 'Update bank account details',
  category: 'Profile',
  priority: 'Normal',
};

const newTemplate = (entityId: string): EmailTemplate => ({
  id: '',
  entityId,
  name: 'New email template',
  assignedFunction: 'payslip_notification',
  subjectTemplate: 'Your payslip for {{payroll_month}} {{payroll_year}} is ready',
  bodyTemplate: 'Hello {{employee_name}},\n\nYour {{payslip_type}} for {{payroll_month}} {{payroll_year}} is ready.\n\n{{details}}',
  isActive: true,
  createdAt: '',
  updatedAt: '',
});

const readLocalTemplates = (): EmailTemplate[] => {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.map(normalizeEmailTemplate) : [];
  } catch {
    return [];
  }
};

const writeLocalTemplates = (templates: EmailTemplate[]) => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
};

const canUseLocalFallback = (error: any) => (
  /storage is not deployed|email template storage is not deployed|email_templates|schema cache/i.test(
    String(error?.message || ''),
  )
);

const escapePreviewHtml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const renderPreview = (value: string) => {
  const text = value.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => (
    BUILT_IN_PREVIEW_VALUES[key] ?? `{{${key}}}`
  ));
  return escapePreviewHtml(text).replace(/\r?\n/g, '<br />');
};

const apiRequest = async (path: string, init?: RequestInit) => {
  const response = await fetch(path, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `Email template request failed (${response.status}).`);
  return payload;
};

const payloadForTemplate = (template: EmailTemplate, actor?: string | null) => ({
  id: template.id || undefined,
  entityId: template.entityId || null,
  name: template.name,
  assignedFunction: template.assignedFunction,
  subjectTemplate: template.subjectTemplate,
  bodyTemplate: template.bodyTemplate,
  isActive: template.isActive,
  updatedBy: actor || undefined,
});

export default function EmailTemplateSetupView({
  activeEntityId,
  entities,
  currentUserName,
  currentUserEmail,
  onShowNotification,
}: EmailTemplateSetupViewProps) {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [draft, setDraft] = useState<EmailTemplate>(() => newTemplate(activeEntityId));
  const [selectedId, setSelectedId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [customFunction, setCustomFunction] = useState('');
  const subjectRef = useRef<HTMLTextAreaElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const useLocalStorage = !isSupabaseConfigured || isAccountPreview();

  const activeEntity = entities.find((entity) => entity.id === activeEntityId);
  const visibleTemplates = useMemo(() => templates
    .filter((template) => !template.entityId || template.entityId === activeEntityId)
    .sort((left, right) => {
      if (Boolean(left.entityId) !== Boolean(right.entityId)) return left.entityId ? -1 : 1;
      return Number(right.isActive) - Number(left.isActive)
        || right.updatedAt.localeCompare(left.updatedAt);
    }), [activeEntityId, templates]);

  const loadTemplates = async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      if (useLocalStorage) {
        setTemplates(readLocalTemplates());
        return;
      }
      const payload = await apiRequest('/api/admin/email-templates');
      setTemplates((payload.templates || []).map(normalizeEmailTemplate));
    } catch (error: any) {
      if (canUseLocalFallback(error)) {
        setTemplates(readLocalTemplates());
        setLoadError('Remote template storage is not deployed yet. Templates will be saved in this browser until the migration is applied.');
      } else {
        setLoadError(error?.message || 'Email templates could not be loaded.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadTemplates();
  }, [activeEntityId, useLocalStorage]);

  useEffect(() => {
    setDraft((current) => current.id ? current : newTemplate(activeEntityId));
  }, [activeEntityId]);

  const selectTemplate = (template: EmailTemplate) => {
    setSelectedId(template.id);
    setDraft({ ...template });
    setCustomFunction(template.assignedFunction.startsWith('custom:')
      ? template.assignedFunction.slice(7)
      : '');
  };

  const startNewTemplate = () => {
    setSelectedId('');
    setCustomFunction('');
    setDraft(newTemplate(activeEntityId));
  };

  const updateDraft = (updates: Partial<EmailTemplate>) => {
    setDraft((current) => ({ ...current, ...updates }));
  };

  const insertPlaceholder = (
    placeholder: string,
    target: 'subjectTemplate' | 'bodyTemplate',
  ) => {
    const ref = target === 'subjectTemplate' ? subjectRef.current : bodyRef.current;
    const value = draft[target];
    const insertion = `{{${placeholder}}}`;
    const start = ref?.selectionStart ?? value.length;
    const end = ref?.selectionEnd ?? start;
    const nextValue = `${value.slice(0, start)}${insertion}${value.slice(end)}`;
    updateDraft({ [target]: nextValue });
    requestAnimationFrame(() => {
      if (!ref) return;
      ref.focus();
      const cursor = start + insertion.length;
      ref.setSelectionRange(cursor, cursor);
    });
  };

  const validateDraft = () => {
    if (!draft.name.trim()) return 'Template name is required.';
    if (!draft.subjectTemplate.trim()) return 'Email title is required.';
    if (/[\r\n]/.test(draft.subjectTemplate)) return 'Email title cannot contain line breaks.';
    if (!draft.bodyTemplate.trim()) return 'Email content is required.';
    if (draft.assignedFunction.startsWith('custom:') && !/^custom:[a-z0-9][a-z0-9_-]{1,79}$/.test(draft.assignedFunction)) {
      return 'Custom function must use lowercase letters, numbers, hyphens or underscores.';
    }
    const placeholders = [
      ...extractEmailTemplatePlaceholders(draft.subjectTemplate),
      ...extractEmailTemplatePlaceholders(draft.bodyTemplate),
    ];
    const known: Set<string> = new Set(EMAIL_TEMPLATE_PLACEHOLDERS.map((item) => item.value));
    const unknown = [...new Set(placeholders)].filter((item) => !known.has(item));
    return unknown.length ? `Unknown placeholder(s): ${unknown.map((item) => `{{${item}}}`).join(', ')}` : '';
  };

  const saveTemplate = async () => {
    const validationError = validateDraft();
    if (validationError) {
      onShowNotification('Validation Error', validationError, 'error');
      return;
    }
    setIsSaving(true);
    try {
      const actor = currentUserEmail || currentUserName || 'admin';
      if (useLocalStorage) {
        const now = new Date().toISOString();
        const saved = {
          ...draft,
          id: draft.id || `email-template-${Date.now()}`,
          entityId: draft.entityId || undefined,
          createdAt: draft.createdAt || now,
          updatedAt: now,
          updatedBy: actor,
        };
        const next = readLocalTemplates()
          .filter((template) => template.id !== saved.id)
          .map((template) => (
            saved.isActive
              && template.assignedFunction === saved.assignedFunction
              && (template.entityId || '') === (saved.entityId || '')
              ? { ...template, isActive: false, updatedAt: now }
              : template
          ));
        next.unshift(saved);
        writeLocalTemplates(next);
        setTemplates(next);
        selectTemplate(saved);
      } else if (draft.id) {
        const payload = await apiRequest(`/api/admin/email-templates/${encodeURIComponent(draft.id)}`, {
          method: 'PATCH',
          body: JSON.stringify(payloadForTemplate(draft, actor)),
        });
        const saved = normalizeEmailTemplate(payload.template);
        setTemplates((current) => [
          saved,
          ...current.filter((template) => template.id !== saved.id && !(
            saved.isActive
            && template.isActive
            && template.assignedFunction === saved.assignedFunction
            && (template.entityId || '') === (saved.entityId || '')
          )),
        ]);
        selectTemplate(saved);
      } else {
        const payload = await apiRequest('/api/admin/email-templates', {
          method: 'POST',
          body: JSON.stringify(payloadForTemplate(draft, actor)),
        });
        const saved = normalizeEmailTemplate(payload.template);
        setTemplates((current) => [
          saved,
          ...current.filter((template) => !(
            saved.isActive
            && template.isActive
            && template.assignedFunction === saved.assignedFunction
            && (template.entityId || '') === (saved.entityId || '')
          )),
        ]);
        selectTemplate(saved);
      }
      onShowNotification('Template Saved', 'The email template has been saved and will remain available after refresh.', 'success');
    } catch (error: any) {
      if (useLocalStorage || canUseLocalFallback(error)) {
        const now = new Date().toISOString();
        const saved = {
          ...draft,
          id: draft.id || `email-template-${Date.now()}`,
          entityId: draft.entityId || undefined,
          createdAt: draft.createdAt || now,
          updatedAt: now,
          updatedBy: currentUserEmail || currentUserName || 'admin',
        };
        const next = readLocalTemplates()
          .filter((template) => template.id !== saved.id)
          .map((template) => (
            saved.isActive
              && template.assignedFunction === saved.assignedFunction
              && (template.entityId || '') === (saved.entityId || '')
              ? { ...template, isActive: false, updatedAt: now }
              : template
          ));
        next.unshift(saved);
        writeLocalTemplates(next);
        setTemplates(next);
        selectTemplate(saved);
        onShowNotification('Saved Locally', 'Remote template storage is not deployed yet. This template is safely retained in this browser.', 'info');
        return;
      }
      onShowNotification('Save Failed', error?.message || 'Email template could not be saved.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const deactivateTemplate = async () => {
    if (!draft.id) {
      updateDraft({ isActive: false });
      return;
    }
    setIsSaving(true);
    try {
      if (useLocalStorage) {
        const next = readLocalTemplates().map((template) => (
          template.id === draft.id ? { ...template, isActive: false, updatedAt: new Date().toISOString() } : template
        ));
        writeLocalTemplates(next);
        setTemplates(next);
        setDraft((current) => ({ ...current, isActive: false }));
      } else {
        const payload = await apiRequest(`/api/admin/email-templates/${encodeURIComponent(draft.id)}`, {
          method: 'PATCH',
          body: JSON.stringify(payloadForTemplate({ ...draft, isActive: false }, currentUserEmail || currentUserName)),
        });
        const saved = normalizeEmailTemplate(payload.template);
        setTemplates((current) => current.map((template) => template.id === saved.id ? saved : template));
        setDraft(saved);
      }
      onShowNotification('Template Deactivated', 'The template is now inactive and will not be used for new emails.', 'success');
    } catch (error: any) {
      if (useLocalStorage || canUseLocalFallback(error)) {
        const next = readLocalTemplates().map((template) => (
          template.id === draft.id ? { ...template, isActive: false, updatedAt: new Date().toISOString() } : template
        ));
        writeLocalTemplates(next);
        setTemplates(next);
        setDraft((current) => ({ ...current, isActive: false }));
        onShowNotification('Deactivated Locally', 'Remote template storage is not deployed yet. The template is inactive in this browser.', 'info');
        return;
      }
      onShowNotification('Update Failed', error?.message || 'Template could not be deactivated.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const onFunctionChange = (value: string) => {
    if (value === 'custom') {
      setCustomFunction('');
      updateDraft({ assignedFunction: 'custom:notification' });
      return;
    }
    setCustomFunction('');
    updateDraft({ assignedFunction: value });
  };

  const entityLabel = (entityId?: string) => (
    entityId ? entities.find((entity) => entity.id === entityId)?.name || entityId : 'Global fallback'
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col gap-5 rounded-2xl border border-neutral-border bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-primary">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <Mail className="h-4 w-4" />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Setup & Compliance</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">Email Template Setup</h1>
          <p className="mt-1 max-w-2xl text-sm text-on-surface-variant">
            Create reusable email titles and content for employee communications. Templates are saved by Entity and restored after refresh.
          </p>
        </div>
        <button
          type="button"
          onClick={startNewTemplate}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-xs font-bold text-on-primary-container transition hover:-translate-y-0.5"
        >
          <Plus className="h-4 w-4" /> New Template
        </button>
      </div>

      {loadError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {loadError}
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <section className="rounded-2xl border border-neutral-border bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-primary">Saved Templates</h2>
              <p className="mt-1 text-[11px] text-on-surface-variant">
                {activeEntity?.name || 'Current workspace'} and Global fallback
              </p>
            </div>
            {isLoading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
          </div>
          <div className="space-y-2">
            {!isLoading && visibleTemplates.length === 0 && (
              <div className="rounded-xl border border-dashed border-neutral-border px-4 py-8 text-center text-xs text-on-surface-variant">
                No saved templates for this Entity yet.
              </div>
            )}
            {visibleTemplates.map((template) => (
              <button
                type="button"
                key={template.id}
                onClick={() => selectTemplate(template)}
                className={`w-full rounded-xl border p-3 text-left transition ${
                  selectedId === template.id
                    ? 'border-primary bg-primary/5'
                    : 'border-neutral-border hover:border-primary/40 hover:bg-surface-container'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-on-surface">{template.name}</p>
                    <p className="mt-1 truncate text-[10px] text-on-surface-variant">
                      {getEmailTemplateFunctionLabel(template.assignedFunction)}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-on-surface-variant" />
                </div>
                <div className="mt-3 flex items-center gap-2 text-[10px] font-semibold">
                  {template.isActive ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">
                      <Check className="h-3 w-3" /> Active
                    </span>
                  ) : (
                    <span className="rounded-full bg-surface-container px-2 py-1 text-on-surface-variant">Inactive</span>
                  )}
                  {template.entityId ? (
                    <span className="inline-flex items-center gap-1 text-on-surface-variant"><BuildingIcon /> Entity</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-on-surface-variant"><Globe2 className="h-3 w-3" /> Global</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-neutral-border bg-white p-6 shadow-sm">
          <div className="mb-6 flex flex-col gap-3 border-b border-neutral-border pb-5 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Edit3 className="h-4 w-4 text-primary" />
                <h2 className="text-base font-bold text-primary">{draft.id ? 'Edit Email Template' : 'Create Email Template'}</h2>
              </div>
              <p className="mt-1 text-xs text-on-surface-variant">
                {draft.id ? `Last saved ${draft.updatedAt ? new Date(draft.updatedAt).toLocaleString() : 'recently'}.` : 'Start with a reusable message for the current workflow.'}
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-surface-container px-3 py-2 text-[11px] font-semibold text-on-surface-variant">
              <UserRound className="h-3.5 w-3.5" />
              {currentUserName || currentUserEmail || 'Administrator'}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="text-xs font-bold text-on-surface-variant">
              Template Name
              <input
                value={draft.name}
                onChange={(event) => updateDraft({ name: event.target.value })}
                className="mt-1.5 w-full rounded-xl border border-neutral-border px-3 py-2.5 text-sm font-normal text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                placeholder="e.g. Monthly Payslip Ready"
              />
            </label>
            <label className="text-xs font-bold text-on-surface-variant">
              Assign Function
              <select
                value={EMAIL_TEMPLATE_FUNCTIONS.some((item) => item.value === draft.assignedFunction) ? draft.assignedFunction : 'custom'}
                onChange={(event) => onFunctionChange(event.target.value)}
                className="mt-1.5 w-full rounded-xl border border-neutral-border bg-white px-3 py-2.5 text-sm font-normal text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
              >
                {EMAIL_TEMPLATE_FUNCTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                <option value="custom">Custom notification</option>
              </select>
            </label>
          </div>

          {draft.assignedFunction.startsWith('custom:') && (
            <label className="mt-4 block text-xs font-bold text-on-surface-variant">
              Custom Function Key
              <input
                value={customFunction || draft.assignedFunction.slice(7)}
                onChange={(event) => {
                  const value = event.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '');
                  setCustomFunction(value);
                  updateDraft({ assignedFunction: `custom:${value || 'notification'}` });
                }}
                className="mt-1.5 w-full rounded-xl border border-neutral-border px-3 py-2.5 text-sm font-normal text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                placeholder="employee-announcement"
              />
            </label>
          )}

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="text-xs font-bold text-on-surface-variant">
              Template Scope
              <select
                value={draft.entityId || ''}
                onChange={(event) => updateDraft({ entityId: event.target.value || undefined })}
                className="mt-1.5 w-full rounded-xl border border-neutral-border bg-white px-3 py-2.5 text-sm font-normal text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
              >
                <option value={activeEntityId}>{activeEntity?.name || 'Current Entity'}</option>
                <option value="">Global fallback</option>
              </select>
            </label>
            <div className="flex items-end">
              <label className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-neutral-border px-3 py-2.5 text-xs font-bold text-on-surface-variant">
                <span>
                  Active Template
                  <span className="mt-0.5 block text-[10px] font-normal">Only one active template per scope and function.</span>
                </span>
                <input
                  type="checkbox"
                  checked={draft.isActive}
                  onChange={(event) => updateDraft({ isActive: event.target.checked })}
                  className="h-4 w-4 accent-primary"
                />
              </label>
            </div>
          </div>

          <div className="mt-6">
            <label className="text-xs font-bold text-on-surface-variant">
              Email Title
              <textarea
                ref={subjectRef}
                value={draft.subjectTemplate}
                onChange={(event) => updateDraft({ subjectTemplate: event.target.value })}
                rows={2}
                className="mt-1.5 w-full resize-y rounded-xl border border-neutral-border px-3 py-2.5 text-sm font-normal text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                placeholder="Your payslip for {{payroll_month}} {{payroll_year}} is ready"
              />
            </label>
            <PlaceholderBar onInsert={(value) => insertPlaceholder(value, 'subjectTemplate')} />
          </div>

          <div className="mt-5">
            <label className="text-xs font-bold text-on-surface-variant">
              Email Content
              <textarea
                ref={bodyRef}
                value={draft.bodyTemplate}
                onChange={(event) => updateDraft({ bodyTemplate: event.target.value })}
                rows={10}
                className="mt-1.5 w-full resize-y rounded-xl border border-neutral-border px-3 py-2.5 text-sm font-normal leading-relaxed text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                placeholder={'Hello {{employee_name}},\n\nYour document is ready.'}
              />
            </label>
            <PlaceholderBar onInsert={(value) => insertPlaceholder(value, 'bodyTemplate')} />
          </div>

          <div className="mt-6 rounded-2xl border border-primary/15 bg-[#fcfaf6] p-4">
            <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-primary">
              <Sparkles className="h-3.5 w-3.5" /> Sample Preview
            </div>
            <div className="rounded-xl border border-neutral-border bg-white p-4">
              <p className="text-sm font-bold text-on-surface" dangerouslySetInnerHTML={{ __html: renderPreview(draft.subjectTemplate) }} />
              <div className="mt-3 border-t border-neutral-border pt-3 text-sm leading-6 text-on-surface-variant" dangerouslySetInnerHTML={{ __html: renderPreview(draft.bodyTemplate) }} />
            </div>
            <p className="mt-3 text-[10px] text-on-surface-variant">
              Preview values are examples only. Actual employee, date and payroll values are inserted when the email is sent.
            </p>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 border-t border-neutral-border pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-[11px] text-on-surface-variant">
              Scope: <span className="font-bold text-on-surface">{entityLabel(draft.entityId)}</span>
            </div>
            <div className="flex gap-2">
              {draft.id && draft.isActive && (
                <button
                  type="button"
                  onClick={() => void deactivateTemplate()}
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 rounded-xl border border-neutral-border px-4 py-2.5 text-xs font-bold text-on-surface-variant transition hover:border-amber-300 hover:text-amber-800 disabled:opacity-50"
                >
                  <Archive className="h-4 w-4" /> Deactivate
                </button>
              )}
              <button
                type="button"
                onClick={() => void saveTemplate()}
                disabled={isSaving}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-on-primary-container transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Template
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function PlaceholderBar({ onInsert }: { onInsert: (value: string) => void }) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Insert:</span>
      {EMAIL_TEMPLATE_PLACEHOLDERS.map((placeholder) => (
        <button
          type="button"
          key={placeholder.value}
          onClick={() => onInsert(placeholder.value)}
          className="rounded-full border border-neutral-border bg-white px-2 py-1 text-[10px] font-semibold text-primary transition hover:border-primary hover:bg-primary/5"
          title={`Insert {{${placeholder.value}}}`}
        >
          {`{{${placeholder.value}}}`}
        </button>
      ))}
    </div>
  );
}

function BuildingIcon() {
  return <span className="h-3 w-3 rounded-sm border border-current" aria-hidden="true" />;
}
