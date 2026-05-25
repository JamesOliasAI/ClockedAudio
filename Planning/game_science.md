# Game Science, Mathematics & Sourcing Formulas
**Document Version:** 1.0

This document outlines the mathematical models, algorithms, and procedural systems that govern **Clocked Audio**. These systems are designed to ensure fair play, prevent strategic voting sabotage, maintain an engaging progression curve, and drive high-quality music creation.

---

## 1. XP Progression System (Progression Science)

To keep players highly engaged, the progression curve is modeled using a polynomial scaling formula common in modern multiplayer games. This ensures early ranks are reached quickly (instant gratification) while high-end ranks require dedicated mastery.

### A. Level-Up Threshold Formula
The total XP required to reach any given level $L$ is governed by:

$$XP_{req}(L) = \lfloor A \cdot L^B \rfloor + C$$

*   **Constants:**
    *   $A = 120$ (Scaling coefficient)
    *   $B = 1.8$ (Exponential growth factor)
    *   $C = 200$ (Base offset)

#### Progression Table Example (Levels 1 - 50)
| Level | XP to Next Level | Cumulative XP | Rank Tier Name |
|---|---|---|---|
| **1** | 320 XP | 0 XP | Bedroom Producer (Bronze I) |
| **2** | 592 XP | 320 XP | Bedroom Producer (Bronze II) |
| **5** | 2,126 XP | 2,420 XP | Garage Hobbyist (Silver I) |
| **10** | 7,570 XP | 12,240 XP | Local Noise Maker (Gold I) |
| **25** | 39,268 XP | 145,200 XP | Studio Veteran (Platinum I) |
| **50** | 137,844 XP | 985,400 XP | Label Executive (Grandmaster) |

---

### B. XP Earned Math

#### 1. Daily Drop (Asynchronous Mode)
XP is awarded for participation, active listening, and placement accuracy.

$$\text{Daily XP} = XP_{submit} + \sum_{i=1}^{V} (XP_{vote}) + XP_{predict\_bonus} + XP_{placement}$$

*   $XP_{submit} = 100\text{ XP}$ (Flat rate for a successful MP3 upload within 20 minutes)
*   $XP_{vote} = 10\text{ XP}$ per vote cast on other tracks (capped at $V = 10$ votes, $\max 100\text{ XP}$)
*   $XP_{predict\_bonus} = 50\text{ XP}$ for each of your upvoted tracks that finishes in the Top 10% globally (incentivizes high-fidelity judging).
*   $XP_{placement}$ (Graduated placement bonuses):
    *   **1st Place:** $+1,000\text{ XP}$
    *   **2nd - 5th Place:** $+500\text{ XP}$
    *   **6th - 10th Place:** $+250\text{ XP}$
    *   **Top 10%:** $+100\text{ XP}$

#### 2. Ranked Lobbies (Synchronous Mode)
*   **Participation Base:** $+50\text{ XP}$
*   **Voting Complete Bonus:** $+30\text{ XP}$ (Must rate all 9 opponents to receive)
*   **Lobby Placement XP ($XP_{place}$):** Calculated dynamically using a reciprocal decay curve based on final position $P$ ($1 \le P \le 10$):

$$XP_{place}(P) = \left\lfloor \frac{500}{P} \right\rfloor$$

*   *1st Place:* $+500\text{ XP}$
*   *2nd Place:* $+250\text{ XP}$
*   *3rd Place:* $+166\text{ XP}$
*   *4th-10th Place:* $+50\text{ XP}$

---

## 2. Matchmaking & MMR Rating System (Matchmaking Science)

To maintain highly competitive live lobbies, the system calculates a hidden **Matchmaking Rating (MMR)**. Since matches feature **10 players** instead of 1v1 faceoffs, the system treats a single battle as $9$ individual 1v1 outcomes for each participant.

### A. Expected Matchup Outcome
For any player $i$ against player $j$, the expected score $E_{ij}$ representing the probability that player $i$ will rank higher than player $j$ is calculated via the standard logistic curve:

$$E_{ij} = \frac{1}{1 + 10^{\frac{R_j - R_i}{400}}}$$

Where $R_i$ and $R_j$ are the current MMR ratings of players $i$ and $j$.

### B. Actual Matchup Score
After the listening party and final score calculations, the actual outcome $S_{ij}$ between player $i$ and $j$ is determined based on their final rank placements $P_i$ and $P_j$:

$$S_{ij} = \begin{cases} 
1.0 & \text{if } P_i < P_j \quad (\text{player } i \text{ placed better than player } j) \\
0.5 & \text{if } P_i = P_j \quad (\text{players tied in average rating}) \\
0.0 & \text{if } P_i > P_j \quad (\text{player } i \text{ placed worse than player } j) 
\end{cases}$$

### C. MMR Update Equation
The total MMR adjustment $\Delta R_i$ for player $i$ is the scaled sum of all 9 virtual matchups:

$$\Delta R_i = K \cdot \sum_{j \neq i} (S_{ij} - E_{ij})$$

*   **$K$-Factor:** Set at $K = 8$. 
*   **Max Theoretical Volatility:** If an MMR $1200$ player places 1st in a lobby of MMR $2000$ players, their maximum possible gain is $\approx +72$ MMR. If they place last in a lobby of MMR $800$ players, their maximum loss is $\approx -72$ MMR.

---

## 3. Fair-Voting Algorithms & Anti-Spam (Fairness Science)

Gamified voting is highly susceptible to manipulation (such as "strategic downvoting," where players score all opponents a 1 to make their own submission rank higher). The following mathematical filters prevent this behavior.

### A. Ranked Lobbies: Z-Score Rating Normalization
Instead of taking the raw average of scores (1 to 5 stars), the system normalizes the ratings of each judge $k$ using their specific voting mean ($\mu_k$) and standard deviation ($\sigma_k$). This neutralizes both "generous voters" (mean rating 4.8) and "sabotage voters" (mean rating 1.2).

#### The Normalization Formula:
For a rating $x_{ki}$ given by voter $k$ to submission $i$:

$$z_{ki} = \frac{x_{ki} - \mu_k}{\sigma_k + \epsilon}$$

Where:
*   $\mu_k$ is the average score voter $k$ gave to *all* tracks in that session.
*   $\sigma_k$ is the standard deviation of voter $k$'s scores in that session.
*   $\epsilon = 0.001$ is a tiny constant preventing division-by-zero if a voter gives every track the identical score.
*   **Anti-Cheat Penalty:** If a voter has $\sigma_k = 0$ (e.g., they voted 1 for every single track to sabotage the lobby), the system completely discards their votes and applies a $-100\text{ XP}$ penalty for unsportsmanlike conduct.

The final score for submission $i$ is the average of its normalized Z-scores across all $N-1$ judges:

$$\text{FinalScore}_i = \frac{1}{N-1} \sum_{k \neq i} z_{ki}$$

---

### B. Daily Drop Feed: Wilson Score Interval
In the asynchronous Daily Drop swipe feed, highly upvoted tracks must rise to the top. However, sorting purely by `Upvotes / TotalVotes` creates a severe bias toward early uploads (e.g., a track with $1\text{ Upvote}$ and $0\text{ Downvotes}$ has a $100\%$ score and would beat a track with $900\text{ Upvotes}$ and $100\text{ Downvotes}$ which has a $90\%$ score).

To solve this, submissions are sorted using the **Wilson Score Interval Lower Bound (95% confidence)**:

$$\text{WilsonScore} = \frac{\hat{p} + \frac{z^2}{2n} - z \sqrt{\frac{\hat{p}(1-\hat{p})}{n} + \frac{z^2}{4n^2}}}{1 + \frac{z^2}{n}}$$

Where:
*   $\hat{p}$ is the fraction of upvotes (i.e., $\frac{\text{Upvotes}}{\text{Total Votes}}$).
*   $n$ is the total number of votes cast on that track.
*   $z = 1.96$ (Represents the 95% confidence boundary quantile).

This mathematical sorting ensures that tracks with high vote density and proven upvote ratios rise safely to the top, while protecting new uploads from being buried.

---

## 4. Dynamic Sound Kit & Sourcing Math (Sound Science)

To deliver randomized yet musically coherent sound kits for ranked battles, the Sound Kit Generator selects samples from a PostgreSQL database using a strict mathematical probability vector.

### A. Sound Kit Distribution Vector
A generated mini-kit contains exactly **8 sound assets** packaged into a ZIP. The composition of these assets is determined by this probability vector:

| Audio Category | Count | Sourcing Rule |
|---|---|---|
| **Kick Drum** | 1 | High transient peak, sub-frequency punch (30Hz - 80Hz). |
| **Snare / Clap** | 1 | Medium frequency peak (150Hz - 500Hz), mid-tail. |
| **Hi-Hats** | 2 | 1 Closed Hat (tight transient) + 1 Open Hat (decay envelope). |
| **808 / Bass Line** | 1 | Monophonic bass loop or key-labeled sub hit. |
| **Melodic Sample** | 2 | Key-labeled melodic loops or one-shots. |
| **FX / Fills** | 1 | Glitch, riser, or vocal atmospheric hit. |

---

### B. Musical Key & Tempo Coherence (Pitch Shift Math)
To ensure the dynamically compiled sounds are usable together, melodic samples must match a targeted battle Key ($K_{target}$) and Tempo ($BPM_{target}$). If a sample in the database has an original key ($K_{source}$) and original tempo ($BPM_{source}$), the client-side system or serverless exporter calculates the required pitch transposition.

#### 1. Key Transposition Formula
The required transposition interval $I$ in semitones is:

$$I = (K_{target} - K_{source}) \pmod{12}$$

*   **Adjustment Rule:** To prevent severe digital artifacting/stretching, the transposition interval is kept between $-5$ and $+6$ semitones:

$$\text{If } I > 6 \implies I = I - 12$$
$$\text{If } I < -5 \implies I = I + 12$$

#### 2. Pitch-Drift Tempo Correction Formula
If a producer stretches a melodic sample to fit the battle tempo ($BPM_{target}$) without using advanced time-stretching algorithms (standard sampler speed pitch shift), the resulting frequency pitch drift in semitones is governed by:

$$S_{drift} = 12 \cdot \log_2 \left( \frac{BPM_{target}}{BPM_{source}} \right)$$

This formula is exposed on the web interface to guide producers on how to tune their samplers to keep the samples in perfect pitch.
