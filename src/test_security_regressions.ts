import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { isAdminPortalRole } from './lib/userRoles';

const root = resolve(process.cwd());
const appScript = readFileSync(resolve(root, 'google_apps_script.gs'), 'utf8');
const appSource = readFileSync(resolve(root, 'src/App.tsx'), 'utf8');
const clientSource = readFileSync(resolve(root, 'src/lib/googleSheetsClient.ts'), 'utf8');

assert.match(appScript, /requireApiKey\(e && e\.parameter && e\.parameter\.apiKey\)/);
assert.match(appScript, /requireApiKey\(payload\.apiKey\)/);
assert.match(appScript, /var acquired = lock\.tryLock\(30000\)/);
assert.match(appScript, /result\.users = \[\]/);
assert.doesNotMatch(appScript, /return responseJSON\(\{ success: false, error: error\.toString\(\), stack:/);

assert.match(clientSource, /fetch\('\/api\/google-sheets'/);
assert.doesNotMatch(clientSource, /fetch\(targetUrl/);
assert.match(appSource, /fetch\('\/api\/auth\/logout'/);
assert.match(appSource, /isPrintMode && !isAuthenticated/);
assert.match(appSource, /body: JSON\.stringify\(\{ newPassword \}\)/);

assert.equal(isAdminPortalRole('Global Administrator'), true);
assert.equal(isAdminPortalRole('Employee'), false);

console.log('Security regression tests passed.');
