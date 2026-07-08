import { createDraftCourse } from '../services/courseService.js';

export function createDraft(req, res) {
  const result = createDraftCourse(req.body || {}, req.get('authorization'));
  res.status(result.status).json(result.body);
}
