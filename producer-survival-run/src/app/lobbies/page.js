'use client';

import React, { useState, useEffect } from 'react';
import { Users, Shield, Zap, Sparkles, RefreshCw, Trophy, VolumeX, Eye } from 'lucide-react';

export default function Lobbies() {
  const [playerCount, setPlayerCount] = useState(3);
  const [lobbyStatus, setLobbyStatus] = useState('waiting'); // 'waiting', 'starting', 'active'
  const [startsIn, setStartsIn] = useState(45);
  const [activeModifier, setActiveModifier] = useState(null);

  // Available modifiers from mainplan.md
  const modifiers = [
    {
      id: 'bpm-lock',
      name: 'BPM Lock',
      icon: Zap,
      color: 'var(--accent-cyan)',
      description: 'The final flip must be produced and exported at a strict tempo of exactly 140 BPM.',
      constraint: 'Tempo: 140 BPM Flat'
    },
    {
      id: 'minimalist',
      name: 'Minimalist',
      icon: Eye,
      color: '#ffffff',
      description: 'Maximum 5 tracks/channels total may be active in the final DAW project arrange grid.',
      constraint: 'Tracks: ≤ 5 channels'
    },
    {
      id: 'melodic-bass',
      name: 'Melodic Bass',
      icon: Shield,
      color: 'var(--accent-purple)',
      description: 'The melodic audio loop provided must be pitched and processed to act as the primary sub-bassline.',
      constraint: 'No Sub Synthesizers'
    },
    {
      id: 'no-hats',
      name: 'No Hats Allowed',
      icon: VolumeX,
      color: 'var(--accent-magenta)',
      description: 'Zero hi-hats, shakers, or high-frequency percussion loops may be present in the arrangement.',
      constraint: 'Hi-hats: Strictly 0%'
    }
  ];

  // Select a random modifier on mount
  useEffect(() => {
    rollModifier();
  }, []);

  // Lobby starting countdown ticker
  useEffect(() => {
    if (lobbyStatus !== 'starting') return;
    if (startsIn <= 0) {
      setLobbyStatus('active');
      return;
    }
    const timer = setInterval(() => {
      setStartsIn((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [lobbyStatus, startsIn]);

  const rollModifier = () => {
    const idx = Math.floor(Math.random() * modifiers.length);
    setActiveModifier(modifiers[idx]);
  };

  const handleSimulateJoin = () => {
    if (playerCount < 9) {
      setPlayerCount((prev) => prev + 1);
    } else if (playerCount === 9) {
      setPlayerCount(10);
      setLobbyStatus('starting');
      setStartsIn(5); // Start in 5 seconds
    }
  };

  const handleResetLobby = () => {
    setPlayerCount(3);
    setLobbyStatus('waiting');
    setStartsIn(45);
    rollModifier();
  };

  const ModifierIcon = activeModifier?.icon || Zap;

  return (
    <div style={styles.container}>
      {/* Header Info */}
      <div style={styles.header}>
        <div>
          <span className="badge badge-platinum">24/7 SYNCHRONOUS PLAY</span>
          <h1 className="gradient-text" style={styles.title}>Ranked Match Lobbies</h1>
          <p style={styles.subText}>Automated 10-player real-time battles. Fast timers. Instant MMR progression.</p>
        </div>

        {/* Action controls */}
        <div style={styles.controls}>
          <button className="btn-secondary" onClick={handleResetLobby} style={styles.btnIcon}>
            <RefreshCw size={14} />
            <span>Recalibrate Lobby</span>
          </button>
        </div>
      </div>

      {/* Lobby Visual Grid */}
      <div style={styles.lobbyGrid}>
        
        {/* Waiting Room Card */}
        <div className="glass-panel" style={styles.waitingCard}>
          <div style={styles.cardHeader}>
            <div style={styles.indicatorContainer}>
              <span 
                style={{ 
                  ...styles.statusIndicator, 
                  background: lobbyStatus === 'active' ? 'var(--accent-green)' : lobbyStatus === 'starting' ? 'var(--accent-green)' : 'var(--accent-purple)' 
                }} 
              />
              <span style={styles.statusText}>
                {lobbyStatus === 'active' ? 'BATTLE IN PROGRESS' : lobbyStatus === 'starting' ? 'MATCH STARTING...' : 'WAITING FOR PLAYERS'}
              </span>
            </div>
            
            <div style={styles.timerTag}>
              {lobbyStatus === 'active' ? '15:00 LEFT' : lobbyStatus === 'starting' ? `STARTS IN ${startsIn}s` : 'EST. WAIT: 45s'}
            </div>
          </div>

          {/* Player list counters */}
          <div style={styles.playerCountWrapper}>
            <div style={styles.usersIconContainer}>
              <Users size={32} color={lobbyStatus === 'active' ? 'var(--accent-green)' : 'var(--accent-purple)'} />
            </div>
            
            <div style={styles.counterTexts}>
              <h2 style={styles.counterValue}>{playerCount} / 10</h2>
              <p style={styles.counterLabel}>Producers Joined Matchmaking Pool</p>
            </div>
          </div>

          {/* Lobby Configuration Data */}
          <div style={styles.lobbyConfigList}>
            <div style={styles.configItem}>
              <span>BATTLE TYPE</span>
              <strong>Ranked Elo Matchup</strong>
            </div>
            <div style={styles.configItem}>
              <span>ROOM GENRE</span>
              <strong style={{ color: 'var(--accent-cyan)' }}>Synthwave / Outrun</strong>
            </div>
            <div style={styles.configItem}>
              <span>SOUND KIT</span>
              <strong>Procedural Mini-Kit ZIP (8 nodes)</strong>
            </div>
          </div>

          {/* Simulation controller */}
          <div style={styles.actionSection}>
            {lobbyStatus === 'waiting' && (
              <button 
                id="join-simulation-button"
                className="btn-primary" 
                style={styles.joinBtn}
                onClick={handleSimulateJoin}
              >
                <span>SIMULATE PRODUCER JOINING</span>
              </button>
            )}

            {lobbyStatus === 'starting' && (
              <div style={styles.startingCountdownOverlay}>
                <h4 style={{ color: 'var(--accent-green)', animation: 'pulse 1s infinite' }}>MATCH SCRAMBLE INITIALIZED!</h4>
                <p style={{ fontSize: '0.8rem', color: '#a0a5b5' }}>Connecting to Supabase Realtime Channels...</p>
              </div>
            )}

            {lobbyStatus === 'active' && (
              <div style={styles.activeRoomNotice}>
                <h4 style={{ color: 'var(--accent-green)' }}>✓ Live WebSocket Arena Activated</h4>
                <p style={{ fontSize: '0.8rem', color: '#a0a5b5', marginTop: '0.2rem' }}>
                  A Mini-Kit zip has been generated. Head back to the Battle page to complete your DAW layout before the 15-minute timer expires!
                </p>
                <button className="btn-secondary" onClick={handleResetLobby} style={{ marginTop: '1rem', width: '100%', justifyContent: 'center' }}>
                  Quit Match & Re-queue
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Modifier Configuration Card */}
        {activeModifier && (
          <div className="glass-card" style={{ ...styles.modifierCard, borderColor: activeModifier.color }}>
            <div style={styles.modBadgeRow}>
              <span className="badge badge-executive" style={{ color: activeModifier.color, borderColor: activeModifier.color, background: 'rgba(255,255,255,0.02)' }}>
                ACTIVE MODIFIER CONTROLLER
              </span>
              <Sparkles size={16} color={activeModifier.color} />
            </div>

            <div style={styles.modDisplay}>
              <div style={{ ...styles.modIconBox, background: `rgba(255,255,255,0.02)`, borderColor: activeModifier.color }}>
                <ModifierIcon size={36} color={activeModifier.color} />
              </div>

              <div style={styles.modTexts}>
                <h2 style={{ ...styles.modTitle, color: activeModifier.color }}>{activeModifier.name}</h2>
                <span style={styles.constraintTag}>{activeModifier.constraint}</span>
              </div>
            </div>

            <p style={styles.modDesc}>{activeModifier.description}</p>

            <div style={styles.alertCard}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Trophy size={14} color="var(--accent-cyan)" />
                Anti-Cheat Verification active
              </h4>
              <p style={{ fontSize: '0.72rem', color: '#a0a5b5', lineHeight: 1.35, marginTop: '0.25rem' }}>
                 DAW arrangement project directories will be inspected if you place in the Top 3 to ensure compliance with this modifier layout!
              </p>
            </div>
          </div>
        )}

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
  controls: {
    display: 'flex',
    gap: '1rem',
  },
  btnIcon: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  lobbyGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '2rem',
    marginTop: '0.5rem',
  },
  waitingCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    paddingBottom: '1rem',
  },
  indicatorContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  statusIndicator: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    boxShadow: '0 0 8px currentColor',
  },
  statusText: {
    fontSize: '0.72rem',
    fontWeight: 800,
    letterSpacing: '0.06em',
    color: '#ffffff',
  },
  timerTag: {
    fontSize: '0.75rem',
    fontFamily: 'monospace',
    fontWeight: 'bold',
    background: 'rgba(255, 119, 0, 0.04)',
    padding: '0.25rem 0.6rem',
    border: '1px solid rgba(255, 119, 0, 0.15)',
    borderRadius: '0px',
    color: '#a0a5b5',
  },
  playerCountWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.25rem',
    padding: '1rem 0',
  },
  usersIconContainer: {
    width: '60px',
    height: '60px',
    borderRadius: '0px',
    background: '#020204',
    border: '2px solid rgba(255, 119, 0, 0.25)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterTexts: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.2rem',
  },
  counterValue: {
    fontSize: '2.2rem',
    fontFamily: 'var(--font-display)',
    fontWeight: 'normal',
    lineHeight: 1,
    color: '#ffffff',
  },
  counterLabel: {
    fontSize: '0.8rem',
    color: '#a0a5b5',
  },
  lobbyConfigList: {
    background: '#020204',
    border: '1px solid rgba(255, 166, 0, 0.15)',
    borderRadius: '0px',
    padding: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  configItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '0.78rem',
    color: '#a0a5b5',
    borderBottom: '1px solid rgba(255, 166, 0, 0.1)',
    paddingBottom: '0.5rem',
  },
  actionSection: {
    marginTop: '0.5rem',
  },
  joinBtn: {
    width: '100%',
    justifyContent: 'center',
    padding: '1rem',
  },
  startingCountdownOverlay: {
    textAlign: 'center',
    padding: '1rem',
    background: 'rgba(255, 119, 0, 0.05)',
    border: '2px solid rgba(255, 119, 0, 0.25)',
    borderRadius: '0px',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
  },
  activeRoomNotice: {
    padding: '1.25rem',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '2px solid rgba(255, 255, 255, 0.25)',
    borderRadius: '0px',
  },
  
  // Modifier Card
  modifierCard: {
    border: '1px solid',
    background: 'rgba(18, 18, 26, 0.85)',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  modBadgeRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modDisplay: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.25rem',
  },
  modIconBox: {
    width: '64px',
    height: '64px',
    borderRadius: '0px',
    border: '2px dashed',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modTexts: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.2rem',
  },
  modTitle: {
    fontSize: '1.5rem',
    fontFamily: 'var(--font-display)',
    fontWeight: 'normal',
  },
  constraintTag: {
    fontSize: '0.68rem',
    fontWeight: 'bold',
    background: 'rgba(255, 166, 0, 0.08)',
    border: '1px solid rgba(255, 166, 0, 0.25)',
    padding: '0.15rem 0.4rem',
    borderRadius: '0px',
    width: 'fit-content',
    color: '#ffffff',
  },
  modDesc: {
    fontSize: '0.88rem',
    color: '#a0a5b5',
    lineHeight: 1.5,
  },
  alertCard: {
    background: 'rgba(255, 119, 0, 0.04)',
    border: '2px solid rgba(255, 119, 0, 0.15)',
    borderRadius: '0px',
    padding: '0.85rem',
    marginTop: 'auto',
  }
};
