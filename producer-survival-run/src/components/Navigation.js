'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Volume2, VolumeX, User, Disc } from 'lucide-react';
import { supabase } from '../utils/supabaseClient';

export default function Navigation() {
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // client-side initialization to prevent hydration mismatch
    const savedVol = localStorage.getItem('global-volume');
    const savedMute = localStorage.getItem('global-muted');
    
    let activeVol = 80;
    let activeMute = false;

    if (savedVol !== null) {
      activeVol = parseInt(savedVol, 10);
      setVolume(activeVol);
    }
    if (savedMute !== null) {
      activeMute = savedMute === 'true';
      setIsMuted(activeMute);
    }

    // Dispatch the initial audio state to any active listeners
    window.dispatchEvent(
      new CustomEvent('global-audio-change', {
        detail: { volume: activeVol, isMuted: activeMute }
      })
    );

    // Helper to merge session user with local profile
    const getEnrichedUser = (sessionUser) => {
      if (!sessionUser) return null;
      try {
        const localJson = localStorage.getItem('clocked_audio_active_user');
        if (localJson) {
          const localUser = JSON.parse(localJson);
          if (localUser.id === sessionUser.id) {
            return { ...sessionUser, ...localUser };
          }
        }
      } catch (e) {}
      return sessionUser;
    };

    // Initial auth check
    async function loadSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(getEnrichedUser(session.user));
        } else {
          // Check if guest user exists in localStorage
          const guestJson = localStorage.getItem('clocked_audio_active_user');
          if (guestJson) {
            const parsed = JSON.parse(guestJson);
            if (parsed.is_guest) {
              setUser(parsed);
            } else {
              setUser(null);
            }
          } else {
            setUser(null);
          }
        }
      } catch (err) {
        console.error('Navigation auth check failure:', err);
      }
    }
    loadSession();

    // Subscribe to auth state updates
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(getEnrichedUser(session.user));
      } else {
        const guestJson = localStorage.getItem('clocked_audio_active_user');
        if (guestJson) {
          const parsed = JSON.parse(guestJson);
          if (parsed.is_guest) {
            setUser(parsed);
          } else {
            setUser(null);
          }
        } else {
          setUser(null);
        }
      }
    });

    // Event listener for local storage changes in mock mode
    const syncMockAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
      } else {
        const guestJson = localStorage.getItem('clocked_audio_active_user');
        setUser(guestJson ? JSON.parse(guestJson) : null);
      }
    };
    window.addEventListener('storage', syncMockAuth);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('storage', syncMockAuth);
    };
  }, []);

  const handleConnectDiscord = async () => {
    await supabase.auth.signInWithOAuth({ 
      provider: 'discord',
      options: { redirectTo: window.location.origin }
    });
  };

  const handleMuteToggle = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    localStorage.setItem('global-muted', String(nextMuted));
    window.dispatchEvent(
      new CustomEvent('global-audio-change', {
        detail: { volume, isMuted: nextMuted }
      })
    );
  };

  const handleVolumeChange = (e) => {
    const nextVol = parseInt(e.target.value, 10);
    setVolume(nextVol);
    localStorage.setItem('global-volume', String(nextVol));
    
    // Auto-unmute when sliding volume up from 0 to enhance usability
    let nextMuted = isMuted;
    if (nextVol > 0 && isMuted) {
      nextMuted = false;
      setIsMuted(false);
      localStorage.setItem('global-muted', 'false');
    }
    
    window.dispatchEvent(
      new CustomEvent('global-audio-change', {
        detail: { volume: nextVol, isMuted: nextMuted }
      })
    );
  };

  return (
    <header style={styles.header}>
      <div style={styles.container}>
        {/* Column 1: Identity Widget leftArea */}
        <div style={styles.leftArea}>
          {user ? (
            <Link href="/profile" style={styles.profileWidgetLink}>
              <div style={styles.profileWidget}>
                <div style={styles.avatarMiniContainer}>
                  {user.discord_avatar_url ? (
                    <img src={user.discord_avatar_url} alt="Avatar" style={styles.avatarMini} />
                  ) : (
                    <div style={styles.avatarMiniPlaceholder}>
                      <User size={12} color="var(--accent-cyan)" />
                    </div>
                  )}
                  <div style={styles.statusDotActive}>●</div>
                </div>
                <div style={styles.widgetInfo}>
                  <span style={styles.widgetName}>{user.full_name || user.username || 'Uploader'}</span>
                  <span style={styles.widgetRank}>LVL {user.current_level || 1} • {user.current_rank || 'Bedroom Producer'}</span>
                </div>
              </div>
            </Link>
          ) : (
            <div style={styles.authWidget}>
              <div style={styles.statusDotOffline}>●</div>
              <span style={styles.offlineText}>OFFLINE</span>
              <button onClick={handleConnectDiscord} style={styles.connectWidgetBtn}>
                <Disc size={10} />
                CONNECT DISCORD
              </button>
            </div>
          )}
        </div>

        {/* Column 2: Logo Centered Dead Center */}
        <Link href="/" style={styles.logoLink}>
          <div style={styles.logoContainer}>
            <div style={styles.logoIcon}>⏵</div>
            <span style={styles.logoText}>CLOCKED_AUDIO</span>
          </div>
        </Link>

        {/* Column 3: Volume Controller Anchor Right */}
        <div style={styles.widgetContainer}>
          <div className="cyber-volume-container">
            <button 
              onClick={handleMuteToggle}
              style={{
                ...styles.muteButton,
                color: isMuted ? 'var(--accent-magenta)' : 'var(--accent-cyan)',
              }}
              title={isMuted ? "Unmute Diagnostics" : "Mute Diagnostics"}
            >
              {isMuted ? <VolumeX size={13} style={{ filter: 'drop-shadow(0 0 3px var(--accent-magenta))' }} /> : <Volume2 size={13} style={{ filter: 'drop-shadow(0 0 3px var(--accent-cyan))' }} />}
            </button>
            <input 
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={handleVolumeChange}
              className="cyber-volume-slider"
              title={`Diagnostic Volume: ${volume}%`}
            />
            <span style={styles.volText}>{volume}%</span>
          </div>
        </div>
      </div>
    </header>
  );
}

const styles = {
  header: {
    position: 'sticky',
    top: 0,
    zIndex: 1000,
    background: '#000000',
    borderBottom: '2.5px solid var(--accent-cyan)',
    padding: '0.5rem 1.5rem',
    boxShadow: '0 4px 20px rgba(255, 166, 0, 0.08)',
  },
  container: {
    maxWidth: '1280px',
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: '1fr auto 1fr',
    alignItems: 'center',
    gap: '1rem',
  },
  leftArea: {
    display: 'flex',
    alignItems: 'center',
  },
  profileWidgetLink: {
    textDecoration: 'none',
    color: 'inherit',
  },
  profileWidget: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    background: 'rgba(255, 119, 0, 0.03)',
    border: '1.5px solid rgba(255, 119, 0, 0.25)',
    padding: '0.25rem 0.5rem',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  avatarMiniContainer: {
    position: 'relative',
    width: '22px',
    height: '22px',
  },
  avatarMini: {
    width: '100%',
    height: '100%',
    borderRadius: '0%', // sharp cyber aesthetic
    border: '1px solid rgba(255, 119, 0, 0.5)',
  },
  avatarMiniPlaceholder: {
    width: '100%',
    height: '100%',
    background: '#0a0a0f',
    border: '1px solid rgba(255, 119, 0, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDotActive: {
    position: 'absolute',
    bottom: '-3px',
    right: '-3px',
    fontSize: '0.5rem',
    color: 'var(--accent-green)',
    textShadow: '0 0 4px var(--accent-green)',
  },
  widgetInfo: {
    display: 'flex',
    flexDirection: 'column',
    textAlign: 'left',
  },
  widgetName: {
    fontSize: '0.65rem',
    fontWeight: 'bold',
    color: '#ffffff',
    lineHeight: 1,
  },
  widgetRank: {
    fontSize: '0.52rem',
    color: 'var(--accent-cyan)',
    fontFamily: 'var(--font-mono)',
    marginTop: '0.1rem',
  },
  authWidget: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
  },
  statusDotOffline: {
    fontSize: '0.5rem',
    color: 'var(--accent-magenta)',
    textShadow: '0 0 4px var(--accent-magenta)',
  },
  offlineText: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.55rem',
    color: 'var(--text-muted)',
    letterSpacing: '0.05em',
  },
  connectWidgetBtn: {
    background: '#020204',
    border: '1.5px solid rgba(255, 166, 0, 0.35)',
    color: 'var(--accent-cyan)',
    padding: '0.2rem 0.5rem',
    fontSize: '0.58rem',
    fontFamily: 'var(--font-display)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.3rem',
    height: '22px',
    transition: 'all 0.15s ease',
  },
  logoLink: {
    textDecoration: 'none',
    color: 'inherit',
    justifySelf: 'center',
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
  },
  logoIcon: {
    fontSize: '0.8rem',
    color: 'var(--accent-cyan)',
    textShadow: '0 0 8px rgba(255, 166, 0, 0.6)',
    animation: 'pulse 2.5s infinite ease-in-out',
  },
  logoText: {
    fontFamily: 'var(--font-display)',
    fontWeight: 'normal',
    fontSize: '0.85rem',
    color: '#ffffff',
    textShadow: '0 0 8px rgba(255, 166, 0, 0.5)',
    letterSpacing: '0.05em',
  },
  widgetContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    justifySelf: 'end',
  },
  muteButton: {
    background: 'none',
    border: 'none',
    padding: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    outline: 'none',
    transition: 'color 0.15s ease',
  },
  volText: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.62rem',
    color: 'var(--accent-cyan)',
    minWidth: '24px',
    textAlign: 'right',
    fontWeight: 'bold',
    textShadow: '0 0 4px rgba(255, 119, 0, 0.3)',
  }
};

