# LMS Microservices Architecture

Welcome to the Learning Management System (LMS) built with a modern Microservices Architecture. This project integrates multiple specialized services using both **Node.js** and **C# .NET Core** to ensure high performance and scalability.

## Architecture Overview
- **API Gateway (Port 3000):** Built with Node.js/Express. Handles central routing, JWT verification, and proxying.
- **User Service (Port 5001):** Built with Node.js. Manages user authentication, registration, and profile logic. Uses `user-db-mysql`.
- **Course Service (Port 5002):** Built with Node.js. Manages course drafts, publishing, lessons, and enrollments. Uses `course-db-mysql`.
- **Exam & Quiz Service (Port 5003):** Built with C# .NET Core (Entity Framework). Manages exams, questions, and quiz results. Uses `exam-db-mysql`.
- **Payment Service (Port 5004):** Standby service for future payment gateway integration. Uses `payment-db-mysql`.
- **Message Broker:** RabbitMQ handles cross-service asynchronous communication.

## Prerequisites
Ensure your local development environment has the following installed:
1. **Docker & Docker Compose** (for running MySQL databases and RabbitMQ)
2. **Node.js** (v18+ recommended)
3. **.NET 10.0 SDK** (or .NET 9.0/8.0 depending on your environment compatibility)

---

## 🚀 Quick Start Guide

Follow these steps to clone and run the entire ecosystem locally.

### Step 1: Setup Environment Variables
We have provided `.env.example` templates for all Node.js services. You need to copy them to `.env`.
Navigate to each service folder and run:
```bash
cp api-gateway/.env.example api-gateway/.env
cp user-service/.env.example user-service/.env
cp course-service/.env.example course-service/.env
cp payment-service/.env.example payment-service/.env
```
*(On Windows PowerShell, use `copy` instead of `cp`)*

### Step 2: Start the Infrastructure (Databases & Message Broker)
We use Docker to auto-spin up 4 MySQL instances and 1 RabbitMQ instance. 
Our Docker Compose is pre-configured with Auto-Init SQL Scripts, so the databases and tables (`users`, `courses`, `lessons`, `enrollments`, etc.) are created automatically on the very first run!

Navigate to the `infra` folder and run:
```bash
cd infra
docker-compose up -d
```
*(Wait a few seconds for the databases to fully initialize).*

### Step 3: Install Dependencies & Start Services

You will need to open separate terminal windows for each service.

**1. API Gateway (Node.js)**
```bash
cd api-gateway
npm install
npm run dev
```

**2. User Service (Node.js)**
```bash
cd user-service
npm install
npm run dev
```

**3. Course Service (Node.js)**
```bash
cd course-service
npm install
npm run dev
```

**4. Exam Service (C# .NET Core)**
```bash
cd exam-service
dotnet restore
dotnet run
```

---

## 🛠 Testing the System
Once everything is up and running, you can test the end-to-end routing through the API Gateway at `http://localhost:3000`.

**Ping Test (Routes to Exam Service):**
```bash
curl http://localhost:3000/quizzes/ping
```
*Expected Output: `{"message":"Exam Service is up and running!"}`*

**Register & Login:**
Check out the `POST /auth/register` and `POST /auth/login` endpoints to get your JWT access token. 

Happy coding! 🎉