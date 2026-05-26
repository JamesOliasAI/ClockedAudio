'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Download, Upload, Clock, ShieldAlert, CheckCircle2, ChevronRight, User, Sparkles, LogOut, Terminal, Disc } from 'lucide-react';
import WaveformPlayer from '../components/WaveformPlayer';
import OnboardingForm from '../components/OnboardingForm';
import { supabase, isLiveMode } from '../utils/supabaseClient';

export default function Home() {
  const [battleActive, setBattleActive] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [timeLeft, setTimeLeft] = useState(1200); // 20 minutes in seconds
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [zipDownloaded, setZipDownloaded] = useState(false);
  const [activeDrop, setActiveDrop] = useState(null);
  const [dropLoading, setDropLoading] = useState(true);
  const [showAbandonModal, setShowAbandonModal] = useState(false);
  const [hasAttempted, setHasAttempted] = useState(false);
  const [checkAttemptLoading, setCheckAttemptLoading] = useState(false);
  const [endTime, setEndTime] = useState(null);
  const [showTimeUpModal, setShowTimeUpModal] = useState(false);
  const milestonePlayedRef = useRef({ start: false, 600: false, 120: false, 60: false });

  // Auth and Session States
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [emailInput, setEmailInput] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [authError, setAuthError] = useState('');
  const [useEmailAuth, setUseEmailAuth] = useState(false);

  // Next drop countdown timer
  const [nextDropCountdown, setNextDropCountdown] = useState('00:00:00');
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      // Next midnight UTC
      const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
      const diff = tomorrow - now;
      
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24).toString().padStart(2, '0');
      const m = Math.floor((diff / 1000 / 60) % 60).toString().padStart(2, '0');
      const s = Math.floor((diff / 1000) % 60).toString().padStart(2, '0');
      setNextDropCountdown(`${h}:${m}:${s}`);
    };
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  // Tick countdown timer when battle is active
  useEffect(() => {
    if (!battleActive || !endTime) return;

    const calculateTimeLeft = () => {
      const now = Date.now();
      const diff = Math.floor((endTime - now) / 1000);
      if (diff <= 0) {
        setTimeLeft(0);
        setBattleActive(false);
        setShowTimeUpModal(true);
      } else {
        setTimeLeft(diff);
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [battleActive, endTime]);

  // Audio milestones logic
  useEffect(() => {
    if (!battleActive) {
      // Reset when battle stops
      milestonePlayedRef.current = { start: false, 600: false, 120: false, 60: false };
      return;
    }

    const playSound = (src) => {
      const audio = new Audio(src);
      audio.volume = 0.8;
      audio.play().catch(e => console.warn('Audio play failed:', e));
    };

    if (timeLeft === 1200 && !milestonePlayedRef.current.start) {
      milestonePlayedRef.current.start = true;
      playSound('/sounds/letthegamebeginvox.mp3');
    } else if (timeLeft <= 600 && timeLeft > 590 && !milestonePlayedRef.current[600]) {
      milestonePlayedRef.current[600] = true;
      playSound('/sounds/10minutesvox.mp3');
    } else if (timeLeft <= 120 && timeLeft > 110 && !milestonePlayedRef.current[120]) {
      milestonePlayedRef.current[120] = true;
      playSound('/sounds/2minutesvox.mp3');
    } else if (timeLeft <= 60 && timeLeft > 50 && !milestonePlayedRef.current[60]) {
      milestonePlayedRef.current[60] = true;
      playSound('/sounds/60secondsvox.mp3');
    }
  }, [timeLeft, battleActive]);

  // Fetch total players stat
  useEffect(() => {
    async function fetchStats() {
      if (isLiveMode) {
        try {
          const { count, error } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true });
          if (!error && count !== null) {
            setTotalPlayers(count); // Exact count from db
          }
        } catch (e) {}
      }
    }
    fetchStats();
  }, []);

  // Load session on mount
  useEffect(() => {
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

    async function loadSession() {
      try {
        setAuthLoading(true);
        
        // Add a safety timeout to prevent infinite hangs (e.g. if Supabase Web Locks get stuck)
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Supabase session fetch timed out')), 4000)
        );
        
        const { data: { session } } = await Promise.race([
          supabase.auth.getSession(),
          timeoutPromise
        ]);
        
        if (session?.user) {
          if (isLiveMode) {
            const profilePromise = supabase.from('users').select('*').eq('id', session.user.id).single();
            const { data: profile } = await Promise.race([
              profilePromise,
              timeoutPromise
            ]).catch(() => ({ data: null })); // Fallback if profile fetch fails/times out
            
            const activeUser = profile ? { ...session.user, ...profile } : session.user;
            localStorage.setItem('clocked_audio_active_user', JSON.stringify(activeUser));
            setUser(activeUser);
            setAuthLoading(false); // Unlock UI immediately if successful
          } else {
            setUser(getEnrichedUser(session.user));
            setAuthLoading(false); // Unlock UI immediately if successful
          }
        } else {
          // Fallback to guest user in localStorage
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
        console.warn('Session loading error or timeout:', err);
        // Fallback to guest user
        const guestJson = localStorage.getItem('clocked_audio_active_user');
        setUser(guestJson ? JSON.parse(guestJson) : null);
      } finally {
        setAuthLoading(false);
      }
    }
    loadSession();

    async function fetchDailyDrop() {
      try {
        setDropLoading(true);
        if (isLiveMode) {
          const res = await fetch('/api/daily-drop');
          const json = await res.json();
          if (json.success && json.drop) {
            setActiveDrop(json.drop);
          } else {
            console.error('Failed to fetch daily drop from API:', json.error);
          }
        } else {
          const localDbKey = 'clocked_audio_mock_db';
          const stored = localStorage.getItem(localDbKey);
          if (stored) {
            const dbData = JSON.parse(stored);
            if (dbData.daily_drops && dbData.daily_drops.length > 0) {
              setActiveDrop(dbData.daily_drops[0]);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching daily drop:', err);
      } finally {
        setDropLoading(false);
      }
    }
    fetchDailyDrop();

    // Subscribe to Auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        if (isLiveMode) {
          const { data: profile } = await supabase.from('users').select('*').eq('id', session.user.id).single();
          let activeUser = session.user;
          if (profile) {
            activeUser = { ...session.user, ...profile };
          } else {
            // Auto-create public user profile on first login
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
              console.error('Failed to create public user profile:', insertErr);
            }
          }
          localStorage.setItem('clocked_audio_active_user', JSON.stringify(activeUser));
          setUser(activeUser);
          setAuthLoading(false); // Unlock UI immediately
        } else {
          setUser(getEnrichedUser(session.user));
          setAuthLoading(false); // Unlock UI immediately
        }
      } else {
        // Fallback to guest user in localStorage
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
        setAuthLoading(false); // Unlock UI immediately
      }
    });

    // Storage change listener to synchronize custom events
    const syncMockAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        if (isLiveMode) {
          const { data: profile } = await supabase.from('users').select('*').eq('id', session.user.id).single();
          let activeUser = session.user;
          if (profile) {
            activeUser = { ...session.user, ...profile };
          } else {
            // Auto-create public user profile
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
            }
          }
          setUser(activeUser);
        } else {
          setUser(getEnrichedUser(session.user));
        }
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
    };
    window.addEventListener('storage', syncMockAuth);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('storage', syncMockAuth);
    };
  }, []);

  // Check if user has already attempted the daily drop
  useEffect(() => {
    async function checkAttempt() {
      if (!user || !activeDrop) {
        setHasAttempted(false);
        return;
      }
      
      setCheckAttemptLoading(true);
      try {
        if (user.is_guest || !isLiveMode) {
          const localDbKey = 'clocked_audio_mock_db';
          const stored = localStorage.getItem(localDbKey);
          if (stored) {
            const dbData = JSON.parse(stored);
            const attempts = dbData.daily_drop_attempts || [];
            const attempt = attempts.find(
              (a) => a.user_id === user.id && a.daily_drop_id === activeDrop.id
            );
            if (attempt) {
              const attemptTime = new Date(attempt.created_at).getTime();
              const diffMs = Date.now() - attemptTime;
              if (diffMs < 20 * 60 * 1000) {
                setHasAttempted(true);
                setEndTime(attemptTime + 20 * 60 * 1000);
                setBattleActive(true);
              } else {
                setHasAttempted(true);
              }
            } else {
              setHasAttempted(false);
            }
          }
        } else {
          const { data, error } = await supabase
            .from('daily_drop_attempts')
            .select('id, created_at')
            .eq('user_id', user.id)
            .eq('daily_drop_id', activeDrop.id)
            .single();
            
          if (!error && data) {
            const attemptTime = new Date(data.created_at).getTime();
            const diffMs = Date.now() - attemptTime;
            if (diffMs < 20 * 60 * 1000) {
              setHasAttempted(true);
              setEndTime(attemptTime + 20 * 60 * 1000);
              setBattleActive(true);
            } else {
              setHasAttempted(true);
            }
          } else {
            setHasAttempted(false);
          }
        }
      } catch (err) {
        console.error('Error checking attempt status:', err);
      } finally {
        setCheckAttemptLoading(false);
      }
    }
    checkAttempt();
  }, [user, activeDrop, battleActive]);

  const formatTime = (secs) => {
    const minutes = Math.floor(secs / 60);
    const seconds = secs % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleEnterArena = () => {
    if (!user) {
      setAuthError('Uplink required! Establish your cybernetic profile signature below before entering.');
      return;
    }
    setShowTutorial(true);
  };

  const handleAbandonTutorial = () => {
    setShowTutorial(false);
  };

  const handleStartBattle = async () => {
    if (hasAttempted && !battleActive) return;
    if (!activeDrop) {
      alert("No active daily drop found. Please check back later.");
      return;
    }

    let createdTime = new Date().toISOString();

    try {
      if (user.is_guest || !isLiveMode) {
        const localDbKey = 'clocked_audio_mock_db';
        const stored = localStorage.getItem(localDbKey);
        if (stored) {
          const dbData = JSON.parse(stored);
          if (!dbData.daily_drop_attempts) dbData.daily_drop_attempts = [];
          dbData.daily_drop_attempts.push({
            id: `attempt-${Math.floor(Math.random() * 1000)}`,
            user_id: user.id,
            daily_drop_id: activeDrop.id,
            created_at: createdTime
          });
          localStorage.setItem(localDbKey, JSON.stringify(dbData));
        }
      } else {
        const { data, error } = await supabase.from('daily_drop_attempts').insert({
          user_id: user.id,
          daily_drop_id: activeDrop.id
        }).select('created_at').single();
        
        if (error) {
          console.error('Supabase Insert Error:', error);
          setAuthError(`Database rejected session: ${error.message} (Check your Supabase RLS policies!)`);
          return; // Stop here, do not let them into the arena!
        }
        
        if (data && data.created_at) {
          createdTime = data.created_at;
        }
      }
    } catch (err) {
      console.error('Failed to record attempt:', err);
      setAuthError(`Failed to record attempt: ${err.message}`);
      return; // Stop here!
    }

    setHasAttempted(true);
    setEndTime(new Date(createdTime).getTime() + 20 * 60 * 1000);
    setBattleActive(true);
    setShowTutorial(false);
    setUploadFile(null);
    setUploadError('');
    setUploadSuccess(false);
    setZipDownloaded(false);
  };

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

  const handleDisconnect = async () => {
    if (confirm('Disconnect neural interface and terminate current uploader session?')) {
      localStorage.removeItem('clocked_audio_active_user');
      setUser(null);
      window.dispatchEvent(new Event('storage'));
      await supabase.auth.signOut();
      setShowTutorial(false);
      setBattleActive(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    validateAndSetFile(file);
  };

  const validateAndSetFile = (file) => {
    if (!file) return;
    
    // Strict MP3 checking as outlined in mainplan.md
    if (file.type !== 'audio/mpeg' && !file.name.endsWith('.mp3')) {
      setUploadError('Invalid format! WAV is strictly disabled. Uploads are restricted strictly to MP3 ONLY to optimize R2 storage and maintain low countdown egress.');
      setUploadSuccess(false);
      setUploadFile(null);
      return;
    }

    setUploadError('');
    setUploadFile(file);
    setUploadSuccess(true);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    validateAndSetFile(file);
  };

  // Download helper using active drop
  const handleDownloadZip = async () => {
    setZipDownloaded(true);
    if (activeDrop?.stem_url) {
      try {
        const response = await fetch(activeDrop.stem_url);
        if (!response.ok) throw new Error('Network response was not ok');
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        // Extract filename from URL or fallback
        let filename = activeDrop.stem_url.split('/').pop().split('?')[0];
        if (!filename) filename = `DailyDrop_Stem.zip`;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (err) {
        console.warn('Failed to fetch blob for forced download, falling back to new tab:', err);
        window.open(activeDrop.stem_url, '_blank');
      }
    } else {
      const blob = new Blob(["Simulated stem package ZIP file for Clocked Audio Daily Drop"], {type: "text/plain"});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = "DailyDrop_StemPack.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  // Handlers for actual submission upload to Cloudflare R2 & DB insertion
  const handleLockSubmission = async () => {
    if (!uploadFile || !user) return;
    if (!activeDrop) {
      setUploadError('No active daily drop found to submit against.');
      return;
    }
    
    setIsSyncing(true);
    setUploadError('');

    try {
      // Intercept if guest to bypass physical R2 upload and Supabase auth-restricted writes
      if (user.is_guest) {
        console.log('[handleLockSubmission] Guest producer detected. Simulating Cloudflare R2 and Supabase database interactions...');
        
        // Wait 1.5 seconds to simulate high-fidelity transit
        await new Promise((resolve) => setTimeout(resolve, 1500));
        
        const submissionId = `beat-${Math.floor(Math.random() * 1000)}`;
        const localDbKey = 'clocked_audio_mock_db';
        let dbData = { users: [], daily_drops: [], daily_drop_submissions: [], daily_drop_votes: [] };
        
        if (typeof window !== 'undefined') {
          const stored = localStorage.getItem(localDbKey);
          if (stored) {
            dbData = JSON.parse(stored);
          }
        }
        
        const newSubmission = {
          id: submissionId,
          daily_drop_id: activeDrop.id,
          user_id: user.id,
          audio_url: '/audio/sample1.mp3', // use mock sample mp3
          created_at: new Date().toISOString()
        };
        
        if (!dbData.daily_drop_submissions) dbData.daily_drop_submissions = [];
        dbData.daily_drop_submissions.push(newSubmission);
        
        const updatedXp = (user.total_xp || 0) + 100;
        // Seed initial level/rank
        const updatedUser = {
          ...user,
          total_xp: updatedXp,
          current_level: Math.floor(updatedXp / 500) + 1,
          current_rank: 'Bedroom Producer (Bronze I)'
        };
        
        if (!dbData.users) dbData.users = [];
        const uIdx = dbData.users.findIndex(u => u.id === user.id);
        if (uIdx !== -1) {
          dbData.users[uIdx] = updatedUser;
        } else {
          dbData.users.push(updatedUser);
        }
        
        if (typeof window !== 'undefined') {
          localStorage.setItem(localDbKey, JSON.stringify(dbData));
          localStorage.setItem('clocked_audio_active_user', JSON.stringify(updatedUser));
        }
        
        setUser(updatedUser);
        window.dispatchEvent(new Event('storage'));
        
        alert('SUBMISSION TRANSMISSION SECURED!\nYou have successfully flipped the stems as a GUEST. Proceed to the Swipe Feed arena to vote and earn XP!');
        window.location.href = '/daily-feed';
        return;
      }
      // 1. Generate R2 pre-signed upload URL from endpoint
      const res = await fetch('/api/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: uploadFile.name,
          contentType: uploadFile.type,
          userId: user.id,
          dailyDropId: activeDrop.id
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setUploadError(data.error || 'Failed generating R2 upload token.');
        setIsSyncing(false);
        return;
      }

      // 2. Perform actual file PUT transit to Cloudflare R2 (or simulated upload route)
      const uploadRes = await fetch(data.url, {
        method: 'PUT',
        headers: data.headers,
        body: uploadFile
      });

      if (!uploadRes.ok) {
        setUploadError('Failed transmitting beat chunk to secure R2 cluster.');
        setIsSyncing(false);
        return;
      }

      // 3. Register submission record in daily_drop_submissions
      const submissionId = `beat-${Math.floor(Math.random() * 1000)}`;
      const submissionPayload = {
        // If mock, we supply manual mock ID. In real PostgreSQL, gen_random_uuid() handles this.
        id: data.mode === 'mock' ? submissionId : undefined,
        daily_drop_id: activeDrop.id,
        user_id: user.id,
        audio_url: data.publicUrl
      };

      const { error: insertErr } = await supabase
        .from('daily_drop_submissions')
        .insert(submissionPayload);

      if (insertErr) {
        setUploadError(insertErr.message || 'Failed recording uploader node metadata.');
        setIsSyncing(false);
        return;
      }

      // 4. Update uploader's XP progression: +100 XP awarded
      const updatedXp = (user.total_xp || 0) + 100;
      const { error: xpUpdateErr } = await supabase
        .from('users')
        .update({ total_xp: updatedXp })
        .eq('id', user.id);

      if (xpUpdateErr) {
        console.error('Failed to update voter experience:', xpUpdateErr);
      }

      alert('SUBMISSION TRANSMISSION SECURED!\nYou have successfully flip the stems. Proceed to the Swipe Feed arena to vote and earn XP!');
      window.location.href = '/daily-feed';

    } catch (err) {
      console.error(err);
      setUploadError('Local connection failure during R2 data transit.');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* 1. Welcome Landing Phase */}
      {!battleActive && !showTutorial && (
        <div style={styles.landingWrapper}>
          {authLoading ? (
            <div className="glass-panel" style={styles.landingConsole}>
              <div style={styles.diagnosticBanner}>
                <span className="pulse-text" style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>
                  SYNCHRONIZING SECURE CHANNELS...
                </span>
              </div>
            </div>
          ) : !user ? (
            /* DUAL-MODE CONNECT GATE */
            <div className="glass-panel" style={styles.landingConsole}>
              <img src="/logo.png" alt="Clocked Audio Logo" style={{ width: '90px', height: '90px', marginBottom: '-1rem', filter: 'drop-shadow(0 0 12px rgba(255, 120, 0, 0.4))' }} />
              <h1 style={styles.titleMain}>DAILY DROP</h1>
              <div style={styles.countdownWrapper}>
                <span style={styles.countdownText}>{nextDropCountdown}</span>
              </div>
              <p style={styles.landingDesc}>A single, key-locked stem drops globally at midnight. You have exactly 20 minutes to flip the loop, export strictly as MP3, and upload back to survive.</p>
              
              <div style={styles.statsRow}>
                <span>PRODUCERS: {totalPlayers.toLocaleString()}</span>
                <span style={{ opacity: 0.5 }}>|</span>
                <span>SYSTEM: v1.0.0-alpha</span>
              </div>

              <div style={styles.authRequestCard}>
                {!useEmailAuth ? (
                  <>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.65rem' }}>
                      <Terminal size={14} color="var(--accent-cyan)" />
                      <span style={styles.authTitle}>DISCORD NEURAL UPLINK REQUIRED</span>
                    </div>
                    <p style={styles.authDesc}>Establish your neural ID coordinates via Discord. This authorizes your uploader signature, prevents Sybil voting exploits, and tracks your global combat XP.</p>

                    <button 
                      onClick={async () => {
                        try {
                          await supabase.auth.signInWithOAuth({ 
                            provider: 'discord',
                            options: { redirectTo: window.location.origin }
                          });
                        } catch (e) {
                          setAuthError(e.message || 'OAuth handshake failed.');
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
                        marginTop: '0.5rem'
                      }}
                    >
                      <Disc size={16} style={{ animation: 'spin 4s linear infinite' }} />
                      <span>CONNECT DISCORD UPLINK</span>
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
                        marginTop: '0.5rem',
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
                    >
                      [ BYPASS TO EMAIL SANDBOX UPLINK ]
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
          ) : !user.bio ? (
            <OnboardingForm 
              user={user} 
              onComplete={(updatedUser) => {
                setUser(updatedUser);
              }}
            />
          ) : (
            /* COMPLETE PROFILE - MAIN WELCOME CONSOLE */
            <div className="glass-panel" style={styles.landingConsole}>
              {/* Glowing Retro Title */}
              <img src="/logo.png" alt="Clocked Audio Logo" style={{ width: '90px', height: '90px', marginBottom: '-1rem', filter: 'drop-shadow(0 0 12px rgba(255, 120, 0, 0.4))' }} />
              <h1 style={styles.titleMain}>DAILY DROP</h1>
              <div style={styles.countdownWrapper}>
                <span style={styles.countdownText}>{nextDropCountdown}</span>
              </div>
              <p style={styles.landingDesc}>A single, key-locked stem drops globally at midnight. You have exactly 20 minutes to flip the loop, export strictly as MP3, and upload back to survive.</p>
              
              <div style={styles.statsRow}>
                <span>PRODUCERS: {totalPlayers.toLocaleString()}</span>
                <span style={{ opacity: 0.5 }}>|</span>
                <span>SYSTEM: v1.0.0-alpha</span>
              </div>

              <div style={styles.userStatusPanel}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                  {user.discord_avatar_url ? (
                    <img 
                      src={user.discord_avatar_url} 
                      alt="Discord Avatar" 
                      style={{ width: '32px', height: '32px', border: '1px solid rgba(255, 166, 0, 0.25)' }} 
                    />
                  ) : (
                    <div style={styles.microAvatar}>
                      <User size={16} color="var(--accent-cyan)" />
                    </div>
                  )}
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '0.62rem', color: 'var(--accent-cyan)' }}>ACTIVE UPLINK INTERFACE</div>
                    <div style={{ fontSize: '0.9rem', color: '#ffffff', fontWeight: 'bold' }}>{user.full_name || user.username}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>@{user.discord_username || user.username}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="badge badge-platinum" style={{ fontSize: '0.55rem' }}>
                    LVL {user.current_level || 1}
                  </div>
                  <div style={{ fontSize: '0.55rem', color: 'var(--text-secondary)', marginTop: '0.2rem', fontFamily: 'monospace' }}>
                    XP: {user.total_xp || 0}
                  </div>
                </div>
              </div>

              {/* Premium action button */}
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: '0.5rem' }}>
                <div style={{ width: '100%', display: 'flex', gap: '1rem' }}>
                  <button 
                    className="btn-secondary"
                    title="Disconnect Interface"
                    style={{ width: '54px', padding: '0', display: 'flex', justifyContent: 'center', alignItems: 'center', borderColor: 'rgba(255, 119, 0, 0.35)' }}
                    onClick={handleDisconnect}
                  >
                    <LogOut size={16} color="var(--accent-magenta)" />
                  </button>
                  
                  <button 
                    id="start-battle-button"
                    className="btn-primary"
                    style={{ 
                      ...styles.launchBtn, 
                      flex: 1, 
                      opacity: hasAttempted ? 0.5 : 1, 
                      cursor: hasAttempted ? 'not-allowed' : 'pointer',
                      background: hasAttempted ? 'rgba(255, 255, 255, 0.1)' : 'var(--accent-gradient)',
                      borderColor: hasAttempted ? 'rgba(255, 255, 255, 0.2)' : 'var(--accent-cyan)'
                    }}
                    onClick={hasAttempted ? undefined : handleEnterArena}
                    disabled={hasAttempted || checkAttemptLoading}
                  >
                    <span>{checkAttemptLoading ? 'LOADING...' : hasAttempted ? 'ATTEMPTED - TRY AGAIN TOMORROW' : 'ENTER THE ARENA'}</span>
                    {!hasAttempted && !checkAttemptLoading && <ChevronRight size={16} />}
                  </button>
                </div>
                
                <button 
                  className="btn-secondary"
                  style={{ width: '100%', justifyContent: 'center', fontSize: '0.75rem', borderColor: 'var(--accent-green)', color: 'var(--accent-green)' }}
                  onClick={() => window.location.href = '/daily-feed'}
                >
                  <Sparkles size={14} style={{ marginRight: '6px' }} />
                  <span>JOIN SWIPE FEED VOTING</span>
                </button>
              </div>
            </div>
          )}

          <div style={styles.footerLinks}>
            <a href="/legal/terms" style={styles.footerLink}>TERMS</a>
            <a href="/legal/privacy" style={styles.footerLink}>PRIVACY</a>
            <a href="/legal/refunds" style={styles.footerLink}>REFUNDS</a>
            <a href="/legal/dmca" style={styles.footerLink}>DMCA</a>
          </div>
        </div>
      )}

      {/* 2. Rules & Tutorial Briefing Phase */}
      {!battleActive && showTutorial && (
        <div style={styles.landingWrapper}>
          <div className="glass-panel" style={styles.tutorialConsole}>
            {/* High-tech status row */}
            <div style={styles.statusIndicatorRow}>
              <span style={styles.statusDot}>●</span>
              <span style={styles.statusText}>MISSION BRIEFING: PREPARE FLIP ACTION</span>
            </div>

            <h1 style={styles.titleTutorial}>RULES & TUTORIAL</h1>

            {/* Grid-based Step Instructions */}
            <div style={styles.stepsContainer}>
              <div style={styles.stepItem}>
                <div style={styles.stepNumber}>01</div>
                <div style={styles.stepTextContainer}>
                  <h4 style={styles.stepTitle}>DOWNLOAD STEM PACK</h4>
                  <p style={styles.stepDesc}>Grab the key-locked, tempo-labeled (BPM) stems ZIP package to load into your sampler.</p>
                </div>
              </div>

              <div style={styles.stepItem}>
                <div style={styles.stepNumber}>02</div>
                <div style={styles.stepTextContainer}>
                  <h4 style={styles.stepTitle}>CHOP & FLIP IN DAW</h4>
                  <p style={styles.stepDesc}>Manipulate the stems in Ableton, FL Studio, Logic, or your hardware sampler to make a beat.</p>
                </div>
              </div>

              <div style={styles.stepItem}>
                <div style={styles.stepNumber}>03</div>
                <div style={styles.stepTextContainer}>
                  <h4 style={styles.stepTitle}>STRICT MP3 EXPORT</h4>
                  <p style={styles.stepDesc}>Export strictly as an **MP3 (.mp3)** file (max 10MB). High-egress WAV uploads are disabled.</p>
                </div>
              </div>

              <div style={styles.stepItem}>
                <div style={styles.stepNumber}>04</div>
                <div style={styles.stepTextContainer}>
                  <h4 style={styles.stepTitle}>SUBMIT BEFORE TIME OUT</h4>
                  <p style={styles.stepDesc}>Upload and lock in your submission before the 20-minute timer hits zero to join the Swipe Feed.</p>
                </div>
              </div>
            </div>

            {/* Warning Callout Box */}
            <div style={styles.warningBox}>
              <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                <ShieldAlert size={14} color="var(--accent-magenta)" />
                <span style={styles.warningTitle}>CRITICAL COMBAT PROTOCOLS</span>
              </div>
              <ul style={styles.warningList}>
                <li>⏱ **Countdown is absolute**: The 20-minute challenge timer starts *immediately* upon entering the combat arena and cannot be paused or reset.</li>
                <li>💾 **Strict File Constraint**: Only MP3 submissions are allowed. High-bandwidth lossless formats are fully disabled to protect Cloudflare R2 egress rates.</li>
              </ul>
            </div>

            {/* Symmetrical Control Actions Row */}
            <div style={styles.tutorialActionsRow}>
              <button 
                className="btn-secondary" 
                style={styles.backBtn}
                onClick={handleAbandonTutorial}
              >
                BACK TO LOBBY
              </button>

              <button 
                className="btn-primary" 
                style={styles.launchBattleBtn}
                onClick={handleStartBattle}
              >
                <span>LAUNCH COMBAT TIMER</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Active Battle Phase (Combat Room Cockpit) */}
      {battleActive && (
        <div style={styles.battleWrapper}>
          {/* Active Header with Countdown */}
          <div className="glass-panel" style={styles.battleHeader}>
            <div style={styles.headerInfo}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span className="badge badge-executive" style={{ border: '1.5px solid var(--accent-magenta)', color: 'var(--accent-magenta)', background: 'transparent' }}>ACTIVE COMBAT ROOM</span>
                {!isLiveMode && <span className="badge" style={{ border: '1px solid var(--accent-cyan)', color: 'var(--accent-cyan)', background: 'rgba(255, 166, 0, 0.05)' }}>LOCAL FALLBACK SYSTEM ACTIVE</span>}
              </div>
              <h2 style={styles.battleTitle}>DAILY CHALLENGE: "{activeDrop ? activeDrop.title.toUpperCase() : 'LOADING...'}"</h2>
            </div>

            {/* Glowing countdown ticker in pixel display */}
            <div className="timer-container" style={styles.timer}>
              <Clock size={16} />
              <span>{formatTime(timeLeft)}</span>
            </div>
          </div>

          {/* Action Hub Stacked Layout */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginTop: '0.5rem' }}>
            
            {/* Top Area: preview and download */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
              <div className="glass-card" style={{ ...styles.sideCard, alignItems: 'center', textAlign: 'center' }}>
                <h3 style={styles.sectionTitle}>1. PREVIEW THE STEM</h3>
                <p style={styles.sectionDesc}>Hover over the player below to listen to the core stem loop before downloading.</p>
                
                <div style={{ width: '100%', maxWidth: '700px', margin: '1rem 0' }}>
                  <WaveformPlayer 
                    audioId={activeDrop?.id || "fallback-id"} 
                    audioUrl={activeDrop?.stem_url}
                    title={activeDrop ? `CORE STEM: ${activeDrop.title.toUpperCase()}` : "CORE STEM: LOADING..."}
                    bpm={140}
                    keySignature="F# Minor"
                    showRating={false}
                  />
                </div>

                <button 
                  className="btn-primary" 
                  style={{ 
                    ...styles.actionBtn, 
                    maxWidth: '400px',
                    margin: '0 auto',
                    background: zipDownloaded ? 'rgba(255, 255, 255, 0.05)' : 'var(--accent-gradient)', 
                    borderColor: zipDownloaded ? 'var(--accent-green)' : 'var(--accent-cyan)' 
                  }}
                  onClick={handleDownloadZip}
                >
                  <Download size={14} />
                  <span>{zipDownloaded ? 'STEMS DOWNLOADED' : 'DOWNLOAD STEM ZIP'}</span>
                </button>
                {zipDownloaded && <p style={styles.successHint}>✓ ZIP package saved. Extract into your DAW sampler and start flipping!</p>}
              </div>

              {/* Strict constraint alerts */}
              <div className="glass-card" style={{ ...styles.sideCard, borderColor: 'rgba(255, 119, 0, 0.35)', background: 'rgba(255, 119, 0, 0.02)' }}>
                <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
                  <ShieldAlert size={16} color="var(--accent-magenta)" />
                  <div>
                    <h4 style={{ ...styles.stepTitle, margin: 0, fontSize: '0.75rem', color: '#ffffff' }}>STRICT UPLOAD VALIDATION</h4>
                    <p style={{ ...styles.stepDesc, fontSize: '0.75rem', marginTop: '0.2rem' }}>
                      To protect server resources and maintain rapid, zero-egress file caching, only <strong>MP3 (.mp3)</strong> exports are allowed. WAV, FLAC, and project files are disabled.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Area: upload zone */}
            <div className="glass-card" style={{ ...styles.mainUploadCard, textAlign: 'center' }}>
              <h3 style={styles.sectionTitle}>2. SUBMIT YOUR MASTERPIECE</h3>
              <p style={styles.sectionDesc}>
                Export your finished beat from your DAW and drag it here. Submissions close instantly when the timer hits zero.
              </p>

              {/* Drag and Drop Container */}
              <div 
                style={{
                  ...styles.uploadZone,
                  borderColor: uploadError ? 'var(--accent-magenta)' : uploadSuccess ? 'var(--accent-green)' : 'rgba(255, 119, 0, 0.2)',
                  background: uploadSuccess ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.4)'
                }}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <div style={styles.uploadInner}>
                  <div style={{ ...styles.uploadIconContainer, background: uploadSuccess ? 'rgba(0, 255, 136, 0.1)' : 'rgba(255, 166, 0, 0.08)' }}>
                    <Upload size={28} color={uploadSuccess ? 'var(--accent-green)' : 'var(--accent-cyan)'} />
                  </div>
                  
                  {uploadSuccess ? (
                    <div style={styles.successState}>
                      <h4 style={styles.uploadMainText}>Beat Loaded Successfully!</h4>
                      <p style={styles.uploadSubText}>{uploadFile.name} ({(uploadFile.size / 1024 / 1024).toFixed(2)} MB)</p>
                      <div className="badge badge-gold" style={{ marginTop: '0.75rem' }}>
                        Ready for Battle Swipe Feed
                      </div>
                      
                      <button 
                        className="btn-secondary" 
                        style={{ marginTop: '1rem', padding: '0.4rem 0.8rem', fontSize: '0.65rem' }}
                        onClick={() => { setUploadFile(null); setUploadSuccess(false); }}
                        disabled={isSyncing}
                      >
                        REPLACE FILE
                      </button>
                    </div>
                  ) : (
                    <div>
                      <h4 style={styles.uploadMainText}>DRAG & DROP YOUR FINISHED MP3 FLIP HERE</h4>
                      <p style={styles.uploadSubText}>or click below to browse local storage folders</p>
                      
                      <label style={styles.browseLabel}>
                        BROWSE FILES
                        <input 
                          type="file" 
                          accept=".mp3,audio/mpeg" 
                          style={{ display: 'none' }} 
                          onChange={handleFileChange}
                        />
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {/* Error messages */}
              {uploadError && (
                <div style={styles.errorBanner}>
                  <ShieldAlert size={14} />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* Submission actions */}
              <div style={styles.submitActionsRow}>
                <button 
                  className="btn-secondary" 
                  disabled={isSyncing}
                  onClick={() => setShowAbandonModal(true)}
                >
                  ABANDON BATTLE
                </button>

                <button 
                  className="btn-primary" 
                  disabled={!uploadSuccess || isSyncing}
                  style={{ 
                    ...styles.finalSubmitBtn,
                    opacity: (uploadSuccess && !isSyncing) ? 1 : 0.4,
                    cursor: (uploadSuccess && !isSyncing) ? 'pointer' : 'not-allowed'
                  }}
                  onClick={handleLockSubmission}
                >
                  <CheckCircle2 size={14} />
                  <span>{isSyncing ? 'TRANSMITTING TO CLOUD R2...' : 'LOCK SUBMISSION (+100 XP)'}</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Abandon Custom Modal */}
      {showAbandonModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(5px)',
          zIndex: 9999,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '1rem'
        }}>
          <div className="glass-panel" style={{
            ...styles.landingConsole,
            border: '3px solid var(--accent-magenta)',
            boxShadow: '0 0 30px rgba(214, 0, 255, 0.2)',
            maxWidth: '480px',
            padding: '2.5rem 2rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '0.5rem' }}>
              <ShieldAlert size={28} color="var(--accent-magenta)" />
              <h2 style={{ ...styles.titleMain, fontSize: '1.8rem', color: 'var(--accent-magenta)', textShadow: '0 0 12px rgba(214, 0, 255, 0.6)' }}>WARNING</h2>
            </div>
            
            <p style={{ ...styles.landingDesc, fontSize: '0.9rem', color: '#ffffff', marginBottom: '1.5rem', textAlign: 'center' }}>
              Are you sure you want to abandon the battle? If you quit now, you won't be able to take part in the challenge for the rest of the day until the next battle starts.
            </p>

            <div style={{ display: 'flex', gap: '1rem', width: '100%' }}>
              <button 
                className="btn-secondary"
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => setShowAbandonModal(false)}
              >
                STAY IN BATTLE
              </button>
              <button 
                className="btn-primary"
                style={{ 
                  flex: 1, 
                  justifyContent: 'center',
                  background: 'rgba(214, 0, 255, 0.1)',
                  borderColor: 'var(--accent-magenta)',
                  color: '#ffffff',
                  boxShadow: '0 0 15px rgba(214, 0, 255, 0.3)'
                }}
                onClick={() => {
                  setBattleActive(false);
                  setShowAbandonModal(false);
                }}
              >
                ABANDON
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Time's Up Modal */}
      {showTimeUpModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(5px)',
          zIndex: 9999,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '1rem'
        }}>
          <div className="glass-panel" style={{
            ...styles.landingConsole,
            border: '3px solid var(--accent-magenta)',
            boxShadow: '0 0 30px rgba(214, 0, 255, 0.2)',
            maxWidth: '480px',
            padding: '2.5rem 2rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '0.5rem' }}>
              <Clock size={28} color="var(--accent-magenta)" />
              <h2 style={{ ...styles.titleMain, fontSize: '1.8rem', color: 'var(--accent-magenta)', textShadow: '0 0 12px rgba(214, 0, 255, 0.6)' }}>TIME'S UP</h2>
            </div>
            
            <p style={{ ...styles.landingDesc, fontSize: '0.9rem', color: '#ffffff', marginBottom: '1.5rem', textAlign: 'center' }}>
              The 20-minute window has officially closed. Your uplink has been severed. You can try again tomorrow when a new drop goes live.
            </p>

            <div style={{ display: 'flex', gap: '1rem', width: '100%' }}>
              <button 
                className="btn-primary"
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => {
                  setShowTimeUpModal(false);
                  window.location.reload();
                }}
              >
                ACKNOWLEDGE
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

const styles = {
  container: {
    padding: '0.5rem 0',
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
  statusIndicatorRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.45rem',
    border: '1.5px solid rgba(214, 0, 255, 0.25)',
    background: 'rgba(214, 0, 255, 0.02)',
    padding: '0.25rem 0.65rem',
  },
  statusDot: {
    color: 'var(--accent-magenta)',
    fontSize: '0.52rem',
    textShadow: '0 0 5px var(--accent-magenta)',
    animation: 'pulse 1.5s infinite ease-in-out',
  },
  statusText: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.62rem',
    color: '#ffffff',
    letterSpacing: '0.08em',
  },
  titleMain: {
    fontFamily: 'var(--font-display)',
    fontSize: '2.5rem',
    color: '#ffffff',
    textShadow: '0 0 12px rgba(255, 119, 0, 0.6), 0 0 24px rgba(255, 119, 0, 0.35)',
    letterSpacing: '0.05em',
    margin: '0',
    textAlign: 'center',
    lineHeight: '1.2',
  },
  countdownWrapper: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    margin: '0.2rem 0 0.8rem 0',
  },
  countdownText: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.8rem',
    color: 'var(--accent-cyan)',
    textShadow: '0 0 8px rgba(255, 166, 0, 0.4)',
    letterSpacing: '0.1em',
  },
  landingDesc: {
    fontFamily: 'var(--font-sans)',
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    lineHeight: 1.5,
    margin: '0',
  },
  diagnosticBanner: {
    background: 'rgba(255, 166, 0, 0.03)',
    border: '1px dashed rgba(255, 166, 0, 0.3)',
    padding: '0.75rem',
    width: '100%',
    textAlign: 'center',
  },
  userStatusPanel: {
    background: 'rgba(255, 255, 255, 0.02)',
    border: '2px solid rgba(255, 166, 0, 0.2)',
    padding: '0.85rem 1.25rem',
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  microAvatar: {
    width: '32px',
    height: '32px',
    background: 'rgba(255, 166, 0, 0.08)',
    border: '1px solid rgba(255, 166, 0, 0.25)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
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
  },
  launchBtn: {
    justifyContent: 'center',
    padding: '1.1rem',
    fontFamily: 'var(--font-display)',
    fontSize: '0.9rem',
    letterSpacing: '0.05em',
    cursor: 'pointer',
    background: 'var(--accent-gradient)',
    color: '#000000',
    border: '2px solid var(--accent-cyan)',
    boxShadow: '0 0 15px rgba(255, 166, 0, 0.35)',
    display: 'flex',
    alignItems: 'center',
    gap: '0.8rem',
    transition: 'all 0.15s steps(4)',
  },
  tutorialConsole: {
    background: 'rgba(5, 5, 8, 0.95)',
    border: '3px solid var(--accent-cyan)',
    boxShadow: '0 0 30px rgba(255, 166, 0, 0.2)',
    padding: '2.5rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1.75rem',
    maxWidth: '680px',
    width: '100%',
    textAlign: 'left',
  },
  titleTutorial: {
    fontFamily: 'var(--font-display)',
    fontSize: '2.0rem',
    color: '#ffffff',
    textShadow: '0 0 10px rgba(255, 119, 0, 0.5), 0 0 20px rgba(255, 119, 0, 0.25)',
    letterSpacing: '0.05em',
    margin: '0',
    textAlign: 'center',
    lineHeight: '1.2',
  },
  stepsContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '1.25rem',
    width: '100%',
    margin: '0.5rem 0',
  },
  stepItem: {
    display: 'flex',
    gap: '1rem',
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 166, 0, 0.1)',
    padding: '1rem',
    alignItems: 'flex-start',
  },
  stepNumber: {
    fontFamily: 'var(--font-mono)',
    fontSize: '1.1rem',
    fontWeight: 'bold',
    color: 'var(--accent-cyan)',
    textShadow: '0 0 6px rgba(255, 166, 0, 0.5)',
    lineHeight: '1',
  },
  stepTextContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  stepTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '0.78rem',
    color: '#ffffff',
    letterSpacing: '0.04em',
    margin: '0',
  },
  stepDesc: {
    fontFamily: 'var(--font-sans)',
    fontSize: '0.74rem',
    color: 'var(--text-secondary)',
    lineHeight: '1.45',
    margin: '0',
  },
  warningBox: {
    width: '100%',
    border: '1.5px solid rgba(214, 0, 255, 0.35)',
    background: 'rgba(214, 0, 255, 0.03)',
    padding: '1rem',
    boxShadow: '0 0 10px rgba(214, 0, 255, 0.05)',
  },
  warningTitle: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.72rem',
    color: 'var(--accent-magenta)',
    fontWeight: 'bold',
    letterSpacing: '0.08em',
    textShadow: '0 0 4px rgba(214, 0, 255, 0.3)',
  },
  warningList: {
    margin: '0.25rem 0 0 0',
    paddingLeft: '1.1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem',
    fontFamily: 'var(--font-sans)',
    fontSize: '0.74rem',
    color: 'var(--text-secondary)',
    lineHeight: '1.45',
  },
  tutorialActionsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    width: '100%',
    gap: '1.5rem',
    marginTop: '0.5rem',
  },
  backBtn: {
    flex: '1',
    justifyContent: 'center',
    padding: '0.9rem',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.75rem',
    letterSpacing: '0.05em',
  },
  launchBattleBtn: {
    flex: '2',
    justifyContent: 'center',
    padding: '0.9rem',
    fontFamily: 'var(--font-display)',
    fontSize: '0.8rem',
    letterSpacing: '0.05em',
    cursor: 'pointer',
    background: 'var(--accent-gradient)',
    color: '#000000',
    border: '2px solid var(--accent-cyan)',
    boxShadow: '0 0 12px rgba(255, 166, 0, 0.3)',
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
  },

  // Battle state
  battleWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem',
  },
  battleHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '1.5rem',
    flexWrap: 'wrap',
  },
  headerInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
  },
  battleTitle: {
    fontSize: '1.2rem',
    color: '#ffffff',
    textShadow: '0 0 10px rgba(255, 166, 0, 0.35)',
  },
  battleMeta: {
    fontSize: '0.82rem',
    color: '#a0a0b0',
  },
  timer: {
    fontSize: '1.2rem',
    padding: '0.75rem 1.5rem',
  },
  gridSplit: {
    marginTop: '0.5rem',
  },
  sidebarColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  sideCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.8rem',
  },
  sectionTitle: {
    fontSize: '0.9rem',
    color: '#ffffff',
  },
  sectionDesc: {
    fontSize: '0.82rem',
    color: '#a0a5b5',
    lineHeight: 1.45,
    marginBottom: '0.5rem',
  },
  actionBtn: {
    width: '100%',
    justifyContent: 'center',
    padding: '0.8rem',
    marginTop: '0.5rem',
  },
  successHint: {
    fontSize: '0.75rem',
    color: 'var(--accent-green)',
    marginTop: '0.2rem',
  },
  mainUploadCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  uploadZone: {
    flex: 1,
    minHeight: '260px',
    border: '3px dashed rgba(255, 166, 0, 0.2)',
    borderRadius: '0px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.25s steps(4)',
  },
  uploadInner: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1rem',
    maxWidth: '360px',
  },
  uploadIconContainer: {
    width: '56px',
    height: '56px',
    borderRadius: '0px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '0.5rem',
    border: '1px solid rgba(255, 166, 0, 0.2)',
  },
  uploadMainText: {
    fontSize: '0.9rem',
    color: '#ffffff',
  },
  uploadSubText: {
    fontSize: '0.78rem',
    color: '#a0a5b5',
    marginTop: '0.2rem',
  },
  browseLabel: {
    display: 'inline-block',
    marginTop: '1.25rem',
    background: '#070707',
    border: '2px solid rgba(255, 166, 0, 0.3)',
    color: '#ffffff',
    fontSize: '0.75rem',
    fontFamily: 'var(--font-display)',
    padding: '0.5rem 1.25rem',
    borderRadius: '0px',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  successState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  errorBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    padding: '0.8rem 1rem',
    background: 'rgba(255, 119, 0, 0.06)',
    border: '2px solid rgba(255, 119, 0, 0.25)',
    borderRadius: '0px',
    color: 'var(--accent-purple)',
    fontSize: '0.8rem',
    lineHeight: 1.4,
  },
  submitActionsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '1.5rem',
    borderTop: '2px solid rgba(255, 166, 0, 0.15)',
    paddingTop: '1.25rem',
    flexWrap: 'wrap',
    gap: '1rem',
  },
  finalSubmitBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
  },
  statsRow: {
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'center',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.65rem',
    color: 'var(--accent-purple)',
    marginTop: '-0.5rem',
    marginBottom: '0.5rem',
    fontWeight: 'bold',
  },
  footerLinks: {
    display: 'flex',
    gap: '1.5rem',
    marginTop: '3rem',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.65rem',
    opacity: 0.6,
  },
  footerLink: {
    color: '#ffffff',
    textDecoration: 'none',
    letterSpacing: '0.05em',
    transition: 'opacity 0.2s',
  }
};
