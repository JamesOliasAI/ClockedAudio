# Alpha Launch & Deployment Plan

This document outlines the step-by-step process for deploying "Clocked Audio" (BeatBattlePlatform) to production via Vercel, and a grassroots marketing strategy to onboard your first cohort of alpha testers.

---

## Phase 1: Deployment (GitHub & Vercel)

Before bringing users onto the platform, we need to move the app from your local machine to a live, scalable environment. Vercel is the optimal choice for a Next.js application.

### 1. Version Control (GitHub)
*   **Initialize Git:** Ensure your project is tracked by Git. If not already done, run `git init` in your terminal.
*   **`.gitignore` Check:** Ensure `.env`, `node_modules`, and `.next` are listed in your `.gitignore` file to prevent leaking secrets.
*   **Commit:** Commit all your local changes: `git add .` followed by `git commit -m "Initial commit for Alpha Release"`.
*   **Push to GitHub:** Create a new private repository on GitHub, link it to your local project, and push your code.

### 2. Vercel Hosting Setup
*   **Import Project:** Log into Vercel and click "Add New Project". Connect your GitHub account and import the repository you just created.
*   **Framework Preset:** Vercel will automatically detect that this is a Next.js project. Leave the default build commands as they are.

### 3. Environment Variables Configuration
Before hitting deploy, you must add all your environment variables in the Vercel dashboard. These must match your local `.env.local` file:
*   `NEXT_PUBLIC_SUPABASE_URL`
*   `NEXT_PUBLIC_SUPABASE_ANON_KEY`
*   `SUPABASE_SERVICE_ROLE_KEY` (Critical for backend timer validation and cron jobs)
*   `CLOUDFLARE_R2_ACCESS_KEY_ID`
*   `CLOUDFLARE_R2_SECRET_ACCESS_KEY`
*   `CLOUDFLARE_R2_ENDPOINT`
*   `CLOUDFLARE_R2_BUCKET_NAME`
*   `CLOUDFLARE_R2_PUBLIC_URL` (If you configured a custom subdomain for R2)

*Once these are added, click **Deploy**.*

### 4. Custom Domain Setup
*   In your Vercel project dashboard, go to **Settings > Domains**.
*   Enter your purchased custom domain (e.g., `producersurvival.com`).
*   Vercel will provide you with DNS records (A Record and CNAME). Add these records to your domain registrar (GoDaddy, Namecheap, Route53, etc.). Vercel will automatically generate a free SSL certificate.

### 5. Vercel Cron Job Configuration
Since you rely on a cron job to drop the stems at midnight, you need to configure a `vercel.json` file in the root of your project to tell Vercel to ping your `api/cron/daily-drop` endpoint on a schedule.

---

## Phase 2: Early Stages Promotion Plan (The First 100 Players)

The goal of the Alpha phase is **feedback and stress testing**, not mass virality. You want a tight-knit group of passionate producers who will break the site and tell you what's wrong.

### 1. The "Inner Circle" Playtest
*   **Who:** Personal producer friends, collaborators, or people you've met online.
*   **Action:** DM them directly. Say, *"I built a gamified beat battle app where you only have 20 minutes to flip a sample. I need producers to try and break it before I launch it publicly. You down?"*
*   **Goal:** Get 5-10 people to play simultaneously to test real-time voting and backend timer validation.

### 2. Discord Communities (The Honey Hole)
Discord is where producers hang out. Finding active beat battle or feedback channels is crucial.
*   **Targets:** Kenny Beats Discord, Internet Money Discord, eliminate's Discord, FL Studio/Ableton official servers.
*   **Strategy:** DO NOT spam links. Participate in the community. When people share beats, give feedback. Then drop a casual message in general or self-promo channels:
    *   *"I was tired of waiting weeks for beat battle results, so I coded a site that does 20-minute speed runs every night at midnight. Looking for 20 producers to test the Alpha with me tonight."*

### 3. Niche Subreddits
Reddit hates blatant self-promotion, so you must provide value or tell a compelling story.
*   **Targets:** `r/WeAreTheMusicMakers`, `r/trapproduction`, `r/FL_Studio`, `r/ableton`, `r/musicproduction`.
*   **Strategy:** Post a "Showoff" or "Discussion" thread.
    *   **Title idea:** *"I built a 'Survival Mode' for beatmakers: You get a stem, you have 20 minutes to flip it, or you get locked out."*
    *   Explain the tech stack briefly (producers love knowing how things are built) and ask for beta testers. Include the link at the bottom.

### 4. Short-Form Video (TikTok / IG Reels)
Visualizing the *panic* of the 20-minute timer is your biggest marketing asset.
*   **Content Idea 1 (The Panic POV):** A video showing the "TIME'S UP" screen, cutting to a producer stressing over their DAW as the 20-minute timer ticks down on the website in the background. Text on screen: *"POV: You have 3 minutes left to upload your flip before the server locks you out."*
*   **Content Idea 2 (The Walkthrough):** Screen-record the website flow. "Here's a beat battle site that only gives you 20 minutes." Show downloading the stem, a quick time-lapse of making the beat, and the upload process.

### 5. Establishing a Feedback Loop
*   Create a dedicated Discord server for "Clocked Audio".
*   Require Alpha testers to join the Discord to get updates on when the next drop is happening.
*   Set up a `#bug-reports` and `#feature-requests` channel. Listen to these early users religiously—they will shape Milestone 2.
