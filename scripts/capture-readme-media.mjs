import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const scriptPath = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(scriptPath), '..');
const outputDirectory = path.join(root, 'docs', 'assets', 'readme');
const appUrl = process.env.LMS_README_APP_URL || 'http://localhost:8080';
const demoPassword = process.env.LMS_README_DEMO_PASSWORD;
const captureTarget = String(process.env.LMS_README_CAPTURE_TARGET || 'all').toLowerCase();
const demoAccounts = {
  student: process.env.LMS_README_STUDENT_EMAIL || 'student1@lms.demo',
  instructor: process.env.LMS_README_INSTRUCTOR_EMAIL || 'instructor1@lms.demo',
  administrator: process.env.LMS_README_ADMIN_EMAIL || 'admin@lms.demo'
};
const width = 1600;
const height = 1000;

const chromeCandidates = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium'
].filter(Boolean);

const chromePath = chromeCandidates.find(existsSync);
if (!chromePath) {
  throw new Error('Chrome or Edge was not found. Set CHROME_PATH and retry.');
}

mkdirSync(outputDirectory, { recursive: true });

const chrome = spawn(chromePath, [
  '--headless=new',
  '--remote-debugging-pipe',
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-gpu',
  '--disable-dev-shm-usage',
  '--hide-scrollbars',
  `--window-size=${width},${height}`,
  '--force-device-scale-factor=1'
], {
  stdio: ['ignore', 'ignore', 'pipe', 'pipe', 'pipe']
});

let sequence = 0;
let protocolBuffer = Buffer.alloc(0);
const pending = new Map();

chrome.stdio[4].on('data', chunk => {
  protocolBuffer = Buffer.concat([protocolBuffer, chunk]);
  let separatorIndex;
  while ((separatorIndex = protocolBuffer.indexOf(0)) !== -1) {
    const packet = protocolBuffer.subarray(0, separatorIndex).toString('utf8');
    protocolBuffer = protocolBuffer.subarray(separatorIndex + 1);
    if (!packet) continue;
    const message = JSON.parse(packet);
    if (!message.id || !pending.has(message.id)) continue;
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result || {});
  }
});

function send(method, params = {}, sessionId) {
  const id = ++sequence;
  const message = { id, method, params };
  if (sessionId) message.sessionId = sessionId;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    chrome.stdio[3].write(`${JSON.stringify(message)}\0`);
  });
}

const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

async function evaluate(sessionId, expression) {
  const response = await send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true
  }, sessionId);
  if (response.exceptionDetails) {
    throw new Error(response.exceptionDetails.text || 'Browser evaluation failed.');
  }
  return response.result?.value;
}

async function waitFor(sessionId, expression, label, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await evaluate(sessionId, `Boolean(${expression})`)) return;
    await sleep(200);
  }
  throw new Error(`Timed out waiting for ${label}.`);
}

async function createPage() {
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Page.enable', {}, sessionId);
  await send('Runtime.enable', {}, sessionId);
  await send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: false
  }, sessionId);
  return { targetId, sessionId };
}

async function navigate(sessionId, url = appUrl) {
  await send('Page.navigate', { url }, sessionId);
  await waitFor(sessionId, "document.readyState === 'complete'", 'page load');
  await sleep(800);
}

async function capture(sessionId, filename) {
  await send('Page.bringToFront', {}, sessionId);
  await evaluate(sessionId, `
    (() => {
      const style = document.createElement('style');
      style.textContent = '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}';
      document.head.appendChild(style);
      for (const animation of document.getAnimations()) {
        try { animation.finish(); } catch { animation.cancel(); }
      }
      window.scrollTo(0, 0);
      return true;
    })()
  `);
  await sleep(500);
  const { data } = await send('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
    captureBeyondViewport: false
  }, sessionId);
  writeFileSync(path.join(outputDirectory, filename), Buffer.from(data, 'base64'));
  console.log(`Captured ${filename}`);
}

async function login(sessionId, role) {
  if (!demoPassword) {
    throw new Error('Set LMS_README_DEMO_PASSWORD before capturing authenticated pages.');
  }
  const accountEmail = demoAccounts[role];
  if (!accountEmail) throw new Error(`No README capture account is configured for ${role}.`);
  await navigate(sessionId);
  await waitFor(sessionId, "document.querySelector('.login-form')", 'login form');
  await evaluate(sessionId, `
    (() => {
      const role = ${JSON.stringify(role)};
      const cards = [...document.querySelectorAll('.login-role-card')];
      const target = cards.find(card => card.textContent.toLowerCase().includes(role));
      if (!target) throw new Error('Role card not found: ' + role);
      target.click();
      return true;
    })()
  `);
  await sleep(200);
  await evaluate(sessionId, `
    (() => {
      const setValue = (selector, value) => {
        const input = document.querySelector(selector);
        if (!input) throw new Error('Login input not found: ' + selector);
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        setter.call(input, value);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      };
      setValue('#email', ${JSON.stringify(accountEmail)});
      setValue('#password', ${JSON.stringify(demoPassword)});
      return true;
    })()
  `);
  await evaluate(sessionId, "document.querySelector('.login-form').requestSubmit(); true");
  await waitFor(sessionId, "document.querySelector('.app-shell')", `${role} workspace`, 30000);
  await sleep(1400);
}

async function captureLogin() {
  const page = await createPage();
  try {
    await navigate(page.sessionId);
    await waitFor(page.sessionId, "document.querySelector('.login-page')", 'login page');
    await capture(page.sessionId, 'login.png');
  } finally {
    await send('Target.closeTarget', { targetId: page.targetId });
  }
}

async function captureStudent() {
  const page = await createPage();
  try {
    await login(page.sessionId, 'student');
    await waitFor(page.sessionId, "document.querySelector('.student-dashboard')", 'student dashboard');
    await capture(page.sessionId, 'student-dashboard.png');

    const openedLesson = await evaluate(page.sessionId, `
      (() => {
        const buttons = [...document.querySelectorAll('button')];
        const button = buttons.find(item => item.textContent.trim().includes('Continue Learning'));
        if (!button) return false;
        button.click();
        return true;
      })()
    `);
    if (!openedLesson) throw new Error('No enrolled course was available for the lesson screenshot.');
    await waitFor(page.sessionId, "document.querySelector('.lesson-page')", 'lesson workspace', 30000);
    await sleep(1200);
    await capture(page.sessionId, 'lesson-workspace.png');
  } finally {
    await send('Target.closeTarget', { targetId: page.targetId });
  }
}

async function captureInstructor() {
  const page = await createPage();
  try {
    await login(page.sessionId, 'instructor');
    await waitFor(page.sessionId, "document.querySelector('#instructor-dashboard-title')", 'instructor dashboard');
    await capture(page.sessionId, 'instructor-workspace.png');
  } finally {
    await send('Target.closeTarget', { targetId: page.targetId });
  }
}

async function captureAdmin() {
  const page = await createPage();
  try {
    await login(page.sessionId, 'administrator');
    await waitFor(page.sessionId, "document.querySelector('#admin-dashboard-title')", 'admin dashboard', 30000);
    await sleep(1000);
    await capture(page.sessionId, 'admin-revenue.png');
  } finally {
    await send('Target.closeTarget', { targetId: page.targetId });
  }
}

function captureInFreshBrowser(target) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath], {
      env: { ...process.env, LMS_README_CAPTURE_TARGET: target },
      stdio: 'inherit'
    });
    child.once('error', reject);
    child.once('exit', code => code === 0
      ? resolve()
      : reject(new Error(`Isolated ${target} capture exited with code ${code}.`)));
  });
}

try {
  if (captureTarget === 'all') {
    await captureLogin();
    await captureStudent();
    await captureAdmin();
    // A fresh compositor process avoids intermittent transparent fixed-sidebar tiles
    // observed when several authenticated targets are captured in one headless session.
    await captureInFreshBrowser('instructor');
  } else if (captureTarget === 'login') await captureLogin();
  else if (captureTarget === 'student') await captureStudent();
  else if (captureTarget === 'instructor') await captureInstructor();
  else if (captureTarget === 'admin') await captureAdmin();
  else throw new Error(`Unsupported LMS_README_CAPTURE_TARGET: ${captureTarget}`);
  console.log(`README media written to ${outputDirectory}`);
} finally {
  for (const request of pending.values()) request.reject(new Error('Chrome closed before the command completed.'));
  pending.clear();
  chrome.kill();
}
