import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { CandidateEvaluation } from '../types';

interface CandidateEvaluationPanelProps {
  value: CandidateEvaluation;
  onChange: (next: CandidateEvaluation) => void;
  onSave?: () => void;
  saving?: boolean;
  readOnly?: boolean;
}

const scoreOptions = Array.from({ length: 11 }, (_, index) => index);

export default function CandidateEvaluationPanel({
  value,
  onChange,
  onSave,
  saving = false,
  readOnly = false,
}: CandidateEvaluationPanelProps) {
  const update = (fields: Partial<CandidateEvaluation>) => {
    onChange({ ...value, ...fields });
  };

  const updateEvaluator = (
    id: string,
    fields: Partial<CandidateEvaluation['evaluators'][number]>
  ) => {
    update({
      evaluators: value.evaluators.map((evaluator) => (
        evaluator.id === id ? { ...evaluator, ...fields } : evaluator
      )),
    });
  };

  return (
    <div className="space-y-4 rounded-xl border border-amber-200 bg-amber-50/40 p-4 text-left">
      <div>
        <p className="text-xs font-black uppercase tracking-wider text-amber-800">
          HR / Interviewer Evaluation
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-amber-900/70">
          Internal evaluation is visible to administrators only and is never included in candidate share links.
        </p>
      </div>

      <div className="space-y-2">
        {value.evaluators.map((evaluator) => (
          <div key={evaluator.id} className="grid grid-cols-1 gap-2 rounded-lg border border-amber-200 bg-white p-3 sm:grid-cols-[1.2fr_1fr_9rem_auto]">
            <input
              aria-label="Evaluator name"
              disabled={readOnly}
              value={evaluator.name}
              onChange={(event) => updateEvaluator(evaluator.id, { name: event.target.value })}
              placeholder="Evaluator name"
              className="rounded-md border border-neutral-border px-2.5 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-neutral-50"
            />
            <input
              aria-label="Evaluator designation"
              disabled={readOnly}
              value={evaluator.designation}
              onChange={(event) => updateEvaluator(evaluator.id, { designation: event.target.value })}
              placeholder="Designation"
              className="rounded-md border border-neutral-border px-2.5 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-neutral-50"
            />
            <input
              aria-label="Evaluation date"
              type="date"
              disabled={readOnly}
              value={evaluator.date}
              onChange={(event) => updateEvaluator(evaluator.id, { date: event.target.value })}
              className="rounded-md border border-neutral-border px-2.5 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-neutral-50"
            />
            {!readOnly && value.evaluators.length > 1 && (
              <button
                type="button"
                onClick={() => update({ evaluators: value.evaluators.filter((item) => item.id !== evaluator.id) })}
                className="inline-flex items-center justify-center rounded-md p-2 text-red-600 hover:bg-red-50"
                aria-label="Remove evaluator"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
        {!readOnly && value.evaluators.length < 3 && (
          <button
            type="button"
            onClick={() => update({
              evaluators: [
                ...value.evaluators,
                {
                  id: `eval-${Date.now()}`,
                  name: '',
                  designation: '',
                  date: new Date().toISOString().slice(0, 10),
                },
              ],
            })}
            className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-white px-2.5 py-1.5 text-[11px] font-bold text-amber-800 hover:bg-amber-50"
          >
            <Plus className="h-3.5 w-3.5" /> Add evaluator
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        {([
          ['technicalScore', 'Technical'],
          ['communicationScore', 'Communication'],
          ['culturalFitScore', 'Cultural Fit'],
          ['leadershipScore', 'Leadership'],
        ] as const).map(([field, label]) => (
          <label key={field} className="text-[11px] font-bold text-on-surface-variant">
            {label} score
            <select
              disabled={readOnly}
              value={value[field]}
              onChange={(event) => update({ [field]: Number(event.target.value) } as Partial<CandidateEvaluation>)}
              className="mt-1 w-full rounded-md border border-neutral-border bg-white px-2.5 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-neutral-50"
            >
              {scoreOptions.map((score) => <option key={score} value={score}>{score} / 10</option>)}
            </select>
          </label>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="text-[11px] font-bold text-on-surface-variant">
          Overall recommendation
          <select
            disabled={readOnly}
            value={value.overallRecommendation}
            onChange={(event) => update({ overallRecommendation: event.target.value as CandidateEvaluation['overallRecommendation'] })}
            className="mt-1 w-full rounded-md border border-neutral-border bg-white px-2.5 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-neutral-50"
          >
            <option>Strong Hire</option>
            <option>Hire</option>
            <option>Hold</option>
            <option>No Hire</option>
          </select>
        </label>
        <label className="text-[11px] font-bold text-on-surface-variant">
          Additional comments
          <textarea
            disabled={readOnly}
            rows={2}
            value={value.additionalComments}
            onChange={(event) => update({ additionalComments: event.target.value })}
            placeholder="Add interview notes and context"
            className="mt-1 w-full resize-y rounded-md border border-neutral-border bg-white px-2.5 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-neutral-50"
          />
        </label>
      </div>

      {onSave && !readOnly && (
        <div className="flex justify-end">
          <button
            type="button"
            disabled={saving}
            onClick={onSave}
            className="rounded-md bg-primary px-3 py-2 text-xs font-bold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Saving evaluation...' : 'Save evaluation'}
          </button>
        </div>
      )}
    </div>
  );
}
