// ============================================================
// AUDIO ENGINE — Web Audio API
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

// Background Music
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
      g.gain.setValueAtTime(0.11, when + CHORD_DUR - 0.8);
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
// PASSWORD HASHING
// ============================================================
async function hashPassword(pw) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pw));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ============================================================
// PERSISTENT STORAGE
// ============================================================
function saveData() {
  localStorage.setItem('devquiz_players', JSON.stringify(players));
}
function loadData() {
  try {
    const raw = localStorage.getItem('devquiz_players');
    if (raw) players = JSON.parse(raw);
  } catch(e) { players = []; }
}

// ============================================================
// DIFFICULTY CONFIG
// ============================================================
const difficultyConfig = {
  beginner: { levels: [1, 2], qCount: 10, weights: {1: 0.6, 2: 0.4}, label: '🌿 Beginner', badge: 'beginner' },
  normal:   { levels: [1, 2, 3], qCount: 15, weights: {1: 0.33, 2: 0.34, 3: 0.33}, label: '⚔️ Normal', badge: 'normal' },
  expert:   { levels: [1, 2, 3, 4, 5], qCount: 20, weights: {1: 0.10, 2: 0.15, 3: 0.25, 4: 0.25, 5: 0.25}, label: '💀 Expert', badge: 'expert' },
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
let isFlipped        = false;
let isGraded         = false;
let sessionHistory   = [];
let currentChoices   = [];

loadData();

// ============================================================
// AUTH TAB SWITCH
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
// AVATAR SELECT
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
// REGISTER
// ============================================================
async function registerPlayer() {
  const username = document.getElementById('reg-username').value.trim();
  const pw       = document.getElementById('reg-password').value;
  const confirm  = document.getElementById('reg-confirm').value;

  if (!selectedAvatar)  { showError('reg-error', 'Please choose an avatar.');                 return; }
  if (!username)         { showError('reg-error', 'Username is required.');                   return; }
  if (username.length < 2) { showError('reg-error', 'Username must be at least 2 characters.'); return; }
  if (!pw)               { showError('reg-error', 'Password is required.');                   return; }
  if (pw.length < 4)     { showError('reg-error', 'Password must be at least 4 characters.'); return; }
  if (pw !== confirm)    { showError('reg-error', 'Passwords do not match.');                 return; }
  if (players.find(p => p.name.toLowerCase() === username.toLowerCase())) {
    showError('reg-error', 'Username already taken.'); return;
  }
  soundClick();
  const hash = await hashPassword(pw);
  const newPlayer = {
    name: username, passwordHash: hash, avatar: selectedAvatar,
    score: 0, totalQuestions: 0, totalCorrect: 0, history: [],
  };
  players.push(newPlayer);
  saveData();
  currentPlayer = newPlayer;
  goToDashboard();
}

// ============================================================
// LOGIN
// ============================================================
async function loginPlayer() {
  const username = document.getElementById('login-username').value.trim();
  const pw       = document.getElementById('login-password').value;
  if (!username) { showError('login-error', 'Enter your username.'); return; }
  if (!pw)       { showError('login-error', 'Enter your password.'); return; }
  const player = players.find(p => p.name.toLowerCase() === username.toLowerCase());
  if (!player)   { showError('login-error', 'Account not found.'); return; }
  const hash = await hashPassword(pw);
  if (hash !== player.passwordHash) { showError('login-error', 'Wrong password.'); return; }
  soundClick();
  currentPlayer = player;
  goToDashboard();
}

// ============================================================
// LOGOUT
// ============================================================
function logoutPlayer() {
  soundClick(); stopBgMusic();
  currentPlayer = null; selectedAvatar = '';
  hideAllPanels();
  document.getElementById('auth-panel').classList.remove('hidden');
  document.getElementById('login-username').value = '';
  document.getElementById('login-password').value = '';
}

// ============================================================
// DASHBOARD
// ============================================================
function goToDashboard() {
  hideAllPanels();
  document.getElementById('player-dashboard').classList.remove('hidden');
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
// QUIZ START
// ============================================================
function startQuiz() {
  soundClick();
  category    = document.getElementById('dash-category').value;
  currentDiff = document.getElementById('dash-difficulty').value;
  index = 0; score = 0;
  sessionHistory = [];
  currentQuestions = buildQuestionPool(category, currentDiff);
  hideAllPanels();
  document.getElementById('quiz').classList.remove('hidden');
  document.getElementById('quiz-avatar').src = currentPlayer.avatar;
  startBgMusic();
  showQ();
}
function buildQuestionPool(cat, diff) {
  const cfg = difficultyConfig[diff];
  let pool = [];
  cfg.levels.forEach(lvl => {
    const all  = database[cat]['level' + lvl] || [];
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
  // Gather all answers from the same category across all levels
  const allAnswers = [];
  Object.values(database[cat]).forEach(levelArr => {
    levelArr.forEach(q => {
      if (q.a !== correctAnswer) allAnswers.push(q.a);
    });
  });
  // Shuffle and pick 3 distractors
  const distractors = shuffle(allAnswers).slice(0, 3);
  // Combine with correct, shuffle
  const choices = shuffle([correctAnswer, ...distractors]);
  return choices;
}

// ============================================================
// SHOW QUESTION (flashcard front)
// ============================================================
function showQ() {
  isFlipped = false;
  isGraded  = false;

  const q     = currentQuestions[index];
  const cfg   = difficultyConfig[currentDiff];
  const total = currentQuestions.length;

  // Reset card to front
  const card = document.getElementById('flashcard');
  card.classList.remove('is-flipped');

  // Progress
  const pct = (index / total) * 100;
  document.getElementById('progress-fill').style.width = pct + '%';
  document.getElementById('prog-score').textContent = `Score: ${score}`;
  document.getElementById('prog-tag').textContent = `${cfg.label}  ·  Lv${q._level}`;
  document.getElementById('quiz-progress-info').textContent = `Card ${index + 1} / ${total}`;

  // Front content
  document.getElementById('fc-meta-front').textContent =
    `${category.toUpperCase()} · Level ${q._level}`;
  document.getElementById('fc-question').textContent = q.q;

  // Back content — reset
  document.getElementById('fc-answer').textContent = q.a;
  document.getElementById('fc-exp-loader').style.display = 'flex';
  document.getElementById('fc-exp-text').style.display   = 'none';
  document.getElementById('fc-exp-text').textContent     = '';

  // Build multiple choice options
  currentChoices = buildChoices(q.a, category);
  renderChoices(currentChoices, q.a);

  // Re-show grade buttons area, hide feedback
  document.getElementById('fc-grade-btns').style.display = '';
  const fb = document.getElementById('grade-feedback');
  fb.classList.add('hidden');
  fb.classList.remove('correct-fb', 'wrong-fb');

  // Show flip hint
  document.getElementById('flip-hint').style.opacity = '1';
}

// ============================================================
// RENDER MULTIPLE CHOICE BUTTONS
// ============================================================
function renderChoices(choices, correctAnswer) {
  const container = document.getElementById('fc-choices');
  container.innerHTML = '';
  container.style.display = 'grid';
  choices.forEach((choice, i) => {
    const btn = document.createElement('button');
    btn.className = 'fc-choice-btn';
    btn.dataset.answer = choice;
    btn.dataset.correct = (choice === correctAnswer) ? 'true' : 'false';
    const label = String.fromCharCode(65 + i); // A, B, C...
    btn.innerHTML = `<span class="fc-choice-label">${label}</span><span class="fc-choice-text">${choice}</span>`;
    btn.addEventListener('click', (e) => onChoiceClick(btn, correctAnswer, e));
    container.appendChild(btn);
  });
}

// ============================================================
// HANDLE CHOICE CLICK
// ============================================================
function onChoiceClick(btn, correctAnswer, event) {
  event.stopPropagation();
  if (isGraded) return;

  // Grade immediately based on the choice
  const isCorrect = btn.dataset.correct === 'true';
  gradeByChoice(isCorrect, btn, correctAnswer);

  // Flip the card after a short pause so player sees the choice result first
  setTimeout(() => {
    if (!isFlipped) {
      soundFlip();
      isFlipped = true;
      document.getElementById('flashcard').classList.add('is-flipped');
      document.getElementById('flip-hint').style.opacity = '0';
      const q = currentQuestions[index];
      loadExplanation(q.q, q.a);
    }
  }, 600);
}

// ============================================================
// GRADE BY CHOICE SELECTION
// ============================================================
function gradeByChoice(isCorrect, selectedBtn, correctAnswer) {
  if (isGraded) return;
  isGraded = true;

  const q = currentQuestions[index];
  if (isCorrect) { score++; soundCorrect(); } else { soundWrong(); }

  // Highlight all buttons
  document.querySelectorAll('.fc-choice-btn').forEach(btn => {
    btn.disabled = true;
    if (btn.dataset.correct === 'true') {
      btn.classList.add('choice-correct');
    } else if (btn === selectedBtn && !isCorrect) {
      btn.classList.add('choice-wrong');
    } else {
      btn.classList.add('choice-dim');
    }
  });

  // Record in session history
  sessionHistory.push({
    question: q.q,
    correctAnswer: q.a,
    selectedAnswer: selectedBtn.dataset.answer,
    isCorrect,
    level: q._level,
    category,
  });

  // Hide self-grade buttons (not needed since choice handles grading)
  document.getElementById('fc-grade-btns').style.display = 'none';

  // Show feedback bar
  const fb = document.getElementById('grade-feedback');
  const fbText = document.getElementById('grade-feedback-text');
  fb.classList.remove('hidden', 'correct-fb', 'wrong-fb');

  if (isCorrect) {
    fb.classList.add('correct-fb');
    fbText.innerHTML = `<span style="color:var(--green2)">✓ Correct!</span> · ${score} pts`;
  } else {
    fb.classList.add('wrong-fb');
    fbText.innerHTML = `<span style="color:var(--red)">✗ Wrong</span> · Answer: <span style="color:var(--green2)">${correctAnswer}</span>`;
  }
}

// ============================================================
// FLIP CARD — disabled for manual tap, only triggered after answer selection
// ============================================================
function flipCard() {
  // Intentionally blocked — card flips automatically after player picks an answer
}

// ============================================================
// AI EXPLANATION
// ============================================================
async function loadExplanation(question, correctAnswer) {
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
    document.getElementById('fc-exp-loader').style.display = 'none';
    const expEl = document.getElementById('fc-exp-text');
    expEl.textContent = text;
    expEl.style.display = 'block';
  } catch(e) {
    document.getElementById('fc-exp-loader').style.display = 'none';
    const expEl = document.getElementById('fc-exp-text');
    expEl.textContent = `The correct answer is "${correctAnswer}". Review the relevant documentation to deepen your understanding.`;
    expEl.style.display = 'block';
  }
}

// ============================================================
// GRADE CARD (self-assessment: ✓ / ✗) — kept as fallback
// ============================================================
function gradeCard(isCorrect, event) {
  event.stopPropagation();
  if (isGraded) return;
  isGraded = true;

  const q = currentQuestions[index];
  if (isCorrect) { score++; soundCorrect(); } else { soundWrong(); }

  sessionHistory.push({
    question: q.q,
    correctAnswer: q.a,
    selectedAnswer: isCorrect ? q.a : '(self-marked wrong)',
    isCorrect,
    level: q._level,
    category,
  });

  document.getElementById('fc-grade-btns').style.display = 'none';

  const fb = document.getElementById('grade-feedback');
  const fbText = document.getElementById('grade-feedback-text');
  fb.classList.remove('hidden', 'correct-fb', 'wrong-fb');

  if (isCorrect) {
    fb.classList.add('correct-fb');
    fbText.innerHTML = `<span style="color:var(--green2)">✓ Marked correct</span> · ${score} pts`;
  } else {
    fb.classList.add('wrong-fb');
    fbText.innerHTML = `<span style="color:var(--red)">✗ Marked wrong</span> · Keep studying!`;
  }
}

// ============================================================
// NEXT QUESTION
// ============================================================
function nextQuestion() {
  soundClick();
  index++;
  if (index < currentQuestions.length) {
    showQ();
  } else {
    finishQuiz();
  }
}

// ============================================================
// FINISH QUIZ
// ============================================================
function finishQuiz() {
  soundComplete(); stopBgMusic();

  currentPlayer.score          += score;
  currentPlayer.totalQuestions  = (currentPlayer.totalQuestions || 0) + currentQuestions.length;
  currentPlayer.totalCorrect    = (currentPlayer.totalCorrect || 0) + score;

  if (!currentPlayer.history) currentPlayer.history = [];
  currentPlayer.history.unshift({
    date: new Date().toLocaleString(),
    category, difficulty: currentDiff,
    score, total: currentQuestions.length,
    questions: sessionHistory,
  });
  if (currentPlayer.history.length > 20) currentPlayer.history = currentPlayer.history.slice(0, 20);

  saveData();
  hideAllPanels();
  document.getElementById('result').classList.remove('hidden');
  document.getElementById('final-score-display').textContent = `${score} / ${currentQuestions.length} correct`;

  const sorted = [...players].sort((a, b) => b.score - a.score);
  const rank = sorted.findIndex(p => p.name === currentPlayer.name) + 1;
  document.getElementById('final-rank-display').textContent = `Rank #${rank} of ${players.length} players`;
}

// ============================================================
// HISTORY
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
    list.innerHTML = '<div class="history-empty">No sessions yet. Play a quiz to build your history!</div>';
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
        <span style="color:var(--green3)">${session.category?.toUpperCase()}</span>
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
        : (item.isCorrect ? `<span class="hq-ans yours">✓ You got it</span>` : `<span class="hq-ans yours wrong-ans">✗ You missed it</span>`);
      row.innerHTML = `
        <div class="hq-icon">${item.isCorrect ? '✅' : '❌'}</div>
        <div class="hq-body">
          <div class="hq-question">${item.question}</div>
          <div class="hq-answers">
            <span class="hq-ans correct-ans">Answer: ${item.correctAnswer}</span>
            ${selectedDisplay}
          </div>
          <div class="hq-level">Level ${item.level}</div>
        </div>
      `;
      body.appendChild(row);
    });

    header.onclick = () => {
      body.style.display = body.style.display === 'none' ? 'block' : 'none';
    };
    wrapper.appendChild(header);
    wrapper.appendChild(body);
    list.appendChild(wrapper);
  });
}

// ============================================================
// RANKING
// ============================================================
function showRanking() {
  soundClick(); hideAllPanels();
  document.getElementById('ranking').classList.remove('hidden');
  renderRanking();
}
function renderRanking() {
  const list = document.getElementById('rank-list');
  list.innerHTML = '';
  if (!players.length) {
    list.innerHTML = '<div class="rank-empty">No warriors yet. Be the first legend!</div>';
    return;
  }
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const medals = ['🥇', '🥈', '🥉'];
  sorted.forEach((p, i) => {
    const isMe = currentPlayer && p.name === currentPlayer.name;
    const rate = p.totalQuestions ? Math.round((p.totalCorrect / p.totalQuestions) * 100) : 0;
    const row = document.createElement('div');
    row.className = 'rank-row' + (isMe ? ' rank-me' : '');
    row.innerHTML = `
      <span class="rank-pos">${medals[i] || '#' + (i + 1)}</span>
      <img src="${p.avatar}" class="rank-avatar" alt="">
      <div class="rank-info">
        <div class="rank-name">${p.name}${isMe ? ' <span class="you-tag">YOU</span>' : ''}</div>
        <div class="rank-sub">${p.totalQuestions || 0} cards · ${rate}% accuracy</div>
      </div>
      <span class="rank-score">${p.score} pts</span>
    `;
    list.appendChild(row);
  });
}

// ============================================================
// NAV HELPERS
// ============================================================
function hideAllPanels() {
  ['auth-panel', 'player-dashboard', 'quiz', 'result', 'history-panel', 'ranking'].forEach(id => {
    document.getElementById(id).classList.add('hidden');
  });
}
function goBack() {
  soundClick(); stopBgMusic();
  goToDashboard();
}

// ============================================================
// DATABASE
// ============================================================
const database = {
  javascript: {
    level1: [
      {q:"Which keyword declares a constant?",                  a:"const"},
      {q:"Inside which HTML element do we put JavaScript?",     a:"<script>"},
      {q:"How do you write a comment in JavaScript?",           a:"// comment"},
      {q:"What does 'typeof' return for a number?",             a:"'number'"},
      {q:"Which symbol is used for strict equality?",           a:"==="},
      {q:"How do you declare a variable in modern JS?",         a:"let"},
      {q:"What is the output of typeof null?",                  a:"'object'"},
      {q:"Which method converts a string to uppercase?",        a:"toUpperCase()"},
      {q:"How do you write 'Hello' to the console?",            a:"console.log('Hello')"},
      {q:"What does NaN stand for?",                            a:"Not a Number"},
      {q:"Which operator is used for exponentiation?",          a:"**"},
      {q:"What is the correct way to write an array?",          a:"var a=[1,2,3]"},
      {q:"How do you get the length of a string?",              a:".length"},
      {q:"Which method removes the last element of an array?",  a:"pop()"},
      {q:"What does 'undefined' mean in JS?",                   a:"Variable declared but not assigned"},
      {q:"How do you create a function?",                       a:"function myFunc(){}"},
      {q:"Which method adds an element to end of an array?",    a:"push()"},
      {q:"How do you round a number to nearest integer?",       a:"Math.round()"},
      {q:"How do you convert a string to a number?",            a:"parseInt()"},
      {q:"What is the result of '5' + 3 in JS?",                a:"'53'"},
    ],
    level2: [
      {q:"What does the spread operator (...) do?",             a:"Spreads array/object elements"},
      {q:"What is a Promise in JavaScript?",                    a:"An async operation placeholder"},
      {q:"Which method creates a new array by transforming each element?", a:"map()"},
      {q:"What does 'async/await' do?",                         a:"Handles async code synchronously"},
      {q:"What is destructuring?",                              a:"Unpacking values from arrays/objects"},
      {q:"Which method filters an array based on a condition?",  a:"filter()"},
      {q:"What is the purpose of 'use strict'?",                a:"Enforces stricter JS rules"},
      {q:"What does Object.keys() return?",                     a:"Array of property names"},
      {q:"What is a template literal?",                         a:"String with backticks and ${}"},
      {q:"Which method reduces an array to a single value?",    a:"reduce()"},
      {q:"What is 'hoisting' in JavaScript?",                   a:"Moving declarations to the top"},
      {q:"What is an arrow function?",                          a:"Shorter function syntax with =>"},
      {q:"What does JSON.parse() do?",                          a:"Converts JSON string to JS object"},
      {q:"What is event bubbling?",                             a:"Events propagate up the DOM"},
      {q:"Which method finds the first matching element?",       a:"find()"},
      {q:"What does 'fetch()' return?",                         a:"A Promise"},
      {q:"What is optional chaining (?.) for?",                 a:"Safely access nested properties"},
      {q:"What does the nullish coalescing operator (??) do?",   a:"Returns right side if left is null/undefined"},
      {q:"What does Array.from() do?",                          a:"Creates array from iterable"},
      {q:"What does localStorage store?",                       a:"Persistent key-value pairs"},
    ],
    level3: [
      {q:"What is the Event Loop?",                             a:"Mechanism handling async callbacks"},
      {q:"What is a Proxy object?",                             a:"Intercepts object operations"},
      {q:"What does Object.freeze() do?",                       a:"Prevents object modification"},
      {q:"What is memoization?",                                a:"Caching function results"},
      {q:"What is the prototype chain?",                        a:"Inheritance lookup mechanism"},
      {q:"What is a microtask?",                                a:"High-priority async task (e.g. Promise)"},
      {q:"What does structuredClone() do?",                     a:"Deep clones an object"},
      {q:"What is currying?",                                   a:"Transforming f(a,b) into f(a)(b)"},
      {q:"What does Symbol.iterator define?",                   a:"Custom iteration behavior"},
      {q:"What does Reflect.apply() do?",                       a:"Calls a function with given args"},
      {q:"What is a generator function?",                       a:"A function that can pause and resume"},
      {q:"What is a Blob in JavaScript?",                       a:"Binary large object"},
      {q:"What is lazy evaluation?",                            a:"Delaying computation until needed"},
      {q:"What does the 'in' operator check?",                  a:"If property exists in object"},
      {q:"What is a WeakRef?",                                  a:"Weak reference to an object"},
    ],
    level4: [
      {q:"What is a Service Worker?",                           a:"Script running in background for PWA"},
      {q:"What is the Virtual DOM?",                            a:"In-memory DOM representation"},
      {q:"What does WebAssembly enable?",                       a:"Running compiled code in browser"},
      {q:"What is tree shaking?",                               a:"Removing unused code at build time"},
      {q:"What is code splitting?",                             a:"Loading JS in chunks on demand"},
      {q:"What does Intersection Observer do?",                 a:"Detects element visibility"},
      {q:"What does requestAnimationFrame do?",                 a:"Schedules animation before next repaint"},
      {q:"What does top-level await enable?",                   a:"await outside async functions in modules"},
      {q:"What is the Observer pattern?",                       a:"Notifying dependents of state changes"},
      {q:"What is a BroadcastChannel?",                         a:"Messaging between browsing contexts"},
      {q:"What is module federation?",                          a:"Sharing modules across apps at runtime"},
      {q:"What is declarative shadow DOM?",                     a:"Server-rendered shadow DOM"},
    ],
    level5: [
      {q:"What is the difference between microtasks and macrotasks?", a:"Microtasks run before macrotasks after each task"},
      {q:"What is temporal dead zone (TDZ)?",                   a:"Period before let/const initialization"},
      {q:"How does V8's JIT compilation work?",                 a:"Compiles hot code paths to machine code"},
      {q:"What is a monad in functional JS?",                   a:"A design pattern for chaining computations"},
      {q:"What is trampolining in JS?",                         a:"Replacing recursion with iteration to avoid stack overflow"},
      {q:"What is referential transparency?",                   a:"Same input always produces same output"},
      {q:"What is isomorphic JavaScript?",                      a:"Code that runs on both server and client"},
      {q:"What is algebraic effect handling?",                  a:"Managing side effects with resumable handlers"},
      {q:"What is point-free style?",                           a:"Defining functions without naming arguments"},
      {q:"What does 'Functor' mean in JS?",                     a:"An object with a mappable interface"},
      {q:"What is a lens in functional programming?",           a:"A composable getter/setter for nested data"},
      {q:"What is deoptimization in V8?",                       a:"Falling back from compiled to interpreted code"},
    ],
  },
  python: {
    level1: [
      {q:"How do you print 'Hello World' in Python?",           a:"print('Hello World')"},
      {q:"Which keyword creates a function in Python?",         a:"def"},
      {q:"How do you write a single-line comment in Python?",   a:"# comment"},
      {q:"What is the correct file extension for Python files?", a:".py"},
      {q:"How do you create a list in Python?",                 a:"list=[1,2,3]"},
      {q:"What does len() do?",                                 a:"Returns length of object"},
      {q:"How do you start an if statement in Python?",         a:"if x == 1:"},
      {q:"What is the output of type(42)?",                     a:"<class 'int'>"},
      {q:"How do you create a variable in Python?",             a:"x=5"},
      {q:"Which operator is used for integer division?",        a:"//"},
      {q:"What does 'not' do in Python?",                       a:"Logical negation"},
      {q:"What does range(5) generate?",                        a:"0 to 4"},
      {q:"What is a tuple?",                                    a:"An immutable sequence"},
      {q:"What does input() do?",                               a:"Takes user input as string"},
      {q:"What does append() do to a list?",                    a:"Adds element to end"},
      {q:"How do you create a dictionary?",                     a:"{'key':'value'}"},
      {q:"How do you import a module?",                         a:"import module"},
      {q:"What does the 'pass' statement do?",                  a:"Does nothing, placeholder"},
      {q:"What is None in Python?",                             a:"Absence of value"},
      {q:"How do you repeat a string 3 times?",                 a:"str * 3"},
    ],
    level2: [
      {q:"What is a list comprehension?",                       a:"Compact way to create lists"},
      {q:"What does *args allow?",                              a:"Variable positional arguments"},
      {q:"What is a lambda function?",                          a:"Anonymous one-line function"},
      {q:"What does map() do?",                                 a:"Applies function to each iterable item"},
      {q:"What is the difference between a list and a tuple?",  a:"Lists are mutable, tuples are immutable"},
      {q:"What does zip() do?",                                 a:"Combines multiple iterables"},
      {q:"What is a generator?",                                a:"Lazy iterator yielding values"},
      {q:"What does enumerate() do?",                           a:"Adds index to iterable"},
      {q:"What is the purpose of 'with' statement?",            a:"Context manager for resource handling"},
      {q:"What is string formatting with f-strings?",           a:"f'Hello {name}' syntax"},
      {q:"What does filter() do?",                              a:"Filters items by function condition"},
      {q:"What is a set in Python?",                            a:"Unordered collection of unique items"},
      {q:"What does sorted() return?",                          a:"A new sorted list"},
      {q:"What does try/except do?",                            a:"Handles exceptions"},
      {q:"What does __init__ do?",                              a:"Initializes a class instance"},
      {q:"What does super() do?",                               a:"Calls parent class method"},
      {q:"What is a decorator?",                                a:"A function wrapping another function"},
      {q:"What does list.sort() do?",                           a:"Sorts list in place"},
      {q:"What is slicing in Python?",                          a:"Extracting a portion of a sequence"},
      {q:"What does 'yield' do in a generator?",                a:"Pauses and returns a value"},
    ],
    level3: [
      {q:"What is a metaclass?",                                a:"A class that creates classes"},
      {q:"What is the GIL?",                                    a:"Global Interpreter Lock limiting threads"},
      {q:"What is a descriptor?",                               a:"Object defining __get__, __set__, __delete__"},
      {q:"What is monkey patching?",                            a:"Modifying code at runtime"},
      {q:"What does functools.lru_cache do?",                   a:"Caches function results"},
      {q:"What is a coroutine?",                                a:"A function that can suspend execution"},
      {q:"What does asyncio.gather() do?",                      a:"Runs multiple coroutines concurrently"},
      {q:"What is a data class?",                               a:"A class auto-generating boilerplate"},
      {q:"What does copy.deepcopy do?",                         a:"Creates a fully independent copy"},
      {q:"What does __repr__ do?",                              a:"Returns developer-friendly string"},
      {q:"What does __slots__ do?",                             a:"Restricts instance attributes"},
      {q:"What does __new__ do?",                               a:"Creates a new instance"},
      {q:"What does itertools.chain() do?",                     a:"Chains multiple iterables"},
      {q:"What does __call__ enable?",                          a:"Makes an instance callable"},
      {q:"What is the purpose of the typing module?",           a:"Type hints and annotations"},
    ],
    level4: [
      {q:"What is CPython?",                                    a:"Reference implementation of Python in C"},
      {q:"What is PyPy?",                                       a:"Python implementation with JIT compiler"},
      {q:"What does __mro__ represent?",                        a:"Method Resolution Order"},
      {q:"What does ctypes allow?",                             a:"Calling C libraries from Python"},
      {q:"What does multiprocessing.Pool do?",                  a:"Manages worker process pool"},
      {q:"What does pickle module do?",                         a:"Serializes Python objects"},
      {q:"What does dis module do?",                            a:"Disassembles Python bytecode"},
      {q:"What does ast module provide?",                       a:"Abstract Syntax Tree manipulation"},
      {q:"What does heapq module provide?",                     a:"Heap queue algorithm"},
      {q:"What is a NamedTuple?",                               a:"Tuple with named fields"},
      {q:"What is a semaphore in threading?",                   a:"Controls access with a counter"},
      {q:"What does __hash__ used for?",                        a:"Returns integer hash for use in dicts/sets"},
    ],
    level5: [
      {q:"What is the difference between concurrency and parallelism?", a:"Concurrency manages multiple tasks, parallelism runs them simultaneously"},
      {q:"What does the walrus operator := do?",                a:"Assigns and returns value in expression"},
      {q:"What is structural pattern matching?",                a:"Match/case statement matching data shapes"},
      {q:"What is a TypeVarTuple?",                             a:"A variadic generic type parameter"},
      {q:"What does ParamSpec capture?",                        a:"Captures function parameter types for higher-order functions"},
      {q:"What is free threading in Python 3.13?",              a:"Experimental GIL-free mode"},
      {q:"What is an Annotated type?",                          a:"Type with attached metadata"},
      {q:"What is a memory view in Python?",                    a:"A buffer protocol object accessing memory directly"},
      {q:"What is ExceptionGroup?",                             a:"Groups multiple exceptions together"},
      {q:"What is type narrowing in Python?",                   a:"Refining a type within a conditional branch"},
    ],
  },
};