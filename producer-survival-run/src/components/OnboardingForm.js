'use client';

import React, { useState } from 'react';
import { Terminal, ShieldAlert, CheckCircle2, User, Link2, Disc } from 'lucide-react';
import { supabase } from '../utils/supabaseClient';

export default function OnboardingForm({ user, onComplete }) {
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [soundcloud, setSoundcloud] = useState('');
  const [spotify, setSpotify] = useState('');
  const [twitter, setTwitter] = useState('');
  const [instagram] = useState(''); // Instagram is optional, we will include the state
  const [instaInput, setInstaInput] = useState(''); // Keep input state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fullName.trim() || !bio.trim()) {
      setError('Display Name and Biography Coordinates are mandatory to initialize uplink.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const updates = {
        id: user.id,
        email: user.email || `${user.id}@clockedaudio.io`,
        username: user.user_metadata?.username || user.username || `producer_${user.id.substring(0,6)}`,
        full_name: fullName.trim(),
        bio: bio.trim(),
        link_soundcloud: soundcloud.trim(),
        link_spotify: spotify.trim(),
        link_twitter: twitter.trim(),
        link_instagram: instaInput.trim(),
        updated_at: new Date().toISOString(),
      };

      const { data, error: updateErr } = await supabase
        .from('users')
        .upsert(updates)
        .select();

      if (updateErr) {
        setError(updateErr.message || 'Failed to update cybernetic signature coordinates.');
      } else if (!data || data.length === 0) {
        setError('Save failed: Row Level Security (RLS) is blocking the update. Please check your Supabase Policies.');
      } else {
        // Success! Call complete callback
        const updatedUser = { ...user, ...updates };
        
        // Also update local storage if mock mode
        if (typeof window !== 'undefined') {
          const activeUserJson = localStorage.getItem('clocked_audio_active_user');
          if (activeUserJson) {
            const parsed = JSON.parse(activeUserJson);
            if (parsed.id === user.id) {
              localStorage.setItem('clocked_audio_active_user', JSON.stringify(updatedUser));
              // Dispatch event to update Navigation component state
              window.dispatchEvent(new Event('storage'));
            }
          }
        }
        
        if (onComplete) {
          onComplete(updatedUser);
        }
      }
    } catch (err) {
      console.error('Error during onboarding submission:', err);
      setError('A fatal uplink anomaly occurred during handshake transit.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="glass-panel" style={styles.container}>
      {/* Discord uplink status banner */}
      <div style={styles.discordHeader}>
        <div style={styles.discordInfo}>
          {user.discord_avatar_url ? (
            <img src={user.discord_avatar_url} alt="Discord avatar" style={styles.discordAvatar} />
          ) : (
            <div style={styles.discordAvatarPlaceholder}>
              <Disc size={16} color="#ffffff" />
            </div>
          )}
          <div>
            <span style={styles.discordBadge}>DISCORD COORDINATES CONNECTED</span>
            <div style={styles.discordName}>{user.discord_username || user.username || 'Discord User'}</div>
          </div>
        </div>
        <div style={styles.securePulse}>
          <span style={styles.pulseDot}>●</span>
          <span style={styles.pulseText}>SECURE_UPLINK</span>
        </div>
      </div>

      <div style={styles.titleSection}>
        <h2 style={styles.title}>INITIALIZE CYBERNETIC PROFILE</h2>
        <p style={styles.subtitle}>Complete your profile registry to unlock the Daily Drop combat arena, participate in loop flips, and enable swipe voting capabilities.</p>
      </div>

      <form onSubmit={handleSubmit} style={styles.form}>
        {/* display name */}
        <div style={styles.inputGroup}>
          <div style={styles.labelRow}>
            <label style={styles.label}>DISPLAY NAME / PRODUCER HANDLE</label>
            <span style={styles.charLimit}>{fullName.length}/30</span>
          </div>
          <div style={styles.inputWrapper}>
            <User size={16} style={styles.inputIcon} color="var(--accent-cyan)" />
            <input 
              type="text" 
              placeholder="e.g. Synth Assassin" 
              className="lab-input" 
              style={styles.inputWithIcon}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              maxLength={30}
              required
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* bio */}
        <div style={styles.inputGroup}>
          <div style={styles.labelRow}>
            <label style={styles.label}>BIOGRAPHY / SYNTHESIS COORDINATES</label>
            <span style={styles.charLimit}>{bio.length}/250</span>
          </div>
          <textarea 
            placeholder="Introduce your sound profile. Ableton operator? 808 specialist? Cyber synth manipulator? Describe your hardware or digital DAW coordinates..." 
            className="lab-input" 
            style={styles.textarea}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={250}
            required
            rows={4}
            disabled={isSubmitting}
          />
        </div>

        {/* socials section */}
        <div style={styles.socialsContainer}>
          <div style={styles.socialsHeader}>
            <Link2 size={14} color="var(--accent-purple)" />
            <span style={styles.socialsTitle}>STUDIO NETWORKING COORDINATES (OPTIONAL)</span>
          </div>

          <div style={styles.socialsGrid}>
            <div style={styles.inputGroup}>
              <label style={styles.subLabel}>SOUNDCLOUD URL</label>
              <input 
                type="url" 
                placeholder="https://soundcloud.com/..." 
                className="lab-input" 
                style={styles.socialInput}
                value={soundcloud}
                onChange={(e) => setSoundcloud(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.subLabel}>SPOTIFY ARTIST URL</label>
              <input 
                type="url" 
                placeholder="https://open.spotify.com/artist/..." 
                className="lab-input" 
                style={styles.socialInput}
                value={spotify}
                onChange={(e) => setSpotify(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.subLabel}>TWITTER / X URL</label>
              <input 
                type="url" 
                placeholder="https://x.com/..." 
                className="lab-input" 
                style={styles.socialInput}
                value={twitter}
                onChange={(e) => setTwitter(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.subLabel}>INSTAGRAM URL</label>
              <input 
                type="url" 
                placeholder="https://instagram.com/..." 
                className="lab-input" 
                style={styles.socialInput}
                value={instaInput}
                onChange={(e) => setInstaInput(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>
        </div>

        {error && (
          <div style={styles.errorAlert}>
            <ShieldAlert size={14} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <button 
          type="submit" 
          className="btn-primary" 
          disabled={isSubmitting}
          style={styles.submitBtn}
        >
          <CheckCircle2 size={16} />
          <span>{isSubmitting ? 'ESTABLISHING CYBER HANDSHAKE...' : 'ACTIVATE NEURAL PROFILE'}</span>
        </button>
      </form>
    </div>
  );
}

const styles = {
  container: {
    background: 'rgba(5, 5, 8, 0.98)',
    border: '3px solid var(--accent-purple)',
    boxShadow: '0 0 35px rgba(255, 119, 0, 0.25)',
    padding: '2.5rem',
    maxWidth: '620px',
    width: '100%',
    margin: '0 auto',
  },
  discordHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'rgba(88, 101, 242, 0.08)',
    border: '1.5px solid rgba(88, 101, 242, 0.35)',
    padding: '0.85rem 1.25rem',
    marginBottom: '2rem',
  },
  discordInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.85rem',
  },
  discordAvatar: {
    width: '38px',
    height: '38px',
    borderRadius: '0%', // Sharp retro aesthetic
    border: '1.5px solid rgba(88, 101, 242, 0.6)',
  },
  discordAvatarPlaceholder: {
    width: '38px',
    height: '38px',
    background: '#5865F2',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1.5px solid rgba(88, 101, 242, 0.6)',
  },
  discordBadge: {
    fontSize: '0.52rem',
    fontFamily: 'var(--font-mono)',
    color: '#8b94f6',
    letterSpacing: '0.08em',
  },
  discordName: {
    fontSize: '0.95rem',
    fontWeight: 'bold',
    color: '#ffffff',
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
  titleSection: {
    marginBottom: '2rem',
  },
  title: {
    fontSize: '1.4rem',
    color: '#ffffff',
    textShadow: '0 0 10px var(--accent-purple-glow)',
    marginBottom: '0.6rem',
  },
  subtitle: {
    fontSize: '0.82rem',
    color: 'var(--text-secondary)',
    lineHeight: 1.45,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.45rem',
  },
  labelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
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
  socialsContainer: {
    background: 'rgba(255, 255, 255, 0.01)',
    border: '1.5px solid rgba(255, 166, 0, 0.15)',
    padding: '1.25rem',
    marginTop: '0.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  socialsHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    borderBottom: '1px solid rgba(255, 166, 0, 0.1)',
    paddingBottom: '0.5rem',
  },
  socialsTitle: {
    fontSize: '0.68rem',
    fontFamily: 'var(--font-mono)',
    color: 'var(--accent-purple)',
    fontWeight: 'bold',
    letterSpacing: '0.04em',
  },
  socialsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem',
  },
  subLabel: {
    fontSize: '0.62rem',
    color: 'var(--text-secondary)',
    fontWeight: 'bold',
  },
  socialInput: {
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
  submitBtn: {
    width: '100%',
    justifyContent: 'center',
    background: 'var(--accent-gradient)',
    borderColor: 'var(--accent-purple)',
    boxShadow: '0 0 15px var(--accent-purple-glow)',
    color: '#000000',
  }
};
