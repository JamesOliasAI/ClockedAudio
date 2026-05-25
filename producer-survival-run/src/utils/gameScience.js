// ====================================================================
// CLOCKED AUDIO - GAME SCIENCE ALGORITHMS (PURE JS)
// ====================================================================

// --------------------------------------------------------------------
// 1. XP PROGRESSION MATH
// --------------------------------------------------------------------

/**
 * Calculates the XP required to level up FROM a given level L to L+1.
 * Formula: XP_req(L) = floor(A * L^B) + C
 * A = 120, B = 1.8, C = 200
 */
export function getXPToNextLevel(level) {
  const A = 120;
  const B = 1.8;
  const C = 200;
  return Math.floor(A * Math.pow(level, B)) + C;
}

/**
 * Calculates the total cumulative XP required to reach a specific level.
 */
export function getCumulativeXPForLevel(level) {
  let xp = 0;
  for (let i = 1; i < level; i++) {
    xp += getXPToNextLevel(i);
  }
  return xp;
}

/**
 * Resolves a cumulative XP amount into current Level, Level XP progress, 
 * XP needed for next level, and percentage completion.
 */
export function getLevelAndProgress(cumulativeXP) {
  let currentLevel = 1;
  let remainingXP = cumulativeXP;
  
  while (true) {
    const xpNeeded = getXPToNextLevel(currentLevel);
    if (remainingXP >= xpNeeded) {
      remainingXP -= xpNeeded;
      currentLevel++;
    } else {
      break;
    }
  }
  
  const xpForNextLevel = getXPToNextLevel(currentLevel);
  const percentage = Math.round((remainingXP / xpForNextLevel) * 100);
  
  return {
    level: currentLevel,
    xpInCurrentLevel: remainingXP,
    xpForNextLevel: xpForNextLevel,
    percentage: percentage,
    rankName: getRankTierName(currentLevel)
  };
}

/**
 * Resolves a level integer to its Rank Tier Name.
 */
export function getRankTierName(level) {
  if (level < 5) return 'Bedroom Producer (Bronze I)';
  if (level < 10) return 'Bedroom Producer (Bronze II)';
  if (level < 15) return 'Garage Hobbyist (Silver I)';
  if (level < 20) return 'Garage Hobbyist (Silver II)';
  if (level < 25) return 'Local Noise Maker (Gold I)';
  if (level < 30) return 'Local Noise Maker (Gold II)';
  if (level < 40) return 'Studio Veteran (Platinum I)';
  if (level < 50) return 'Studio Veteran (Platinum II)';
  return 'Label Executive (Grandmaster)';
}

/**
 * Calculates XP earned from a Daily Drop challenge session.
 */
export function calculateDailyDropXP(uploaded, votesCount, predictsCount, placement) {
  let xp = 0;
  
  // 1. MP3 Submission check (+100 XP)
  if (uploaded) xp += 100;
  
  // 2. Voting Feed XP (+10 XP per vote, capped at 10 votes, max 100 XP)
  const voteXP = Math.min(votesCount, 10) * 10;
  xp += voteXP;
  
  // 3. Predictive Bonus (+50 XP per predicted track in top 10%)
  xp += (predictsCount * 50);
  
  // 4. Placement XP
  if (placement === 1) {
    xp += 1000;
  } else if (placement >= 2 && placement <= 5) {
    xp += 500;
  } else if (placement >= 6 && placement <= 10) {
    xp += 250;
  } else if (placement === 'top_10') {
    xp += 100;
  }
  
  return xp;
}

/**
 * Calculates XP earned from a Live Ranked Lobby match.
 */
export function calculateLobbyXP(participated, votesComplete, placement) {
  let xp = 0;
  
  if (participated) xp += 50;
  if (votesComplete) xp += 30; // must rate all 9 opponents to receive
  
  // Placement math: floor(500 / P) for P 1 to 10
  if (placement >= 1 && placement <= 10) {
    xp += Math.floor(500 / placement);
  }
  
  return xp;
}


// --------------------------------------------------------------------
// 2. MATCHMAKING & MMR SYSTEM (MULTIPLAYER ELO)
// --------------------------------------------------------------------

/**
 * Probability that player I ranks better than player J.
 * Formula: E_ij = 1 / (1 + 10^((R_j - R_i) / 400))
 */
export function getExpectedOutcome(ratingI, ratingJ) {
  return 1 / (1 + Math.pow(10, (ratingJ - ratingI) / 400));
}

/**
 * Actual matchup score based on rank placement.
 * S_ij = 1.0 (win), 0.5 (tie), 0.0 (loss)
 */
export function getActualScore(placementI, placementJ) {
  if (placementI < placementJ) return 1.0;
  if (placementI === placementJ) return 0.5;
  return 0.0;
}

/**
 * Adjusts MMR rating for Player I based on 9 virtual 1v1 matchups in a 10-player lobby.
 * K-Factor = 8
 * @param {number} currentMMR - The rating of Player I
 * @param {Array<{mmr: number, placement: number}>} opponents - List of 9 opponents' ratings and placements
 * @param {number} placementI - The lobby placement of Player I (1 to 10)
 * @param {number} K - K-Factor scaling constant
 */
export function calculateMMRAdjustment(currentMMR, opponents, placementI, K = 8) {
  let totalDelta = 0;
  
  opponents.forEach(opponent => {
    const expected = getExpectedOutcome(currentMMR, opponent.mmr);
    const actual = getActualScore(placementI, opponent.placement);
    totalDelta += (actual - expected);
  });
  
  const delta = Math.round(K * totalDelta);
  return {
    delta: delta,
    newMMR: Math.max(0, currentMMR + delta) // Floor at 0 MMR
  };
}


// --------------------------------------------------------------------
// 3. FAIR-VOTING & ANTI-SABOTAGE (Z-SCORE NORMALIZATION)
// --------------------------------------------------------------------

/**
 * Normalizes a set of scores given by a single judge to neutralize sabotage or extreme bias.
 * Formula: z_ki = (x_ki - mean) / (stdDev + epsilon)
 * If stdDev = 0 (e.g. voted 1 stars for all opponents to sabotage), applies anti-cheat flag.
 */
export function normalizeJudgeVotes(scores, epsilon = 0.001) {
  const count = scores.length;
  if (count === 0) return { zScores: [], mean: 0, stdDev: 0, isSabotage: false };
  
  // 1. Calculate Mean (mu)
  const sum = scores.reduce((a, b) => a + b, 0);
  const mean = sum / count;
  
  // 2. Calculate Standard Deviation (sigma)
  const varianceSum = scores.reduce((a, b) => a + Math.pow(b - mean, 2), 0);
  const stdDev = Math.sqrt(varianceSum / count);
  
  // 3. Sabotage Check: Standard deviation of 0 means judge scored everything identical
  const isSabotage = stdDev === 0;
  
  // 4. Calculate Z-Scores
  const zScores = scores.map(score => {
    if (isSabotage) return 0; // Sabotage votes normalized to 0 (will not rank up/down)
    return (score - mean) / (stdDev + epsilon);
  });
  
  return {
    zScores: zScores,
    mean: Number(mean.toFixed(2)),
    stdDev: Number(stdDev.toFixed(3)),
    isSabotage: isSabotage
  };
}


// --------------------------------------------------------------------
// 4. DAILY DROP FEED SORTING (WILSON LOWER BOUND)
// --------------------------------------------------------------------

/**
 * Sorts asynchronous daily drops swipe feeds using the Wilson Score Interval.
 * Ensures high vote count posts rise while protecting fresh content from being buried.
 * confidence = 1.96 (represents 95% confidence level)
 */
export function getWilsonScore(upvotes, downvotes, confidence = 1.96) {
  const n = upvotes + downvotes;
  if (n === 0) return 0;
  
  const p_hat = upvotes / n;
  const z = confidence;
  
  const numerator = p_hat + (z * z) / (2 * n) - z * Math.sqrt((p_hat * (1 - p_hat)) / n + (z * z) / (4 * n * n));
  const denominator = 1 + (z * z) / n;
  
  return numerator / denominator;
}


// --------------------------------------------------------------------
// 5. PITCH SHIFT & TEMPO PITCH-DRIFT FORMULAS
// --------------------------------------------------------------------

const NOTE_VALUES = {
  'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5,
  'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
};

const VALUE_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/**
 * Translates a note name to semitone integer value.
 */
function parseKeyToValue(key) {
  if (typeof key === 'number') return key % 12;
  const normalizedKey = key.trim().substring(0, 1).toUpperCase() + key.trim().substring(1).toLowerCase();
  return NOTE_VALUES[normalizedKey] !== undefined ? NOTE_VALUES[normalizedKey] : 0;
}

/**
 * Converts a semitone integer value back to a standard Note key name.
 */
export function valueToKeyName(val) {
  const positiveVal = ((val % 12) + 12) % 12;
  return VALUE_NOTES[positiveVal];
}

/**
 * Calculates Key Transposition Interval required to shift source Key to target Key.
 * Keeps interval between -5 and +6 semitones to prevent artifacting.
 * Formula: I = (K_target - K_source) % 12
 */
export function getKeyTranspositionInterval(targetKey, sourceKey) {
  const targetVal = parseKeyToValue(targetKey);
  const sourceVal = parseKeyToValue(sourceKey);
  
  let interval = (targetVal - sourceVal) % 12;
  
  // Wrap modulus properly
  if (interval < 0) {
    interval += 12;
  }
  
  // Keep shift tight: -5 to +6
  if (interval > 6) {
    interval -= 12;
  }
  if (interval < -5) {
    interval += 12;
  }
  
  return interval;
}

/**
 * Calculates pitch frequency drift in semitones when stretching samples to target BPM.
 * Formula: S_drift = 12 * log2(BPM_target / BPM_source)
 */
export function getPitchDriftSemitones(targetBPM, sourceBPM) {
  if (!targetBPM || !sourceBPM || sourceBPM === 0) return 0;
  const drift = 12 * Math.log2(targetBPM / sourceBPM);
  return Number(drift.toFixed(2));
}
