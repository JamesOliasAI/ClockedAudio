export default function TermsPage() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '4rem 2rem', color: '#fff', fontFamily: 'var(--font-sans)', lineHeight: '1.6' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', color: 'var(--accent-cyan)', marginBottom: '1rem' }}>Terms of Service</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Last updated: May 2026</p>
      
      <h2 style={{ color: 'var(--accent-magenta)', marginTop: '2rem' }}>1. Acceptance of Terms</h2>
      <p>By accessing or using the Clocked Audio platform (the "Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the Service.</p>

      <h2 style={{ color: 'var(--accent-magenta)', marginTop: '2rem' }}>2. Description of Service</h2>
      <p>Clocked Audio is a gamified beat-making platform where users receive daily audio stems and have exactly 20 minutes to download, modify, and re-upload an MP3 flip.</p>

      <h2 style={{ color: 'var(--accent-magenta)', marginTop: '2rem' }}>3. User Conduct</h2>
      <p>You agree not to exploit the platform, manipulate the 20-minute timer mechanism, or upload explicit, offensive, or illegal content. We reserve the right to ban accounts violating these rules without notice.</p>

      <h2 style={{ color: 'var(--accent-magenta)', marginTop: '2rem' }}>4. Intellectual Property</h2>
      <p>The stems provided during the Daily Drops remain the property of their respective creators. You are granted a limited license to flip them for the purpose of participating in the daily challenge. You retain ownership of your flipped creation, but grant us a license to play it on our platform for voting and archival purposes.</p>

      <h2 style={{ color: 'var(--accent-magenta)', marginTop: '2rem' }}>5. Limitation of Liability</h2>
      <p>The Service is provided "as is". We are not responsible for lost data, failed uploads, or missed submission windows resulting from network issues or system outages.</p>
      
      <div style={{ marginTop: '4rem' }}>
        <a href="/" style={{ color: 'var(--accent-cyan)', textDecoration: 'none' }}>&larr; Back to Platform</a>
      </div>
    </div>
  );
}
