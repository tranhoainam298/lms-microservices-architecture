import React, { useState } from 'react';
import StatusBadge from '../components/StatusBadge';

export default function InstructorCourseDraft({ onSaveDraft, initialDrafts = [] }) {
  const [drafts, setDrafts] = useState(initialDrafts);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('49.00');
  const [status, setStatus] = useState('draft');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    // Simulate saving in Course Service / Course DB
    setTimeout(() => {
      const newDraft = {
        id: Date.now(),
        instructor_id: 2,
        title,
        description,
        price: parseFloat(price) || 0.00,
        status
      };

      setDrafts([newDraft, ...drafts]);
      setIsSaving(false);
      setSaveSuccess(true);
      onSaveDraft(newDraft);

      // Reset form
      setTitle('');
      setDescription('');
      setPrice('49.00');
      setStatus('draft');

      setTimeout(() => setSaveSuccess(false), 3000);
    }, 800);
  };

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontFamily: 'var(--font-title)' }}>Course Administration</h1>
        <p className="text-secondary-color">Design new syllabus items and save course drafts.</p>
      </div>

      <div className="architecture-alert">
        <span>📘</span>
        <span>Flow: **Course Management: Save Draft Course** (Course Service / Course DB)</span>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Form panel */}
        <div style={{ gridColumn: 'span 2' }} className="card">
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.25rem' }}>Create Course Draft</h2>
          
          {saveSuccess && (
            <div style={{ padding: '0.75rem', backgroundColor: 'var(--success-light)', color: 'var(--success)', borderRadius: 'var(--border-radius-sm)', marginBottom: '1.25rem', fontSize: '0.875rem' }}>
              ✓ Draft saved successfully in **Course DB**!
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
                  className="form-control" 
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label htmlFor="draft-status">Publish Status</label>
                <select 
                  id="draft-status"
                  className="form-control" 
                  value={status} 
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={isSaving}>
              {isSaving ? 'Saving to Course DB...' : 'Save Draft Course'}
            </button>
          </form>
        </div>

        {/* Sidebar panels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Live Preview */}
          <div className="card" style={{ backgroundColor: 'var(--bg-primary)' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--text-secondary)' }}>Live Preview</h3>
            <div style={{ padding: '1rem', border: '1px dashed var(--border-color)', borderRadius: 'var(--border-radius-sm)', backgroundColor: 'var(--bg-secondary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                <h4 style={{ fontSize: '1rem' }}>{title || 'Untranslated Title'}</h4>
                <StatusBadge status={status} />
              </div>
              <p className="text-xs text-secondary-color" style={{ minHeight: '60px' }}>
                {description || 'Syllabus content description placeholder.'}
              </p>
              <div style={{ fontWeight: '700', marginTop: '0.5rem', color: 'var(--primary)' }}>
                ${parseFloat(price || 0).toFixed(2)}
              </div>
            </div>
          </div>

          {/* Existing Drafts */}
          <div className="card">
            <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Saved Drafts</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {drafts.length === 0 ? (
                <div className="text-xs text-tertiary-color text-center">No drafts saved yet.</div>
              ) : (
                drafts.map(d => (
                  <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: '500', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{d.title}</div>
                      <div className="text-tertiary-color" style={{ fontSize: '0.75rem' }}>${d.price.toFixed(2)}</div>
                    </div>
                    <StatusBadge status={d.status} />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
