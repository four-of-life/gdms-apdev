// ============================================================
// FOUROFLIFE FLASHCARD DOJO — script.js
// Full Supabase integration (replaces localStorage)
// ============================================================

// ╔══════════════════════════════════════════════════════════╗
// ║  🔧 PASTE YOUR SUPABASE CREDENTIALS HERE                ║
// ║  Same values as in app.js (admin dashboard)             ║
// ╚══════════════════════════════════════════════════════════╝
const SUPABASE_URL      = "https://beogrrghbpvuaaqhdzmk.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlb2dycmdoYnB2dWFhcWhkem1rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MzgwMTUsImV4cCI6MjA5NDIxNDAxNX0.1caisYF7GvwTOPhoEP6szHxOP_wQ2Tj-Y0pw8MNgl6M";

// ── Supabase REST helpers ──────────────────────────────────
const SB = {
  headers: {
    "Content-Type":  "application/json",
    "apikey":        SUPABASE_ANON_KEY,
    "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
    "Prefer":        "return=representation",
  },

  async get(table, params = "") {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, { headers: this.headers });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },

  async post(table, body) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: "POST", headers: this.headers, body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },

  async patch(table, match, body) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${match}`, {
      method: "PATCH", headers: this.headers, body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
};

// ============================================================
// AUDIO ENGINE — Web Audio API (unchanged)
// ============================================================
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null, bgMusicOn = false, bgGain = null;

function getAudio() {
  if (!audioCtx) audioCtx = new AudioCtx();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}
function playTone(type, freq, duration, gain = 0.2, delay = 0) {
  try {
    const ctx = getAudio(), t = ctx.currentTime + delay;
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.connect(g); g.connect(ctx.destination);
    osc.type = type; osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.start(t); osc.stop(t + duration + 0.05);
  } catch(e) {}
}
function soundCorrect() {
  playTone('sine', 523, 0.15, 0.22);
  playTone('sine', 659, 0.15, 0.22, 0.1);
  playTone('sine', 784, 0.15, 0.22, 0.2);
  playTone('sine', 1047, 0.25, 0.3, 0.3);
}
function soundWrong() {
  playTone('sawtooth', 200, 0.12, 0.18);
  playTone('sawtooth', 150, 0.15, 0.16, 0.1);
  playTone('square', 100, 0.18, 0.16, 0.2);
}
function soundClick()    { playTone('triangle', 880, 0.06, 0.1); }
function soundFlip()     { playTone('sine', 440, 0.08, 0.12); playTone('sine', 660, 0.08, 0.1, 0.08); }
function soundComplete() {
  [1047, 1319, 1568, 2093].forEach((f, i) => playTone('sine', f, 0.5, 0.28, i * 0.12));
}

const BPM = 72, BEAT = 60 / BPM, CHORD_DUR = BEAT * 8;
const CHORDS = [
  { pads: [220, 262, 330, 392], bass: 110  },
  { pads: [175, 220, 262, 349], bass: 87.3 },
  { pads: [131, 165, 196, 262], bass: 65.4 },
  { pads: [196, 247, 294, 392], bass: 98   },
];
const PENTA = [220, 247, 262, 294, 330, 392, 440, 494, 523, 587, 659, 784];

function startBgMusic() {
  if (bgMusicOn) return; bgMusicOn = true;
  const ctx = getAudio();
  bgGain = ctx.createGain();
  bgGain.gain.setValueAtTime(0, ctx.currentTime);
  bgGain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 4);
  bgGain.connect(ctx.destination);
  padLoop(ctx, ctx.currentTime);
  bassLoop(ctx, ctx.currentTime + 0.5);
  arpeggioLoop(ctx, ctx.currentTime + 5);
}
function stopBgMusic() {
  if (!bgGain || !audioCtx) return;
  try {
    bgGain.gain.cancelScheduledValues(audioCtx.currentTime);
    bgGain.gain.setValueAtTime(bgGain.gain.value, audioCtx.currentTime);
    bgGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 2);
  } catch(e) {}
  setTimeout(() => { bgMusicOn = false; bgGain = null; }, 2500);
}
function padLoop(ctx, st) {
  if (!bgMusicOn) return;
  CHORDS.forEach((chord, ci) => {
    chord.pads.forEach(freq => {
      [-7, 0, 7].forEach(det => {
        try {
          const when = st + ci * CHORD_DUR;
          const osc = ctx.createOscillator(), g = ctx.createGain();
          osc.connect(g); g.connect(bgGain);
          osc.type = 'sine'; osc.frequency.setValueAtTime(freq, when);
          osc.detune.setValueAtTime(det, when);
          g.gain.setValueAtTime(0, when);
          g.gain.linearRampToValueAtTime(0.055, when + 1.8);
          g.gain.setValueAtTime(0.055, when + CHORD_DUR - 1.5);
          g.gain.linearRampToValueAtTime(0, when + CHORD_DUR + 0.1);
          osc.start(when); osc.stop(when + CHORD_DUR + 0.15);
        } catch(e) {}
      });
    });
  });
  const loopDur = CHORDS.length * CHORD_DUR;
  setTimeout(() => { if (bgMusicOn) padLoop(ctx, st + loopDur); }, (loopDur - 2.5) * 1000);
}
function bassLoop(ctx, st) {
  if (!bgMusicOn) return;
  CHORDS.forEach((chord, ci) => {
    const when = st + ci * CHORD_DUR;
    try {
      const osc = ctx.createOscillator(), g = ctx.createGain();
      osc.connect(g); g.connect(bgGain);
      osc.type = 'sine'; osc.frequency.setValueAtTime(chord.bass, when);
      g.gain.setValueAtTime(0, when);
      g.gain.linearRampToValueAtTime(0.11, when + 0.5);
      g.gain.linearRampToValueAtTime(0, when + CHORD_DUR);
      osc.start(when); osc.stop(when + CHORD_DUR + 0.1);
    } catch(e) {}
  });
  const loopDur = CHORDS.length * CHORD_DUR;
  setTimeout(() => { if (bgMusicOn) bassLoop(ctx, st + loopDur); }, (loopDur - 2) * 1000);
}
function arpeggioLoop(ctx, st) {
  if (!bgMusicOn) return;
  const NOTES = 32, noteDur = BEAT * 0.9;
  let idx = Math.floor(PENTA.length / 2);
  const pattern = [];
  for (let i = 0; i < NOTES; i++) {
    pattern.push(PENTA[idx]);
    idx = Math.max(0, Math.min(PENTA.length - 1, idx + (Math.floor(Math.random() * 3) - 1)));
  }
  pattern.forEach((freq, i) => {
    if (Math.random() < 0.28) return;
    const t = st + i * BEAT;
    try {
      const osc = ctx.createOscillator(), g = ctx.createGain();
      osc.connect(g); g.connect(bgGain);
      osc.type = 'triangle'; osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.04, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t + noteDur * 0.75);
      osc.start(t); osc.stop(t + noteDur);
    } catch(e) {}
  });
  const loopDur = NOTES * BEAT;
  setTimeout(() => { if (bgMusicOn) arpeggioLoop(ctx, st + loopDur); }, (loopDur - 1) * 1000);
}

// ============================================================
// PASSWORD HASHING (unchanged)
// ============================================================
async function hashPassword(pw) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pw));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ============================================================
// SUPABASE DATA LAYER — replaces localStorage
// ============================================================

/**
 * loadData()
 * Loads ALL players from Supabase into the `players` array.
 * Called once at startup and after login.
 */
async function loadData() {
  try {
    const rows = await SB.get(
      "players",
      "select=player_id,name,password_hash,avatar,score,total_questions,total_correct"
    );
    players = rows.map(r => ({
      name:           r.name,
      passwordHash:   r.password_hash,
      avatar:         r.avatar,
      score:          r.score          || 0,
      totalQuestions: r.total_questions || 0,
      totalCorrect:   r.total_correct   || 0,
      history:        [],        // history loaded on-demand after login
      _db_id:         r.player_id,
    }));
  } catch (e) {
    console.error("loadData error:", e);
    players = [];
  }
}

/**
 * saveData()
 * Upserts the current player's stats and inserts a new history session.
 * Called at the end of a quiz.
 */
async function saveData(sessionRecord) {
  if (!currentPlayer) return;
  const pid = currentPlayer._db_id;
  try {
    // 1. Update player stats
    await SB.patch("players", `player_id=eq.${pid}`, {
      score:           currentPlayer.score,
      total_questions: currentPlayer.totalQuestions,
      total_correct:   currentPlayer.totalCorrect,
    });

    // 2. Insert history session
    if (sessionRecord) {
      await SB.post("history", {
        player_id:    pid,
        category:     sessionRecord.category,
        difficulty:   sessionRecord.difficulty,
        score:        sessionRecord.score,
        total:        sessionRecord.total,
        questions:    sessionRecord.questions,
        session_date: new Date().toISOString(),
      });
    }
  } catch (e) {
    console.error("saveData error:", e);
  }
}

/**
 * loadHistory(playerId)
 * Loads history for the logged-in player from Supabase.
 */
async function loadHistory(playerId) {
  try {
    const rows = await SB.get(
      "history",
      `player_id=eq.${playerId}&select=history_id,session_date,category,difficulty,score,total,questions&order=session_date.desc&limit=20`
    );
    return rows.map(r => ({
      date:      new Date(r.session_date).toLocaleString(),
      category:  r.category,
      difficulty: r.difficulty,
      score:     r.score,
      total:     r.total,
      questions: r.questions || [],
    }));
  } catch (e) {
    console.error("loadHistory error:", e);
    return [];
  }
}

/**
 * loadQuestionsFromDB(category)
 * Loads questions from Supabase for a given category.
 * Falls back to hardcoded `database` if Supabase returns nothing.
 */
async function loadQuestionsFromDB(cat) {
  try {
    const rows = await SB.get(
      "questions",
      `category=eq.${cat}&select=question_id,question_text,answer_text,level&order=question_id.asc`
    );
    if (!rows.length) return null; // trigger fallback
    // Group into { level1: [{q,a}], level2: [...], ... }
    const grouped = { level1:[], level2:[], level3:[], level4:[], level5:[] };
    rows.forEach(r => {
      const key = `level${r.level || 1}`;
      if (grouped[key]) grouped[key].push({ q: r.question_text, a: r.answer_text });
    });
    return grouped;
  } catch (e) {
    console.error("loadQuestionsFromDB error:", e);
    return null;
  }
}

// ============================================================
// DIFFICULTY CONFIG (unchanged)
// ============================================================
const difficultyConfig = {
  beginner: { levels:[1,2],     qCount:10, weights:{1:0.6, 2:0.4},                      label:'🌿 Beginner', badge:'beginner' },
  normal:   { levels:[1,2,3],   qCount:15, weights:{1:0.33,2:0.34,3:0.33},              label:'⚔️ Normal',   badge:'normal'   },
  expert:   { levels:[1,2,3,4,5],qCount:20,weights:{1:0.10,2:0.15,3:0.25,4:0.25,5:0.25},label:'💀 Expert',  badge:'expert'   },
};

// ============================================================
// STATE
// ============================================================
let players          = [];
let currentPlayer    = null;
let selectedAvatar   = '';
let index            = 0;
let score            = 0;
let category         = 'javascript';
let currentDiff      = 'normal';
let currentQuestions = [];
let isGraded         = false;
let sessionHistory   = [];
let currentChoices   = [];
let liveDatabase     = null;  // questions loaded from Supabase this session

// Init: load players from Supabase on page load
loadData();

// ============================================================
// AUTH TAB SWITCH (unchanged)
// ============================================================
function switchTab(tab) {
  soundClick();
  document.querySelectorAll('.auth-tab').forEach((t, i) => {
    t.classList.toggle('active', (i === 0 && tab === 'login') || (i === 1 && tab === 'register'));
  });
  document.getElementById('login-form').classList.toggle('hidden', tab !== 'login');
  document.getElementById('register-form').classList.toggle('hidden', tab !== 'register');
  document.getElementById('login-error').classList.add('hidden');
  document.getElementById('reg-error').classList.add('hidden');
}
function showError(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg; el.classList.remove('hidden');
}
function togglePw(inputId, btn) {
  const inp = document.getElementById(inputId);
  inp.type = inp.type === 'password' ? 'text' : 'password';
  btn.textContent = inp.type === 'password' ? '👁' : '🙈';
}

// ============================================================
// AVATAR SELECT (unchanged)
// ============================================================
document.querySelectorAll('#reg-avatars .avatar').forEach(img => {
  img.addEventListener('click', () => {
    soundClick();
    selectedAvatar = img.src;
    document.querySelectorAll('#reg-avatars .avatar').forEach(a => a.classList.remove('selected'));
    img.classList.add('selected');
  });
});

// ============================================================
// REGISTER — saves to Supabase
// ============================================================
async function registerPlayer() {
  const username = document.getElementById('reg-username').value.trim();
  const pw       = document.getElementById('reg-password').value;
  const confirm  = document.getElementById('reg-confirm').value;
  if (!selectedAvatar)     { showError('reg-error', 'Please choose an avatar.'); return; }
  if (!username)            { showError('reg-error', 'Username is required.'); return; }
  if (username.length < 2)  { showError('reg-error', 'Username must be at least 2 characters.'); return; }
  if (!pw)                  { showError('reg-error', 'Password is required.'); return; }
  if (pw.length < 4)        { showError('reg-error', 'Password must be at least 4 characters.'); return; }
  if (pw !== confirm)       { showError('reg-error', 'Passwords do not match.'); return; }

  // Check for duplicate username in Supabase
  await loadData();
  if (players.find(p => p.name.toLowerCase() === username.toLowerCase())) {
    showError('reg-error', 'Username already taken.'); return;
  }

  soundClick();
  const hash = await hashPassword(pw);
  try {
    const [created] = await SB.post("players", {
      name: username, password_hash: hash, avatar: selectedAvatar,
      score: 0, total_questions: 0, total_correct: 0,
    });
    currentPlayer = {
      name: username, passwordHash: hash, avatar: selectedAvatar,
      score: 0, totalQuestions: 0, totalCorrect: 0, history: [],
      _db_id: created.player_id,
    };
    players.push(currentPlayer);
    goToDashboard();
  } catch (e) {
    showError('reg-error', 'Registration failed: ' + e.message);
  }
}

// ============================================================
// LOGIN — verifies against Supabase
// ============================================================
async function loginPlayer() {
  const username = document.getElementById('login-username').value.trim();
  const pw       = document.getElementById('login-password').value;
  if (!username) { showError('login-error', 'Enter your username.'); return; }
  if (!pw)       { showError('login-error', 'Enter your password.'); return; }

  // Refresh players list from Supabase
  await loadData();

  const player = players.find(p => p.name.toLowerCase() === username.toLowerCase());
  if (!player)  { showError('login-error', 'Account not found.'); return; }

  const hash = await hashPassword(pw);
  if (hash !== player.passwordHash) { showError('login-error', 'Wrong password.'); return; }

  soundClick();
  currentPlayer = player;

  // Load this player's history from Supabase
  currentPlayer.history = await loadHistory(currentPlayer._db_id);

  goToDashboard();
}

// ============================================================
// LOGOUT (unchanged logic)
// ============================================================
function logoutPlayer() {
  soundClick(); stopBgMusic();
  currentPlayer = null; selectedAvatar = '';
  hideAllPanels();
  document.getElementById('auth-panel').classList.remove('hidden');
  document.getElementById('login-username').value = '';
  document.getElementById('login-password').value = '';
  document.getElementById('reviewer-fab').style.display = 'flex';
}

// ============================================================
// DASHBOARD (unchanged rendering)
// ============================================================
function goToDashboard() {
  hideAllPanels();
  document.getElementById('player-dashboard').classList.remove('hidden');
  document.getElementById('reviewer-fab').style.display = 'flex';
  updateDashboard();
}
function updateDashboard() {
  if (!currentPlayer) return;
  document.getElementById('dash-avatar').src = currentPlayer.avatar;
  document.getElementById('dash-name').textContent = currentPlayer.name;
  const sessions = (currentPlayer.history || []).length;
  const rate = currentPlayer.totalQuestions
    ? Math.round((currentPlayer.totalCorrect / currentPlayer.totalQuestions) * 100) : 0;
  document.getElementById('dash-stats-row').innerHTML = `
    <span class="stat-chip">Score: <strong>${currentPlayer.score}</strong></span>
    <span class="stat-chip">Accuracy: <strong>${rate}%</strong></span>
    <span class="stat-chip">Sessions: <strong>${sessions}</strong></span>
  `;
}

// ============================================================
// REVIEWER MODE — now uses live DB questions
// ============================================================
let reviewerFlipped = new Set();

function openReviewer() {
  soundClick();
  const overlay = document.getElementById('reviewer-overlay');
  overlay.classList.remove('hidden');
  const dashCat = document.getElementById('dash-category');
  const revCat  = document.getElementById('rev-category');
  if (dashCat && !document.getElementById('player-dashboard').classList.contains('hidden')) {
    revCat.value = dashCat.value;
  }
  loadReviewer();
}
function closeReviewer() {
  soundClick();
  document.getElementById('reviewer-overlay').classList.add('hidden');
}
function loadReviewer() {
  reviewerFlipped = new Set();
  filterReviewer();
}
async function filterReviewer() {
  const cat       = document.getElementById('rev-category').value;
  const level     = document.getElementById('rev-level').value;
  const search    = (document.getElementById('rev-search').value || '').toLowerCase().trim();
  const container = document.getElementById('reviewer-cards');
  container.innerHTML = '<div class="rev-empty">Loading cards…</div>';

  // Prefer Supabase questions; fall back to hardcoded database
  const dbCat = liveDatabase && liveDatabase[cat] ? liveDatabase[cat] : database[cat];

  let allCards = [];
  const levels = level === 'all' ? [1,2,3,4,5] : [parseInt(level)];
  levels.forEach(lvl => {
    const arr = (dbCat && dbCat['level' + lvl]) || [];
    arr.forEach(q => allCards.push({ ...q, _level: lvl }));
  });

  if (search) {
    allCards = allCards.filter(c =>
      c.q.toLowerCase().includes(search) || c.a.toLowerCase().includes(search)
    );
  }

  container.innerHTML = '';
  document.getElementById('rev-count').textContent = `${allCards.length} card${allCards.length !== 1 ? 's' : ''}`;

  if (!allCards.length) {
    container.innerHTML = '<div class="rev-empty">No cards match your search.</div>';
    return;
  }

  allCards.forEach((card) => {
    const key = `${cat}-${card._level}-${card.q}`;
    const isFlippedCard = reviewerFlipped.has(key);
    const el = document.createElement('div');
    el.className = 'rev-card' + (isFlippedCard ? ' flipped-rev' : '');
    el.innerHTML = `
      <div class="rev-card-level">Level ${card._level} · ${cat.toUpperCase()}</div>
      <div class="rev-card-q">${card.q}</div>
      <div class="rev-card-divider"></div>
      ${isFlippedCard
        ? `<div class="rev-card-a">${card.a}</div>`
        : `<div class="rev-card-tap" onclick="toggleRevCard(this, '${key}', '${escQ(card.a)}')">Tap to reveal answer</div>`
      }
    `;
    container.appendChild(el);
  });
}
function escQ(str) {
  return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}
function toggleRevCard(tapEl, key, answer) {
  soundFlip();
  reviewerFlipped.add(key);
  const card = tapEl.closest('.rev-card');
  card.classList.add('flipped-rev');
  tapEl.outerHTML = `<div class="rev-card-a">${answer}</div>`;
}
document.getElementById('reviewer-overlay').addEventListener('click', function(e) {
  if (e.target === this) closeReviewer();
});

// ============================================================
// QUIZ START — loads questions from Supabase first
// ============================================================
async function startQuiz() {
  soundClick();
  category    = document.getElementById('dash-category').value;
  currentDiff = document.getElementById('dash-difficulty').value;

  // Try to load questions from Supabase for this category
  const sbQuestions = await loadQuestionsFromDB(category);
  if (sbQuestions) {
    liveDatabase = { ...liveDatabase, [category]: sbQuestions };
  }
  // If Supabase had nothing, liveDatabase stays null → buildQuestionPool falls back

  index = 0; score = 0;
  sessionHistory = [];
  currentQuestions = buildQuestionPool(category, currentDiff);

  if (!currentQuestions.length) {
    alert("No questions found for this category. Please check the admin dashboard.");
    return;
  }

  hideAllPanels();
  document.getElementById('quiz').classList.remove('hidden');
  document.getElementById('quiz-avatar').src = currentPlayer.avatar;
  document.getElementById('reviewer-fab').style.display = 'flex';
  startBgMusic();
  showQ();
}

function buildQuestionPool(cat, diff) {
  const cfg = difficultyConfig[diff];
  // Use liveDatabase (Supabase) first, then fall back to hardcoded database
  const dbCat = (liveDatabase && liveDatabase[cat]) ? liveDatabase[cat] : database[cat];
  let pool = [];
  cfg.levels.forEach(lvl => {
    const all  = (dbCat && dbCat['level' + lvl]) || [];
    const want = Math.round(cfg.qCount * (cfg.weights[lvl] || 1 / cfg.levels.length));
    shuffle(all).slice(0, want).forEach(q => pool.push({ ...q, _level: lvl }));
  });
  return shuffle(pool).slice(0, cfg.qCount);
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ============================================================
// GENERATE MULTIPLE CHOICE OPTIONS
// ============================================================
function buildChoices(correctAnswer, cat) {
  const dbCat = (liveDatabase && liveDatabase[cat]) ? liveDatabase[cat] : database[cat];
  const allAnswers = [];
  Object.values(dbCat || {}).forEach(levelArr => {
    levelArr.forEach(q => {
      if (q.a !== correctAnswer) allAnswers.push(q.a);
    });
  });
  const distractors = shuffle(allAnswers).slice(0, 3);
  return shuffle([correctAnswer, ...distractors]);
}

// ============================================================
// SHOW QUESTION (unchanged)
// ============================================================
function showQ() {
  isGraded = false;
  const q     = currentQuestions[index];
  const cfg   = difficultyConfig[currentDiff];
  const total = currentQuestions.length;

  const flipCard = document.getElementById('answer-flip-card');
  flipCard.classList.remove('flipped');
  const backFace = document.getElementById('answer-flip-back');
  backFace.classList.remove('state-correct', 'state-wrong');
  document.getElementById('afback-answer').textContent = '';
  document.getElementById('afback-result').textContent = '';
  document.getElementById('afback-result').className = 'afback-result';
  document.getElementById('afback-badge').textContent = '✓';
  document.getElementById('afback-badge').className = 'afback-badge';
  document.getElementById('afback-label').textContent = 'CORRECT ANSWER';

  const expArea = document.getElementById('fc-explanation');
  expArea.setAttribute('data-hidden', 'true');
  expArea.style.display = 'none';
  document.getElementById('fc-exp-loader').style.display = 'none';
  document.getElementById('fc-exp-text').style.display   = 'none';
  document.getElementById('fc-exp-text').textContent     = '';

  const pct = (index / total) * 100;
  document.getElementById('progress-fill').style.width = pct + '%';
  document.getElementById('prog-score').textContent = `Score: ${score}`;
  document.getElementById('prog-tag').textContent = `${cfg.label}  ·  Lv${q._level}`;
  document.getElementById('quiz-progress-info').textContent = `Card ${index + 1} / ${total}`;

  document.getElementById('fc-meta-front').textContent = `${category.toUpperCase()} · Level ${q._level}`;
  document.getElementById('fc-question').textContent = q.q;

  currentChoices = buildChoices(q.a, category);
  renderChoices(currentChoices, q.a);

  const fb = document.getElementById('grade-feedback');
  fb.classList.add('hidden');
  fb.classList.remove('correct-fb', 'wrong-fb');
}

// ============================================================
// RENDER CHOICES (unchanged)
// ============================================================
function renderChoices(choices, correctAnswer) {
  const container = document.getElementById('fc-choices');
  container.innerHTML = '';
  choices.forEach((choice, i) => {
    const btn = document.createElement('button');
    btn.className = 'fc-choice-btn';
    btn.dataset.answer  = choice;
    btn.dataset.correct = (choice === correctAnswer) ? 'true' : 'false';
    const label = String.fromCharCode(65 + i);
    btn.innerHTML = `<span class="fc-choice-label">${label}</span><span class="fc-choice-text">${choice}</span>`;
    btn.addEventListener('click', (e) => onChoiceClick(btn, correctAnswer, e));
    container.appendChild(btn);
  });
}

// ============================================================
// HANDLE CHOICE CLICK (unchanged)
// ============================================================
function onChoiceClick(btn, correctAnswer, event) {
  event.stopPropagation();
  if (isGraded) return;
  const isCorrect = btn.dataset.correct === 'true';
  gradeByChoice(isCorrect, btn, correctAnswer);

  const backFace = document.getElementById('answer-flip-back');
  const badge    = document.getElementById('afback-badge');
  const label    = document.getElementById('afback-label');
  const answerEl = document.getElementById('afback-answer');
  const resultEl = document.getElementById('afback-result');

  answerEl.textContent = correctAnswer;
  if (isCorrect) {
    backFace.classList.add('state-correct');
    badge.textContent = '✓'; badge.classList.remove('badge-wrong');
    label.textContent = 'CORRECT ANSWER';
    resultEl.textContent = '✓ Correct!';
    resultEl.className = 'afback-result result-correct';
  } else {
    backFace.classList.add('state-wrong');
    badge.textContent = '✗'; badge.classList.add('badge-wrong');
    label.textContent = 'CORRECT ANSWER';
    resultEl.textContent = '✗ Wrong';
    resultEl.className = 'afback-result result-wrong';
  }

  soundFlip();
  document.getElementById('answer-flip-card').classList.add('flipped');

  const expArea = document.getElementById('fc-explanation');
  expArea.removeAttribute('data-hidden');
  expArea.style.display = 'block';
  document.getElementById('fc-exp-loader').style.display = 'flex';
  document.getElementById('fc-exp-text').style.display   = 'none';

  const q = currentQuestions[index];
  loadExplanation(q.q, q.a);
}

// ============================================================
// GRADE BY CHOICE (unchanged)
// ============================================================
function gradeByChoice(isCorrect, selectedBtn, correctAnswer) {
  if (isGraded) return;
  isGraded = true;
  const q = currentQuestions[index];
  if (isCorrect) { score++; soundCorrect(); } else { soundWrong(); }

  document.querySelectorAll('.fc-choice-btn').forEach(btn => {
    btn.disabled = true;
    if (btn.dataset.correct === 'true')         btn.classList.add('choice-correct');
    else if (btn === selectedBtn && !isCorrect) btn.classList.add('choice-wrong');
    else                                         btn.classList.add('choice-dim');
  });

  sessionHistory.push({
    question: q.q, correctAnswer: q.a,
    selectedAnswer: selectedBtn.dataset.answer,
    isCorrect, level: q._level, category,
  });

  const fb     = document.getElementById('grade-feedback');
  const fbText = document.getElementById('grade-feedback-text');
  fb.classList.remove('hidden', 'correct-fb', 'wrong-fb');
  if (isCorrect) {
    fb.classList.add('correct-fb');
    fbText.innerHTML = `<span style="color:var(--lime)">✓ Correct!</span> &nbsp;·&nbsp; ${score} pts`;
  } else {
    fb.classList.add('wrong-fb');
    fbText.innerHTML = `<span style="color:var(--amber)">✗ Wrong</span> &nbsp;·&nbsp; <span style="color:var(--jade)">${correctAnswer}</span>`;
  }
}

// ============================================================
// AI EXPLANATION (unchanged)
// ============================================================
async function loadExplanation(question, correctAnswer) {
  const loader = document.getElementById('fc-exp-loader');
  const expEl  = document.getElementById('fc-exp-text');
  loader.style.display = 'flex';
  expEl.style.display  = 'none';
  expEl.textContent    = '';

  try {
    const prompt = `You are a concise coding instructor.
Question: "${question}"
Correct Answer: "${correctAnswer}"
In 2-3 sentences, explain WHY "${correctAnswer}" is correct and clarify any common misconception. Be direct and educational. No greeting or preamble.`;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 200,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const data = await res.json();
    const text = data.content?.find(c => c.type === 'text')?.text || 'No explanation available.';
    loader.style.display = 'none';
    expEl.textContent    = text;
    expEl.style.display  = 'block';
  } catch(e) {
    loader.style.display = 'none';
    expEl.textContent    = `The correct answer is "${correctAnswer}". Review the relevant documentation to deepen your understanding.`;
    expEl.style.display  = 'block';
  }
}

// ============================================================
// NEXT QUESTION (unchanged)
// ============================================================
function nextQuestion() {
  soundClick();
  index++;
  if (index < currentQuestions.length) { showQ(); } else { finishQuiz(); }
}

// ============================================================
// FINISH QUIZ — saves to Supabase
// ============================================================
async function finishQuiz() {
  soundComplete(); stopBgMusic();

  currentPlayer.score          += score;
  currentPlayer.totalQuestions  = (currentPlayer.totalQuestions || 0) + currentQuestions.length;
  currentPlayer.totalCorrect    = (currentPlayer.totalCorrect   || 0) + score;

  const sessionRecord = {
    category, difficulty: currentDiff,
    score, total: currentQuestions.length,
    questions: sessionHistory,
  };

  if (!currentPlayer.history) currentPlayer.history = [];
  currentPlayer.history.unshift({
    date: new Date().toLocaleString(),
    ...sessionRecord,
  });
  if (currentPlayer.history.length > 20) currentPlayer.history = currentPlayer.history.slice(0, 20);

  // Save to Supabase (non-blocking — UI updates immediately)
  saveData(sessionRecord).catch(e => console.error("Save error:", e));

  // Refresh global players list for leaderboard
  await loadData();
  // Re-attach current player (with updated in-memory stats)
  const fresh = players.find(p => p.name === currentPlayer.name);
  if (fresh) {
    fresh.history       = currentPlayer.history;
    fresh.score         = currentPlayer.score;
    fresh.totalQuestions = currentPlayer.totalQuestions;
    fresh.totalCorrect   = currentPlayer.totalCorrect;
    currentPlayer = fresh;
  }

  hideAllPanels();
  document.getElementById('result').classList.remove('hidden');
  document.getElementById('final-score-display').textContent = `${score} / ${currentQuestions.length} correct`;

  const sorted = [...players].sort((a, b) => b.score - a.score);
  const rank = sorted.findIndex(p => p.name === currentPlayer.name) + 1;
  document.getElementById('final-rank-display').textContent = `Rank #${rank} of ${players.length} players`;
}

// ============================================================
// HISTORY (unchanged rendering)
// ============================================================
function showHistory() {
  soundClick(); hideAllPanels();
  document.getElementById('history-panel').classList.remove('hidden');
  renderHistory();
}
function renderHistory() {
  const list = document.getElementById('history-list');
  list.innerHTML = '';
  const history = currentPlayer?.history || [];
  if (!history.length) {
    list.innerHTML = '<div class="history-empty">No sessions yet. Flip some cards to build your history!</div>';
    return;
  }
  history.forEach((session, si) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'history-session';
    const rate = Math.round((session.score / session.total) * 100);
    const header = document.createElement('div');
    header.className = 'history-session-header';
    header.innerHTML = `
      <div class="history-session-meta">
        ${session.date}<br>
        <strong style="color:var(--jade)">${session.category?.toUpperCase()}</strong>
        <span class="diff-badge ${session.difficulty}">${session.difficulty}</span>
      </div>
      <div class="history-session-score">${session.score}/${session.total} · ${rate}%</div>
    `;
    const body = document.createElement('div');
    body.className = 'history-session-body';
    body.style.display = si === 0 ? 'block' : 'none';
    (session.questions || []).forEach(item => {
      const row = document.createElement('div');
      row.className = 'history-q-item';
      const selectedDisplay = item.selectedAnswer && item.selectedAnswer !== item.correctAnswer
        ? `<span class="hq-ans yours wrong-ans">You: ${item.selectedAnswer}</span>`
        : (item.isCorrect
            ? `<span class="hq-ans yours">✓ You got it</span>`
            : `<span class="hq-ans yours wrong-ans">✗ You missed it</span>`);
      row.innerHTML = `
        <div class="hq-icon">${item.isCorrect ? '✅' : '❌'}</div>
        <div class="hq-body">
          <div class="hq-question">${item.question}</div>
          <div class="hq-answers">
            <span class="hq-ans correct-ans">✓ ${item.correctAnswer}</span>
            ${selectedDisplay}
          </div>
          <div class="hq-level">Level ${item.level}</div>
        </div>
      `;
      body.appendChild(row);
    });
    header.onclick = () => { body.style.display = body.style.display === 'none' ? 'block' : 'none'; };
    wrapper.appendChild(header);
    wrapper.appendChild(body);
    list.appendChild(wrapper);
  });
}

// ============================================================
// RANKING — now reads live from Supabase
// ============================================================
function showRanking() {
  soundClick(); hideAllPanels();
  document.getElementById('ranking').classList.remove('hidden');
  renderRanking();
}
function renderRanking() {
  const list = document.getElementById('rank-list');
  list.innerHTML = '<div class="rank-empty" style="text-align:center;padding:20px;">Loading leaderboard…</div>';

  // Fetch fresh scores from Supabase
  SB.get("players", "select=name,avatar,score,total_questions,total_correct&order=score.desc&limit=50")
    .then(rows => {
      list.innerHTML = '';
      if (!rows.length) {
        list.innerHTML = '<div class="rank-empty">No players yet. Be the first legend!</div>';
        return;
      }
      const medals = ['🥇','🥈','🥉'];
      rows.forEach((p, i) => {
        const isMe = currentPlayer && p.name === currentPlayer.name;
        const rate = p.total_questions ? Math.round((p.total_correct / p.total_questions) * 100) : 0;
        const row = document.createElement('div');
        row.className = 'rank-row' + (isMe ? ' rank-me' : '');
        row.innerHTML = `
          <span class="rank-pos">${medals[i] || '#' + (i + 1)}</span>
          <img src="${p.avatar}" class="rank-avatar" alt="">
          <div class="rank-info">
            <div class="rank-name">${p.name}${isMe ? ' <span class="you-tag">YOU</span>' : ''}</div>
            <div class="rank-sub">${p.total_questions || 0} cards · ${rate}% accuracy</div>
          </div>
          <span class="rank-score">${p.score} pts</span>
        `;
        list.appendChild(row);
      });
    })
    .catch(() => {
      list.innerHTML = '<div class="rank-empty">Could not load leaderboard.</div>';
    });
}

// ============================================================
// NAV HELPERS (unchanged)
// ============================================================
function hideAllPanels() {
  ['auth-panel','player-dashboard','quiz','result','history-panel','ranking'].forEach(id => {
    document.getElementById(id).classList.add('hidden');
  });
}
function goBack() {
  soundClick(); stopBgMusic();
  goToDashboard();
}

// ============================================================
// HARDCODED DATABASE (fallback if Supabase is empty)
// ============================================================
const database = {
  javascript: {
    level1: [
      {q:"Which keyword declares a constant?",                 a:"const"},
      {q:"Inside which HTML element do we put JavaScript?",    a:"<script>"},
      {q:"How do you write a comment in JavaScript?",          a:"// comment"},
      {q:"What does 'typeof' return for a number?",            a:"'number'"},
      {q:"Which symbol is used for strict equality?",          a:"==="},
      {q:"How do you declare a variable in modern JS?",        a:"let"},
      {q:"What is the output of typeof null?",                 a:"'object'"},
      {q:"Which method converts a string to uppercase?",       a:"toUpperCase()"},
      {q:"How do you write 'Hello' to the console?",           a:"console.log('Hello')"},
      {q:"What does NaN stand for?",                           a:"Not a Number"},
      {q:"Which operator is used for exponentiation?",         a:"**"},
      {q:"How do you get the length of a string?",             a:".length"},
      {q:"Which method removes the last element of an array?", a:"pop()"},
      {q:"What does 'undefined' mean in JS?",                  a:"Variable declared but not assigned"},
      {q:"How do you create a function?",                      a:"function myFunc(){}"},
      {q:"Which method adds an element to end of an array?",   a:"push()"},
      {q:"How do you round a number to nearest integer?",      a:"Math.round()"},
      {q:"How do you convert a string to a number?",           a:"parseInt()"},
      {q:"What is the result of '5' + 3 in JS?",               a:"'53'"},
    ],
    level2: [
      {q:"What does the spread operator (...) do?",            a:"Spreads array/object elements"},
      {q:"What is a Promise in JavaScript?",                   a:"An async operation placeholder"},
      {q:"Which method creates a new array by transforming each element?", a:"map()"},
      {q:"What does 'async/await' do?",                        a:"Handles async code synchronously"},
      {q:"What is destructuring?",                             a:"Unpacking values from arrays/objects"},
      {q:"Which method filters an array based on a condition?",a:"filter()"},
      {q:"What does Object.keys() return?",                    a:"Array of property names"},
      {q:"What is a template literal?",                        a:"String with backticks and ${}"},
      {q:"Which method reduces an array to a single value?",   a:"reduce()"},
      {q:"What is 'hoisting' in JavaScript?",                  a:"Moving declarations to the top"},
      {q:"What is an arrow function?",                         a:"Shorter function syntax with =>"},
      {q:"What does JSON.parse() do?",                         a:"Converts JSON string to JS object"},
      {q:"What is event bubbling?",                            a:"Events propagate up the DOM"},
      {q:"What does 'fetch()' return?",                        a:"A Promise"},
      {q:"What does localStorage store?",                      a:"Persistent key-value pairs"},
    ],
    level3: [
      {q:"What is the Event Loop?",                            a:"Mechanism handling async callbacks"},
      {q:"What is a Proxy object?",                            a:"Intercepts object operations"},
      {q:"What does Object.freeze() do?",                      a:"Prevents object modification"},
      {q:"What is memoization?",                               a:"Caching function results"},
      {q:"What is the prototype chain?",                       a:"Inheritance lookup mechanism"},
      {q:"What is currying?",                                  a:"Transforming f(a,b) into f(a)(b)"},
      {q:"What is a generator function?",                      a:"A function that can pause and resume"},
      {q:"What does the 'in' operator check?",                 a:"If property exists in object"},
    ],
    level4: [
      {q:"What is a Service Worker?",                          a:"Script running in background for PWA"},
      {q:"What is the Virtual DOM?",                           a:"In-memory DOM representation"},
      {q:"What does tree shaking remove?",                     a:"Removing unused code at build time"},
      {q:"What does requestAnimationFrame do?",                a:"Schedules animation before next repaint"},
    ],
    level5: [
      {q:"What is temporal dead zone (TDZ)?",                  a:"Period before let/const initialization"},
      {q:"How does V8's JIT compilation work?",                a:"Compiles hot code paths to machine code"},
      {q:"What is trampolining in JS?",                        a:"Replacing recursion with iteration to avoid stack overflow"},
      {q:"What is referential transparency?",                  a:"Same input always produces same output"},
    ],
  },
  python: {
    level1: [
      {q:"How do you print 'Hello World' in Python?",          a:"print('Hello World')"},
      {q:"Which keyword creates a function in Python?",        a:"def"},
      {q:"How do you write a single-line comment in Python?",  a:"# comment"},
      {q:"What is the correct file extension for Python files?",a:".py"},
      {q:"How do you create a list in Python?",                a:"list=[1,2,3]"},
      {q:"What does len() do?",                                a:"Returns length of object"},
      {q:"What does range(5) generate?",                       a:"0 to 4"},
      {q:"What is a tuple?",                                   a:"An immutable sequence"},
      {q:"What does input() do?",                              a:"Takes user input as string"},
      {q:"What does append() do to a list?",                   a:"Adds element to end"},
    ],
    level2: [
      {q:"What is a list comprehension?",                      a:"Compact way to create lists"},
      {q:"What does *args allow?",                             a:"Variable positional arguments"},
      {q:"What is a lambda function?",                         a:"Anonymous one-line function"},
      {q:"What does map() do?",                                a:"Applies function to each iterable item"},
      {q:"What does zip() do?",                                a:"Combines multiple iterables"},
      {q:"What is a generator?",                               a:"Lazy iterator yielding values"},
      {q:"What is the purpose of 'with' statement?",           a:"Context manager for resource handling"},
      {q:"What does __init__ do?",                             a:"Initializes a class instance"},
    ],
    level3: [
      {q:"What is a metaclass?",                               a:"A class that creates classes"},
      {q:"What is the GIL?",                                   a:"Global Interpreter Lock limiting threads"},
      {q:"What is monkey patching?",                           a:"Modifying code at runtime"},
      {q:"What does functools.lru_cache do?",                  a:"Caches function results"},
      {q:"What is a coroutine?",                               a:"A function that can suspend execution"},
    ],
    level4: [
      {q:"What is CPython?",                                   a:"Reference implementation of Python in C"},
      {q:"What does __mro__ represent?",                       a:"Method Resolution Order"},
      {q:"What does pickle module do?",                        a:"Serializes Python objects"},
    ],
    level5: [
      {q:"What does the walrus operator := do?",               a:"Assigns and returns value in expression"},
      {q:"What is structural pattern matching?",               a:"Match/case statement matching data shapes"},
      {q:"What is free threading in Python 3.13?",             a:"Experimental GIL-free mode"},
    ],
  },
};