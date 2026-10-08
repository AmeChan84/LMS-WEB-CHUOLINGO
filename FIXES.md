# Chuolingo LMS — Corrected Build

This archive contains a corrected version of the uploaded project.

## Fixed
- Repaired malformed TypeScript in student assignment/settings and teacher analytics pages.
- Repaired the AI prompt template literal that contained an unescaped markdown fence.
- Aligned Prisma relation usage with the schema (`enrollments`).
- Aligned `LessonFile` usage with Prisma fields (`fileSizeBytes`, `storageBucket`).
- Added the missing `bcryptjs` dependency used by fallback authentication.
- Updated React/React DOM from the old React 19 release candidate to stable React 19.0.0.
- Updated Next 15 server cookie handling to use async `cookies()` access.
- Fixed Supabase registration so a newly created account also receives an authenticated session.
- Fixed local Prisma/bcrypt authentication so it works when Supabase is not configured.
- Fixed storage download authorization so authenticated students are not incorrectly redirected to teacher pages.
- Protected the AI generation endpoint with teacher authentication.
- Added the missing teacher lesson edit route and editor.
- Added a teacher-ownership check when changing a lesson's class.

## Verification
- TypeScript parser/syntax check: passed (no TS1005/TS1002/TS1128/TS1136/TS1109/TS1160 parser errors).
- Full `npm install` / `next build` could not be completed in the repair environment because npm registry dependency downloads timed out.

## Run locally
1. Extract the ZIP.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local` and configure PostgreSQL/Supabase/OpenAI as needed.
4. Run `npm run db:generate`.
5. For a configured database, run `npm run db:push` (or migrations if you have them).
6. Run `npm run dev`.

For local demo authentication without Supabase, provide `DATABASE_URL` and leave the Supabase variables at their placeholder values; the app will use the Prisma+bcrypt fallback.
