# 🍒 Buqata Portal – Developer Setup Guide

Farmer & tourism portal for Buqata, Golan Heights.  
Stack: **HTML/JS → GitHub → Vercel → Supabase**

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Step 1 – GitHub Setup](#step-1--github-setup)
4. [Step 2 – Supabase Setup](#step-2--supabase-setup)
5. [Step 3 – Vercel Hosting + CI/CD](#step-3--vercel-hosting--cicd)
6. [Step 4 – Connect Supabase to the Frontend](#step-4--connect-supabase-to-the-frontend)
7. [Database Schema](#database-schema)
8. [Environment Variables](#environment-variables)
9. [Local Development](#local-development)
10. [Deployment Flow](#deployment-flow)
11. [Roadmap](#roadmap)

---

## Architecture Overview

```
User (Mobile / Browser)
        │
        ▼
  Vercel (Hosting)
  buqata-portal.vercel.app
        │
        ▼
  HTML + Vanilla JS  ◄──────────────────┐
        │                               │
        ▼                               │
  Supabase                         GitHub Repo
  ├── Auth  (phone OTP / email)    (source of truth)
  ├── PostgreSQL DB (farms, users)      │
  └── Storage (farm photos)            │
                                   Vercel CI/CD
                                (auto-deploy on push)
```

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Git | any | [git-scm.com](https://git-scm.com) |
| Node.js | 18+ | [nodejs.org](https://nodejs.org) |
| GitHub account | free | [github.com](https://github.com) |
| Supabase account | free | [supabase.com](https://supabase.com) |
| Vercel account | free | [vercel.com](https://vercel.com) |

---

## Step 1 – GitHub Setup

### 1.1 Create the repository

```bash
# On GitHub: New repository → name: buqata-portal → Public or Private

# Locally:
git init buqata-portal
cd buqata-portal

# Copy your buqata-portal.html into this folder, then:
git add .
git commit -m "initial commit: portal HTML"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/buqata-portal.git
git push -u origin main
```

### 1.2 Recommended folder structure

```
buqata-portal/
├── index.html          ← your portal (rename buqata-portal.html → index.html)
├── .env.local          ← secrets (never commit this!)
├── .gitignore
└── README.md
```

### 1.3 Create `.gitignore`

```
.env
.env.local
.env*.local
node_modules/
.DS_Store
```

---

## Step 2 – Supabase Setup

### 2.1 Create a project

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Name: `buqata-portal`
3. Choose a strong database password (save it!)
4. Region: **EU West** (closest to Israel)

### 2.2 Enable Phone Auth (OTP for farmers)

```
Supabase Dashboard
  → Authentication
  → Providers
  → Phone → Enable
```

> For SMS in Israel, connect **Twilio** or use email OTP as a simpler alternative.

### 2.3 Create the database tables

Go to **SQL Editor** in Supabase and run the schema below (see [Database Schema](#database-schema)).

### 2.4 Get your API keys

```
Supabase Dashboard → Settings → API

Copy:
  - Project URL     → SUPABASE_URL
  - anon/public key → SUPABASE_ANON_KEY
```

---

## Step 3 – Vercel Hosting + CI/CD

### 3.1 Deploy from GitHub (one-time setup)

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your `buqata-portal` GitHub repository
3. Framework Preset: **Other** (plain HTML)
4. Root Directory: `/` (default)
5. Click **Deploy**

Your site is live at: `buqata-portal.vercel.app` ✅

### 3.2 Add environment variables in Vercel

```
Vercel Dashboard → Your Project → Settings → Environment Variables

Add:
  SUPABASE_URL        = https://xxxx.supabase.co
  SUPABASE_ANON_KEY   = your-anon-key
```

### 3.3 Custom domain (optional)

```
Vercel → Settings → Domains → Add: buqata.co.il
```
Then update your DNS records at your registrar.

### 3.4 How CI/CD works (automatic)

```bash
# Every time you push to main:
git add .
git commit -m "update farm card design"
git push

# Vercel detects the push → builds → deploys in ~30 seconds
# No manual steps needed ✅
```

**Preview deployments** – every branch / pull request gets its own URL:
```
feat/new-map  →  buqata-portal-git-feat-new-map.vercel.app
```

---

## Step 4 – Connect Supabase to the Frontend

Add this inside your `index.html` before `</body>`:

```html
<!-- Supabase JS SDK -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

<script>
  const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';
  const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';

  const { createClient } = supabase;
  const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // ── Load farms from DB ──
  async function loadFarms() {
    const { data, error } = await db
      .from('farms')
      .select('*')
      .eq('approved', true)
      .order('created_at', { ascending: false });

    if (error) { console.error(error); return; }
    renderFarms(data);
  }

  // ── Submit registration form ──
  async function handleSubmit() {
    const farm = {
      name:    document.getElementById('farm-name').value,
      owner:   document.getElementById('owner-name').value,
      village: document.getElementById('village').value,
      phone:   document.getElementById('phone').value,
      hours:   document.getElementById('hours').value,
      price:   document.getElementById('price').value,
      type:    document.getElementById('farm-type').value,
      description: document.getElementById('description').value,
      approved: false   // admin must approve first
    };

    const { error } = await db.from('farms').insert([farm]);

    if (error) {
      alert('שגיאה בשליחה. אנא נסו שנית.');
      console.error(error);
    } else {
      alert('✅ תודה! בקשת הרישום התקבלה.\nניצור קשר בתוך 24 שעות.');
    }
  }

  // Load farms when page opens
  loadFarms();
</script>
```

---

## Database Schema

Run this SQL in **Supabase → SQL Editor**:

```sql
-- Farms / orchards
CREATE TABLE farms (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name        text NOT NULL,
  owner       text NOT NULL,
  village     text NOT NULL DEFAULT 'בוקאתא',
  phone       text NOT NULL,
  hours       text,
  price       text,
  type        text,        -- 'self-pick', 'sale', 'cafe', etc.
  description text,
  photo_url   text,        -- Supabase Storage URL
  approved    boolean DEFAULT false,
  open        boolean DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE farms ENABLE ROW LEVEL SECURITY;

-- Anyone can read approved farms
CREATE POLICY "public read approved farms"
  ON farms FOR SELECT
  USING (approved = true);

-- Anyone can submit a registration (insert)
CREATE POLICY "public insert farms"
  ON farms FOR INSERT
  WITH CHECK (true);

-- Only admins can approve/update
CREATE POLICY "admin update farms"
  ON farms FOR UPDATE
  USING (auth.role() = 'authenticated');
```

---

## Environment Variables

| Variable | Where to get it | Used in |
|----------|----------------|---------|
| `SUPABASE_URL` | Supabase → Settings → API | Frontend JS |
| `SUPABASE_ANON_KEY` | Supabase → Settings → API | Frontend JS |

> ⚠️ Never commit these to GitHub. Add them in Vercel's dashboard.

---

## Local Development

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/buqata-portal.git
cd buqata-portal

# Create local env file
cp .env.example .env.local
# Fill in your Supabase keys

# Serve locally (no build step needed for plain HTML)
npx serve .
# → open http://localhost:3000
```

---

## Deployment Flow

```
┌─────────────────────────────────────────────────────┐
│                  DAILY WORKFLOW                      │
│                                                     │
│  1. Edit index.html locally                         │
│  2. git add . && git commit -m "your message"       │
│  3. git push                                        │
│  4. Vercel auto-deploys → live in ~30 seconds ✅    │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│               NEW FEATURE WORKFLOW                   │
│                                                     │
│  1. git checkout -b feat/new-map                    │
│  2. Make changes                                    │
│  3. git push origin feat/new-map                    │
│  4. Vercel creates preview URL to test              │
│  5. Merge to main → auto-deploys to production ✅   │
└─────────────────────────────────────────────────────┘
```

---

## Roadmap

### Phase 1 – MVP (now)
- [x] Static portal HTML
- [ ] GitHub repo + Vercel deploy
- [ ] Supabase DB + registration form connected
- [ ] Admin approval flow (simple Supabase dashboard)

### Phase 2 – Season Features
- [ ] WhatsApp click-to-chat links per farm
- [ ] Google Maps embed per farm
- [ ] Farm photo upload (Supabase Storage)
- [ ] SMS/OTP login for farmers

### Phase 3 – Growth
- [ ] Arabic + Hebrew full bilingual
- [ ] Tourist-facing search & filter
- [ ] Booking / appointment system
- [ ] Analytics dashboard for farmers

---

## Support

Questions? Open an issue on GitHub or contact the project maintainer.

---

*פורטל בוקאתא – תיירות חקלאית ברמת הגולן · עונת הדובדבנים 2026 🍒*
