export function createPaymentTransitionManager({
  pool,
  paymentEvents,
  activateCourseAccess,
  normalizePayment,
  paymentEventData
}) {
  async function loadPayment(paymentId) {
    const [rows] = await pool.execute('SELECT * FROM transactions WHERE id = ? LIMIT 1', [paymentId]);
    return rows[0] || null;
  }

  async function transitionPaymentToFailed(paymentId, failureCode) {
    const [result] = await pool.execute(
      "UPDATE transactions SET status = 'failed' WHERE id = ? AND status = 'pending'",
      [paymentId]
    );
    const transaction = await loadPayment(paymentId);

    if (result.affectedRows === 1 && transaction) {
      await paymentEvents.publishPaymentFailed({
        ...paymentEventData(transaction),
        failureCode
      });
    }

    return transaction;
  }

  async function finalizePaidPayment(transaction) {
    const [transition] = await pool.execute(
      "UPDATE transactions SET status = 'success' WHERE id = ? AND status = 'pending'",
      [transaction.id]
    );
    const currentTransaction = await loadPayment(transaction.id);
    if (!currentTransaction || currentTransaction.status !== 'success') {
      const error = new Error('The payment is not in a state that can activate course access.');
      error.status = 409;
      error.code = 'PAYMENT_STATE_CONFLICT';
      throw error;
    }

    if (transition.affectedRows === 1) {
      await paymentEvents.publishPaymentSucceeded(paymentEventData(currentTransaction));
    }

    let enrollment;
    try {
      enrollment = await activateCourseAccess(currentTransaction.student_id, currentTransaction.course_id);
    } catch (error) {
      error.status = 502;
      error.code = 'PAYMENT_PAID_ENROLLMENT_PENDING';
      error.message = 'ZaloPay confirmed payment, but course access is pending. Check status again.';
      throw error;
    }
    return { payment: normalizePayment(currentTransaction), enrollment };
  }

  return { finalizePaidPayment, transitionPaymentToFailed };
}
