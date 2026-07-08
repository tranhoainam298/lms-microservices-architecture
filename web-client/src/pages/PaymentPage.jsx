import React, { useState } from 'react';

export default function PaymentPage({ course, onPaymentSuccess, onBack }) {
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
        course_id: course.id,
        amount: course.price,
        payment_method: method,
        payment_status: 'completed',
        created_at: new Date().toISOString()
      };

      onPaymentSuccess(newPayment);
    }, 1500);
  };

  const containerStyle = {
    maxWidth: '600px',
    margin: '0 auto'
  };

  const methodSelectStyle = {
    display: 'flex',
    gap: '1rem',
    margin: '1.25rem 0'
  };

  const getMethodCardStyle = (m) => {
    const isSelected = method === m;
    return {
      flex: 1,
      padding: '1rem',
      borderRadius: 'var(--border-radius-sm)',
      border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border-color)',
      backgroundColor: isSelected ? 'var(--primary-light)' : 'var(--bg-secondary)',
      color: isSelected ? 'var(--primary-hover)' : 'var(--text-secondary)',
      textAlign: 'center',
      cursor: 'pointer',
      fontWeight: '600',
      transition: 'all var(--transition-fast)'
    };
  };

  return (
    <div style={containerStyle}>
      <div style={{ marginBottom: '1.5rem' }}>
        <button className="btn btn-secondary" onClick={onBack} style={{ padding: '0.375rem 0.75rem', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
          ← Back
        </button>
        <h1 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-title)' }}>Checkout Invoice</h1>
      </div>

      <div className="architecture-alert">
        <span>💳</span>
        <span>Flow: **Payment Management: Pay for Course** (Payment Service / Payment DB)</span>
      </div>

      <div className="card">
        <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Order Summary</h3>
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
          <div>
            <div style={{ fontWeight: '600' }}>{course.title}</div>
            <div className="text-xs text-tertiary-color">Owner Service: Course Service</div>
          </div>
          <div style={{ fontWeight: '700', fontFamily: 'var(--font-title)' }}>${course.price.toFixed(2)}</div>
        </div>

        {paymentDone ? (
          <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>✅</div>
            <h4 style={{ color: 'var(--success)' }}>Payment Confirmed!</h4>
            <p className="text-sm text-secondary-color" style={{ marginTop: '0.5rem' }}>
              We published a **PaymentSucceededEvent** to **RabbitMQ**. Course Service has processed it and activated your course access in **Course DB**.
            </p>
            <button className="btn btn-primary mt-6 w-full" onClick={onBack}>
              Go to Dashboard & Study
            </button>
          </div>
        ) : (
          <>
            <div style={{ marginTop: '1.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Select Gateway Method</label>
              <div style={methodSelectStyle}>
                <div style={getMethodCardStyle('zalopay')} onClick={() => setMethod('zalopay')}>
                  📱 ZaloPay
                </div>
                <div style={getMethodCardStyle('momo')} onClick={() => setMethod('momo')}>
                  📱 MoMo
                </div>
              </div>
            </div>

            <div style={{ margin: '1.5rem 0', padding: '0.75rem', backgroundColor: 'var(--danger-light)', color: 'var(--danger)', fontSize: '0.8125rem', borderRadius: 'var(--border-radius-sm)' }}>
              ⚠️ **DEMO MODE**: This is a simulated checkout. Clicking pay triggers mock events, no real money will be charged.
            </div>

            <button 
              className="btn btn-primary w-full" 
              onClick={handlePay} 
              disabled={isProcessing}
            >
              {isProcessing ? 'Connecting to Gateway API...' : `Confirm Payment: $${course.price.toFixed(2)}`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
