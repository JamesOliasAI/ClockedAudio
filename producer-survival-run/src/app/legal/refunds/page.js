export default function RefundsPage() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '4rem 2rem', color: '#fff', fontFamily: 'var(--font-sans)', lineHeight: '1.6' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', color: 'var(--accent-cyan)', marginBottom: '1rem' }}>Refund Policy</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Last updated: May 2026</p>
      
      <h2 style={{ color: 'var(--accent-magenta)', marginTop: '2rem' }}>1. Overview</h2>
      <p>Clocked Audio operates primarily as a free-to-play asynchronous beat battle platform. However, for any premium features, subscriptions, or sound kit purchases offered, the following refund policy applies.</p>

      <h2 style={{ color: 'var(--accent-magenta)', marginTop: '2rem' }}>2. Digital Goods</h2>
      <p>Due to the digital nature of the products and services offered (e.g., downloadable stem kits, XP boosts, premium badges), all sales are generally considered final and non-refundable once the digital goods have been accessed or downloaded.</p>

      <h2 style={{ color: 'var(--accent-magenta)', marginTop: '2rem' }}>3. Subscription Services</h2>
      <p>If you are subscribed to a premium tier, you may cancel your subscription at any time. Cancellations will take effect at the end of the current billing cycle. We do not provide prorated refunds for partially used billing periods.</p>

      <h2 style={{ color: 'var(--accent-magenta)', marginTop: '2rem' }}>4. Exceptions</h2>
      <p>Exceptions to this policy may be made on a case-by-case basis at our sole discretion, such as in instances of billing errors, duplicate charges, or severe technical outages that completely prevented access to the purchased service.</p>

      <h2 style={{ color: 'var(--accent-magenta)', marginTop: '2rem' }}>5. Contact Us</h2>
      <p>If you believe you are entitled to a refund under these terms, please contact our support team with your account details and a description of the issue.</p>
      
      <div style={{ marginTop: '4rem' }}>
        <a href="/" style={{ color: 'var(--accent-cyan)', textDecoration: 'none' }}>&larr; Back to Platform</a>
      </div>
    </div>
  );
}
