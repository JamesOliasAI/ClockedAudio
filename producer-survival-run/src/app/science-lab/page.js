'use client';

import React, { useState } from 'react';
import { Award, Zap, ShieldAlert, Sparkles, TrendingUp, Music, RefreshCw, Layers } from 'lucide-react';
import * as MathEngine from '../../utils/gameScience';

export default function ScienceLab() {
  // 1. XP Progression State
  const [xpLvlInput, setXpLvlInput] = useState(5);
  const [xpUploadCheck, setXpUploadCheck] = useState(true);
  const [xpVotesInput, setXpVotesInput] = useState(8);
  const [xpPredictInput, setXpPredictInput] = useState(2);
  const [xpPlacementInput, setXpPlacementInput] = useState(1); // 1 = 1st, 2 = 2nd-5th, 3 = 6th-10th, 4 = top10, 5 = none

  // 2. MMR State
  const [mmrPlayerInput, setMmrPlayerInput] = useState(1200);
  const [mmrPlacementInput, setMmrPlacementInput] = useState(1); // Placement 1 to 10
  const [opponents, setOpponents] = useState([
    { id: 1, mmr: 1100, placement: 4 },
    { id: 2, mmr: 1250, placement: 2 },
    { id: 3, mmr: 1400, placement: 3 },
  ]);

  // 3. Z-Score Sabotage State
  const [scoresInput, setScoresInput] = useState('1,2,5,4,2,3,4,1,2');
  const [triggerSabotage, setTriggerSabotage] = useState(false);

  // 4. Wilson Score State
  const [wilsonUpvotes, setWilsonUpvotes] = useState(900);
  const [wilsonDownvotes, setWilsonDownvotes] = useState(100);

  // 5. Pitch & Tempo State
  const [targetKey, setTargetKey] = useState('F#');
  const [sourceKey, setSourceKey] = useState('D');
  const [targetBpm, setTargetBpm] = useState(140);
  const [sourceBpm, setSourceBpm] = useState(128);

  // --- XP Progression calculations ---
  const levelXPToNext = MathEngine.getXPToNextLevel(xpLvlInput);
  const cumulativeXPForLvl = MathEngine.getCumulativeXPForLevel(xpLvlInput);
  
  let dailyDropPlacement = 'none';
  if (xpPlacementInput === 1) dailyDropPlacement = 1;
  else if (xpPlacementInput === 2) dailyDropPlacement = 2; // maps to 2-5 in function
  else if (xpPlacementInput === 3) dailyDropPlacement = 6; // maps to 6-10
  else if (xpPlacementInput === 4) dailyDropPlacement = 'top_10';
  
  const xpEarnedSim = MathEngine.calculateDailyDropXP(
    xpUploadCheck, 
    xpVotesInput, 
    xpPredictInput, 
    dailyDropPlacement
  );

  // --- MMR calculations ---
  const mmrSimResults = MathEngine.calculateMMRAdjustment(
    mmrPlayerInput,
    opponents,
    mmrPlacementInput
  );

  // --- Z-Score Normalization calculations ---
  const rawScores = triggerSabotage 
    ? [1, 1, 1, 1, 1, 1, 1, 1, 1] 
    : scoresInput.split(',').map(s => parseFloat(s.trim())).filter(s => !isNaN(s));
  
  const zScoreResult = MathEngine.normalizeJudgeVotes(rawScores);

  // --- Wilson Score calculations ---
  const wilsonScoreResult = MathEngine.getWilsonScore(wilsonUpvotes, wilsonDownvotes);

  // --- Pitch Shift calculations ---
  const keyTransposition = MathEngine.getKeyTranspositionInterval(targetKey, sourceKey);
  const pitchDrift = MathEngine.getPitchDriftSemitones(targetBpm, sourceBpm);

  return (
    <div style={styles.container}>
      {/* Header Info */}
      <div style={styles.header}>
        <div>
          <span className="badge badge-executive">MATHEMATICAL ENGINE SIMULATOR</span>
          <h1 className="gradient-text" style={styles.title}>Game Science Laboratory</h1>
          <p style={styles.subText}>Inspect, verify, and experiment with the mathematical models governing the arena.</p>
        </div>
      </div>

      <div style={styles.labGrid}>
        
        {/* Module 1: XP Progression curve */}
        <div className="glass-card" style={styles.labCard}>
          <div style={styles.cardHeader}>
            <TrendingUp size={20} color="var(--accent-green)" />
            <h3 style={styles.cardTitle}>XP Progression Science</h3>
          </div>
          
          <div style={styles.labBody}>
            <div className="lab-input-group">
              <label>Target Level to Inspect:</label>
              <input 
                type="number" 
                className="lab-input" 
                value={xpLvlInput} 
                onChange={(e) => setXpLvlInput(Math.max(1, parseInt(e.target.value, 10) || 1))}
              />
            </div>

            <div style={styles.statsPanel}>
              <div style={styles.statRow}>
                <span>XP Needed to next Level ({xpLvlInput} → {xpLvlInput + 1}):</span>
                <strong>{levelXPToNext} XP</strong>
              </div>
              <div style={styles.statRow}>
                <span>Cumulative XP for Level {xpLvlInput}:</span>
                <strong>{cumulativeXPForLvl.toLocaleString()} XP</strong>
              </div>
              <div style={styles.statRow}>
                <span>Rank Tier Title Name:</span>
                <span style={{ color: 'var(--accent-purple)', fontWeight: 'bold' }}>{MathEngine.getRankTierName(xpLvlInput)}</span>
              </div>
            </div>

            <h4 style={styles.miniTitle}>Daily Action XP Simulator</h4>
            
            <div style={styles.formRow}>
              <label style={styles.checkLabel}>
                <input 
                  type="checkbox" 
                  checked={xpUploadCheck} 
                  onChange={(e) => setXpUploadCheck(e.target.checked)}
                />
                MP3 Flipped & Uploaded within 20m (+100 XP)
              </label>
            </div>

            <div className="lab-input-group">
              <label>Votes cast on other tracks (10 XP each, max 100):</label>
              <input 
                type="number" 
                className="lab-input" 
                value={xpVotesInput} 
                min="0"
                max="25"
                onChange={(e) => setXpVotesInput(Math.max(0, parseInt(e.target.value, 10) || 0))}
              />
            </div>

            <div className="lab-input-group">
              <label>Predicted tracks landing in Top 10% (+50 XP each):</label>
              <input 
                type="number" 
                className="lab-input" 
                value={xpPredictInput} 
                onChange={(e) => setXpPredictInput(Math.max(0, parseInt(e.target.value, 10) || 0))}
              />
            </div>

            <div className="lab-input-group">
              <label>Daily Placement Achievement:</label>
              <select 
                className="lab-input" 
                value={xpPlacementInput} 
                onChange={(e) => setXpPlacementInput(parseInt(e.target.value, 10))}
              >
                <option value={1}>1st Place Winner (+1,000 XP)</option>
                <option value={2}>2nd - 5th Place (+500 XP)</option>
                <option value={3}>6th - 10th Place (+250 XP)</option>
                <option value={4}>Top 10% Placement (+100 XP)</option>
                <option value={5}>No Placement Award (+0 XP)</option>
              </select>
            </div>

            <div className="lab-result-card">
              Calculated XP Awarded: <strong>+{xpEarnedSim} XP</strong>
            </div>
          </div>
        </div>

        {/* Module 2: Elo Matchmaking MMR Adjuster */}
        <div className="glass-card" style={styles.labCard}>
          <div style={styles.cardHeader}>
            <Award size={20} color="var(--accent-cyan)" />
            <h3 style={styles.cardTitle}>MMR Elo Matchmaking</h3>
          </div>

          <div style={styles.labBody}>
            <p style={styles.panelDesc}>Lobbies are treated as 9 simultaneous 1v1 virtual matches. K-Factor = 8.</p>
            
            <div className="lab-input-group">
              <label>Player I's Current MMR Rating:</label>
              <input 
                type="number" 
                className="lab-input" 
                value={mmrPlayerInput}
                onChange={(e) => setMmrPlayerInput(parseInt(e.target.value, 10) || 0)}
              />
            </div>

            <div className="lab-input-group">
              <label>Player I's Final Match Placement (1 - 10):</label>
              <input 
                type="number" 
                className="lab-input" 
                min="1"
                max="10"
                value={mmrPlacementInput}
                onChange={(e) => setMmrPlacementInput(Math.max(1, Math.min(10, parseInt(e.target.value, 10) || 1)))}
              />
            </div>

            <h4 style={styles.miniTitle}>Lobby Competitors Ratings (Virtual 1v1 samples)</h4>
            
            <div style={styles.opponentList}>
              {opponents.map((opp) => (
                <div key={opp.id} style={styles.opponentItem}>
                  <span>Opponent #{opp.id}:</span>
                  <input 
                    type="number" 
                    className="lab-input" 
                    style={{ width: '80px', padding: '0.3rem' }}
                    value={opp.mmr}
                    onChange={(e) => {
                      const updated = opponents.map(o => o.id === opp.id ? { ...o, mmr: parseInt(e.target.value, 10) || 0 } : o);
                      setOpponents(updated);
                    }}
                  />
                  <span>Placed:</span>
                  <input 
                    type="number" 
                    className="lab-input" 
                    style={{ width: '60px', padding: '0.3rem' }}
                    min="1"
                    max="10"
                    value={opp.placement}
                    onChange={(e) => {
                      const updated = opponents.map(o => o.id === opp.id ? { ...o, placement: parseInt(e.target.value, 10) || 1 } : o);
                      setOpponents(updated);
                    }}
                  />
                  <span style={{ fontSize: '0.72rem', color: '#a0a5b5' }}>
                    Expected Win: {(MathEngine.getExpectedOutcome(mmrPlayerInput, opp.mmr) * 100).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>

            <div className="lab-result-card" style={{ background: mmrSimResults.delta >= 0 ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 119, 0, 0.05)', borderColor: mmrSimResults.delta >= 0 ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 119, 0, 0.2)' }}>
              MMR Adjustment: <strong style={{ color: mmrSimResults.delta >= 0 ? 'var(--accent-green)' : 'var(--accent-magenta)' }}>{mmrSimResults.delta >= 0 ? `+${mmrSimResults.delta}` : mmrSimResults.delta} MMR</strong><br />
              New MMR Rating: <strong>{mmrSimResults.newMMR} MMR</strong>
            </div>
          </div>
        </div>

        {/* Module 3: Z-Score Normalizer & Sabotage Blocker */}
        <div className="glass-card" style={styles.labCard}>
          <div style={styles.cardHeader}>
            <ShieldAlert size={20} color="var(--accent-magenta)" />
            <h3 style={styles.cardTitle}>Z-Score Normalizer & Anti-Cheat</h3>
          </div>

          <div style={styles.labBody}>
            <p style={styles.panelDesc}>Neutralizes bias from generous or malicious downvote judges using standard deviation.</p>

            <div className="lab-input-group">
              <label>Competitors Scores from Judge K (comma separated 1-5):</label>
              <input 
                type="text" 
                className="lab-input" 
                disabled={triggerSabotage}
                value={scoresInput}
                onChange={(e) => setScoresInput(e.target.value)}
              />
            </div>

            <div style={styles.formRow}>
              <label style={styles.checkLabel}>
                <input 
                  type="checkbox" 
                  checked={triggerSabotage}
                  onChange={(e) => setTriggerSabotage(e.target.checked)}
                />
                <strong style={{ color: 'var(--accent-magenta)' }}>Trigger Strategic Downvote Sabotage (All 1s)</strong>
              </label>
            </div>

            <div style={styles.statsPanel}>
              <div style={styles.statRow}>
                <span>Voter Mean Rating (μ):</span>
                <strong>{zScoreResult.mean} Stars</strong>
              </div>
              <div style={styles.statRow}>
                <span>Standard Deviation (σ):</span>
                <strong>{zScoreResult.stdDev}</strong>
              </div>
              <div style={styles.statRow}>
                <span>Anti-Cheat Sabotage Flagged:</span>
                <strong style={{ color: zScoreResult.isSabotage ? 'var(--accent-magenta)' : 'var(--accent-green)' }}>
                  {zScoreResult.isSabotage ? '⚠️ ILLEGAL SPAM DETECTED' : '✓ SECURE VOTE PASS'}
                </strong>
              </div>
            </div>

            {zScoreResult.isSabotage ? (
              <div className="lab-result-card warning" style={styles.sabotageCard}>
                <h4 style={{ fontWeight: 'bold' }}>⚠️ ANTI-CHEAT ALARM ACTIVATED</h4>
                <p style={{ fontSize: '0.75rem', marginTop: '0.2rem' }}>
                  Standard deviation of judge votes is <strong>0.00</strong>. This voter given identical scores to all competitors in this session to sabotage results.
                </p>
                <div className="badge badge-executive" style={{ background: 'rgba(255, 119, 0, 0.2)', border: '1px solid var(--accent-magenta)', color: 'var(--accent-magenta)', marginTop: '0.5rem' }}>
                  PENALTY: Discarded votes & -100 XP applied!
                </div>
              </div>
            ) : (
              <div className="lab-result-card">
                Normalized Competitors Z-Scores:<br />
                <span style={{ fontSize: '0.78rem', color: 'var(--accent-cyan)', wordBreak: 'break-all' }}>
                  {zScoreResult.zScores.map(z => z.toFixed(2)).join(', ')}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Module 4: Wilson Lower Bound Ranker */}
        <div className="glass-card" style={styles.labCard}>
          <div style={styles.cardHeader}>
            <Layers size={20} color="#ffffff" />
            <h3 style={styles.cardTitle}>Wilson Feed Sorting Science</h3>
          </div>

          <div style={styles.labBody}>
            <p style={styles.panelDesc}>Calculates the 95% confidence lower boundary to balance high vote density against fresh uploads.</p>

            <div className="lab-input-group">
              <label>Track Upvotes (Likes):</label>
              <input 
                type="number" 
                className="lab-input" 
                value={wilsonUpvotes}
                onChange={(e) => setWilsonUpvotes(Math.max(0, parseInt(e.target.value, 10) || 0))}
              />
            </div>

            <div className="lab-input-group">
              <label>Track Downvotes (Dislikes):</label>
              <input 
                type="number" 
                className="lab-input" 
                value={wilsonDownvotes}
                onChange={(e) => setWilsonDownvotes(Math.max(0, parseInt(e.target.value, 10) || 0))}
              />
            </div>

            <div style={styles.statsPanel}>
              <div style={styles.statRow}>
                <span>Total Votes Cast:</span>
                <strong>{wilsonUpvotes + wilsonDownvotes} Votes</strong>
              </div>
              <div style={styles.statRow}>
                <span>Raw Positive Ratio (Up/Total):</span>
                <strong>
                  {wilsonUpvotes + wilsonDownvotes > 0 
                    ? ((wilsonUpvotes / (wilsonUpvotes + wilsonDownvotes)) * 100).toFixed(2) 
                    : 0}%
                </strong>
              </div>
            </div>

            <div className="lab-result-card">
              Wilson Lower Bound (95% CI): <strong style={{ color: 'var(--accent-purple)' }}>{wilsonScoreResult.toFixed(5)}</strong>
            </div>
          </div>
        </div>

        {/* Module 5: Pitch Shifting & BPM Drift Calculator */}
        <div className="glass-card" style={styles.labCard}>
          <div style={styles.cardHeader}>
            <Music size={20} color="var(--accent-cyan)" />
            <h3 style={styles.cardTitle}>Pitch & Sound stretch science</h3>
          </div>

          <div style={styles.labBody}>
            <p style={styles.panelDesc}>Calculates semitone adjustments for coherent loop mixing.</p>

            <h4 style={styles.miniTitle}>1. Key Transposition Solver</h4>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="lab-input-group">
                <label>Source Stem Key:</label>
                <select className="lab-input" value={sourceKey} onChange={(e) => setSourceKey(e.target.value)}>
                  {['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].map(k => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
              </div>

              <div className="lab-input-group">
                <label>Target Battle Key:</label>
                <select className="lab-input" value={targetKey} onChange={(e) => setTargetKey(e.target.value)}>
                  {['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].map(k => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="lab-result-card" style={{ marginBottom: '1.5rem' }}>
              Shift Required: <strong style={{ color: 'var(--accent-purple)' }}>
                {keyTransposition === 0 ? '0 (Perfect Match)' : keyTransposition > 0 ? `+${keyTransposition} Semitones` : `${keyTransposition} Semitones`}
              </strong>
            </div>

            <h4 style={styles.miniTitle}>2. Pitch-Drift Tempo Correction</h4>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="lab-input-group">
                <label>Source Loop BPM:</label>
                <input 
                  type="number" 
                  className="lab-input" 
                  value={sourceBpm} 
                  onChange={(e) => setSourceBpm(Math.max(1, parseInt(e.target.value, 10) || 1))}
                />
              </div>

              <div className="lab-input-group">
                <label>Target Room BPM:</label>
                <input 
                  type="number" 
                  className="lab-input" 
                  value={targetBpm} 
                  onChange={(e) => setTargetBpm(Math.max(1, parseInt(e.target.value, 10) || 1))}
                />
              </div>
            </div>

            <div className="lab-result-card">
              Resampling Pitch Drift: <strong style={{ color: 'var(--accent-purple)' }}>
                {pitchDrift === 0 ? '0.00 (No Drift)' : pitchDrift > 0 ? `+${pitchDrift} Semitones` : `${pitchDrift} Semitones`}
              </strong>
            </div>
          </div>
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
  labGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
    gap: '2rem',
    marginTop: '0.5rem',
  },
  labCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
    background: 'rgba(18, 18, 26, 0.75)',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    paddingBottom: '1rem',
  },
  cardTitle: {
    fontSize: '1.15rem',
    fontWeight: 700,
    color: '#ffffff',
  },
  panelDesc: {
    fontSize: '0.78rem',
    color: '#a0a5b5',
    lineHeight: 1.35,
    marginBottom: '0.75rem',
  },
  labBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.8rem',
  },
  miniTitle: {
    fontSize: '0.88rem',
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: '1rem',
    borderBottom: '1px solid rgba(255,255,255,0.03)',
    paddingBottom: '0.25rem',
  },
  statsPanel: {
    background: 'rgba(0, 0, 0, 0.25)',
    border: '1px solid rgba(255, 255, 255, 0.04)',
    borderRadius: '0px',
    padding: '0.85rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  statRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '0.78rem',
    color: '#a0a5b5',
  },
  formRow: {
    margin: '0.3rem 0',
  },
  checkLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.8rem',
    cursor: 'pointer',
    color: '#ffffff',
  },
  opponentList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.6rem',
    background: 'rgba(0, 0, 0, 0.15)',
    padding: '0.75rem',
    borderRadius: '0px',
    border: '1px solid rgba(255, 255, 255, 0.03)',
  },
  opponentItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: '0.78rem',
    color: '#ffffff',
    gap: '0.4rem',
  },
  sabotageCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.3rem',
    animation: 'pulse-border 2s infinite ease-in-out',
  }
};
