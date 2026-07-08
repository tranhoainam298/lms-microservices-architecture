import { mockCourses } from '../data/mockCourses.js';

const instructorToken = 'mock-token-instructor-instructor-1';

function authorizeInstructor(authorization) {
  if (!authorization?.startsWith('Bearer ')) {
    return {
      status: 401,
      body: { code: 'UNAUTHORIZED', message: 'Authorization token is required.' }
    };
  }

  const token = authorization.slice('Bearer '.length).trim();
  if (token === instructorToken) {
    return null;
  }

  if (/^mock-token-(student|admin)-/.test(token)) {
    return {
      status: 403,
      body: { code: 'FORBIDDEN', message: 'Only instructors can save draft courses.' }
    };
  }

  return {
    status: 401,
    body: { code: 'UNAUTHORIZED', message: 'The mock access token is invalid.' }
  };
}

function validateDraft({ title, description, price, status, instructorId }) {
  if (typeof title !== 'string' || !title.trim()) {
    return 'Title is required.';
  }
  if (typeof description !== 'string' || !description.trim()) {
    return 'Description is required.';
  }
  if (typeof price !== 'number' || !Number.isFinite(price) || price < 0) {
    return 'Price must be a number greater than or equal to 0.';
  }
  if (status !== 'draft') {
    return 'Status must be draft.';
  }
  if (typeof instructorId !== 'string' || !instructorId.trim()) {
    return 'Instructor ID is required.';
  }
  return null;
}

export function createDraftCourse(payload, authorization) {
  const authorizationError = authorizeInstructor(authorization);
  if (authorizationError) {
    return authorizationError;
  }

  const validationError = validateDraft(payload);
  if (validationError) {
    return {
      status: 400,
      body: { code: 'VALIDATION_ERROR', message: validationError }
    };
  }

  if (payload.instructorId !== 'instructor-1') {
    return {
      status: 403,
      body: { code: 'FORBIDDEN', message: 'Instructor identity does not match the access token.' }
    };
  }

  const course = {
    id: `course-draft-${mockCourses.length + 1}`,
    title: payload.title.trim(),
    description: payload.description.trim(),
    price: payload.price,
    status: 'draft',
    instructorId: payload.instructorId,
    createdAt: new Date().toISOString()
  };

  mockCourses.push(course);

  return {
    status: 201,
    body: { course }
  };
}
