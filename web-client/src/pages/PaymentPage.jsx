import React, { useState } from 'react';
import ArchitectureFlow from '../components/ArchitectureFlow';

export default function PaymentPage({ course, onPaymentSuccess, onBack }) {
  const targetCourse = course || { id: 201, title: 'Introduction to Microservices', price: 99.00 };
  const [method, setMethod] = useState('zalopay');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentDone, setPaymentDone] = useState(false);

  const formattedPrice = targetCourse.price.toFixed(2);

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

  const handleSubmit = (event) => {
    event.preventDefault();
    handlePay();
  };

  return (
    <section className="payment-page page-stack" aria-labelledby="payment-page-title">
      <header className="payment-page__header">
        <div>
          <button className="btn btn-ghost payment-page__back" type="button" onClick={onBack}>
            <span aria-hidden="true">&larr;</span>
            Back to dashboard
          </button>
          <span className="page-kicker">Mock checkout</span>
          <h2 id="payment-page-title">Complete your enrollment</h2>
          <p>Review the course order and simulate a wallet payment to activate access.</p>
        </div>

        <div className="payment-page__badges" aria-label="Payment ownership">
          <span className="service-badge">Payment Service</span>
          <span className="database-badge">Payment DB</span>
        </div>
      </header>

      <aside className="mock-notice" role="note" aria-label="Mock payment notice">
        <span className="mock-notice__label">Mock payment only</span>
        <p>No real gateway call, wallet charge, or monetary transaction will occur.</p>
      </aside>

      <section className="architecture-context architecture-card" aria-labelledby="payment-flow-title">
        <div className="section-heading architecture-context__heading">
          <div>
            <span className="section-label">Access activation</span>
            <h3 id="payment-flow-title">Payment event flow</h3>
          </div>
          <span className="status-badge status-badge--active">RabbitMQ event</span>
        </div>
        <ArchitectureFlow
          steps={['Payment Service', 'Payment DB', 'RabbitMQ', 'Course Service', 'Course DB']}
          ariaLabel="Payment Service records to Payment DB, publishes through RabbitMQ, and Course Service activates access in Course DB"
        />
      </section>

      <div className="checkout-layout">
        <aside className="card order-summary" aria-labelledby="order-summary-title">
          <div className="order-summary__cover" aria-hidden="true">
            <span>MS</span>
          </div>

          <div className="order-summary__course">
            <span className="section-label">Course order</span>
            <h3 id="order-summary-title">{targetCourse.title}</h3>
            <p>Lifetime access to the published course and its learning activities.</p>
            <span className="service-badge">Course Service catalog</span>
          </div>

          <dl className="pricing-breakdown">
            <div>
              <dt>Course price</dt>
              <dd>${formattedPrice}</dd>
            </div>
            <div>
              <dt>Processing fee</dt>
              <dd>$0.00</dd>
            </div>
            <div className="pricing-breakdown__total">
              <dt>Total</dt>
              <dd>${formattedPrice}</dd>
            </div>
          </dl>

          <div className="order-summary__assurance">
            <span aria-hidden="true" className="assurance-mark">SSL</span>
            <p>
              <strong>Simulation-safe checkout</strong>
              No wallet credentials or payment details are collected.
            </p>
          </div>
        </aside>

        <section className="card checkout-panel" aria-live="polite">
          {paymentDone ? (
            <section className="payment-success" role="status" aria-labelledby="payment-success-title">
              <span className="payment-success__mark" aria-hidden="true">OK</span>
              <span className="status-badge status-badge--success">Payment confirmed</span>
              <h3 id="payment-success-title">Course access is active</h3>
              <p>
                The simulated payment was recorded and the access event completed its course activation flow.
              </p>

              <ol className="activation-steps" aria-label="Completed access activation steps">
                <li className="is-complete">
                  <span>01</span>
                  <div>
                    <strong>Transaction recorded</strong>
                    <small>Payment DB</small>
                  </div>
                </li>
                <li className="is-complete">
                  <span>02</span>
                  <div>
                    <strong>Payment event published</strong>
                    <small>RabbitMQ</small>
                  </div>
                </li>
                <li className="is-complete">
                  <span>03</span>
                  <div>
                    <strong>Course access activated</strong>
                    <small>Course Service and Course DB</small>
                  </div>
                </li>
              </ol>

              <button className="btn btn-primary w-full" type="button" onClick={onBack}>
                Return to studies
              </button>
            </section>
          ) : (
            <form className="checkout-form" onSubmit={handleSubmit} aria-busy={isProcessing}>
              <div className="checkout-panel__heading">
                <div>
                  <span className="section-label">Payment method</span>
                  <h3>Choose a wallet</h3>
                </div>
                <span className="mock-badge">Mock</span>
              </div>

              <fieldset className="payment-methods">
                <legend>Select one payment provider</legend>

                <button
                  type="button"
                  className={`payment-method${method === 'zalopay' ? ' is-selected' : ''}`}
                  onClick={() => setMethod('zalopay')}
                  aria-pressed={method === 'zalopay'}
                  disabled={isProcessing}
                >
                  <span className="payment-method__mark payment-method__mark--zalopay" aria-hidden="true">ZP</span>
                  <span className="payment-method__copy">
                    <strong>ZaloPay</strong>
                    <small>Simulated wallet checkout</small>
                  </span>
                  <span className="payment-method__select" aria-hidden="true" />
                </button>

                <button
                  type="button"
                  className={`payment-method${method === 'momo' ? ' is-selected' : ''}`}
                  onClick={() => setMethod('momo')}
                  aria-pressed={method === 'momo'}
                  disabled={isProcessing}
                >
                  <span className="payment-method__mark payment-method__mark--momo" aria-hidden="true">MM</span>
                  <span className="payment-method__copy">
                    <strong>MoMo</strong>
                    <small>Simulated e-wallet checkout</small>
                  </span>
                  <span className="payment-method__select" aria-hidden="true" />
                </button>
              </fieldset>

              <div className="checkout-security" role="note">
                <span className="checkout-security__icon" aria-hidden="true">SEC</span>
                <div>
                  <strong>Protected learning demo</strong>
                  <p>This flow demonstrates service ownership without contacting an external provider.</p>
                </div>
              </div>

              <div className="checkout-total">
                <div>
                  <span>Total due</span>
                  <small>No taxes or processing fees</small>
                </div>
                <strong>${formattedPrice}</strong>
              </div>

              <button
                className="btn btn-primary checkout-submit"
                type="submit"
                disabled={isProcessing}
                aria-busy={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <span className="loading-spinner" aria-hidden="true" />
                    Processing simulated payment...
                  </>
                ) : (
                  `Pay $${formattedPrice}`
                )}
              </button>

              <p className="checkout-form__disclaimer">
                By continuing, you acknowledge that this is a frontend simulation for the LMS architecture demonstration.
              </p>
            </form>
          )}
        </section>
      </div>
    </section>
  );
}
