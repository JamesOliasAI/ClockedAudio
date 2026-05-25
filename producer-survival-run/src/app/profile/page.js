'use client';

import React, { useState, useEffect } from 'react';
import { User, Award, Shield, Compass, TrendingUp, Music, Sparkles, RefreshCw, Terminal, CheckCircle2, Disc, Link2, Edit3, ExternalLink, Globe, LogOut, ShieldAlert } from 'lucide-react';
import { getLevelAndProgress } from '../../utils/gameScience';
import { supabase, isLiveMode } from '../../utils/supabaseClient';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Simulated stats state
  const [xp, setXp] = useState(2420);
  const [userSubmissions, setUserSubmissions] = useState([]);
  
  // Profile Form States
  const [isEditing, setIsEditing] = useState(false);
  const [editFullName, setEditFullName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editSoundcloud, setEditSoundcloud] = useState('');
  const [editSpotify, setEditSpotify] = useState('');
  const [editTwitter, setEditTwitter] = useState('');
  const [editInstagram, setEditInstagram] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Auth Form States (for compat/fallback loading indicator)
  const [isSyncing, setIsSyncing] = useState(false);
  const [authError, setAuthError] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [useEmailAuth, setUseEmailAuth] = useState(false);

  // Uplink Registration / Sign In Handler
  const handleUplinkSubmit = async (e) => {
    e.preventDefault();
    if (!emailInput || !usernameInput) {
      setAuthError('Provide both email coordinates and uploader credentials.');
      return;
    }
    setAuthError('');
    setIsSyncing(true);

    try {
      // 1. Trigger Supabase Sign Up (handles locally inside our mock client if not live)
      const { data, error } = await supabase.auth.signUp({
        email: emailInput.trim(),
        password: 'pass-survival-run-2026', // Standard dummy pass
        options: {
          data: {
            username: usernameInput.trim()
          }
        }
      });

      if (error) {
        // If user already registered, automatically try standard login
        if (
          error.message?.toLowerCase().includes('already') ||
          error.status === 422 ||
          error.status === 400
        ) {
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: emailInput.trim(),
            password: 'pass-survival-run-2026'
          });

          if (signInError) {
            setAuthError(`Uplink failed: ${error.message} (Direct sign-in fallback also failed: ${signInError.message})`);
            setIsSyncing(false);
            return;
          }

          // Successfully signed in. Ensure the profile row exists
          if (isLiveMode && signInData?.user) {
            await supabase
              .from('users')
              .upsert({
                id: signInData.user.id,
                username: usernameInput.trim(),
                email: emailInput.trim()
              });
          }

          setEmailInput('');
          setUsernameInput('');
          setIsSyncing(false);
          return;
        }

        setAuthError(error.message);
        setIsSyncing(false);
        return;
      }

      if (data?.user) {
        // 2. If running real live Supabase database, upsert profile row explicitly
        if (isLiveMode) {
          const { error: upsertErr } = await supabase
            .from('users')
            .upsert({
              id: data.user.id,
              username: usernameInput.trim(),
              email: emailInput.trim(),
              total_xp: 100 // Seed initial registration XP
            });

          if (upsertErr) {
            console.error('Error creating profile entry:', upsertErr);
          }
        }
        
        // Success alert
        setEmailInput('');
        setUsernameInput('');
      }
    } catch (err) {
      console.error(err);
      setAuthError('Connection anomaly during uplink handshake.');
    } finally {
      setIsSyncing(false);
    }
  };

  // 1. Initial Profile State Loading
  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true);
        
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Supabase session fetch timed out')), 5000)
        );
        
        const { data: { session } } = await Promise.race([
          supabase.auth.getSession(),
          timeoutPromise
        ]);
        
        if (session?.user) {
          const profilePromise = supabase.from('users').select('*').eq('id', session.user.id).single();
          const { data: profile } = await Promise.race([
            profilePromise,
            timeoutPromise
          ]).catch(() => ({ data: null }));
          
          const activeUser = profile || session.user;
          setUser(activeUser);
          setXp(activeUser.total_xp || 0);

          const subsPromise = supabase.from('daily_drop_submissions').select('*').eq('user_id', session.user.id);
          const { data: subs } = await Promise.race([
            subsPromise,
            timeoutPromise
          ]).catch(() => ({ data: null }));
          
          if (subs) {
            setUserSubmissions(subs);
          }
        } else {
          // Check local storage for guest
          const guestJson = localStorage.getItem('clocked_audio_active_user');
          if (guestJson) {
            const guestUser = JSON.parse(guestJson);
            setUser(guestUser);
            setXp(guestUser.total_xp || 0);
            
            const localDbKey = 'clocked_audio_mock_db';
            const stored = localStorage.getItem(localDbKey);
            if (stored) {
              const dbData = JSON.parse(stored);
              const guestSubs = (dbData.daily_drop_submissions || []).filter(sub => sub.user_id === guestUser.id);
              setUserSubmissions(guestSubs);
            }
          }
        }
      } catch (err) {
        console.warn('Profile loading error or timeout:', err);
        // Fallback to local guest data
        const guestJson = localStorage.getItem('clocked_audio_active_user');
        if (guestJson) {
          setUser(JSON.parse(guestJson));
        }
      } finally {
        setLoading(false);
      }
    }
    loadProfile();

    // Subscribe to Auth updates
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        const activeUser = profile || session.user;
        setUser(activeUser);
        setXp(activeUser.total_xp || 0);

        const { data: subs } = await supabase
          .from('daily_drop_submissions')
          .select('*')
          .eq('user_id', session.user.id);
        if (subs) {
          setUserSubmissions(subs);
        }
      } else {
        const guestJson = localStorage.getItem('clocked_audio_active_user');
        if (guestJson) {
          const guestUser = JSON.parse(guestJson);
          setUser(guestUser);
          setXp(guestUser.total_xp || 0);
          
          const localDbKey = 'clocked_audio_mock_db';
          const stored = localStorage.getItem(localDbKey);
          if (stored) {
            const dbData = JSON.parse(stored);
            const guestSubs = (dbData.daily_drop_submissions || []).filter(sub => sub.user_id === guestUser.id);
            setUserSubmissions(guestSubs);
          }
        } else {
          setUser(null);
          setXp(0);
          setUserSubmissions([]);
        }
      }
    });

    // Storage change listener to synchronize custom events
    const syncMockAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();
        setUser(profile || session.user);
      } else {
        const guestJson = localStorage.getItem('clocked_audio_active_user');
        if (guestJson) {
          const guestUser = JSON.parse(guestJson);
          setUser(guestUser);
          setXp(guestUser.total_xp || 0);
          
          const localDbKey = 'clocked_audio_mock_db';
          const stored = localStorage.getItem(localDbKey);
          if (stored) {
            const dbData = JSON.parse(stored);
            const guestSubs = (dbData.daily_drop_submissions || []).filter(sub => sub.user_id === guestUser.id);
            setUserSubmissions(guestSubs);
          }
        } else {
          setUser(null);
        }
      }
    };
    window.addEventListener('storage', syncMockAuth);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('storage', syncMockAuth);
    };
  }, []);

  // Sync state values when user loads or updates
  useEffect(() => {
    if (user) {
      setEditFullName(user.full_name || user.username || '');
      setEditBio(user.bio || '');
      setEditSoundcloud(user.link_soundcloud || '');
      setEditSpotify(user.link_spotify || '');
      setEditTwitter(user.link_twitter || '');
      setEditInstagram(user.link_instagram || '');
    }
  }, [user]);

  // 2. Debounced Database Sync for the XP Progression Slider Override
  useEffect(() => {
    if (!user) return;
    
    // Don't trigger if XP state is identical to current user record (prevents initial load trigger)
    if (xp === user.total_xp) return;

    const delayDebounce = setTimeout(async () => {
      try {
        const freshProgress = getLevelAndProgress(xp);
        const updatedUser = {
          ...user,
          total_xp: xp,
          current_level: freshProgress.level,
          current_rank: freshProgress.rankName
        };

        if (user.is_guest) {
          setUser(updatedUser);
          localStorage.setItem('clocked_audio_active_user', JSON.stringify(updatedUser));
          window.dispatchEvent(new Event('storage'));
        } else {
          const { error } = await supabase
            .from('users')
            .update({ total_xp: xp })
            .eq('id', user.id);
          
          if (error) {
            console.error('Failed to sync XP slider with database:', error);
          } else {
            setUser(updatedUser);

            // Update active user in localStorage for instant sync
            if (typeof window !== 'undefined') {
              const activeUserJson = localStorage.getItem('clocked_audio_active_user');
              if (activeUserJson) {
                const parsed = JSON.parse(activeUserJson);
                if (parsed.id === user.id) {
                  localStorage.setItem('clocked_audio_active_user', JSON.stringify(updatedUser));
                  window.dispatchEvent(new Event('storage'));
                }
              }
            }
          }
        }
      } catch (e) {
        console.error(e);
      }
    }, 400); // 400ms debounce buffer to avoid rate-limiting

    return () => clearTimeout(delayDebounce);
  }, [xp, user]);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    if (!editFullName.trim() || !editBio.trim()) {
      setSaveError('Display Name and Biography Coordinates are mandatory.');
      return;
    }

    setSaveError('');
    setSaveSuccess(false);
    setIsSaving(true);

    try {
      const updates = {
        id: user.id,
        email: user.email || `${user.id}@clockedaudio.io`,
        username: user.user_metadata?.username || user.username || `producer_${user.id.substring(0,6)}`,
        full_name: editFullName.trim(),
        bio: editBio.trim(),
        link_soundcloud: editSoundcloud.trim(),
        link_spotify: editSpotify.trim(),
        link_twitter: editTwitter.trim(),
        link_instagram: editInstagram.trim(),
        updated_at: new Date().toISOString(),
      };

      if (user.is_guest) {
        const updatedUser = {
          ...user,
          ...updates
        };
        setUser(updatedUser);
        localStorage.setItem('clocked_audio_active_user', JSON.stringify(updatedUser));
        window.dispatchEvent(new Event('storage'));
        setSaveSuccess(true);
        setIsEditing(false);
      } else {
        const { data, error: updateErr } = await supabase
          .from('users')
          .upsert(updates)
          .select();

        if (updateErr) {
          setSaveError(updateErr.message || 'Failed to update cybernetic coordinates.');
        } else if (!data || data.length === 0) {
          setSaveError('Save failed: Row Level Security (RLS) is blocking the update. Please check your Supabase Policies.');
        } else {
          // Success!
          const updatedUser = { ...user, ...updates };
          setUser(updatedUser);
          setSaveSuccess(true);
          setIsEditing(false); // return to achievements page

          // Sync local storage in mock mode
          if (typeof window !== 'undefined') {
            const activeUserJson = localStorage.getItem('clocked_audio_active_user');
            if (activeUserJson) {
              const parsed = JSON.parse(activeUserJson);
              if (parsed.id === user.id) {
                localStorage.setItem('clocked_audio_active_user', JSON.stringify(updatedUser));
                // Dispatch storage event to notify components
                window.dispatchEvent(new Event('storage'));
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('Error during profile edit saving:', err);
      setSaveError('A connection anomaly occurred during profile updates.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisconnect = async () => {
    if (confirm('Disconnect neural interface and terminate current uploader session?')) {
      localStorage.removeItem('clocked_audio_active_user');
      setUser(null);
      setXp(0);
      setUserSubmissions([]);
      window.dispatchEvent(new Event('storage'));
      await supabase.auth.signOut();
      setIsEditing(false);
    }
  };

  const progress = getLevelAndProgress(xp);

  // Helper to map rank levels to badge style classes
  const getBadgeClass = (lvl) => {
    if (lvl < 5) return 'badge-bronze';
    if (lvl < 15) return 'badge-silver';
    if (lvl < 25) return 'badge-gold';
    if (lvl < 40) return 'badge-platinum';
    return 'badge-executive';
  };

  const getRankCategory = (lvl) => {
    if (lvl < 10) return 'Bronze Tier';
    if (lvl < 20) return 'Silver Tier';
    if (lvl < 30) return 'Gold Tier';
    if (lvl < 40) return 'Platinum Tier';
    return 'Grandmaster Tier';
  };

  if (loading) {
    return (
      <div style={styles.loadingWrapper}>
        <RefreshCw size={24} className="pulse-text animate-spin" />
        <span style={{ fontSize: '0.85rem', fontFamily: 'monospace', marginTop: '0.5rem' }}>
          SYNCHRONIZING STUDIO CONSOLE PROFILE...
        </span>
      </div>
    );
  }

  // Discord connection screen for unsigned users
  if (!user) {
    return (
      <div style={styles.landingWrapper}>
        <div className="glass-panel" style={styles.landingConsole}>
          <h1 style={styles.titleMain}>NEURAL UPLINK OFFLINE</h1>
          <p style={styles.landingDesc}>
            Connect your cybernetic profile coordinates to view your match MMR, rank progression metrics, stems flipped, and historical run accomplishments.
          </p>

          <div style={styles.authRequestCard}>
            {!useEmailAuth ? (
              <>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.65rem' }}>
                  <Terminal size={14} color="var(--accent-cyan)" />
                  <span style={styles.authTitle}>DISCORD NEURAL UPLINK REQUIRED</span>
                </div>
                <p style={styles.authDesc}>Establish your neural ID coordinates via Discord. This authorizes your uploader signature, prevents Sybil voting exploits, and tracks your global XP.</p>

                <button 
                  onClick={async () => {
                    setIsSyncing(true);
                    setAuthError('');
                    try {
                      await supabase.auth.signInWithOAuth({ provider: 'discord' });
                    } catch (e) {
                      setAuthError(e.message || 'Quantum handshake failure.');
                      setIsSyncing(false);
                    }
                  }}
                  className="btn-primary" 
                  style={{ 
                    width: '100%', 
                    justifyContent: 'center', 
                    background: 'linear-gradient(180deg, #5865F2 0%, #404eed 100%)', 
                    borderColor: '#5865F2',
                    boxShadow: '0 0 15px rgba(88, 101, 242, 0.45)',
                    color: '#ffffff',
                    marginTop: '0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem'
                  }}
                  disabled={isSyncing}
                >
                  <Disc size={16} style={{ animation: 'spin 4s linear infinite' }} />
                  <span>{isSyncing ? 'ESTABLISHING HANDSHAKE...' : 'CONNECT DISCORD UPLINK'}</span>
                </button>

                <button 
                  onClick={() => {
                    const defaultGuest = {
                      id: 'guest-producer',
                      username: 'guest_producer',
                      email: 'guest@clockedaudio.io',
                      full_name: 'Guest Producer',
                      bio: 'Testing the arena coordinates.',
                      discord_username: 'guest_producer',
                      discord_avatar_url: null,
                      total_xp: 120,
                      current_level: 1,
                      current_rank: 'Bedroom Producer (Bronze I)',
                      is_guest: true
                    };
                    localStorage.setItem('clocked_audio_active_user', JSON.stringify(defaultGuest));
                    setUser(defaultGuest);
                    window.dispatchEvent(new Event('storage'));
                  }}
                  className="btn-primary"
                  style={{
                    width: '100%',
                    justifyContent: 'center',
                    fontSize: '0.72rem',
                    fontFamily: 'var(--font-display)',
                    background: 'linear-gradient(180deg, #10b981 0%, #059669 100%)',
                    borderColor: '#10b981',
                    boxShadow: '0 0 15px rgba(16, 185, 129, 0.45)',
                    color: '#000000',
                    marginTop: '0.75rem',
                    fontWeight: 'bold'
                  }}
                >
                  [ ACTIVATE GUEST SANDBOX PLAYGROUND ]
                </button>

                <div style={{ display: 'flex', alignItems: 'center', margin: '1.25rem 0 0.75rem 0' }}>
                  <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.1)' }} />
                  <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', padding: '0 0.75rem', fontFamily: 'var(--font-mono)' }}>OR SECURE INTERFACE BYPASS</span>
                  <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.1)' }} />
                </div>

                <button 
                  onClick={() => {
                    setAuthError('');
                    setUseEmailAuth(true);
                  }}
                  className="btn-secondary"
                  style={{
                    width: '100%',
                    justifyContent: 'center',
                    fontSize: '0.68rem',
                    fontFamily: 'var(--font-mono)',
                    borderStyle: 'dashed',
                    borderColor: 'rgba(255, 166, 0, 0.35)'
                  }}
                  disabled={isSyncing}
                >
                  [ BROWSER BYPASS: EMAIL SANDBOX ]
                </button>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.65rem' }}>
                  <Terminal size={14} color="var(--accent-purple)" />
                  <span style={styles.authTitle}>DEVELOPER EMAIL SANDBOX UPLINK</span>
                </div>
                <p style={styles.authDesc}>Establish direct database credentials. Already existing email accounts will automatically be signed back in.</p>

                <form onSubmit={handleUplinkSubmit} style={styles.authForm}>
                  <div>
                    <input 
                      type="email" 
                      placeholder="EMAIL COORDINATES" 
                      className="lab-input"
                      style={styles.authInput}
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      required
                      disabled={isSyncing}
                    />
                  </div>
                  <div>
                    <input 
                      type="text" 
                      placeholder="STUDIO PRODUCER HANDLE" 
                      className="lab-input"
                      style={styles.authInput}
                      value={usernameInput}
                      onChange={(e) => setUsernameInput(e.target.value)}
                      required
                      disabled={isSyncing}
                    />
                  </div>

                  <button 
                    type="submit" 
                    className="btn-primary" 
                    style={styles.uplinkSubmitBtn}
                    disabled={isSyncing}
                  >
                    {isSyncing ? 'SYNCHRONIZING CYBER CHANNELS...' : 'ESTABLISH SECURE UPLINK'}
                  </button>
                </form>

                {authError && (
                  <div style={{ ...styles.authErrorAlert, marginTop: '0.75rem' }}>
                    <ShieldAlert size={14} style={{ flexShrink: 0 }} />
                    <span>{authError}</span>
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', margin: '1.25rem 0 0.75rem 0' }}>
                  <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.1)' }} />
                  <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', padding: '0 0.75rem', fontFamily: 'var(--font-mono)' }}>BACK TO NEURAL PORTAL</span>
                  <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.1)' }} />
                </div>

                <button 
                  onClick={() => {
                    setAuthError('');
                    setUseEmailAuth(false);
                  }}
                  className="btn-secondary"
                  style={{
                    width: '100%',
                    justifyContent: 'center',
                    fontSize: '0.68rem',
                    fontFamily: 'var(--font-mono)',
                  }}
                  disabled={isSyncing}
                >
                  [ RETURN TO DISCORD GATEWAY ]
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header Info */}
      <div style={styles.header}>
        <div>
          <span className="badge badge-executive">PRODUCER PROFILE</span>
          <h1 className="gradient-text" style={styles.title}>Studio Control Panel</h1>
          <p style={styles.subText}>Inspect your ranks, XP curve thresholds, hidden MMR, and match accomplishments.</p>
        </div>
        <div style={styles.securePulse}>
          <span style={styles.pulseDot}>●</span>
          <span style={styles.pulseText}>UPLINK_ESTABLISHED</span>
        </div>
      </div>

      <div style={styles.profileLayout}>
        {/* Left Side: Avatar & Progression Tracker */}
        <div className="glass-panel" style={styles.avatarCard}>
          <div style={styles.avatarContainer}>
            <div style={styles.avatarGlow} />
            <div style={styles.avatar}>
              {user.discord_avatar_url ? (
                <img 
                  src={user.discord_avatar_url} 
                  alt="Discord Avatar" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} 
                />
              ) : (
                <User size={50} color="#ffffff" />
              )}
            </div>
          </div>

          <div style={styles.userNames}>
            <h2 style={styles.username}>{user.full_name || user.username || 'Uploader'}</h2>
            <span style={styles.discordHandle}>@{user.discord_username || user.username}</span>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
              <div className={`badge ${getBadgeClass(progress.level)}`} style={{ fontSize: '0.65rem', fontWeight: 'bold', padding: '0.2rem 0.5rem' }}>
                LVL {progress.level}
              </div>
              <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--accent-green)' }}>{progress.rankName}</span>
            </div>
            <span style={styles.rankSub}>{getRankCategory(progress.level)}</span>
          </div>

          {/* Biography coordinates display */}
          <div style={styles.bioContainer}>
            <div style={styles.bioHeader}>
              <Terminal size={12} color="var(--accent-cyan)" />
              <span>BIOGRAPHY COORDINATES</span>
            </div>
            <p style={styles.bioText}>{user.bio || 'NO DESCRIPTION CONFIGURED. CLICK THE EDIT BUTTON BELOW TO INITIALIZE BIOGRAPHY COORDINATES.'}</p>
          </div>

          {/* Social connections */}
          <div style={styles.socialBadgesContainer}>
            <div style={styles.bioHeader}>
              <Link2 size={12} color="var(--accent-purple)" />
              <span>STUDIO UPLINKS</span>
            </div>
            {user.link_soundcloud && (
              <a href={user.link_soundcloud} target="_blank" rel="noopener noreferrer" style={styles.socialBadgeLink} className="social-badge soundcloud">
                <Disc size={12} color="#ff5500" />
                <span>SOUNDCLOUD</span>
                <ExternalLink size={10} style={{ marginLeft: 'auto', opacity: 0.5 }} />
              </a>
            )}
            {user.link_spotify && (
              <a href={user.link_spotify} target="_blank" rel="noopener noreferrer" style={styles.socialBadgeLink} className="social-badge spotify">
                <Music size={12} color="#1DB954" />
                <span>SPOTIFY</span>
                <ExternalLink size={10} style={{ marginLeft: 'auto', opacity: 0.5 }} />
              </a>
            )}
            {user.link_twitter && (
              <a href={user.link_twitter} target="_blank" rel="noopener noreferrer" style={styles.socialBadgeLink} className="social-badge twitter">
                <svg width="12" height="12" fill="#ffffff" viewBox="0 0 24 24" style={{ marginRight: '0.1rem' }}>
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
                <span>TWITTER / X</span>
                <ExternalLink size={10} style={{ marginLeft: 'auto', opacity: 0.5 }} />
              </a>
            )}
            {user.link_instagram && (
              <a href={user.link_instagram} target="_blank" rel="noopener noreferrer" style={styles.socialBadgeLink} className="social-badge instagram">
                <User size={12} color="#E1306C" />
                <span>INSTAGRAM</span>
                <ExternalLink size={10} style={{ marginLeft: 'auto', opacity: 0.5 }} />
              </a>
            )}
            {!user.link_soundcloud && !user.link_spotify && !user.link_twitter && !user.link_instagram && (
              <div style={styles.noSocials}>NO SOCIAL UPLINKS REGISTERED</div>
            )}
          </div>

          {/* Edit Profile Control Button */}
          <button 
            onClick={() => {
              setIsEditing(!isEditing);
              setSaveError('');
              setSaveSuccess(false);
            }}
            className="btn-secondary"
            style={{ 
              width: '100%', 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              gap: '0.5rem', 
              marginTop: '0.5rem',
              padding: '0.65rem',
              fontSize: '0.75rem',
              fontFamily: 'var(--font-sans)',
              fontWeight: 'bold',
              letterSpacing: '0.02em',
              borderColor: isEditing ? 'var(--accent-magenta)' : 'rgba(255,255,255,0.15)',
              boxShadow: isEditing ? '0 0 10px rgba(255, 0, 127, 0.2)' : 'none'
            }}
          >
            <Edit3 size={14} color={isEditing ? 'var(--accent-magenta)' : 'var(--accent-cyan)'} />
            <span>{isEditing ? 'CANCEL COORD EDIT' : 'EDIT CYBERNETIC PROFILE'}</span>
          </button>

          {/* Interactive XP progression slider */}
          <div style={styles.xpSliderSection}>
            <div style={styles.xpRow}>
              <span>CUMULATIVE EXPERIENCE:</span>
              <strong className="neon-text-green">{xp.toLocaleString()} XP</strong>
            </div>
            
            <input 
              type="range" 
              min="0" 
              max="200000" 
              step="50"
              value={xp} 
              onChange={(e) => setXp(parseInt(e.target.value, 10))}
              style={styles.slider} 
              id="xp-progression-slider"
            />
            <p style={styles.sliderHint}>← Drag slider to simulate XP and trigger automated rank promotions! Auto-saved. →</p>

            <div style={styles.progressDataRow}>
              <span>Level Progress</span>
              <span>{progress.xpInCurrentLevel} / {progress.xpForNextLevel} XP ({progress.percentage}%)</span>
            </div>
            <div className="progress-track">
              <div className="progress-bar" style={{ width: `${progress.percentage}%` }} />
            </div>
          </div>

          {/* Terminate Uplink (Logout) */}
          <button 
            onClick={handleDisconnect}
            className="btn-secondary"
            style={{ 
              width: '100%', 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              gap: '0.5rem', 
              marginTop: '1rem',
              borderColor: 'rgba(255, 0, 127, 0.25)',
              color: 'var(--text-muted)'
            }}
          >
            <LogOut size={12} color="var(--accent-magenta)" />
            <span>TERMINATE NEURAL UPLINK</span>
          </button>
        </div>

        {/* Right Side: stats/history OR profile editor */}
        <div style={styles.detailsColumn}>
          {isEditing ? (
            /* CYBERNETIC PROFILE EDITOR PANEL */
            <div className="glass-panel" style={styles.editorPanel}>
              <div style={styles.editorHeader}>
                <Terminal size={16} color="var(--accent-purple)" />
                <h3 style={{ fontSize: '1.1rem', color: '#ffffff', letterSpacing: '0.04em', margin: 0 }}>CYBERNETIC COORD EDITOR</h3>
              </div>
              
              <form onSubmit={handleProfileUpdate} style={styles.editorForm}>
                {/* Display Name */}
                <div style={styles.editorInputGroup}>
                  <div style={styles.labelRow}>
                    <label style={styles.editorLabel}>DISPLAY NAME / PRODUCER HANDLE</label>
                    <span style={styles.charLimit}>{editFullName.length}/30</span>
                  </div>
                  <div style={styles.inputWrapper}>
                    <User size={16} style={styles.inputIcon} color="var(--accent-cyan)" />
                    <input 
                      type="text" 
                      placeholder="e.g. Synth Assassin" 
                      className="lab-input" 
                      style={styles.inputWithIcon}
                      value={editFullName}
                      onChange={(e) => setEditFullName(e.target.value)}
                      maxLength={30}
                      required
                      disabled={isSaving}
                    />
                  </div>
                </div>

                {/* Biography */}
                <div style={styles.editorInputGroup}>
                  <div style={styles.labelRow}>
                    <label style={styles.editorLabel}>BIOGRAPHY / SYNTHESIS COORDINATES</label>
                    <span style={styles.charLimit}>{editBio.length}/250</span>
                  </div>
                  <textarea 
                    placeholder="Introduce your sound profile. Ableton operator? 808 specialist? Describe your hardware or digital DAW coordinates..." 
                    className="lab-input" 
                    style={styles.textarea}
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    maxLength={250}
                    required
                    rows={4}
                    disabled={isSaving}
                  />
                </div>

                {/* Social URL connections */}
                <div style={styles.editorSocialsContainer}>
                  <div style={styles.editorSocialsHeader}>
                    <Link2 size={14} color="var(--accent-purple)" />
                    <span style={styles.editorSocialsTitle}>STUDIO NETWORKING COORDINATES</span>
                  </div>

                  <div style={styles.editorSocialsGrid}>
                    <div style={styles.editorInputGroup}>
                      <label style={styles.editorSubLabel}>SOUNDCLOUD URL</label>
                      <input 
                        type="url" 
                        placeholder="https://soundcloud.com/..." 
                        className="lab-input" 
                        style={styles.editorSocialInput}
                        value={editSoundcloud}
                        onChange={(e) => setEditSoundcloud(e.target.value)}
                        disabled={isSaving}
                      />
                    </div>

                    <div style={styles.editorInputGroup}>
                      <label style={styles.editorSubLabel}>SPOTIFY ARTIST URL</label>
                      <input 
                        type="url" 
                        placeholder="https://open.spotify.com/artist/..." 
                        className="lab-input" 
                        style={styles.editorSocialInput}
                        value={editSpotify}
                        onChange={(e) => setEditSpotify(e.target.value)}
                        disabled={isSaving}
                      />
                    </div>

                    <div style={styles.editorInputGroup}>
                      <label style={styles.editorSubLabel}>TWITTER / X URL</label>
                      <input 
                        type="url" 
                        placeholder="https://x.com/..." 
                        className="lab-input" 
                        style={styles.editorSocialInput}
                        value={editTwitter}
                        onChange={(e) => setEditTwitter(e.target.value)}
                        disabled={isSaving}
                      />
                    </div>

                    <div style={styles.editorInputGroup}>
                      <label style={styles.editorSubLabel}>INSTAGRAM URL</label>
                      <input 
                        type="url" 
                        placeholder="https://instagram.com/..." 
                        className="lab-input" 
                        style={styles.editorSocialInput}
                        value={editInstagram}
                        onChange={(e) => setEditInstagram(e.target.value)}
                        disabled={isSaving}
                      />
                    </div>
                  </div>
                </div>

                {saveError && (
                  <div style={styles.errorAlert}>
                    <ShieldAlert size={14} style={{ flexShrink: 0 }} />
                    <span>{saveError}</span>
                  </div>
                )}

                <div style={styles.editorActionsRow}>
                  <button 
                    type="button" 
                    className="btn-secondary" 
                    onClick={() => setIsEditing(false)}
                    disabled={isSaving}
                    style={styles.editorCancelBtn}
                  >
                    CANCEL
                  </button>
                  <button 
                    type="submit" 
                    className="btn-primary" 
                    disabled={isSaving}
                    style={styles.editorSubmitBtn}
                  >
                    {isSaving ? 'TRANSMITTING ENCODED SAVES...' : 'SAVE CONFIGURATION'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* STATS & HISTORICAL RUN ACCOMPLISHMENTS */
            <>
              {/* Main stats block */}
              <div className="grid-3">
                <div className="glass-card" style={styles.statBox}>
                  <TrendingUp size={24} color="var(--accent-cyan)" />
                  <div>
                    <h4 style={styles.statVal}>{xp.toLocaleString()}</h4>
                    <p style={styles.statLabel}>Total XP</p>
                  </div>
                </div>
                <div className="glass-card" style={styles.statBox}>
                  <Music size={24} color="var(--accent-purple)" />
                  <div>
                    <h4 style={styles.statVal}>{userSubmissions.length}</h4>
                    <p style={styles.statLabel}>Stems Flipped</p>
                  </div>
                </div>
                <div className="glass-card" style={styles.statBox}>
                  <Award size={24} color="var(--accent-green)" />
                  <div>
                    <h4 style={styles.statVal}>{progress.level}</h4>
                    <p style={styles.statLabel}>Current Level</p>
                  </div>
                </div>
              </div>

              {/* Past battles feed */}
              <div className="glass-card" style={styles.historyCard}>
                <div style={styles.historyHeader}>
                  <Shield size={18} color="var(--accent-purple)" />
                  <h3 style={{ fontSize: '1.1rem', color: '#ffffff' }}>Historical Run Accomplishments</h3>
                </div>

                <div className="data-table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Battle Type</th>
                        <th>Date / Room</th>
                        <th>DAW Key</th>
                        <th>Placement</th>
                        <th>XP Gained</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Dynamic user actual submissions listed at the top */}
                      {userSubmissions.length > 0 ? (
                        userSubmissions.map((sub, index) => (
                          <tr key={sub.id || index}>
                            <td>Daily Drop</td>
                            <td style={{ fontFamily: 'monospace' }}>
                              {sub.created_at ? new Date(sub.created_at).toLocaleDateString() : 'Recent'}
                            </td>
                            <td>F# Minor</td>
                            <td>
                              <span style={{ color: 'var(--accent-cyan)', fontWeight: 'bold', fontSize: '0.8rem' }}>
                                ⚡ Active Judging
                              </span>
                            </td>
                            <td style={{ color: 'var(--accent-green)', fontWeight: 'bold' }}>+100 XP</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                            No past drops found. Enter the arena to secure your first accomplishment.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Special weekend tournament alert */}
                <div style={styles.bpPassAlert}>
                  <Sparkles size={16} color="var(--accent-cyan)" />
                  <div style={styles.bpAlertTexts}>
                    <h4 style={{ fontSize: '0.82rem', fontWeight: 'bold', color: '#ffffff' }}>
                      Upgrade to Battle Pass Pro
                    </h4>
                    <p style={{ fontSize: '0.72rem', color: '#a0a5b5', lineHeight: 1.35, marginTop: '0.1rem' }}>
                      Unlock entry into weekend ranked tournaments, access historic stems in The Vault, and view custom waveform comparison frequency metrics!
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem',
  },
  loadingWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
  },
  landingWrapper: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: 'calc(100vh - 120px)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '2rem 1rem',
  },
  landingConsole: {
    background: 'rgba(5, 5, 8, 0.95)',
    border: '3px solid var(--accent-cyan)',
    boxShadow: '0 0 30px rgba(255, 166, 0, 0.2)',
    padding: '3rem 2.5rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1.5rem',
    maxWidth: '560px',
    width: '100%',
    textAlign: 'center',
  },
  titleMain: {
    fontFamily: 'var(--font-display)',
    fontSize: '2rem',
    color: '#ffffff',
    textShadow: '0 0 12px rgba(255, 119, 0, 0.6), 0 0 24px rgba(255, 119, 0, 0.35)',
    letterSpacing: '0.05em',
    margin: '0',
    textAlign: 'center',
    lineHeight: '1.2',
  },
  landingDesc: {
    fontFamily: 'var(--font-sans)',
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    lineHeight: 1.5,
    margin: '0',
  },
  authRequestCard: {
    background: 'rgba(0, 0, 0, 0.4)',
    border: '2px solid rgba(255, 119, 0, 0.2)',
    padding: '1.25rem',
    width: '100%',
    textAlign: 'left',
  },
  authTitle: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.75rem',
    fontWeight: 'bold',
    color: 'var(--accent-cyan)',
    letterSpacing: '0.05em',
  },
  authDesc: {
    fontSize: '0.72rem',
    color: 'var(--text-secondary)',
    lineHeight: 1.4,
    marginBottom: '1rem',
  },
  authForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  authInput: {
    width: '100%',
    fontSize: '0.8rem',
    padding: '0.6rem 0.8rem',
  },
  uplinkSubmitBtn: {
    width: '100%',
    padding: '0.65rem',
    fontSize: '0.75rem',
  },
  authErrorAlert: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    background: 'rgba(255, 119, 0, 0.06)',
    border: '1.5px solid rgba(255, 119, 0, 0.2)',
    padding: '0.5rem 0.75rem',
    color: 'var(--accent-purple)',
    fontSize: '0.7rem',
    textAlign: 'left',
    lineHeight: 1.3,
    marginTop: '0.8rem',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '1.5rem',
    flexWrap: 'wrap',
  },
  title: {
    fontSize: '1.8rem',
    fontWeight: 800,
  },
  subText: {
    fontSize: '0.85rem',
    color: '#a0a5b5',
    marginTop: '0.2rem',
  },
  profileLayout: {
    display: 'grid',
    gridTemplateColumns: '320px 1fr',
    gap: '2.5rem',
    alignItems: 'start',
  },
  avatarCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1.2rem',
    padding: '2rem 1.5rem',
    textAlign: 'center',
  },
  avatarContainer: {
    position: 'relative',
    width: '90px',
    height: '90px',
    marginBottom: '0.5rem',
  },
  avatarGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    background: 'radial-gradient(circle, var(--accent-cyan-glow) 0%, transparent 75%)',
    animation: 'pulse 3s infinite ease-in-out',
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    background: '#181822',
    border: '2px solid rgba(255, 255, 255, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  levelBadge: {
    position: 'absolute',
    bottom: '-12px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 10,
    fontSize: '0.65rem',
    fontWeight: 800,
    padding: '0.25rem 0.6rem',
    whiteSpace: 'nowrap',
    boxShadow: '0 4px 6px rgba(0,0,0,0.5)',
  },
  userNames: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
    width: '100%',
  },
  username: {
    fontSize: '1.15rem',
    fontWeight: 800,
    color: '#ffffff',
    margin: 0,
    fontFamily: 'var(--font-sans)',
    letterSpacing: '0.02em',
  },
  discordHandle: {
    fontSize: '0.75rem',
    fontFamily: 'var(--font-mono)',
    color: '#8b94f6',
    fontWeight: 'bold',
    opacity: 0.8,
  },
  rankTitle: {
    fontSize: '0.88rem',
    fontWeight: 700,
    color: 'var(--accent-green)',
    letterSpacing: '0.02em',
    marginTop: '0.2rem',
  },
  rankSub: {
    fontSize: '0.72rem',
    fontWeight: 'bold',
    color: '#6c7284',
    textTransform: 'uppercase',
  },
  bioContainer: {
    background: 'rgba(0, 0, 0, 0.35)',
    border: '1.5px solid rgba(255, 166, 0, 0.15)',
    padding: '1rem',
    textAlign: 'left',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  bioHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    fontSize: '0.65rem',
    fontFamily: 'var(--font-mono)',
    color: 'var(--accent-cyan)',
    fontWeight: 'bold',
    letterSpacing: '0.04em',
  },
  bioText: {
    fontSize: '0.78rem',
    color: 'var(--text-secondary)',
    lineHeight: 1.45,
    margin: 0,
    fontFamily: 'var(--font-sans)',
    whiteSpace: 'pre-wrap',
  },
  socialBadgesContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.6rem',
    width: '100%',
    textAlign: 'left',
  },
  socialBadgeLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    padding: '0.55rem 0.75rem',
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1.5px solid rgba(255, 255, 255, 0.08)',
    fontSize: '0.7rem',
    fontFamily: 'var(--font-mono)',
    fontWeight: 'bold',
    color: '#ffffff',
    textDecoration: 'none',
    letterSpacing: '0.02em',
    transition: 'all 0.2s ease',
  },
  noSocials: {
    fontSize: '0.68rem',
    color: 'var(--text-muted)',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: '0.5rem',
    background: 'rgba(255,255,255,0.01)',
    border: '1px dashed rgba(255,255,255,0.08)',
  },
  xpSliderSection: {
    width: '100%',
    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
    paddingTop: '1.25rem',
    textAlign: 'left',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  xpRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.72rem',
    fontFamily: 'var(--font-mono)',
  },
  slider: {
    width: '100%',
    WebkitAppearance: 'none',
    appearance: 'none',
    height: '6px',
    background: '#1d1d27',
    outline: 'none',
    borderRadius: '0px',
    cursor: 'pointer',
  },
  sliderHint: {
    fontSize: '0.62rem',
    color: '#6c7284',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 1.3,
  },
  progressDataRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.72rem',
    fontWeight: 800,
    color: '#a0a5b5',
  },
  detailsColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem',
  },
  statBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.25rem',
  },
  statVal: {
    fontSize: '1.6rem',
    fontFamily: 'Space Grotesk, sans-serif',
    fontWeight: 800,
    lineHeight: 1,
    color: '#ffffff',
  },
  statLabel: {
    fontSize: '0.78rem',
    color: '#a0a5b5',
    marginTop: '0.2rem',
  },
  historyCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  historyHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    paddingBottom: '1rem',
  },
  bpPassAlert: {
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'flex-start',
    background: 'rgba(255, 119, 0, 0.03)',
    border: '2px solid rgba(255, 119, 0, 0.25)',
    borderRadius: '0px',
    padding: '1rem',
    marginTop: '0.5rem',
  },
  bpAlertTexts: {
    flex: 1,
    textAlign: 'left',
  },
  securePulse: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
  },
  pulseDot: {
    color: 'var(--accent-green)',
    fontSize: '0.52rem',
    textShadow: '0 0 5px var(--accent-green)',
    animation: 'pulse 1.5s infinite ease-in-out',
  },
  pulseText: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.62rem',
    color: 'var(--accent-green)',
  },
  /* Editor specific styles */
  editorPanel: {
    background: 'rgba(5, 5, 8, 0.98)',
    border: '3px solid var(--accent-purple)',
    boxShadow: '0 0 35px rgba(255, 119, 0, 0.25)',
    padding: '2.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    width: '100%',
    textAlign: 'left',
  },
  editorHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.65rem',
    borderBottom: '1.5px solid rgba(255, 119, 0, 0.15)',
    paddingBottom: '1rem',
  },
  editorForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  editorInputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.45rem',
    textAlign: 'left',
  },
  labelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  editorLabel: {
    fontSize: '0.72rem',
    color: 'var(--accent-cyan)',
    fontWeight: 'bold',
    letterSpacing: '0.04em',
  },
  charLimit: {
    fontSize: '0.65rem',
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-mono)',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: '0.85rem',
    pointerEvents: 'none',
  },
  inputWithIcon: {
    width: '100%',
    paddingLeft: '2.5rem',
  },
  textarea: {
    width: '100%',
    minHeight: '80px',
    resize: 'none',
    lineHeight: 1.4,
  },
  editorSocialsContainer: {
    background: 'rgba(255, 255, 255, 0.01)',
    border: '1.5px solid rgba(255, 119, 0, 0.15)',
    padding: '1.25rem',
    marginTop: '0.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  editorSocialsHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    borderBottom: '1px solid rgba(255, 119, 0, 0.1)',
    paddingBottom: '0.5rem',
    textAlign: 'left',
  },
  editorSocialsTitle: {
    fontSize: '0.68rem',
    fontFamily: 'var(--font-mono)',
    color: 'var(--accent-purple)',
    fontWeight: 'bold',
    letterSpacing: '0.04em',
  },
  editorSocialsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem',
  },
  editorSubLabel: {
    fontSize: '0.62rem',
    color: 'var(--text-secondary)',
    fontWeight: 'bold',
  },
  editorSocialInput: {
    fontSize: '0.78rem',
    padding: '0.5rem 0.65rem',
  },
  errorAlert: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    background: 'rgba(255, 119, 0, 0.06)',
    border: '1.5px solid rgba(255, 119, 0, 0.2)',
    padding: '0.65rem 0.85rem',
    color: 'var(--accent-purple)',
    fontSize: '0.72rem',
    lineHeight: 1.35,
  },
  editorActionsRow: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'flex-end',
    marginTop: '1rem',
  },
  editorCancelBtn: {
    padding: '0.65rem 1.5rem',
    fontSize: '0.75rem',
  },
  editorSubmitBtn: {
    padding: '0.65rem 1.5rem',
    fontSize: '0.75rem',
    background: 'linear-gradient(180deg, var(--accent-purple) 0%, var(--accent-magenta) 100%)',
    borderColor: 'var(--accent-purple)',
    boxShadow: '0 0 15px rgba(255, 166, 0, 0.3)',
    color: '#ffffff',
  }
};
