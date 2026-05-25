'use client';

import React, { useState, useEffect } from 'react';
import { Shield, Check, Info, ArrowLeft, Disc } from 'lucide-react';
import { supabase, isLiveMode } from '../../../utils/supabaseClient';

export default function DiscordMockAuth() {
  const [username, setUsername] = useState('synth_assassin');
  const [tag, setTag] = useState('8080');
  const [email, setEmail] = useState('assassin@clockedaudio.io');
  const [avatarColor, setAvatarColor] = useState('#5865F2'); // Discord Blurple
  const [redirectTo, setRedirectTo] = useState('/');
  const [isAuthorizing, setIsAuthorizing] = useState(false);

  // Extract redirect query param on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const dest = params.get('redirectTo');
      if (dest) {
        setRedirectTo(dest);
      }
    }
  }, []);

  const avatarColors = [
    { name: 'Blurple', value: '#5865F2' },
    { name: 'Green', value: '#248046' },
    { name: 'Yellow', value: '#FEE75C' },
    { name: 'Fuchsia', value: '#EB459E' },
    { name: 'Red', value: '#ED4245' }
  ];

  const handleAuthorize = async (e) => {
    e.preventDefault();
    setIsAuthorizing(true);

    const discordTag = `${username.trim()}#${tag.trim()}`;
    const userEmail = email.trim();
    const avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${username.trim()}&backgroundColor=${avatarColor.replace('#', '')}`;

    if (isLiveMode) {
      try {
        // 1. Sign up or Sign in to live Supabase using the email and dummy password
        const { data, error } = await supabase.auth.signUp({
          email: userEmail,
          password: 'pass-survival-run-2026',
          options: {
            data: {
              username: username.trim()
            }
          }
        });

        let activeUser = data?.user;

        if (error) {
          // If already registered, fall back to sign in
          if (
            error.message?.toLowerCase().includes('already') ||
            error.status === 422 ||
            error.status === 400
          ) {
            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
              email: userEmail,
              password: 'pass-survival-run-2026'
            });

            if (signInError) {
              alert(`OAuth Bypass Authentication Failed: ${error.message} (Direct sign-in also failed: ${signInError.message})`);
              setIsAuthorizing(false);
              return;
            }
            activeUser = signInData?.user;
          } else {
            alert(`OAuth Bypass Authentication Failed: ${error.message}`);
            setIsAuthorizing(false);
            return;
          }
        }

        if (activeUser) {
          // 2. Fetch existing user profile row from live database to protect display names & bios
          const { data: existingProfile } = await supabase
            .from('users')
            .select('*')
            .eq('id', activeUser.id)
            .single();

          const profileUpdates = {
            id: activeUser.id,
            username: username.trim().toLowerCase(),
            email: userEmail,
            discord_username: discordTag,
            discord_avatar_url: avatarUrl,
            updated_at: new Date().toISOString()
          };

          if (!existingProfile) {
            // New user defaults
            profileUpdates.full_name = '';
            profileUpdates.bio = '';
            profileUpdates.total_xp = 100;
          }

          // 3. Upsert profile row into public users table
          const { error: upsertErr } = await supabase
            .from('users')
            .upsert(profileUpdates);

          if (upsertErr) {
            console.error('Error upserting mock Discord profile to live db:', upsertErr);
          }

          // Merge profile details to keep local state completely accurate
          const finalLocalUser = {
            ...activeUser,
            ...(existingProfile || {}),
            ...profileUpdates
          };

          // Set active session in mock client storage for instant sync across layout headers
          localStorage.setItem('clocked_audio_active_user', JSON.stringify(finalLocalUser));
          window.dispatchEvent(new Event('storage'));

          // Redirect back
          window.location.href = redirectTo;
        }
      } catch (err) {
        console.error('Bypass OAuth Anomaly:', err);
        alert('A connection anomaly occurred during the neural handshake.');
        setIsAuthorizing(false);
      }
    } else {
      // Simulate network latency for mock mode
      setTimeout(async () => {
        try {
          // Create new user block
          const mockUser = {
            id: `mock-discord-${Math.floor(Math.random() * 100000)}`,
            username: username.trim().toLowerCase(),
            email: userEmail,
            full_name: '', // INTENTIONALLY blank to trigger the premium profile onboarding flow!
            bio: '',       // INTENTIONALLY blank to trigger onboarding!
            discord_username: discordTag,
            discord_avatar_url: avatarUrl,
            link_soundcloud: '',
            link_spotify: '',
            link_twitter: '',
            link_instagram: '',
            total_xp: 100, // Seed 100 XP for connecting!
            current_level: 1,
            current_rank: 'Bedroom Producer (Bronze I)',
            is_premium: false,
            stripe_customer_id: null,
            created_at: new Date().toISOString()
          };

          // Write to mock DB in localStorage
          const storedDb = localStorage.getItem('clocked_audio_mock_db');
          if (storedDb) {
            const db = JSON.parse(storedDb);
            // Check if already exists in mock db users, if not push it
            if (!db.users.some(u => u.email === userEmail)) {
              db.users.push(mockUser);
              localStorage.setItem('clocked_audio_mock_db', JSON.stringify(db));
            }
          }

          // Set active session in mock client
          localStorage.setItem('clocked_audio_active_user', JSON.stringify(mockUser));

          // Dispatch a custom storage/session event to immediately update Navigation state
          window.dispatchEvent(new Event('storage'));

          // Redirect back to our platform
          window.location.href = redirectTo;
        } catch (err) {
          console.error('Simulated OAuth failed:', err);
          setIsAuthorizing(false);
        }
      }, 1200);
    }
  };

  const handleCancel = () => {
    window.location.href = redirectTo;
  };

  return (
    <div style={styles.discordWrapper}>
      {/* Background Discord Grid */}
      <div style={styles.glowBg} />

      <div style={styles.oauthContainer}>
        {/* Discord Header */}
        <div style={styles.oauthHeader}>
          <div style={styles.discordLogo}>
            <Disc size={36} color="#ffffff" style={{ filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.2))' }} />
            <span style={styles.discordLogoText}>Discord</span>
          </div>
          <span style={styles.authBadge}>OAUTH2 AUTHORIZATION SERVICE</span>
        </div>

        <form onSubmit={handleAuthorize} style={styles.oauthCard}>
          {/* Top visual representation */}
          <div style={styles.avatarVisualRow}>
            <div style={{ ...styles.discordAvatarLarge, backgroundColor: avatarColor }}>
              <span style={{ fontSize: '1.8rem', fontWeight: 'bold', color: avatarColor === '#FEE75C' ? '#000000' : '#ffffff' }}>
                {username.substring(0, 2).toUpperCase()}
              </span>
              <div style={styles.avatarStatusIndicator} />
            </div>
            <div style={styles.connectionLine}>
              <div className="pulse-text" style={{ fontSize: '12px' }}>⇄</div>
            </div>
            <div style={styles.clockedLogoAvatar}>
              <span style={{ fontSize: '1.2rem', fontFamily: 'monospace', color: 'var(--accent-cyan)' }}>⏵</span>
            </div>
          </div>

          <h2 style={styles.authorizeTitle}>AN APPLICATION IS REQUESTING ACCESS TO YOUR DISCORD ACCOUNT</h2>
          
          <div style={styles.connectionDetailsBox}>
            <span style={styles.appTitle}>CLOCKED_AUDIO (Local Sandbox)</span>
            <p style={styles.appDesc}>wants to access your profile coordinates and bind them to your producer profile.</p>
          </div>

          {/* Scope list */}
          <div style={styles.scopeSection}>
            <span style={styles.sectionHeader}>THIS WILL ALLOW THE DEVELOPER OF CLOCKED_AUDIO TO:</span>
            
            <div style={styles.scopeItem}>
              <div style={styles.checkIcon}>
                <Check size={12} color="#23a55a" />
              </div>
              <div style={styles.scopeTexts}>
                <span style={styles.scopeName}>Access your username, avatar, and discord tag</span>
                <span style={styles.scopeDesc}>Used to identify your profile across lists and rankings.</span>
              </div>
            </div>

            <div style={styles.scopeItem}>
              <div style={styles.checkIcon}>
                <Check size={12} color="#23a55a" />
              </div>
              <div style={styles.scopeTexts}>
                <span style={styles.scopeName}>Access your email coordinates</span>
                <span style={styles.scopeDesc}>Used for securing your persistent studio saves.</span>
              </div>
            </div>
          </div>

          {/* Dynamic Mock Credentials Configuration */}
          <div style={styles.configSection}>
            <span style={styles.sectionHeader}>CUSTOMIZE YOUR MOCK DISCORD CREDENTIALS:</span>
            
            <div style={styles.inputRow}>
              <div style={{ flex: 2 }}>
                <label style={styles.inputLabel}>DISCORD USERNAME</label>
                <input 
                  type="text" 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                  style={styles.discordInput} 
                  maxLength={20}
                  required
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={styles.inputLabel}>DISCORD TAG</label>
                <div style={styles.tagInputWrapper}>
                  <span style={styles.tagHash}>#</span>
                  <input 
                    type="text" 
                    value={tag} 
                    onChange={(e) => setTag(e.target.value.replace(/\D/g, ''))}
                    style={{ ...styles.discordInput, paddingLeft: '1.2rem' }} 
                    maxLength={4}
                    required
                  />
                </div>
              </div>
            </div>

            <div style={{ marginTop: '0.8rem' }}>
              <label style={styles.inputLabel}>EMAIL ADDRESS</label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                style={styles.discordInput} 
                required
              />
            </div>

            <div style={{ marginTop: '0.8rem' }}>
              <label style={styles.inputLabel}>CHOOSE AVATAR HIGHLIGHT</label>
              <div style={styles.colorPalette}>
                {avatarColors.map((color) => (
                  <button
                    key={color.name}
                    type="button"
                    style={{ 
                      ...styles.colorCircle, 
                      backgroundColor: color.value,
                      border: avatarColor === color.value ? '2.5px solid #ffffff' : '1px solid rgba(0,0,0,0.3)',
                      boxShadow: avatarColor === color.value ? '0 0 8px ' + color.value : 'none'
                    }}
                    onClick={() => setAvatarColor(color.value)}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
          </div>

          <div style={styles.alertBox}>
            <Info size={14} color="#00b0f4" style={{ flexShrink: 0 }} />
            <p style={styles.alertText}>
              Redirecting to <strong>{redirectTo}</strong> on successful neural uplink validation.
            </p>
          </div>

          {/* Action Row */}
          <div style={styles.actionButtons}>
            <button 
              type="button" 
              onClick={handleCancel} 
              style={styles.cancelBtn}
              disabled={isAuthorizing}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              style={styles.authorizeBtn}
              disabled={isAuthorizing}
            >
              {isAuthorizing ? 'AUTHORIZING CYBER HANDSHAKE...' : 'Authorize'}
            </button>
          </div>
        </form>

        <div style={styles.footerNote}>
          <Shield size={10} style={{ marginRight: '4px' }} />
          <span>Clocked Audio Security Simulator. No actual Discord credentials required.</span>
        </div>
      </div>
    </div>
  );
}

const styles = {
  discordWrapper: {
    minHeight: '100vh',
    width: '100vw',
    position: 'fixed',
    top: 0,
    left: 0,
    zIndex: 99999,
    background: '#1e1f22',
    color: '#dbdee1',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '1.5rem',
    overflowY: 'auto',
  },
  glowBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundImage: 'radial-gradient(circle at 50% 30%, rgba(88, 101, 242, 0.07) 0%, transparent 60%)',
    pointerEvents: 'none',
  },
  oauthContainer: {
    width: '100%',
    maxWidth: '480px',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    zIndex: 10,
  },
  oauthHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 0.5rem',
  },
  discordLogo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
  },
  discordLogoText: {
    fontSize: '1.25rem',
    fontWeight: 800,
    color: '#ffffff',
    letterSpacing: '-0.03em',
  },
  authBadge: {
    fontSize: '0.55rem',
    fontFamily: 'monospace',
    color: '#949ba4',
    background: '#2b2d31',
    padding: '0.2rem 0.5rem',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  oauthCard: {
    background: '#2b2d31',
    border: '1px solid rgba(255, 255, 255, 0.04)',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
    borderRadius: '8px',
    padding: '2rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  avatarVisualRow: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '1rem',
    marginTop: '0.5rem',
  },
  discordAvatarLarge: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
  },
  avatarStatusIndicator: {
    position: 'absolute',
    bottom: '2px',
    right: '2px',
    width: '14px',
    height: '14px',
    borderRadius: '50%',
    background: '#23a55a',
    border: '3px solid #2b2d31',
  },
  connectionLine: {
    color: '#4e5058',
    fontSize: '1.25rem',
  },
  clockedLogoAvatar: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    background: '#050507',
    border: '2px solid var(--accent-cyan)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 12px rgba(255, 166, 0, 0.15)',
  },
  authorizeTitle: {
    fontSize: '0.75rem',
    fontWeight: 700,
    color: '#949ba4',
    textAlign: 'center',
    letterSpacing: '0.04em',
    lineHeight: '1.4',
    margin: 0,
    fontFamily: 'inherit',
  },
  connectionDetailsBox: {
    background: '#1e1f22',
    padding: '0.85rem 1rem',
    borderRadius: '4px',
    borderLeft: '4px solid #5865F2',
    textAlign: 'left',
  },
  appTitle: {
    fontSize: '0.88rem',
    fontWeight: 700,
    color: '#ffffff',
    display: 'block',
  },
  appDesc: {
    fontSize: '0.78rem',
    color: '#949ba4',
    marginTop: '0.15rem',
    lineHeight: '1.3',
  },
  scopeSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    borderBottom: '1.5px solid #3f4248',
    paddingBottom: '1.25rem',
  },
  sectionHeader: {
    fontSize: '0.68rem',
    fontWeight: 800,
    color: '#949ba4',
    letterSpacing: '0.03em',
  },
  scopeItem: {
    display: 'flex',
    gap: '0.6rem',
    alignItems: 'flex-start',
  },
  checkIcon: {
    background: 'rgba(35, 165, 90, 0.1)',
    borderRadius: '50%',
    width: '18px',
    height: '18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: '0.1rem',
  },
  scopeTexts: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.1rem',
  },
  scopeName: {
    fontSize: '0.82rem',
    fontWeight: 600,
    color: '#dbdee1',
  },
  scopeDesc: {
    fontSize: '0.72rem',
    color: '#949ba4',
  },
  configSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.6rem',
    background: '#1e1f22',
    padding: '1rem',
    borderRadius: '4px',
  },
  inputRow: {
    display: 'flex',
    gap: '0.75rem',
  },
  inputLabel: {
    fontSize: '0.62rem',
    fontWeight: 700,
    color: '#949ba4',
    marginBottom: '0.3rem',
    display: 'block',
  },
  discordInput: {
    width: '100%',
    background: '#111214',
    border: '1px solid rgba(0,0,0,0.5)',
    color: '#ffffff',
    padding: '0.5rem 0.65rem',
    borderRadius: '3px',
    fontSize: '0.82rem',
    outline: 'none',
    transition: 'border-color 0.15s',
  },
  tagInputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  tagHash: {
    position: 'absolute',
    left: '0.5rem',
    fontSize: '0.82rem',
    color: '#4e5058',
    fontWeight: 'bold',
  },
  colorPalette: {
    display: 'flex',
    gap: '0.6rem',
    alignItems: 'center',
    marginTop: '0.2rem',
  },
  colorCircle: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    cursor: 'pointer',
    outline: 'none',
    padding: 0,
    transition: 'transform 0.1s',
  },
  alertBox: {
    display: 'flex',
    gap: '0.5rem',
    background: 'rgba(0, 176, 244, 0.06)',
    border: '1px solid rgba(0, 176, 244, 0.15)',
    borderRadius: '4px',
    padding: '0.65rem 0.8rem',
    alignItems: 'center',
  },
  alertText: {
    fontSize: '0.72rem',
    color: '#949ba4',
    margin: 0,
    lineHeight: '1.35',
  },
  actionButtons: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '1rem',
    marginTop: '0.5rem',
  },
  cancelBtn: {
    background: 'none',
    border: 'none',
    color: '#ffffff',
    fontSize: '0.88rem',
    cursor: 'pointer',
    padding: '0.5rem 1rem',
    outline: 'none',
  },
  authorizeBtn: {
    background: '#5865F2',
    color: '#ffffff',
    border: 'none',
    borderRadius: '3px',
    padding: '0.75rem 1.75rem',
    fontSize: '0.88rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background-color 0.15s',
    flex: 1,
    outline: 'none',
  },
  footerNote: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.58rem',
    color: '#949ba4',
    textAlign: 'center',
  }
};
