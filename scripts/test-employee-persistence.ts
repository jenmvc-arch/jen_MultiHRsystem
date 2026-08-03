import { config } from 'dotenv';
import { formatNricOrPassport } from '../src/lib/employeeInput';

config({ path: '.env.local' });

async function main() {
  const { createClient } = await import('@supabase/supabase-js');
  const { supabaseClient } = await import('../src/lib/supabaseClient');
  const url = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required.');
  }

  const raw = createClient(url, anonKey);
  const token = Date.now();
  const id = `codex-save-test-${token}`;
  const email = `${id}@example.invalid`;
  const candidateId = `CAN-${token}`;

  try {
    await supabaseClient.insert('employees', {
      id,
      entityId: 'ENT-92',
      name: 'Employee Persistence Test',
      email,
      designation: 'Test Record',
      department: 'Human Resources',
      status: 'Active',
      bankName: 'RedPoint Cooperative Bank',
      accountNo: '123456789012',
      basicSalary: 4000,
      housingAllowance: 0,
      transportAllowance: 0,
      overtime: 0,
      performanceBonus: 0,
      optInEpf: true,
      optInSocso: true,
      optInEis: true,
      optInPcb: true,
      enableLindung24: false,
      nricPassport: formatNricOrPassport('900101145566'),
      nationality: 'Malaysian',
      contactNumber: '+60 12-345 6789',
      taxNumber: 'SG1234567890',
      epfNumber: '123456789',
      employmentType: 'Permanent',
      maritalStatus: 'Single',
      eligibleForStatutory: 'Yes',
      emergencyContactName: 'Emergency Contact',
      emergencyContactRelation: 'Sibling',
      emergencyContactPhone: '+60 12-987 6543',
      dateOfJoined: '2026-08-03',
      careerHistory: [],
      dependants: [],
    });

    await supabaseClient.update(
      'employees',
      email,
      {
        basicSalary: 4321.09,
        optInEpf: false,
        optInSocso: false,
        optInEis: true,
        optInPcb: false,
        enableLindung24: true,
      },
      'id'
    );

    const { data: saved, error: readError } = await raw
      .from('employees')
      .select(
        'basic_salary,opt_in_epf,opt_in_socso,opt_in_eis,opt_in_pcb,enable_lindung24,bank_name,nric_passport'
      )
      .eq('email', email)
      .single();
    if (readError) throw readError;
    if (
      Number(saved.basic_salary) !== 4321.09 ||
      saved.opt_in_epf !== false ||
      saved.opt_in_socso !== false ||
      saved.opt_in_eis !== true ||
      saved.opt_in_pcb !== false ||
      saved.enable_lindung24 !== true ||
      saved.bank_name !== 'RedPoint Cooperative Bank' ||
      saved.nric_passport !== '900101-14-5566'
    ) {
      throw new Error('Employee enrollment, banking, NRIC, salary, or statutory preferences did not persist.');
    }

    await supabaseClient.insert('candidates', {
      id: candidateId,
      entityId: 'ENT-92',
      name: 'Candidate Enlistment Test',
      email,
      phone: '+60 12-345 6789',
      designation: 'Test Record',
      department: 'Human Resources',
      stage: 'Applied',
      progress: 0,
      dateJoined: '2026-08-03',
    });
    await supabaseClient.update('candidates', candidateId, { stage: 'Onboarding', progress: 100 });

    const { data: candidate, error: candidateReadError } = await raw
      .from('candidates')
      .select('stage,progress')
      .eq('id', candidateId)
      .single();
    if (candidateReadError) throw candidateReadError;
    if (candidate.stage !== 'Onboarding' || Number(candidate.progress) !== 100) {
      throw new Error('Candidate enlistment or onboarding progress did not persist.');
    }

    await supabaseClient.delete('candidates', candidateId);

    await supabaseClient.delete('employees', email, 'email');
    const { data: remaining, error: verifyError } = await raw
      .from('employees')
      .select('id')
      .eq('email', email);
    if (verifyError) throw verifyError;
    if (remaining.length !== 0) {
      throw new Error('Temporary employee deletion did not persist.');
    }

    console.log('Employee Supabase persistence test passed.');
  } finally {
    await raw.from('candidates').delete().eq('id', candidateId);
    await raw.from('employees').delete().eq('email', email);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
