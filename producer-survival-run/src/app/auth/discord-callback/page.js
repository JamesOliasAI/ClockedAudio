'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { Terminal, ShieldAlert, CheckCircle2, RefreshCw, ArrowLeft, Disc } from 'lucide-react';
import { supabase } from '@/utils/supabaseClient';

function DiscordCallbackContent() {
  const [statusText, setStatusText] = useState('DECRYPTING NEURAL KEYPAD...');
  const [steps, setSteps] = useState([
    { label: 'RECEIVING HANDSHAKE SIGNAL', status: 'pending' },
    { label: 'VALIDATING DISCORD SECURE TOKEN', status: 'pending' },
    { label: 'ESTABLISHING DATABASE HANDSHAKE', status: 'pending' },
    { label: 'SYNCHRONIZING PRODUCTION VAULT', status: 'pending' },
  ]);
  const [errorMsg, setErrorMsg] = useState(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [redirectPath, setRedirectPath] = useState('/');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleCallback = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        const error = params.get('error');
        const email = params.get('email');
        const userId = params.get('user_id');
        const redirectTo = params.get('redirectTo') || '/';
        
        setRedirectPath(redirectTo);

        // Update step helper
        const updateStep = (index, status) => {
          setSteps(prev => {
            const copy = [...prev];
            copy[index].status = status;
            return copy;
          });
        };

        if (error) {
          setErrorMsg(decodeURIComponent(error));
          return;
        }

        // Case A: Successful Session Tokens present
        if (accessToken && refreshToken) {
          updateStep(0, 'success');
          setStatusText('SECURE ACCESS PACKETS DECODED...');

          // Step 1: Exchange session on client side
          updateStep(1, 'current');
          console.log('[Discord Client Callback] Handing over token session to Supabase client...');
          
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Supabase token exchange timed out')), 5000)
          );

          const { data, error: sessionErr } = await Promise.race([
            supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            }),
            timeoutPromise
          ]).catch(err => ({ data: null, error: err }));

          if (sessionErr) {
            console.error('[Discord Client Callback] Failed to set Supabase session:', sessionErr);
            updateStep(1, 'error');
            setErrorMsg(`Session synchronization failed: ${sessionErr.message}`);
            return;
          }

          updateStep(1, 'success');
          updateStep(2, 'current');
          setStatusText('NEURAL SIGNATURE SYNCED...');

          // Step 2: Fetch fully consolidated uploader profile row
          let activeUser = data?.user;
          if (!activeUser) {
            const { data: userData } = await Promise.race([
              supabase.auth.getUser(),
              timeoutPromise
            ]).catch(() => ({ data: null }));
            activeUser = userData?.user;
          }
          
          if (!activeUser) {
            updateStep(2, 'error');
            setErrorMsg('Auth server signed in but no user details returned or timed out.');
            return;
          }

          console.log('[Discord Client Callback] Syncing profile database row for:', activeUser.id);
          
          const profilePromise = supabase.from('users').select('*').eq('id', activeUser.id).single();
          const { data: profileRow, error: profileErr } = await Promise.race([
            profilePromise,
            timeoutPromise
          ]).catch(err => ({ data: null, error: err }));

          if (profileErr) {
            console.warn('[Discord Client Callback] Profile query returned warning or timed out:', profileErr);
          }

          updateStep(2, 'success');
          updateStep(3, 'current');
          setStatusText('PREPARING ARENA RE-ENTRY...');

          // Step 3: Populate local browser cache for immediate navigation updates
          const finalLocalUser = {
            ...activeUser,
            ...(profileRow || {}),
          };

          localStorage.setItem('clocked_audio_active_user', JSON.stringify(finalLocalUser));
          window.dispatchEvent(new Event('storage'));

          updateStep(3, 'success');
          setIsSuccess(true);
          setStatusText('UPLINK ESTABLISHED. WELCOME.');

          // Brief delay for cyberpunk visual immersion before clean redirect
          setTimeout(() => {
            window.location.href = redirectTo;
          }, 1500);

        } 
        // Case B: Sign-up succeeded but email confirmation is pending
        else if (email || userId) {
          updateStep(0, 'success');
          updateStep(1, 'error');
          setStatusText('CONFIRMATION GATEWAY REDIRECT...');
          setErrorMsg(
            'REGISTRATION STAGED. To secure your database saves, a verification email was issued. Please verify it and reconnect to gain access.'
          );
        } 
        // Case C: Absolute anomaly
        else {
          updateStep(0, 'error');
          setStatusText('SECURE DECRYPTION FAIL.');
          setErrorMsg('Anomalous callback parameters. No secure token payload detected.');
        }
      } catch (err) {
        console.error('[Discord Client Callback] Anomaly caught:', err);
        setErrorMsg('A critical exception occurred during token handoff compilation.');
      }
    };

    handleCallback();
  }, []);

  const handleReturn = () => {
    if (typeof window !== 'undefined') {
      window.location.href = redirectPath || '/';
    }
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.glowBg} />

      <div className="glass-panel" style={styles.card}>
        <div style={styles.cardHeader}>
          <div style={styles.logoGroup}>
            <Disc size={28} className="pulse-text" color="var(--accent-cyan)" />
            <span style={styles.title}>NEURAL DECRYPTION GATE</span>
          </div>
          <span style={styles.subText}>COORDINATES HANDSHAKE</span>
        </div>

        {errorMsg ? (
          <div style={styles.errorContainer}>
            <div style={styles.errorAlert}>
              <ShieldAlert size={20} color="var(--accent-purple)" style={{ flexShrink: 0 }} />
              <div style={styles.errorTexts}>
                <span style={styles.errorTitle}>DECRYPTION ANOMALY DETECTED</span>
                <p style={styles.errorBody}>{errorMsg}</p>
              </div>
            </div>

            <button 
              onClick={handleReturn}
              className="btn-primary" 
              style={styles.errorBtn}
            >
              <ArrowLeft size={16} />
              <span>RETURN TO LOBBY</span>
            </button>
          </div>
        ) : (
          <div style={styles.mainProgress}>
            <div style={styles.spinnerWrapper}>
              {isSuccess ? (
                <div style={styles.successPulse}>
                  <CheckCircle2 size={42} color="var(--accent-cyan)" />
                </div>
              ) : (
                <div style={styles.spinnerRing}>
                  <RefreshCw size={36} className="spin-slow" color="var(--accent-cyan)" />
                </div>
              )}
            </div>

            <div style={styles.statusBox}>
              <span style={styles.terminalLabel}>SYSTEM TERMINAL FEED:</span>
              <div style={styles.consoleText}>{statusText}</div>
            </div>

            {/* Visual Steps Tracker */}
            <div style={styles.stepsList}>
              {steps.map((step, idx) => (
                <div key={idx} style={styles.stepRow}>
                  <div style={styles.stepIndicator}>
                    {step.status === 'success' && <span style={{ color: 'var(--accent-cyan)' }}>[✓]</span>}
                    {step.status === 'current' && <span style={{ color: 'var(--accent-purple)' }} className="pulse-text">[&gt;]</span>}
                    {step.status === 'pending' && <span style={{ color: 'var(--text-muted)' }}>[ ]</span>}
                    {step.status === 'error' && <span style={{ color: 'var(--accent-purple)' }}>[!]</span>}
                  </div>
                  <span 
                    style={{ 
                      ...styles.stepLabel,
                      color: step.status === 'success' 
                        ? '#ffffff' 
                        : step.status === 'current'
                        ? 'var(--accent-purple)'
                        : 'var(--text-secondary)'
                    }}
                  >
                    {step.label}
                  </span>
                </div>
              ))}
            </div>

            <div style={styles.secureBadgeRow}>
              <span style={styles.pulseDot}>●</span>
              <span style={styles.secureText}>INTEGRITY SHIELD: LEVEL_3_CRYPTO_ACTIVE</span>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .spin-slow {
          animation: spin 3s linear infinite;
        }
      `}</style>
    </div>
  );
}

export default function DiscordCallbackPage() {
  return (
    <Suspense fallback={
      <div style={styles.wrapper}>
        <div style={styles.glowBg} />
        <div className="glass-panel" style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.logoGroup}>
              <Disc size={28} className="pulse-text" color="var(--accent-cyan)" />
              <span style={styles.title}>NEURAL DECRYPTION GATE</span>
            </div>
          </div>
          <div style={styles.mainProgress}>
            <div style={styles.spinnerWrapper}>
              <div style={styles.spinnerRing}>
                <RefreshCw size={36} className="spin-slow" color="var(--accent-cyan)" />
              </div>
            </div>
            <div style={styles.statusBox}>
              <span style={styles.terminalLabel}>SYSTEM TERMINAL FEED:</span>
              <div style={styles.consoleText}>INITIALIZING RUNTIME ENGINE...</div>
            </div>
          </div>
        </div>
      </div>
    }>
      <DiscordCallbackContent />
    </Suspense>
  );
}

const styles = {
  wrapper: {
    minHeight: '100vh',
    width: '100vw',
    position: 'fixed',
    top: 0,
    left: 0,
    zIndex: 99999,
    background: '#000000',
    color: '#ffffff',
    fontFamily: 'var(--font-sans)',
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
    backgroundImage: 'radial-gradient(circle at 50% 30%, rgba(255, 119, 0, 0.08) 0%, transparent 60%)',
    pointerEvents: 'none',
  },
  card: {
    width: '100%',
    maxWidth: '520px',
    background: 'rgba(5, 5, 8, 0.98)',
    border: '3px solid var(--accent-cyan)',
    boxShadow: '0 0 45px rgba(255, 119, 0, 0.35)',
    padding: '2.5rem',
    borderRadius: '0px',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '2px solid rgba(255, 166, 0, 0.25)',
    paddingBottom: '1.25rem',
    marginBottom: '2rem',
  },
  logoGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  title: {
    fontSize: '1.1rem',
    fontWeight: 'bold',
    fontFamily: 'var(--font-display)',
    letterSpacing: '0px',
  },
  subText: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.62rem',
    color: 'var(--text-muted)',
    letterSpacing: '0.05em',
  },
  mainProgress: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1.5rem',
  },
  spinnerWrapper: {
    height: '80px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinnerRing: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successPulse: {
    animation: 'pulse 1.5s infinite ease-in-out',
  },
  statusBox: {
    width: '100%',
    background: 'rgba(255, 119, 0, 0.05)',
    border: '1.5px solid rgba(255, 119, 0, 0.35)',
    padding: '1rem',
    borderRadius: '0px',
    textAlign: 'center',
  },
  terminalLabel: {
    display: 'block',
    fontSize: '0.58rem',
    fontFamily: 'var(--font-mono)',
    color: 'var(--text-muted)',
    letterSpacing: '0.04em',
    marginBottom: '0.4rem',
  },
  consoleText: {
    fontSize: '0.92rem',
    fontFamily: 'var(--font-mono)',
    fontWeight: 'bold',
    color: '#ffffff',
    textShadow: '0 0 8px rgba(255, 166, 0, 0.45)',
  },
  stepsList: {
    width: '100%',
    background: '#020204',
    border: '1px solid rgba(255, 166, 0, 0.15)',
    padding: '1.25rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  stepRow: {
    display: 'flex',
    gap: '0.85rem',
    alignItems: 'center',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.82rem',
  },
  stepIndicator: {
    fontWeight: 'bold',
    width: '24px',
  },
  stepLabel: {
    letterSpacing: '0.02em',
  },
  secureBadgeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    marginTop: '0.5rem',
  },
  pulseDot: {
    color: 'var(--accent-cyan)',
    fontSize: '0.52rem',
    textShadow: '0 0 5px var(--accent-cyan)',
  },
  secureText: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.62rem',
    color: 'var(--text-muted)',
  },
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    width: '100%',
  },
  errorAlert: {
    display: 'flex',
    gap: '1rem',
    background: 'rgba(255, 119, 0, 0.03)',
    border: '2px solid rgba(255, 119, 0, 0.15)',
    padding: '1.25rem',
    alignItems: 'flex-start',
  },
  errorTexts: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem',
  },
  errorTitle: {
    fontSize: '0.78rem',
    fontWeight: 'bold',
    fontFamily: 'var(--font-display)',
    color: 'var(--accent-purple)',
  },
  errorBody: {
    fontSize: '0.82rem',
    lineHeight: 1.4,
    color: 'var(--text-secondary)',
  },
  errorBtn: {
    width: '100%',
    justifyContent: 'center',
    background: '#040407',
    border: '2px solid rgba(255, 166, 0, 0.4)',
    color: '#ffffff',
  }
};
