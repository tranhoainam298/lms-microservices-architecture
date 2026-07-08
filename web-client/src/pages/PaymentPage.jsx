import React, { useState } from 'react';

export default function PaymentPage({ course, onPaymentSuccess, onBack }) {
  const targetCourse = course || { id: 201, title: 'Introduction to Microservices', price: 99.00 };
  const [method, setMethod] = useState('zalopay');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentDone, setPaymentDone] = useState(false);

  const handlePay = () => {
    setIsProcessing(true);
    // Simulate Payment Service communication with Momopay/Zalopay
    setTimeout(() => {
      setIsProcessing(false);
      setPaymentDone(true);
      
      const newPayment = {
        id: Date.now(),
        user_id: 1,
        course_id: targetCourse.id,
        amount: targetCourse.price,
        payment_method: method,
        payment_status: 'completed',
        created_at: new Date().toISOString()
      };

      onPaymentSuccess(newPayment);
    }, 1500);
  };

  const containerStyle = {
    maxWidth: '640px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem'
  };

  const methodSelectStyle = {
    display: 'flex',
    gap: '1rem',
    margin: '1rem 0'
  };

  const getMethodCardStyle = (m) => {
    const isSelected = method === m;
    return {
      flex: 1,
      padding: '1.25rem 1rem',
      borderRadius: 'var(--border-radius-sm)',
      border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border-color)',
      backgroundColor: isSelected ? 'var(--primary-light)' : 'var(--bg-secondary)',
      color: isSelected ? 'var(--primary-hover)' : 'var(--text-secondary)',
      textAlign: 'center',
      cursor: 'pointer',
      fontWeight: '600',
      fontSize: '0.875rem',
      transition: 'all var(--transition-fast)'
    };
  };

  return (
    <div style={containerStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button className="btn btn-secondary" onClick={onBack} style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem', fontWeight: '600' }}>
          ← Return
        </button>
        <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
          DB Scope: Payment DB (transactions_log)
        </span>
      </div>

      <div className="architecture-alert">
        <span>Flow: **Payment Checkout Integration** (Payment Service logs to Payment DB)</span>
      </div>

      <div style={{ padding: '0.625rem 1rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--border-radius-sm)', fontSize: '0.75rem', fontWeight: '500', color: 'var(--text-secondary)', display: 'flex', gap: '0.5rem', border: '1px solid var(--border-color)' }}>
        <span>Event Topology:</span>
        <span>Payment Service</span>
        <span>→</span>
        <span style={{ color: 'var(--primary)', fontWeight: '700' }}>RabbitMQ Exchange</span>
        <span>→</span>
        <span>Course Service</span>
        <span>→</span>
        <span>Course DB Access Table</span>
      </div>

      <div className="card">
        <h3 style={{ fontSize: '0.9375rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
          Checkout Billing
        </h3>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
          <div>
            <div style={{ fontWeight: '600', fontSize: '0.9375rem' }}>{targetCourse.title}</div>
            <div className="text-xs text-tertiary-color" style={{ marginTop: '0.125rem' }}>
              Owner Domain: Course Service Catalog
            </div>
          </div>
          <div style={{ fontWeight: '700', fontFamily: 'var(--font-title)', fontSize: '1.1rem' }}>
            ${targetCourse.price.toFixed(2)}
          </div>
        </div>

        {paymentDone ? (
          <div style={{ marginTop: '1.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center' }}>
            <div style={{ fontSize: '2.5rem' }}>✓</div>
            <h4 style={{ color: 'var(--success)', fontWeight: '700', fontSize: '1.1rem' }}>Purchase Finalized</h4>
            <p className="text-xs text-secondary-color">
              Payment Service published a **PaymentSucceededEvent** payload to RabbitMQ. Course Service consumes the message and updates access records in Course DB.
            </p>
            <button className="btn btn-primary w-full mt-4" style={{ fontWeight: '600' }} onClick={onBack}>
              Return to Studies
            </button>
          </div>
        ) : (
          <>
            <div style={{ marginTop: '1.25rem' }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Gateway Provider</label>
              <div style={methodSelectStyle}>
                <div style={getMethodCardStyle('zalopay')} onClick={() => setMethod('zalopay')}>
                  Zalopay Gateway
                </div>
                <div style={getMethodCardStyle('momo')} onClick={() => setMethod('momo')}>
                  Momo e-Wallet
                </div>
              </div>
            </div>

            <div style={{ margin: '1.25rem 0', padding: '0.75rem', backgroundColor: 'var(--danger-light)', color: 'var(--danger)', fontSize: '0.75rem', borderRadius: 'var(--border-radius-sm)', fontWeight: '500' }}>
              NOTICE: This is a simulated invoice billing checkpoint. No real monetary transactions or external API gateway connections will occur.
            </div>

            <button 
              className="btn btn-primary w-full" 
              style={{ fontWeight: '600' }}
              onClick={handlePay} 
              disabled={isProcessing}
            >
              {isProcessing ? 'Executing API gateway handshake...' : `Pay Invoice: $${targetCourse.price.toFixed(2)}`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
