import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

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

async function test() {
  const rawData = {
    id: 'CAND-TEST-888',
    name: 'Test Candidate Two',
    email: 'test2@example.com',
    entityId: 'ENT-92',
    stage: 'New',
    designation: 'Tester',
    dateJoined: '',
  };
  const snakeData = toSnakeCase(rawData);
  console.log('Inserting payload:', snakeData);
  const { data: iData, error: iError } = await supabase.from('candidates').insert([snakeData]);
  console.log('Insert result:', { iData, iError });
}

test();
