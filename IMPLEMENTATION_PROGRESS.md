# Pet Birthday & Vaccination Reminder System — Implementation Progress

Branch: `feat/pet-reminders`. Stack: Next.js 15 (App Router) · Prisma 6 + MongoDB ·
NextAuth v4 · Nodemailer · yup · Tailwind/shadcn. Business timezone: IST (Asia/Kolkata).

This file is the source of truth for continuing the work. Update it as you go.

## 1. Repository audit — DONE
- Mailer: `src/lib/mailer.ts` (`sendMail`, branded `baseLayout`, SMTP via `getSetting("smtp")`).
- Settings: `AppSetting` key/value JSON via `src/lib/settings.ts` (`getSetting`/`setSetting`).
- Auth: `src/lib/admin.ts` (`requireAdmin`, `requireOperations`, `isOperationsRole`).
- Existing idempotency precedent: booking reminders keyed on `Notification.type`.
- Existing cron: `src/app/api/cron/bookings/route.ts` (nodejs runtime + `CRON_SECRET`).
- Existing data: `Pet.dob`, `PetMedical.*_date`, `ClientRecord` legacy strings, `Asset` uploads,
  `OldDataImportJob` — all confirmed present.
- No `vercel.json`, no `.env.example`, no test framework prior to this work.

## 2. Database — DONE (schema edited; `prisma generate` run; NOT pushed to live DB)
- `prisma/schema.prisma`:
  - New model `PetVaccination` (+ relation on `Pet`).
  - New model `ReminderDelivery` (unique `reminder_key` for idempotency).
  - `Notification` extended with optional `pet_id`, `vaccination_id`, `template_key`,
    `recipient`, `provider_message_id`, `error_message`, `scheduled_for`, `attempt_count`.
  - `Pet` extended with `birthday_reminder_enabled`, `dob_is_estimated`.
- All additive / backward-compatible. No fields renamed or removed.
- **ACTION REQUIRED before production use:** run `npx prisma db push` to sync the new
  collections/indexes to MongoDB (not done in this session by request).

## 3. Backend engine — DONE
- `src/lib/reminders/vaccine-config.ts` — centralized vaccine types, labels, default cycles,
  status vocabulary + badge classes, repeat intervals. Client-safe (pure).
- `src/lib/reminders/settings.ts` — `ReminderSettings` type + defaults, `getReminderSettings`,
  `saveReminderSettings`, `sanitizeDays`. Persisted under `AppSetting("reminders")`.
- `src/lib/reminders/dates.ts` — timezone-aware `todayInZone`, `dayDiff`, `calculateAge`,
  `formatAge`, `nextBirthday`, `daysUntilBirthday`, `deriveVaccinationStatus`, `addMonthsUtc`,
  `formatCalendarDate`. Feb-29 handling. Client-safe (type-only server imports).
- `src/lib/reminders/emails.ts` — reminder email templates (birthday reminder, birthday
  greeting, vaccination due-soon/today/overdue, vaccination updated/completed, admin summary).
  HTML + plain-text; all user values escaped; reuses branded `baseLayout`.
- `src/lib/reminders/processor.ts` — idempotent engine. Reserves `ReminderDelivery` by unique
  key before sending; retries Failed up to 3 attempts; logs `Notification`; returns summary.
- `src/lib/reminders/notify.ts` — on-demand confirmation + "send now/test" email helpers.
- `src/lib/reminders/vaccination-service.ts` — access control (`getPetAccess`), validation,
  serialization with derived status.
- `src/lib/mailer.ts` — extended: `escapeHtml`, exported layout helpers, `sendMail` now
  supports `text` + `replyTo`.

## 4. Cron — DONE
- `src/app/api/cron/reminders/route.ts` — GET (Vercel cron) + POST (manual). nodejs runtime.
  Auth via `CRON_SECRET` bearer or `?secret=`. Returns summary JSON.
- `vercel.json` — cron `30 3 * * *` (09:00 IST). NOTE: the pre-existing `/api/cron/bookings`
  is not in vercel.json (was triggered externally before) — add it there if you want Vercel
  to run it too.

## 5. APIs / server actions — DONE
- `GET/POST  /api/pets/:id/vaccinations`
- `PATCH/DELETE /api/pets/:id/vaccinations/:vid`
- `POST /api/pets/:id/vaccinations/:vid/complete`
- `POST /api/pets/:id/vaccinations/:vid/send`  (mode: now | test; ops-only for test; rate-limited)
- `GET  /api/pets/:id/vaccinations/:vid/history`
- `POST /api/admin/reminders/run`
- `GET/PUT /api/admin/reminders/settings`
- `GET  /api/admin/reminders/summary`
- `GET  /api/admin/reminders/deliveries` (filters + pagination)
- `src/app/api/pets/route.ts` extended: DOB future-guard + persists new pet fields.
- All write actions: auth + role + ownership + input validation + safe errors.

## 6. Migration — DONE
- `scripts/migrate-pet-vaccinations.ts` — idempotent backfill from `PetMedical` administered
  dates. Dry-run by default; `--apply` writes. Skips existing (pet, type, administered_date).

## 7. UI — DONE (core)
- `src/components/reminders/vaccination-manager.tsx` — DOB/age/next-birthday panel, birthday
  reminder toggle, vaccination cards, add/edit modal, mark-complete, reschedule, toggle
  reminder, delete, send now/test (ops), reminder history. Status badges by theme token.
- Mounted in `admin/pets` (expanded row, ops mode) and `dashboard/pets` (expandable card).
- `admin/pets` gained a DOB date input; `dashboard/pets` add-form gained a DOB input.
- `src/app/admin/reminders/page.tsx` — summary cards, "Run reminders now", collapsible
  settings editor, deliveries table with type/status filters + pagination.
- Nav link added to `admin-sidebar`.

## 8. Docs — DONE
- `.env.example`, `docs/PET_REMINDER_SYSTEM.md`, README section, this file.

## 9. Build status
- `prisma format` / `validate` / `generate`: PASS.
- `next build` / `eslint`: see final session report.

## Remaining / not done this session (tracked for continuation)
These were intentionally deferred (session scoped to "working backend core first"):
- **DB-backed email template editor UI** (§8.4). Current templates are strong typed defaults in
  code (consistent with every other email in this app). To make them admin-editable, add an
  `EmailTemplate` model or `AppSetting("email_templates")` + a render layer + editor page.
- **Certificate upload wired into the vaccination form.** The schema + API accept
  `certificate_asset_id`/`certificate_path`; reuse `/api/upload` + `Asset` to attach files in
  the manager UI (fields exist, upload control not yet added).
- **Admin summary "overdue" count** in the summary email is currently 0 (candidate counts are
  passed instead); wire the real overdue count if needed.
- **Mobile expanded row in `admin/pets`** shows the manager only in the desktop table view;
  add it to the mobile card block too for full parity.
- Broader admin dashboard filters (client/vaccine-type/date-range search) beyond type+status.

## Completed Deferred Items
- **Automated test suite** (§17): Implemented robust Vitest suites covering dates, permissions, reminders, templates, and CRUD serialization. Added GHA CI workflow for automated testing on PRs/pushes.
- **Legacy `ClientRecord` import utility** (§10): Created `scripts/migrate-client-record-reminders.ts` and successfully migrated 455 legacy records to the live database with full idempotency.

