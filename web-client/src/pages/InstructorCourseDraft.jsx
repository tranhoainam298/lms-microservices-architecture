import React, { useState } from 'react';
import StatusBadge from '../components/StatusBadge';

export default function InstructorCourseDraft({ onSaveDraft, initialDrafts = [], accessToken, userProfile, role }) {
  const [drafts, setDrafts] = useState(initialDrafts);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('49.00');
  const [status, setStatus] = useState('draft');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');

  const handleSave = async (e) => {
    e.preventDefault();
    if (role !== 'instructor') {
      setSaveError('Only instructors can save draft courses.');
      return;
    }

    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError('');

    try {
      const response = await fetch('http://localhost:3000/courses/draft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          title,
          description,
          price: Number(price),
          status,
          instructorId: userProfile.id
        })
      });
      const responseBody = await response.json();

      if (!response.ok) {
        throw new Error(responseBody.message || 'The draft course could not be saved.');
      }

      const newDraft = responseBody.course;
      setDrafts(currentDrafts => [newDraft, ...currentDrafts]);
      setSaveSuccess(true);
      onSaveDraft(newDraft);
      setTitle('');
      setDescription('');
      setPrice('49.00');
      setStatus('draft');
    } catch (requestError) {
      const message = requestError instanceof TypeError
        ? 'Course draft service is unavailable. Start the API Gateway and Course Service, then try again.'
        : requestError.message;
      setSaveError(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="course-draft-page">
      <div className="architecture-alert">
        <span>Course draft boundary</span>
        <span className="service-badge">Course Service / Course DB</span>
        <span className="architecture-alert__detail">Drafts are stored in Course Service memory for this demo</span>
      </div>

      {role !== 'instructor' ? (
        <div className="card" role="alert">Only instructors can save draft courses.</div>
      ) : (

      <div className="grid grid-cols-3 gap-6 draft-workspace">
        {/* Form panel */}
        <div style={{ gridColumn: 'span 2' }} className="card">
          <h2 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
            Draft course details
          </h2>
          
          {saveSuccess && (
            <div style={{ padding: '0.75rem', backgroundColor: 'var(--success-light)', color: 'var(--success)', borderRadius: 'var(--border-radius-sm)', marginBottom: '1.25rem', fontSize: '0.8125rem', fontWeight: '600' }}>
              Draft saved through the API Gateway.
            </div>
          )}

          {saveError && (
            <div style={{ padding: '0.75rem', backgroundColor: 'var(--danger-light)', color: 'var(--danger)', borderRadius: 'var(--border-radius-sm)', marginBottom: '1.25rem', fontSize: '0.8125rem', fontWeight: '600' }} role="alert">
              {saveError}
            </div>
          )}

          <form onSubmit={handleSave}>
            <div className="form-group">
              <label htmlFor="draft-title">Course Title</label>
              <input 
                id="draft-title"
                type="text" 
                className="form-control" 
                placeholder="e.g., Building SQL Server Microservices"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="draft-description">Syllabus Description</label>
              <textarea 
                id="draft-description"
                className="form-control" 
                rows="4"
                placeholder="Describe what students will learn..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              ></textarea>
            </div>

            <div style={{ display: 'flex', gap: '1.5rem' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label htmlFor="draft-price">Price ($)</label>
                <input 
                  id="draft-price"
                  type="number" 
                  step="0.01"
                  min="0"
                  className="form-control" 
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label htmlFor="draft-status">Course status</label>
                <select 
                  id="draft-status"
                  className="form-control" 
                  value={status} 
                  onChange={(e) => setStatus(e.target.value)}
                  disabled
                >
                  <option value="draft">Draft</option>
                </select>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ fontWeight: '600' }} disabled={isSaving}>
              {isSaving ? 'Saving draft...' : 'Save draft course'}
            </button>
          </form>
        </div>

        {/* Sidebar panels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Live Preview */}
          <div className="card" style={{ backgroundColor: 'var(--bg-primary)' }}>
            <h3 style={{ fontSize: '0.8125rem', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
              Course preview
            </h3>
            <div style={{ padding: '1rem', border: '1px dashed var(--border-color)', borderRadius: 'var(--border-radius-sm)', backgroundColor: 'var(--bg-secondary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem', gap: '0.5rem' }}>
                <h4 style={{ fontSize: '0.9375rem', fontWeight: '600' }}>{title || 'Untitled Draft Course'}</h4>
                <StatusBadge status={status} />
              </div>
              <p className="text-xs text-secondary-color" style={{ minHeight: '60px', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {description || 'Syllabus content description placeholder.'}
              </p>
              <div style={{ fontWeight: '700', marginTop: '0.75rem', color: 'var(--primary)', fontSize: '1.1rem' }}>
                ${parseFloat(price || 0).toFixed(2)}
              </div>
            </div>
          </div>

          {/* Existing Drafts */}
          <div className="card">
            <h3 style={{ fontSize: '0.8125rem', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
              Saved drafts
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {drafts.length === 0 ? (
                <div className="text-xs text-tertiary-color text-center">No drafts saved yet.</div>
              ) : (
                drafts.map(d => (
                  <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
                    <div style={{ overflow: 'hidden', maxWidth: '140px' }}>
                      <div style={{ fontSize: '0.8125rem', fontWeight: '600', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{d.title}</div>
                      <div className="text-tertiary-color" style={{ fontSize: '0.7rem' }}>${Number(d.price).toFixed(2)}</div>
                    </div>
                    <StatusBadge status={d.status} />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
