'use client';

import React, { useState, useEffect } from 'react';
import { HelpCircle, RefreshCw, Trophy, ChevronDown, ChevronUp } from 'lucide-react';
import WaveformPlayer from '../../components/WaveformPlayer';
import { supabase } from '../../utils/supabaseClient';
import { getWilsonScore } from '../../utils/gameScience';

export default function DailyDropVotingPhase() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [activeDrop, setActiveDrop] = useState(null);
  const [beats, setBeats] = useState([]);
  const [showExplanation, setShowExplanation] = useState(false);
  
  // Track ratings (keyed by submission ID)
  const [ratings, setRatings] = useState({});

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // 1. Get user session
        let activeUser = null;
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: profile } = await supabase.from('users').select('*').eq('id', session.user.id).single();
          activeUser = profile || session.user;
          setUser(activeUser);
        } else {
          let guestJson = localStorage.getItem('clocked_audio_active_user');
          if (guestJson) {
            activeUser = JSON.parse(guestJson);
            setUser(activeUser);
          }
        }

        // 2. Fetch Active Daily Drop
        const { data: drops } = await supabase.from('daily_drops').select('*').order('created_at', { ascending: false }).limit(1);
        let currentDrop = null;
        if (drops && drops.length > 0) {
          currentDrop = drops[0];
          setActiveDrop(currentDrop);
        } else {
          // Mock data fallback for drop
          const localDbKey = 'clocked_audio_mock_db';
          let dbData = {};
          if (typeof window !== 'undefined') {
            const stored = localStorage.getItem(localDbKey);
            if (stored) dbData = JSON.parse(stored);
          }
          if (dbData.daily_drops && dbData.daily_drops.length > 0) {
            currentDrop = dbData.daily_drops[0];
            setActiveDrop(currentDrop);
          }
        }

        // 3. Fetch submissions for this drop
        let fetchedSubs = [];
        let fetchedVotes = [];
        
        if (currentDrop) {
          const { data: subs } = await supabase.from('daily_drop_submissions').select('*').eq('daily_drop_id', currentDrop.id);
          const { data: votes } = await supabase.from('daily_drop_votes').select('*');
          if (subs) fetchedSubs = subs;
          if (votes) fetchedVotes = votes;
        }

        // Always check mock database so guest users can see their mock uploads and mock votes
        const localDbKey = 'clocked_audio_mock_db';
        let dbData = {};
        if (typeof window !== 'undefined') {
          const stored = localStorage.getItem(localDbKey);
          if (stored) dbData = JSON.parse(stored);
        }

        if (fetchedSubs.length === 0) {
          fetchedSubs = dbData.daily_drop_submissions || [];
          fetchedVotes = dbData.daily_drop_votes || [];
        } else {
          // If we have live subs, but the user is a guest or has local votes, merge them in!
          if (dbData.daily_drop_votes) {
             fetchedVotes = [...fetchedVotes, ...dbData.daily_drop_votes];
          }
        }
        
        // Remove the filter for the active user's track so they can see/test their own submissions
        const opponents = fetchedSubs;

        // Process votes and sorting (Discovery First + Wilson)
        let processedBeats = opponents.map((sub, index) => {
          const subVotes = fetchedVotes.filter(v => v.submission_id === sub.id);
          const upvotes = subVotes.filter(v => v.is_upvote).length;
          const downvotes = subVotes.filter(v => !v.is_upvote).length;
          const totalVotes = upvotes + downvotes;
          const wilsonScore = getWilsonScore ? getWilsonScore(upvotes, downvotes) : upvotes;

          return {
            id: sub.id,
            title: `Anonymous Flip #${index + 1}`,
            audio_url: sub.audio_url || '/audio/sample1.mp3',
            upvotes,
            downvotes,
            totalVotes,
            wilsonScore
          };
        });

        // "Discovery First" Algorithm
        // 1. Separate tracks into "Low Votes" (< 5) and "Established" (>= 5)
        let lowVotes = processedBeats.filter(b => b.totalVotes < 5);
        let established = processedBeats.filter(b => b.totalVotes >= 5);

        // 2. Randomize "Low Votes"
        lowVotes = lowVotes.sort(() => Math.random() - 0.5);

        // 3. Sort "Established" by Wilson Score (descending)
        established = established.sort((a, b) => b.wilsonScore - a.wilsonScore);

        // 4. Combine
        setBeats([...lowVotes, ...established]);
        
        // Find existing ratings for this user
        if (activeUser) {
           const myVotes = fetchedVotes.filter(v => v.voter_user_id === activeUser.id);
           const initialRatings = {};
           myVotes.forEach(v => {
             initialRatings[v.submission_id] = v.is_upvote ? 1 : -1;
           });
           setRatings(initialRatings);
        }

      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleRate = async (beatId, score) => {
    if (!user) {
      alert("You must be uplinked to register a rating.");
      return;
    }
    
    const isUpvote = score === 1;
    setRatings(prev => ({ ...prev, [beatId]: score }));
    
    const isLiveBeat = beatId.length === 36 && beatId.includes('-');

    try {
      if (user.is_guest || !isLiveBeat) {
        const localDbKey = 'clocked_audio_mock_db';
        let dbData = JSON.parse(localStorage.getItem(localDbKey) || '{}');
        if (!dbData.daily_drop_votes) dbData.daily_drop_votes = [];
        dbData.daily_drop_votes = dbData.daily_drop_votes.filter(v => !(v.submission_id === beatId && v.voter_user_id === user.id));
        dbData.daily_drop_votes.push({
          id: `vote-${Date.now()}`,
          submission_id: beatId,
          voter_user_id: user.id,
          is_upvote: isUpvote,
          created_at: new Date().toISOString()
        });
        localStorage.setItem(localDbKey, JSON.stringify(dbData));
        return;
      }

      const payload = {
        submission_id: beatId,
        voter_user_id: user.id,
        is_upvote: isUpvote
      };

      const { error: delErr } = await supabase.from('daily_drop_votes').delete().match({ submission_id: beatId, voter_user_id: user.id });
      if (delErr) console.error("Delete vote error:", delErr);
      
      const { error: insErr } = await supabase.from('daily_drop_votes').insert(payload);
      if (insErr) console.error("Insert vote error:", insErr);
    } catch (err) {
      console.error('Failed to register rating:', err);
    }
  };

  return (
    <div style={styles.container}>
      {loading ? (
        <div style={styles.loadingWrapper}>
          <RefreshCw size={24} className="pulse-text animate-spin" />
          <span style={{ fontSize: '0.85rem', fontFamily: 'monospace', marginTop: '0.5rem' }}>SYNCHRONIZING DAILY DROP TRACKS...</span>
        </div>
      ) : (
        <>
          <div style={styles.header}>
            <div>
              <span className="badge badge-platinum">DAILY DROP VOTING</span>
              <h1 className="gradient-text" style={styles.title}>
                {activeDrop ? `DAILY CHALLENGE: ${activeDrop.title.toUpperCase()}` : 'DAILY DROP VOTING'}
              </h1>
              <p style={styles.subText}>Listen anonymously. Vote honestly to earn XP and define the leaderboard.</p>
            </div>
            
            {/* Dedicated Rewards Card */}
            <div className="glass-card" style={styles.rewardsCard}>
              <div style={styles.titleWithIcon}>
                <Trophy size={16} color="var(--accent-green)" />
                <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-green)', margin: 0 }}>VOTING & PLACEMENT REWARDS</h3>
              </div>
              <ul style={{ ...styles.infoDesc, listStyleType: 'none', padding: 0, margin: '0.5rem 0 0 0', display: 'flex', flexDirection: 'column', gap: '0.2rem', fontSize: '0.75rem' }}>
                <li><strong>Voting XP:</strong> +10 XP per vote (max 100 XP)</li>
                <li><strong>1st Place:</strong> +1,000 XP</li>
                <li><strong>2nd - 5th Place:</strong> +500 XP</li>
                <li><strong>Top 10%:</strong> +100 XP + Predict Bonus (+50 XP)</li>
              </ul>
            </div>
          </div>

          {/* Discreet Fair Voting Explanation */}
          <div style={styles.discreetExplanation}>
             <div 
               style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--accent-blue)' }} 
               onClick={() => setShowExplanation(!showExplanation)}
             >
                <HelpCircle size={14} />
                <span style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>How does Fair Voting & Discovery work?</span>
                {showExplanation ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
             </div>
             {showExplanation && (
               <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#a0a5b5', lineHeight: 1.4 }}>
                 To ensure every producer gets a fair shot, our <strong>Discovery First</strong> algorithm pushes new tracks (under 5 votes) to the top in a randomized order. Once established, tracks are sorted using the <strong>Wilson Score Interval</strong>—a statistical method that prevents "early upload advantage" and surfaces truly high-quality beats based on the ratio of Fire vs. Trash ratings.
               </div>
             )}
          </div>

          <div style={styles.contentLayout}>
            {/* Grid of Submissions */}
            <div style={styles.gridContainer}>
              {beats.map((beat) => (
                <WaveformPlayer 
                  key={beat.id}
                  audioId={beat.id}
                  title={beat.title}
                  audioUrl={beat.audio_url}
                  showRating={true}
                  ratingMode="updown"
                  hideMeta={true}
                  onRate={(score) => handleRate(beat.id, score)}
                />
              ))}
              {beats.length === 0 && (
                 <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
                   No beats submitted yet. Be the first!
                 </div>
              )}
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
    gap: '1.5rem',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '1.5rem',
    flexWrap: 'wrap',
  },
  title: {
    fontSize: '1.8rem',
    fontWeight: 800,
    marginTop: '0.3rem',
    marginBottom: '0',
  },
  subText: {
    fontSize: '0.85rem',
    color: '#a0a5b5',
    marginTop: '0.3rem',
  },
  loadingWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
  },
  rewardsCard: {
    display: 'flex',
    flexDirection: 'column',
    padding: '1rem',
    minWidth: '280px',
    border: '1px solid rgba(0, 255, 136, 0.25)',
    background: 'rgba(0, 255, 136, 0.05)',
  },
  titleWithIcon: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  infoDesc: {
    fontSize: '0.85rem',
    color: '#a0a5b5',
  },
  discreetExplanation: {
    background: 'rgba(255, 119, 0, 0.05)',
    border: '1px solid rgba(255, 119, 0, 0.15)',
    padding: '0.8rem',
    borderRadius: '4px',
  },
  contentLayout: {
    display: 'flex',
    flexDirection: 'column',
  },
  gridContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '1.5rem',
  }
};
