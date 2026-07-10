import React from 'react';
import ArchitectureFlow from '../components/ArchitectureFlow';
import StatusBadge from '../components/StatusBadge';

const serviceInventory = [
  {
    name: 'User Service',
    responsibility: 'Authentication, account identity, and role validation.',
    database: 'User DB',
    status: 'Login API integrated'
  },
  {
    name: 'Course Service',
    responsibility: 'Course catalog, lesson delivery, progress, and instructor drafts.',
    database: 'Course DB',
    status: 'Draft API integrated'
  },
  {
    name: 'Exam & Quiz Service',
    responsibility: 'Question delivery, answer evaluation, and quiz attempts.',
    database: 'Exam DB',
    status: 'UI flow mocked'
  },
  {
    name: 'Payment Service',
    responsibility: 'Checkout intent, payment records, and access events.',
    database: 'Payment DB',
    status: 'UI flow mocked'
  }
];

export default function OverviewPage({ onNavigate, role }) {
  const roleDestination = role === 'instructor'
    ? { page: 'course-draft', label: 'Open instructor workspace' }
    : role === 'admin'
      ? { page: 'revenue-report', label: 'Open admin workspace' }
      : { page: 'dashboard', label: 'Open student workspace' };

  return (
    <div className="overview-page">
      <section className="overview-hero">
        <div className="overview-hero__copy">
          <span className="page-kicker">Architecture at a glance</span>
          <h2 className="overview-hero__title">
            One learning platform. Clear ownership at every step.
          </h2>
          <p>Explore a working LMS frontend while each request stays mapped to the API Gateway, its responsible service, and that service's private database.</p>
          <div className="overview-hero__actions">
            <button className="btn btn-primary" onClick={() => onNavigate(roleDestination.page)}>{roleDestination.label}</button>
            <button className="btn btn-secondary" onClick={() => document.getElementById('platform-topology')?.scrollIntoView({ behavior: 'smooth' })}>Inspect architecture</button>
          </div>
        </div>
        <div className="overview-hero__media">
          <div className="overview-system-panel" role="img" aria-label="Web and mobile clients route through the API Gateway to four microservices and their owned databases">
            <div className="overview-system-panel__topline">
              <span>Live topology</span>
              <StatusBadge status="configured" tone="success" />
            </div>
            <div className="overview-system-panel__clients"><span>Web Client</span><span>Mobile Client</span></div>
            <i className="overview-system-panel__connector" aria-hidden="true" />
            <strong className="overview-system-panel__gateway">API Gateway</strong>
            <i className="overview-system-panel__connector" aria-hidden="true" />
            <div className="overview-system-panel__services">
              <span>User</span><span>Course</span><span>Exam</span><span>Payment</span>
            </div>
            <div className="overview-system-panel__legend"><span>5 services</span><span>4 owned databases</span></div>
          </div>
        </div>
      </section>

      <section className="system-health" aria-label="Current implementation status">
        <div><span className="status-dot status-dot--active" aria-hidden="true" /><strong>Web client</strong><small>UI ready</small></div>
        <div><span className="status-dot" aria-hidden="true" /><strong>API Gateway</strong><small>Target configured</small></div>
        <div><span className="status-dot" aria-hidden="true" /><strong>Live integrations</strong><small>Login and course drafts</small></div>
        <div><span className="status-dot status-dot--muted" aria-hidden="true" /><strong>Learning flows</strong><small>Local mock state</small></div>
      </section>

      <section className="topology-bento" id="platform-topology" aria-label="Platform topology summary">
        <article className="topology-bento__cell topology-bento__cell--clients">
          <span>Client Layer</span>
          <h3>Web Client and Mobile Client</h3>
          <p>Two learning surfaces enter through the same controlled edge.</p>
        </article>
        <article className="topology-bento__cell topology-bento__cell--gateway">
          <span>API Gateway</span>
          <h3>One entry. Clear routing.</h3>
        </article>
        <article className="topology-bento__cell">
          <span>Services</span>
          <p>User, Course, Exam & Quiz, Payment</p>
        </article>
        <article className="topology-bento__cell">
          <span>Owned data</span>
          <p>User DB, Course DB, Exam DB, Payment DB</p>
        </article>
        <article className="topology-bento__cell topology-bento__cell--external">
          <span>Integrations</span>
          <p>RabbitMQ, ZaloPay / Momo, External AI Chatbot System</p>
        </article>
      </section>

      {/* CSS-Only Visual Architecture Diagram */}
      <section className="card architecture-card overview-chapter">
        <div className="section-heading">
          <div>
            <p className="section-label">Request topology</p>
            <h3>Platform component map</h3>
          </div>
          <span className="service-badge">CSS-only flow</span>
        </div>
        
        <div className="arch-diagram">
          {/* Client layer */}
          <div className="arch-layer">
            <div className="arch-title">Client Layer</div>
            <div className="arch-node-group">
              <div className="arch-node client-node active">
                <span className="arch-node-title">Web Client</span>
                <span className="arch-node-tech">React + Vite</span>
              </div>
              <div className="arch-node client-node">
                <span className="arch-node-title">Mobile Client</span>
                <span className="arch-node-tech">Mobile client</span>
              </div>
            </div>
          </div>

          <div className="arch-arrow" aria-hidden="true" />

          {/* Gateway layer */}
          <div className="arch-layer">
            <div className="arch-title">Gateway Layer</div>
            <div className="arch-node-group">
              <div className="arch-node gateway-node">
                <span className="arch-node-title">API Gateway</span>
                <span className="arch-node-tech">Single request entry</span>
              </div>
            </div>
          </div>

          <div className="arch-arrow" aria-hidden="true" />

          {/* Microservices & DB layer */}
          <div className="arch-layer">
            <div className="arch-title">Service and Data Layers</div>
            <div className="arch-services-grid">
              {/* User service */}
              <div className="service-column">
                <div className="arch-node service-node user-service-node">
                  <span className="arch-node-title">User Service</span>
                  <span className="arch-node-tech">Service boundary</span>
                </div>
                <div className="arch-node db-node">
                  <span className="arch-node-title">User DB</span>
                  <span className="arch-node-tech">Owned data</span>
                </div>
              </div>

              {/* Course service */}
              <div className="service-column">
                <div className="arch-node service-node course-service-node">
                  <span className="arch-node-title">Course Service</span>
                  <span className="arch-node-tech">Service boundary</span>
                </div>
                <div className="arch-node db-node">
                  <span className="arch-node-title">Course DB</span>
                  <span className="arch-node-tech">Owned data</span>
                </div>
              </div>

              {/* Exam service */}
              <div className="service-column">
                <div className="arch-node service-node exam-service-node">
                  <span className="arch-node-title">Exam & Quiz Service</span>
                  <span className="arch-node-tech">Service boundary</span>
                </div>
                <div className="arch-node db-node">
                  <span className="arch-node-title">Exam DB</span>
                  <span className="arch-node-tech">Owned data</span>
                </div>
              </div>

              {/* Payment service */}
              <div className="service-column">
                <div className="arch-node service-node payment-service-node">
                  <span className="arch-node-title">Payment Service</span>
                  <span className="arch-node-tech">Service boundary</span>
                </div>
                <div className="arch-node db-node">
                  <span className="arch-node-title">Payment DB</span>
                  <span className="arch-node-tech">Owned data</span>
                </div>
              </div>
            </div>
          </div>

          <div className="arch-broker-bar">
            <span className="broker-title">RabbitMQ Message Broker</span>
            <span className="broker-subtitle">Asynchronous event exchange between existing service boundaries</span>
          </div>

          <div className="arch-layer">
            <div className="arch-title">External Systems</div>
            <div className="arch-node-group">
              <div className="arch-node external-node">
                <span className="arch-node-title">ZaloPay / Momo</span>
                <span className="arch-node-tech">Payment gateways</span>
              </div>
              <div className="arch-node external-node">
                <span className="arch-node-title">External AI Chatbot System</span>
                <span className="arch-node-tech">External study support</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="overview-section" aria-labelledby="service-inventory-title">
        <div className="section-heading">
          <div>
            <p className="section-label">Ownership map</p>
            <h2 id="service-inventory-title">Services and their data boundaries</h2>
          </div>
          <span className="service-badge">4 domain services</span>
        </div>
        <div className="service-inventory">
          {serviceInventory.map(service => (
            <article className="service-inventory__card" key={service.name}>
              <div className="service-inventory__topline">
                <span className="badge badge--service">Service</span>
                <StatusBadge status={service.status.includes('integrated') ? 'active' : 'mock'} tone={service.status.includes('integrated') ? 'success' : 'neutral'} />
              </div>
              <h3>{service.name}</h3>
              <p>{service.responsibility}</p>
              <dl>
                <div><dt>Owned database</dt><dd><span className="badge badge--database">Database</span>{service.database}</dd></div>
                <div><dt>Implementation</dt><dd>{service.status}</dd></div>
              </dl>
            </article>
          ))}
        </div>
      </section>

      <section className="integration-grid" aria-label="Broker and external systems">
        <article className="integration-card integration-card--broker">
          <span className="badge badge--service">Message broker</span>
          <h3>RabbitMQ</h3>
          <p>Carries the mock payment success event from Payment Service to Course Service.</p>
        </article>
        <article className="integration-card">
          <span className="badge badge--external">External</span>
          <h3>ZaloPay / Momo</h3>
          <p>Selectable mock payment providers. No real gateway request is sent.</p>
        </article>
        <article className="integration-card">
          <span className="badge badge--external">External</span>
          <h3>External AI Chatbot System</h3>
          <p>Provides local mock study responses with course and lesson context.</p>
        </article>
      </section>

      <ArchitectureFlow
        label="Platform request path"
        steps={['Web / Mobile Client', 'API Gateway', 'Domain Service', 'Owned Database']}
      />

      {/* Interactive Architecture Flows */}
      <section className="overview-section" aria-labelledby="demo-flows-title">
        <div className="section-heading">
          <div>
            <p className="section-label">Working journeys</p>
            <h2 id="demo-flows-title">Explore the demo flows</h2>
          </div>
        </div>
        <p className="page-description">Select a journey to inspect how the current frontend maps an action to its owner.</p>

        <div className="architecture-flow-grid journey-stack">
          {/* Flow 1 */}
          <article className="journey-card">
            <div>
              <span className="badge badge--service">User Service</span>
              <h3>Login authentication</h3>
              <p>Validates credentials and the selected role through User Service and User DB.</p>
            </div>
            <span className="journey-card__state">Live API integration</span>
          </article>

          {/* Flow 3 */}
          <article className="journey-card">
            <div>
              <span className="badge badge--service">Course Service</span>
              <h3>View lessons and progress</h3>
              <p>Opens course content and updates local learning progress owned by Course Service.</p>
            </div>
            <button className="btn btn-secondary" onClick={() => onNavigate('lesson', { courseId: 201 })}>Open lesson viewer</button>
          </article>

          {/* Flow 4 */}
          <article className="journey-card">
            <div>
              <span className="badge badge--service">Exam & Quiz Service</span>
              <h3>Quiz and grading result</h3>
              <p>Scores a local assessment and records the mock attempt in Exam DB state.</p>
            </div>
            <button className="btn btn-secondary" onClick={() => onNavigate('quiz', { quizId: 801 })}>Open quiz module</button>
          </article>

          {/* Flow 5 */}
          <article className="journey-card">
            <div>
              <span className="badge badge--service">Payment Service</span>
              <h3>Checkout and course access</h3>
              <p>Runs a mock checkout, then models a RabbitMQ event activating course access.</p>
            </div>
            <button className="btn btn-secondary" onClick={() => onNavigate('payment', { courseId: 201 })}>Open payment simulator</button>
          </article>

        </div>
      </section>

      <section className="overview-action">
        <div>
          <span className="badge badge--mock">Architecture guardrail</span>
          <h2>No extra service or database is implied by this interface.</h2>
          <p>Revenue is combined from Payment Service and Course Service. AI support remains an external system.</p>
        </div>
        <div>
          <button className="btn btn-primary" onClick={() => onNavigate(roleDestination.page)}>{roleDestination.label}</button>
        </div>
      </section>
    </div>
  );
}
