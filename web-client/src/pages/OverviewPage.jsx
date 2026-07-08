import React from 'react';

export default function OverviewPage({ onNavigate, onChangeRole, currentRole }) {
  const containerStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem'
  };

  const flowListStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '1rem',
    marginTop: '1rem'
  };

  const flowItemStyle = {
    padding: '1.25rem',
    borderRadius: 'var(--border-radius-sm)',
    border: '1px solid var(--border-color)',
    backgroundColor: 'var(--bg-secondary)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    gap: '0.75rem',
    transition: 'all var(--transition-normal)'
  };

  const flowBadgeStyle = (service) => {
    let color = '#4f46e5'; // Default indigo
    if (service === 'User') color = '#2563eb';
    if (service === 'Course') color = '#0d9488';
    if (service === 'Exam') color = '#db2777';
    if (service === 'Payment') color = '#ea580c';
    return {
      fontSize: '0.75rem',
      fontWeight: '600',
      padding: '0.125rem 0.5rem',
      borderRadius: '12px',
      backgroundColor: `${color}15`,
      color: color,
      width: 'fit-content'
    };
  };

  return (
    <div style={containerStyle}>
      <div>
        <h1 style={{ fontSize: '1.75rem', fontFamily: 'var(--font-title)' }}>Architecture Overview</h1>
        <p className="text-secondary-color">Interact with the microservice system, explore databases, and trigger architectural workflows.</p>
      </div>

      {/* Role Switcher */}
      <div className="card">
        <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', fontFamily: 'var(--font-title)' }}>System Role Switcher</h3>
        <p className="text-sm text-secondary-color mb-4">Select a persona to restrict UI screens and mock API gateway permissions.</p>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            className={`btn ${currentRole === 'student' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => onChangeRole('student')}
          >
            👤 Student Persona
          </button>
          <button 
            className={`btn ${currentRole === 'instructor' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => onChangeRole('instructor')}
          >
            🧑‍🏫 Instructor Persona
          </button>
          <button 
            className={`btn ${currentRole === 'admin' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => onChangeRole('admin')}
          >
            🛠️ Admin Persona
          </button>
        </div>
      </div>

      {/* CSS-Only Visual Architecture Diagram */}
      <div className="card">
        <h3 style={{ fontSize: '1rem', marginBottom: '1.5rem', fontFamily: 'var(--font-title)' }}>Platform Component Topology</h3>
        
        <div className="arch-diagram">
          {/* Client layer */}
          <div className="arch-layer">
            <div className="arch-title">Client Layer</div>
            <div className="arch-node-group">
              <div className="arch-node client-node active">
                <span className="arch-node-title">Web Client</span>
                <span className="arch-node-tech">ReactJS</span>
              </div>
              <div className="arch-node client-node">
                <span className="arch-node-title">Mobile Client</span>
                <span className="arch-node-tech">Flutter (Mocked)</span>
              </div>
            </div>
          </div>

          <div className="arch-arrow">▼</div>

          {/* Gateway layer */}
          <div className="arch-layer">
            <div className="arch-title">Edge Proxy</div>
            <div className="arch-node-group">
              <div className="arch-node gateway-node">
                <span className="arch-node-title">API Gateway</span>
                <span className="arch-node-tech">Node + Express (Port 3000)</span>
              </div>
            </div>
          </div>

          <div className="arch-arrow">▼</div>

          {/* Microservices & DB layer */}
          <div className="arch-layer">
            <div className="arch-title">Isolated Service Domains (Port 3001-3004)</div>
            <div className="arch-services-grid">
              {/* User service */}
              <div className="service-column">
                <div className="arch-node service-node user-service-node">
                  <span className="arch-node-title">User Service</span>
                  <span className="arch-node-tech">Express API</span>
                </div>
                <div className="arch-node db-node">
                  <span className="arch-node-title">User DB</span>
                  <span className="arch-node-tech">SQL Server (14331)</span>
                </div>
              </div>

              {/* Course service */}
              <div className="service-column">
                <div className="arch-node service-node course-service-node">
                  <span className="arch-node-title">Course Service</span>
                  <span className="arch-node-tech">Express API</span>
                </div>
                <div className="arch-node db-node">
                  <span className="arch-node-title">Course DB</span>
                  <span className="arch-node-tech">SQL Server (14332)</span>
                </div>
              </div>

              {/* Exam service */}
              <div className="service-column">
                <div className="arch-node service-node exam-service-node">
                  <span className="arch-node-title">Exam & Quiz Svc</span>
                  <span className="arch-node-tech">Express API</span>
                </div>
                <div className="arch-node db-node">
                  <span className="arch-node-title">Exam DB</span>
                  <span className="arch-node-tech">SQL Server (14333)</span>
                </div>
              </div>

              {/* Payment service */}
              <div className="service-column">
                <div className="arch-node service-node payment-service-node">
                  <span className="arch-node-title">Payment Service</span>
                  <span className="arch-node-tech">Express API</span>
                </div>
                <div className="arch-node db-node">
                  <span className="arch-node-title">Payment DB</span>
                  <span className="arch-node-tech">SQL Server (14334)</span>
                </div>
              </div>
            </div>
          </div>

          <div className="arch-broker-bar">
            <span className="broker-title">RabbitMQ Message Broker (Port 5672)</span>
            <span className="broker-subtitle">Asynchronous Events Exchange: UserLoggedInEvent, PaymentSucceededEvent, etc.</span>
          </div>
        </div>
      </div>

      {/* Interactive Architecture Flows */}
      <div>
        <h2 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-title)', marginBottom: '0.5rem' }}>Architectural Flows Directory</h2>
        <p className="text-sm text-secondary-color">Select any of the primary transactions to test the microservice boundaries.</p>

        <div style={flowListStyle}>
          {/* Flow 1 */}
          <div style={flowItemStyle} className="hover-lift">
            <div>
              <div style={flowBadgeStyle('User')}>User Service</div>
              <h4 style={{ fontSize: '0.95rem', margin: '0.5rem 0 0.25rem 0' }}>1. Login Authentication</h4>
              <p className="text-xs text-secondary-color">Authenticates users, returns JWT token, and logs history in user login audit DB.</p>
            </div>
            <button className="btn btn-secondary w-full text-xs" onClick={() => onNavigate('login')}>Launch Flow</button>
          </div>

          {/* Flow 2 */}
          <div style={flowItemStyle} className="hover-lift">
            <div>
              <div style={flowBadgeStyle('Course')}>Course Service</div>
              <h4 style={{ fontSize: '0.95rem', margin: '0.5rem 0 0.25rem 0' }}>2. Save Course Draft</h4>
              <p className="text-xs text-secondary-color">Instructor designs syllabus details and saves course state to Course DB.</p>
            </div>
            <button className="btn btn-secondary w-full text-xs" onClick={() => { onChangeRole('instructor'); onNavigate('course-draft'); }}>Launch Flow</button>
          </div>

          {/* Flow 3 */}
          <div style={flowItemStyle} className="hover-lift">
            <div>
              <div style={flowBadgeStyle('Course')}>Course Service</div>
              <h4 style={{ fontSize: '0.95rem', margin: '0.5rem 0 0.25rem 0' }}>3. View Lesson & Mark Progress</h4>
              <p className="text-xs text-secondary-color">Student watches course lesson content and updates completed state in Course DB.</p>
            </div>
            <button className="btn btn-secondary w-full text-xs" onClick={() => { onChangeRole('student'); onNavigate('lesson', { courseId: 201 }); }}>Launch Flow</button>
          </div>

          {/* Flow 4 */}
          <div style={flowItemStyle} className="hover-lift">
            <div>
              <div style={flowBadgeStyle('Exam')}>Exam Service</div>
              <h4 style={{ fontSize: '0.95rem', margin: '0.5rem 0 0.25rem 0' }}>4. Quiz & Grading Result</h4>
              <p className="text-xs text-secondary-color">Executes student exams and saves quiz attempt metrics inside Exam DB.</p>
            </div>
            <button className="btn btn-secondary w-full text-xs" onClick={() => { onChangeRole('student'); onNavigate('quiz', { quizId: 801 }); }}>Launch Flow</button>
          </div>

          {/* Flow 5 */}
          <div style={flowItemStyle} className="hover-lift">
            <div>
              <div style={flowBadgeStyle('Payment')}>Payment Service</div>
              <h4 style={{ fontSize: '0.95rem', margin: '0.5rem 0 0.25rem 0' }}>5. Course Checkout & Access</h4>
              <p className="text-xs text-secondary-color">Payment gateway confirm. RabbitMQ event updates course access inside Course DB.</p>
            </div>
            <button className="btn btn-secondary w-full text-xs" onClick={() => { onChangeRole('student'); onNavigate('payment', { courseId: 201 }); }}>Launch Flow</button>
          </div>

          {/* Flow 6 */}
          <div style={flowItemStyle} className="hover-lift">
            <div>
              <div style={flowBadgeStyle('Payment')}>Payment + Course</div>
              <h4 style={{ fontSize: '0.95rem', margin: '0.5rem 0 0.25rem 0' }}>6. Revenue Stats Report</h4>
              <p className="text-xs text-secondary-color">Aggregates statistics from Payment and Course services. No central database exists.</p>
            </div>
            <button className="btn btn-secondary w-full text-xs" onClick={() => { onChangeRole('admin'); onNavigate('revenue-report'); }}>Launch Flow</button>
          </div>

          {/* Flow 7 */}
          <div style={flowItemStyle} className="hover-lift">
            <div>
              <div style={flowBadgeStyle('Course')}>Course Service</div>
              <h4 style={{ fontSize: '0.95rem', margin: '0.5rem 0 0.25rem 0' }}>7. AI Learning Support</h4>
              <p className="text-xs text-secondary-color">Feeds student learning context summaries to the external AI Chatbot System.</p>
            </div>
            <button className="btn btn-secondary w-full text-xs" onClick={() => { onChangeRole('student'); onNavigate('ai-support'); }}>Launch Flow</button>
          </div>
        </div>
      </div>
    </div>
  );
}
