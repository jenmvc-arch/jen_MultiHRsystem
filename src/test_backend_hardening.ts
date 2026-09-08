import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(process.cwd());
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');

const migration = read('supabase/migrations/20260908_backend_security_hardening.sql');
const employeeService = read('api/_lib/employeeServiceServer.ts');
const employeeAccounts = read('api/_lib/employeeAccountServer.ts');
const leaveService = read('src/lib/leaveService.ts');
const payrollView = read('src/components/PayrollView.tsx');
const pdfRoute = read('api/generate-pdf.ts');

assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.notification_outbox/);
assert.match(migration, /pg_advisory_xact_lock/);
assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.create_leave_request/);
assert.match(migration, /'off_in_lieu_requests'/);
assert.match(migration, /DROP POLICY IF EXISTS/);

assert.match(employeeService, /String\(account\.account_status\) !== 'active'/);
assert.match(employeeService, /idempotency_key: notificationKey/);
assert.match(employeeService, /idempotency_key: String\(payload\.idempotencyKey/);
assert.match(employeeService, /employee_id,request_id,created_at/);
assert.match(employeeService, /return \{ employee: mapEmployeePortalDto\(data\) \}/);

assert.doesNotMatch(employeeAccounts, /select\('email,password,password_hash/);
assert.doesNotMatch(employeeAccounts, /perPage: 1000/);
assert.match(employeeAccounts, /getUserById\(account\.auth_user_id\)/);

assert.match(leaveService, /requestEmployeeLeaveWorkspace/);
assert.match(leaveService, /Leave workspace writes require the protected admin API/);
assert.doesNotMatch(leaveService, /async function upsertRows/);

assert.match(payrollView, /displaySettingsOverride=\{displaySettingsDraft\}/);
assert.match(payrollView, /setSelectedPayrollRecord\(null\)/);
assert.match(pdfRoute, /does not belong to the selected employee/);

console.log('Backend hardening regression tests passed.');
