/* ================= 贪吃蛇吃答案（输入答案版） ================= */
(function () {
  const qEl = document.getElementById("snake-q");
  const scoreEl = document.getElementById("snake-score");
  const progEl = document.getElementById("snake-progress");
  const fruitRow = document.getElementById("fruitRow");
  const bodyWrap = document.getElementById("snakeBodyWrap");
  const display = document.getElementById("snake-display");
  const keypad = document.getElementById("snake-keypad");

  const TOTAL = 10;
  let q, score = 0, eaten = 0, wrong = 0, len = 0, busy = false, qStart = 0;

  buildKeypad(keypad, display, onSubmit);

  function renderSnake() {
    bodyWrap.innerHTML = "";
    for (let i = 0; i < len; i++) {
      const s = document.createElement("div");
      s.className = "seg" + (i === len - 1 ? " head" : "");
      if (i === len - 1) {
        const t = document.createElement("div");
        t.className = "snake-tongue";
        s.appendChild(t);
      }
      bodyWrap.appendChild(s);
    }
  }

  function newRound() {
    q = genQ();
    qEl.textContent = q.text + " = ?";
    qStart = Date.now();
    fruitRow.innerHTML = "";
    const f = document.createElement("div");
    f.className = "fruit";
    f.textContent = "🍎";
    fruitRow.appendChild(f);
  }

  function onSubmit(val) {
    if (busy) return;
    const n = parseInt(val, 10);
    if (n === q.answer) {
      busy = true;
      Stats.log({ text: q.text, answer: q.answer, ok: true, ms: Date.now() - qStart });
      flash(display, true);
      const fruitEl = fruitRow.children[0];
      fruitEl.classList.add("eaten");
      bodyWrap.classList.remove("eat"); void bodyWrap.offsetWidth;
      bodyWrap.classList.add("eat");
      score += 10; eaten++; len++;
      scoreEl.textContent = "⭐ " + score;
      progEl.textContent = `🍎 ${eaten} / ${TOTAL}`;
      renderSnake();
      setTimeout(() => {
        busy = false;
        if (eaten >= TOTAL) end();
        else newRound();
      }, 700);
    } else {
      wrong++;
      Stats.log({ text: q.text, answer: q.answer, ok: false, ms: Date.now() - qStart, gave: n });
      flash(display, false);
      const el = fruitRow.children[0];
      if (el) { el.classList.remove("shake"); void el.offsetWidth; el.classList.add("shake"); }
    }
  }

  function end() {
    const stars = wrong === 0 ? 3 : wrong <= 3 ? 2 : 1;
    Stats.finish(score, stars);
    showResult({
      title: "蛇蛇吃得饱饱的！",
      stars,
      lines: `吃对果子 <b>${eaten}</b> 个<br>答错 <b>${wrong}</b> 次<br>蛇长到 <b>${len}</b> 节啦！`,
    });
  }

  Games.snake = {
    start() {
      score = 0; eaten = 0; wrong = 0; len = 2; busy = false;
      scoreEl.textContent = "⭐ 0";
      progEl.textContent = `🍎 0 / ${TOTAL}`;
      display.innerHTML = '<span class="placeholder">点下面的数字</span>';
      Stats.begin("snake");
      renderSnake();
      newRound();
    },
    stop() { Stats.discard(); },
  };
})();
