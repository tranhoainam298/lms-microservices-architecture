import { createDraftCourse, createLesson, getLesson, getCourses, getEnrolledCourses } from '../services/courseService.js';

export async function createDraft(req, res) {
  const payload = req.body || {};
  const instructorId = req.get('x-user-id');
  
  if (instructorId) {
    payload.instructorId = instructorId;
  }
  
  const result = await createDraftCourse(payload);
  res.status(result.status).json(result.body);
}

export async function createLessonHandler(req, res) {
  const { courseId, title, videoUrl, documentUrl } = req.body;
  
  // Optionally verify instructor is the owner of the course
  // but for now, we just proceed
  const result = await createLesson({ courseId, title, videoUrl, documentUrl });
  res.status(result.status).json(result.body);
}

export async function getLessonHandler(req, res) {
  const { lessonId } = req.params;
  const studentId = req.get('x-user-id'); // assuming API Gateway passes student ID here
  
  const result = await getLesson(lessonId, studentId);
  res.status(result.status).json(result.body);
}

export async function getCoursesHandler(req, res) {
  const result = await getCourses();
  res.status(result.status).json(result.body);
}

export async function getEnrolledCoursesHandler(req, res) {
  const studentId = req.get('x-user-id');
  const result = await getEnrolledCourses(studentId);
  res.status(result.status).json(result.body);
}
