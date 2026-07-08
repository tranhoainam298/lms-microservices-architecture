import React, { useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { mockExperienceFeedback } from '../data/mockData';

gsap.registerPlugin(ScrollTrigger, useGSAP);

export default function OverviewPage({ onNavigate }) {
  const rootRef = useRef(null);
  const [feedbackIndex, setFeedbackIndex] = useState(0);
  const feedback = mockExperienceFeedback[feedbackIndex];
  const storyWords = 'Every request keeps a visible path from intent to ownership, so learners can understand both the feature and the architecture behind it.'.split(' ');

  useGSAP(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    gsap.from('.overview-hero__copy > *', {
      opacity: 0,
      y: 28,
      duration: 0.9,
      stagger: 0.1,
      ease: 'power3.out'
    });

    gsap.fromTo('.overview-hero__media img',
      { scale: 0.84, opacity: 0.6 },
      {
        scale: 1,
        opacity: 1,
        ease: 'none',
        scrollTrigger: {
          trigger: '.overview-hero',
          start: 'top top',
          end: 'bottom top',
          scrub: 1
        }
      }
    );

    gsap.fromTo('.overview-story__word',
      { opacity: 0.12 },
      {
        opacity: 1,
        stagger: 0.08,
        ease: 'none',
        scrollTrigger: {
          trigger: '.overview-story',
          start: 'top 78%',
          end: 'bottom 42%',
          scrub: 1
        }
      }
    );

    const cards = gsap.utils.toArray('.journey-card');
    cards.forEach((card, index) => {
      if (index === cards.length - 1) return;
      gsap.to(card, {
        scale: 0.94,
        opacity: 0.32,
        ease: 'none',
        scrollTrigger: {
          trigger: cards[index + 1],
          start: 'top 82%',
          end: 'top 24%',
          scrub: 1
        }
      });
    });
  }, { scope: rootRef });
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

  const flowBadgeStyle = () => {
    const color = '#0b8f87';
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
    <div className="overview-page" style={containerStyle} ref={rootRef}>
      <section className="overview-hero">
        <div className="overview-hero__copy">
          <h2 className="overview-hero__title">
            Learning <span className="overview-hero__inline-image" aria-hidden="true" /> flows, engineered in plain sight.
          </h2>
          <p>Move through a real LMS experience while every request, service boundary, and owned data store remains legible.</p>
          <div className="overview-hero__actions">
            <button className="btn btn-primary" onClick={() => onNavigate('dashboard')}>Explore student flow</button>
            <button className="btn btn-secondary" onClick={() => document.getElementById('platform-topology')?.scrollIntoView({ behavior: 'smooth' })}>Inspect architecture</button>
          </div>
        </div>
        <div className="overview-hero__media">
          <img src="https://picsum.photos/seed/network-architecture-campus/1400/1100" alt="Abstract architectural structure representing connected learning systems" />
        </div>
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
          <p>RabbitMQ, ZaloPay / Momo, AI Chatbot System</p>
        </article>
      </section>

      <section className="overview-story">
        <p>
          {storyWords.map((word, index) => (
            <span className="overview-story__word" key={`${word}-${index}`}>{word} </span>
          ))}
        </p>
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

          <div className="arch-arrow">▼</div>

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

          <div className="arch-arrow">▼</div>

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
                <span className="arch-node-title">AI Chatbot System</span>
                <span className="arch-node-tech">External study support</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Architecture Flows */}
      <div>
        <h2 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-title)', marginBottom: '0.5rem' }}>Explore the demo flows</h2>
        <p className="text-sm text-secondary-color">Select any of the primary transactions to test the microservice boundaries.</p>

        <div className="architecture-flow-grid journey-stack" style={flowListStyle}>
          {/* Flow 1 */}
          <div style={flowItemStyle} className="journey-card">
            <div>
              <div style={flowBadgeStyle('User')}>User Service</div>
              <h4 style={{ fontSize: '0.95rem', margin: '0.5rem 0 0.25rem 0' }}>Login authentication</h4>
              <p className="text-xs text-secondary-color">Authenticates users, returns JWT token, and logs history in user login audit DB.</p>
            </div>
            <button className="btn btn-secondary w-full text-xs" onClick={() => onNavigate('dashboard')}>Open Student Dashboard</button>
          </div>

          {/* Flow 3 */}
          <div style={flowItemStyle} className="journey-card">
            <div>
              <div style={flowBadgeStyle('Course')}>Course Service</div>
              <h4 style={{ fontSize: '0.95rem', margin: '0.5rem 0 0.25rem 0' }}>View lesson and mark progress</h4>
              <p className="text-xs text-secondary-color">Student watches course lesson content and updates completed state in Course DB.</p>
            </div>
            <button className="btn btn-secondary w-full text-xs" onClick={() => onNavigate('lesson', { courseId: 201 })}>Open Lesson Viewer</button>
          </div>

          {/* Flow 4 */}
          <div style={flowItemStyle} className="journey-card">
            <div>
              <div style={flowBadgeStyle('Exam')}>Exam Service</div>
              <h4 style={{ fontSize: '0.95rem', margin: '0.5rem 0 0.25rem 0' }}>Quiz and grading result</h4>
              <p className="text-xs text-secondary-color">Executes student exams and saves quiz attempt metrics inside Exam DB.</p>
            </div>
            <button className="btn btn-secondary w-full text-xs" onClick={() => onNavigate('quiz', { quizId: 801 })}>Open Quiz Module</button>
          </div>

          {/* Flow 5 */}
          <div style={flowItemStyle} className="journey-card">
            <div>
              <div style={flowBadgeStyle('Payment')}>Payment Service</div>
              <h4 style={{ fontSize: '0.95rem', margin: '0.5rem 0 0.25rem 0' }}>Course checkout and access</h4>
              <p className="text-xs text-secondary-color">Payment gateway confirm. RabbitMQ event updates course access inside Course DB.</p>
            </div>
            <button className="btn btn-secondary w-full text-xs" onClick={() => onNavigate('payment', { courseId: 201 })}>Open Payment Simulator</button>
          </div>

        </div>
      </div>

      <section className="feedback-carousel" aria-live="polite">
        <div className="feedback-carousel__portraits" aria-hidden="true">
          {mockExperienceFeedback.map((item, index) => (
            <span key={item.id} className={index === feedbackIndex ? 'is-active' : ''}>{item.name.split(' ').map(part => part[0]).join('').slice(0, 2)}</span>
          ))}
        </div>
        <blockquote>
          <p>“{feedback.quote}”</p>
          <footer>{feedback.name}<span>{feedback.role}</span></footer>
        </blockquote>
        <div className="feedback-carousel__controls">
          <button type="button" aria-label="Previous feedback" onClick={() => setFeedbackIndex((feedbackIndex - 1 + mockExperienceFeedback.length) % mockExperienceFeedback.length)}>Previous</button>
          <button type="button" aria-label="Next feedback" onClick={() => setFeedbackIndex((feedbackIndex + 1) % mockExperienceFeedback.length)}>Next</button>
        </div>
      </section>

      <section className="overview-action">
        <h2>Choose a role. Follow the request. See who owns the result.</h2>
        <div>
          <button className="btn btn-primary" onClick={() => onNavigate('dashboard')}>Open student workspace</button>
          <button className="btn btn-secondary" onClick={() => onNavigate('course-draft')}>Open course drafts</button>
        </div>
      </section>
    </div>
  );
}
