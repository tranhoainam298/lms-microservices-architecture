import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import process from 'node:process';

const enabled = process.env.RUN_DASHBOARD_UI_E2E === 'true';
if (!enabled) {
  console.log('DASHBOARD_UI_RUNTIME_BLOCKED: set RUN_DASHBOARD_UI_E2E=true and LMS_DEMO_PASSWORD.');
  process.exit(0);
}

const password = process.env.LMS_DEMO_PASSWORD;
assert.ok(password, 'LMS_DEMO_PASSWORD is required and is never printed by this test.');

const appUrl = process.env.LMS_APP_URL || 'http://localhost:8080';
const chromeCandidates = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
].filter(Boolean);
const chromePath = chromeCandidates.find(existsSync);
assert.ok(chromePath, 'Chrome or Edge is required. Set CHROME_PATH if it is installed elsewhere.');

const accounts = [
  {
    role: 'student',
    email: process.env.LMS_DEMO_STUDENT_EMAIL || 'student1@lms.demo',
    pageSelector: '#enrolled-courses-title',
    requiredMetrics: ['Enrolled Courses', 'Quiz Results', 'Average progress', 'Completed lessons'],
    navigation: [
      ['Course Catalog', 'Course catalog'],
      ['My Learning', 'My learning'],
      ['Quiz Results', 'Quiz results'],
      ['My profile', 'Your profile']
    ]
  },
  {
    role: 'instructor',
    email: process.env.LMS_DEMO_INSTRUCTOR_EMAIL || 'instructor1@lms.demo',
    pageSelector: '#instructor-dashboard-title',
    requiredMetrics: ['My courses', 'Draft courses', 'Enrolled students', 'Average progress', 'Quiz attempts', 'Average score'],
    navigation: [
      ['My Courses', 'My courses'],
      ['Create Course', 'Course drafts'],
      ['Students / Progress', 'Student progress'],
      ['Quiz Results', 'Quiz results'],
      ['My profile', 'Your profile']
    ]
  },
  {
    role: 'administrator',
    email: process.env.LMS_DEMO_ADMIN_EMAIL || 'admin@lms.demo',
    pageSelector: '#admin-dashboard-title',
    requiredMetrics: ['Total users', 'Students', 'Inactive users', 'Total courses', 'Successful sales', 'Total revenue', 'Successful sign-ins'],
    navigation: [
      ['Users', 'User management'],
      ['Courses / Categories', 'Course operations'],
      ['Revenue Report', 'Revenue and sales'],
      ['Activity Report', 'Activity report'],
      ['My profile', 'Your profile']
    ]
  }
];

const chrome = spawn(chromePath, [
  '--headless=new',
  '--remote-debugging-pipe',
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-gpu',
  '--disable-dev-shm-usage',
  '--window-size=1600,1000'
], { stdio: ['ignore', 'ignore', 'pipe', 'pipe', 'pipe'] });

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
    const request = pending.get(message.id);
    if (!request) continue;
    pending.delete(message.id);
    if (message.error) request.reject(new Error(message.error.message));
    else request.resolve(message.result || {});
  }
});

function send(method, params = {}, sessionId) {
  const id = ++sequence;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    const packet = { id, method, params };
    if (sessionId) packet.sessionId = sessionId;
    chrome.stdio[3].write(`${JSON.stringify(packet)}\0`);
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
    throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text || 'Browser evaluation failed.');
  }
  return response.result?.value;
}

async function waitFor(sessionId, expression, label, timeoutMs = 30000) {
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
  return { targetId, sessionId };
}

function metricNumber(value) {
  const normalized = String(value || '').replace(/[^0-9-]/g, '');
  return Number(normalized);
}

async function verifyDashboard(account) {
  const page = await createPage();
  try {
    await send('Page.navigate', { url: appUrl }, page.sessionId);
    await waitFor(page.sessionId, "document.readyState === 'complete'", 'application load');
    await waitFor(page.sessionId, "document.querySelector('.login-form')", 'login form');

    await evaluate(page.sessionId, `
      (() => {
        const role = ${JSON.stringify(account.role)};
        const email = ${JSON.stringify(account.email)};
        const password = ${JSON.stringify(password)};
        const roleCard = [...document.querySelectorAll('.login-role-card')]
          .find(card => card.textContent.toLowerCase().includes(role));
        if (!roleCard) throw new Error('Role card not found');
        roleCard.click();
        const setValue = (selector, value) => {
          const input = document.querySelector(selector);
          if (!input) throw new Error('Input not found: ' + selector);
          const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
          setter.call(input, value);
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        };
        setValue('#email', email);
        setValue('#password', password);
        document.querySelector('.login-form').requestSubmit();
        return true;
      })()
    `);

    await waitFor(page.sessionId, `document.querySelector(${JSON.stringify(account.pageSelector)})`, `${account.role} dashboard`, 45000);
    await waitFor(page.sessionId, "document.querySelectorAll('.metric-card').length > 0", `${account.role} metrics`);
    await sleep(800);

    const result = await evaluate(page.sessionId, `
      (() => ({
        errors: [...document.querySelectorAll('[role="alert"]')].map(node => node.textContent.trim()).filter(Boolean),
        metrics: [...document.querySelectorAll('.metric-card')].map(card => ({
          title: card.querySelector('.metric-card__title')?.textContent.trim()
            || card.querySelector('.metric-card__topline span')?.textContent.trim()
            || '',
          value: card.querySelector('.metric-card__value')?.textContent.trim() || ''
        })),
        visibleCourseCards: [...document.querySelectorAll('.course-card')].filter(card => {
          const style = getComputedStyle(card);
          return style.display !== 'none' && style.visibility !== 'hidden';
        }).length,
        visibleRows: document.querySelectorAll('tbody tr').length
      }))()
    `);

    assert.deepEqual(result.errors, [], `${account.role} dashboard rendered an error: ${result.errors.join(' | ')}`);
    const metricMap = new Map(result.metrics.map(metric => [metric.title, metric.value]));
    for (const title of account.requiredMetrics) {
      assert.ok(metricMap.has(title), `${account.role} dashboard is missing the ${title} metric.`);
      const value = metricNumber(metricMap.get(title));
      assert.ok(Number.isFinite(value) && value > 0, `${account.role} ${title} must be non-zero; received ${metricMap.get(title)}.`);
    }
    if (account.role === 'student') {
      assert.ok(result.visibleCourseCards > 0, 'Student catalog/learning UI must render real course cards.');
      assert.ok(result.visibleRows > 0, 'Student dashboard must render seeded quiz/payment activity rows.');
    } else {
      assert.ok(result.visibleRows > 0, `${account.role} dashboard must render seeded table rows.`);
    }

    for (const [label, expectedHeading] of account.navigation) {
      const clicked = await evaluate(page.sessionId, `
        (() => {
          const target = [...document.querySelectorAll('.nav-item')]
            .find(button => button.textContent.trim().includes(${JSON.stringify(label)}));
          if (!target) return false;
          target.click();
          return true;
        })()
      `);
      assert.equal(clicked, true, `${account.role} navigation is missing ${label}.`);
      await waitFor(
        page.sessionId,
        `document.querySelector('.top-header h1')?.textContent.trim() === ${JSON.stringify(expectedHeading)}`,
        `${account.role} ${label}`
      );
      await sleep(900);
      const pageState = await evaluate(page.sessionId, `
        (() => ({
          alertText: [...document.querySelectorAll('[role="alert"]')]
            .filter(node => getComputedStyle(node).display !== 'none')
            .map(node => node.textContent.trim())
            .filter(Boolean),
          contentLength: document.querySelector('#main-content')?.textContent.trim().length || 0,
          sidebars: document.querySelectorAll('.sidebar').length,
          headers: document.querySelectorAll('.top-header').length,
          horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 2,
          overflowing: [...document.querySelectorAll('body *')]
            .map(node => ({
              tag: node.tagName.toLowerCase(),
              className: typeof node.className === 'string' ? node.className : '',
              id: node.id || '',
              right: Math.round(node.getBoundingClientRect().right),
              width: Math.round(node.getBoundingClientRect().width)
            }))
            .filter(item => item.right > window.innerWidth + 2 || item.width > window.innerWidth + 2)
            .slice(0, 8)
        }))()
      `);
      assert.deepEqual(pageState.alertText, [], `${account.role} ${label} rendered an error: ${pageState.alertText.join(' | ')}`);
      assert.ok(pageState.contentLength > 20, `${account.role} ${label} rendered an empty workspace.`);
      assert.equal(pageState.sidebars, 1, `${account.role} ${label} must render one sidebar.`);
      assert.equal(pageState.headers, 1, `${account.role} ${label} must render one header.`);
      assert.equal(
        pageState.horizontalOverflow,
        false,
        `${account.role} ${label} has uncontrolled horizontal overflow: ${JSON.stringify(pageState.overflowing)}`
      );
    }

    console.log(`PASS ${account.role}: ${account.requiredMetrics.map(title => `${title}=${metricMap.get(title)}`).join(', ')}`);
  } finally {
    await send('Target.closeTarget', { targetId: page.targetId });
  }
}

async function verifyPublicCatalog() {
  const page = await createPage();
  try {
    await send('Page.navigate', { url: appUrl }, page.sessionId);
    await waitFor(page.sessionId, "document.querySelector('.login-form')", 'public login page');
    const opened = await evaluate(page.sessionId, `
      (() => {
        const button = [...document.querySelectorAll('button')]
          .find(item => item.textContent.trim() === 'Browse courses');
        if (!button) return false;
        button.click();
        return true;
      })()
    `);
    assert.equal(opened, true, 'Login page must expose the public course catalog.');
    await waitFor(page.sessionId, "document.querySelector('#student-catalog-title')", 'public course catalog');
    await waitFor(page.sessionId, "document.querySelectorAll('.course-card').length > 0", 'public course cards');
    const cardCount = await evaluate(page.sessionId, "document.querySelectorAll('.course-card').length");
    assert.ok(cardCount > 0, 'Public catalog must render backend course data.');
    await evaluate(page.sessionId, "document.querySelector('.course-card button').click(); true");
    await waitFor(page.sessionId, "document.querySelector('#course-detail-title')", 'public course detail');
    const signInAction = await evaluate(page.sessionId, `
      [...document.querySelectorAll('button')].some(button => button.textContent.trim() === 'Sign in to enroll')
    `);
    assert.equal(signInAction, true, 'Public course detail must require sign-in before enrollment or checkout.');
    console.log(`PASS public catalog: courseCards=${cardCount}, protectedAction=Sign in to enroll`);
  } finally {
    await send('Target.closeTarget', { targetId: page.targetId });
  }
}

try {
  await verifyPublicCatalog();
  for (const account of accounts) await verifyDashboard(account);
  console.log('DASHBOARD_UI_RUNTIME_PASS');
} finally {
  for (const request of pending.values()) request.reject(new Error('Chrome closed before the command completed.'));
  pending.clear();
  chrome.kill();
}
