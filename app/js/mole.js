/* ================= 打地鼠 ================= */
(function () {
  const field = document.getElementById("moleField");
  const targetEl = document.getElementById("mole-target");
  const scoreEl = document.getElementById("mole-score");
  const hitsEl = document.getElementById("mole-hits");
  const timerBar = document.getElementById("mole-timerbar");

  const DURATION = 60;      // 秒
  const HOLES = 9;
  let holes = [], running = false, spawnTimer = null, tickTimer = null;
  let timeLeft = 0, score = 0, hits = 0, misses = 0;
  let target = 0, correctHole = -1, activeCount = 0;

  // 三档速度：地鼠停留时间、出没间隔、同时最多几只
  const SPEEDS = {
    slow:   { stay: [2600, 3600], spawn: [900, 1400], maxUp: 2 },
    normal: { stay: [1500, 2300], spawn: [550, 900],  maxUp: 3 },
    fast:   { stay: [900, 1500],  spawn: [350, 600],  maxUp: 4 },
  };
  let speedKey = "normal";
  document.querySelectorAll("#moleSpeedRow .speed-btn").forEach(b => {
    b.addEventListener("click", () => {
      document.querySelectorAll("#moleSpeedRow .speed-btn").forEach(x => x.classList.remove("on"));
      b.classList.add("on");
      speedKey = b.dataset.speed;
    });
  });

  // 建洞
  field.innerHTML = "";
  for (let i = 0; i < HOLES; i++) {
    const hole = document.createElement("div");
    hole.className = "hole";
    hole.innerHTML = `<div class="mole">
        <div class="mole-board"></div>
        <div class="mole-body"><div class="mole-ear-l"></div><div class="mole-ear-r"></div><div class="mole-nose"></div></div>
      </div>`;
    hole.addEventListener("pointerdown", () => whack(i));
    field.appendChild(hole);
    holes.push(hole);
  }

  function newTarget() {
    const q = genQ();
    target = q.answer;
    targetEl.textContent = "= " + target;
    correctHole = -1;
  }

  function popMole(i) {
    const hole = holes[i];
    if (hole.classList.contains("up")) return;
    // 若场上没有正确答案，这一只必须是正确的
    const needCorrect = correctHole === -1;
    const q = needCorrect ? makeCorrectQ() : genDistractor(target);
    hole.dataset.ok = needCorrect && q.answer === target ? "1" : (q.answer === target ? "1" : "0");
    if (q.answer === target) correctHole = i;
    hole.dataset.text = q.text;
    hole.dataset.answer = q.answer;
    hole.dataset.pop = Date.now();
    const board = hole.querySelector(".mole-board");
    if (q.text.length >= 11) {         // 长算式：去空格 + 小字号，防止超出洞口被裁掉
      board.textContent = q.text.replace(/ /g, "");
      board.classList.add("long");
    } else {
      board.textContent = q.text;
      board.classList.remove("long");
    }
    hole.classList.add("up");
    activeCount++;
    const sp = SPEEDS[speedKey];
    hole._t = setTimeout(() => duck(i), rnd(sp.stay[0], sp.stay[1]));
  }

  function makeCorrectQ() {
    for (let k = 0; k < 50; k++) {
      const q = genQ();
      if (q.answer === target) return q;
    }
    // 兜底：直接构造
    const a = Math.max(1, target - rnd(0, Math.min(9, target)));
    return { text: `${target - a} + ${a}`, answer: target };
  }

  function duck(i) {
    const hole = holes[i];
    clearTimeout(hole._t);
    if (!hole.classList.contains("up")) return;
    // 正确地鼠漏打：记为 escape（计入“速度慢/漏打”）
    if (running && hole.dataset.ok === "1" && hole.dataset.text) {
      Stats.log({ text: hole.dataset.text, answer: +hole.dataset.answer, ok: false, kind: "escape" });
    }
    hole.classList.remove("up");
    activeCount--;
    if (correctHole === i) correctHole = -1;
  }

  function whack(i) {
    if (!running) return;
    const hole = holes[i];
    if (!hole.classList.contains("up")) return;
    const ms = Date.now() - (+hole.dataset.pop || Date.now());
    const fx = document.createElement("div");
    fx.className = "bonk-fx";
    if (hole.dataset.ok === "1") {
      score += 10; hits++;
      Stats.log({ text: hole.dataset.text, answer: +hole.dataset.answer, ok: true, ms });
      fx.textContent = "💥";
      hole.appendChild(fx);
      hole.classList.add("bonked");
      setTimeout(() => { hole.classList.remove("bonked"); duck(i); fx.remove(); }, 120);
      // 连击感：小概率目标立即换新
      if (Math.random() < 0.35) setTimeout(newTarget, 500);
    } else {
      score = Math.max(0, score - 5); misses++;
      Stats.log({ text: hole.dataset.text, answer: +hole.dataset.answer, ok: false, ms, kind: "misread" });
      fx.textContent = "❌";
      hole.appendChild(fx);
      setTimeout(() => fx.remove(), 460);
    }
    scoreEl.textContent = "⭐ " + score;
    hitsEl.textContent = "🔨 " + hits;
  }

  function loop() {
    if (!running) return;
    const sp = SPEEDS[speedKey];
    if (activeCount < sp.maxUp && Math.random() < 0.7) {
      popMole(rnd(0, HOLES - 1));
    }
    spawnTimer = setTimeout(loop, rnd(sp.spawn[0], sp.spawn[1]));
  }

  function tick() {
    timeLeft -= 0.1;
    timerBar.style.width = Math.max(0, timeLeft / DURATION * 100) + "%";
    if (timeLeft <= 11) timerBar.style.background = "#E53935";
    if (timeLeft <= 0) end();
  }

  function end() {
    running = false;
    clearTimeout(spawnTimer); clearInterval(tickTimer);
    holes.forEach((_, i) => duck(i));
    const total = hits + misses;
    const acc = total ? Math.round(hits / total * 100) : 0;
    const stars = acc >= 90 && hits >= 10 ? 3 : acc >= 70 && hits >= 6 ? 2 : 1;
    Stats.finish(score, stars);
    showResult({
      title: hits >= 10 ? "打地鼠小能手！" : "继续加油哦！",
      stars,
      lines: `打中 <b>${hits}</b> 只地鼠<br>正确率 <b>${acc}%</b><br>得分 <b>${score}</b>`,
    });
  }

  Games.mole = {
    start() {
      score = 0; hits = 0; misses = 0; activeCount = 0; timeLeft = DURATION;
      scoreEl.textContent = "⭐ 0"; hitsEl.textContent = "🔨 0";
      timerBar.style.width = "100%"; timerBar.style.background = "#FF9800";
      holes.forEach(h => { h.classList.remove("up", "bonked"); clearTimeout(h._t); });
      newTarget();
      Stats.begin("mole", { speed: speedKey });
      running = true;
      loop();
      tickTimer = setInterval(tick, 100);
    },
    stop() {
      running = false;
      clearTimeout(spawnTimer); clearInterval(tickTimer);
      holes.forEach((_, i) => duck(i));
      Stats.discard();
    },
  };
})();
