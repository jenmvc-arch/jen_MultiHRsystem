import type { SupabaseClient } from '@supabase/supabase-js';
import {
  EMAIL_TEMPLATE_FUNCTIONS,
  EMAIL_TEMPLATE_PLACEHOLDER_VALUES,
  extractEmailTemplatePlaceholders,
} from '../../src/lib/emailTemplateTypes.js';
import { createMainAdminClient, requirePermission } from './employeeAccountServer.js';

const serviceError = (message: string, statusCode = 400) =>
  Object.assign(new Error(message), { statusCode });

const isMissingTable = (message: string) =>
  /email_templates|schema cache|could not find the table/i.test(message);

const normalizeScope = (value: unknown) => {
  const entityId = String(value || '').trim();
  return entityId || null;
};

const validateInput = (body: any) => {
  const name = String(body?.name || '').trim();
  const assignedFunction = String(body?.assignedFunction || body?.assigned_function || '').trim();
  const subjectTemplate = String(body?.subjectTemplate || body?.subject_template || '').trim();
  const bodyTemplate = String(body?.bodyTemplate || body?.body_template || '').trim();
  const entityId = normalizeScope(body?.entityId ?? body?.entity_id);
  const isActive = body?.isActive === undefined && body?.is_active === undefined
    ? true
    : body?.isActive !== false && body?.is_active !== false;

  if (!name || name.length > 120) throw serviceError('Template name is required and must be under 120 characters.');
  if (
    !EMAIL_TEMPLATE_FUNCTIONS.some((item) => item.value === assignedFunction)
    && !/^custom:[a-z0-9][a-z0-9_-]{1,79}$/.test(assignedFunction)
  ) {
    throw serviceError('Choose a valid email function.');
  }
  if (!subjectTemplate || subjectTemplate.length > 240) {
    throw serviceError('Email title is required and must be under 240 characters.');
  }
  if (/[\r\n]/.test(subjectTemplate)) {
    throw serviceError('Email title cannot contain line breaks.');
  }
  if (!bodyTemplate || bodyTemplate.length > 20000) {
    throw serviceError('Email content is required and must be under 20,000 characters.');
  }

  const placeholders = [
    ...extractEmailTemplatePlaceholders(subjectTemplate),
    ...extractEmailTemplatePlaceholders(bodyTemplate),
  ];
  const unknown = [...new Set(placeholders)].filter(
    (placeholder) => !EMAIL_TEMPLATE_PLACEHOLDER_VALUES.has(placeholder),
  );
  if (unknown.length) {
    throw serviceError(`Unknown placeholder(s): ${unknown.map((value) => `{{${value}}}`).join(', ')}`);
  }

  return {
    entity_id: entityId,
    name,
    assigned_function: assignedFunction,
    subject_template: subjectTemplate,
    body_template: bodyTemplate,
    is_active: isActive,
  };
};

const deactivateConflicts = async (
  client: SupabaseClient,
  values: { entity_id: string | null; assigned_function: string },
  excludeId?: string,
) => {
  let query = client
    .from('email_templates')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('assigned_function', values.assigned_function)
    .eq('is_active', true);
  query = values.entity_id === null ? query.is('entity_id', null) : query.eq('entity_id', values.entity_id);
  if (excludeId) query = query.neq('id', excludeId);
  const { error } = await query;
  if (error && !isMissingTable(error.message)) {
    throw new Error(`Existing active email template could not be archived: ${error.message}`);
  }
  if (error && isMissingTable(error.message)) throw serviceError('Email template storage is not deployed yet.', 503);
};

export const loadEmailTemplates = async (req: any) => {
  await requirePermission(req, 'admin.data.read');
  const { data, error } = await createMainAdminClient()
    .from('email_templates')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) {
    if (isMissingTable(error.message)) throw serviceError('Email template storage is not deployed yet.', 503);
    throw new Error(`Email templates could not be loaded: ${error.message}`);
  }
  return { templates: data || [] };
};

export const createEmailTemplate = async (req: any) => {
  const actor = await requirePermission(req, 'admin.data.write');
  const values = validateInput(req.body);
  const client = createMainAdminClient();
  if (values.is_active) await deactivateConflicts(client, values);
  const { data, error } = await client
    .from('email_templates')
    .insert({
      ...values,
      id: String(req.body?.id || '').trim() || undefined,
      created_by: actor.username,
      updated_by: actor.username,
    })
    .select('*')
    .single();
  if (error || !data) {
    if (isMissingTable(error?.message || '')) throw serviceError('Email template storage is not deployed yet.', 503);
    throw new Error(`Email template could not be saved: ${error?.message || 'unknown error'}`);
  }
  return { template: data };
};
export const updateEmailTemplate = async (req: any) => {
  const actor = await requirePermission(req, 'admin.data.write');
  const id = String(req.params?.id || req.query?.id || '').trim();
  if (!id) throw serviceError('Template id is required.');
  const values = validateInput(req.body);
  const client = createMainAdminClient();
  if (values.is_active) await deactivateConflicts(client, values, id);
  const { data, error } = await client
    .from('email_templates')
    .update({
      ...values,
      updated_by: actor.username,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single();
  if (error || !data) {
    if (isMissingTable(error?.message || '')) throw serviceError('Email template storage is not deployed yet.', 503);
    throw serviceError(`Email template could not be updated: ${error?.message || 'Template not found.'}`, data ? 400 : 404);
  }
  return { template: data };
};
