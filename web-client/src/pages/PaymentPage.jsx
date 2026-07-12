import React, { useEffect, useRef, useState } from 'react';
import { apiUrl } from '../config/api';

export default function PaymentPage({ course, accessToken, onPaymentSuccess, onBack }) {
  const targetCourse = course;
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [pollTimedOut, setPollTimedOut] = useState(false);
  const [paymentDone, setPaymentDone] = useState(false);
  const [payment, setPayment] = useState(null);
  const [error, setError] = useState('');
  const pollTimerRef = useRef(null);
  const pollAttemptsRef = useRef(0);
  const pollInFlightRef = useRef(false);

  const formattedPrice = Number(targetCourse?.price || 0).toFixed(2);
  const formatVnd = (amount) => new Intl.NumberFormat('vi-VN', {
    style: 'currency', currency: 'VND', maximumFractionDigits: 0
  }).format(Number(amount));

  const stopPolling = () => {
    if (pollTimerRef.current) window.clearInterval(pollTimerRef.current);
    pollTimerRef.current = null;
    pollInFlightRef.current = false;
    setIsPolling(false);
  };

  useEffect(() => () => {
    if (pollTimerRef.current) window.clearInterval(pollTimerRef.current);
  }, []);

  const checkPaymentStatus = async (appTransId) => {
    if (pollInFlightRef.current) return;
    pollInFlightRef.current = true;
    try {
      const response = await fetch(apiUrl(`/payments/check-status/${encodeURIComponent(appTransId)}`), {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || 'Payment status could not be checked.');
      if (body.paid) {
        stopPolling();
        await onPaymentSuccess({
          id: body.payment.id,
          course_id: body.payment.courseId,
          amount: body.payment.amount,
          payment_method: body.payment.provider,
          payment_status: body.payment.status,
          created_at: body.payment.createdAt
        });
        setPayment(body.payment);
        setPaymentDone(true);
        return;
      }
      if (body.payment?.status === 'failed') {
        stopPolling();
        setError('ZaloPay reported that this payment failed.');
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      pollInFlightRef.current = false;
    }
  };

  const beginPolling = (appTransId) => {
    stopPolling();
    setError('');
    setPollTimedOut(false);
    setIsPolling(true);
    pollAttemptsRef.current = 0;
    const runCheck = async () => {
      pollAttemptsRef.current += 1;
      await checkPaymentStatus(appTransId);
      if (pollAttemptsRef.current >= 100 && pollTimerRef.current) {
        stopPolling();
        setPollTimedOut(true);
      }
    };
    runCheck();
    pollTimerRef.current = window.setInterval(runCheck, 3000);
  };

  const handlePay = async () => {
    if (!targetCourse?.id) {
      setError('Select a published course before starting checkout.');
      return;
    }
    setIsProcessing(true);
    setError('');
    try {
      const response = await fetch(apiUrl('/payments/checkout'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({ courseId: targetCourse.id, paymentMethod: 'zalopay' })
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || 'Checkout could not be created.');
      setPayment(body.payment);
      window.open(body.payment.orderUrl, '_blank', 'noopener,noreferrer');
      beginPolling(body.payment.appTransId);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    handlePay();
  };

  if (!targetCourse) {
    return (
      <section className="payment-page page-stack">
        <p className="form-alert form-alert--error" role="alert">The selected course could not be loaded.</p>
        <button className="btn btn-primary" type="button" onClick={onBack}>Back to dashboard</button>
      </section>
    );
  }

  return (
    <section className="payment-page page-stack" aria-labelledby="payment-page-title">
      <header className="payment-page__header">
        <div>
          <button className="btn btn-ghost payment-page__back" type="button" onClick={onBack}>
            <span aria-hidden="true">&larr;</span>
            Back to dashboard
          </button>
          <span className="page-kicker">ZaloPay Sandbox checkout</span>
          <h2 id="payment-page-title">Complete your enrollment</h2>
          <p>Review the course order, pay in the ZaloPay test environment, and activate course access.</p>
        </div>

        <span className="status-badge status-badge--active">Secure checkout</span>
      </header>

      <aside className="mock-notice" role="note" aria-label="Sandbox payment notice">
        <span className="mock-notice__label">Sandbox only</span>
        <p>This connects to ZaloPay Sandbox. Do not use production credentials or real money.</p>
      </aside>

      <div className="checkout-layout">
        <aside className="card order-summary" aria-labelledby="order-summary-title">
          <div className="order-summary__cover" aria-hidden="true">
            <span>MS</span>
          </div>

          <div className="order-summary__course">
            <span className="section-label">Course order</span>
            <h3 id="order-summary-title">{targetCourse.title}</h3>
            <p>Lifetime access to the published course and its learning activities.</p>
            <span className="service-badge">Full course access</span>
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
              <strong>Sandbox checkout</strong>
              Payment details are entered only on the ZaloPay Sandbox page.
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
                ZaloPay confirmed your payment and your course is ready.
              </p>

              <ol className="activation-steps" aria-label="Completed access activation steps">
                <li className="is-complete">
                  <span>01</span>
                  <div>
                    <strong>Transaction recorded</strong>
                    <small>Payment history updated</small>
                  </div>
                </li>
                <li className="is-complete">
                  <span>02</span>
                  <div>
                    <strong>Sandbox payment confirmed</strong>
                    <small>ZaloPay Sandbox</small>
                  </div>
                </li>
                <li className="is-complete">
                  <span>03</span>
                  <div>
                    <strong>Course access activated</strong>
                    <small>Ready to start learning</small>
                  </div>
                </li>
              </ol>

              <button className="btn btn-primary w-full" type="button" onClick={onBack}>
                Return to studies
              </button>
            </section>
          ) : payment ? (
            <section className="payment-success" aria-live="polite">
              <span className="status-badge status-badge--active">Waiting for ZaloPay</span>
              <h3>Checkout #{payment.id} is pending</h3>
              <p>Your confirmed checkout total is {formatVnd(payment.amount)}.</p>
              {payment.orderUrl && (
                <p>
                  <a href={payment.orderUrl} target="_blank" rel="noopener noreferrer">Open ZaloPay Sandbox payment page</a>
                </p>
              )}
              <p>{isPolling ? 'Checking payment status every 3 seconds...' : 'Automatic status checking is paused.'}</p>
              {error && <p className="form-alert form-alert--error" role="alert">{error}</p>}
              {(pollTimedOut || !isPolling) && (
                <button className="btn btn-primary w-full" type="button" onClick={() => beginPolling(payment.appTransId)}>
                  Check Payment Status Again
                </button>
              )}
            </section>
          ) : (
            <form className="checkout-form" onSubmit={handleSubmit} aria-busy={isProcessing}>
              <div className="checkout-panel__heading">
                <div>
                  <span className="section-label">Payment method</span>
                  <h3>ZaloPay web checkout</h3>
                </div>
                <span className="mock-badge">Sandbox</span>
              </div>

              <fieldset className="payment-methods">
                <legend>Select one payment provider</legend>

                <button
                  type="button"
                  className="payment-method is-selected"
                  aria-pressed="true"
                  disabled={isProcessing}
                >
                  <span className="payment-method__mark payment-method__mark--zalopay" aria-hidden="true">ZP</span>
                  <span className="payment-method__copy">
                    <strong>ZaloPay</strong>
                    <small>Official sandbox order page</small>
                  </span>
                  <span className="payment-method__select" aria-hidden="true" />
                </button>

              </fieldset>

              <div className="checkout-security" role="note">
                <span className="checkout-security__icon" aria-hidden="true">SEC</span>
                <div>
                  <strong>Sandbox provider connection</strong>
                  <p>The LMS signs the order server-side; provider keys never reach the browser.</p>
                </div>
              </div>

              <div className="checkout-total">
                <div>
                  <span>Total due</span>
                  <small>No taxes or processing fees</small>
                </div>
                <strong>${formattedPrice}</strong>
              </div>

              {error && <p className="form-alert form-alert--error" role="alert">{error}</p>}

              <button
                className="btn btn-primary checkout-submit"
                type="submit"
                disabled={isProcessing}
                aria-busy={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <span className="loading-spinner" aria-hidden="true" />
                    Creating ZaloPay Sandbox order...
                  </>
                ) : (
                  `Continue to ZaloPay Sandbox — $${formattedPrice}`
                )}
              </button>

              <p className="checkout-form__disclaimer">
                Access activates only after ZaloPay Sandbox query or callback confirms payment.
              </p>
            </form>
          )}
        </section>
      </div>
    </section>
  );
}
