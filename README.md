# ShowUp HTX

Type your address and see every local government that affects you (school board, city council, commissioners court, flood control, and your utility district), what each one is deciding next, and how to be heard.

- **Live site:** https://showup-htx-six.vercel.app
- **App code:** the repo root (Next.js 16, Supabase, Tailwind, shadcn/ui), built from `Technical_Implementation_Plan.md`
- **Plans:** `Project_Plan.md` (what and why), `Technical_Implementation_Plan.md` (how), `.plans/` (part specs)
- **Design system and contribution rules:** [`DESIGN.md`](DESIGN.md). Read it before you change any UI.

## Run locally

Requires Node 22 or later.

```bash
npm install
cp .env.example .env.local   # then ask P5 for the secret values
npm run dev                  # http://localhost:3000
npm test                     # unit tests (no network)
```

`web/` is an earlier test prototype with sample data. It isn't the app and isn't deployed from this repo.
