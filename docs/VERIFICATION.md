# MySQL edition verification

Passed: TypeScript typecheck, 19 unit tests (policy, bilingual content, MySQL configuration and mocked AI transport/prompts), Next.js production build, and JavaScript syntax checks for both database scripts.

The MySQL edition includes nine tables, mysql2 pooling, Vercel pool lifecycle integration, verified TLS configuration, transactions for group/demo creation, a schema SQL file, migration scripts and API integration tests.

No MySQL server or remote database credentials were available in this session. The full MySQL integration suite and the remote Vercel deployment have not been verified. Earlier SQLite/libSQL integration results do not establish MySQL runtime correctness. No existing production data has been migrated.

## AI feature

AI transport and prompt tests use mocked Gemini generateContent and OpenAI Responses API output. No real API key, live provider call, MySQL quota integration test or live Vercel verification was performed. The UI provides a manual copy-prompt/open-ChatGPT fallback; it does not connect a Plus subscription to the API.
