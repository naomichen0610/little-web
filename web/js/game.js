/* =============================================================================
   MEMORY MATCH — game.js (behavior and game logic)

   JavaScript runs in the browser after index.html loads. It:
   - Finds page elements by id (board, moves, timer, buttons)
   - Builds and shuffles 16 cards, handles clicks, checks matches
   - Updates text/classes so CSS can flip cards and show the win popup
   ============================================================================= */

// ----- Fixed settings (do not change during a round) -----

// Eight images from web/pictures/ — each appears on two cards (16 cards total)
const CARD_IMAGES = [
  "pictures/1.jpeg",
  "pictures/2.jpeg",
  "pictures/3.jpeg",
  "pictures/4.jpeg",
  "pictures/5.jpeg",
  "pictures/6.jpeg",
  "pictures/7.jpeg",
  "pictures/8.jpeg",
];
const PAIR_COUNT = CARD_IMAGES.length;
// How long (ms) to show two non-matching cards before flipping them back
const MISMATCH_DELAY_MS = 800;
// How often the HUD timer updates (10ms = centiseconds on screen)
const TIMER_TICK_MS = 10;

// ----- Links to HTML elements (must match id="..." in index.html) -----

const boardEl = document.getElementById("board");
const movesEl = document.getElementById("moves");
const timerEl = document.getElementById("timer");
const statusEl = document.getElementById("status");
const startBtn = document.getElementById("start-btn");
const restartBtn = document.getElementById("restart-btn");
const winOverlay = document.getElementById("win-overlay");
const winMessage = document.getElementById("win-message");
const playAgainBtn = document.getElementById("play-again-btn");

// ----- Game state (variables change as the player plays) -----

let deck = [];           // array of 16 { id, image, matched }
let flipped = [];        // indices of cards currently face-up (0, 1, or 2)
let moves = 0;           // number of two-card guesses
let locked = false;      // true while resolving a pair (blocks extra clicks)
let gameActive = false;  // false until Start; false again after win
let timerInterval = null; // handle returned by setInterval — used to stop timer
let elapsedMs = 0; // elapsed time in milliseconds
let timerStarted = false;

// ----- Deck helpers -----

/** Fisher–Yates shuffle: randomize card order without changing which images exist */
function shuffle(array) {
  const arr = [...array]; // copy so we don't mutate the original
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]; // swap two entries
  }
  return arr;
}

/** Build 16 cards: duplicate each image twice, then shuffle */
function buildDeck() {
  const pairs = CARD_IMAGES.flatMap((image, pairId) => [
    { id: pairId * 2, image, matched: false },
    { id: pairId * 2 + 1, image, matched: false },
  ]);
  return shuffle(pairs);
}

// ----- HUD and timer -----

/** e.g. 75340 ms → "1:15.34" (minutes:seconds.centiseconds) */
function formatTime(ms) {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const centis = Math.floor((ms % 1000) / 10);
  return `${minutes}:${seconds.toString().padStart(2, "0")}.${centis.toString().padStart(2, "0")}`;
}

/** Write current moves and time into the HTML spans */
function updateHud() {
  movesEl.textContent = String(moves);
  timerEl.textContent = formatTime(elapsedMs);
}

/** Update the hint line under the board (#status) */
function setStatus(text) {
  statusEl.textContent = text;
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

/** Start high-resolution timer after the first card flip (only once per round) */
function startTimer() {
  if (timerStarted) return;
  timerStarted = true;
  timerInterval = setInterval(() => {
    elapsedMs += TIMER_TICK_MS;
    updateHud();
  }, TIMER_TICK_MS);
}

// ----- Drawing the board -----

/**
 * Rebuild all 16 card buttons inside #board.
 * Called after shuffle, each click, mismatch delay, and reset.
 */
function renderBoard() {
  boardEl.innerHTML = ""; // clear previous buttons

  deck.forEach((card, index) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "card";
    btn.dataset.index = String(index); // optional: index in data-index attribute
    btn.setAttribute("role", "gridcell");
    btn.setAttribute("aria-label", "Card face down");
    btn.disabled = !gameActive || card.matched;

    // CSS flip animation: .flipped / .matched on the button (see styles.css)
    if (card.matched) btn.classList.add("matched");
    if (flipped.includes(index)) btn.classList.add("flipped");

    btn.innerHTML = `
      <div class="card-inner">
        <div class="card-face card-back" aria-hidden="true">?</div>
        <div class="card-face card-front" aria-hidden="true">
          <img class="card-image" src="${card.image}" alt="" draggable="false" />
        </div>
      </div>
    `;

    btn.addEventListener("click", () => onCardClick(index));
    // Keyboard: Tab to card, then Enter or Space to flip
    btn.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onCardClick(index);
      }
    });

    boardEl.appendChild(btn);
  });

  // While locked or before Start, CSS blocks pointer events on the whole grid
  boardEl.classList.toggle("disabled", locked || !gameActive);
}

// ----- Main click logic -----

function onCardClick(index) {
  if (!gameActive || locked) return;

  const card = deck[index];
  if (card.matched || flipped.includes(index)) return;

  if (!timerStarted) startTimer();

  flipped.push(index);
  renderBoard();

  // First card of the pair — wait for second click
  if (flipped.length < 2) {
    setStatus("Pick another card");
    return;
  }

  // Two cards face-up — compare them
  locked = true;
  moves += 1;
  updateHud();

  const [a, b] = flipped;
  const match = deck[a].image === deck[b].image;

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

/** If every card is matched, stop play and show the win overlay */
function checkWin() {
  if (!deck.every((c) => c.matched)) return;

  gameActive = false;
  stopTimer();
  setStatus("You cleared the board!");
  winMessage.textContent = `Completed in ${moves} moves and ${formatTime(elapsedMs)}.`;
  winOverlay.classList.remove("hidden"); // CSS was hiding the overlay
}

/** New round: shuffle, reset scores, hide win popup, enable play */
function resetGame() {
  stopTimer();
  deck = buildDeck();
  flipped = [];
  moves = 0;
  locked = false;
  gameActive = true;
  elapsedMs = 0;
  timerStarted = false;
  winOverlay.classList.add("hidden");
  updateHud();
  setStatus("Find matching pairs");
  startBtn.disabled = true;
  restartBtn.disabled = false;
  renderBoard();
}

/** Page load: show a shuffled board preview but don't allow clicks until Start */
function initIdleBoard() {
  gameActive = false;
  deck = buildDeck();
  flipped = [];
  moves = 0;
  locked = false;
  elapsedMs = 0;
  timerStarted = false;
  updateHud();
  renderBoard();
}

// ----- Wire buttons from index.html -----

startBtn.addEventListener("click", resetGame);
restartBtn.addEventListener("click", resetGame);
playAgainBtn.addEventListener("click", resetGame);

// Run once when the script loads
initIdleBoard();
