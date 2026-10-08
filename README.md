# newsroom-lab

An experiment: can [Payload CMS](https://payloadcms.com) (3.x, on Next.js) serve as the **backoffice** for the UA Finance platform?

This project rebuilds a slice of that backoffice in Payload — staff and permissions, customers, subscriptions, and above all **news management** (English/Arabic articles, a SunEditor body editor, linked translations and an audit log) — on its own MongoDB, with placeholder data only. It is a proof of concept, not a production system, and it does not read from or write to any UA Finance database.

## What is in it

- **Staff & access** — staff are the admin login. Roles carry named permissions (`edit_news`, `add_news`, …); the first staff member is made Super Admin automatically.
- **Customers & subscriptions** — users, subscription plans, plan prices and user subscriptions.
- **News management**
  - Articles with tabs for content, taxonomy & tags, SEO, publishing, provenance and AI/enrichment.
  - **English and Arabic**: each article has one language (`lang`). The two versions of a story are separate articles that share a translation group (`uuid`). A sidebar panel can create the other-language draft, link two existing articles, or unlink them; only one article per language is allowed per group.
  - **Body editor**: the same SunEditor setup as the UA Finance backoffice (same toolbar, link `rel` rules, 30,000-character counter, RTL for Arabic), stored as an HTML string and sanitised on save (images stripped, external links get `rel="nofollow"`).
  - **Live Preview**: the eye icon next to Save opens the article rendered as readers would see it (right-to-left for Arabic), updating as you type, before saving. It is a private, staff-only page (`/preview/news/<id>`) and works for saved articles; Mobile, Tablet and Desktop widths are in the toolbar.
  - **Audit log**: an append-only record of creates, edits, status changes and deletes, with before/after values for tracked fields. It is written by hooks and cannot be edited through the API.
  - Categories, topics (with an AI-proposed → approved review flow) and hub chips.
- **Reader comments (proof of concept)** — a demo public news site at `/news`, styled like the live uafinances.com article page, where signed-in readers comment on published articles with one level of replies. Comments appear at once; staff hide or delete them under **News → Comments**. Limits: 3 comments a minute per reader, no repeat posts, 2,000 characters, plain text. The article's "Comments enabled" switch is respected.
- **UA Finance admin theme** — colours, logo and typography ported from the existing backoffice.

## Getting started

**Prerequisites:** Node 20+ and a MongoDB.

1. **Start MongoDB.** Any Mongo works; for example with Docker:

   ```bash
   docker run -d --name payload-mongo -p 27019:27017 mongo:7
   ```

2. **Create your `.env`:**

   ```bash
   cp .env.example .env
   ```

   Then set the two values:

   ```env
   DATABASE_URL=mongodb://127.0.0.1:27019/newsroom-lab
   PAYLOAD_SECRET=any-long-random-string
   ```

3. **Install and run:**

   ```bash
   npm install
   npm run dev
   ```

   Open http://localhost:3000/admin (use `npm run dev -- --port 3100` if 3000 is taken). Only one dev server can run per project at a time.

4. **Create your admin account.** The first screen asks for email, password and name. Your role (Super Admin) and department are assigned automatically.

5. **Optional — load sample data:**

   ```bash
   npm run seed:news
   ```

   This adds 6 categories, 8 topics, 5 hub chips and 13 placeholder articles (9 English, 4 Arabic, some linked as translations), written as your staff account so the audit log has real history. It is safe to re-run.

6. **Optional — try reader comments:**

   ```bash
   npm run seed:comments
   ```

   This adds 3 demo readers and a few comments on published articles. Open http://localhost:3000/news, pick an article and sign in as `sara@demo-reader.test`.

   > The demo sign-in takes only a customer's email, with no password: customer login lives in the UA Finance public API, which this playground does not have. It works in development only (or with `COMMENTS_DEMO_SIGNIN=true`) and must never be used for real.

> The repo is set up with npm (`package-lock.json`). Some template leftovers mention pnpm (`engines`, the `test` script and `docker-compose.yml`); use the npm commands below.

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | MongoDB connection string. |
| `PAYLOAD_SECRET` | yes | Secret used to sign sessions. |
| `NEXT_PUBLIC_ARTICLE_MAX_CHAR_COUNT` | no | Body character limit (default `30000`). Shared by the editor and server validation. |
| `NEXT_PUBLIC_SERVER_URL` | no | Public origin of this app (for example `https://cms.example.com`), used to build the Live Preview address. Leave unset locally: it is taken from the request, so any port works. |
| `PUBLIC_BASE_DOMAIN` | no | Domain treated as internal when normalising article links (default `uafinances.com`). |
| `COMMENTS_DEMO_SIGNIN` | no | Set to `true` to allow the passwordless demo reader sign-in outside development. Leave unset. |
| `AUDIT_LOG_AUTHORIZED_USERS_EMAILS` | no | Comma-separated emails allowed to read audit logs, in addition to Super Admins and the `view_audit_logs` permission. |

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server. |
| `npm run build` / `npm start` | Production build and server. |
| `npm run seed:news` | Load the sample news data (idempotent). |
| `npm run seed:comments` | Load demo readers and comments (run `seed:news` first; idempotent). |
| `npm run generate:types` | Regenerate `src/payload-types.ts` after changing collections. |
| `npm run generate:importmap` | Regenerate the admin import map after adding custom components. |
| `npm run test:int` | Run the Vitest suite. |
| `npm run lint` | ESLint. |

To run your own one-off script against the local API, use `npx payload run path/to/script.ts` (see `scripts/seed-news.ts`).

## Collections

| Group | Collections |
|---|---|
| Staff Management | `staff` (the admin login), `roles`, `permissions`, `staff-departments` |
| Customers | `users` (customer records — customer login is not handled here) |
| Site Setup | `languages` |
| Subscriptions | `products` (plans), `billing-products` (plan prices), `user-subscriptions` |
| News | `news`, `comments`, `news-categories`, `news-topics`, `news-hub-chips`, `article-audit-logs` |
| Uploads | `media` (with 320px and 640px image sizes) |

Data is stored in the MongoDB you point `DATABASE_URL` at; each collection slug is a Mongo collection. Field names are camelCase (`mainCategory`, `scheduleTime`), which differs from the snake_case used by the existing UA Finance database.

## Project structure

```
src/
  collections/          Collection configs (+ newsTranslations.ts: translation endpoints)
  fields/articleBody/   SunEditor field, ported editor patches, HTML sanitiser, options
  audit/                Article audit helper and hooks
  access/               Permission and role access helpers
  components/admin/     Admin UI: logo, audit-history and comments links, translations panel
  comments/             Comment rules, thread listing and the demo reader sign-in
  app/(payload)/        Admin, API routes and the admin theme (custom.scss)
  app/(preview)/        Staff-only Live Preview page
  app/(site)/           Demo public news pages with reader comments
scripts/seed-news.ts    Sample news data
scripts/seed-comments.ts  Demo readers and comments
tests/int/              Vitest tests (editor patches, sanitiser, translations, preview, comments)
```

## How a few things work

- **Permissions.** Super Admins can do everything. Other staff need a role whose permissions include the relevant names (`add_news`, `edit_news`, `delete_news`, `view_all_news`, `view_audit_logs`, `view_comments`, `moderate_comments`, and the news-category ones). They are created on first start; assign them to roles in the admin.
- **Audit log.** Hooks on `news` diff the tracked fields on every save. Changing an article's translation group (`uuid`) — i.e. linking or unlinking a translation — is recorded too. Audit failures are logged but never block a save.
- **Body field.** `articleBodyField()` (`src/fields/articleBody/index.ts`) is reusable for other collections. The sanitiser in `src/fields/articleBody/sanitize/` is a copy of the UA Finance API's `prepareArticleBodyHtml`; keep the two in sync if the original changes.

## Tests

```bash
npm run test:int
```

66 tests cover the ported editor patches, the sanitiser and link rules, the field's validation and options, the translation helper, the Live Preview address and HTML cleaner, and the reader comment rules. The comment tests use the database in `.env` and remove what they create. The Playwright tests in `tests/e2e` are the untouched template ones and have not been updated for this project.

## Not built (yet)

- Scheduled publishing, push notifications, cache clearing and enrichment — the fields exist, but nothing acts on them.
- The AI newsroom screens (RSS feeds, suggestion queue, AI audit reports) and the enrichment review screen.
- Blog, FAQ, tickets and the other backoffice sections.
- A public frontend that uses the translation links (for example a "read in Arabic" switch).
- Customer authentication (the comments demo uses a passwordless stand-in), billing integration and payments.
- Visual checks of the editor in dark mode, and handling for articles already longer than the 30,000-character limit.

## Notes

- All article content and sample data in this repo is placeholder text.
- The UA Finance logo and favicon in `public/` come from the company's backoffice and are used for the admin theme.
- Built from the Payload blank template (MIT).
