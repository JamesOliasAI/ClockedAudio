# Project: Clocked Audio (Gamified Audio SaaS)
**Document Version:** 1.1

---

## 1. Core Mechanics & Game Modes

### A. The "Daily Drop" (Asynchronous Play) — **MVP Primary Focus**
*   **Concept:** A single, highly curated stem drops globally at midnight.
*   **The Loop:** Producers log in, view a landing page with the rules and description of how the game works. Clicking the **"Start Battle"** button unlocks the next page, initiates the **20-minute countdown**, and reveals the sample preview and ZIP download button.
*   **Time-Control & Upload:** Producers have exactly 20 minutes to flip the stem in their DAW, export/bounce it, and upload it back.
*   **Format Constraint:** **MP3 uploads only**. WAV is strictly disabled to optimize Cloudflare R2 storage usage and ensure lightning-fast upload times under the countdown limit.
*   **Voting Feed:** Submissions populate an anonymous, TikTok-style global swipe feed.
*   **Voting Incentives:** Users earn XP for voting on other producers' beats after uploading their own, with bonus XP awarded if they vote for the track that eventually wins/places in the top 3.

### B. 24/7 Ranked Lobbies (Synchronous Play) — **Post-MVP Milestone**
*   **Concept:** Automated, 10-player real-time match lobbies where players face off under strict timers.
*   **State-Synchronized Loop:**
    ```
    [State: Waiting] ──(10 Players Joined)──> [State: Start Battle]
                                                    │ (Setup & ZIP Download)
                                                    ▼
    [State: Voting] <──(2-Min MP3 Upload)─── [State: Active (15 Mins)]
         │ (Listen party, rate beats 1-5)
         ▼
    [State: Finalizing] ──(1 Min Finalize)──> [State: Closed] (Rankings & XP)
    ```
    *All client pages transition at the exact same millisecond using Supabase Realtime WebSockets.*
*   **The Sound Kit Generator:** Instead of a single static sound, the platform queries a PostgreSQL database of categorized drum and instrument samples (e.g., Kicks, Snares, Hats, 808s, Synths). It dynamically compiles a randomized **Mini-Kit ZIP** corresponding to the selected genre, which the user downloads instantly with one click.
*   **Starting Modifiers:** A random challenge is selected and shown at the **start** of the lobby session (never mid-battle, to avoid DAW arrangement disruption).
    *   *Doable Modifiers include:*
        *   **BPM Lock:** The final flip must be produced at a specific tempo (e.g., exactly 140 BPM).
        *   **Minimalist:** Maximum 5 channels/tracks total in the final DAW project.
        *   **Melodic Bass:** The melodic sample provided must be pitched/processed to act as the sub-bassline.
        *   **No Hats Allowed:** Zero hi-hats or percussion loops may be used.
*   **Scoring:** During the live listening party, beats play sequentially. Players rate each other's tracks on a scale of **1 to 5** using mouse-clicks or keyboard shortcuts. Players cannot score their own tracks.
*   **Lobby Variations:**
    *   **Custom Sounds:** Use personal drum kits but must implement at least one melodic sample from the session kit.
    *   **Pink Slips:** Every producer wagers a custom sound. The overall battle winner wins the right to download all sounds wagered by opponents.

### C. Tycoon Progression System
*   **Concept:** Earn XP for competing and bonus XP for voting or placing in matches.
*   **Ranks:** Progress from *"Bedroom Producer"* up to *"Label Executive"*.
*   **Instant Updates:** All rank ups, badges, and XP increases update immediately upon match finalization without artificial progress bars or delays.
*   **Profile Dashboard:** Connect socials, display stats, showcase past wins, and show global leaderboard standing.

---

## 2. Monetization: The Battle Pass

The platform is free-to-play to drive viral user acquisition. High-value features are locked behind the **$9.99/month "Producer Battle Pass"**.

*   **Free Tier:**
    *   Access to the Daily Drop and basic Ranked Lobbies.
    *   Standard XP progression and voting rights.
*   **Battle Pass ($9.99/month):**
    *   **Commercial Licensing:** Full commercial usage rights to release tracks created during battles using the platform's stems.
    *   **Weekend Tournaments:** Entry into exclusive weekend ranked battles with physical/digital prize pools (Voucher licenses for popular premium VSTs like Serum/RC-20, cash, or hardware).
    *   **Advanced Analytics:** Waveform frequency spectrum comparisons plotting the user's track against the winning track.
    *   **The Vault:** Access to download the catalog of past Daily Drop stems (limited to the last 30 days to optimize R2 storage costs).

---

## 3. Tech Stack & Infrastructure

*   **Frontend:** Next.js (React) hosted on Vercel.
*   **Backend & WebSockets:** Supabase Pro for User Authentication, PostgreSQL database, and Realtime WebSockets to synchronize live lobby states.
*   **Storage (Zero Egress):** Cloudflare R2 for storing stem ZIPs, dynamically generated mini-kits, and uploaded MP3 submissions.
*   **Dynamic ZIP Packaging:** Serverless Edge Functions to bundle randomized mini-kits on-the-fly.
*   **Payments:** Stripe API for subscription billing of the $9.99/month Battle Pass.

---

## 4. Trust & Anti-Cheat Protocols

1.  **Upload Time Validation:** Inspect uploaded MP3 metadata to ensure it was bounced after the specific battle start timestamp.
2.  **Post-Winner DAW Project Verification:** To maintain community trust, weekend tournament winners must submit a screenshot or project package (.flp, .als, etc.) of their DAW arrangement showing the stems in use before high-value prizes are paid out.
3.  **Watermark Skipping:** Watermarking stems is excluded to prevent sample processing degradation and pitching bugs in DAWs.

---

## 5. UI/UX & Player Interface

### A. Hover-to-Play Waveform Player
*   **Desktop Interface:** Submissions are represented in a grid as clean waveform boxes.
*   **Interaction:** 
    *   **Hover Play:** Hovering the mouse cursor over a waveform instantly plays the track.
    *   **Wheel Scrubbing:** Using the mouse wheel while hovering scrubs forward/backward through the waveform.
    *   **Keyboard Controls:** Interactive keyboard shortcuts are fully supported (Spacebar for Play/Pause, Arrow keys for manual scrubbing, and numbers `1` to `5` to cast ratings).

### B. The Viral "Daily Card"
*   **Concept:** A premium, auto-generated shareable media asset.
*   **Design:** A sleek 15-second graphic card compiling the producer's profile avatar, their battle rank, a dynamic frequency visualizer of their beat, and a QR code linking to their profile.
*   **Goal:** Encourage players to organically post their achievements on Instagram Stories, TikTok, and Twitter.

---

## 6. Database Schema (Supabase / PostgreSQL)

```sql
-- ENUMS
CREATE TYPE lobby_status AS ENUM ('waiting', 'active', 'uploading', 'voting', 'finalizing', 'closed');
CREATE TYPE battle_type AS ENUM ('daily_drop', 'ranked_lobby', 'pink_slip', 'tournament');

-- USERS (Profiles)
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username VARCHAR(30) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    total_xp INTEGER DEFAULT 0 NOT NULL,
    current_rank VARCHAR(50) DEFAULT 'Bedroom Producer' NOT NULL,
    is_premium BOOLEAN DEFAULT FALSE NOT NULL,
    stripe_customer_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- DAILY DROPS
CREATE TABLE daily_drops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(100) NOT NULL,
    stem_url TEXT NOT NULL,
    release_date DATE UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- DAILY DROP SUBMISSIONS
CREATE TABLE daily_drop_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    daily_drop_id UUID REFERENCES daily_drops(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    audio_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT unique_user_daily_drop UNIQUE (daily_drop_id, user_id)
);

-- DAILY DROP VOTES (Binary TikTok swipe feed)
CREATE TABLE daily_drop_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID REFERENCES daily_drop_submissions(id) ON DELETE CASCADE,
    voter_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    is_upvote BOOLEAN NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT unique_voter_daily_drop UNIQUE (submission_id, voter_user_id)
);

-- LOBBIES (Ranked Synchronous Matchmaking)
CREATE TABLE lobbies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    battle_type battle_type DEFAULT 'ranked_lobby' NOT NULL,
    status lobby_status DEFAULT 'waiting' NOT NULL,
    genre VARCHAR(50) NOT NULL,
    starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
    max_players INTEGER DEFAULT 10 NOT NULL,
    modifier_id VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- LOBBY SUBMISSIONS
CREATE TABLE lobby_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lobby_id UUID REFERENCES lobbies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    audio_url TEXT NOT NULL,
    wagered_sound_url TEXT, -- Nullable, used for Pink Slips
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT unique_user_lobby UNIQUE (lobby_id, user_id)
);

-- LOBBY RATINGS (1-5 Scale Scoring)
CREATE TABLE lobby_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID REFERENCES lobby_submissions(id) ON DELETE CASCADE,
    voter_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    score INTEGER NOT NULL CONSTRAINT score_range CHECK (score >= 1 AND score <= 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT unique_voter_lobby UNIQUE (submission_id, voter_user_id)
);
```

---

## 7. Phased Implementation Roadmap

To focus the development team and hone in on a high-fidelity MVP, we have split the product into smaller, targeted milestones.

### Milestone 1: The Daily Drop & Web Interface (MVP Baseline Goal)
*Focus: Get the asynchronous, 20-minute daily challenge loop fully operational and polished.*

*   **Project 1.1: Core Infrastructure Setup**
    *   [x] Boilerplate Next.js project initialization.
    *   [x] Supabase Database & Auth implementation (Discord Auth and RLS).
    *   [x] Cloudflare R2 Bucket configuration and client-side presigned upload logic (restricted strictly to **MP3 only**).
*   **Project 1.2: Waveform Interface & Daily Landing Page**
    *   [x] Build the main battle description page and the locked challenge room.
    *   [x] Develop the **Hover-to-Play Waveform Player** component with wheel scrubbing and optional spacebar/arrow keys.
*   **Project 1.3: Asynchronous Swipe Feed & Progression**
    *   [x] Build the TikTok-style swipe voting feed for anonymous daily drop submissions.
    *   [x] Implement binary voting logic (`daily_drop_votes`) and hook up to the backend.
    *   [x] Create profile dashboard & instantaneous XP progression mapping algorithms.

### Next Steps / What Needs to be Changed, Updated, or Added
*   [x] **Waveform Audio Player Polish:** Build out the interactive waveform player with hover-to-play functionality and wheel scrubbing for the daily feed and profile submissions.
*   [x] **Upload Validation & Timer Check:** Implement strict backend checks to reject uploads if the 20-minute window has expired.
*   [x] **Voting Backend Integration:** Connect the existing swipe feed UI to the `daily_drop_votes` database table to track real upvotes/downvotes.
*   [x] **Profile Data Hookup:** Ensure the profile dashboard dynamically fetches XP, current rank, and past submissions directly from Supabase, removing placeholder data.
*   [x] **Cron Job Validation:** Rigorously test the `api/cron/daily-drop` endpoint to ensure the stem drop automatically executes at midnight.

*   **Goal of Milestone 1:** Launch a fully functional asynchronous play portal, validate community engagement, and test the 20-minute flow with early alpha users.

### Milestone 2: 24/7 Ranked Lobbies (Real-time Multiplayer Upgrade)
*Focus: Shift from async battles to instant, fully synchronized multiplayer match rooms.*

*   **Project 2.1: Supabase Realtime Synchronization**
    *   Configure Supabase WebSockets channels to push identical stage changes (Waiting -> Active -> Uploading -> Voting -> Closed) across clients simultaneously.
    *   Implement server-side cron timers/triggers to govern strict lobby stage limits (including the 2-minute upload window).
*   **Project 2.2: Dynamic Sound Kit ZIP Generator**
    *   Populate database with structured sound nodes.
    *   Develop an Edge Function to compile and ZIP randomly selected assets based on the lobby genre selection, served via a download button.
*   **Project 2.3: Keyboard Scoring & Modifiers**
    *   Implement 1-5 scale scoring (`lobby_ratings`) and keyboard visual controls (`1` to `5` keys).
    *   Create the start-of-battle modifier selector and build custom HUD animations overlaying modifiers onto the UI.

### Milestone 3: Monetization & Growth Loops
*Focus: Subscription gates and visual assets that make the game viral.*

*   **Project 3.1: Stripe Billing & Battle Pass Authorization**
    *   Stripe checkout session integration.
    *   Build subscriber authorization locks preventing non-Battle Pass users from downloading historical ZIP files.
*   **Project 3.2: The "Daily Card" Exporter**
    *   Develop server-side or canvas-based media exporter converting user profiles and beat waveforms into a high-quality, shareable 15-second MP4/image format.