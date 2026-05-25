-- ====================================================================
-- CLOCKED AUDIO - COMPLETE POSTGRESQL SCHEMA (SUPABASE)
-- ====================================================================

-- --------------------------------------------------
-- 1. ENUMS CONFIGURATION
-- --------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lobby_status') THEN
        CREATE TYPE lobby_status AS ENUM ('waiting', 'active', 'uploading', 'voting', 'finalizing', 'closed');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'battle_type') THEN
        CREATE TYPE battle_type AS ENUM ('daily_drop', 'ranked_lobby', 'pink_slip', 'tournament');
    END IF;
END$$;

-- --------------------------------------------------
-- 2. TABLES CREATION
-- --------------------------------------------------

-- USERS (Profiles connected to Supabase Auth)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username VARCHAR(30) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(100),
    bio TEXT,
    discord_username VARCHAR(100),
    discord_avatar_url TEXT,
    link_soundcloud TEXT,
    link_spotify TEXT,
    link_twitter TEXT,
    link_instagram TEXT,
    total_xp INTEGER DEFAULT 0 NOT NULL,
    current_level INTEGER DEFAULT 1 NOT NULL,
    current_rank VARCHAR(50) DEFAULT 'Bedroom Producer (Bronze I)' NOT NULL,
    is_premium BOOLEAN DEFAULT FALSE NOT NULL,
    stripe_customer_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);


-- DAILY DROP POOL (Unused sounds waiting to be picked)
CREATE TABLE IF NOT EXISTS daily_drop_pool (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(100) NOT NULL,
    stem_url TEXT NOT NULL,
    is_used BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- DAILY DROPS
CREATE TABLE IF NOT EXISTS daily_drops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(100) NOT NULL,
    stem_url TEXT NOT NULL,
    release_date DATE UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- DAILY DROP SUBMISSIONS (Restricted to MP3 via constraints/application logic)
CREATE TABLE IF NOT EXISTS daily_drop_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    daily_drop_id UUID REFERENCES daily_drops(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    audio_url TEXT NOT NULL, -- MP3 URL stored on Cloudflare R2
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT unique_user_daily_drop UNIQUE (daily_drop_id, user_id)
);

-- DAILY DROP ATTEMPTS (Tracks started attempts to enforce single play per drop)
CREATE TABLE IF NOT EXISTS daily_drop_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    daily_drop_id UUID REFERENCES daily_drops(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT unique_user_daily_drop_attempt UNIQUE (daily_drop_id, user_id)
);

-- DAILY DROP VOTES (Binary TikTok-style swipe feed)
CREATE TABLE IF NOT EXISTS daily_drop_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID REFERENCES daily_drop_submissions(id) ON DELETE CASCADE NOT NULL,
    voter_user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    is_upvote BOOLEAN NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT unique_voter_daily_drop UNIQUE (submission_id, voter_user_id)
);

-- LOBBIES (Ranked Synchronous Matchmaking)
CREATE TABLE IF NOT EXISTS lobbies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    battle_type battle_type DEFAULT 'ranked_lobby' NOT NULL,
    status lobby_status DEFAULT 'waiting' NOT NULL,
    genre VARCHAR(50) NOT NULL,
    starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
    max_players INTEGER DEFAULT 10 NOT NULL,
    modifier_id VARCHAR(50), -- Identifies active starting modifier constraints
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- LOBBY SUBMISSIONS
CREATE TABLE IF NOT EXISTS lobby_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lobby_id UUID REFERENCES lobbies(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    audio_url TEXT NOT NULL, -- MP3 URL stored on Cloudflare R2
    wagered_sound_url TEXT, -- Nullable, used for Pink Slips
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT unique_user_lobby UNIQUE (lobby_id, user_id)
);

-- LOBBY RATINGS (1-5 Scale Scoring)
CREATE TABLE IF NOT EXISTS lobby_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID REFERENCES lobby_submissions(id) ON DELETE CASCADE NOT NULL,
    voter_user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    score INTEGER NOT NULL CONSTRAINT score_range CHECK (score >= 1 AND score <= 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT unique_voter_lobby UNIQUE (submission_id, voter_user_id)
);

-- --------------------------------------------------
-- 3. INDEXES FOR PERFORMANCE OPTIMIZATION
-- --------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_submissions_daily_drop ON daily_drop_submissions(daily_drop_id);
CREATE INDEX IF NOT EXISTS idx_submissions_user ON daily_drop_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_votes_submission ON daily_drop_votes(submission_id);
CREATE INDEX IF NOT EXISTS idx_votes_voter ON daily_drop_votes(voter_user_id);
CREATE INDEX IF NOT EXISTS idx_lobbies_status ON lobbies(status);
CREATE INDEX IF NOT EXISTS idx_lobby_subs_lobby ON lobby_submissions(lobby_id);
CREATE INDEX IF NOT EXISTS idx_lobby_ratings_sub ON lobby_ratings(submission_id);

-- --------------------------------------------------
-- 4. LEVEL & XP SYSTEM AUTOMATION (POSTGRESQL TRIGGERS)
-- --------------------------------------------------

-- Helper function to compute rank title based on level
CREATE OR REPLACE FUNCTION get_rank_tier_name(lvl INTEGER)
RETURNS VARCHAR AS $$
BEGIN
    IF lvl < 5 THEN
        RETURN 'Bedroom Producer (Bronze I)';
    ELSIF lvl < 10 THEN
        RETURN 'Bedroom Producer (Bronze II)';
    ELSIF lvl < 15 THEN
        RETURN 'Garage Hobbyist (Silver I)';
    ELSIF lvl < 20 THEN
        RETURN 'Garage Hobbyist (Silver II)';
    ELSIF lvl < 25 THEN
        RETURN 'Local Noise Maker (Gold I)';
    ELSIF lvl < 30 THEN
        RETURN 'Local Noise Maker (Gold II)';
    ELSIF lvl < 40 THEN
        RETURN 'Studio Veteran (Platinum I)';
    ELSIF lvl < 50 THEN
        RETURN 'Studio Veteran (Platinum II)';
    ELSE
        RETURN 'Label Executive (Grandmaster)';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Helper function to calculate required cumulative XP for a level L
-- Formula: XP_req(L) = floor(A * L^B) + C
-- Where A = 120, B = 1.8, C = 200
CREATE OR REPLACE FUNCTION get_cumulative_xp_for_level(lvl INTEGER)
RETURNS INTEGER AS $$
DECLARE
    xp_sum INTEGER := 0;
    i INTEGER;
    a NUMERIC := 120.0;
    b NUMERIC := 1.8;
    c INTEGER := 200;
BEGIN
    IF lvl <= 1 THEN
        RETURN 0;
    END IF;
    FOR i IN 1..(lvl - 1) LOOP
        xp_sum := xp_sum + FLOOR(a * POWER(i, b)) + c;
    END LOOP;
    RETURN xp_sum;
END;
$$ LANGUAGE plpgsql;

-- Trigger Function to automatically recalibrate level and rank when total_xp is updated
CREATE OR REPLACE FUNCTION trigger_recalculate_user_level()
RETURNS TRIGGER AS $$
DECLARE
    calc_level INTEGER := 1;
    needed_xp INTEGER;
    cumulative_xp INTEGER := 0;
BEGIN
    -- Only run if total_xp has changed or on insert
    IF TG_OP = 'INSERT' OR (NEW.total_xp IS DISTINCT FROM OLD.total_xp) THEN
        LOOP
            -- Calculate cumulative XP needed to reach calc_level + 1
            needed_xp := FLOOR(120.0 * POWER(calc_level, 1.8)) + 200;
            IF NEW.total_xp >= (cumulative_xp + needed_xp) THEN
                cumulative_xp := cumulative_xp + needed_xp;
                calc_level := calc_level + 1;
            ELSE
                EXIT;
            END IF;
        END LOOP;
        
        NEW.current_level := calc_level;
        NEW.current_rank := get_rank_tier_name(calc_level);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Bind Trigger to users table
DROP TRIGGER IF EXISTS tr_users_recalculate_level ON users;
CREATE TRIGGER tr_users_recalculate_level
BEFORE INSERT OR UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION trigger_recalculate_user_level();
