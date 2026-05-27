const SYMBOLS = ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼"];
const PAIR_COUNT = 8;
const MISMATCH_DELAY_MS = 800;

const boardEl = document.getElementById("board");
const movesEl = document.getElementById("moves");
const timerEl = document.getElementById("timer");
const statusEl = document.getElementById("status");
const startBtn = document.getElementById("start-btn");
const restartBtn = document.getElementById("restart-btn");
const winOverlay = document.getElementById("win-overlay");
const winMessage = document.getElementById("win-message");
const playAgainBtn = document.getElementById("play-again-btn");

let deck = [];
let flipped = [];
let moves = 0;
let locked = false;
let gameActive = false;
let timerInterval = null;
let elapsedSeconds = 0;
let timerStarted = false;

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildDeck() {
  const pairs = SYMBOLS.slice(0, PAIR_COUNT).flatMap((symbol, pairId) => [
    { id: pairId * 2, symbol, matched: false },
    { id: pairId * 2 + 1, symbol, matched: false },
  ]);
  return shuffle(pairs);
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function updateHud() {
  movesEl.textContent = String(moves);
  timerEl.textContent = formatTime(elapsedSeconds);
}

function setStatus(text) {
  statusEl.textContent = text;
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function startTimer() {
  if (timerStarted) return;
  timerStarted = true;
  timerInterval = setInterval(() => {
    elapsedSeconds += 1;
    updateHud();
  }, 1000);
}

function renderBoard() {
  boardEl.innerHTML = "";
  deck.forEach((card, index) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "card";
    btn.dataset.index = String(index);
    btn.setAttribute("role", "gridcell");
    btn.setAttribute("aria-label", "Card face down");
    btn.disabled = !gameActive || card.matched;

    if (card.matched) btn.classList.add("matched");
    if (flipped.includes(index)) btn.classList.add("flipped");

    btn.innerHTML = `
      <div class="card-inner">
        <div class="card-face card-back" aria-hidden="true">?</div>
        <div class="card-face card-front" aria-hidden="true">${card.symbol}</div>
      </div>
    `;

    btn.addEventListener("click", () => onCardClick(index));
    btn.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onCardClick(index);
      }
    });

    boardEl.appendChild(btn);
  });

  boardEl.classList.toggle("disabled", locked || !gameActive);
}

function onCardClick(index) {
  if (!gameActive || locked) return;

  const card = deck[index];
  if (card.matched || flipped.includes(index)) return;

  if (!timerStarted) startTimer();

  flipped.push(index);
  renderBoard();

  if (flipped.length < 2) {
    setStatus("Pick another card");
    return;
  }

  locked = true;
  moves += 1;
  updateHud();

  const [a, b] = flipped;
  const match = deck[a].symbol === deck[b].symbol;

  if (match) {
    deck[a].matched = true;
    deck[b].matched = true;
    flipped = [];
    locked = false;
    renderBoard();
    setStatus("Nice match!");
    checkWin();
  } else {
    setStatus("No match — try again");
    setTimeout(() => {
      flipped = [];
      locked = false;
      renderBoard();
      setStatus("Find matching pairs");
    }, MISMATCH_DELAY_MS);
  }
}

function checkWin() {
  if (!deck.every((c) => c.matched)) return;

  gameActive = false;
  stopTimer();
  setStatus("You cleared the board!");
  winMessage.textContent = `Completed in ${moves} moves and ${formatTime(elapsedSeconds)}.`;
  winOverlay.classList.remove("hidden");
}

function resetGame() {
  stopTimer();
  deck = buildDeck();
  flipped = [];
  moves = 0;
  locked = false;
  gameActive = true;
  elapsedSeconds = 0;
  timerStarted = false;
  winOverlay.classList.add("hidden");
  updateHud();
  setStatus("Find matching pairs");
  startBtn.disabled = true;
  restartBtn.disabled = false;
  renderBoard();
}

function initIdleBoard() {
  gameActive = false;
  deck = buildDeck();
  flipped = [];
  moves = 0;
  locked = false;
  elapsedSeconds = 0;
  timerStarted = false;
  updateHud();
  renderBoard();
}

startBtn.addEventListener("click", resetGame);
restartBtn.addEventListener("click", resetGame);
playAgainBtn.addEventListener("click", resetGame);

initIdleBoard();
