# Payroll Center Design and Implementation Prompt

## Prompt

You are an expert product designer and frontend engineer working on RedPoint HRMS.

Design and implement a complete Payroll Center experience for a corporate HR and payroll system. Use the existing application structure and payroll components as the source of truth. Do not invent behavior that conflicts with the current implementation.

The result must be a clear, production-ready payroll workspace for selecting a pay period, selecting an employee, preparing payroll values, calculating statutory deductions, processing payroll, reviewing processed records, previewing payslips or payment vouchers, exporting payroll data, and reviewing YTD payroll history.

Do not define or apply a color theme in this work. Avoid color palettes, brand accent colors, dark-mode colors, light-mode colors, and color-token specifications. Focus on structure, layout, hierarchy, content, interactions, calculations, accessibility, and responsive behavior.

## Product Structure

Place Payroll Center under Core Operations:

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

Payroll Center must contain four workflow stages:

```text
Payroll Center
├── 1. Payroll Editor
├── 2. Payroll File
├── 3. Preview of Payslip
└── 4. YTD & Payroll History
```

Use a desktop-first layout that remains usable on tablets and narrow screens. Keep payroll tables horizontally scrollable instead of clipping sensitive financial data.

## Page Shell

Build the page using this hierarchy:

```text
Application Shell
├── Left Sidebar
│   └── Payroll Center
├── Top Header
│   ├── Current user
│   ├── Active corporate entity
│   └── Account actions
└── Main Scrollable Content Pane
    └── Payroll Center
```

At the top of Payroll Center, show:

- Four-stage workflow navigation.
- Active corporate entity panel.
- Current entity name or an all-subsidiaries fallback.
- Clear workspace isolation status.

Scope employees to the active entity when entity-specific employees exist. If no employees are associated with the selected entity, fall back to the available employee collection instead of showing an unexplained blank page.

## Global Payroll Context

Provide visible controls for:

- Pay period month and year.
- Department.
- Employee.

Requirements:

- Default the pay period to the current month and year.
- Default the department to `All Departments`.
- Derive department options from employee data.
- Keep the employee selector synchronized with the eligible employee list.
- Re-select the first eligible employee when filters make the current employee invalid.
- Determine employee eligibility using join date, termination date, selected month, and selected year.
- Clear the selected payroll record and export selection when the pay period or department changes.
- Show a useful empty state when no employee is eligible.

Use this empty-state message pattern:

```text
No eligible employees for this pay period.
Change the month, department, or employee filters to preview a payroll document.
```

## Payroll Editor

Create the Payroll Editor using this structure:

```text
Payroll Editor
├── Context Bar
│   ├── Pay Period
│   ├── Department
│   └── Employee
├── Separate Payout Panel
├── Document Display Settings
├── Payment Metadata
├── Basic Pay
├── Earnings and Additions
├── Deductions
├── Employee Contributions
├── Employer Contributions
├── YTD Summary
├── Notes and Descriptions
└── Processing Actions
```

### Separate Payouts

Support independent payout documents for:

- Bonus.
- Incentive or commission.
- Claim reimbursement.

Each separate payout must:

- Create its own payroll record.
- Never replace the regular monthly payroll record.
- Use payout-specific document labels.
- Support a payout title and description.
- Support line notes.
- Support statutory treatment where applicable.
- Use the payout amount as the statutory basis when statutory treatment is enabled.
- Reset regular salary fields when the editor enters separate payout mode.

Provide a way to clear the selected payout mode.

### Document Display Settings

Add a per-employee display settings panel with these options:

- Designation or position.
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

Provide:

- `Reset to Default`.
- `Save Display Settings`.

Disable statutory-only options when the current employee or payout uses a non-statutory Payment Voucher profile. Apply the saved settings to both browser preview and PDF output. Save a snapshot of the settings on the processed payroll record.

## Payroll Input Fields

Support editable payroll values for:

### Payment Metadata

- Payment date.
- Payroll month.
- Payroll year.
- Payout title.
- Payout description.

### Basic Pay

- Basic salary.
- Incomplete-month deduction.

Load salary from the employee's effective profile for the selected period. Support effective-dated salary changes, historical salary values, and salary proration for joining or termination months.

### Allowances

- General allowance.
- Transport allowance.
- Parking allowance.
- Meal allowance.
- Accommodation allowance.
- Phone allowance.

### Variable Earnings

- Overtime.
- Bonus.
- Commission.
- Back pay or arrears.
- AWS or 13th-month payment.
- Compensation or severance.
- Reimbursement.
- Other earning amount.

Allow custom descriptions for applicable variable earning lines.

### Employee Deductions

- Unpaid leave.
- Incomplete-month deduction.
- Payment in lieu.
- CP38 direct tax.
- Other deductions.

Allow a custom description for other deductions.

### Employee Contributions

- Employee EPF.
- Employee SOCSO.
- Employee LINDUNG 24 Jam.
- Employee EIS.
- Employee PCB.

### Employer Contributions

- Employer EPF.
- Employer SOCSO.
- Employer EIS.
- HRD Corp levy.

Calculated values must remain editable as pay-period overrides before processing.

## Calculation Requirements

Implement the current regular payroll calculation as Gross Pay v2:

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

Gross Pay must never be below zero.

For regular Gross Pay v2 payroll:

```text
Net Pay
= Gross Pay
+ Reimbursements
- Employee Statutory Deductions
- Other Employee Deductions
```

Do not subtract unpaid leave or incomplete-month deduction twice.

Support the current statutory calculation inputs:

- Gross Pay or statutory salary basis.
- Employee statutory eligibility.
- Employee opt-in settings.
- EPF rates.
- Marital status.
- Spouse working status.
- Dependants.
- Payroll month and year.
- SOCSO wage components.
- Manual statutory overrides.

Support the current 2026 calculation behavior for:

- EPF.
- SOCSO.
- SOCSO Invalidity and Employment Injury allocation.
- LINDUNG 24 Jam.
- EIS.
- PCB.
- HRD Corp levy.

Retain legacy calculation behavior for records that predate Gross Pay v2.

## Processing Flow

Implement this flow:

```text
Load Employee Profile
        ↓
Select Pay Period and Context
        ↓
Review or Edit Payroll Inputs
        ↓
Review Gross Pay and Statutory Values
        ↓
Save and Process
        ↓
Persist Processed Payroll Record
        ↓
Open Payroll File
        ↓
Preview Payslip or Payment Voucher
```

When processing a payroll record:

- Save all editable payroll inputs.
- Save calculated and overridden statutory values.
- Set status to `Processed`.
- Persist Gross Pay.
- Persist the calculation version.
- Persist net pay.
- Persist payment date.
- Persist payout metadata.
- Persist document type and compensation label.
- Persist payslip descriptions and line notes.
- Persist the document display-settings snapshot.
- Navigate to Payroll File after a successful save.

Show a clear notification when saving or synchronization fails. Never report success when the configured persistence adapter rejects the request.

## Payroll File

Build Payroll File using this structure:

```text
Payroll File
├── Header
│   ├── Title
│   ├── Description
│   └── Export action
├── Processed payroll table
└── Export selection guidance
```

Only show records that:

- Have status `Processed`.
- Belong to the active entity scope.
- Match the selected payroll month.
- Match the selected payroll year.
- Match the selected department unless `All Departments` is selected.

Use these table columns:

- Selection checkbox.
- Employee.
- Department.
- Payroll period.
- Gross Pay.
- Deductions.
- Net Pay.
- Processed At.
- Preview Payslip action.

Support:

- Select all.
- Select individual records.
- Deselect records without deleting them.
- Preview a selected record.
- Export selected or filtered records.

Use this empty-state message pattern:

```text
No processed payroll records.
Use Save and Process in Payroll Editor to add the current employee to this Payroll File.
```

## Payroll Export

Connect Payroll File to the shared export system.

Support:

- PDF.
- XLSX.
- CSV.
- TXT.

The payroll export must support:

- Active entity.
- Department.
- Payroll month.
- Payroll year.
- Selected record IDs.
- Current user role.
- Selected export columns.

Include these export fields:

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
- Employee LINDUNG 24 Jam.
- Employee EIS.
- PCB.
- Total deduction.
- Net Pay.
- Employer EPF.
- Employer SOCSO.
- Employer EIS.
- Payment description.

Treat identity, banking, salary, contribution, tax, deduction, and net-pay fields as sensitive. Enforce role-based permissions for sensitive exports.

Use these permission concepts:

- `payroll.export`
- `payroll.export_sensitive`

Audit payroll exports with:

- User ID.
- User name.
- Role.
- Module.
- Format.
- Scope.
- Record count.
- Selected fields.
- Filters.
- Success or failure status.
- Error message.
- IP address when available.
- Creation timestamp.

## Payslip and Payment Voucher Preview

Build the preview using this structure:

```text
Document Preview
├── Toolbar
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

Support document profiles for:

- Regular statutory Payslip.
- Non-statutory Payment Voucher.
- Separate bonus payout.
- Separate commission or incentive payout.
- Separate claim reimbursement payout.

The preview must use the persisted payroll record values and its document metadata when a processed record is selected.

Support configurable employee details:

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

Support earnings:

- Basic salary.
- Allowances.
- Overtime.
- Bonus.
- Commission.
- Back pay.
- AWS.
- Compensation.
- Reimbursement.
- Other earnings.

Support deductions:

- Employee EPF.
- Employee SOCSO.
- LINDUNG 24 Jam.
- EIS.
- PCB.
- Unpaid leave.
- Payment in lieu.
- CP38.
- Other deductions.

Support:

- Line descriptions.
- Line notes.
- Gross Pay or Gross Amount.
- Total deductions or other deductions.
- Net Pay or Net Amount.
- Employer contributions.
- YTD summary.
- Pay period.
- Payment metadata.

Implement:

- Zoom from 70% to 150% in 10% increments.
- Rotation in 90-degree increments.
- Browser printing.
- Client-side PDF generation.
- Period-specific document filenames.
- Print-to-PDF fallback notification when PDF generation fails.

If no record is selected, show:

```text
No payslip selected.
Open Payroll File and choose Preview Payslip on a processed payroll record.
```

## YTD and Payroll History

Build the history view using this structure:

```text
YTD & Payroll History
├── Header
│   ├── Title
│   ├── Description
│   └── Employee selector
├── YTD metric cards
└── Historical payroll table
```

Show these YTD cards:

- YTD Basic Salary.
- YTD Allowances.
- YTD PCB Deducted.
- YTD Net Payout.

Track detailed YTD values for:

- Basic salary.
- Allowances.
- Gross earnings.
- Reimbursements.
- Employee and employer EPF.
- Employee and employer SOCSO.
- Employee and employer EIS.
- Employee and employer LINDUNG 24 Jam where applicable.
- PCB.
- Total deductions.
- Net pay.

Use these history table columns:

- Month.
- Basic salary.
- Allowances.
- Overtime or variable pay.
- Employee EPF.
- PCB deducted.
- Net pay.
- View document action.

Include regular and separate payout records. Mark separate payouts using their payout title or separate payout label.

When editing an existing payroll period, replace that period's values in the YTD preview instead of adding a duplicate period.

## Persistence

Persist payroll records through the existing configured adapters:

- Supabase `payroll_records_2026`.
- Google Sheets `payroll_records_2026` through Google Apps Script.
- Local session state when no external adapter is configured.

Persist:

- Record ID.
- Employee email.
- Payroll month and year.
- Status.
- Payment date.
- All payroll input fields.
- Statutory values.
- Actual PCB deducted.
- Gross Pay.
- Calculation version.
- Net Pay.
- Payout metadata.
- Document metadata.
- Display settings snapshot.
- Payslip descriptions.
- Line notes.
- Creation and update timestamps.

Preserve compatibility with legacy aliases such as:

- `totalAllowance`.
- `grossSalary`.
- `netSalary`.
- `taxPcb`.

## Responsive Behavior

Implement responsive behavior as follows:

- Stack context and settings panels on narrow screens.
- Move summary cards from four columns to two columns and then one column.
- Allow Payroll File tables to scroll horizontally.
- Keep the payslip document inside a scrollable preview area.
- Wrap selectors and action groups when space is limited.
- Allow long descriptions and emails to wrap or truncate without changing stored values.

## Empty and Error States

Implement clear states for:

- No eligible employee.
- No active employee.
- No processed payroll records.
- No selected payslip.
- Save or synchronization failure.
- PDF generation failure.

Every empty state must explain the cause and provide the next useful action.

## Accessibility

Ensure that:

- All context controls have visible labels.
- Icon-only actions have accessible names or titles.
- Selection checkboxes have accessible labels.
- Keyboard users can reach every action.
- Expandable editor rows preserve logical focus.
- Tables remain understandable when horizontally scrolled.
- Status, payout type, and statutory treatment are not communicated by color alone.
- Sensitive export restrictions are understandable before export submission.

## Non-Color Design Constraints

Do not include:

- Color palettes.
- Color variables.
- Theme tokens.
- Brand accent colors.
- Dark-mode color definitions.
- Light-mode color definitions.
- Color-only status indicators.

You may define:

- Layout.
- Spacing.
- Typography hierarchy.
- Borders.
- Elevation.
- Component states.
- Responsive breakpoints.
- Interaction patterns.
- Content hierarchy.

## Existing Implementation References

Use these files as implementation references:

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

Use these migrations as the latest payroll persistence references:

- `supabase/migrations/20260803_payroll_statutory_overrides.sql`
- `supabase/migrations/20260804_payroll_payslip_metadata.sql`
- `supabase/migrations/20260807_separate_payroll_payout_documents.sql`
- `supabase/migrations/20260819_export_system.sql`
- `supabase/migrations/20260820_payroll_gross_pay_v2.sql`

Before editing code:

1. Inspect the existing implementation.
2. Preserve unrelated user changes.
3. Reuse existing payroll calculations, types, persistence adapters, and export services.
4. Avoid duplicating payroll logic.
5. Add focused tests for changed behavior.
6. Verify the final layout on desktop and narrow screens.
7. Confirm that no color theme has been introduced.

Deliver a cohesive Payroll Center implementation that feels like one guided payroll workflow rather than a collection of disconnected screens.
