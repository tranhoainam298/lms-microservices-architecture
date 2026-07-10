// Using native fetch in Node 22

async function testExamService() {
  const BASE_URL = 'http://localhost:3000/quizzes'; // using API Gateway
  const QUESTION_URL = 'http://localhost:3000/questions';

  console.log('--- STARTING EXAM SERVICE TESTS ---');

  try {
    // 1. Create a Quiz
    console.log('\n1. Creating a Quiz...');
    const quizPayload = {
      courseId: 101,
      title: 'Node.js Basics Exam',
      timeLimitMinutes: 30
    };
    
    let res = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(quizPayload)
    });
    
    let quiz = await res.json();
    console.log('Quiz created:', quiz);
    const quizId = quiz.id;

    // 2. Create 2 Questions
    console.log('\n2. Creating 2 Questions...');
    const q1Payload = {
      courseId: 101, // Must match Quiz CourseId
      topic: 'Event Loop',
      content: 'Which phase of event loop executes setTimeout callbacks?',
      options: JSON.stringify(['Timers', 'Poll', 'Check', 'Pending']),
      correctAnswer: 'Timers',
      difficulty: 'medium'
    };
    
    res = await fetch(QUESTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(q1Payload)
    });
    const q1 = await res.json();
    console.log('Question 1 created:', q1);

    const q2Payload = {
      courseId: 101,
      topic: 'Core Modules',
      content: 'Which module is used to read files?',
      options: JSON.stringify(['http', 'fs', 'path', 'os']),
      correctAnswer: 'fs',
      difficulty: 'easy'
    };
    
    res = await fetch(QUESTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(q2Payload)
    });
    const q2 = await res.json();
    console.log('Question 2 created:', q2);

    // 3. Fetch the Quiz (Ensure correctAnswer is NOT present)
    console.log('\n3. Fetching the Quiz (Security Check)...');
    res = await fetch(`${BASE_URL}/${quizId}`);
    const fetchedQuiz = await res.json();
    console.log('Fetched Quiz Detail:', JSON.stringify(fetchedQuiz, null, 2));
    
    // Assert correctAnswer is undefined
    const isSecure = fetchedQuiz.questions.every(q => q.correctAnswer === undefined);
    console.log('Is CorrectAnswer hidden?', isSecure ? '✅ YES' : '❌ NO');

    // 4. Submit Answers (1 correct, 1 wrong -> Expect 50.00 score)
    console.log('\n4. Submitting Answers...');
    const submitPayload = {
      studentId: 99,
      answers: {
        [q1.questionId]: 'Timers', // Correct
        [q2.questionId]: 'http'    // Wrong (correct is fs)
      }
    };
    
    res = await fetch(`${BASE_URL}/${quizId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(submitPayload)
    });
    const result = await res.json();
    console.log('Submit Result:', result);
    
    if (result.score === 50) {
      console.log('✅ Auto-grading logic works! Expected 50, got', result.score);
    } else {
      console.log('❌ Auto-grading logic failed! Expected 50, got', result.score);
    }

  } catch (err) {
    console.error('Test Failed:', err);
  }
}

// In modern Node, global fetch is available.
if (typeof fetch === 'undefined') {
  console.log("Please run with Node v18+ which has global fetch");
} else {
  testExamService();
}
