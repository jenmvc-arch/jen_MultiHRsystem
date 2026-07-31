import React from 'react';
import { X, Download, ShieldCheck, Award, CheckCircle, FileCheck, Building2, User, Briefcase, Calendar, PenTool, Printer } from 'lucide-react';
import { HandbookModule } from '../types';

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  empName: string;
  empDept: string;
  empPosition: string;
  empDate: string;
  finalSignatureDataUrl: string | null;
  partInitials: Record<number, string>;
  covenants: boolean[];
  covenantTexts: string[];
  modules: HandbookModule[];
  quizScorePercent?: number;
  quizGrade?: string;
  onDownloadPdf: () => void;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  isOpen,
  onClose,
  empName,
  empDept,
  empPosition,
  empDate,
  finalSignatureDataUrl,
  partInitials,
  covenants,
  covenantTexts,
  modules,
  quizScorePercent = 90,
  quizGrade = 'Grade S (PASSED)',
  onDownloadPdf,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 sm:p-6 overflow-y-auto animate-fade-in">
      {/* Modal Container */}
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden my-auto">
        {/* Modal Header Bar */}
        <div className="bg-[#1b1c1c] text-white px-6 py-4 flex items-center justify-between shrink-0 border-b border-[#810912]/30">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#810912] rounded-lg">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white tracking-wide uppercase">
                Document Preview — Official Handbook Record
              </h3>
              <p className="text-xs text-gray-300">
                Read-only visual preview of final combined PDF with signatures and quiz record
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all cursor-pointer"
            title="Close Preview"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Document Body (Simulated A4 Document Page) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-[#f5f3f0] space-y-6">
          <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg border border-[#e0bfbc]/60 p-6 sm:p-10 text-[#1b1c1c] space-y-8 relative overflow-hidden">
            {/* Header Red/Gold Accent Top Bar */}
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#810912] via-[#a32626] to-[#D4AF37]"></div>

            {/* Document Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-gray-200">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="bg-[#810912] text-white font-extrabold text-[10px] tracking-widest uppercase px-2 py-0.5 rounded-sm">
                    REDPOINT
                  </span>
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Sdn. Bhd. (1234567-X)
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-[#810912] uppercase tracking-tight">
                  EMPLOYEE HANDBOOK ACKNOWLEDGEMENT
                </h1>
                <p className="text-xs font-semibold text-gray-500">
                  Version 1.0 • Formal Employment Compliance Execution Record
                </p>
              </div>

              <div className="text-left sm:text-right bg-[#FAF6EF] p-3 rounded-lg border border-[#e0bfbc] shrink-0 text-xs">
                <div className="text-[10px] font-bold text-[#810912] uppercase tracking-wider">Document ID</div>
                <div className="font-mono font-extrabold text-gray-800">RPHB-2026-EXEC</div>
                <div className="text-[10px] text-gray-500 mt-0.5">{empDate}</div>
              </div>
            </div>

            {/* Employee Particulars Grid */}
            <div className="bg-[#FAF6EF] p-5 rounded-xl border border-[#e0bfbc]/80 space-y-3">
              <h2 className="text-xs font-black uppercase tracking-wider text-[#810912] flex items-center gap-1.5">
                <User className="w-4 h-4" />
                Employee Particulars & Credentials
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-gray-500 block text-[11px]">Full Name</span>
                  <span className="font-bold text-gray-900 text-sm">{empName || 'Sarah Lin'}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[11px]">Designation / Position</span>
                  <span className="font-semibold text-gray-800">{empPosition || 'Digital Content Specialist'}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[11px]">Department</span>
                  <span className="font-semibold text-gray-800">{empDept || 'Marketing & Creative Strategy'}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[11px]">Execution Date</span>
                  <span className="font-semibold text-gray-800">{empDate}</span>
                </div>
              </div>
            </div>

            {/* Quiz Assessment Record */}
            <div className="bg-emerald-50/80 p-5 rounded-xl border border-emerald-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-black uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-emerald-700" />
                  Knowledge Assessment & Quiz Verification Record
                </h2>
                <span className="bg-emerald-700 text-white text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full">
                  {quizGrade}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 text-xs">
                <span className="text-gray-700">Handbook Competency Quiz Score:</span>
                <span className="font-black text-emerald-900 text-sm">{quizScorePercent}% Score</span>
              </div>
              <p className="text-[11px] text-emerald-800 italic">
                Employee has successfully demonstrated full understanding of company code of conduct, anti-bribery policies, and operational protocols.
              </p>
            </div>

            {/* Covenants Checklist */}
            <div className="space-y-3">
              <h2 className="text-xs font-black uppercase tracking-wider text-[#810912] flex items-center gap-1.5 pb-1 border-b border-gray-200">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                Employee Affirmation & Legal Covenants
              </h2>
              <ul className="space-y-2 text-xs">
                {covenantTexts.map((text, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-gray-700">
                    <span className="text-emerald-600 shrink-0 mt-0.5 font-bold">✓</span>
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Acknowledged Sections Log (Parts 1 to 15) */}
            <div className="space-y-3">
              <h2 className="text-xs font-black uppercase tracking-wider text-[#810912] flex items-center gap-1.5 pb-1 border-b border-gray-200">
                <FileCheck className="w-4 h-4 text-[#810912]" />
                Section-by-Section Initial Verification Log (Parts 1 - 15)
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {modules.map((m) => {
                  const initialData = partInitials[m.id];
                  const isHandwritten = initialData && initialData.startsWith('data:image/');

                  return (
                    <div
                      key={m.id}
                      className="p-2.5 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="font-semibold text-gray-800 truncate">
                          Part {m.id}: {m.title.replace(/^Part \d+ – /, '')}
                        </span>
                      </div>

                      <div className="shrink-0 bg-white border border-gray-300 rounded-md px-2 py-0.5 flex items-center justify-center min-w-[50px] h-[26px]">
                        {isHandwritten ? (
                          <img
                            src={initialData}
                            alt={`Part ${m.id} Initial`}
                            className="max-h-[20px] max-w-[55px] object-contain"
                          />
                        ) : (
                          <span className="font-serif italic font-bold text-[#810912] text-[11px]">
                            {initialData === 'PRE_COMPLETED' ? 'SL' : initialData || 'SL'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Final Execution Signature Box */}
            <div className="pt-4 border-t-2 border-dashed border-[#810912]/30 space-y-4">
              <h2 className="text-xs font-black uppercase tracking-wider text-[#810912] flex items-center gap-1.5">
                <PenTool className="w-4 h-4 text-[#810912]" />
                Final Digital Execution & Handwritten Signature
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-[#FAF6EF] p-5 rounded-xl border border-[#e0bfbc]">
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                    Employee Digital Signature
                  </span>
                  <div className="h-16 bg-white rounded-lg border border-gray-300 flex items-center justify-center p-2">
                    {finalSignatureDataUrl && finalSignatureDataUrl.startsWith('data:image/') ? (
                      <img
                        src={finalSignatureDataUrl}
                        alt="Final Handwritten Signature"
                        className="max-h-12 object-contain"
                      />
                    ) : (
                      <span className="font-serif italic text-lg text-[#810912] font-bold">
                        {empName || 'Sarah Lin'}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-gray-500 font-mono">
                    Signed by: {empName || 'Sarah Lin'} • {empDate}
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                    Company Representative / HR Seal
                  </span>
                  <div className="h-16 bg-white rounded-lg border border-gray-300 flex items-center justify-center p-2 text-center">
                    <div>
                      <div className="text-xs font-bold text-[#810912]">RedPoint HR Department</div>
                      <div className="text-[10px] text-gray-500">Electronically Verified & Filed</div>
                    </div>
                  </div>
                  <div className="text-[10px] text-gray-500 font-mono">
                    Status: COMPLIANT & RECORDED
                  </div>
                </div>
              </div>
            </div>

            {/* Document Footer */}
            <div className="text-center pt-4 text-[10px] text-gray-400 border-t border-gray-200">
              This document is a legally binding acknowledgement recorded in accordance with RedPoint Sdn. Bhd. employment compliance standards.
            </div>
          </div>
        </div>

        {/* Modal Footer Bar */}
        <div className="bg-white px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-gray-500">
            Previewing final combined handbook record with complete initials and signatures.
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all cursor-pointer"
            >
              Close Preview
            </button>

            <button
              type="button"
              onClick={onDownloadPdf}
              className="flex-1 sm:flex-none px-5 py-2 rounded-lg text-xs font-extrabold text-white bg-[#810912] hover:bg-[#a32626] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <Download className="w-4 h-4 text-[#D4AF37]" />
              <span>Download Full PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
