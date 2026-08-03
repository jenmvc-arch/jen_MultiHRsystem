export const MALAYSIAN_BANK_NAMES = [
  'Maybank Berhad',
  'CIMB Bank Berhad',
  'Public Bank Berhad',
  'RHB Bank Berhad',
  'Hong Leong Bank Berhad',
  'AmBank (M) Berhad',
  'HSBC Bank Malaysia Berhad',
  'Standard Chartered Bank Malaysia Berhad',
  'Bank Islam Malaysia Berhad',
  'Bank Simpanan Nasional',
  'OCBC Bank (Malaysia) Berhad',
  'United Overseas Bank (Malaysia) Berhad'
];

export function formatNricOrPassport(value: string): string {
  const trimmed = value.trim().toUpperCase();
  const compact = trimmed.replace(/[^A-Z0-9]/g, '');

  if (!compact || !/^\d+$/.test(compact)) {
    return trimmed;
  }

  if (compact.length <= 6) return compact;
  if (compact.length <= 8) return `${compact.slice(0, 6)}-${compact.slice(6)}`;
  return `${compact.slice(0, 6)}-${compact.slice(6, 8)}-${compact.slice(8)}`;
}

export function getCandidateNameFromApplication(formData: { name?: string; fullName?: string }): string {
  return (formData.name || formData.fullName || '').trim();
}
