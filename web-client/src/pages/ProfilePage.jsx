import React, { useEffect, useState } from 'react';

export default function ProfilePage({ accessToken, onProfileUpdated }) {
  const [profile, setProfile] = useState(null);
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [changingPassword, setChangingPassword] = useState(false);

  const loadProfile = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('http://localhost:3000/users/me', { headers: { Authorization: `Bearer ${accessToken}` } });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || 'Profile could not be loaded.');
      setProfile(body.user);
      setFullName(body.user.fullName);
      onProfileUpdated(body.user);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProfile(); }, [accessToken]);

  const saveProfile = async event => {
    event.preventDefault();
    setSaving(true); setError(''); setMessage('');
    try {
      const response = await fetch('http://localhost:3000/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ fullName })
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || 'Profile could not be updated.');
      await loadProfile();
      setMessage('Profile updated successfully.');
    } catch (requestError) { setError(requestError.message); }
    finally { setSaving(false); }
  };

  const changePassword = async event => {
    event.preventDefault();
    setError(''); setMessage('');
    if (passwords.newPassword !== passwords.confirmPassword) { setError('New passwords do not match.'); return; }
    setChangingPassword(true);
    try {
      const response = await fetch('http://localhost:3000/users/me/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ currentPassword: passwords.currentPassword, newPassword: passwords.newPassword })
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || 'Password could not be changed.');
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setMessage(body.message);
    } catch (requestError) { setError(requestError.message); }
    finally { setChangingPassword(false); }
  };

  if (loading) return <section className="card" role="status">Loading your profile...</section>;

  return (
    <section className="account-page">
      <header className="section-heading"><div><p className="section-kicker">Account</p><h2>Your profile</h2></div></header>
      {error && <div className="form-alert form-alert--error" role="alert">{error}</div>}
      {message && <div className="form-alert form-alert--success" role="status">{message}</div>}
      {profile && <div className="account-grid">
        <form className="card draft-form" onSubmit={saveProfile}>
          <h3>Profile details</h3>
          <div className="form-group"><label>Email</label><input className="form-control" value={profile.email} readOnly /></div>
          <div className="form-group"><label>Role</label><input className="form-control" value={profile.role} readOnly /></div>
          <div className="form-group"><label>Status</label><input className="form-control" value={profile.status} readOnly /></div>
          <div className="form-group"><label htmlFor="profile-name">Full name</label><input id="profile-name" className="form-control" value={fullName} onChange={event => setFullName(event.target.value)} maxLength="255" /></div>
          <button className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save profile'}</button>
        </form>
        <form className="card draft-form" onSubmit={changePassword}>
          <h3>Change password</h3>
          <div className="form-group"><label htmlFor="current-password">Current password</label><input id="current-password" type="password" className="form-control" value={passwords.currentPassword} onChange={event => setPasswords(values => ({ ...values, currentPassword: event.target.value }))} autoComplete="current-password" /></div>
          <div className="form-group"><label htmlFor="new-password">New password</label><input id="new-password" type="password" className="form-control" value={passwords.newPassword} onChange={event => setPasswords(values => ({ ...values, newPassword: event.target.value }))} autoComplete="new-password" /></div>
          <div className="form-group"><label htmlFor="confirm-new-password">Confirm new password</label><input id="confirm-new-password" type="password" className="form-control" value={passwords.confirmPassword} onChange={event => setPasswords(values => ({ ...values, confirmPassword: event.target.value }))} autoComplete="new-password" /></div>
          <button className="btn btn-primary" disabled={changingPassword}>{changingPassword ? 'Changing...' : 'Change password'}</button>
          <p className="field-helper">Existing signed JWTs are not globally revoked after a password change.</p>
        </form>
      </div>}
    </section>
  );
}
