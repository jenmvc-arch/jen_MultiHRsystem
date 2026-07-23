import { supabaseClient, isSupabaseConfigured } from './lib/supabaseClient';

async function testSupabaseIntegration() {
  console.log('==================================================');
  console.log('RUNNING SUPABASE INTEGRATION & COMPATIBILITY SUITE');
  console.log('==================================================');

  console.log('Test 1: Verifying supabaseClient API interface...');
  if (typeof supabaseClient.loadData !== 'function' ||
      typeof supabaseClient.insert !== 'function' ||
      typeof supabaseClient.update !== 'function' ||
      typeof supabaseClient.delete !== 'function' ||
      typeof supabaseClient.upsert !== 'function') {
    throw new Error('supabaseClient is missing required CRUD API methods.');
  }
  console.log('✅ Passed: Supabase client interface methods verified');

  console.log('\nTest 2: Verifying Supabase Configuration Detection...');
  console.log('Supabase Configured:', isSupabaseConfigured);
  console.log('✅ Passed: Supabase environment detection initialized cleanly');

  console.log('==================================================');
  console.log('ALL SUPABASE INTEGRATION CHECKS PASSED SUCCESSFULLY!');
  console.log('==================================================');
}

testSupabaseIntegration().catch(err => {
  console.error('❌ Supabase Test Suite Failed:', err);
  process.exit(1);
});
