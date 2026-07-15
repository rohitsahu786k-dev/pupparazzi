This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open the running app URL in your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Pet Birthday & Vaccination Reminders

Automatic professional email reminders for pet birthdays and vaccination/treatment due
dates. Full docs: [`docs/PET_REMINDER_SYSTEM.md`](docs/PET_REMINDER_SYSTEM.md). Continuation
notes: [`IMPLEMENTATION_PROGRESS.md`](IMPLEMENTATION_PROGRESS.md).

### Environment variables

Copy `.env.example` to `.env` and fill in the values. Reminder-specific keys: `APP_URL`,
`APP_TIMEZONE` (default `Asia/Kolkata`), `APP_LOGO_URL`, `APP_SUPPORT_EMAIL`,
`APP_SUPPORT_PHONE`, `CRON_SECRET`, `REMINDER_ADMIN_EMAIL`, plus the `SMTP_*` block.

### Sync the schema (MongoDB + Prisma)

```bash
npx prisma generate      # regenerate the client (adds PetVaccination, ReminderDelivery)
npx prisma db push       # sync new collections/indexes to MongoDB
```

### Backfill legacy vaccination dates

```bash
npx tsx scripts/migrate-pet-vaccinations.ts           # dry run (no writes)
npx tsx scripts/migrate-pet-vaccinations.ts --apply   # write PetVaccination records
```

### Cron setup

`vercel.json` runs `/api/cron/reminders` daily at `30 3 * * *` UTC (09:00 IST). When
`CRON_SECRET` is set, callers must send `Authorization: Bearer <CRON_SECRET>`. Admins can
also trigger a run from **Admin → Reminders → Run reminders now**.

### Email templates / test emails

Reminder templates are typed defaults in `src/lib/reminders/emails.ts`. Send a test copy of a
vaccination reminder from the pet profile (staff/admin: the **Test** action). Verify SMTP via
**Admin → Settings → Test email**.

### Troubleshooting

- **No emails sent:** check SMTP settings (Admin → Settings) and that reminders are enabled;
  inspect **Admin → Reminders → Delivery history** for `Failed` rows and their error text.
- **Wrong "today"/timezone:** set `APP_TIMEZONE` and the Business timezone in reminder settings;
  the system never uses the browser or server-local time.
- **Duplicate concern:** deliveries are idempotent per `reminder_key`; a re-run is safe.
