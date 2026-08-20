import React, { useEffect, useState } from 'react';
import { CalendarClock, CheckCircle2, Clock3, ExternalLink, LoaderCircle, ShieldCheck, UserRound, Video } from 'lucide-react';
import { Candidate, CandidateInterview, CandidateShareLink } from '../types';
import { getCandidateInterview, HiringPipelineData, loadHiringPipelineData } from '../lib/hiringPipelineService';
import { isShareLinkActive } from '../lib/hiringPipelineDomain';

interface CandidateShareViewProps {
  candidates: Candidate[];
}

export default function CandidateShareView({ candidates }: CandidateShareViewProps) {
  const [pipelineData, setPipelineData] = useState<HiringPipelineData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const params = new URLSearchParams(window.location.search);
  const token = params.get('candidateShare') || '';
  const shareType = params.get('shareType') === 'onboarding' ? 'onboarding' : 'interview';
  const candidateId = params.get('candidateId') || '';

  useEffect(() => {
    let cancelled = false;
    void loadHiringPipelineData()
      .then((data) => {
        if (!cancelled) setPipelineData(data);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-100 p-6">
        <div className="flex items-center gap-2 text-sm font-semibold text-on-surface-variant"><LoaderCircle className="h-5 w-5 animate-spin" /> Validating secure link...</div>
      </div>
    );
  }

  const link = pipelineData?.shareLinks.find((item) => item.token === token);
  const candidate = candidates.find((item) => item.id === (link?.candidateId || candidateId));
  const interview = candidate && pipelineData ? getCandidateInterview(pipelineData, candidate.id) : undefined;
  const valid = Boolean(link && candidate && isShareLinkActive(link.expiresAt, link.invalidatedAt) && link.kind === shareType);

  if (!valid || !link || !candidate) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-100 p-6">
        <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-7 text-center shadow-xl">
          <ShieldCheck className="mx-auto h-10 w-10 text-red-500" />
          <h1 className="mt-4 text-xl font-black text-on-background">Link unavailable</h1>
          <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">This candidate link has expired, been replaced, or is no longer valid. Please contact the hiring team for a new link.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-100 px-4 py-8 md:px-8">
      <div className="mx-auto max-w-2xl space-y-5">
        <div className="rounded-2xl bg-gradient-to-r from-[#1e293b] to-[#0f172a] p-6 text-white shadow-xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-300">RedPoint HRMS</p>
              <h1 className="mt-2 text-2xl font-black">{shareType === 'interview' ? 'Interview Details' : 'Onboarding Invitation'}</h1>
              <p className="mt-2 text-sm text-slate-300">This secure link is intended for {candidate.name}.</p>
            </div>
            <ShieldCheck className="h-8 w-8 text-emerald-300" />
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-border bg-white p-6 shadow-lg">
          <div className="flex items-center gap-3 border-b border-neutral-100 pb-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary"><UserRound className="h-5 w-5" /></div>
            <div>
              <h2 className="text-lg font-black text-on-background">{candidate.name}</h2>
              <p className="mt-1 text-xs text-on-surface-variant">{candidate.designation} · {candidate.department}</p>
            </div>
          </div>

          {shareType === 'interview' && interview ? (
            <div className="mt-5 space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4"><CalendarClock className="h-4 w-4 text-blue-600" /><p className="mt-3 text-[10px] font-bold uppercase tracking-wide text-blue-700">Date</p><p className="mt-1 font-black text-on-background">{interview.scheduledDate}</p></div>
                <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4"><Clock3 className="h-4 w-4 text-blue-600" /><p className="mt-3 text-[10px] font-bold uppercase tracking-wide text-blue-700">Time</p><p className="mt-1 font-black text-on-background">{interview.scheduledTime}</p></div>
              </div>
              {interview.meetingLink && (
                <a href={interview.meetingLink} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm font-bold text-primary hover:bg-primary/10">
                  <span className="flex min-w-0 items-center gap-2"><Video className="h-4 w-4 shrink-0" /><span className="truncate">Open interview meeting link</span></span>
                  <ExternalLink className="h-4 w-4 shrink-0" />
                </a>
              )}
              <p className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-xs font-semibold text-emerald-800"><CheckCircle2 className="h-4 w-4 shrink-0" /> Please keep this page available before your interview.</p>
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              <p className="text-sm leading-relaxed text-on-surface-variant">Your offer has been accepted. Please continue with the secure onboarding form to provide the remaining employee details.</p>
              <a href={`/?form=onboarding&candidateId=${encodeURIComponent(candidate.id)}&shareToken=${encodeURIComponent(link.token)}`} className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-bold text-white hover:opacity-90"><ExternalLink className="h-4 w-4" /> Continue onboarding form</a>
            </div>
          )}

          <p className="mt-6 border-t border-neutral-100 pt-4 text-[10px] text-on-surface-variant">This link expires on {new Date(link.expiresAt).toLocaleString()}. Internal hiring notes and evaluation scores are not included.</p>
        </div>
      </div>
    </div>
  );
}
