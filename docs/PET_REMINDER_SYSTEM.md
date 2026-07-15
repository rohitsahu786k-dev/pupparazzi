# Pet Birthday & Vaccination Reminder System

Automatic, professional email reminders for pet birthdays and vaccination/treatment
due dates, integrated into the existing Pupparazzi app (Next.js 15 · Prisma + MongoDB ·
NextAuth · Nodemailer). All dates are handled in the configured business timezone
(default `Asia/Kolkata`).

## Architecture

```
Daily Vercel cron ─┐
Admin "Run now"  ─┼─▶ runReminderProcessor()  ──▶ reserve ReminderDelivery (unique key)
                   │        │                          │ (P2002 → skip / retry Failed)
                   │        ├─ birthdays (Pet.dob)     ▼
                   │        └─ vaccinations            sendMail() ──▶ SMTP (Nodemailer)
                   │           (PetVaccination)         │
                   │                                    ├─ update ReminderDelivery (Sent/Failed)
                   │                                    └─ create Notification (in-app)
```

- **Server-only**: the processor + all email code run in the Node.js runtime.
- **Idempotent**: every reminder has a deterministic `reminder_key`; the row is reserved
  atomically before sending, so double-fires and concurrent runs never duplicate a send.

## Data models (`prisma/schema.prisma`)

- **`PetVaccination`** — one vaccination/treatment cycle. Authoritative `next_due_date`.
  `reminder_days_json` optionally overrides the global schedule per record.
- **`ReminderDelivery`** — idempotent delivery ledger. `reminder_key` is `@unique`.
- **`Notification`** — extended with `pet_id`, `vaccination_id`, `template_key`, `recipient`,
  `provider_message_id`, `error_message`, `scheduled_for`, `attempt_count` (all optional).
- **`Pet`** — extended with `birthday_reminder_enabled`, `dob_is_estimated`.

Email templates are typed defaults in code (`src/lib/reminders/emails.ts`), consistent with
every other transactional email in this app (`src/lib/mailer.ts`).

## Reminder schedules (admin-configurable → `AppSetting("reminders")`)

- Birthday (days before): `7, 1, 0` — day 0 sends a greeting when enabled.
- Vaccination (days before due): `30, 14, 7, 3, 1, 0`.
- Vaccination overdue (days after due): `3, 7`.
- Due-soon threshold: `30` days. Feb-29 birthdays: `feb28` (default) or `mar1`.

## Status derivation

Status is always derived from dates at read time (never a stale stored value):
`Upcoming` (> threshold) · `Due Soon` (≤ threshold) · `Due Today` (=0) · `Overdue` (<0) ·
`Completed` (completed with no live follow-up) · `Disabled` (reminder off).

## API routes

| Method | Path | Purpose |
|---|---|---|
| GET/POST | `/api/pets/:id/vaccinations` | list / create |
| PATCH/DELETE | `/api/pets/:id/vaccinations/:vid` | edit·reschedule·toggle / delete |
| POST | `/api/pets/:id/vaccinations/:vid/complete` | mark completed (+ optional next cycle) |
| POST | `/api/pets/:id/vaccinations/:vid/send` | send now / send test (ops) |
| GET | `/api/pets/:id/vaccinations/:vid/history` | reminder delivery history |
| GET | `/api/cron/reminders` | daily processor (Vercel cron / CRON_SECRET) |
| POST | `/api/admin/reminders/run` | manual run (admin) |
| GET/PUT | `/api/admin/reminders/settings` | reminder settings |
| GET | `/api/admin/reminders/summary` | dashboard counters |
| GET | `/api/admin/reminders/deliveries` | delivery history (filters + pagination) |

Every write action enforces authentication, role authorization, ownership (a client can
only touch their own pet), input validation, and safe errors.

## Cron processing flow

1. Vercel invokes `GET /api/cron/reminders` at `30 3 * * *` UTC (= 09:00 IST) — see `vercel.json`.
2. When `CRON_SECRET` is set, callers must send `Authorization: Bearer <secret>` (or `?secret=`).
3. The processor resolves "today" in the business timezone, scans birthdays + vaccinations,
   reserves and sends due reminders, and returns a summary:
   `{ success, birthdayCandidates, vaccinationCandidates, sent, skipped, failed }`.

## Security decisions

- SMTP credentials are server-only (env + `AppSetting("smtp")`); never in the client bundle.
- Cron authenticated by `CRON_SECRET`; unauthorized calls rejected (401).
- All user-supplied values are HTML-escaped in emails (`escapeHtml`).
- Ownership enforced server-side via `getPetAccess`; test-email restricted to staff/admin.
- Send-now / test are rate-limited per warm instance.
- No permanent-error retry storms: Failed deliveries retry at most 3 times.

## Admin workflow

Admin → **Reminders**: view summary cards, edit schedules/settings, run the processor
manually, and inspect the delivery history (filter by type/status). Per-pet vaccination
management lives on the pet profile (Admin → Pets → expand a pet).

## Client workflow

Dashboard → **My Pets** → expand a pet: see age + next birthday, toggle birthday reminders,
and manage vaccination records (add, edit, mark complete, reschedule, view history).

## Migration / backfill

`npx tsx scripts/migrate-pet-vaccinations.ts` (dry run) → `--apply` to write. Idempotently
converts `PetMedical` administered dates into `PetVaccination` records; existing records are
never duplicated and legacy data is never modified.

## Rollback

The change is additive. To roll back: remove the cron entry from `vercel.json`, disable
reminders in Admin → Reminders, and (optionally) drop the new `PetVaccination` /
`ReminderDelivery` collections. Existing `Pet` / `PetMedical` data is untouched.
