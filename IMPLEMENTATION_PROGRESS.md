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

## Completed in the verification/completion pass (all 12 review items)
- **DB-backed email template editor** (§2): `src/lib/reminders/email-templates.ts`
  (`AppSetting("email_templates")` overrides + `renderTemplate` with `{{var}}` substitution,
  HTML-escaping of scalars, RAW fragment allow-list, disabled-template + blank-field fallback).
  APIs under `/api/admin/email-templates` (list/get/put/preview/test/reset). Editor page
  `src/app/admin/email-templates/page.tsx` (subject/HTML/text editors, variable reference,
  sandboxed preview, send test, restore default, enable/disable). The engine
  (`emails.ts` → `processor.ts`/`notify.ts`) renders via these templates.
- **Certificate upload** (§3): wired into `vaccination-manager.tsx` (add/edit/complete) via the
  existing `/api/upload` + `Asset` system (2 MB, PDF/JPG/PNG/WebP, server-side MIME + ownership).
  View/replace/remove supported; stored as `certificate_asset_id` + `certificate_path`.
- **Automated tests** (§4/§17): Vitest suites in `src/__tests__/` (26 tests): dates (age, next
  birthday, Feb-29 feb28+mar1, IST midnight boundary), status derivation (all 6), reminder
  idempotency + retry + double-fire, template rendering/escaping/fallback/disabled, permissions
  (own vs other pet, admin), CRUD validation + serialization. `npm test` runs them; GHA CI in
  `.github/workflows/ci.yml` runs prisma validate/generate + lint + test + build.
- **Legacy `ClientRecord` migration** (§5): `scripts/migrate-client-record-reminders.ts` REWRITTEN
  with a STRICT date parser — never guesses DD/MM vs MM/DD, rejects yearless strings, reports
  ambiguous/invalid, handles `pet_birthday` → `Pet.dob`, writes a JSON report to
  `scripts/reports/`. NOTE: the legacy vaccine columns are yearless ("Mar 01") / junk, so the
  strict parser correctly imports **0** rows (inventing a year is forbidden). A prior broken run
  had written 827 fabricated year-1999/2001 records to the live DB; these were backed up to
  `scripts/reports/deleted-clientrecord-vaccinations-*.json` and deleted. `PetVaccination` is clean.
- **Overdue count** (§6): `processor.ts` now computes real `birthdaysToday/next7`,
  `vaccinationsDueToday/next7`, `vaccinationsOverdue` and passes them to the summary email.
- **Mobile admin pet view** (§7): the vaccination manager + DOB input now render in BOTH the
  desktop table row and the mobile card in `admin/pets`.
- **Dashboard filters** (§8): `/api/admin/reminders/deliveries` supports type, status, date range,
  petId, clientId, vaccineType, and free-text `q` (pet/owner/email/phone/vaccine) — all
  server-side. The admin reminders page exposes search + all filters and persists them in the URL.
- **Cron/email readiness** (§10): cron route is Node runtime, `CRON_SECRET`-enforced (401 without
  it), retry capped at 3, idempotent unique key. Production is a **VPS (CyberPanel), not Vercel**,
  so `vercel.json` is inert there; the daily job runs via an OS crontab entry (03:30 UTC = 09:00
  IST). The pre-existing `/api/cron/bookings` is NOT scheduled on the VPS crontab and is unrelated
  to this feature — intentionally left untouched (adding it to `vercel.json` would do nothing on
  the VPS and could double-trigger if an external scheduler already calls it). Flagged for the owner.

## Production DB state (live MongoDB)
- Schema synced via `prisma db push` (collections + `ReminderDelivery.reminder_key` unique index).
- `PetVaccination`: 0 rows (garbage import removed; strict re-migration imports 0 by design).
- `Pet.dob`: 808 pets — pre-existing app data, untouched.

