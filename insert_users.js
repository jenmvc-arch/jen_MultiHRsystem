import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('No supabase credentials found');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const usersToInsert = [
  {
    email: 'hr.redpoint',
    password: 'admin123#',
    name: 'HR Admin',
    role: 'Global Administrator'
  },
  {
    email: 'manager.redpoint',
    password: 'manager123#',
    name: 'Regional Manager',
    role: 'Regional Manager'
  },
  {
    email: 'leader.redpoint',
    password: 'leader123#',
    name: 'Team Leader',
    role: 'Leader'
  }
];

async function run() {
  for (const user of usersToInsert) {
    const { data, error } = await supabase
      .from('users')
      .upsert(user, { onConflict: 'email' }); // upsert so we don't crash if they already exist
    
    if (error) {
      console.error('Failed to insert', user.email, error);
    } else {
      console.log('Successfully inserted/updated', user.email);
    }
  }
}
run();
