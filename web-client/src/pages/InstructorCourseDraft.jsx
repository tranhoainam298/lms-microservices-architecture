import React, { useState } from 'react';
import ArchitectureFlow from '../components/ArchitectureFlow';
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
  const [fieldErrors, setFieldErrors] = useState({});

  const previewPrice = Number.isFinite(Number(price)) && price !== ''
    ? Number(price).toFixed(2)
    : '0.00';
  const instructorName = userProfile?.fullName || userProfile?.full_name || 'Authenticated instructor';

  const clearFieldState = (fieldName) => {
    setFieldErrors(currentErrors => ({ ...currentErrors, [fieldName]: '' }));
    setSaveError('');
    setSaveSuccess(false);
  };

  const validateDraft = () => {
    const nextErrors = {};

    if (!title.trim()) {
      nextErrors.title = 'Enter a course title.';
    }

    if (!description.trim()) {
      nextErrors.description = 'Add a short syllabus description.';
    }

    if (price === '') {
      nextErrors.price = 'Enter a course price.';
    } else if (!Number.isFinite(Number(price))) {
      nextErrors.price = 'Enter a valid numeric price.';
    } else if (Number(price) < 0) {
      nextErrors.price = 'Price cannot be negative.';
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (role !== 'instructor') {
      setSaveError('Only instructors can save draft courses.');
      return;
    }

    if (!validateDraft()) {
      setSaveSuccess(false);
      setSaveError('');
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
      setFieldErrors({});
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
    <section className="course-draft-page" aria-labelledby="draft-page-title">
      <header className="draft-page-header">
        <div>
          <p className="page-kicker">Instructor workspace</p>
          <h2 className="page-title" id="draft-page-title">Create a course draft</h2>
          <p className="page-description">
            Shape the course essentials, review the learner-facing preview, and save through the live service route.
          </p>
        </div>
        <div className="draft-page-header__status">
          <span className="service-badge">Instructor access</span>
          <span>Private workspace</span>
        </div>
      </header>

      <div className="architecture-alert">
        <span>Course authoring boundary</span>
        <span className="service-badge">Course Service / Course DB</span>
        <span className="architecture-alert__detail">Drafts are stored in Course Service memory for this demo.</span>
      </div>

      <ArchitectureFlow
        label="Course draft request"
        steps={['Web Client', 'API Gateway', 'Course Service', 'Course DB']}
        compact
      />

      {role !== 'instructor' ? (
        <section className="card draft-access-state" role="alert" aria-labelledby="draft-access-title">
          <span className="status-badge status-badge--warning">Restricted workspace</span>
          <h3 id="draft-access-title">Instructor access required</h3>
          <p>Only instructors can save draft courses.</p>
        </section>
      ) : (
        <div className="grid grid-cols-3 gap-6 draft-workspace">
          <section className="card draft-editor" aria-labelledby="draft-editor-title">
            <div className="draft-section-heading">
              <div>
                <p className="section-kicker">Course essentials</p>
                <h3 id="draft-editor-title">Draft details</h3>
                <p>Start with the information students need to understand the course.</p>
              </div>
              <StatusBadge status={status} />
            </div>

            <div className="draft-feedback" aria-live="polite" aria-atomic="true">
              {isSaving && (
                <div className="form-alert form-alert--loading" role="status">
                  Saving the draft through the API Gateway...
                </div>
              )}
              {saveSuccess && (
                <div className="form-alert form-alert--success" role="status">
                  Draft saved through the API Gateway.
                </div>
              )}
              {saveError && (
                <div className="form-alert form-alert--error" role="alert">
                  {saveError}
                </div>
              )}
            </div>

            <form className="draft-form" onSubmit={handleSave} noValidate aria-busy={isSaving}>
              <fieldset className="draft-form-section" disabled={isSaving}>
                <legend>Course information</legend>

                <div className={`form-group${fieldErrors.title ? ' has-error' : ''}`}>
                  <label htmlFor="draft-title">Course title</label>
                  <input
                    id="draft-title"
                    type="text"
                    className="form-control"
                    placeholder="e.g., Building SQL Server Microservices"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      clearFieldState('title');
                    }}
                    aria-invalid={Boolean(fieldErrors.title)}
                    aria-describedby={fieldErrors.title ? 'draft-title-helper draft-title-error' : 'draft-title-helper'}
                    required
                  />
                  <p className="field-helper" id="draft-title-helper">Use a clear, specific title students can scan quickly.</p>
                  {fieldErrors.title && <p className="field-error" id="draft-title-error" role="alert">{fieldErrors.title}</p>}
                </div>

                <div className={`form-group${fieldErrors.description ? ' has-error' : ''}`}>
                  <div className="field-label-row">
                    <label htmlFor="draft-description">Syllabus description</label>
                    <span aria-hidden="true">{description.length} characters</span>
                  </div>
                  <textarea
                    id="draft-description"
                    className="form-control"
                    rows="6"
                    placeholder="Describe the outcomes, audience, and concepts students will learn."
                    value={description}
                    onChange={(e) => {
                      setDescription(e.target.value);
                      clearFieldState('description');
                    }}
                    aria-invalid={Boolean(fieldErrors.description)}
                    aria-describedby={fieldErrors.description ? 'draft-description-helper draft-description-error' : 'draft-description-helper'}
                    required
                  />
                  <p className="field-helper" id="draft-description-helper">This summary appears in the course preview.</p>
                  {fieldErrors.description && <p className="field-error" id="draft-description-error" role="alert">{fieldErrors.description}</p>}
                </div>

                <div className="draft-form-grid">
                  <div className={`form-group${fieldErrors.price ? ' has-error' : ''}`}>
                    <label htmlFor="draft-price">Price (USD)</label>
                    <div className="price-field">
                      <span aria-hidden="true">$</span>
                      <input
                        id="draft-price"
                        type="number"
                        step="0.01"
                        min="0"
                        className="form-control"
                        value={price}
                        onChange={(e) => {
                          setPrice(e.target.value);
                          clearFieldState('price');
                        }}
                        aria-invalid={Boolean(fieldErrors.price)}
                        aria-describedby={fieldErrors.price ? 'draft-price-helper draft-price-error' : 'draft-price-helper'}
                        required
                      />
                    </div>
                    <p className="field-helper" id="draft-price-helper">Displayed in the course catalog.</p>
                    {fieldErrors.price && <p className="field-error" id="draft-price-error" role="alert">{fieldErrors.price}</p>}
                  </div>

                  <div className="form-group">
                    <label htmlFor="draft-status">Publishing status</label>
                    <select
                      id="draft-status"
                      className="form-control"
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      disabled
                      aria-describedby="draft-status-helper"
                    >
                      <option value="draft">Draft</option>
                    </select>
                    <p className="field-helper" id="draft-status-helper">New courses remain private drafts.</p>
                  </div>
                </div>
              </fieldset>

              <div className="draft-form-actions">
                <button type="submit" className="btn btn-primary" disabled={isSaving}>
                  {isSaving && <span className="button-spinner" aria-hidden="true" />}
                  {isSaving ? 'Saving draft...' : 'Save draft course'}
                </button>
                <p>Only authenticated instructors can save through this route.</p>
              </div>
            </form>
          </section>

          <aside className="draft-sidebar" aria-label="Draft preview and saved courses">
            <section className="card draft-preview-panel" aria-labelledby="draft-preview-title">
              <div className="draft-panel-heading">
                <div>
                  <p className="section-kicker">Live preview</p>
                  <h3 id="draft-preview-title">Course card</h3>
                </div>
                <span className="draft-panel-heading__status">Updates as you type</span>
              </div>

              <article className="draft-preview">
                <div className="draft-preview__visual" aria-hidden="true">
                  <span>Course</span>
                  <strong>{title.trim() ? title.trim().slice(0, 2).toUpperCase() : 'CD'}</strong>
                </div>
                <div className="draft-preview__body">
                  <div className="draft-preview__topline">
                    <span>Instructor-led course</span>
                    <StatusBadge status={status} />
                  </div>
                  <h4>{title || 'Untitled draft course'}</h4>
                  <p>{description || 'Your syllabus description will appear here as you shape the course.'}</p>
                  <div className="draft-preview__footer">
                    <span>By {instructorName}</span>
                    <strong>${previewPrice}</strong>
                  </div>
                </div>
              </article>
            </section>

            <section className="card draft-metadata-card" aria-labelledby="draft-metadata-title">
              <div className="draft-panel-heading">
                <div>
                  <p className="section-kicker">Metadata</p>
                  <h3 id="draft-metadata-title">Draft summary</h3>
                </div>
              </div>
              <dl className="draft-metadata-list">
                <div>
                  <dt>Owner</dt>
                  <dd>{instructorName}</dd>
                </div>
                <div>
                  <dt>Visibility</dt>
                  <dd>Private draft</dd>
                </div>
                <div>
                  <dt>Service owner</dt>
                  <dd>Course Service</dd>
                </div>
                <div>
                  <dt>Storage</dt>
                  <dd>Course DB</dd>
                </div>
              </dl>
            </section>

            <section className="card draft-list-panel" aria-labelledby="saved-drafts-title">
              <div className="draft-panel-heading">
                <div>
                  <p className="section-kicker">Library</p>
                  <h3 id="saved-drafts-title">Saved drafts</h3>
                </div>
                <span className="draft-count" aria-label={`${drafts.length} saved drafts`}>{drafts.length}</span>
              </div>

              {drafts.length === 0 ? (
                <div className="draft-empty-state" role="status">
                  <strong>No drafts saved yet</strong>
                  <p>Your first saved course will appear here.</p>
                </div>
              ) : (
                <ul className="draft-list">
                  {drafts.map(draft => (
                    <li className="draft-list__item" key={draft.id}>
                      <div className="draft-list__copy">
                        <strong>{draft.title}</strong>
                        <span>${Number(draft.price).toFixed(2)} / Course Service</span>
                      </div>
                      <StatusBadge status={draft.status} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </aside>
        </div>
      )}
    </section>
  );
}
