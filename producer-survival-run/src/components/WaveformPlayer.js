'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Play, Pause, Volume2, Move } from 'lucide-react';

export default function WaveformPlayer({ 
  audioId = 'demo-track', 
  audioUrl = null,
  title = 'Anonymous Beat',
  bpm = 140,
  keySignature = 'F# Minor',
  onRate = null,
  showRating = true,
  ratingMode = 'stars',
  hideMeta = false
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const audioContextRef = useRef(null);
  const synthIntervalRef = useRef(null);
  const audioElRef = useRef(null);
  const animationFrameRef = useRef(null);
  
  const masterGainNodeRef = useRef(null);
  const globalVolumeRef = useRef(80);
  const globalMutedRef = useRef(false);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [playTime, setPlayTime] = useState(0); // in seconds
  const [rating, setRating] = useState(0);
  const [audioDuration, setAudioDuration] = useState(20);
  
  const trackDuration = audioUrl && !audioUrl.endsWith('.zip') ? audioDuration : 20; // 20-second loops
  
  // Seed a deterministic set of waveform heights for this track ID
  const generateWaveformHeights = (id) => {
    const numBars = 50;
    const heights = [];
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    for (let i = 0; i < numBars; i++) {
      const scale = 15 + Math.abs((Math.sin(i * 0.25) * 45) + (Math.cos(i * 0.7) * 20));
      const seededNoise = Math.abs((hash + i * 492931) % 40) / 100 * 20;
      heights.push(Math.min(90, Math.max(10, Math.round(scale + seededNoise))));
    }
    return heights;
  };
  
  const heights = generateWaveformHeights(audioId);

  // Set up real audio element if a playable URL is provided
  useEffect(() => {
    if (audioUrl && !audioUrl.endsWith('.zip')) {
      const audio = new Audio(audioUrl);
      audio.loop = true;
      audio.crossOrigin = 'anonymous';
      
      const handleLoadedMetadata = () => {
        if (audio.duration && audio.duration !== Infinity) {
          setAudioDuration(audio.duration);
        }
      };
      
      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      audioElRef.current = audio;
      
      return () => {
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audio.pause();
        audio.src = '';
      };
    } else {
      audioElRef.current = null;
    }
  }, [audioUrl]);
  
  // Initialize Web Audio Synth Loop (Fallback)
  const startSynthesizer = () => {
    if (audioElRef.current) {
      audioElRef.current.volume = globalMutedRef.current ? 0 : (globalVolumeRef.current / 100);
      audioElRef.current.play().catch(e => console.warn('Audio playback failed', e));
      setIsPlaying(true);
      
      const updateRealTime = () => {
        if (audioElRef.current) {
          setPlayTime(audioElRef.current.currentTime);
        }
        animationFrameRef.current = requestAnimationFrame(updateRealTime);
      };
      updateRealTime();
      return;
    }

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      
      // Initialize Master Gain Node connected directly to context output destination
      if (!masterGainNodeRef.current) {
        const masterGain = ctx.createGain();
        const initialVol = globalMutedRef.current ? 0 : (globalVolumeRef.current / 100);
        masterGain.gain.setValueAtTime(initialVol, ctx.currentTime);
        masterGain.connect(ctx.destination);
        masterGainNodeRef.current = masterGain;
      }
      
      setIsPlaying(true);
      
      let step = Math.floor((playTime / trackDuration) * 16) % 16;
      
      const tempo = bpm;
      const stepDuration = 60 / tempo / 2; // 8th notes
      
      const playStep = () => {
        const time = ctx.currentTime;
        
        // 1. Kick drum
        if (step % 4 === 0) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(masterGainNodeRef.current || ctx.destination);
          
          osc.frequency.setValueAtTime(150, time);
          osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.15);
          
          gain.gain.setValueAtTime(0.4, time);
          gain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);
          
          osc.start(time);
          osc.stop(time + 0.16);
        }
        
        // 2. Snare
        if (step % 8 === 4) {
          const bufferSize = ctx.sampleRate * 0.15;
          const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
          }
          
          const noise = ctx.createBufferSource();
          noise.buffer = buffer;
          
          const noiseFilter = ctx.createBiquadFilter();
          noiseFilter.type = 'highpass';
          noiseFilter.frequency.setValueAtTime(1000, time);
          
          const noiseGain = ctx.createGain();
          noiseGain.gain.setValueAtTime(0.18, time);
          noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.12);
          
          noise.connect(noiseFilter);
          noiseFilter.connect(noiseGain);
          noiseGain.connect(masterGainNodeRef.current || ctx.destination);
          
          noise.start(time);
          noise.stop(time + 0.15);
        }
        
        // 3. Melodic Pentatonic Synth
        const scaleFreqs = [185.00, 220.00, 246.94, 277.18, 329.63, 369.99, 440.00];
        const noteIndex = Math.abs(audioId.charCodeAt(step % audioId.length) + step) % scaleFreqs.length;
        const frequency = scaleFreqs[noteIndex];
        
        const melodyPattern = [1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 1, 0];
        if (melodyPattern[step] === 1) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(frequency, time);
          
          const filter = ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.Q.setValueAtTime(4, time);
          filter.frequency.setValueAtTime(600, time);
          filter.frequency.exponentialRampToValueAtTime(150, time + 0.2);
          
          gain.gain.setValueAtTime(0.1, time);
          gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);
          
          osc.connect(filter);
          filter.connect(gain);
          gain.connect(masterGainNodeRef.current || ctx.destination);
          
          osc.start(time);
          osc.stop(time + 0.4);
        }
        
        setPlayTime((prev) => {
          const next = prev + stepDuration;
          return next >= trackDuration ? 0 : next;
        });
        
        step = (step + 1) % 16;
      };
      
      synthIntervalRef.current = setInterval(playStep, stepDuration * 1000);
      
    } catch (e) {
      console.warn("Web Audio API block", e);
    }
  };

  const stopSynthesizer = () => {
    if (audioElRef.current) {
      audioElRef.current.pause();
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    }
    if (synthIntervalRef.current) {
      clearInterval(synthIntervalRef.current);
      synthIntervalRef.current = null;
    }
    setIsPlaying(false);
  };

  // Canvas Drawing Core Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const dpr = window.devicePixelRatio || 1;
    const width = 400;
    const height = 120;
    
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);
    
    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      
      // 1. Draw subtle electric blue coordinates grid lines
      ctx.strokeStyle = 'rgba(255, 119, 0, 0.08)';
      ctx.lineWidth = 1;
      // Horizontal grid lines
      for (let y = 15; y < height; y += 20) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      // Vertical grid lines
      for (let x = 20; x < width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      
      // Draw background noise glow on hover (electric blue)
      if (isHovered) {
        const grad = ctx.createRadialGradient(width/2, height/2, 10, width/2, height/2, width/2);
        grad.addColorStop(0, 'rgba(255, 119, 0, 0.08)');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      }
      
      const barWidth = 4;
      const barGap = 4;
      const totalBarWidth = barWidth + barGap;
      const startX = (width - (heights.length * totalBarWidth - barGap)) / 2;
      
      const currentProgressRatio = playTime / trackDuration;
      const activeBarLimit = Math.floor(heights.length * currentProgressRatio);
      
      heights.forEach((barHeight, idx) => {
        const x = startX + idx * totalBarWidth;
        const y = (height - barHeight) / 2;
        
        const isActive = idx <= activeBarLimit;
        
        if (isActive) {
          // Glow gradient active state (premium white to deep blue)
          const grad = ctx.createLinearGradient(x, y, x, y + barHeight);
          grad.addColorStop(0, '#ffffff'); /* High contrast white top */
          grad.addColorStop(0.5, '#ffa600'); /* Bright electric blue middle */
          grad.addColorStop(1, '#cc4400'); /* Deep royal blue bottom */
          ctx.fillStyle = grad;
          
          ctx.shadowBlur = 6;
          ctx.shadowColor = 'rgba(255, 166, 0, 0.6)';
        } else {
          // Idle dark blue state
          ctx.fillStyle = isHovered ? '#0a1931' : '#030815';
          ctx.shadowBlur = 0;
        }
        
        // Draw sharp bars (no border-radius for classic pixel feel!)
        ctx.beginPath();
        ctx.rect(x, y, barWidth, barHeight);
        ctx.fill();
      });
      
      // Draw play scrub position needle indicator line (pure white)
      if (isHovered) {
        const scrubX = startX + (heights.length * totalBarWidth - barGap) * currentProgressRatio;
        ctx.beginPath();
        ctx.strokeStyle = '#ffffff'; /* High-contrast white scrub needle */
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#ffa600';
        ctx.moveTo(scrubX, 0);
        ctx.lineTo(scrubX, height);
        ctx.stroke();
      }
    };
    
    draw();
  }, [playTime, isHovered, heights, audioId]);

  // Clean up synth loops on unmount
  useEffect(() => {
    return () => {
      if (synthIntervalRef.current) clearInterval(synthIntervalRef.current);
    };
  }, []);

  // Sync and listen to global audio broadcast event in real-time
  useEffect(() => {
    // 1. Fetch initial values on client mount
    const savedVol = localStorage.getItem('global-volume');
    const savedMute = localStorage.getItem('global-muted');
    if (savedVol !== null) {
      globalVolumeRef.current = parseInt(savedVol, 10);
    }
    if (savedMute !== null) {
      globalMutedRef.current = savedMute === 'true';
    }

    // 2. Synchronously adjust Master Gain Node to match volume updates
    const handleAudioChange = (e) => {
      const { volume, isMuted } = e.detail;
      globalVolumeRef.current = volume;
      globalMutedRef.current = isMuted;

      if (masterGainNodeRef.current && audioContextRef.current) {
        const targetVol = isMuted ? 0 : (volume / 100);
        // Use smooth linear scaling ramp to prevent audible clicks
        masterGainNodeRef.current.gain.linearRampToValueAtTime(targetVol, audioContextRef.current.currentTime + 0.05);
      }
    };

    window.addEventListener('global-audio-change', handleAudioChange);
    return () => window.removeEventListener('global-audio-change', handleAudioChange);
  }, []);

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const togglePlay = () => {
    if (isPlaying) {
      stopSynthesizer();
    } else {
      startSynthesizer();
    }
  };

  const handleWheel = (e) => {
    if (!isHovered) return;
    e.preventDefault();
    const delta = e.deltaY;
    const scrubInterval = 0.5; // shift 0.5s per wheel tick
    
    setPlayTime((prev) => {
      let next = prev + (delta > 0 ? scrubInterval : -scrubInterval);
      if (next < 0) next = trackDuration - 0.5;
      if (next >= trackDuration) next = 0;
      return next;
    });
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isHovered) return;
      
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        if (isPlaying) {
          stopSynthesizer();
        } else {
          startSynthesizer();
        }
      }
      
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setPlayTime((prev) => (prev + 1 >= trackDuration ? 0 : prev + 1));
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setPlayTime((prev) => (prev - 1 < 0 ? trackDuration - 1 : prev - 1));
      }
      
      if (['1', '2', '3', '4', '5'].includes(e.key)) {
        const score = parseInt(e.key, 10);
        setRating(score);
        if (onRate) {
          onRate(score);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isHovered, isPlaying]);

  return (
    <div 
      ref={containerRef}
      className="glass-card interactive" 
      style={{
        ...styles.card,
        borderColor: isHovered ? 'var(--accent-cyan)' : 'rgba(255, 166, 0, 0.25)',
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={togglePlay}
    >
      <div style={styles.header}>
        <div>
          <span style={styles.trackLabel}>SUBMISSION</span>
          <h4 style={styles.trackTitle}>{title}</h4>
        </div>
        {!hideMeta && (
          <div style={styles.trackMeta}>
            <span style={styles.metaTag}>{bpm} BPM</span>
            <span style={styles.metaTag}>{keySignature}</span>
          </div>
        )}
      </div>

      {/* Dynamic Waveform Player Canvas Container */}
      <div 
        className="waveform-canvas-container"
        onWheel={handleWheel}
        style={styles.canvasContainer}
      >
        <canvas ref={canvasRef} />
        
        {/* Helper visual hints */}
        {isHovered ? (
          <div className="waveform-scrub-info" style={styles.scrubHint}>
            <Move size={10} style={{ marginRight: '4px' }} />
            SCROLL WHEEL TO SCRUB • ARROW KEYS
          </div>
        ) : (
          <div style={styles.hoverOverlay}>
            <div style={styles.playPulseBtn}>
              <Play size={14} fill="#ffffff" style={{ marginLeft: '1px' }} />
            </div>
            <span style={styles.hoverText}>CLICK TO PLAY / PAUSE</span>
          </div>
        )}

        {/* Live track clock timer */}
        <div style={styles.clockTimer}>
          {Math.floor(playTime).toString().padStart(2, '0')}:
          {Math.round((playTime % 1) * 100).toString().padStart(2, '0')}
        </div>
      </div>

      {/* Voting Rating Module */}
      {showRating && (
        <div style={styles.votingRow}>
          <span style={styles.votingLabel}>RATING JUDGEMENT</span>
          {ratingMode === 'stars' ? (
            <div style={styles.starsGroup}>
              {[1, 2, 3, 4, 5].map((starNum) => (
                <button
                  key={starNum}
                  onClick={() => {
                    setRating(starNum);
                    if (onRate) onRate(starNum);
                  }}
                  style={{
                    ...styles.starBtn,
                    color: rating >= starNum ? 'var(--accent-cyan)' : '#22222a',
                    textShadow: rating >= starNum ? '0 0 10px rgba(255, 119, 0, 0.7)' : 'none',
                  }}
                  title={`Rate ${starNum} Stars`}
                >
                  ★
                </button>
              ))}
              {rating > 0 && <span style={styles.ratingValue}>({rating}/5)</span>}
            </div>
          ) : (
            <div style={styles.upDownGroup}>
              <button
                onClick={(e) => {
                  e.stopPropagation(); // prevent clicking button from playing audio
                  setRating(-1); // -1 for downvote
                  if (onRate) onRate(-1);
                }}
                style={{
                  ...styles.upDownBtn,
                  borderColor: rating === -1 ? '#ff7700' : 'rgba(255, 255, 255, 0.1)',
                  color: rating === -1 ? '#ffffff' : '#888',
                  background: rating === -1 ? '#ff7700' : 'transparent',
                  animation: rating === -1 ? 'rain-drop 1s infinite' : 'none'
                }}
              >
                {rating === -1 ? '🌧 TRASH' : 'TRASH'}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation(); // prevent clicking button from playing audio
                  setRating(1); // 1 for upvote
                  if (onRate) onRate(1);
                }}
                style={{
                  ...styles.upDownBtn,
                  borderColor: rating === 1 ? '#ff5500' : 'rgba(255, 255, 255, 0.1)',
                  color: rating === 1 ? '#ffffff' : '#888',
                  background: rating === 1 ? '#ff5500' : 'transparent',
                  animation: rating === 1 ? 'fire-flicker 1s infinite' : 'none'
                }}
              >
                {rating === 1 ? '🔥 FIRE' : 'FIRE'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  card: {
    padding: '1.25rem',
    borderRadius: '0px',
    background: '#000000',
    border: '2px solid rgba(255, 119, 0, 0.25)',
    cursor: 'pointer',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.8rem',
    boxShadow: '0 0 10px rgba(0, 0, 0, 0.7)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  trackLabel: {
    fontSize: '0.62rem',
    fontFamily: 'var(--font-display)',
    color: 'var(--accent-purple)',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
  },
  trackTitle: {
    fontSize: '0.82rem',
    fontFamily: 'var(--font-display)',
    color: '#ffffff',
    marginTop: '0.2rem',
  },
  trackMeta: {
    display: 'flex',
    gap: '0.4rem',
  },
  metaTag: {
    fontSize: '0.75rem',
    fontWeight: 'normal',
    padding: '0.2rem 0.5rem',
    background: '#0a0a0a',
    border: '1px solid rgba(255, 119, 0, 0.15)',
    borderRadius: '0px',
    color: '#a0a0b0',
    fontFamily: 'var(--font-mono)',
  },
  canvasContainer: {
    position: 'relative',
    width: '100%',
    height: '120px',
    background: '#020202',
    borderRadius: '0px',
    border: '2px solid rgba(255, 119, 0, 0.15)',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hoverOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.65)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.6rem',
    pointerEvents: 'none',
    zIndex: 10,
  },
  playPulseBtn: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    background: 'var(--accent-gradient)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ffffff',
    boxShadow: '0 0 10px rgba(255, 119, 0, 0.5)',
    border: '1.5px solid var(--accent-cyan)',
  },
  hoverText: {
    fontSize: '0.68rem',
    fontFamily: 'var(--font-display)',
    color: '#a0a0b0',
  },
  scrubHint: {
    position: 'absolute',
    bottom: '6px',
    left: '10px',
    fontSize: '0.68rem',
    color: '#6c6c7c',
    display: 'flex',
    alignItems: 'center',
    pointerEvents: 'none',
  },
  clockTimer: {
    position: 'absolute',
    top: '6px',
    right: '10px',
    background: '#000000',
    padding: '0.15rem 0.4rem',
    borderRadius: '0px',
    border: '1px solid rgba(255, 119, 0, 0.25)',
    fontSize: '0.75rem',
    color: '#ffffff',
    fontFamily: 'var(--font-mono)',
    fontWeight: 'bold',
    pointerEvents: 'none',
    textShadow: '0 0 5px rgba(255, 255, 255, 0.65)',
  },
  votingRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '0.4rem',
    borderTop: '1px solid rgba(255, 119, 0, 0.15)',
  },
  votingLabel: {
    fontSize: '0.68rem',
    fontFamily: 'var(--font-display)',
    color: '#5c5c6c',
  },
  starsGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
  },
  starBtn: {
    background: 'none',
    border: 'none',
    fontSize: '1.2rem',
    cursor: 'pointer',
    padding: '0 0.05rem',
    transition: 'transform 0.1s, color 0.1s',
    outline: 'none',
  },
  ratingValue: {
    fontSize: '0.8rem',
    fontWeight: 'bold',
    color: 'var(--accent-cyan)',
    marginLeft: '0.4rem',
    fontFamily: 'var(--font-mono)',
  },
  upDownGroup: {
    display: 'flex',
    gap: '0.5rem',
  },
  upDownBtn: {
    padding: '0.3rem 0.6rem',
    fontSize: '0.7rem',
    fontFamily: 'var(--font-display)',
    fontWeight: 'bold',
    border: '1px solid',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  }
};
