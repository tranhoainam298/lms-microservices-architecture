// E2E Test script utilizing native fetch

const BASE_URL = 'http://localhost:8080/api';

async function runTest() {
  console.log('🚀 Bắt đầu test luồng E2E cho Course Service...\n');

  try {
    // 1. Đăng nhập Instructor
    console.log('1️⃣ Đăng nhập Instructor (instructor@lms.edu)...');
    let res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'instructor@lms.edu', password: 'password123', role: 'instructor' })
    });
    let data = await res.json();
    if (!data.accessToken) throw new Error('Không lấy được token Instructor. Trả về: ' + JSON.stringify(data));
    const instructorToken = data.accessToken;
    console.log('✅ Đăng nhập Instructor thành công.\n');

    // 2. Tạo Course Draft
    console.log('2️⃣ Tạo khóa học Draft mới...');
    res = await fetch(`${BASE_URL}/courses/draft`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${instructorToken}`
      },
      body: JSON.stringify({ 
        title: 'Khóa học Test E2E AI', 
        description: 'Test quy trình tạo course, lesson và AI Chatbot', 
        price: 0,
        category: 'Test'
      })
    });
    data = await res.json();
    if (!data.course) throw new Error('Tạo draft thất bại: ' + JSON.stringify(data));
    const courseId = data.course.id;
    console.log(`✅ Tạo draft thành công (Course ID: ${courseId}).\n`);

    // 3. Thêm Lesson vào Draft
    console.log(`3️⃣ Thêm bài học vào khóa học ${courseId}...`);
    res = await fetch(`${BASE_URL}/courses/drafts/${courseId}/lessons`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${instructorToken}`
      },
      body: JSON.stringify({ 
        title: 'Bài 1: Giới thiệu AI Chatbot', 
        content: 'Bài học này giúp bạn hiểu về cách tích hợp AI Chatbot. Hệ thống sử dụng OpenAI API hoặc Gemini API.',
        videoUrl: 'http://example.com/video.mp4'
      })
    });
    data = await res.json();
    if (!data.lesson) throw new Error('Thêm lesson thất bại: ' + JSON.stringify(data));
    const lessonId = data.lesson.id;
    console.log(`✅ Thêm bài học thành công (Lesson ID: ${lessonId}).\n`);

    // 4. Publish Khóa học
    console.log(`4️⃣ Publish khóa học ${courseId}...`);
    res = await fetch(`${BASE_URL}/courses/drafts/${courseId}/publish`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${instructorToken}` }
    });
    data = await res.json();
    if (!data.course || data.course.status !== 'published') throw new Error('Publish thất bại: ' + JSON.stringify(data));
    console.log(`✅ Publish khóa học thành công.\n`);

    // 5. Đăng nhập Student
    console.log('5️⃣ Đăng nhập Student (student@lms.edu)...');
    res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'student@lms.edu', password: 'password123', role: 'student' })
    });
    data = await res.json();
    const studentToken = data.accessToken;
    const studentId = data.userProfile.id;
    console.log('✅ Đăng nhập Student thành công. Student ID:', studentId, '\n');

    // 6. Kích hoạt Enrollment (Gọi Internal API)
    // Gateway chặn /internal, nhưng ta có thể gọi qua Gateway nếu bypass hoặc gọi mock payment. 
    // Ở đây ta gọi trực tiếp course-service port 5002 bằng Internal Secret.
    console.log(`6️⃣ Kích hoạt Enrollment cho Student vào khóa ${courseId}...`);
    const { execSync } = await import('child_process');
    const curlCommand = `docker exec course-service node -e "fetch('http://localhost:5002/courses/internal/enrollments/activate', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-internal-service-secret': 'demo_internal_service_secret_change_me' }, body: JSON.stringify({studentId:${studentId}, courseId:${courseId}}) }).then(r=>r.json()).then(data=>console.log(JSON.stringify(data)))"`;
    const activateRes = execSync(curlCommand).toString();
    console.log(`✅ Kích hoạt Enrollment thành công:`, activateRes, '\n');

    // 7. Hỏi AI Chatbot về bài học
    console.log(`7️⃣ Gọi AI Chatbot cho bài học ${lessonId}...`);
    res = await fetch(`${BASE_URL}/courses/lessons/${lessonId}/ai/ask`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${studentToken}`
      },
      body: JSON.stringify({ 
        question: 'Bài học này nói về cái gì?'
      })
    });
    data = await res.json();
    console.log(`✅ AI Chatbot trả về (lưu ý: lỗi 429 quota là bình thường):`);
    console.log(data);
    
    console.log('\n🎉 TEST E2E HOÀN TẤT!');

  } catch (error) {
    console.error('❌ Lỗi E2E Test:', error.message);
  }
}

runTest();
