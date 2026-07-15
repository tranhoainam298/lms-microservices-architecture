import React, { useState, useEffect } from 'react';
import { useAuth } from '../services/AuthContext';
import api from '../services/api';

function ProfilePage() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const response = await api.get('/users/profile');
      const data = response.data.data;
      setProfile(data);
      setName(data.name);
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      await api.put('/users/profile', { name });
      setMessage('Cập nhật hồ sơ thành công!');
      const updatedUser = { ...user, name };
      localStorage.setItem('user', JSON.stringify(updatedUser));
    } catch (error) {
      setMessage('Cập nhật thất bại: ' + (error.response?.data?.message || error.message));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading">Đang tải...</div>;

  const getRoleName = (role) => {
    const roles = { student: 'Học viên', instructor: 'Giảng viên', admin: 'Quản trị viên' };
    return roles[role] || role;
  };

  return (
    <div className="profile-container">
      <h1>Hồ sơ cá nhân</h1>
      {message && <div className="success-message">{message}</div>}

      <div className="profile-card">
        <div className="profile-avatar">
          <div className="avatar-circle">
            {profile?.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
        </div>

        <div className="profile-details">
          <div className="profile-info-row">
            <span className="label">Email:</span>
            <span>{profile?.email}</span>
          </div>
          <div className="profile-info-row">
            <span className="label">Vai trò:</span>
            <span>{getRoleName(profile?.role)}</span>
          </div>
          <div className="profile-info-row">
            <span className="label">Ngày tạo:</span>
            <span>{profile?.created_at ? new Date(profile.created_at).toLocaleDateString('vi-VN') : '-'}</span>
          </div>
        </div>

        <form onSubmit={handleSave} className="profile-form">
          <div className="form-group">
            <label>Họ tên</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Đang lưu...' : 'Cập nhật hồ sơ'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ProfilePage;