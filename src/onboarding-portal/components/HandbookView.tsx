import React, { useState, useRef, useEffect } from 'react';
import { HandbookModule } from '../types';
import { HandwritingCanvas } from './HandwritingCanvas';
import { DocumentPreviewModal } from './DocumentPreviewModal';
import {
  CheckCircle,
  Circle,
  Lock,
  Play,
  PenTool,
  ArrowRight,
  RotateCcw,
  Sparkles,
  ChevronRight,
  Bot,
  BookOpen,
  Download,
  ShieldCheck,
  CheckSquare,
  Square,
  FileCheck,
  Award,
  FileText,
  ListFilter,
  Layers,
  Eye,
  Search,
  X,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { exportAcknowledgementPdf } from '../utils/pdfExport';

interface HandbookViewProps {
  modules: HandbookModule[];
  onAcknowledgeModule: (moduleId: number, signature: string) => void;
  onOpenAiAssistant: () => void;
  partInitials: Record<number, string>;
  finalSignatureDataUrl: string | null;
  isSigningLocked?: boolean;
  onSavePartInitial: (moduleId: number, signature: string) => Promise<void>;
  onClearPartInitial: (moduleId: number) => Promise<void>;
  onSaveFinalSignature: (signature: string) => Promise<void>;
  onClearFinalSignature: () => Promise<void>;
  onDownloadFullHandbook: () => void;
}

export const HandbookView: React.FC<HandbookViewProps> = ({
  modules,
  onAcknowledgeModule,
  onOpenAiAssistant,
  partInitials,
  finalSignatureDataUrl,
  isSigningLocked = false,
  onSavePartInitial,
  onClearPartInitial,
  onSaveFinalSignature,
  onClearFinalSignature,
  onDownloadFullHandbook,
}) => {
  const { t } = useLanguage();
  const [selectedModuleId, setSelectedModuleId] = useState<number>(1); // Part 1 - Introduction
  const [contentType, setContentType] = useState<'full' | 'summary'>('full');
  const [isPlayingVideo, setIsPlayingVideo] = useState<boolean>(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const hasSigned = Boolean(finalSignatureDataUrl);

  // Employee Particulars State
  const [empName, setEmpName] = useState<string>('Sarah Lin');
  const [empDept, setEmpDept] = useState<string>('Marketing & Creative Strategy');
  const [empPosition, setEmpPosition] = useState<string>('Digital Content Specialist');
  const [empDate, setEmpDate] = useState<string>(new Date().toLocaleDateString('en-MY', { day: 'numeric', month: 'long', year: 'numeric' }));

  // Overall progress calculation
  const completedCount = modules.filter((m) => !!partInitials[m.id]).length;
  const overallPercent = Math.round((completedCount / modules.length) * 100);

  // 5-point Covenant Checklist
  const [covenants, setCovenants] = useState<boolean[]>([true, true, true, true, true]);
  const [isFinalSigned, setIsFinalSigned] = useState<boolean>(false);

  useEffect(() => {
    if (isSigningLocked) setIsFinalSigned(true);
  }, [isSigningLocked]);

  const covenantTexts = [
    'I have received a copy of the RedPoint Sdn. Bhd. Employee Handbook (Version 1.0).',
    'I have read and understood the contents of this Handbook.',
    'I agree to comply with all Company policies, procedures, rules, and guidelines contained herein and any amendments made from time to time.',
    'I understand that this Handbook does not constitute a contract of employment and does not alter the terms and conditions of my Employment Contract.',
    'I understand that it is my responsibility to seek clarification from Human Resources if I have any questions regarding the contents of this Handbook.',
  ];

  const allCovenantsChecked = covenants.every(Boolean);

  const toggleCovenant = (index: number) => {
    setCovenants((prev) => {
      const updated = [...prev];
      updated[index] = !updated[index];
      return updated;
    });
  };

  // Content card ref and scroll progress tracking
  const contentCardRef = useRef<HTMLDivElement | null>(null);
  const [scrollProgress, setScrollProgress] = useState<number>(0);

  // Filter modules based on search query
  const filteredModules = modules.filter((m) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      m.title.toLowerCase().includes(q) ||
      m.content.sectionTitle.toLowerCase().includes(q) ||
      m.content.fullText.toLowerCase().includes(q) ||
      m.content.summaryText.toLowerCase().includes(q) ||
      (m.content.keyTakeaways && m.content.keyTakeaways.some((takeaway) => takeaway.toLowerCase().includes(q)))
    );
  });

  const activeModule = modules.find((m) => m.id === selectedModuleId) || modules[1];

  useEffect(() => {
    const calculateScrollProgress = () => {
      if (!contentCardRef.current) return;
      const element = contentCardRef.current;
      const rect = element.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      const headerOffset = 124;
      const elementHeight = rect.height;
      const scrolledPx = headerOffset - rect.top;
      const maxScrollPx = elementHeight - (windowHeight - headerOffset);

      if (maxScrollPx <= 0) {
        setScrollProgress(100);
        return;
      }

      if (scrolledPx <= 0) {
        setScrollProgress(0);
      } else if (scrolledPx >= maxScrollPx) {
        setScrollProgress(100);
      } else {
        const percentage = Math.min(
          100,
          Math.max(0, Math.round((scrolledPx / maxScrollPx) * 100))
        );
        setScrollProgress(percentage);
      }
    };

    window.addEventListener('scroll', calculateScrollProgress, { passive: true });
    window.addEventListener('resize', calculateScrollProgress, { passive: true });

    calculateScrollProgress();

    return () => {
      window.removeEventListener('scroll', calculateScrollProgress);
      window.removeEventListener('resize', calculateScrollProgress);
    };
  }, [selectedModuleId]);

  const handleSelectModule = (id: number) => {
    setSelectedModuleId(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAcknowledge = () => {
    if (!hasSigned || !finalSignatureDataUrl) return;
    setIsFinalSigned(true);
    onAcknowledgeModule(activeModule.id, finalSignatureDataUrl);
  };

  const handleDownloadPdfCertificate = () => {
    exportAcknowledgementPdf({
      employeeName: empName || 'Sarah Lin',
      department: empDept || 'Marketing',
      position: empPosition || 'Digital Content Specialist',
      signedDate: empDate || new Date().toLocaleDateString(),
      signatureTextOrImage: finalSignatureDataUrl || empName || 'Sarah Lin',
      covenants: covenantTexts,
    });
  };

  const handleDownloadFullHandbookPdf = () => {
    onDownloadFullHandbook();
  };

  return (
    <div className="w-full max-w-[1200px] mx-auto space-y-4 pb-12">
      {/* Sticky Module Reading Progress Bar */}
      <div className="sticky top-16 z-30 bg-white/95 backdrop-blur-md border border-[#F2E8D8] rounded-xl p-3 sm:p-4 shadow-[0_4px_12px_rgba(51,51,51,0.08)] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 transition-all">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="bg-[#810912] text-white text-[10px] font-extrabold px-2.5 py-1 rounded-md uppercase tracking-wider shrink-0 shadow-xs flex items-center gap-1">
            <BookOpen className="w-3 h-3" />
            <span>Section {activeModule.id}</span>
          </span>
          <div className="min-w-0">
            <h2 className="text-xs sm:text-sm font-extrabold text-[#1b1c1c] truncate">
              {activeModule.content.sectionTitle}
            </h2>
            <p className="text-[11px] text-[#59413f] truncate hidden md:block">
              {activeModule.title}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto shrink-0 bg-[#FAF6EF] sm:bg-transparent p-2 sm:p-0 rounded-lg border sm:border-0 border-[#F2E8D8]">
          <div className="text-right whitespace-nowrap">
            <span className="text-xs font-semibold text-[#59413f]">
              {t.readingProgress}:{' '}
              <strong className="text-[#810912] font-black">{scrollProgress}%</strong>
            </span>
          </div>
          <div className="flex-1 sm:w-44 h-2.5 bg-[#e0bfbc]/30 rounded-full overflow-hidden border border-[#e0bfbc]/60 shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-[#a32626] to-[#810912] transition-all duration-150 ease-out rounded-full"
              style={{ width: `${scrollProgress}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 relative">
        {/* Left Column: Handbook Modules Index Card */}
        <div className="lg:w-1/3 flex flex-col gap-4">
          <div className="bg-white rounded-xl shadow-[0_4px_6px_-1px_rgba(51,51,51,0.05),0_10px_15px_-3px_rgba(51,51,51,0.1)] border border-[#F2E8D8] p-6 flex-1">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-[#1b1c1c]">{t.handbookHeaderTitle}</h3>
              <button
                onClick={onOpenAiAssistant}
                className="p-1.5 rounded-lg bg-[#a32626]/10 text-[#810912] hover:bg-[#a32626]/20 transition-colors flex items-center gap-1 text-xs font-semibold cursor-pointer"
                title={t.askAiAboutModule}
              >
                <Bot className="w-4 h-4" />
                <span>{t.aiAssistant}</span>
              </button>
            </div>

            {/* Progress Header */}
            <div className="mb-5">
              <div className="flex justify-between items-end mb-2">
                <span className="text-xs font-semibold text-[#59413f]">{t.overallProgress}</span>
                <span className="text-xs font-bold text-[#810912]">{overallPercent}%</span>
              </div>
              <div className="w-full bg-[#f0eded] rounded-full h-2 overflow-hidden">
                <div
                  className="bg-[#a32626] h-full rounded-full transition-all duration-300"
                  style={{ width: `${overallPercent}%` }}
                ></div>
              </div>
            </div>

            {/* Local Search Input Filter */}
            <div className="mb-4">
              <div className="relative flex items-center">
                <Search className="w-4 h-4 text-[#810912]/60 absolute left-3 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search modules or keywords..."
                  className="w-full pl-9 pr-8 py-2 text-xs bg-[#FAF6EF] border border-[#e0bfbc] rounded-lg text-[#1b1c1c] placeholder:text-[#59413f]/60 focus:outline-hidden focus:border-[#810912] focus:ring-1 focus:ring-[#810912] transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 p-1 text-[#59413f] hover:text-[#810912] rounded-full cursor-pointer"
                    title="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {searchQuery.trim() && (
                <div className="mt-1.5 flex items-center justify-between text-[11px] text-[#59413f] px-1">
                  <span>Found {filteredModules.length} {filteredModules.length === 1 ? 'module' : 'modules'}</span>
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-[#810912] hover:underline font-semibold cursor-pointer"
                  >
                    Clear Filter
                  </button>
                </div>
              )}
            </div>

            {/* Index List */}
            {filteredModules.length === 0 ? (
              <div className="p-5 text-center bg-[#FAF6EF] rounded-lg border border-dashed border-[#e0bfbc] space-y-2">
                <Search className="w-6 h-6 text-[#810912]/40 mx-auto" />
                <p className="text-xs font-bold text-[#1b1c1c]">No modules found</p>
                <p className="text-[11px] text-[#59413f]">
                  No handbook section matches &ldquo;{searchQuery}&rdquo;. Try another title or keyword.
                </p>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="mt-2 px-3 py-1 bg-[#810912] text-white text-xs font-semibold rounded-md hover:bg-[#a32626] transition-colors cursor-pointer"
                >
                  Reset Search
                </button>
              </div>
            ) : (
              <ul className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
                {filteredModules.map((m) => {
                  const isSelected = m.id === selectedModuleId;
                  const isCompleted = m.status === 'completed' || !!partInitials[m.id];
                  const isLocked = m.status === 'locked' && !isCompleted;

                  return (
                    <li key={m.id}>
                      <button
                        onClick={() => {
                          if (isLocked && m.id > 1) {
                            const prevUncompleted = modules.find(
                              (prev) => prev.id < m.id && prev.status !== 'completed' && !partInitials[prev.id]
                            );
                            alert(
                              `Part ${m.id} is locked. Please initial and complete Part ${
                                prevUncompleted ? prevUncompleted.id : m.id - 1
                              } first.`
                            );
                            return;
                          }
                          handleSelectModule(m.id);
                        }}
                        className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#810912]/10 border border-[#810912]/30 text-[#810912]'
                            : isLocked
                            ? 'opacity-60 text-gray-400'
                            : 'hover:bg-[#f6f3f2] text-[#1b1c1c]'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {isCompleted ? (
                            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                          ) : isLocked ? (
                            <Lock className="w-4 h-4 text-[#810912]/50 shrink-0" />
                          ) : (
                            <Circle className="w-4 h-4 text-[#810912] shrink-0" />
                          )}
                          <span
                            className={`text-xs sm:text-sm font-medium truncate ${
                              isCompleted ? 'text-[#1b1c1c]' : ''
                            } ${isSelected ? 'font-bold text-[#810912]' : ''}`}
                          >
                            {m.title}
                          </span>
                        </div>
                        {isSelected && <ChevronRight className="w-4 h-4 text-[#810912] shrink-0" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Center/Main Column: Policy Content & Video */}
        <div ref={contentCardRef} className="lg:w-2/3 flex flex-col gap-6">
        {/* Content Card */}
        <div className="bg-white rounded-xl shadow-[0_4px_6px_-1px_rgba(51,51,51,0.05),0_10px_15px_-3px_rgba(51,51,51,0.1)] border border-[#F2E8D8] overflow-hidden flex flex-col">
          {/* Video Mockup Frame */}
          <div className="relative w-full h-64 sm:h-72 bg-[#403f3a] overflow-hidden group">
            <img
              src={
                activeModule.videoUrl ||
                'https://lh3.googleusercontent.com/aida-public/AB6AXuCYBshVaRzF-d4q2MwqtPNHups0sJL4vP55I_Cld2Ys0CmWVkjoyFfvsee30o-jAgKjdFFO0nEK_BYfwjNEwNgQlifa8TRPDMbduG4kb-QZEc2mIJ3muKpq6TNpB_1lsvNGRmaJe2vcZy9z4kFdpJlYm2tOQnGuwnieXjThuelP5v-m9M5vtssch_hXqjBriqL1njDnb35r3XZYuwduFVEcwIo6jSTlxQqVsAmoAZ3bqbqVJ4-ftEkJgJqY_W2B5bqBarfwJ_u7uoY'
              }
              alt="Training Video Preview"
              className="w-full h-full object-cover opacity-80 mix-blend-overlay group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30">
              <button
                onClick={() => setIsPlayingVideo(!isPlayingVideo)}
                className="w-16 h-16 bg-[#a32626] text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform cursor-pointer"
              >
                <Play className="w-8 h-8 fill-current ml-1" />
              </button>
              <span className="mt-4 text-xs font-semibold text-white bg-black/60 px-3 py-1 rounded-full backdrop-blur-xs">
                {activeModule.title} ({activeModule.videoDuration || '3:45'})
              </span>
            </div>

            {isPlayingVideo && (
              <div className="absolute inset-0 bg-black/90 p-4 flex flex-col justify-between z-20 text-white">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-[#ffbbb5]">Video Briefing Player</span>
                  <button
                    onClick={() => setIsPlayingVideo(false)}
                    className="text-xs text-white hover:underline cursor-pointer"
                  >
                    Close Video ✕
                  </button>
                </div>
                <div className="text-center my-auto px-6">
                  <p className="text-sm font-semibold mb-2">
                    [Playing] Executive Introduction to Red Point Integrity Guidelines
                  </p>
                  <div className="w-full bg-white/20 rounded-full h-1.5 overflow-hidden max-w-md mx-auto">
                    <div className="bg-[#a32626] h-full w-2/3 animate-pulse"></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Text Content */}
          <div className="p-6 sm:p-8 flex-1">
            {/* View Mode Switcher Header Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6 pb-4 border-b border-[#F2E8D8]">
              <div className="flex items-center gap-2">
                <span className="bg-[#810912]/10 text-[#810912] px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider">
                  Section {activeModule.id}
                </span>
                <span className="text-xs text-[#59413f]">
                  {activeModule.completedSections}/{activeModule.sectionsCount} {t.sectionsLabel}
                </span>
              </div>

              {/* Segmented Mode Switcher: Full Detail vs Executive Summary */}
              <div className="inline-flex p-1 bg-[#FAF6EF] border border-[#e0bfbc] rounded-xl shadow-xs">
                <button
                  type="button"
                  onClick={() => setContentType('full')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                    contentType === 'full'
                      ? 'bg-[#810912] text-white shadow-xs'
                      : 'text-[#59413f] hover:text-[#1b1c1c] hover:bg-white/60'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Full Detail</span>
                </button>
                <button
                  type="button"
                  onClick={() => setContentType('summary')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                    contentType === 'summary'
                      ? 'bg-[#810912] text-white shadow-xs'
                      : 'text-[#59413f] hover:text-[#1b1c1c] hover:bg-white/60'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>Executive Summary</span>
                </button>
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-[#1b1c1c] mb-6">
              {activeModule.content.sectionTitle}
            </h1>

            {/* FULL DETAIL VIEW MODE */}
            {contentType === 'full' ? (
              <div className="space-y-4 text-base text-[#59413f] leading-relaxed">
                {activeModule.content.bodyParagraphs.map((para, idx) => (
                  <p key={idx}>{para}</p>
                ))}

                {/* Subsections rendering */}
                {activeModule.content.subsections && activeModule.content.subsections.length > 0 && (
                  <div className="space-y-6 mt-6 pt-6 border-t border-[#F2E8D8]">
                    {activeModule.content.subsections.map((sub, sIdx) => (
                      <div key={sIdx} className="space-y-3 bg-[#FAF6EF]/60 p-4 rounded-xl border border-[#e0bfbc]/60">
                        {sub.title && (
                          <h3 className="text-base sm:text-lg font-extrabold text-[#1b1c1c] border-b border-[#e0bfbc]/50 pb-1.5 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[#810912]"></span>
                            <span>{sub.title}</span>
                          </h3>
                        )}
                        {sub.paragraphs.map((p, pIdx) => (
                          <p key={pIdx} className="text-sm text-[#1b1c1c] leading-relaxed">
                            {p}
                          </p>
                        ))}
                        {sub.bulletPoints && sub.bulletPoints.length > 0 && (
                          <ul className="space-y-2 pl-3 pt-1">
                            {sub.bulletPoints.map((bp, bIdx) => (
                              <li key={bIdx} className="text-xs sm:text-sm text-[#59413f] flex items-start gap-2.5">
                                <span className="text-[#810912] font-bold text-sm leading-none mt-0.5">•</span>
                                <span className="leading-snug">{bp}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                        {sub.table && (
                          <div className="overflow-x-auto my-3 border border-[#e0bfbc] rounded-xl shadow-xs">
                            <table className="w-full text-xs text-left border-collapse">
                              <thead className="bg-[#810912] text-white">
                                <tr>
                                  {sub.table.headers.map((h, hIdx) => (
                                    <th key={hIdx} className="px-3.5 py-2.5 font-bold uppercase tracking-wider">
                                      {h}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#e0bfbc]/60 bg-white">
                                {sub.table.rows.map((row, rIdx) => (
                                  <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-[#FAF6EF]/50' : 'bg-white'}>
                                    {row.map((cell, cIdx) => (
                                      <td key={cIdx} className="px-3.5 py-2.5 font-medium text-[#1b1c1c]">
                                        {cell}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Key Takeaway Callout Box */}
                <div className="bg-[#f6f3f2] border-l-4 border-[#810912] p-4 rounded-r-lg my-6">
                  <p className="text-sm font-medium text-[#1b1c1c]">
                    <strong className="text-[#810912]">{t.keyTakeawayLabel}</strong>{' '}
                    {activeModule.content.keyTakeaway}
                  </p>
                </div>
              </div>
            ) : (
              /* EXECUTIVE SUMMARY VIEW MODE */
              <div className="space-y-6">
                {/* Executive Key Takeaway Card */}
                <div className="p-5 rounded-xl bg-gradient-to-r from-[#810912] to-[#5a060d] text-white shadow-md relative overflow-hidden">
                  <div className="absolute right-3 bottom-1 opacity-10 text-white pointer-events-none">
                    <Sparkles className="w-32 h-32" />
                  </div>
                  <div className="flex items-center gap-2 mb-2 text-[#D4AF37] font-extrabold text-xs tracking-wider uppercase">
                    <Award className="w-4 h-4" />
                    <span>Executive Section Takeaway</span>
                  </div>
                  <p className="text-base sm:text-lg font-bold leading-snug">
                    "{activeModule.content.keyTakeaway}"
                  </p>
                </div>

                {/* Section Overview Paragraph */}
                <div className="bg-[#FAF6EF] p-4 rounded-xl border border-[#e0bfbc] space-y-2">
                  <h3 className="text-xs font-black uppercase text-[#810912] tracking-wider flex items-center gap-1.5">
                    <Layers className="w-4 h-4" />
                    <span>Summary Briefing</span>
                  </h3>
                  <p className="text-sm text-[#1b1c1c] leading-relaxed font-medium">
                    {activeModule.content.bodyParagraphs[0] || 'This section outlines key operational principles, rules, and employee responsibilities.'}
                  </p>
                </div>

                {/* Subsections Quick Bullet Summary Cards */}
                {activeModule.content.subsections && activeModule.content.subsections.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-black uppercase text-[#1b1c1c] tracking-wider flex items-center gap-1.5">
                      <ListFilter className="w-4 h-4 text-[#810912]" />
                      <span>Key Policy Subsections Summary ({activeModule.content.subsections.length} Topics)</span>
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {activeModule.content.subsections.map((sub, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 bg-white rounded-xl border border-[#F2E8D8] shadow-xs flex flex-col justify-between gap-2 hover:border-[#810912]/40 transition-colors"
                        >
                          <div>
                            <h4 className="text-xs font-extrabold text-[#810912] mb-1">
                              {sub.title || `Topic ${idx + 1}`}
                            </h4>
                            <p className="text-xs text-[#59413f] line-clamp-3 leading-snug">
                              {sub.paragraphs[0] || 'Key requirements and compliance standards apply.'}
                            </p>
                          </div>
                          {sub.bulletPoints && sub.bulletPoints.length > 0 && (
                            <div className="text-[11px] font-semibold text-[#810912] bg-[#FAF6EF] px-2 py-1 rounded-md">
                              {sub.bulletPoints.length} key rules defined
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Prompt to switch back to full detail */}
                <div className="p-4 bg-[#FAF6EF]/80 border border-[#e0bfbc] rounded-xl flex items-center justify-between gap-3 text-xs">
                  <span className="text-[#59413f] font-medium">
                    Need the complete line-by-line legal text and tables?
                  </span>
                  <button
                    type="button"
                    onClick={() => setContentType('full')}
                    className="px-3 py-1.5 bg-[#1b1c1c] hover:bg-black text-white font-bold rounded-lg shrink-0 flex items-center gap-1 cursor-pointer"
                  >
                    <span>View Full Detail</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Digital Signature & Final Provision Acknowledgement Card - ONLY SHOW AT PART 15 */}
        {activeModule.id === 15 ? (
          <div className="bg-white rounded-xl shadow-[0_4px_6px_-1px_rgba(51,51,51,0.05),0_10px_15px_-3px_rgba(51,51,51,0.1)] border-2 border-[#810912]/20 p-6 sm:p-8 flex flex-col gap-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-[#810912]"></div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-[#F2E8D8]">
              <div className="flex gap-3 items-center">
                <div className="p-2.5 bg-[#810912] text-white rounded-lg shadow-xs">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-[#1b1c1c] uppercase tracking-wide">
                    FINAL PROVISION & EMPLOYEE ACKNOWLEDGEMENT
                  </h3>
                  <p className="text-xs text-[#59413f]">
                    RedPoint Sdn. Bhd. Employee Handbook • Formal Digital Sign-Off Form
                  </p>
                </div>
              </div>

              {isFinalSigned && (
                <div className="flex items-center gap-2 bg-[#E6F4EA] border border-[#34A853]/40 text-[#137333] px-3 py-1.5 rounded-full text-xs font-bold animate-fade-in">
                  <FileCheck className="w-4 h-4" />
                  <span>Acknowledged & Archived</span>
                </div>
              )}
            </div>

            {/* Employee Particulars Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-[#FAF6EF] p-4 rounded-xl border border-[#e0bfbc]">
              <div>
                <label className="text-[10px] uppercase font-bold text-[#810912] tracking-wider block mb-1">
                  Employee Full Name
                </label>
                <input
                  type="text"
                  value={empName}
                  onChange={(e) => setEmpName(e.target.value)}
                  className="w-full text-xs font-semibold text-[#1b1c1c] bg-white border border-[#e0bfbc] rounded-md px-2.5 py-1.5 focus:border-[#810912] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-[#810912] tracking-wider block mb-1">
                  Department
                </label>
                <input
                  type="text"
                  value={empDept}
                  onChange={(e) => setEmpDept(e.target.value)}
                  className="w-full text-xs font-semibold text-[#1b1c1c] bg-white border border-[#e0bfbc] rounded-md px-2.5 py-1.5 focus:border-[#810912] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-[#810912] tracking-wider block mb-1">
                  Position / Title
                </label>
                <input
                  type="text"
                  value={empPosition}
                  onChange={(e) => setEmpPosition(e.target.value)}
                  className="w-full text-xs font-semibold text-[#1b1c1c] bg-white border border-[#e0bfbc] rounded-md px-2.5 py-1.5 focus:border-[#810912] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-[#810912] tracking-wider block mb-1">
                  Date of Signature
                </label>
                <input
                  type="text"
                  value={empDate}
                  onChange={(e) => setEmpDate(e.target.value)}
                  className="w-full text-xs font-semibold text-[#1b1c1c] bg-white border border-[#e0bfbc] rounded-md px-2.5 py-1.5 focus:border-[#810912] focus:outline-hidden"
                />
              </div>
            </div>

            {/* 5 Compliance Covenants Checklist */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-extrabold text-[#1b1c1c] uppercase tracking-wider flex items-center gap-1.5">
                <Award className="w-4 h-4 text-[#810912]" />
                <span>Mandatory Compliance Covenants (Check all to proceed)</span>
              </h4>

              <div className="space-y-2">
                {covenantTexts.map((covText, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => toggleCovenant(idx)}
                    className={`w-full text-left p-3 rounded-lg border text-xs sm:text-sm flex items-start gap-3 transition-all cursor-pointer ${
                      covenants[idx]
                        ? 'bg-[#FAF6EF] border-[#810912]/40 text-[#1b1c1c]'
                        : 'bg-white border-[#e0bfbc] text-[#59413f] opacity-80 hover:opacity-100'
                    }`}
                  >
                    <span className="mt-0.5 shrink-0 text-[#810912]">
                      {covenants[idx] ? (
                        <CheckSquare className="w-4 h-4 text-[#810912]" />
                      ) : (
                        <Square className="w-4 h-4 text-[#e0bfbc]" />
                      )}
                    </span>
                    <span className="leading-snug font-medium">{covText}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Handwriting Signature Canvas Pad */}
            <div className="space-y-2">
              <HandwritingCanvas
                label="Employee Handwritten Digital Signature"
                subLabel="Draw your official signature below on the digital signature pad using mouse, touchpad, or touchscreen stylus."
                height={130}
                existingDataUrl={finalSignatureDataUrl}
                disabled={isSigningLocked}
                onSaveSignature={(dataUrl) => {
                  if (dataUrl) {
                    void onSaveFinalSignature(dataUrl).catch(() => undefined);
                  } else {
                    void onClearFinalSignature().catch(() => undefined);
                  }
                  setIsFinalSigned(false);
                }}
                onClear={() => {
                  setIsFinalSigned(false);
                }}
              />
            </div>

            {/* Action Buttons & Verification Badge */}
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 pt-2">
              <div className="flex items-center gap-2 text-xs text-[#59413f]">
                <Sparkles className="w-4 h-4 text-[#810912] shrink-0" />
                <span>RedPoint HR Compliance Audit Logged</span>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsPreviewOpen(true)}
                  className="py-2.5 px-4 rounded-lg font-bold text-xs transition-all flex items-center gap-2 cursor-pointer bg-[#FAF6EF] border border-[#e0bfbc] text-[#810912] hover:bg-[#f2e8d8] shadow-xs hover:-translate-y-0.5"
                >
                  <Eye className="w-4 h-4 text-[#810912]" />
                  <span>Preview Document</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadPdfCertificate}
                  disabled={!isFinalSigned && !hasSigned}
                  className={`py-2.5 px-3.5 rounded-lg font-bold text-xs transition-all flex items-center gap-2 cursor-pointer ${
                    isFinalSigned || hasSigned
                      ? 'bg-[#FAF6EF] border border-[#e0bfbc] text-[#1b1c1c] hover:bg-[#f2e8d8]'
                      : 'bg-[#f6f3f2] text-[#59413f] cursor-not-allowed opacity-60 border border-[#e0bfbc]'
                  }`}
                >
                  <Download className="w-3.5 h-3.5 text-[#810912]" />
                  <span>Acknowledgement Certificate (PDF)</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadFullHandbookPdf}
                  disabled={!isFinalSigned && !hasSigned}
                  className={`py-2.5 px-4 rounded-lg font-bold text-xs transition-all flex items-center gap-2 cursor-pointer ${
                    isFinalSigned || hasSigned
                      ? 'bg-[#810912] text-white hover:bg-[#a32626] shadow-sm hover:-translate-y-0.5'
                      : 'bg-[#f6f3f2] text-[#59413f] cursor-not-allowed opacity-60 border border-[#e0bfbc]'
                  }`}
                >
                  <Download className="w-4 h-4 text-[#D4AF37]" />
                  <span>Download Full Handbook + Quiz Record (PDF)</span>
                </button>

                <button
                  type="button"
                  onClick={handleAcknowledge}
                  disabled={!hasSigned || !allCovenantsChecked}
                  className={`py-2.5 px-5 rounded-lg font-extrabold text-xs tracking-wider uppercase transition-all flex items-center gap-2 cursor-pointer ${
                    hasSigned && allCovenantsChecked
                      ? 'bg-[#1b1c1c] text-white hover:bg-black shadow-md hover:-translate-y-0.5'
                      : 'bg-[#f6f3f2] text-[#59413f] cursor-not-allowed opacity-60 border border-[#e0bfbc]'
                  }`}
                >
                  <span>{isFinalSigned ? 'Re-confirm Sign-off' : 'Sign & Acknowledge'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* INITIAL SIGNATURE & SECTION ACKNOWLEDGEMENT CARD FOR PARTS 1 - 14 */
          <div className="bg-white rounded-xl shadow-md border-2 border-[#810912]/20 p-6 flex flex-col gap-5 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-[#810912]"></div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-[#F2E8D8]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-[#810912] text-white rounded-lg shadow-xs">
                  <PenTool className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm sm:text-base font-extrabold text-[#1b1c1c] uppercase tracking-wide">
                    Part {activeModule.id} Employee Handwritten Initial
                  </h4>
                  <p className="text-xs text-[#59413f]">
                    Draw your handwritten initial on the signature pad below to unlock Part {activeModule.id + 1}
                  </p>
                </div>
              </div>

              {partInitials[activeModule.id] || activeModule.status === 'completed' ? (
                <div className="flex items-center gap-1.5 bg-[#E6F4EA] border border-[#34A853]/40 text-[#137333] px-3 py-1 rounded-full text-xs font-bold animate-fade-in">
                  <FileCheck className="w-4 h-4" />
                  <span>Handwritten Initial Recorded</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 bg-[#FFF0F0] border border-[#a32626]/30 text-[#810912] px-3 py-1 rounded-full text-xs font-bold">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Handwritten Initial Required</span>
                </div>
              )}
            </div>

            <div className="bg-[#FAF6EF] p-4 rounded-xl border border-[#e0bfbc]">
              <HandwritingCanvas
                key={activeModule.id}
                label={`Employee Handwritten Initial Pad (Part ${activeModule.id})`}
                subLabel={`Please draw your handwritten initial below to confirm you have thoroughly reviewed Part ${activeModule.id} – ${activeModule.content.sectionTitle}.`}
                height={110}
                existingDataUrl={partInitials[activeModule.id] || null}
                disabled={isSigningLocked}
                onSaveSignature={(dataUrl) => {
                  if (dataUrl) {
                    void onSavePartInitial(activeModule.id, dataUrl).then(() => {
                      onAcknowledgeModule(activeModule.id, dataUrl);
                    }).catch(() => undefined);
                  } else {
                    void onClearPartInitial(activeModule.id).catch(() => undefined);
                  }
                }}
              />
            </div>

            {/* Section Navigation & Proceed Button */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-1">
              <div className="text-xs text-[#59413f]">
                {partInitials[activeModule.id] || activeModule.status === 'completed' ? (
                  <span className="text-[#137333] font-bold flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    Part {activeModule.id} initialed and verified. You may proceed to the next section.
                  </span>
                ) : (
                  <span className="text-[#810912] font-semibold flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-[#810912]" />
                    Handwrite your initial on the signature pad above to enable proceeding.
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!partInitials[activeModule.id] && activeModule.status !== 'completed') {
                    alert(`Please draw your handwritten initial signature on the pad for Part ${activeModule.id} before proceeding.`);
                    return;
                  }

                  if (activeModule.id < 15) {
                    handleSelectModule(activeModule.id + 1);
                  }
                }}
                disabled={!partInitials[activeModule.id] && activeModule.status !== 'completed'}
                className={`py-2.5 px-5 rounded-lg font-bold text-xs transition-all shadow-xs flex items-center gap-2 shrink-0 ${
                  partInitials[activeModule.id] || activeModule.status === 'completed'
                    ? 'bg-[#1b1c1c] hover:bg-black text-white cursor-pointer shadow-md hover:-translate-y-0.5'
                    : 'bg-[#f6f3f2] text-[#59413f] cursor-not-allowed opacity-60 border border-[#e0bfbc]'
                }`}
              >
                <span>
                  {activeModule.id === 14
                    ? 'Proceed to Part 15 — Final Provisions & Signature'
                    : `Next: Part ${activeModule.id + 1} — ${modules.find(m => m.id === activeModule.id + 1)?.title.replace(/^Part \d+ – /, '') || 'Next Section'}`}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Preview Document Modal */}
      <DocumentPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        empName={empName}
        empDept={empDept}
        empPosition={empPosition}
        empDate={empDate}
        finalSignatureDataUrl={finalSignatureDataUrl}
        partInitials={partInitials}
        covenants={covenants}
        covenantTexts={covenantTexts}
        modules={modules}
        quizScorePercent={90}
        quizGrade="Grade S (PASSED)"
        onDownloadPdf={handleDownloadFullHandbookPdf}
      />
    </div>
  </div>
);
};
