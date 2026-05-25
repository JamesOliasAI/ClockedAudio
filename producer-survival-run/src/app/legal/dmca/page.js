export default function DMCAPage() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '4rem 2rem', color: '#fff', fontFamily: 'var(--font-sans)', lineHeight: '1.6' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', color: 'var(--accent-cyan)', marginBottom: '1rem' }}>DMCA Policy</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Last updated: May 2026</p>
      
      <h2 style={{ color: 'var(--accent-magenta)', marginTop: '2rem' }}>1. Introduction</h2>
      <p>Clocked Audio respects the intellectual property rights of others and expects its users to do the same. In accordance with the Digital Millennium Copyright Act of 1998 (DMCA), we will respond expeditiously to claims of copyright infringement committed using our service.</p>

      <h2 style={{ color: 'var(--accent-magenta)', marginTop: '2rem' }}>2. Submitting a Takedown Notice</h2>
      <p>If you are a copyright owner, or are authorized to act on behalf of one, and you believe that material on our platform infringes your copyrights, please submit a written notice containing the following:</p>
      <ul>
        <li style={{ margin: '0.5rem 0' }}>A physical or electronic signature of the copyright owner or authorized agent.</li>
        <li style={{ margin: '0.5rem 0' }}>Identification of the copyrighted work claimed to have been infringed.</li>
        <li style={{ margin: '0.5rem 0' }}>Identification of the material that is claimed to be infringing, along with information reasonably sufficient to permit us to locate the material (e.g., the URL or submission ID).</li>
        <li style={{ margin: '0.5rem 0' }}>Your contact information, including address, telephone number, and email.</li>
        <li style={{ margin: '0.5rem 0' }}>A statement that you have a good faith belief that use of the material is not authorized by the copyright owner.</li>
      </ul>

      <h2 style={{ color: 'var(--accent-magenta)', marginTop: '2rem' }}>3. Counter-Notice</h2>
      <p>If you believe your removed content is not infringing, or you have the right to post the content, you may send a counter-notice containing your signature, identification of the removed material, a statement under penalty of perjury that the material was removed by mistake, and your contact details.</p>

      <h2 style={{ color: 'var(--accent-magenta)', marginTop: '2rem' }}>4. Repeat Infringers</h2>
      <p>It is our policy to terminate, in appropriate circumstances, users who are repeat infringers of intellectual property rights.</p>
      
      <div style={{ marginTop: '4rem' }}>
        <a href="/" style={{ color: 'var(--accent-cyan)', textDecoration: 'none' }}>&larr; Back to Platform</a>
      </div>
    </div>
  );
}
