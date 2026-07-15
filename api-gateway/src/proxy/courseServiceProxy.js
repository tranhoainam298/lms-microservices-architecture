const courseServiceUrl = process.env.COURSE_SERVICE_URL || 'http://localhost:5002';

function parsePositiveInteger(value, code, label) {
  const text = String(value);
  const parsedValue = Number(text);
  if (!/^[1-9]\d*$/.test(text) || !Number.isSafeInteger(parsedValue)) {
    const error = new Error(`${label} must be a positive integer.`);
    error.status = 400;
    error.code = code;
    throw error;
  }
  return parsedValue;
}

export async function forwardCreateDraft(payload, authorizationHeader) {
  let response;
  try {
    response = await fetch(`${courseServiceUrl}/courses/draft`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authorizationHeader ? { 'Authorization': authorizationHeader } : {})
      },
      body: JSON.stringify(payload)
    });
  } catch (cause) {
    const error = new Error('Course Service is unavailable.');
    error.status = 502;
    error.code = 'COURSE_SERVICE_UNAVAILABLE';
    error.cause = cause;
    throw error;
  }

  const body = await response.json();
  return { status: response.status, body };
}

export async function forwardCreateLessonForDraft(courseId, payload, authorizationHeader) {
  const courseIdNum = parsePositiveInteger(courseId, 'INVALID_COURSE_ID', 'Course ID');

  let response;
  try {
    response = await fetch(`${courseServiceUrl}/courses/drafts/${courseIdNum}/lessons`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authorizationHeader ? { 'Authorization': authorizationHeader } : {})
      },
      body: JSON.stringify(payload)
    });
  } catch (cause) {
    const error = new Error('Course Service is unavailable.');
    error.status = 502;
    error.code = 'COURSE_SERVICE_UNAVAILABLE';
    error.cause = cause;
    throw error;
  }

  const body = await response.json();
  return { status: response.status, body };
}

export async function forwardGetLesson(lessonId, authorizationHeader) {
  const lessonIdNum = parsePositiveInteger(lessonId, 'INVALID_LESSON_ID', 'Lesson ID');
  let response;
  try {
    response = await fetch(`${courseServiceUrl}/courses/lessons/${lessonIdNum}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        ...(authorizationHeader ? { 'Authorization': authorizationHeader } : {})
      }
    });
  } catch (cause) {
    const error = new Error('Course Service is unavailable.');
    error.status = 502;
    error.code = 'COURSE_SERVICE_UNAVAILABLE';
    error.cause = cause;
    throw error;
  }

  const body = await response.json();
  return { status: response.status, body };
}

function buildForwardedQuery(query, allowedKeys) {
  const searchParams = new URLSearchParams();
  for (const key of allowedKeys) {
    if (query?.[key] === undefined) continue;
    const values = Array.isArray(query[key]) ? query[key] : [query[key]];
    for (const value of values) searchParams.append(key, String(value));
  }
  const encoded = searchParams.toString();
  return encoded ? `?${encoded}` : '';
}

export async function forwardGetCourses(query = {}) {
  const queryString = buildForwardedQuery(query, ['search', 'category', 'minPrice', 'maxPrice']);
  let response;
  try {
    response = await fetch(`${courseServiceUrl}/courses${queryString}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
  } catch (cause) {
    const error = new Error('Course Service is unavailable.');
    error.status = 502;
    error.code = 'COURSE_SERVICE_UNAVAILABLE';
    error.cause = cause;
    throw error;
  }
  const body = await response.json();
  return { status: response.status, body };
}

export async function forwardGetPublishedCourseDetail(courseId) {
  const courseIdNum = parsePositiveInteger(courseId, 'INVALID_COURSE_ID', 'Course ID');
  let response;
  try {
    response = await fetch(`${courseServiceUrl}/courses/${courseIdNum}`, {
      headers: { 'Accept': 'application/json' }
    });
  } catch (cause) {
    const error = new Error('Course Service is unavailable.');
    error.status = 502;
    error.code = 'COURSE_SERVICE_UNAVAILABLE';
    error.cause = cause;
    throw error;
  }
  const body = await response.json();
  return { status: response.status, body };
}

export async function forwardGetCourseCategories() {
  let response;
  try {
    response = await fetch(`${courseServiceUrl}/courses/categories`, {
      headers: { 'Accept': 'application/json' }
    });
  } catch (cause) {
    const error = new Error('Course Service is unavailable.');
    error.status = 502;
    error.code = 'COURSE_SERVICE_UNAVAILABLE';
    error.cause = cause;
    throw error;
  }
  const body = await response.json();
  return { status: response.status, body };
}

export async function forwardGetInstructorCourseProgress(courseId, authorizationHeader) {
  const courseIdNum = parsePositiveInteger(courseId, 'INVALID_COURSE_ID', 'Course ID');
  let response;
  try {
    response = await fetch(`${courseServiceUrl}/courses/instructor/${courseIdNum}/progress`, {
      headers: {
        'Accept': 'application/json',
        ...(authorizationHeader ? { 'Authorization': authorizationHeader } : {})
      }
    });
  } catch (cause) {
    const error = new Error('Course Service is unavailable.');
    error.status = 502;
    error.code = 'COURSE_SERVICE_UNAVAILABLE';
    error.cause = cause;
    throw error;
  }
  const body = await response.json();
  return { status: response.status, body };
}

export async function forwardGetInstructorCourses(authorizationHeader) {
  let response;
  try {
    response = await fetch(`${courseServiceUrl}/courses/instructor/mine`, {
      headers: {
        'Accept': 'application/json',
        ...(authorizationHeader ? { 'Authorization': authorizationHeader } : {})
      }
    });
  } catch (cause) {
    const error = new Error('Course Service is unavailable.');
    error.status = 502;
    error.code = 'COURSE_SERVICE_UNAVAILABLE';
    error.cause = cause;
    throw error;
  }
  const body = await response.json();
  return { status: response.status, body };
}

export async function forwardGetAdminCourseReport(query, authorizationHeader) {
  const queryString = buildForwardedQuery(query, ['dateFrom', 'dateTo', 'category', 'status']);
  let response;
  try {
    response = await fetch(`${courseServiceUrl}/courses/admin/reports/courses${queryString}`, {
      headers: {
        'Accept': 'application/json',
        ...(authorizationHeader ? { 'Authorization': authorizationHeader } : {})
      }
    });
  } catch (cause) {
    const error = new Error('Course Service is unavailable.');
    error.status = 502;
    error.code = 'COURSE_SERVICE_UNAVAILABLE';
    error.cause = cause;
    throw error;
  }
  const body = await response.json();
  return { status: response.status, body };
}

export async function forwardModerateCourseStatus(courseId, payload, authorizationHeader) {
  const courseIdNum = parsePositiveInteger(courseId, 'INVALID_COURSE_ID', 'Course ID');
  let response;
  try {
    response = await fetch(`${courseServiceUrl}/courses/admin/${courseIdNum}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(authorizationHeader ? { 'Authorization': authorizationHeader } : {})
      },
      body: JSON.stringify(payload)
    });
  } catch (cause) {
    const error = new Error('Course Service is unavailable.');
    error.status = 502;
    error.code = 'COURSE_SERVICE_UNAVAILABLE';
    error.cause = cause;
    throw error;
  }
  const body = await response.json();
  return { status: response.status, body };
}

export async function forwardUpdateCourseCategory(courseId, payload, authorizationHeader) {
  const courseIdNum = parsePositiveInteger(courseId, 'INVALID_COURSE_ID', 'Course ID');
  let response;
  try {
    response = await fetch(`${courseServiceUrl}/courses/admin/${courseIdNum}/category`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(authorizationHeader ? { 'Authorization': authorizationHeader } : {})
      },
      body: JSON.stringify(payload)
    });
  } catch (cause) {
    const error = new Error('Course Service is unavailable.');
    error.status = 502;
    error.code = 'COURSE_SERVICE_UNAVAILABLE';
    error.cause = cause;
    throw error;
  }
  const body = await response.json();
  return { status: response.status, body };
}

export async function forwardGetEnrolledCourses(authorizationHeader) {
  let response;
  try {
    response = await fetch(`${courseServiceUrl}/courses/enrolled`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        ...(authorizationHeader ? { 'Authorization': authorizationHeader } : {})
      }
    });
  } catch (cause) {
    const error = new Error('Course Service is unavailable.');
    error.status = 502;
    error.code = 'COURSE_SERVICE_UNAVAILABLE';
    error.cause = cause;
    throw error;
  }
  const body = await response.json();
  return { status: response.status, body };
}

export async function forwardGetDrafts(authorizationHeader) {
  let response;
  try {
    response = await fetch(`${courseServiceUrl}/courses/drafts/mine`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        ...(authorizationHeader ? { 'Authorization': authorizationHeader } : {})
      }
    });
  } catch (cause) {
    const error = new Error('Course Service is unavailable.');
    error.status = 502;
    error.code = 'COURSE_SERVICE_UNAVAILABLE';
    error.cause = cause;
    throw error;
  }
  const body = await response.json();
  return { status: response.status, body };
}

export async function forwardUpdateDraft(courseId, payload, authorizationHeader) {
  const courseIdNum = parsePositiveInteger(courseId, 'INVALID_COURSE_ID', 'Course ID');

  let response;
  try {
    response = await fetch(`${courseServiceUrl}/courses/drafts/${courseIdNum}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(authorizationHeader ? { 'Authorization': authorizationHeader } : {})
      },
      body: JSON.stringify(payload)
    });
  } catch (cause) {
    const error = new Error('Course Service is unavailable.');
    error.status = 502;
    error.code = 'COURSE_SERVICE_UNAVAILABLE';
    error.cause = cause;
    throw error;
  }
  const body = await response.json();
  return { status: response.status, body };
}

export async function forwardGetCourseLearning(courseId, authorizationHeader) {
  const courseIdNum = parsePositiveInteger(courseId, 'INVALID_COURSE_ID', 'Course ID');
  let response;
  try {
    response = await fetch(`${courseServiceUrl}/courses/${courseIdNum}/learning`, {
      headers: {
        'Accept': 'application/json',
        ...(authorizationHeader ? { 'Authorization': authorizationHeader } : {})
      }
    });
  } catch (cause) {
    const error = new Error('Course content is unavailable.');
    error.status = 502;
    error.code = 'COURSE_SERVICE_UNAVAILABLE';
    error.cause = cause;
    throw error;
  }
  const body = await response.json();
  return { status: response.status, body };
}

export async function forwardEnrollInFreeCourse(courseId, authorizationHeader) {
  const courseIdNum = parsePositiveInteger(courseId, 'INVALID_COURSE_ID', 'Course ID');
  let response;
  try {
    response = await fetch(`${courseServiceUrl}/courses/${courseIdNum}/enroll`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authorizationHeader ? { 'Authorization': authorizationHeader } : {})
      }
    });
  } catch (cause) {
    const error = new Error('Course Service is unavailable.');
    error.status = 502;
    error.code = 'COURSE_SERVICE_UNAVAILABLE';
    error.cause = cause;
    throw error;
  }
  const body = await response.json();
  return { status: response.status, body };
}

export async function forwardDeleteDraft(courseId, authorizationHeader) {
  const courseIdNum = parsePositiveInteger(courseId, 'INVALID_COURSE_ID', 'Course ID');
  let response;
  try {
    response = await fetch(`${courseServiceUrl}/courses/drafts/${courseIdNum}`, {
      method: 'DELETE',
      headers: {
        ...(authorizationHeader ? { 'Authorization': authorizationHeader } : {})
      }
    });
  } catch (cause) {
    const error = new Error('Course Service is unavailable.');
    error.status = 502;
    error.code = 'COURSE_SERVICE_UNAVAILABLE';
    error.cause = cause;
    throw error;
  }
  const body = await response.json();
  return { status: response.status, body };
}

export async function forwardCompleteLesson(lessonId, authorizationHeader) {
  const lessonIdNum = parsePositiveInteger(lessonId, 'INVALID_LESSON_ID', 'Lesson ID');
  let response;
  try {
    response = await fetch(`${courseServiceUrl}/courses/lessons/${lessonIdNum}/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authorizationHeader ? { 'Authorization': authorizationHeader } : {})
      }
    });
  } catch (cause) {
    const error = new Error('Learning progress could not be saved.');
    error.status = 502;
    error.code = 'COURSE_SERVICE_UNAVAILABLE';
    error.cause = cause;
    throw error;
  }
  const body = await response.json();
  return { status: response.status, body };
}

export async function forwardAskAiAboutLesson(lessonId, payload, authorizationHeader) {
  const lessonIdNum = parsePositiveInteger(lessonId, 'INVALID_LESSON_ID', 'Lesson ID');
  let response;
  try {
    response = await fetch(`${courseServiceUrl}/courses/lessons/${lessonIdNum}/ai/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authorizationHeader ? { 'Authorization': authorizationHeader } : {})
      },
      body: JSON.stringify(payload)
    });
  } catch (cause) {
    const error = new Error('AI support is unavailable right now.');
    error.status = 502;
    error.code = 'COURSE_SERVICE_UNAVAILABLE';
    error.cause = cause;
    throw error;
  }
  const body = await response.json();
  return { status: response.status, body };
}

export async function forwardPublishDraft(courseId, authorizationHeader) {
  const courseIdNum = parsePositiveInteger(courseId, 'INVALID_COURSE_ID', 'Course ID');

  let response;
  try {
    response = await fetch(`${courseServiceUrl}/courses/drafts/${courseIdNum}/publish`, {
      method: 'PATCH',
      headers: {
        ...(authorizationHeader ? { 'Authorization': authorizationHeader } : {})
      }
    });
  } catch (cause) {
    const error = new Error('Course Service is unavailable.');
    error.status = 502;
    error.code = 'COURSE_SERVICE_UNAVAILABLE';
    error.cause = cause;
    throw error;
  }

  const body = await response.json();
  return { status: response.status, body };
}

export async function forwardGetLessonsForDraft(courseId, authorizationHeader) {
  const courseIdNum = parsePositiveInteger(courseId, 'INVALID_COURSE_ID', 'Course ID');
  let response;
  try {
    response = await fetch(`${courseServiceUrl}/courses/drafts/${courseIdNum}/lessons`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        ...(authorizationHeader ? { 'Authorization': authorizationHeader } : {})
      }
    });
  } catch (cause) {
    const error = new Error('Course Service is unavailable.');
    error.status = 502;
    error.code = 'COURSE_SERVICE_UNAVAILABLE';
    error.cause = cause;
    throw error;
  }
  const body = await response.json();
  return { status: response.status, body };
}

export async function forwardReorderLessonsForDraft(courseId, payload, authorizationHeader) {
  const courseIdNum = parsePositiveInteger(courseId, 'INVALID_COURSE_ID', 'Course ID');
  let response;
  try {
    response = await fetch(`${courseServiceUrl}/courses/drafts/${courseIdNum}/lessons/reorder`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(authorizationHeader ? { 'Authorization': authorizationHeader } : {})
      },
      body: JSON.stringify(payload)
    });
  } catch (cause) {
    const error = new Error('Course Service is unavailable.');
    error.status = 502;
    error.code = 'COURSE_SERVICE_UNAVAILABLE';
    error.cause = cause;
    throw error;
  }
  const body = await response.json();
  return { status: response.status, body };
}

export async function forwardUpdateLessonForDraft(courseId, lessonId, payload, authorizationHeader) {
  const courseIdNum = parsePositiveInteger(courseId, 'INVALID_COURSE_ID', 'Course ID');
  const lessonIdNum = parsePositiveInteger(lessonId, 'INVALID_LESSON_ID', 'Lesson ID');
  let response;
  try {
    response = await fetch(`${courseServiceUrl}/courses/drafts/${courseIdNum}/lessons/${lessonIdNum}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(authorizationHeader ? { 'Authorization': authorizationHeader } : {})
      },
      body: JSON.stringify(payload)
    });
  } catch (cause) {
    const error = new Error('Course Service is unavailable.');
    error.status = 502;
    error.code = 'COURSE_SERVICE_UNAVAILABLE';
    error.cause = cause;
    throw error;
  }
  const body = await response.json();
  return { status: response.status, body };
}

export async function forwardDeleteLessonForDraft(courseId, lessonId, authorizationHeader) {
  const courseIdNum = parsePositiveInteger(courseId, 'INVALID_COURSE_ID', 'Course ID');
  const lessonIdNum = parsePositiveInteger(lessonId, 'INVALID_LESSON_ID', 'Lesson ID');
  let response;
  try {
    response = await fetch(`${courseServiceUrl}/courses/drafts/${courseIdNum}/lessons/${lessonIdNum}`, {
      method: 'DELETE',
      headers: {
        ...(authorizationHeader ? { 'Authorization': authorizationHeader } : {})
      }
    });
  } catch (cause) {
    const error = new Error('Course Service is unavailable.');
    error.status = 502;
    error.code = 'COURSE_SERVICE_UNAVAILABLE';
    error.cause = cause;
    throw error;
  }
  const body = await response.json();
  return { status: response.status, body };
}
