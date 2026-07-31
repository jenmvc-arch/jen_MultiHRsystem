import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { Language } from '../i18n/types';

interface LanguageSelectorProps {
  variant?: 'navbar' | 'compact' | 'full';
  className?: string;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  variant = 'navbar',
  className = '',
}) => {
  const { language, setLanguage, languages } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLangObj = languages.find((l) => l.code === language) || languages[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (code: Language) => {
    setLanguage(code);
    setIsOpen(false);
  };

  if (variant === 'full') {
    return (
      <div className={`grid grid-cols-1 sm:grid-cols-3 gap-3 ${className}`}>
        {languages.map((item) => {
          const isSelected = item.code === language;
          return (
            <button
              key={item.code}
              type="button"
              onClick={() => setLanguage(item.code)}
              className={`flex items-center justify-between p-3.5 rounded-xl border-2 transition-all cursor-pointer ${
                isSelected
                  ? 'border-[#810912] bg-[#a32626]/5 text-[#810912] font-bold shadow-xs'
                  : 'border-[#e0bfbc] bg-white text-[#1b1c1c] hover:border-[#a32626] hover:bg-[#f6f3f2]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-xl">{item.flag}</span>
                <div className="text-left">
                  <p className="text-sm font-bold leading-tight">{item.nativeLabel}</p>
                  <p className="text-[11px] text-[#59413f] font-normal">{item.label}</p>
                </div>
              </div>
              {isSelected && <Check className="w-5 h-5 text-[#810912]" />}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#e0bfbc] bg-white hover:bg-[#f6f3f2] text-xs font-semibold text-[#1b1c1c] transition-colors cursor-pointer focus:outline-hidden"
        title="Change Language / Tukar Bahasa / 切换语言"
      >
        <Globe className="w-3.5 h-3.5 text-[#810912]" />
        <span className="text-sm">{currentLangObj.flag}</span>
        <span className="hidden sm:inline font-bold">{currentLangObj.nativeLabel}</span>
        <span className="sm:hidden font-bold uppercase">{currentLangObj.code}</span>
        <ChevronDown className="w-3.5 h-3.5 text-[#59413f]" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-48 rounded-xl bg-white shadow-lg border border-[#e0bfbc] py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-1.5 border-b border-[#e0bfbc]/50 text-[10px] font-bold text-[#59413f] uppercase tracking-wider">
            Select Language / 语言
          </div>
          {languages.map((item) => (
            <button
              key={item.code}
              type="button"
              onClick={() => handleSelect(item.code)}
              className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left transition-colors cursor-pointer ${
                item.code === language
                  ? 'bg-[#a32626]/10 text-[#810912] font-bold'
                  : 'text-[#1b1c1c] hover:bg-[#f6f3f2]'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-base">{item.flag}</span>
                <span>{item.nativeLabel}</span>
              </div>
              {item.code === language && <Check className="w-3.5 h-3.5 text-[#810912]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
