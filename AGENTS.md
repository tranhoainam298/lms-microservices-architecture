# Project Agent Instructions

## AI Context Bootstrap

> [!IMPORTANT]
> Future AI agents must read these persistent context files to understand the project architecture, implementation status, sequence status, known gaps, and agent rules before making any changes:
> - [docs/ai-context/AI_CONTEXT_INDEX.md](file:///d:/github%20tool/lms-microservices-architecture/docs/ai-context/AI_CONTEXT_INDEX.md)
> - [docs/ai-context/ARCHITECTURE_CONTRACT.md](file:///d:/github%20tool/lms-microservices-architecture/docs/ai-context/ARCHITECTURE_CONTRACT.md)
> - [docs/ai-context/IMPLEMENTATION_STATUS.md](file:///d:/github%20tool/lms-microservices-architecture/docs/ai-context/IMPLEMENTATION_STATUS.md)
> - [docs/ai-context/SEQUENCE_STATUS.md](file:///d:/github%20tool/lms-microservices-architecture/docs/ai-context/SEQUENCE_STATUS.md)
> - [docs/ai-context/KNOWN_GAPS.md](file:///d:/github%20tool/lms-microservices-architecture/docs/ai-context/KNOWN_GAPS.md)
> - [docs/ai-context/AGENT_WORK_RULES.md](file:///d:/github%20tool/lms-microservices-architecture/docs/ai-context/AGENT_WORK_RULES.md)

This project is the Learning Management System based on Microservices Architecture.

Before doing any task, the agent must first check whether a relevant project skill exists in:

.project-skills/

If a relevant skill exists, the agent must read the skill README, SKILL.md, or main instruction file before making changes.

## Available project skills

Only the following skills are available in this project:

- andrej-karpathy-skills
- rtk-skill

Do not assume or reference any skill that is not listed above.

## Skill usage rules

### rtk-skill

Use this skill only if the task is related to Redux Toolkit, frontend state management, client-side data flow, API state, or React application state structure.

### andrej-karpathy-skills

Use this skill only if the task is related to learning, coding workflow, AI-assisted development practice, implementation strategy, or step-by-step software building guidance.

## If no relevant skill exists

If no relevant skill matches the task, continue without using a skill and clearly state:

No relevant project skill found.

## Safety rules

- Never delete files or folders unless the user explicitly asks.
- Never clean the project directory.
- Never run destructive commands.
- Never touch files outside this project folder:
  D:\github tool\lms-microservices-architecture
- Before modifying many files, explain the planned changes first.
- For now, this project is scaffold-only. Do not implement real business logic unless the user asks.

## Architecture rules

Use only the services and databases defined in the architecture document.

Services:
- API Gateway
- User Service
- Course Service
- Exam & Quiz Service
- Payment Service

Databases:
- User DB
- Course DB
- Exam DB
- Payment DB

External systems:
- Payment Gateway ZaloPay/Momo
- AI Chatbot System

Do not create:
- Reporting DB
- Chatbot DB
- Learning Result DB
- Notification DB
- Enrollment DB
- Extra service outside the document

## Required confirmation before each task

At the beginning of every task, the agent must state:

- Which skill was used
- Which skill file was read
- Which project area will be changed
- Whether any files will be created or modified

If no skill is used, state:

- No relevant project skill found
- No skill file was read
