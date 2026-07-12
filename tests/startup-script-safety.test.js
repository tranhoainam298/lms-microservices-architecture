const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

const launcher = read('start-lms.bat');
const repairBatch = read('repair-db-users.bat');
const repairHelper = read('scripts/repair-db-users.ps1');
const repairSource = `${repairBatch}\n${repairHelper}`;
const emergencyBatch = read('repair-db-users-emergency.bat');
const emergencyHelper = read('scripts/repair-db-users-emergency.ps1');
const emergencySource = `${emergencyBatch}\n${emergencyHelper}`;
const allStartupAndRepairScripts = `${launcher}\n${repairSource}\n${emergencySource}`;

const destructivePatterns = [
  /docker\s+compose\s+down\s+-v/i,
  /docker\s+volume\s+prune/i,
  /docker\s+volume\s+rm/i,
  /docker\s+system\s+prune/i,
  /\btruncate\b/i,
  /drop\s+table/i,
  /drop\s+database/i,
  /delete\s+from\s+(courses|users|enrollments|payments|quiz_results)/i,
  /rm\s+-rf/i,
  /Remove-Item\s+-Recurse/i,
];

for (const pattern of destructivePatterns) {
  assert.doesNotMatch(allStartupAndRepairScripts, pattern, `Startup or repair flow contains forbidden pattern: ${pattern}`);
}

assert.doesNotMatch(launcher, /localhost:5173/i);
assert.doesNotMatch(launcher, /dotnet\s+(run|build|restore)/i);
assert.doesNotMatch(launcher, /payment-service[\s\S]{0,120}npm\s+run\s+(dev|build)/i);
assert.match(launcher, /docker compose up -d --build/i);
assert.match(launcher, /http:\/\/localhost:8080/i);
assert.match(launcher, /\/health/i);
assert.match(launcher, /pause/i);
assert.match(launcher, /WAIT_HEALTH/i);

assert.match(repairBatch, /Continue\? \[Y\/N\]/i);
assert.match(repairSource, /ALTER USER/i);
assert.match(repairSource, /FLUSH PRIVILEGES/i);
assert.match(repairHelper, /MYSQL_ROOT_PASSWORD/);
assert.match(repairHelper, /MYSQL_PASSWORD/);
assert.doesNotMatch(repairSource, /Write-(Host|Output).*password/i);

assert.match(emergencyBatch, /temporarily stop each MySQL container and reset only MySQL user passwords/i);
assert.match(emergencyBatch, /Continue\? \[Y\/N\]/i);
assert.match(emergencyHelper, /docker stop \$container/i);
assert.match(emergencyHelper, /emergency-repair/i);
assert.match(emergencyHelper, /--skip-grant-tables/i);
assert.match(emergencyHelper, /--network none/i);
assert.match(emergencyHelper, /function Invoke-NativeQuiet/i);
assert.match(emergencyHelper, /ErrorActionPreference = 'Continue'/i);
assert.match(emergencyHelper, /PSNativeCommandUseErrorActionPreference = \$false/i);
assert.match(emergencyHelper, /Destination -eq '\/var\/lib\/mysql'/i);
assert.match(emergencyHelper, /ALTER USER 'root'@'localhost'/i);
assert.match(emergencyHelper, /CREATE USER IF NOT EXISTS/i);
assert.match(emergencyHelper, /GRANT ALL PRIVILEGES/i);
assert.match(emergencyHelper, /FLUSH PRIVILEGES/i);
assert.match(emergencyHelper, /Root login verification failed/i);
assert.match(emergencyHelper, /Application-user login verification failed/i);
assert.doesNotMatch(emergencySource, /Write-(Host|Output).*password/i);
const containerExistsFunction = emergencyHelper.match(/function Test-ContainerExists[\s\S]*?\n\}/)?.[0] || '';
assert.match(containerExistsFunction, /Invoke-NativeQuiet/i);
assert.doesNotMatch(containerExistsFunction, /\$null\s*=\s*&\s*docker inspect/i);
assert.match(launcher, /repair-db-users\.bat first/i);
assert.match(launcher, /repair-db-users-emergency\.bat/i);

console.log('STARTUP_SCRIPT_SAFETY_PASS');
