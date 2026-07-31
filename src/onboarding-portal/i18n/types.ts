export type Language = 'en' | 'ms' | 'zh';

export interface LanguageOption {
  code: Language;
  label: string;
  nativeLabel: string;
  flag: string;
}

export const LANGUAGES: LanguageOption[] = [
  { code: 'en', label: 'English', nativeLabel: 'English', flag: '🇬🇧' },
  { code: 'ms', label: 'Malay', nativeLabel: 'Bahasa Melayu', flag: '🇲🇾' },
  { code: 'zh', label: 'Mandarin', nativeLabel: '中文 (简体)', flag: '🇨🇳' },
];
