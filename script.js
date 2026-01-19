// Mario‑Kart style symbols (emoji). Pokal (🏆) ist seltener -> Hauptgewinn.
const symbolPool = [
  "🚗", // kart / common
  "🍄", // mushroom
  "🍌", // banana
  "🐢", // koopa shell
  "⭐️", // star
  "🏁", // flag
  "💨", // boost
  // trophy should be rarer — we'll add fewer entries for it
];
const trophy = "🏆";

// make weighted pool where trophy is rare
const weightedSymbols = [
  ...symbolPool, ...symbolPool, ...symbolPool, // common x3
  ...symbolPool, // common x4
  trophy // trophy x1 (rare)
];

const reels = document.querySelectorAll(".reel .symbol");
const spinButton = document.getElementById("spinButton");
const maxButton = document.getElementById("maxButton");
const balanceEl = document.getElementById("balance");
const betEl = document.getElementById("bet");
const messageEl = document.getElementById("message");

// audio elements (place files under assets/sounds/)
const bgAudio = document.getElementById("bgAudio");
const spinAudio = document.getElementById("spinAudio");
const win2Audio = document.getElementById("win2Audio");
const win3Audio = document.getElementById("win3Audio");

// point to audio files (placeholders — add these files to assets/sounds/)
bgAudio.src = "assets/sounds/bg_engine_loop.mp3";
spinAudio.src = "assets/sounds/spin_loop.mp3";
win2Audio.src = "assets/sounds/win_small.mp3";
win3Audio.src = "assets/sounds/win_big.mp3";

// try to play background when user interacts
function tryStartBg() {
  if (bgAudio.paused) {
    bgAudio.volume = 0.25;
    bgAudio.play().catch(()=>{/* user agent block; will play after interaction */});
  }
}

// balance (persisted)
let balance = Number(localStorage.getItem("mk_balance") || 100);
let intervals = [];
let stopped = 0;

function updateBalanceUI(){ balanceEl.textContent = formatMoney(balance); }
function formatMoney(v){ return Number.isInteger(v) ? v : v.toFixed(2); }

function randSym(){
  return weightedSymbols[Math.floor(Math.random()*weightedSymbols.length)];
}

function startSpin(){
  tryStartBg();
  const bet = Math.max(1, Math.floor(Number(betEl.value) || 1));
  if(bet <= 0){ showMessage("Setze einen Einsatz (>0)."); return; }
  if(bet > balance){ showMessage("Nicht genug Guthaben."); return; }

  balance -= bet;
  saveBalance();
  updateBalanceUI();
  showMessage("Dreht...");
  spinButton.disabled = true;
  stopped = 0;

  // start spin audio
  spinAudio.currentTime = 0;
  spinAudio.volume = 0.6;
  spinAudio.play().catch(()=>{});

  // start fast cycling for each reel
  intervals = Array.from(reels).map((el, i) => {
    return setInterval(()=> el.textContent = randSym(), 60 + i*10);
  });

  // stop each reel after a random time
  Array.from(reels).forEach((el, i) => {
    const stopAfter = 700 + i*300 + Math.floor(Math.random()*500);
    setTimeout(()=> stopReel(i), stopAfter);
  });

  function stopReel(index){
    clearInterval(intervals[index]);
    // determine final symbol with a small chance for trophy
    const final = Math.random() < 0.06 ? trophy : symbolPool[Math.floor(Math.random()*symbolPool.length)];
    reels[index].textContent = final;
    stopped++;
    if(stopped === reels.length) {
      // stop spin sound
      spinAudio.pause();
      spinAudio.currentTime = 0;
      setTimeout(()=> {
        evaluateResult(bet);
        spinButton.disabled = false;
      }, 300);
    }
  }
}

function evaluateResult(bet){
  const results = Array.from(reels).map(r => r.textContent);
  const counts = {};
  results.forEach(s => counts[s] = (counts[s]||0) + 1);
  const bestCount = Math.max(...Object.values(counts));
  let payout = 0;
  if(bestCount === 3){
    // 3 gleiche -> Jackpot. If it's the trophy, even bigger.
    if(Object.keys(counts).find(k=>counts[k]===3) === trophy){
      payout = bet * 25;
      showMessage(`JACKPOT! 3x ${trophy} — Gewinn: ${payout} €`);
      playWinBig();
    } else {
      payout = bet * 15;
      showMessage(`Großer Gewinn! 3 gleiche — Gewinn: ${payout} €`);
      playWinBig();
    }
  } else if(bestCount === 2){
    payout = bet * 2;
    const sym = Object.keys(counts).find(k => counts[k] === 2);
    showMessage(`Gut! 2x ${sym} — Gewinn: ${payout} €`);
    playWinSmall();
  } else {
    showMessage("Kein Gewinn — viel Glück beim nächsten Mal!");
  }
  balance += payout;
  saveBalance();
  updateBalanceUI();
}

function playWinSmall(){ win2Audio.currentTime = 0; win2Audio.volume = 0.8; win2Audio.play().catch(()=>{}); }
function playWinBig(){ win3Audio.currentTime = 0; win3Audio.volume = 0.9; win3Audio.play().catch(()=>{}); }

function showMessage(txt){ messageEl.textContent = txt; }

spinButton.addEventListener("click", startSpin);
maxButton.addEventListener("click", ()=> {
  betEl.value = Math.max(1, Math.floor(balance));
});

reels.forEach(r => r.textContent = randSym());
updateBalanceUI();

// persist balance
function saveBalance(){ localStorage.setItem("mk_balance", String(balance)); }

// start bg audio on first user event
document.addEventListener("click", tryStartBg, {once:true});
document.addEventListener("keydown", tryStartBg, {once:true});
