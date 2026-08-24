# Payroll Center Design and Layout

## Document Status

- **Product area:** Payroll Center
- **System:** RedPoint HRMS
- **Document type:** Design, layout, interaction, and feature specification
- **Implementation reference date:** August 20, 2026
- **Theme scope:** Color theme intentionally excluded
- **Primary entry point:** `Payroll Center` in the application sidebar

## Purpose

Payroll Center is the payroll processing workspace for selecting a pay period, choosing an employee, preparing payroll inputs, calculating statutory values, saving a processed payroll record, previewing the resulting document, exporting payroll data, and reviewing year-to-date history.

The feature supports both regular monthly payroll and separately generated payout documents. A separate payout is stored as its own payroll record and must not replace or merge into the employee's regular monthly salary record.

## Design Principles

- Keep payroll processing inside one guided workspace.
- Separate preparation, processed records, document preview, and history into clear stages.
- Make the employee, department, pay period, and corporate entity context visible before editing amounts.
- Show calculated values alongside editable pay-period overrides.
- Preserve the exact values and document settings used when a payroll record is processed.
- Treat statutory fields as conditional and disable them when the employee or payout is configured without statutory treatment.
- Support legacy payroll records while using the current Gross Pay v2 calculation for new regular payroll processing.
- Avoid destructive actions when changing filters, deselecting export rows, or switching between document views.
- Keep sensitive payroll exports permission-controlled and auditable.

## Information Architecture

```text
Core Operations
├── Dashboard
├── Employee Directory
├── Payroll Center
├── Leave Management
├── Work & Shift Groups
├── Performance Appraisal
└── Hire & Onboarding
```

Payroll Center contains four sequential workspace tabs:

```text
Payroll Center
├── 1. Payroll Editor
├── 2. Payroll File
├── 3. Preview of Payslip
└── 4. YTD & Payroll History
```

The standalone payroll editor and payslip viewer routes remain available for direct navigation, while the main Payroll Center presents the complete workflow in one place.

## Page Shell

```text
Application Shell
├── Left Sidebar
│   └── Payroll Center
├── Top Header
│   ├── Current user
│   ├── Active entity context
│   └── Account actions
└── Main Scrollable Content Pane
    └── Payroll Center
```

### Payroll Center Page Header

The Payroll Center page begins with:

```text
Payroll Center
├── Four-stage workflow navigation
├── Active Corporate Entity panel
└── Contextual workspace content
```

The active entity panel displays:

- Active corporate entity name.
- All-subsidiaries fallback when no individual entity is selected.
- An isolated workspace status indicator.

The employee list is scoped to the active entity when entity-scoped employees are available. If no employees are associated with the selected entity, the system falls back to the available employee collection rather than showing an empty workspace.

## Workflow Navigation

The four tabs are displayed as a horizontal segmented navigation control:

| Step | Label | Purpose | Entry condition |
|---|---|---|---|
| 1 | Payroll Editor | Prepare and process one employee payroll record | Employee must be eligible for the selected period |
| 2 | Payroll File | Review processed records and prepare an export | At least one processed record is recommended |
| 3 | Preview of Payslip | View a selected processed document | A payroll record must be selected |
| 4 | YTD & Payroll History | Review accumulated values and historical records | An employee must be available |

The payslip preview tab does not activate without a selected payroll record. If opened without a record, it presents a recovery message with a link back to Payroll File.

## Global Context Controls

The payroll editor uses the following context controls:

```text
Payroll Context
├── Pay Period
├── Department
└── Employee
```

### Pay Period

- Month and year are selected together.
- The default period is the current month and year.
- Changing the period clears the selected payroll record and export selection.
- The period determines payroll eligibility, salary proration, statutory calculations, YTD replacement behavior, and processed-record filtering.

### Department

- Defaults to `All Departments`.
- Department options are derived from employee records.
- Changing the department clears the selected payroll record and export selection.
- The department filter applies to employee eligibility, Payroll File rows, and export filters.

### Employee

- The selected employee is kept in sync with the current eligible employee pool.
- If the current employee is not eligible after a filter change, the first eligible employee is selected.
- Employee eligibility accounts for join date, termination date, selected month, and selected year.
- When no eligible employee exists, the editor shows an empty-state message and suggests changing the period, department, or employee filters.

## Payroll Editor

### Editor Layout

```text
Payroll Editor
├── Context Bar
│   ├── Pay Period
│   ├── Department
│   └── Employee
├── Separate Payout Panel
├── Document Display Settings Panel
├── Payroll Summary
├── Earnings and Additions
├── Deductions
├── Employee Contributions
├── Employer Contributions
├── YTD Summary
├── Notes and Description Controls
└── Editor Actions
```

The editor is an embedded version of the payroll editor component. It can also be displayed as a standalone editor route.

### Separate Payout Panel

The panel is displayed above the editor and offers three independent payout types:

| Payout type | Intended use | Document behavior |
|---|---|---|
| Bonus | One-time bonus payment | Separate payout document |
| Incentive / Commission | Commission or incentive payment | Separate payout document |
| Claim Reimbursement | Claim or reimbursement payment | Payment voucher-style document |

Each payout option explains that it creates a separate payroll record. Selecting a payout:

- Clears the regular payroll selection for the current editor mode.
- Uses the selected payout amount as the basis for the payout document.
- Starts with payout-specific defaults.
- Allows statutory treatment to be selected where supported.
- Does not overwrite the employee's regular monthly payroll record.

The panel includes a `Clear Selection` action after a payout type is selected.

### Document Display Settings

Display settings are saved per employee and applied to both Payslip and Payment Voucher output. The editor provides checkbox controls for:

- Designation or position label.
- Department.
- Email.
- NRIC / Passport.
- TIN / Tax Number.
- EPF Number.
- Date Joined.
- Last Working Day.
- Bank Account.
- Company Address.
- Earnings Details.
- Deduction Details.
- Employer Contributions.
- YTD Summary.
- Notes / Footer.

Available actions:

- `Reset to Default`
- `Save Display Settings`

Statutory-only fields are disabled when the employee or payout uses a Payment Voucher without statutory treatment. The system also forces statutory-only settings off when the document profile does not support statutory output.

### Payroll Input Sections

#### Payment Metadata

The payroll record can include:

- Payment date.
- Payroll month.
- Payroll year.
- Employee email.
- Regular or separate payout classification.
- Payout title.
- Payout description.

#### Basic Pay

- Basic salary is loaded from the employee's effective monthly profile.
- Historical or effective-dated salary data can determine the value for the selected period.
- The amount can be edited for the current pay period.
- Incomplete-month proration can reduce the Gross Pay v2 basis.

#### Allowances

The editor supports individually editable allowance lines:

- General allowance.
- Transport allowance.
- Parking allowance.
- Meal allowance.
- Accommodation allowance.
- Phone allowance.

Allowance lines can have persisted descriptions and are included in the calculation according to the active calculation version.

#### Variable Earnings

The editor supports:

- Overtime.
- Bonus.
- Commission.
- Back pay / arrears.
- AWS / 13th-month payment.
- Compensation or severance.
- Reimbursement.
- Other earning amount and description.

Variable earning lines support descriptions. Long-form line notes can also be saved for document output.

#### Employee Deductions

The editor supports:

- Unpaid leave.
- Incomplete-month deduction.
- Payment in lieu.
- CP38 direct tax.
- Other deductions with a custom description.
- Employee EPF.
- Employee SOCSO.
- Employee LINDUNG 24 Jam contribution.
- Employee EIS.
- Employee PCB.

Calculated statutory values can be reviewed and overridden for the processed pay period.

#### Employer Contributions

The editor supports:

- Employer EPF.
- Employer SOCSO.
- Employer EIS.
- HRD Corp levy.

Employer contributions are shown on statutory documents when enabled, but are not deducted from employee net pay.

### Expandable Line Editing

Earnings and deductions are presented as compact line items by default. The editor supports expanding individual lines to expose:

- Editable amount.
- Description field where applicable.
- Line note field where applicable.
- Reset or calculation-related controls where supported.

The design keeps the default view readable while allowing detailed editing when a payroll line requires attention.

### Statutory Treatment

Statutory treatment is explicitly controlled for contract employees and separate payout documents:

```text
Statutory Treatment
├── With statutory
└── Without statutory
```

When set to `Without statutory`:

- EPF, SOCSO, LINDUNG 24 Jam, EIS, PCB, and HRD Corp values are zeroed.
- Statutory-only document fields are hidden or disabled.
- The output uses Payment Voucher semantics where applicable.

When set to `With statutory`:

- Statutory values are calculated using the active payroll basis.
- Manual statutory overrides remain available before processing.
- Employer contribution sections can be included in the output.

## Calculation Model

### Regular Payroll: Gross Pay v2

New regular payroll records use the persisted `gross_pay_v2` calculation version.

```text
Gross Pay
= Basic Salary
+ General Allowance
+ Transport Allowance
+ Parking Allowance
+ Meal Allowance
+ Accommodation Allowance
+ Phone Allowance
+ Commission
- Unpaid Leave
- Incomplete Month Deduction
```

Gross Pay is constrained to a minimum of zero.

The current implementation intentionally treats regular payroll differently from legacy records:

- Gross Pay v2 uses the explicit Gross Pay formula.
- Reimbursements are added to the employee's net payout but do not form part of Gross Pay.
- Unpaid leave and incomplete-month deductions are included in the gross-pay reduction and are not subtracted twice from net pay.
- Legacy records retain legacy earnings behavior for compatibility.

### Net Pay

For Gross Pay v2 regular payroll:

```text
Net Pay
= Gross Pay
+ Reimbursements
- Employee Statutory Deductions
- Other Employee Deductions
```

Employee statutory deductions include the applicable EPF, SOCSO, LINDUNG 24 Jam, EIS, and PCB values. Other deductions include payment in lieu, CP38, and other deductions.

### Statutory Calculation Inputs

Statutory calculations can use:

- Gross Pay v2 Gross Pay.
- Statutory salary override for separate payouts.
- Employee statutory eligibility.
- Employee opt-in settings.
- EPF employee and employer rates.
- Employee marital status.
- Spouse working status.
- Number of dependants.
- Payroll month and year.
- Payroll item composition for SOCSO wages.
- Manual statutory overrides saved in the payroll record.

The implementation includes 2026 calculation logic for:

- EPF.
- SOCSO.
- SOCSO Invalidity and Employment Injury allocation.
- LINDUNG 24 Jam employee contribution.
- EIS.
- PCB.
- HRD Corp levy.

### Salary Proration

Salary proration considers:

- Join date.
- Termination date or last working day.
- Month length.
- Effective-dated salary changes.
- Mid-month salary adjustments.

The editor exposes the resulting pay-period salary and incomplete-month deduction so the processor can review or adjust the final record before processing.

### YTD Replacement

When editing a payroll record for a period that already contributes to YTD totals, the editor replaces the prior period values in the live YTD preview rather than adding a duplicate period.

YTD values can include:

- Basic salary.
- Allowances.
- Gross earnings.
- Reimbursements.
- Employee EPF.
- Employer EPF.
- Employee and employer SOCSO.
- Employee and employer EIS.
- Employee and employer LINDUNG 24 Jam values where applicable.
- PCB.
- Total deductions.
- Net pay.

## Processing Actions

The editor supports the following operational flow:

```text
Load Employee Profile
        ↓
Select Pay Period and Context
        ↓
Review or Edit Payroll Inputs
        ↓
Review Calculated Gross Pay and Statutory Values
        ↓
Save and Process
        ↓
Persist Payroll Record
        ↓
Open Payroll File
        ↓
Preview Payslip or Payment Voucher
```

Processing a record:

- Creates or updates the period-specific payroll record.
- Sets the record status to `Processed`.
- Persists calculated and manually overridden values.
- Persists document type and compensation label.
- Persists a document display-settings snapshot.
- Persists payroll line descriptions and notes.
- Persists the calculation version.
- Persists Gross Pay v2 Gross Pay when applicable.
- Sends the user to Payroll File after successful processing.

The saved record becomes the source of truth for subsequent Payroll File and payslip preview output.

## Payroll File

### Purpose

Payroll File is the processed-record workspace. It does not display unsaved editor drafts.

### Layout

```text
Payroll File
├── Header
│   ├── Title
│   ├── Description
│   └── Export action
├── Processed payroll table
└── Export selection guidance
```

### Record Filtering

Payroll File shows records that:

- Have status `Processed`.
- Belong to the active corporate entity's employee scope.
- Match the selected payroll month.
- Match the selected payroll year.
- Match the selected department, unless `All Departments` is selected.

Records are ordered with the most recently created or updated records first.

### Payroll File Table

| Column | Description |
|---|---|
| Selection | Checkbox for export inclusion |
| Employee | Name and employee email |
| Department | Employee department |
| Payroll Period | Month and year |
| Gross Pay | Persisted Gross Pay, with legacy fallback handling |
| Deductions | Calculated or persisted total deduction |
| Net Pay | Persisted net payout |
| Processed At | Processing timestamp |
| Action | `Preview Payslip` |

The table supports:

- Select all processed records.
- Select individual records.
- Deselect records without deleting them.
- Open a selected record in payslip preview.
- Export selected or filtered records.

### Empty State

When no processed records match the current filters, the page explains that the user should use `Save and Process` in Payroll Editor to add the employee to Payroll File.

## Payroll Export

### Export Entry Point

Payroll File includes the shared `ExportButton` configured for the payroll module.

The export request carries:

- Active entity.
- Department.
- Payroll month.
- Payroll year.
- Selected record IDs.
- Payroll export column definitions.
- Current user role.

### Supported Formats

The export system supports:

- PDF.
- XLSX.
- CSV.
- TXT.

### Default Payroll Export Fields

The payroll export definition includes:

- Serial number.
- Employee name.
- Employment type.
- Payment mode.
- IC / Passport number.
- Bank name.
- Bank account number.
- Basic salary.
- Commission.
- Allowances.
- Unpaid leave.
- Incomplete-month deduction.
- Gross Pay.
- Employee EPF.
- Employee SOCSO.
- Employee SKBBK / LINDUNG 24 Jam value.
- Employee EIS.
- PCB.
- Total deduction.
- Net Pay.
- Employer EPF.
- Employer SOCSO.
- Employer EIS.
- Payment description.

### Sensitive Export Controls

Sensitive fields include identity, bank, salary, contribution, tax, deduction, and net-pay data. Sensitive exports require the relevant role permission.

Export permissions include:

- `payroll.export`
- `payroll.export_sensitive`

Roles with payroll export access can export non-sensitive payroll fields. Sensitive fields are restricted to roles such as Global Administrator, Master User, Administrator, and Payroll Tax Approver according to the current permission map.

### Export Audit

Payroll exports are designed to write audit information containing:

- User ID.
- User name.
- Role.
- Module.
- Format.
- Scope.
- Record count.
- Selected fields.
- Applied filters.
- Success or failure status.
- Error message when applicable.
- IP address where available.
- Creation timestamp.

## Payslip and Payment Voucher Preview

### Preview Layout

```text
Document Preview
├── Document toolbar
│   ├── Back
│   ├── Zoom out
│   ├── Zoom level
│   ├── Zoom in
│   ├── Rotate
│   ├── Print
│   └── Download PDF
└── A4-style document canvas
    ├── Company header
    ├── Employee details
    ├── Earnings and additions
    ├── Deductions
    ├── Gross and net summary
    ├── Employer contributions
    ├── YTD summary
    ├── Pay period and payment metadata
    └── Notes or footer
```

### Document Profiles

The preview selects a document profile from the employee and processed record:

- Regular statutory employee output uses a Payslip profile.
- Contract employees without statutory treatment use Payment Voucher semantics.
- Separate bonus and commission payouts use separate payout document profiles.
- Claim reimbursements use a Payment Voucher-style profile.

The processed record's document type, compensation label, statutory treatment, and display settings snapshot are used when available.

### Employee Details

The document may display:

- Employee name.
- Designation.
- Department.
- Email.
- TIN / tax number.
- EPF number where statutory output is enabled.
- NRIC / Passport.
- Date joined.
- Last working day.
- Employment type.
- Payment date.
- Bank and account details.
- Company address.

Each item is controlled by the saved document display settings where applicable.

### Earnings and Additions

The document can display:

- Basic salary.
- Individual allowances.
- Overtime.
- Bonus.
- Commission.
- Back pay.
- AWS / 13th-month payment.
- Compensation.
- Reimbursement.
- Other earnings.

For separate payout documents, regular monthly salary fields are suppressed and only the payout-specific amount is presented.

### Deductions

The document can display:

- Employee EPF.
- Employee SOCSO.
- LINDUNG 24 Jam employee contribution.
- EIS.
- PCB.
- Unpaid leave.
- Payment in lieu.
- CP38.
- Other deductions.

Descriptions and line notes can be shown beneath the relevant payroll line.

### Totals

The document presents:

- Gross Pay or Gross Amount.
- Total deductions or other deductions for Payment Voucher output.
- Net Pay or Net Amount.
- Employer contributions when statutory output is enabled.
- YTD summary when enabled.

### Print and Download

Print:

- Generates a period-specific document filename.
- Opens the browser print flow.
- Supports print-oriented document rendering.

Download:

- Generates a PDF in the browser using the React PDF document component.
- Uses a filename based on employee, period, and document type.
- Shows a failure notification if PDF generation fails and recommends print-to-PDF as a fallback.

### Zoom and Rotation

The preview supports:

- Zoom out down to 70%.
- Zoom in up to 150%.
- Ten-percent zoom increments.
- Ninety-degree rotation increments.

## YTD and Payroll History

### Layout

```text
YTD & Payroll History
├── Header
│   ├── Title
│   ├── Description
│   └── Employee selector
├── YTD metric cards
└── Historical payroll table
```

### YTD Metric Cards

The current summary cards show:

- YTD Basic Salary.
- YTD Allowances.
- YTD PCB Deducted.
- YTD Net Payout.

The underlying YTD calculation also tracks statutory and deduction totals used by the payroll editor and detailed payroll calculations.

### Historical Table

| Column | Description |
|---|---|
| Month | Payroll month and year |
| Basic Salary | Basic salary for the period |
| Allowances | Combined allowance total |
| Overtime / Variable | Overtime, bonus, commission, back pay, AWS, and compensation |
| EPF (Employee) | Employee EPF |
| PCB Deducted | Actual PCB deducted |
| Net Pay | Net payout |
| Action | Open the saved document |

Separate payout records are marked with their payout title or a separate payout label.

The history view:

- Filters by the selected employee.
- Sorts by payroll month and record creation order.
- Includes regular and separate payout records.
- Opens a selected record in the document preview tab.
- Shows an empty state when no records exist.

## Persistence and Data Model

### Payroll Record Identity

Each processed payroll record contains:

- Record ID.
- Employee email.
- Payroll month.
- Payroll year.
- Processing status.
- Payment date.
- Payroll input values.
- Calculated and overridden statutory values.
- Gross Pay and calculation version.
- Net Pay.
- Document profile metadata.
- Display settings snapshot.
- Descriptions and line notes.
- Creation and update timestamps.

### Regular and Separate Records

```text
Payroll Record
├── payoutKind: regular
│   └── Monthly salary payroll
└── payoutKind: bonus
    └── Separate bonus payout
└── payoutKind: incentive_commission
    └── Separate commission payout
└── payoutKind: claim_reimbursement
    └── Separate reimbursement payout
```

Separate records use:

- `payout_kind`
- `is_separate_payout`
- `statutory_treatment`
- `payout_title`
- `payout_description`
- `line_notes`
- `document_type`
- `compensation_label`
- `display_settings_snapshot`

### Storage Adapters

The application supports persistence through:

- Supabase `payroll_records_2026`.
- Google Sheets `payroll_records_2026` through the Google Apps Script client.
- Local in-memory state for the current session when no external adapter is configured.

The save handler preserves compatibility aliases for deployments that still use older payroll column names, including:

- `totalAllowance`
- `grossSalary`
- `netSalary`
- `taxPcb`

### Database Additions

The latest payroll migrations add or formalize:

- Editable allowance and earning fields.
- Editable deductions and statutory overrides.
- Actual PCB deducted.
- Net Pay.
- Payment date.
- Payslip descriptions.
- Separate payout metadata.
- Line notes.
- Document type and compensation label.
- Display settings snapshot.
- Incomplete-month deduction.
- Persisted Gross Pay.
- Calculation version.
- Export audit log tables.
- Export field definitions.

## Latest Features

The following capabilities are present in the implementation as of August 20, 2026:

### Gross Pay v2

- Uses an explicit regular-payroll Gross Pay formula.
- Persists source-of-truth Gross Pay.
- Persists a calculation version.
- Handles incomplete-month deductions as part of the gross-pay calculation.
- Avoids double deduction of unpaid leave and proration values.
- Retains legacy behavior for older records.

### Separate Payout Documents

- Generates independent bonus documents.
- Generates independent incentive or commission documents.
- Generates independent claim reimbursement documents.
- Supports payout descriptions and line notes.
- Supports payout-specific statutory treatment.
- Prevents separate payouts from replacing regular salary payroll.

### Per-Employee Document Configuration

- Stores display settings on the employee.
- Saves a snapshot on each processed payroll record.
- Applies the same settings to browser preview and PDF output.
- Disables statutory-only fields for non-statutory Payment Vouchers.

### Pay-Period Persistence

- Saves all editable payroll lines to the payroll record.
- Saves payment date.
- Saves custom payslip descriptions.
- Saves line-level notes.
- Reopens processed records with their persisted values.

### Statutory Override Workflow

- Calculates statutory values automatically.
- Allows period-specific overrides.
- Supports statutory eligibility switching for contract and payout workflows.
- Persists employee and employer statutory contributions.
- Supports actual PCB deducted separately from calculated PCB.

### Entity and Period Isolation

- Scopes employees to the active corporate entity.
- Filters Payroll File by entity, department, month, and year.
- Keeps selected employee state aligned with the eligible employee list.
- Displays the active corporate entity context before processing.

### Processed Payroll File

- Only processed records appear in Payroll File.
- Supports row selection and select-all behavior.
- Supports direct payslip preview from a row.
- Supports export using current context filters.

### Permission-Aware Export

- Defines payroll export columns centrally.
- Distinguishes sensitive from non-sensitive fields.
- Applies role-based export permissions.
- Supports multiple export formats.
- Records export audit information.

### PDF and Print Output

- Provides browser PDF download.
- Provides browser print flow.
- Uses a document-specific filename.
- Supports regular Payslip and Payment Voucher document profiles.
- Provides preview zoom and rotation controls.

### YTD and Historical Review

- Provides YTD summary cards.
- Provides period-by-period payroll history.
- Includes separate payout markers.
- Replaces current-period values in YTD preview while editing an existing payroll record.

## Responsive Layout

The Payroll Center is designed for desktop-first payroll operations with responsive behavior:

- Workflow navigation may compress but remains horizontally organized.
- Context and settings panels use stacked layouts on narrow screens.
- Summary cards move from four columns to two columns and then a single-column flow.
- Payroll File tables use horizontal scrolling rather than clipping payroll fields.
- The payslip document maintains an A4-style canvas inside a scrollable preview area.
- Employee selectors and action groups wrap when the available width is limited.
- Long employee emails and document descriptions truncate or wrap without changing stored values.

## Empty, Loading, and Error States

### No Eligible Employee

Message intent:

```text
No eligible employees for this pay period.
Change the month, department, or employee filters to preview a payroll document.
```

### No Active Employee

Message intent:

```text
No active employee found.
Please register employees first.
```

### No Processed Payroll

Message intent:

```text
No processed payroll records.
Use Save and Process in Payroll Editor to add the current employee to this Payroll File.
```

### No Payslip Selected

Message intent:

```text
No payslip selected.
Open Payroll File and choose Preview Payslip on a processed payroll record.
```

### Persistence Failure

Save and sync failures show a notification and preserve the error context. The save action does not silently report success when the configured Supabase or Google Sheets adapter rejects the operation.

### PDF Failure

If client-side PDF generation fails, the user receives a failure notification with print-to-PDF as the fallback path.

## Accessibility and Interaction Requirements

- Use visible labels for pay period, department, and employee selectors.
- Keep buttons keyboard reachable and provide text labels in addition to icons where the action is not self-evident.
- Provide accessible labels for record-selection checkboxes.
- Do not use color alone to communicate statutory status, payout type, or processing state.
- Preserve focusable controls when panels expand or collapse.
- Keep table headers aligned with horizontally scrollable content.
- Use clear empty-state actions that return the user to the correct workflow stage.
- Make sensitive export restrictions understandable before the export request is submitted.

## Design Exclusions

This specification intentionally does not define:

- Color palettes.
- Theme tokens.
- Brand accent colors.
- Dark-mode or light-mode color behavior.
- Color contrast values tied to a specific palette.

Typography, spacing, borders, layout, content hierarchy, and interaction behavior may be implemented independently of the final visual theme.

## Implementation References

Primary implementation files:

- `src/components/PayrollView.tsx`
- `src/components/PayrollEditorMockupView.tsx`
- `src/components/PayslipDocumentView.tsx`
- `src/components/PayslipPDFDocument.tsx`
- `src/data.ts`
- `src/types.ts`
- `src/lib/exportTypes.ts`
- `src/lib/exportPermissions.ts`
- `api/_lib/exportService.ts`
- `src/App.tsx`

Relevant persistence migrations:

- `supabase/migrations/20260803_payroll_statutory_overrides.sql`
- `supabase/migrations/20260804_payroll_payslip_metadata.sql`
- `supabase/migrations/20260807_separate_payroll_payout_documents.sql`
- `supabase/migrations/20260819_export_system.sql`
- `supabase/migrations/20260820_payroll_gross_pay_v2.sql`
