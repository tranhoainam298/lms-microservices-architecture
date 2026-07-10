import { createDraftCourse } from '../services/courseService.js';

export async function createDraft(req, res) {
  const payload = req.body || {};
  const instructorId = req.get('x-user-id');
  
  if (instructorId) {
    payload.instructorId = instructorId;
  }
  
  const result = await createDraftCourse(payload);
  res.status(result.status).json(result.body);
}
