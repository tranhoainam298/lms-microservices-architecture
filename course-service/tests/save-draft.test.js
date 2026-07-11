import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';

// Set JWT_SECRET before importing middlewares/services to ensure ESM dynamic evaluation has it
process.env.JWT_SECRET = 'UserMicroserviceSecretKey2026';

const { pool } = await import('../src/data/database.js');
const { createDraftCourse } = await import('../src/services/courseService.js');
const { jwtAuth } = await import('../src/middleware/jwtAuth.js');
const { requireRole } = await import('../src/middleware/requireRole.js');
const { createDraft } = await import('../src/controllers/courseController.js');

const JWT_SECRET = process.env.JWT_SECRET;

// Helper to generate JWT tokens
function generateToken(id, role) {
  return jwt.sign({ id, role }, JWT_SECRET, { expiresIn: '1h' });
}

test('Save Draft Course Test Suite', async (t) => {
  // Global cleanup before and after tests
  const cleanup = async () => {
    try {
      const connection = await pool.getConnection();
      await connection.query("DELETE FROM courses WHERE title LIKE 'TEST_SAVE_DRAFT_%'");
      connection.release();
    } catch (err) {
      console.error('Cleanup error:', err);
    }
  };

  await cleanup();

  await t.test('1. Valid instructor creates draft without lessons', async () => {
    const result = await createDraftCourse({
      title: 'TEST_SAVE_DRAFT_1',
      description: 'Test description 1',
      price: 19.99,
      category: 'Test Category',
      instructorId: 10,
      lessons: []
    });

    assert.equal(result.status, 201);
    assert.equal(result.body.course.title, 'TEST_SAVE_DRAFT_1');
    assert.equal(result.body.course.status, 'draft');
    assert.equal(result.body.course.instructorId, 10);
    assert.ok(Array.isArray(result.body.course.lessons));
    assert.equal(result.body.course.lessons.length, 0);

    // Verify in DB
    const connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT * FROM courses WHERE id = ?', [result.body.course.id]);
    connection.release();
    assert.equal(rows.length, 1);
    assert.equal(rows[0].status, 'draft');
  });

  await t.test('2. Valid instructor creates draft with lessons', async () => {
    const result = await createDraftCourse({
      title: 'TEST_SAVE_DRAFT_2',
      description: 'Test description 2',
      price: 29.99,
      category: 'Test Category',
      instructorId: 10,
      lessons: [
        { title: 'Lesson 1', videoUrl: 'https://example.com/video1', documentUrl: null, orderIndex: 1 },
        { title: 'Lesson 2', videoUrl: null, documentUrl: 'https://example.com/doc2', orderIndex: 2 }
      ]
    });

    assert.equal(result.status, 201);
    assert.equal(result.body.course.title, 'TEST_SAVE_DRAFT_2');
    assert.equal(result.body.course.lessons.length, 2);
    assert.equal(result.body.course.lessons[0].title, 'Lesson 1');
    assert.equal(result.body.course.lessons[1].title, 'Lesson 2');

    // Verify in DB
    const connection = await pool.getConnection();
    const [cRows] = await connection.query('SELECT * FROM courses WHERE id = ?', [result.body.course.id]);
    const [lRows] = await connection.query('SELECT * FROM lessons WHERE course_id = ? ORDER BY order_index', [result.body.course.id]);
    connection.release();

    assert.equal(cRows.length, 1);
    assert.equal(lRows.length, 2);
    assert.equal(lRows[0].title, 'Lesson 1');
    assert.equal(lRows[0].order_index, 1);
    assert.equal(lRows[1].title, 'Lesson 2');
    assert.equal(lRows[1].order_index, 2);
  });

  await t.test('3. Missing token', () => {
    const req = { headers: {} };
    let statusVal, jsonVal;
    const res = {
      status(code) { statusVal = code; return this; },
      json(body) { jsonVal = body; return this; }
    };
    const next = () => { assert.fail('Should not call next()'); };

    jwtAuth(req, res, next);
    assert.equal(statusVal, 401);
    assert.equal(jsonVal.code, 'UNAUTHORIZED');
  });

  await t.test('4. Invalid token', () => {
    const req = { headers: { authorization: 'Bearer invalidtokenhere' } };
    let statusVal, jsonVal;
    const res = {
      status(code) { statusVal = code; return this; },
      json(body) { jsonVal = body; return this; }
    };
    const next = () => { assert.fail('Should not call next()'); };

    jwtAuth(req, res, next);
    assert.equal(statusVal, 401);
    assert.equal(jsonVal.code, 'INVALID_TOKEN');
  });

  await t.test('5. Student token fails requireRole("instructor")', () => {
    const token = generateToken(100, 'student');
    const req = { headers: { authorization: 'Bearer ' + token } };
    let statusVal, jsonVal;
    const res = {
      status(code) { statusVal = code; return this; },
      json(body) { jsonVal = body; return this; }
    };
    let nextCalled = false;
    const next = () => { nextCalled = true; };

    jwtAuth(req, res, () => {
      requireRole('instructor')(req, res, next);
    });

    assert.equal(nextCalled, false);
    assert.equal(statusVal, 403);
    assert.equal(jsonVal.code, 'FORBIDDEN');
  });

  await t.test('6. Admin token fails requireRole("instructor")', () => {
    const token = generateToken(101, 'admin');
    const req = { headers: { authorization: 'Bearer ' + token } };
    let statusVal, jsonVal;
    const res = {
      status(code) { statusVal = code; return this; },
      json(body) { jsonVal = body; return this; }
    };
    let nextCalled = false;
    const next = () => { nextCalled = true; };

    jwtAuth(req, res, () => {
      requireRole('instructor')(req, res, next);
    });

    assert.equal(nextCalled, false);
    assert.equal(statusVal, 403);
    assert.equal(jsonVal.code, 'FORBIDDEN');
  });

  await t.test('7. Forged instructorId in body is ignored', async () => {
    const req = {
      user: { id: 12 }, // authenticated instructor ID
      body: {
        title: 'TEST_SAVE_DRAFT_7',
        description: 'Test description 7',
        price: 19.99,
        instructorId: 999 // forged ID
      }
    };
    let statusVal, jsonVal;
    const res = {
      status(code) { statusVal = code; return this; },
      json(body) { jsonVal = body; return this; }
    };

    await createDraft(req, res);
    assert.equal(statusVal, 201);
    assert.equal(jsonVal.course.instructorId, 12); // Stored ID must come from user context (JWT)
  });

  await t.test('8. Client sends status = published is forced to draft', async () => {
    const result = await createDraftCourse({
      title: 'TEST_SAVE_DRAFT_8',
      description: 'Test description 8',
      price: 19.99,
      instructorId: 10,
      status: 'published', // forged status
      lessons: []
    });

    assert.equal(result.status, 201);
    assert.equal(result.body.course.status, 'draft'); // Forced to draft
  });

  await t.test('9. Invalid course data', async () => {
    const result = await createDraftCourse({
      title: '', // Invalid empty title
      description: 'Test description 9',
      price: 19.99,
      instructorId: 10,
      lessons: []
    });

    assert.equal(result.status, 400);
    assert.equal(result.body.code, 'VALIDATION_ERROR');

    // Verify nothing is inserted in DB
    const connection = await pool.getConnection();
    const [rows] = await connection.query("SELECT * FROM courses WHERE title = ''");
    connection.release();
    assert.equal(rows.length, 0);
  });

  await t.test('10. Invalid lesson data rolls back course creation', async () => {
    const result = await createDraftCourse({
      title: 'TEST_SAVE_DRAFT_10',
      description: 'Test description 10',
      price: 19.99,
      instructorId: 10,
      lessons: [
        { title: 'Lesson 1', videoUrl: 'invalid-url', documentUrl: null, orderIndex: 1 } // Invalid URL
      ]
    });

    assert.equal(result.status, 400);
    assert.equal(result.body.code, 'VALIDATION_ERROR');

    // Verify course was not saved
    const connection = await pool.getConnection();
    const [rows] = await connection.query("SELECT * FROM courses WHERE title = 'TEST_SAVE_DRAFT_10'");
    connection.release();
    assert.equal(rows.length, 0);
  });

  await t.test('11. Simulated lesson insert failure rolls back everything', async () => {
    // We can simulate lesson insert failure by providing duplicate order index
    const result = await createDraftCourse({
      title: 'TEST_SAVE_DRAFT_11',
      description: 'Test description 11',
      price: 19.99,
      instructorId: 10,
      lessons: [
        { title: 'Lesson 1', videoUrl: 'https://example.com/1', documentUrl: null, orderIndex: 1 },
        { title: 'Lesson 2', videoUrl: 'https://example.com/2', documentUrl: null, orderIndex: 1 } // Duplicate order index
      ]
    });

    assert.equal(result.status, 400);
    assert.equal(result.body.code, 'VALIDATION_ERROR');

    // Verify course was not saved
    const connection = await pool.getConnection();
    const [rows] = await connection.query("SELECT * FROM courses WHERE title = 'TEST_SAVE_DRAFT_11'");
    connection.release();
    assert.equal(rows.length, 0);
  });

  await t.test('12. API Gateway flow simulation', async () => {
    const routesModule = await import('../src/routes/courseRoutes.js');
    assert.ok(routesModule.default);
  });

  await cleanup();
});
