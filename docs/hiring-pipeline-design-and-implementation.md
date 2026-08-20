# Hiring Pipeline Design and Implementation

## 1. Purpose

The Hiring Pipeline manages a candidate from application intake through onboarding:

```text
Received Submission
        |
        v
Applied
   |         \
   |          \--> KIV
   v
Shortlisted
        |
        v
Interview Scheduled
   |              \
   |               \--> Cancelled / No-show / Withdrew / KIV
   v
Interview Date Passed
        |
        v
Interview Evaluation
   |         |       \
   |         |        \--> KIV
   |         \--> Reject
   v
Offer Preparing
        |
        v
Offer Sent
   |       \
   |        \--> Offer Rejected
   v
Offer Accepted
        |
        v
Onboarding
```

`Received Submission` is recorded as an intake history event. The candidate enters the visible `Applied` queue immediately after submission.

## 2. Design Goals

- Use explicit lifecycle states instead of a generic advance action.
- Keep every important decision auditable.
- Separate candidate-facing information from internal HR information.
- Keep the main pipeline on one page.
- Make queue-specific actions visible only when they are valid.
- Support local preview persistence and Supabase persistence.
- Preserve compatibility with the existing broad candidate stage values.
- Keep the layout responsive without depending on a color theme.

## 3. Main Page Layout

```text
Hire & Onboarding
Manage Applied submissions, KIV decisions, interviews, offers,
secure candidate handoffs, and onboarding progress.

[Pipeline] [Application Form] [Employee Enrollment] [Onboarding Portal]
[Share Apply Link]

Summary
----------------------------------------------------------------
| Applied | KIV | Pending Interviews | Pending Offers            |
----------------------------------------------------------------

Pipeline Navigation
[Applied] [KIV] [Interviewing] [Offered] [Onboarding]

System Notice
Applied submissions are reviewed before interview scheduling.
Interviewing is split automatically by scheduled date and time.
KIV and rejected decisions remain auditable in candidate history.

Active Workspace
----------------------------------------------------------------
| Candidate Queue                 | Candidate Detail Workspace |
|                                 |                            |
| Candidate card                  | Candidate header           |
| Candidate card                  | Contact and role details   |
| Candidate card                  | Queue-specific actions     |
|                                 | Audit trail                |
----------------------------------------------------------------

Candidate-facing Links
```

### 3.1 Page Header

The header contains:

- Page title: `Hire & Onboarding`.
- Short description of the pipeline purpose.
- Section navigation for the pipeline, application form, employee enrollment, and onboarding portal.
- A public application link action.

The section navigation updates the route without leaving the hiring module.

### 3.2 Summary Cards

Display four summary cards:

| Card | Value |
|---|---|
| Applied | Number of candidates in Applied or Shortlisted |
| KIV | Number of candidates in the KIV queue |
| Pending Interviews | Number of upcoming scheduled interviews |
| Pending Offers | Number of offers in Offer Preparing or Offer Sent |

Cards use a compact layout on smaller screens and a four-column layout when there is sufficient horizontal space.

### 3.3 Pipeline Navigation

The primary pipeline navigation contains:

1. `Applied`
2. `KIV`
3. `Interviewing`
4. `Offered`
5. `Onboarding`

The navigation is horizontally scrollable on smaller screens. Each item displays its current queue count.

### 3.4 Candidate Queue

The queue panel contains:

- Queue title.
- Short instruction to select a candidate.
- Refresh action.
- Delete action for a selected candidate in the Applied queue.
- Scrollable candidate cards.
- Empty state when no candidates are available.

Each candidate card displays:

- Candidate name.
- Department.
- Designation.
- Current detailed status.
- Scheduled interview date and time when applicable.
- Offer status when applicable.

### 3.5 Candidate Detail Workspace

The detail workspace displays:

- Candidate name.
- Current detailed status.
- Email address.
- Phone number.
- Department and designation.
- Assigned company entity.
- Queue-specific actions.
- Candidate-facing sharing actions where applicable.
- Audit trail of status changes and decisions.

The candidate detail workspace remains separate from the queue so that the queue stays scannable while the complete record is open.

## 4. Queue Design

### 4.1 Applied Queue

The Applied queue contains candidates with:

- `applied`
- `shortlisted`

Available actions:

- `Shortlist`: moves an Applied candidate to Shortlisted.
- `Schedule Interview`: available after shortlisting.
- `KIV`: moves the candidate to the KIV queue.
- `Reject`: moves the candidate to a final rejected state.
- `Delete`: permanently removes the selected candidate after confirmation.

The Applied queue does not display the internal evaluation panel.

### 4.2 KIV Queue

The KIV queue is a separate active queue. A KIV record may contain:

- KIV notes.
- Optional follow-up date.
- The status transition that caused the candidate to enter KIV.
- The responsible HR user.

Available action:

- `Resume Applied`: returns the candidate to the Applied queue and clears KIV-specific fields.

### 4.3 Interviewing Queue

Interviewing is split into two sub-tabs:

```text
[Upcoming Interview] [Passed Interview]
```

#### Upcoming Interview

An interview is upcoming when the scheduled date and time are later than the current time and the interview status is `scheduled`.

Available actions:

- `Change Date & Time`.
- `Cancel`.
- `Other`:
  - Candidate no-show.
  - Candidate withdrew.
  - Move to KIV.
- Copy interview share link.
- Email interview details.
- Share interview details through WhatsApp.

#### Passed Interview

An interview is passed when its scheduled date and time have elapsed. This means the interview date has passed; it does not mean the candidate passed the assessment.

Available actions:

- Open Interview Evaluation.
- Copy interview share link.
- Email interview details.
- Share interview details through WhatsApp.

### 4.4 Offered Queue

The Offered queue contains candidates whose evaluation resulted in an offer.

Offer filters:

- All Offers.
- Offer Preparing.
- Offer Sent.
- Offer Rejected.

Offer transitions:

```text
Offer Preparing -> Offer Sent -> Offer Accepted
                                  |
                                  v
                              Onboarding

Offer Sent -> Offer Rejected
```

`Offer Accepted` is blocked until the offer is in `Offer Sent`.

### 4.5 Onboarding Queue

The Onboarding queue contains candidates whose offers were accepted.

The workspace contains:

- Onboarding handoff summary.
- Secure link generation and regeneration.
- Copy and share actions.
- Email action.
- WhatsApp action.
- Active link and expiry information.
- Onboarding checklist.
- Progress percentage.

The onboarding candidate link exposes only candidate-facing onboarding information. Internal evaluations, HR notes, offer history, and pipeline decisions are not exposed.

## 5. Candidate Detail Actions

### 5.1 Applied Actions

```text
[Shortlist] [KIV] [Reject]
```

For a shortlisted candidate:

```text
[Schedule Interview] [KIV] [Reject]
```

### 5.2 Interview Schedule Form

```text
Schedule Interview

Candidate                         [Selected candidate]
Date                             [Date picker]
Time                             [Time picker]
Interview Link                   [Text input]
Notes                            [Text area]

                                      [Cancel] [Save Interview]
```

Validation:

- Candidate is required.
- Date is required.
- Time is required.
- Date and time must form a valid date.

Saving a new schedule creates an `Interview Scheduled` history event. Saving an existing interview updates the same interview record and creates an `Interview Rescheduled` history event.

### 5.3 Interview Status Dialog

```text
Update Interview Status

Candidate name
Reason / notes                    [Text area]

                              [Cancel] [Save Decision]
```

Cancellation notes are optional. The selected status and notes are recorded in the interview record and pipeline history.

### 5.4 Interview Evaluation

The evaluation panel is internal to HR and is opened only from the Passed Interview queue.

Fields:

- Evaluator name.
- Evaluator designation.
- Evaluation date.
- Technical score.
- Communication score.
- Cultural-fit score.
- Leadership score.
- Overall recommendation.
- Additional comments.

Final actions:

```text
[KIV] [Reject] [Offer]
```

Public application forms never display or populate this internal panel.

### 5.5 Offer Status Actions

```text
Offer Preparing
        |
        +--> [Mark Offer Sent]

Offer Sent
        |
        +--> [Offer Accepted]
        +--> [Offer Rejected]
```

Offer status changes require confirmation where the decision is consequential. The record stores the status timestamp, response notes, and rejection reason where applicable.

## 6. Candidate Sharing

### 6.1 Interview Links

Interview sharing supports:

- Copy link.
- Native share handoff where supported.
- Email handoff.
- WhatsApp handoff.

Interview links:

- Expire after 7 days.
- Are generated only for the selected candidate and interview.
- Can be regenerated.
- Invalidate the previous active link when regenerated.

### 6.2 Onboarding Links

Onboarding sharing supports:

- Generate and copy.
- Regenerate and copy.
- Email handoff.
- WhatsApp handoff.

Onboarding links:

- Expire after 30 days.
- Are generated after Offer Accepted.
- Can be regenerated.
- Invalidate the previous active link when regenerated.

### 6.3 Candidate-Facing Data Rules

Candidate-facing links may expose:

- Candidate identity.
- Interview date and time.
- Interview meeting link.
- Onboarding form information.
- Required candidate actions.

Candidate-facing links must not expose:

- Internal evaluation scores.
- Evaluator information.
- KIV notes.
- Rejection notes.
- Offer decision history.
- HR audit history.

## 7. Status Model

The detailed status is the source of truth for pipeline behavior.

| Detailed status | Broad candidate stage | Queue or meaning |
|---|---|---|
| `applied` | `Applied` | New application awaiting review |
| `shortlisted` | `Applied` | Application selected for interview scheduling |
| `kiv` | `Applied` | Active KIV queue |
| `interview_scheduled` | `Interviewing` | Interview scheduled |
| `interview_cancelled` | `Interviewing` | Interview cancelled |
| `interview_no_show` | `Interviewing` | Candidate did not attend |
| `interview_withdrew` | `Interviewing` | Candidate withdrew |
| `interview_passed` | `Interviewing` | Interview date has passed |
| `offer_preparing` | `Offered` | Offer is being prepared |
| `offer_sent` | `Offered` | Offer has been sent |
| `offer_accepted` | `Onboarding` | Candidate accepted the offer |
| `offer_rejected` | `Offered` | Candidate rejected the offer |
| `onboarding` | `Onboarding` | Candidate onboarding is active |
| `rejected` | `Applied` | Final rejected state retained for audit |

The broad `Candidate.stage` values remain:

- `Applied`
- `Interviewing`
- `Offered`
- `Onboarding`

This preserves compatibility with existing employee enrollment and legacy candidate views.

## 8. Data Model

### 8.1 Candidate Fields

Existing candidate fields remain supported:

- `id`
- `name`
- `email`
- `phone`
- `designation`
- `department`
- `entityId`
- `stage`
- `progress`
- `dateJoined`

Pipeline fields:

- `pipelineStatus`
- `pipelineUpdatedAt`
- `receivedAt`
- `appliedAt`
- `kivNotes`
- `kivFollowUpDate`
- `rejectionReason`

### 8.2 Pipeline History

`candidate_pipeline_history` records:

- Candidate ID.
- Previous status.
- New status.
- Event type.
- Notes.
- Actor name.
- Creation timestamp.

Every important transition should append a history record rather than overwriting the audit trail.

### 8.3 Interview Record

`candidate_interviews` stores:

- Candidate ID.
- Scheduled date.
- Scheduled time.
- Meeting link.
- Notes.
- Interview status.
- Cancellation reason.
- Creation timestamp.
- Last update timestamp.

The current interview record is reused when an interview is rescheduled.

### 8.4 Evaluation Record

`candidate_evaluations` stores one current evaluation record per candidate:

- Candidate ID.
- Evaluators.
- Technical score.
- Communication score.
- Cultural-fit score.
- Leadership score.
- Overall recommendation.
- Additional comments.
- Last update timestamp.

### 8.5 Offer Record

`candidate_offers` stores:

- Candidate ID.
- Offer status.
- Status update timestamp.
- Response notes.
- Rejection reason.

Offer terms and offer-document generation are outside the scope of this version.

### 8.6 Share Link and Delivery Records

`candidate_share_links` stores:

- Candidate ID.
- Link kind: `interview` or `onboarding`.
- Secure token.
- Candidate-facing URL.
- Expiry timestamp.
- Creation timestamp.
- Invalidation timestamp.

`candidate_share_deliveries` stores:

- Share link ID.
- Candidate ID.
- Delivery channel.
- Delivery handoff status.
- Creation timestamp.
- Optional error.

## 9. Persistence Strategy

### Supabase

When Supabase is configured:

- Candidate pipeline records are mirrored to Supabase.
- Candidate deletion relies on the candidate foreign-key cascade for related pipeline records.
- Pipeline tables are loaded and normalized from snake_case to camelCase.

### Local Preview Fallback

When Supabase is unavailable:

- Pipeline data is stored under the `offline_hiring_pipeline` local storage key.
- Candidate intake and status history continue to work in local preview.
- Share links and delivery handoffs remain available for preview testing.

### Existing Data Compatibility

Candidates without a detailed pipeline status are mapped from their existing broad stage:

- `Interviewing` maps to `interview_scheduled`.
- `Offered` maps to `offer_preparing`.
- `Onboarding` maps to `onboarding`.
- Other values map to `applied`.

Existing candidates receive a `received_submission` history event the first time the pipeline loads if one does not already exist.

## 10. Notifications and Confirmations

Use the global feedback system for:

- Candidate rejection.
- Moving a candidate to KIV.
- Interview cancellation.
- Offer rejection.
- Offer acceptance.
- Candidate deletion.
- Link generation and regeneration.
- Persistence errors.

Confirmation dialogs must:

- Explain the action.
- Identify the candidate.
- Use a destructive confirmation for rejection or deletion.
- Prevent duplicate submissions.
- Show processing state while the action is running.

## 11. Responsive Layout

### Desktop

- Use a two-column queue and detail workspace.
- Keep the queue independently scrollable.
- Display summary cards in a single row.
- Keep queue navigation horizontal.

### Tablet

- Preserve the two-column layout when space allows.
- Stack the detail workspace below the queue when needed.
- Keep forms readable with full-width fields.

### Mobile

- Stack queue and detail panels vertically.
- Make queue navigation horizontally scrollable.
- Use full-width action buttons where practical.
- Keep candidate details and status visible without relying on hover.
- Convert wide tables or audit content into stacked records.

## 12. Accessibility Requirements

- Every form field has a visible label.
- Buttons use descriptive text or accessible labels.
- Dialogs provide a clear title and purpose.
- Dialogs can be dismissed with the close control and Escape where appropriate.
- Status is represented by text, not styling alone.
- Queue counts are available as text.
- Candidate-facing links provide clear expiry information.
- Destructive actions require explicit confirmation.
- Loading states disable the action currently being processed.

## 13. Implementation Map

| Area | File |
|---|---|
| Hiring pipeline page and workspace | `src/components/HireOnboardingView.tsx` |
| Candidate evaluation form | `src/components/CandidateEvaluationPanel.tsx` |
| Candidate-facing share view | `src/components/CandidateShareView.tsx` |
| Pipeline status helpers and link rules | `src/lib/hiringPipelineDomain.ts` |
| Pipeline persistence and share records | `src/lib/hiringPipelineService.ts` |
| Candidate types and pipeline interfaces | `src/types.ts` |
| Application routing and candidate persistence | `src/App.tsx` |
| Supabase schema | `supabase/migrations/20260818_hiring_pipeline_redesign.sql` |
| Hiring pipeline tests | `src/test_hiring_pipeline.ts` |

## 14. Acceptance Criteria

- A public application appears in Applied and creates a Received Submission history event.
- An admin can Shortlist, Reject, or move an Applied candidate to KIV.
- KIV candidates are visible in their own queue and can resume to Applied.
- A shortlisted candidate can be scheduled for an interview.
- Upcoming and Passed Interview queues are determined by the scheduled date and time.
- Upcoming interviews can be rescheduled, cancelled, marked no-show, marked withdrawn, or moved to KIV.
- Passed interviews can open and save the internal evaluation.
- Evaluation decisions can move a candidate to Offer, Reject, or KIV.
- Offer Accepted is unavailable until Offer Sent is selected.
- An accepted offer moves the candidate to Onboarding.
- Interview links expire after 7 days.
- Onboarding links expire after 30 days.
- Regenerated links invalidate previous links.
- Candidate-facing links do not expose internal HR information.
- Candidate deletion requires confirmation.
- Existing broad candidate stage values remain compatible.
- The page works in local fallback mode and with Supabase persistence.

## 15. Verification Commands

```bash
npm run lint
npm test
npm run build
git diff --check
```

The browser smoke check should verify:

1. The Pipeline section opens.
2. Applied, KIV, Interviewing, Offered, and Onboarding queues are visible.
3. Interviewing exposes Upcoming and Passed sub-tabs.
4. Applied actions are visible only for the selected candidate.
5. The internal evaluation panel is not visible in the public application form.
6. Candidate-facing share links do not include internal evaluation data.
