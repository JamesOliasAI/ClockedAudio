export default function PrivacyPage() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '4rem 2rem', color: '#fff', fontFamily: 'var(--font-sans)', lineHeight: '1.6' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', color: 'var(--accent-cyan)', marginBottom: '1rem' }}>Privacy Policy</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Last updated: May 2026</p>
      
      <h2 style={{ color: 'var(--accent-magenta)', marginTop: '2rem' }}>1. Information We Collect</h2>
      <p>When you use Clocked Audio, we may collect information including your Discord username, avatar, email address, and IP address. We also store the audio files (MP3s) you upload as part of the Daily Drop challenge.</p>

      <h2 style={{ color: 'var(--accent-magenta)', marginTop: '2rem' }}>2. How We Use Your Information</h2>
      <p>We use this information to operate the platform, authenticate users, display public profiles on leaderboards, and facilitate the daily voting feeds. Your email is used solely for account recovery and critical service updates.</p>

      <h2 style={{ color: 'var(--accent-magenta)', marginTop: '2rem' }}>3. Data Sharing</h2>
      <p>We do not sell your personal data to third parties. We only share necessary data with our infrastructure partners (e.g., Supabase for database, Cloudflare R2 for storage) to keep the platform running.</p>

      <h2 style={{ color: 'var(--accent-magenta)', marginTop: '2rem' }}>4. Data Retention and Deletion</h2>
      <p>We retain your uploaded audio flips and account information as long as your account is active. You may request account deletion by contacting support, at which point all associated data and MP3s will be purged.</p>

      <h2 style={{ color: 'var(--accent-magenta)', marginTop: '2rem' }}>5. Security</h2>
      <p>We employ industry-standard security measures, including HTTPS and secure token-based authentication via Supabase, to protect your data from unauthorized access.</p>
      
      <div style={{ marginTop: '4rem' }}>
        <a href="/" style={{ color: 'var(--accent-cyan)', textDecoration: 'none' }}>&larr; Back to Platform</a>
      </div>
    </div>
  );
}
