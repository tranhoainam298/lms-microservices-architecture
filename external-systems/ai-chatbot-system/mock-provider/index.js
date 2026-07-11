import express from 'express';
import fetch from 'node-fetch'; // Polyfill if node version < 18
import 'dotenv/config';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 5005;
const COURSE_SERVICE_URL = process.env.COURSE_SERVICE_URL || 'http://localhost:5002';

app.post('/ai/chat', async (req, res) => {
  const { question, courseId } = req.body;
  const studentId = req.get('x-user-id'); // Passed from API Gateway

  if (!question || !courseId) {
    return res.status(400).json({ error: 'question and courseId are required.' });
  }

  console.log(`[AI Service] Received question from student ${studentId} for course ${courseId}: "${question}"`);

  try {
    // 1. Fetch course context from Course Service (Internal API call)
    // Note: We might need an internal endpoint in course-service to fetch all lessons for a course without enrollment check (for internal use)
    // For now, let's mock the fetch call
    console.log(`[AI Service] Fetching context from ${COURSE_SERVICE_URL}/internal/courses/${courseId}/context...`);
    
    // Simulate internal API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const mockCourseContext = "This course teaches Node.js and Event-Driven Architecture using RabbitMQ.";

    // 2. Mock AI Response generation
    console.log(`[AI Service] Generating AI response using context: "${mockCourseContext}"`);
    
    // Simulate LLM processing delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    const mockAiResponse = `Hello! Based on the course context (${mockCourseContext}), here is the answer to your question: "${question}". RabbitMQ is indeed a great choice for decoupling microservices!`;

    res.status(200).json({
      role: 'assistant',
      content: mockAiResponse
    });

  } catch (error) {
    console.error('[AI Service] Error processing chat:', error);
    res.status(500).json({ error: 'Failed to process AI chat request.' });
  }
});

app.listen(PORT, () => {
  console.log(`AI Chatbot Service listening on http://localhost:${PORT}`);
});
