import React, { useState, useEffect } from 'react';
import { useAuth } from '../services/AuthContext';
import api from '../services/api';

function PaymentPage() {
  const { user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refunding, setRefunding] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    try {
      const response = await api.get('/payments/history');
      setPayments(response.data.data || []);
    } catch (error) {
      console.error('Failed to load payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefund = async (paymentId) => {
    const reason = prompt('Lý do hoàn tiền:');
    if (!reason) return;

    setRefunding(paymentId);
    try {
      await api.post('/payments/refund', { paymentId, reason });
      setMessage('Yêu cầu hoàn tiền đã được xử lý!');
      loadPayments();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Hoàn tiền thất bại');
    } finally {
      setRefunding(null);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { text: 'Đang chờ', class: 'badge-pending' },
      completed: { text: 'Thành công', class: 'badge-completed' },
      failed: { text: 'Thất bại', class: 'badge-failed' },
      refunded: { text: 'Đã hoàn tiền', class: 'badge-refunded' }
    };
    const badge = badges[status] || { text: status, class: '' };
    return <span className={`badge ${badge.class}`}>{badge.text}</span>;
  };

  const getMethodIcon = (method) => {
    const icons = { zalopay: '💙 ZaloPay', momo: '💜 Momo' };
    return icons[method] || method;
  };

  if (loading) return <div className="loading">Đang tải...</div>;

  return (
    <div className="payment-container">
      <h1>💳 Lịch sử thanh toán</h1>
      {message && <div className="success-message">{message}</div>}

      {payments.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">💳</span>
          <p>Chưa có giao dịch nào.</p>
        </div>
      ) : (
        <div className="payments-list">
          <table className="payments-table">
            <thead>
              <tr>
                <th>Mã giao dịch</th>
                <th>Khóa học</th>
                <th>Số tiền</th>
                <th>Phương thức</th>
                <th>Trạng thái</th>
                <th>Ngày</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {payments.map(payment => (
                <tr key={payment.id}>
                  <td className="transaction-id">{payment.transaction_id}</td>
                  <td>Khóa học #{payment.course_id}</td>
                  <td className="amount">{payment.amount?.toLocaleString()}đ</td>
                  <td>{getMethodIcon(payment.method)}</td>
                  <td>{getStatusBadge(payment.status)}</td>
                  <td>{new Date(payment.created_at).toLocaleDateString('vi-VN')}</td>
                  <td>
                    {payment.status === 'completed' && (
                      <button
                        onClick={() => handleRefund(payment.id)}
                        disabled={refunding === payment.id}
                        className="btn-refund"
                      >
                        {refunding === payment.id ? 'Đang xử lý...' : 'Hoàn tiền'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default PaymentPage;