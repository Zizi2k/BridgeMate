# BridgeMate API

Base: `/api`. Success: `{data: ...}`; error: `{error: {code: ...}}`. Mutations accept JSON and enforce same-origin browser requests. Sessions use HttpOnly SameSite cookies.

| Method | Endpoint | Purpose |
|---|---|---|
| GET | /health | Service health |
| GET | /auth/me | Session account or null |
| POST | /auth/register | name, email, password |
| POST | /auth/login | email, password |
| POST | /auth/logout | End current session |
| POST | /auth/demo | Create a personal fictional workspace |
| GET/POST | /teams | List own teams / create name, description |
| POST | /teams/join | Join using invite |
| GET | /teams/:id | Team details; membership required |
| GET | /teams/:id/members | Member profiles |
| GET/POST | /teams/:id/tasks | List/create task |
| GET/PATCH | /tasks/:id | Read/update task |
| POST | /tasks/:id/understandings | Assignee submits content |
| PATCH | /understandings/:id/review | Creator/owner reviews status, feedback |
| POST | /tasks/:id/comments | Submit content |
| GET | /phrases | 30 bilingual phrases and categories |
| GET | /quiz | Questions without answers; own recent attempts |
| POST | /quiz | Submit answers array; receive score and explanations |

Task creation requires title, description, deliverable, assigneeId, dueAt (ISO date), priority (low/medium/high). Status values: todo/progress/done. Understanding values: submitted/confirmed/clarify; pending is derived when no current-version submission exists. Review requires feedback for clarify. Material edits to title, description, deliverable, assignee or deadline invalidate current confirmation by incrementing task.version. Prior submissions remain immutable history except for their one review.

## AI endpoints

GET /api/ai/status returns configured/dailyLimit for signed-in users. POST /api/ai/assist accepts action (translate, simplify, polite, summarize, checklist, ask), text, targetLanguage (en/vi), optional context and taskId. A taskId requires membership in its team. Results are plain text; no task/comment mutations occur. Missing server configuration returns AI_NOT_CONFIGURED. Per-account minute/day quotas are reserved transactionally in ai_usage before contacting OpenAI.
