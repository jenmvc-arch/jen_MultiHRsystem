import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('No supabase credentials found in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function toSnakeCase(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const result = {};
  for (const key of Object.keys(obj)) {
    const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    let val = obj[key];
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

async function testAll() {
  const auditData = toSnakeCase({
          id: `log_${Date.now()}`,
          employeeEmail: 'test@example.com',
          changedBy: 'admin@acme.com',
          changeType: 'CREATE_EMPLOYEE',
          oldValue: '',
          newValue: '{"some": "value"}',
          createdAt: new Date().toISOString()
  });
  console.log('Testing audit_log insert...', auditData);
  const { error: aError } = await supabase.from('audit_logs').insert([auditData]);
  console.log('Audit Log Insert:', aError ? aError.message : 'Success');
}

testAll();
