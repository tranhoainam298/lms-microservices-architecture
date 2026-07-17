import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });
import { callRealAiProvider } from '../external-systems/ai-chatbot-system/mock-provider/index.js';

(async () => {
  try {
    console.log('Đang gọi AI provider...');
    const res = await callRealAiProvider({
      question: 'Dựa vào context, Python OOP có những khái niệm nào?',
      context: {
        courseTitle: 'Nhập môn Lập trình Python',
        lessonTitle: 'Lập trình hướng đối tượng (OOP)',
        lessonContent: 'Python là ngôn ngữ lập trình bậc cao. OOP trong Python bao gồm Class, Object, Inheritance, Encapsulation, Polymorphism.',
        progressPercent: 80
      }
    });
    console.log('AI trả lời:');
    console.log(res);
  } catch (err) {
    console.error('Lỗi khi gọi AI:', err);
  }
  process.exit(0);
})();
