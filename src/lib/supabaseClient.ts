import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_SUPABASE_URL : process.env.VITE_SUPABASE_URL) || '';
const supabaseAnonKey = (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_SUPABASE_ANON_KEY : process.env.VITE_SUPABASE_ANON_KEY) || '';

export const isSupabaseConfigured = !!supabaseUrl && !!supabaseAnonKey && !supabaseUrl.includes('placeholder');

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

if (!isSupabaseConfigured) {
  console.warn(
    '[Supabase Config] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in your .env.local file. ' +
    'The app will operate using local persistence fallback.'
  );
}

export interface SupabaseDataPayload {
  corporate_entities: any[];
  employees: any[];
  performances: any[];
  users: any[];
  audit_logs: any[];
  candidates?: any[];
  payroll_records_2026?: any[];
}

// Helper to convert camelCase objects to snake_case for PostgreSQL columns
function toSnakeCase(obj: any): any {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const result: any = {};
  for (const key of Object.keys(obj)) {
    const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    let val = obj[key];
    
    // PostgreSQL strict typing protection: Convert empty strings to null for date/number/fk fields
    if (val === '') {
      if (
        snakeKey.includes('date') || 
        snakeKey.includes('time') || 
        snakeKey === 'progress' ||
        snakeKey === 'basic_salary' ||
        (snakeKey.includes('_id') && snakeKey !== 'id')
      ) {
        val = null;
      }
    }
    
    result[snakeKey] = val;
  }
  return result;
}

// Helper to convert snake_case DB columns to camelCase for TypeScript objects
function toCamelCase(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(toCamelCase);
  const result: any = {};
  for (const key of Object.keys(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = obj[key];
  }
  return result;
}

export const supabaseClient = {
  async loadData(): Promise<SupabaseDataPayload> {
    if (!supabase) {
      throw new Error('Supabase client is not configured.');
    }
    console.log('[Supabase Client] Fetching all tables...');

    const [entitiesRes, employeesRes, candidatesRes, performancesRes, payrollRes, usersRes, logsRes] = await Promise.all([
      supabase.from('corporate_entities').select('*'),
      supabase.from('employees').select('*'),
      supabase.from('candidates').select('*'),
      supabase.from('performances').select('*'),
      supabase.from('payroll_records_2026').select('*'),
      supabase.from('users').select('*'),
      supabase.from('audit_logs').select('*')
    ]);

    if (entitiesRes.error) console.error('[Supabase Error] Entities:', entitiesRes.error);
    if (employeesRes.error) console.error('[Supabase Error] Employees:', employeesRes.error);

    return {
      corporate_entities: (entitiesRes.data || []).map(toCamelCase),
      employees: (employeesRes.data || []).map(toCamelCase),
      candidates: (candidatesRes.data || []).map(toCamelCase),
      performances: (performancesRes.data || []).map(toCamelCase),
      payroll_records_2026: (payrollRes.data || []).map(toCamelCase),
      users: (usersRes.data || []).map(toCamelCase),
      audit_logs: (logsRes.data || []).map(toCamelCase)
    };
  },

  async insert(table: string, data: any): Promise<any> {
    if (!supabase) return data;
    console.log('[Supabase Client] Inserting record into:', table, data);
    const snakeData = toSnakeCase(data);
    const { data: inserted, error } = await supabase.from(table).insert(snakeData).select().single();
    if (error) {
      console.error('[Supabase Insert Error]', error);
      throw new Error(`Supabase Insert Failed: ${error.message}`);
    }
    return toCamelCase(inserted);
  },

  async update(table: string, idValue: string, data: any, idColumn: string = 'id'): Promise<any> {
    if (!supabase) return data;
    console.log('[Supabase Client] Updating record in:', table, { idColumn, idValue, data });
    const snakeColumn = idColumn.replace(/([A-Z])/g, '_$1').toLowerCase();
    const snakeData = toSnakeCase(data);
    const { data: updated, error } = await supabase
      .from(table)
      .update(snakeData)
      .eq(snakeColumn, idValue)
      .select();

    if (error) {
      console.error('[Supabase Update Error]', error);
      throw new Error(`Supabase Update Failed: ${error.message}`);
    }
    return updated && updated[0] ? toCamelCase(updated[0]) : data;
  },

  async delete(table: string, idValue: string, idColumn: string = 'id'): Promise<void> {
    if (!supabase) return;
    console.log('[Supabase Client] Deleting record from:', table, { idColumn, idValue });
    const snakeColumn = idColumn.replace(/([A-Z])/g, '_$1').toLowerCase();
    const { error } = await supabase
      .from(table)
      .delete()
      .eq(snakeColumn, idValue);

    if (error) {
      console.error('[Supabase Delete Error]', error);
      throw new Error(`Supabase Delete Failed: ${error.message}`);
    }
  },

  async upsert(table: string, data: any): Promise<any> {
    if (!supabase) return data;
    console.log('[Supabase Client] Upserting record in:', table, data);
    const snakeData = toSnakeCase(data);
    const { data: upserted, error } = await supabase.from(table).upsert(snakeData).select().single();
    if (error) {
      console.error('[Supabase Upsert Error]', error);
      throw new Error(`Supabase Upsert Failed: ${error.message}`);
    }
    return toCamelCase(upserted);
  },

  async uploadFile(file: File): Promise<string> {
    if (!supabase) {
      throw new Error('Supabase client is not configured.');
    }
    const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
    const { data, error } = await supabase.storage.from('hr-documents').upload(fileName, file);
    if (error) {
      console.error('[Supabase Storage Error]', error);
      throw new Error(`Upload Failed: ${error.message}`);
    }
    const { data: publicUrlData } = supabase.storage.from('hr-documents').getPublicUrl(data.path);
    return publicUrlData.publicUrl;
  }
};
