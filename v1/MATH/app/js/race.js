/* ================= 口算赛车 ================= */
(function () {
  const trackEl = document.getElementById("raceTrack");
  const player = document.getElementById("racePlayer");
  const rival = document.getElementById("raceRival");
  const qEl = document.getElementById("race-q");
  const cntEl = document.getElementById("race-count");
  const display = document.getElementById("race-display");
  const keypad = document.getElementById("race-keypad");

  const PLAYER_STEP = 12;      // 每答对一题前进 %
  const RIVAL_SPEED = 0.16;    // 对手每 0.1 秒前进 %（约 62 秒冲线）
  const PLAYER_SLIP = 4;       // 答错后退 %
  let q, playerPos = 0, rivalPos = 0, answered = 0, wrong = 0, qStart = 0;
  let running = false, tickTimer = null, busy = false;

  buildKeypad(keypad, display, onSubmit);

  function usableWidth() { return trackEl.clientWidth - 60 - 40; } // 减去内边距和车宽余量

  function render() {
    player.style.left = (playerPos / 100 * usableWidth()) + "px";
    rival.style.left = (rivalPos / 100 * usableWidth()) + "px";
  }

  function nextQ() {
    q = genQ();
    qEl.textContent = q.text + " = ?";
    qStart = Date.now();
  }

  function onSubmit(val) {
    if (!running || busy) return;
    if (parseInt(val, 10) === q.answer) {
      answered++;
      Stats.log({ text: q.text, answer: q.answer, ok: true, ms: Date.now() - qStart });
      playerPos = Math.min(100, playerPos + PLAYER_STEP);
      player.classList.remove("boost"); void player.offsetWidth;
      player.classList.add("boost");
      flash(display, true);
      cntEl.textContent = `🏁 ${answered} 题`;
      nextQ();
      render();
      if (playerPos >= 100) return end(true);
    } else {
      wrong++;
      Stats.log({ text: q.text, answer: q.answer, ok: false, ms: Date.now() - qStart, gave: parseInt(val, 10) });
      playerPos = Math.max(0, playerPos - PLAYER_SLIP);
      flash(display, false);
      render();
    }
  }

  function tick() {
    if (!running) return;
    rivalPos = Math.min(100, rivalPos + RIVAL_SPEED);
    render();
    if (rivalPos >= 100) end(false);
  }

  function end(won) {
    running = false;
    clearInterval(tickTimer);
    const stars = won ? (wrong === 0 ? 3 : wrong <= 2 ? 3 : 2) : 1;
    Stats.finish(answered * 10, stars);
    showResult({
      title: won ? "🏆 你赢啦！" : "惜败！再挑战一次？",
      stars,
      lines: `答对 <b>${answered}</b> 题<br>答错 <b>${wrong}</b> 次<br>${won ? "口算又快又准！" : "对手先到终点，下次提速！"}`,
    });
  }

  Games.race = {
    start() {
      playerPos = 0; rivalPos = 0; answered = 0; wrong = 0; busy = false;
      cntEl.textContent = "🏁 0 题";
      display.innerHTML = '<span class="placeholder">点下面的数字</span>';
      nextQ();
      render();
      running = true;
      Stats.begin("race");
      tickTimer = setInterval(tick, 100);
    },
    stop() {
      running = false;
      clearInterval(tickTimer);
      Stats.discard();
    },
  };
})();
