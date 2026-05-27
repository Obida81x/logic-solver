# Deployment Guide

## Architecture

| Layer    | Service  | Source                     |
|----------|----------|----------------------------|
| Frontend | Vercel   | `artifacts/logic-solver/`  |
| Backend  | Render   | `artifacts/api-server/`    |
| Database | Neon     | PostgreSQL (Drizzle ORM)   |

---

## 1 — Neon (Database)

1. Create a project at [neon.tech](https://neon.tech)
2. Copy the **Connection string** — it looks like:  
   `postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require`
3. Set it as `DATABASE_URL` in both Render and Vercel environment variables

---

## 2 — Render (Backend API)

1. Connect your GitHub repo at [render.com](https://render.com) → **New Web Service**
2. Render auto-detects `render.yaml` — click **Apply**
3. Set the following environment variables (marked `sync: false` in render.yaml):

   | Variable                        | Value                                |
   |---------------------------------|--------------------------------------|
   | `DATABASE_URL`                  | Your Neon connection string          |
   | `SESSION_SECRET`                | Any long random string               |
   | `AI_INTEGRATIONS_OPENAI_API_KEY`| Your OpenAI API key (`sk-...`)       |

   > `AI_INTEGRATIONS_OPENAI_BASE_URL` is already set to `https://api.openai.com/v1` in render.yaml.

4. After first deploy, run the DB migration:
   ```
   pnpm --filter @workspace/db run push
   ```
   (or run it as a Render job pointing at the same `DATABASE_URL`)

---

## 3 — Vercel (Frontend)

1. Import the GitHub repo at [vercel.com](https://vercel.com)
2. Vercel reads `vercel.json` automatically — no extra configuration needed
3. Set one environment variable:

   | Variable       | Value                                              |
   |----------------|----------------------------------------------------|
   | `VITE_API_URL` | Your Render service URL, e.g. `https://logic-solver-api.onrender.com` |

   > The app uses relative `/api` paths by default. If your Render domain differs from your Vercel domain, you may need to prefix API calls with `VITE_API_URL`.

4. Add a **rewrite rule** in Vercel project settings (or rely on the one in `vercel.json`):  
   `/(.*) → /index.html`

---

## Local development

```bash
cp .env.example .env
# fill in DATABASE_URL and the OpenAI vars

pnpm install
pnpm --filter @workspace/db run push   # create tables
pnpm --filter @workspace/api-server run dev   # port 8080
pnpm --filter @workspace/logic-solver run dev # port auto
```
