'use client';

import React, { useState, useEffect } from 'react';
import { ThumbsUp, ThumbsDown, HelpCircle, Shuffle, Sparkles, AlertCircle, RefreshCw, Terminal, Disc, User, ShieldAlert } from 'lucide-react';
import WaveformPlayer from '../../components/WaveformPlayer';
import OnboardingForm from '../../components/OnboardingForm';
import { getWilsonScore } from '../../utils/gameScience';
import { supabase, isLiveMode } from '../../utils/supabaseClient';

export default function DailyFeed() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [votesCast, setVotesCast] = useState(0);
  const [loading, setLoading] = useState(true);

  // Active User Profile
  const [user, setUser] = useState(null);

  // Auth Form States for Email Sandbox Bypass
  const [useEmailAuth, setUseEmailAuth] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [authError, setAuthError] = useState('');

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
          await loadFeedData();
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
        
        setEmailInput('');
        setUsernameInput('');
        await loadFeedData();
      }
    } catch (err) {
      console.error(err);
      setAuthError('Connection anomaly during uplink handshake.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Submissions state
  const [beats, setBeats] = useState([]);

  // Load feed from database (or mock database client)
  const loadFeedData = async () => {
    try {
      setLoading(true);
      // 1. Get active user session
      const { data: { session } } = await supabase.auth.getSession();
      let activeUser = null;
      if (session?.user) {
        if (isLiveMode) {
          const { data: profile } = await supabase.from('users').select('*').eq('id', session.user.id).single();
          if (profile) {
            activeUser = { ...session.user, ...profile };
          } else {
            const newProfile = {
              id: session.user.id,
              username: session.user.user_metadata?.custom_claims?.global_name || session.user.user_metadata?.name || 'Producer_' + session.user.id.substring(0, 5),
              email: session.user.email,
              discord_username: session.user.user_metadata?.name,
              discord_avatar_url: session.user.user_metadata?.avatar_url,
              total_xp: 0,
              current_level: 1,
              current_rank: 'Bedroom Producer (Bronze I)'
            };
            const { error: insertErr } = await supabase.from('users').insert(newProfile);
            if (!insertErr) {
              activeUser = { ...session.user, ...newProfile };
            } else {
              activeUser = session.user;
            }
          }
        } else {
          activeUser = session.user;
        }
        setUser(activeUser);
        
        // Load user's vote count for today to resume XP tracking
        const { data: myVotes } = await supabase
          .from('daily_drop_votes')
          .select('*')
          .eq('voter_user_id', activeUser.id);
          
        if (myVotes) {
          setVotesCast(myVotes.length);
          setXpEarned(Math.min(myVotes.length, 10) * 10);
        }
      } else {
        // Fallback or auto-initialize guest user in localStorage
        let guestJson = localStorage.getItem('clocked_audio_active_user');
        if (!guestJson) {
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
          guestJson = JSON.stringify(defaultGuest);
        }
        activeUser = JSON.parse(guestJson);
        setUser(activeUser);

        // Load guest's vote count from localStorage mock database
        const localDbKey = 'clocked_audio_mock_db';
        let dbData = { users: [], daily_drops: [], daily_drop_submissions: [], daily_drop_votes: [] };
        if (typeof window !== 'undefined') {
          const stored = localStorage.getItem(localDbKey);
          if (stored) {
            dbData = JSON.parse(stored);
          }
        }
        const myVotes = dbData.daily_drop_votes ? dbData.daily_drop_votes.filter(v => v.voter_user_id === activeUser.id) : [];
        setVotesCast(myVotes.length);
        setXpEarned(Math.min(myVotes.length, 10) * 10);
      }

      // 2. Fetch submissions
      const { data: subs } = await supabase.from('daily_drop_submissions').select('*');
      
      // 3. Fetch votes
      const { data: allVotes } = await supabase.from('daily_drop_votes').select('*');

      let finalSubs = subs;
      let finalVotes = allVotes;
      
      // Dual-mode safety check: if we got no data from live supabase, load from mock local database
      if (!finalSubs || finalSubs.length === 0) {
        console.log('[loadFeedData] Live database submissions empty or unavailable. Loading mock seed submissions...');
        const localDbKey = 'clocked_audio_mock_db';
        let dbData = { users: [], daily_drops: [], daily_drop_submissions: [], daily_drop_votes: [] };
        if (typeof window !== 'undefined') {
          const stored = localStorage.getItem(localDbKey);
          if (stored) {
            dbData = JSON.parse(stored);
          }
        }
        finalSubs = dbData.daily_drop_submissions || [];
        finalVotes = dbData.daily_drop_votes || [];
      }

      if (finalSubs) {
        const compiledBeats = finalSubs.map((sub, index) => {
          const subVotes = finalVotes ? finalVotes.filter(v => v.submission_id === sub.id) : [];
          const upvotes = subVotes.filter(v => v.is_upvote).length;
          const downvotes = subVotes.filter(v => !v.is_upvote).length;

          // Mask uploader details for anonymity as required
          return {
            id: sub.id,
            title: `Anonymous Flip #${index + 1}`,
            upvotes: upvotes,
            downvotes: downvotes,
            bpm: 140, // standard BPM
            key: 'F# Minor', // standard key
            audio_url: sub.audio_url || '/audio/sample1.mp3',
            user_id: sub.user_id
          };
        });

        // Filter out the uploader's own submission to prevent voting bias/cheating!
        const filteredBeats = activeUser 
          ? compiledBeats.filter(b => b.user_id !== activeUser.id)
          : compiledBeats;

        setBeats(filteredBeats.length > 0 ? filteredBeats : compiledBeats);
      }
    } catch (err) {
      console.error('Error fetching swipe arena feed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeedData();

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
          const parsed = JSON.parse(guestJson);
          setUser(parsed);
          
          // Refresh vote counters for guest
          const localDbKey = 'clocked_audio_mock_db';
          let dbData = { users: [], daily_drops: [], daily_drop_submissions: [], daily_drop_votes: [] };
          if (typeof window !== 'undefined') {
            const stored = localStorage.getItem(localDbKey);
            if (stored) {
              dbData = JSON.parse(stored);
            }
          }
          const myVotes = dbData.daily_drop_votes ? dbData.daily_drop_votes.filter(v => v.voter_user_id === parsed.id) : [];
          setVotesCast(myVotes.length);
          setXpEarned(Math.min(myVotes.length, 10) * 10);
        }
      }
    };
    window.addEventListener('storage', syncMockAuth);

    return () => {
      window.removeEventListener('storage', syncMockAuth);
    };
  }, []);

  const activeBeat = beats[currentIndex];

  const handleVote = async (isUpvote) => {
    if (!activeBeat) return;
    
    if (!user) {
      alert('Uplink credentials required! Connect your profile on the main landing room to register swipes.');
      return;
    }

    try {
      // Intercept if guest to prevent live PostgreSQL foreign-key constraint violations on auth tables
      if (user.is_guest) {
        console.log('[handleVote] Guest voter detected. Simulating swipe and local XP award...');
        
        // 1. Insert vote in local localStorage mock database
        const localDbKey = 'clocked_audio_mock_db';
        let dbData = { users: [], daily_drops: [], daily_drop_submissions: [], daily_drop_votes: [] };
        if (typeof window !== 'undefined') {
          const stored = localStorage.getItem(localDbKey);
          if (stored) {
            dbData = JSON.parse(stored);
          }
        }
        
        // Check if already voted
        const alreadyVoted = dbData.daily_drop_votes?.some(
          v => v.submission_id === activeBeat.id && v.voter_user_id === user.id
        );
        
        if (alreadyVoted) {
          alert('You have already casted a vote for this specific audio node.');
        } else {
          const voteId = `vote-${Math.floor(Math.random() * 10000)}`;
          const newVote = {
            id: voteId,
            submission_id: activeBeat.id,
            voter_user_id: user.id,
            is_upvote: isUpvote,
            created_at: new Date().toISOString()
          };
          if (!dbData.daily_drop_votes) dbData.daily_drop_votes = [];
          dbData.daily_drop_votes.push(newVote);
          
          // Award XP locally
          const currentVotes = dbData.daily_drop_votes.filter(v => v.voter_user_id === user.id).length;
          if (currentVotes <= 10) {
            const newXP = (user.total_xp || 0) + 10;
            const updatedUser = {
              ...user,
              total_xp: newXP,
              current_level: Math.floor(newXP / 500) + 1
            };
            
            // Save updated user
            if (!dbData.users) dbData.users = [];
            const uIdx = dbData.users.findIndex(u => u.id === user.id);
            if (uIdx !== -1) {
              dbData.users[uIdx] = updatedUser;
            } else {
              dbData.users.push(updatedUser);
            }
            
            localStorage.setItem('clocked_audio_active_user', JSON.stringify(updatedUser));
            setUser(updatedUser);
            setXpEarned(Math.min(currentVotes, 10) * 10);
          }
          setVotesCast(currentVotes);
          
          // Update beats array state locally
          setBeats(prev => prev.map(b => {
            if (b.id === activeBeat.id) {
              return {
                ...b,
                upvotes: isUpvote ? b.upvotes + 1 : b.upvotes,
                downvotes: !isUpvote ? b.downvotes + 1 : b.downvotes
              };
            }
            return b;
          }));
        }
        
        localStorage.setItem(localDbKey, JSON.stringify(dbData));
        window.dispatchEvent(new Event('storage'));
        
        // Slide next
        if (currentIndex < beats.length - 1) {
          setCurrentIndex((prev) => prev + 1);
        } else {
          alert("You have reached the end of today's Daily Drop anonymous feed! Keep voting to gain predict-bonuses!");
          setCurrentIndex(0); // Loop back
        }
        return;
      }

      // 1. Insert vote in database (Supabase / local fallback)
      const voteId = `vote-${Math.floor(Math.random() * 10000)}`;
      const votePayload = {
        id: isLiveMode ? undefined : voteId,
        submission_id: activeBeat.id,
        voter_user_id: user.id,
        is_upvote: isUpvote
      };

      const { error: voteErr } = await supabase
        .from('daily_drop_votes')
        .insert(votePayload);

      if (voteErr) {
        console.error('Error casting vote:', voteErr);
        // If unique constraint triggers (already voted), slide next
        alert('You have already casted a vote for this specific audio node.');
      } else {
        // 2. Award voter XP (+10 XP per vote, capped at 10 votes, max 100 XP)
        if (votesCast < 10) {
          const newXP = (user.total_xp || 0) + 10;
          const { error: xpErr } = await supabase
            .from('users')
            .update({ total_xp: newXP })
            .eq('id', user.id);
            
          if (xpErr) {
            console.error('Failed to increment voter XP:', xpErr);
          } else {
            setXpEarned((prev) => prev + 10);
            // Refresh local user state
            setUser(prev => ({ ...prev, total_xp: newXP }));
          }
        }
        setVotesCast((prev) => prev + 1);

        // Update local array counts so leaderboard updates dynamically
        setBeats(prev => prev.map(b => {
          if (b.id === activeBeat.id) {
            return {
              ...b,
              upvotes: isUpvote ? b.upvotes + 1 : b.upvotes,
              downvotes: !isUpvote ? b.downvotes + 1 : b.downvotes
            };
          }
          return b;
        }));
      }

      // 3. Slide next
      if (currentIndex < beats.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        alert("You have reached the end of today's Daily Drop anonymous feed! Keep voting to gain predict-bonuses!");
        setCurrentIndex(0); // Loop back
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getSortedBeatsByWilson = () => {
    return [...beats].sort((a, b) => {
      const scoreA = getWilsonScore(a.upvotes, a.downvotes);
      const scoreB = getWilsonScore(b.upvotes, b.downvotes);
      return scoreB - scoreA;
    });
  };

  return (
    <div style={styles.container}>
      {loading ? (
        <div style={styles.loadingWrapper}>
          <RefreshCw size={24} className="pulse-text animate-spin" />
          <span style={{ fontSize: '0.85rem', fontFamily: 'monospace', marginTop: '0.5rem' }}>SYNCHRONIZING FEED FLIPS DATA...</span>
        </div>
      ) : !user ? (
        /* DISCORD CONNECT GATE */
        <div style={{ display: 'flex', minHeight: 'calc(100vh - 200px)', justifyContent: 'center', alignItems: 'center', padding: '2rem 1rem', width: '100%' }}>
          <div className="glass-panel" style={{
            background: 'rgba(5, 5, 8, 0.95)',
            border: '3px solid var(--accent-magenta)',
            boxShadow: '0 0 30px rgba(255, 119, 0, 0.2)',
            padding: '3rem 2.5rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1.5rem',
            maxWidth: '560px',
            width: '100%',
            textAlign: 'center',
          }}>
            <span className="badge badge-executive">SWIPE FEED COORDINATES LOCKED</span>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: '#ffffff', textShadow: '0 0 10px rgba(255, 0, 127, 0.45)', margin: '0' }}>UPLINK REQUIRED</h1>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0' }}>
              The Swipe Feed is exclusively accessible to authorized beatsmith nodes. Connecting via Discord prevents voter collusion and Sybil manipulation while preserving absolute track anonymity.
            </p>
            
            {!useEmailAuth ? (
              <div style={{
                background: 'rgba(0, 0, 0, 0.4)',
                border: '2px solid rgba(255, 119, 0, 0.25)',
                padding: '1.25rem',
                width: '100%',
                textAlign: 'left',
              }}>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.65rem' }}>
                  <Terminal size={14} color="var(--accent-magenta)" />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--accent-magenta)', letterSpacing: '0.05em' }}>ESTABLISH IDENTITY SIGNATURE</span>
                </div>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.4, marginBottom: '1rem' }}>
                  Establish your secure Discord uplink to listen, vote, and claim your share of daily voter XP rewards.
                </p>

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
                    loadFeedData();
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
                    marginTop: '0.5rem',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem'
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
              </div>
            ) : (
              <div style={{
                background: 'rgba(0, 0, 0, 0.4)',
                border: '2px solid rgba(255, 119, 0, 0.25)',
                padding: '1.25rem',
                width: '100%',
                textAlign: 'left',
              }}>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.65rem' }}>
                  <Terminal size={14} color="var(--accent-purple)" />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--accent-purple)', letterSpacing: '0.05em' }}>DEVELOPER EMAIL SANDBOX UPLINK</span>
                </div>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.4, marginBottom: '1rem' }}>
                  Establish direct database credentials. Already existing email accounts will automatically be signed back in.
                </p>

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
              </div>
            )}
          </div>
        </div>
      ) : (
        /* AUTHORIZED - NORMAL SWIPE ARENA FEED */
        <>
          <div style={styles.header}>
            <div>
              <span className="badge badge-gold">ANONYMOUS SWIPE ARENA</span>
              <h1 className="gradient-text" style={styles.title}>The Daily Drop Swipe Feed</h1>
              <p style={styles.subText}>Listen anonymously. Vote honestly. Prevent strategic sabotage.</p>
            </div>

            {/* Voting progress tracker */}
            {user ? (
              <div className="glass-card" style={styles.xpCard}>
                <div style={styles.xpRow}>
                  <span>VOTING XP PROGRESS:</span>
                  <strong className="neon-text-green">+{xpEarned} XP</strong>
                </div>
                <div style={styles.xpBarTrack}>
                  <div 
                    style={{ 
                      ...styles.xpBarFill, 
                      width: `${Math.min(votesCast * 10, 100)}%`,
                      background: votesCast >= 10 ? 'var(--accent-green)' : 'var(--accent-gradient)'
                    }} 
                  />
                </div>
                <span style={styles.xpCapText}>
                  {votesCast >= 10 ? '✓ Daily voting XP Cap Reached (10/10)' : `${votesCast}/10 votes cast (+10 XP per swipe)`}
                </span>
              </div>
            ) : (
              <div className="glass-card" style={{ ...styles.xpCard, border: '1px dashed rgba(255, 119, 0, 0.4)', background: 'rgba(255, 119, 0, 0.02)' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--accent-magenta)', fontWeight: 'bold' }}>UPLINK INTERFACE OFFLINE</span>
                <span style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>Connect profile on Home Room to earn swipe XP!</span>
              </div>
            )}
          </div>

          <div style={styles.contentLayout}>
            {/* Main Swipe Arena */}
            <div style={styles.swipeColumn}>
              {activeBeat ? (
                <div className="swipe-card" style={styles.cardContainer}>
                  <div className="swipe-glow-bg" />
                  
                  {/* Header inside card */}
                  <div style={styles.cardHeader}>
                    <div style={styles.cardHeaderLeft}>
                      <span style={styles.cardBadge}>DAILY DROP #182</span>
                      <h2 style={styles.cardTitle}>Anonymous Flip</h2>
                      <span style={styles.trackId}>Track Node ID: #{activeBeat.id}</span>
                    </div>
                    <div style={styles.cardBpm}>
                      <span>{activeBeat.bpm} BPM</span>
                    </div>
                  </div>

                  {/* Central Waveform Component */}
                  <div style={styles.cardBody}>
                    {/* If we have dynamic audio URL, provide it to player */}
                    <WaveformPlayer 
                      audioId={activeBeat.id}
                      title={`Sub Node ${activeBeat.id}`}
                      bpm={activeBeat.bpm}
                      keySignature={activeBeat.key}
                      audioUrl={activeBeat.audio_url}
                      showRating={false}
                    />
                    
                    {/* Audio helper tips */}
                    <div style={styles.alertBox}>
                      <AlertCircle size={14} color="var(--accent-purple)" />
                      <span>Hover to play Synth Loop. Mouse scroll scrubs track.</span>
                    </div>
                  </div>

                  {/* Vote Decision buttons */}
                  <div style={styles.voteBtnRow}>
                    <button 
                      style={styles.voteDownBtn} 
                      onClick={() => handleVote(false)}
                      title="Swipe Left / Downvote"
                    >
                      <ThumbsDown size={20} />
                      <span>TRASH FLIP</span>
                    </button>
                    
                    <button 
                      style={styles.voteUpBtn} 
                      onClick={() => handleVote(true)}
                      title="Swipe Right / Upvote"
                    >
                      <ThumbsUp size={20} />
                      <span>DOPING FIRE</span>
                    </button>
                  </div>

                  {/* Skip option */}
                  <button 
                    style={styles.skipLink}
                    onClick={() => setCurrentIndex((prev) => (currentIndex < beats.length - 1 ? prev + 1 : 0))}
                  >
                    Skip This Track
                  </button>
                </div>
              ) : (
                <div className="glass-card" style={styles.emptyState}>
                  <h3>No more beats to judge!</h3>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>You've either cleared the feed or haven't gotten uploads yet.</p>
                  <button className="btn-primary" onClick={loadFeedData} style={{ marginTop: '0.5rem' }}>Refresh Feed</button>
                </div>
              )}
            </div>

            {/* Sidebar explaining Wilson Score and live Leaderboards */}
            <div style={styles.metaColumn}>
              <div className="glass-card" style={styles.infoCard}>
                <div style={styles.titleWithIcon} onClick={() => setShowExplanation(!showExplanation)}>
                  <HelpCircle size={18} color="var(--accent-blue)" />
                  <h3 style={{ ...styles.infoTitle, cursor: 'pointer' }}>Wilson Score Interval Sorting</h3>
                </div>
                
                <p style={styles.infoDesc}>
                  To prevent "early uploader advantage" biases, rankings do not sort by simple positive ratios (Likes/Total). They sort by the <strong>Wilson Lower Bound formula (95% confidence)</strong>.
                </p>
                
                {showExplanation && (
                  <div style={styles.mathExplanation}>
                    <p>Formula implemented in our JS algorithm:</p>
                    <code style={styles.codeSnippet}>
                      WilsonScore = (p_hat + z²/2n - z*sqrt(p_hat*(1-p_hat)/n + z²/4n²)) / (1 + z²/n)
                    </code>
                    <p style={{ marginTop: '0.5rem', fontSize: '0.72rem' }}>
                      This guarantees that a beat with 100 Upvotes and 10 Downvotes safely outranks a new beat with 1 Upvote and 0 Downvotes.
                    </p>
                  </div>
                )}
              </div>

              {/* Real-time Wilson sorting feed */}
              <div className="glass-card" style={styles.leaderboardCard}>
                <div style={styles.titleWithIcon} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Sparkles size={18} color="#ffd700" />
                    <h3>Live Leaderboard (Sorted by Wilson)</h3>
                  </div>
                  <button 
                    onClick={loadFeedData} 
                    title="Reload Leaderboard"
                    style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', cursor: 'pointer' }}
                  >
                    <RefreshCw size={14} />
                  </button>
                </div>

                <div className="data-table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>Node ID</th>
                        <th>Up / Down</th>
                        <th>Wilson Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {beats.length > 0 ? (
                        getSortedBeatsByWilson().map((beat, idx) => {
                          const wilson = getWilsonScore(beat.upvotes, beat.downvotes);
                          const isActive = beat.id === activeBeat?.id;
                          return (
                            <tr key={beat.id} style={isActive ? styles.leaderboardRowActive : {}}>
                              <td>
                                {idx === 0 ? '👑 1st' : idx === 1 ? '🥈 2nd' : idx === 2 ? '🥉 3rd' : `${idx + 1}th`}
                              </td>
                              <td style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                                #{beat.id.substring(0, 8)} {isActive && '◀'}
                              </td>
                              <td>
                                <span style={{ color: 'var(--accent-green)' }}>{beat.upvotes}</span> / <span style={{ color: 'var(--accent-magenta)' }}>{beat.downvotes}</span>
                              </td>
                              <td style={{ fontFamily: 'monospace', color: 'var(--accent-cyan)', fontWeight: 'bold' }}>
                                {wilson.toFixed(4)}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No submissions loaded.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <button 
                  className="btn-secondary" 
                  style={styles.randomizeVotesBtn}
                  onClick={() => {
                    // Synthesize random votes to showcase dynamic sorting shifts!
                    const updated = beats.map(beat => ({
                      ...beat,
                      upvotes: beat.upvotes + Math.floor(Math.random() * 20),
                      downvotes: beat.downvotes + Math.floor(Math.random() * 5)
                    }));
                    setBeats(updated);
                  }}
                >
                  <Shuffle size={14} />
                  <span>Simulate Real-time Swiping</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem',
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
  loadingWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
  },
  xpCard: {
    padding: '0.85rem 1.25rem',
    minWidth: '280px',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
  },
  xpRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.72rem',
    fontWeight: 800,
    color: '#a0a5b5',
    letterSpacing: '0.04em',
  },
  xpBarTrack: {
    height: '6px',
    background: '#1d1d27',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    borderRadius: '3px',
    transition: 'width 0.3s',
  },
  xpCapText: {
    fontSize: '0.65rem',
    color: '#6c7284',
    textAlign: 'right',
  },
  contentLayout: {
    display: 'grid',
    gridTemplateColumns: 'minmax(350px, 460px) 1fr',
    gap: '2.5rem',
    alignItems: 'start',
  },
  swipeColumn: {
    display: 'flex',
    justifyContent: 'center',
    width: '100%',
  },
  cardContainer: {
    width: '100%',
    zIndex: 10,
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    paddingBottom: '1rem',
    zIndex: 2,
  },
  cardBadge: {
    fontSize: '0.6rem',
    fontWeight: 800,
    color: 'var(--accent-cyan)',
    letterSpacing: '0.08em',
  },
  cardTitle: {
    fontSize: '1.25rem',
    fontWeight: 800,
    color: '#ffffff',
  },
  trackId: {
    fontSize: '0.68rem',
    fontFamily: 'monospace',
    color: '#6c7284',
  },
  cardBpm: {
    background: 'rgba(255, 119, 0, 0.08)',
    border: '2px solid rgba(255, 119, 0, 0.25)',
    padding: '0.3rem 0.6rem',
    borderRadius: '0px',
    fontSize: '0.72rem',
    fontWeight: 'bold',
    color: 'var(--accent-purple)',
  },
  cardBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.8rem',
    zIndex: 2,
  },
  alertBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    background: 'rgba(255, 119, 0, 0.04)',
    border: '2px solid rgba(255, 119, 0, 0.15)',
    borderRadius: '0px',
    padding: '0.5rem 0.75rem',
    fontSize: '0.7rem',
    color: 'var(--accent-purple)',
    lineHeight: 1.3,
  },
  voteBtnRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem',
    marginTop: '1rem',
    zIndex: 2,
  },
  voteDownBtn: {
    background: 'rgba(255, 119, 0, 0.04)',
    border: '2px solid rgba(255, 119, 0, 0.2)',
    color: 'var(--accent-magenta)',
    borderRadius: '0px',
    padding: '0.85rem',
    fontSize: '0.75rem',
    fontWeight: 800,
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.4rem',
    transition: 'all 0.2s',
  },
  voteUpBtn: {
    background: 'rgba(255, 255, 255, 0.05)',
    border: '2px solid rgba(255, 255, 255, 0.25)',
    color: 'var(--accent-green)',
    borderRadius: '0px',
    padding: '0.85rem',
    fontSize: '0.75rem',
    fontWeight: 800,
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.4rem',
    transition: 'all 0.2s',
  },
  skipLink: {
    background: 'none',
    border: 'none',
    color: '#6c7284',
    fontSize: '0.75rem',
    cursor: 'pointer',
    textDecoration: 'underline',
    textAlign: 'center',
    marginTop: '0.5rem',
    zIndex: 2,
  },
  emptyState: {
    height: '400px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1rem',
    width: '100%',
  },
  metaColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  infoCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.6rem',
  },
  titleWithIcon: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  infoTitle: {
    fontSize: '1rem',
    fontWeight: 700,
    color: '#ffffff',
  },
  infoDesc: {
    fontSize: '0.85rem',
    color: '#a0a5b5',
    lineHeight: 1.45,
  },
  mathExplanation: {
    background: 'rgba(255, 166, 0, 0.04)',
    border: '2px solid rgba(255, 166, 0, 0.15)',
    borderRadius: '0px',
    padding: '0.85rem',
    marginTop: '0.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
  },
  codeSnippet: {
    display: 'block',
    fontFamily: 'monospace',
    fontSize: '0.72rem',
    background: '#070709',
    padding: '0.5rem',
    borderRadius: '0px',
    color: '#ccf2ff',
    overflowX: 'auto',
    border: '1px solid rgba(255, 166, 0, 0.1)',
  },
  leaderboardCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  leaderboardRowActive: {
    background: 'rgba(255, 119, 0, 0.08)',
    borderLeft: '3px solid var(--accent-purple)',
  },
  randomizeVotesBtn: {
    marginTop: '0.5rem',
    width: '100%',
    justifyContent: 'center',
    padding: '0.65rem',
    fontSize: '0.8rem',
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
  }
};
