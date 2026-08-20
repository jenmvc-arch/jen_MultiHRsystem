# Work & Shift Groups and Leave Management

## Scope

This document defines the layout, interaction design, and system behavior for:

- `Work & Shift Groups`, a standalone Core Operations feature.
- `Leave Management`, the leave policy, balance, request, holiday, and calendar feature.

Color values and visual theme tokens are intentionally excluded.

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

Work & Shift Groups must not appear as a duplicate tab inside Leave Management.

## Shared Page Structure

Both modules use the following page hierarchy:

```text
Page Header
├── Page title
├── Short description
├── Primary action
└── Refresh action

Summary Metrics

Section Navigation or Workspace Controls

Main Content
├── Configuration forms
├── Current records
├── Validation messages
└── Audit or history information
```

## Work & Shift Groups

### Purpose

Configure employee working days, start and end times, full-day schedules, half-day schedules, rest days, weekly hours, and employee assignments.

### Page Layout

```text
Work & Shift Groups
Configure working days, shifts, rest days, weekly hours, and assignments.

[Active Groups] [Assigned Employees] [Over 45 Hours]

Create Work & Shift Group
├── Group Name
├── Description
└── [Add Group]

Workspace
├── Group List
└── Selected Group Editor
    ├── Group Name
    ├── Description
    ├── Enabled status
    ├── Weekly total
    ├── Weekly warning
    ├── Seven-day schedule table
    └── [Save Group]

Assign Work & Shift Group
├── Single / Bulk mode
├── Employee selector
├── Work & Shift Group selector
├── Effective date
├── Optional end date
└── [Assign Group]

Assignment History
```

### Schedule Table

| Working Day | Start Time | End Time | Day Setting | Work | Rest | Actual Hours |
|---|---|---|---|---|---|---|
| Monday | Time input | Time input | Full Day / Half-day / Rest | Checkbox | Checkbox | Calculated |
| Tuesday | Time input | Time input | Full Day / Half-day / Rest | Checkbox | Checkbox | Calculated |
| Wednesday | Time input | Time input | Full Day / Half-day / Rest | Checkbox | Checkbox | Calculated |
| Thursday | Time input | Time input | Full Day / Half-day / Rest | Checkbox | Checkbox | Calculated |
| Friday | Time input | Time input | Full Day / Half-day / Rest | Checkbox | Checkbox | Calculated |
| Saturday | Time input | Time input | Full Day / Half-day / Rest | Checkbox | Checkbox | Calculated |
| Sunday | Time input | Time input | Full Day / Half-day / Rest | Checkbox | Checkbox | Calculated |

Start and end times remain editable for every row, including Rest rows. Rest rows calculate zero hours but preserve entered times.

### Schedule Rules

- Time inputs use 24-hour values.
- Full Day actual hours are `(end time - start time) - 1 hour break`.
- Half-day is displayed as `Half-day`.
- Selecting Half-day keeps the existing start time and defaults the end time to four hours later.
- Changing a Half-day start time updates the default end time to four hours later.
- The Half-day end time remains editable after the automatic value is applied.
- Rest days calculate `0` actual hours.
- Start and end times cannot be identical for a working day.
- End times earlier than start times represent an overnight shift.
- Work and Rest are mutually exclusive.
- A group must contain at least one Work day.
- Weekly hours are calculated across all seven days.
- Weekly hours above 45 show a warning but do not block saving.

### Default Schedule

```text
Monday-Friday: 09:00-18:00, Full Day, Work
Saturday-Sunday: Rest
Weekly total: 40 hours
```

### Group Actions

- Add a group.
- Edit group name.
- Edit description.
- Enable or disable a group.
- Edit all seven schedule rows.
- Save schedule changes.
- Delete custom groups with confirmation.
- Protect the default Malaysia standard group from deletion.

### Employee Assignment

```text
Assign Work & Shift Group

Assignment Type: [Single] [Bulk]

Employee(s)              [Selector]
Work & Shift Group       [Selector]
Effective Date           [Date]
End Date                 [Optional Date]

[Assign Group]
```

Assignment rules:

- Each employee has one effective active schedule at a time.
- Future-dated assignments are allowed.
- A new assignment ends or deactivates a conflicting current assignment.
- Replacement requires confirmation.
- Bulk mode supports multiple employees.
- Conflicts are listed before replacement.
- Historical leave records are not rewritten.
- Employees without an assignment use the Malaysia standard schedule.

### Assignment Table

| Employee | Department | Designation | Work & Shift Group | Effective Date | End Date | Status |
|---|---|---|---|---|---|---|
| Employee name | Department | Designation | Group name | Date | Date or Open ended | Current / Future / History |

## Leave Management

### Purpose

Manage leave types, conditioning policies, carry-over settings, leave groups, employee assignments, public holiday groups, leave requests, Off in Lieu, balances, payroll deductions, and the leave calendar.

### Navigation

```text
Requests & Balances
Off in Lieu
Leave Groups
Employee Assignment
Public Holidays
Type of Leave
Conditioning Policy
Carry Over Settings
Calendar
```

Work & Shift Groups is managed separately under Core Operations.

### Page Header

```text
Leave Management
Configure leave policies, leave groups, requests, Off in Lieu,
balances, public holidays, and payroll deductions.

[Refresh Leave Data] [Off in Lieu Request]
```

### Summary Metrics

```text
[Active Leave Types]
[Leave Groups]
[Pending Leave]
[Pending Off in Lieu]
```

## Requests & Balances

```text
Requests & Balances
├── Employee Balance
├── Submit Leave Request
└── Applications Queue
```

### Employee Balance

```text
Employee Leave Balance                    [Select Employee]

Employee Name
Department · Designation

[Annual Leave]
[Sick Leave]
[Unpaid Leave]
[Replacement Leave]
```

Each balance card displays:

- Remaining days.
- Total entitlement.
- Approved days taken.
- Pending days.
- Carry-forward days.
- Credit days.
- Expiry date when applicable.

### Submit Leave Request

```text
Submit Leave Request

Employee                         [Dropdown]
Department                       [Auto-filled]
Designation                      [Auto-filled]
Leave Type                       [Dropdown]
Start Date                       [Date]
End Date                         [Date]
Computed Deduction Days          [Calculated]
Applicable Policy                [Calculated]
Reason / Notes                   [Text area]

[Submit Leave Application]
```

Leave calculation uses:

```text
Employee Work & Shift Group
+ Assigned Leave Group
+ Conditioning Policy
+ Selected Public Holiday Groups
```

### Applications Queue

Each request displays:

- Employee.
- Department.
- Designation.
- Leave type.
- Date range.
- Total days.
- Reason.
- Payroll deduction.
- Payroll sync status.
- Current status.

Actions:

```text
[Approve] [Reject]
```

Approval and rejection require the global confirmation system.

## Off in Lieu

```text
Off in Lieu Request (Replacement)

Submission Type                 [Single / Bulk]
Expiry Date                     [Date]

Employee Details
├── Employee Name
├── Department
└── Designation

Date of OT
├── Date
├── From
├── To
├── Working Hours
└── Eligible Replacement Leave

[+ Add Additional Date and Time]
[+ Add Additional Employee]

Total Off in Lieu               [Calculated]
Notes                           [Text area]

[Save] [Save and Submit] [Cancel]
```

Rules:

- Up to 6 hours earns `0.5` day.
- More than 6 hours earns `1` day.
- Expiry defaults to one month from submission.
- Single mode accepts one employee.
- Bulk mode accepts multiple employees.
- Approval creates Replacement Leave credits.
- Replacement Leave credits are consumed oldest-expiring-first.

## Leave Groups

### Group Formula

```text
Type of Leave
+ Conditioning Policy
+ Carry Over Setting
+ Up to two Public Holiday Groups
= Leave Group
```

### Layout

```text
Leave Groups
├── Add Leave Group
├── Group List
└── Selected Group Rules
```

Selected group settings:

- Group name.
- Description.
- Enabled status.
- Leave types.
- Conditioning policy.
- Carry-over setting.
- Public Holiday Groups, maximum two.
- Rest/off-day source:
  `Employee's active Work & Shift Group`.

### Leave Group Rule Table

| Leave Type | Conditioning Policy | Carry Over Setting | Entitlement | Action |
|---|---|---|---:|---|
| Annual Leave | Policy | Setting | Days | Remove |

Validation:

- Duplicate leave types across active groups are blocked for an employee.
- Maximum two public holiday groups per Leave Group.
- Duplicate holiday groups are not allowed.
- Existing groups default to Malaysia National.

## Employee Assignment

```text
Employee Leave Group Assignment

Employee          [Dropdown]
Leave Group       [Dropdown]
Effective Date    [Date]

[Assign Group]
```

Assignment records display:

- Employee.
- Department.
- Designation.
- Leave Group.
- Effective date.
- Active or disabled status.

Assignments with overlapping leave types must be rejected with inline feedback.

## Public Holidays

### Categories

- National.
- State.

### Layout

```text
Public Holiday Groups

[National] [State]

Group Name          [Input]
Category            [Selector]

Selected Group
├── Group Name
├── Category
├── State Code
├── Year
└── Enabled

Add Holiday
├── Holiday Name
├── Date
├── Observed Date
├── Notes
└── [Add Holiday]
```

### Holiday Record

| Holiday Name | Date | Observed Date | Year | Notes | Enabled | Action |
|---|---|---|---:|---|---|---|
| Holiday | Date | Optional date | Year | Notes | Checkbox | Edit/Delete |

Seed:

- Malaysia National.
- All Malaysian states.
- Federal Territories.
- Editable records for 2026 and 2027.

HR can add, edit, disable, delete custom holidays, and add future years.

## Type of Leave

```text
Type of Leave

Name              [Input]
Code              [Input]
Entitlement       [Number]
Condition         [Input]
Policy            [Selector]
Carry Over        [Selector]

[Add Type]
```

Default system-managed Replacement Leave cannot be renamed or deleted.

## Conditioning Policy

Supported fields:

- Policy name.
- Deduction rule.
- Entitlement days.
- Rounding rule.
- Proration rule.
- Entitlement rule.
- Paid or unpaid treatment.
- Excess leave handling.
- Payroll deduction behavior.
- Exclude weekends.
- Exclude public holidays.
- Notes.

Supported deduction rules:

- Calendar days.
- Working days.
- Working days excluding public holidays.

Supported rounding rules:

- Exact.
- Nearest half day.
- Round up to half day.

## Carry Over Settings

Supported fields:

- Setting name.
- Enable carry forward.
- Carry-forward rule.
- Maximum carry-forward days.
- Expiry rule.
- Fixed expiry date.
- Expiry months after year end.
- Rule details.
- Notes.

Carry-forward rules:

- Do not carry forward.
- Carry full unused balance.
- Carry up to 50% of last year's balance.
- Carry forward up to a cap.

## Leave Calendar

### Layout

```text
Calendar
├── Month / Year controls
├── Calendar grid
└── Selected-date panel
    ├── Employees on Leave
    ├── Public Holidays
    ├── Rest-day employees
    └── Shift Coverage
```

Calendar displays:

- Approved employee leave.
- Upcoming public holidays.
- Holiday name.
- Holiday group.
- National or State category.
- Employee department.
- Employee designation.
- Leave type.
- Employee Work / Rest status.
- Active-duty count.
- Approved-leave count.
- Rest-day count.
- Coverage warnings.
- Recommended backup employees.

Filters:

- Employee.
- Department.
- Leave Group.
- Work & Shift Group.
- Public Holiday Group.
- National or State category.
- Leave status.

## Data Model

### Work & Shift Groups

```text
work_shift_groups
- id
- entity_id
- name
- description
- enabled
- weekly_hours
- weekly_hours_warning
- created_at
- updated_at
```

```text
work_shift_group_days
- id
- entity_id
- group_id
- weekday
- start_time
- end_time
- day_type: full_day | half_day | rest
- is_work_day
- actual_hours
- created_at
- updated_at
```

```text
employee_work_shift_assignments
- id
- entity_id
- employee_id
- group_id
- effective_date
- end_date
- active
- assigned_at
```

### Leave Management

```text
public_holiday_groups
- id
- entity_id
- name
- category: national | state
- state_code
- enabled
```

```text
public_holidays
- id
- entity_id
- group_id
- name
- holiday_date
- observed_date
- year
- notes
- enabled
```

Leave Groups include:

```text
publicHolidayGroupIds: string[]
```

Maximum length: `2`.

## Persistence

- Supabase is the primary source of truth when configured.
- Local storage is the preview and fallback source.
- Entity scope applies to all records.
- Existing leave records are not rewritten when schedules change.
- Employees without schedules resolve to the Malaysia standard schedule.
- Loading missing schedule or holiday tables seeds compatible defaults.

## Validation and Feedback

Use inline validation for:

- Missing group name.
- Duplicate group name.
- Missing employee.
- Missing assignment group.
- Invalid date range.
- Identical start and end times.
- No Work day in a group.
- Duplicate leave types across assigned groups.
- More than two public holiday groups.
- Invalid holiday date.

Use confirmation dialogs for:

- Deleting a Work & Shift Group.
- Replacing an active employee schedule.
- Bulk schedule replacement.
- Disabling assignments.
- Deleting public holidays.
- Approving or rejecting leave and Off in Lieu requests.

## Responsive Behavior

### Desktop

- Multi-column group editor.
- Group list beside selected editor.
- Assignment form and history visible together.
- Wide tables use horizontal scrolling when needed.

### Tablet

- Two-column layouts where space allows.
- Stack editor panels when required.
- Keep table headers readable.

### Mobile

- Stack all cards and forms.
- Use full-width inputs.
- Convert tables to horizontally scrollable regions or stacked records.
- Keep all required fields visible.
- Keep action buttons full width or evenly distributed.

## Accessibility

- Every input has a visible label.
- Every checkbox has a descriptive accessible name.
- Status is represented with text, not color alone.
- Tables include column headings.
- Confirmation dialogs support keyboard navigation and Escape where appropriate.
- Validation messages appear near the relevant field.
- Calendar entries include text alternatives.
- Interactive controls remain usable on touch devices.

## Acceptance Criteria

- Work & Shift Groups appears once under Core Operations.
- Leave Management does not contain a duplicate Work & Shift Groups tab.
- Full Day `09:00-18:00` calculates as 8 hours.
- Half-day defaults to a four-hour end-time interval and remains editable.
- Rest-day schedules calculate zero hours and preserve time inputs.
- Overnight schedules are supported.
- Weekly totals and the 45-hour warning update automatically.
- Single and bulk schedule assignment work with replacement confirmation.
- Leave calculations use the employee's active schedule.
- Leave Groups support a maximum of two Public Holiday Groups.
- National and State holiday records appear on the calendar.
- Approved leave and rest-day status appear on the selected calendar date.
- Local fallback and Supabase persistence remain compatible.
