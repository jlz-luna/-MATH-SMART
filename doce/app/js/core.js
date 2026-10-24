/* ================= 核心：难度 / 出题器 / 导航 / 键盘 / 结算 ================= */
"use strict";

const App = {
  diff: "mix",           // addsub | mul | mix
  currentGame: null,
};

const rnd = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const pick = arr => arr[rnd(0, arr.length - 1)];

/* ---------- 出题器：100以内加减 / 表内乘法 / 乘加乘减混合，无除法无负数 ---------- */
function genAddSub() {
  if (Math.random() < 0.5) {
    const a = rnd(11, 89), b = rnd(11, 100 - a);
    return { text: `${a} + ${b}`, answer: a + b };
  }
  const a = rnd(21, 99), b = rnd(11, a - 1);
  return { text: `${a} − ${b}`, answer: a - b };
}
function genMul() {
  const a = rnd(2, 9), b = rnd(2, 9);
  return { text: `${a} × ${b}`, answer: a * b };
}
/* 三个数加减混合：连加、连减、加减混合，100 以内、无负数 */
function genThreeAddSub() {
  const kind = rnd(0, 2);
  if (kind === 0) {                    // 连加 a+b+c ≤ 100
    const a = rnd(10, 40), b = rnd(10, Math.min(50, 90 - a));
    const c = rnd(5, 100 - a - b);
    return { text: `${a} + ${b} + ${c}`, answer: a + b + c };
  }
  if (kind === 1) {                    // 连减 a−b−c ≥ 0
    const a = rnd(50, 99), b = rnd(10, a - 25), c = rnd(5, a - b);
    return { text: `${a} − ${b} − ${c}`, answer: a - b - c };
  }
  // 加减混合 a+b−c ≥ 0（也可能 a−b+c，等价交换）
  if (Math.random() < 0.5) {
    const a = rnd(10, 60), b = rnd(10, 99 - a), c = rnd(5, a + b);
    return { text: `${a} + ${b} − ${c}`, answer: a + b - c };
  }
  const a = rnd(30, 99), b = rnd(10, a - 5), c = rnd(5, 99 - (a - b));
  return { text: `${a} − ${b} + ${c}`, answer: a - b + c };
}

function genMix() {
  const kind = Math.random();
  if (kind < 0.22) return genAddSub();
  if (kind < 0.42) return genMul();
  if (kind < 0.68) return genThreeAddSub();
  const a = rnd(2, 9), b = rnd(2, 9), p = a * b;
  if (Math.random() < 0.5) {          // 乘加
    const c = rnd(2, Math.max(2, 99 - p));
    return { text: `${a} × ${b} + ${c}`, answer: p + c };
  }
  if (Math.random() < 0.5) {          // 乘减
    const c = rnd(1, p - 1);
    return { text: `${a} × ${b} − ${c}`, answer: p - c };
  }
  const big = rnd(p + 2, 99);         // 减乘
  return { text: `${big} − ${a} × ${b}`, answer: big - p };
}
function genQ() {
  if (App.diff === "addsub") return genAddSub();
  if (App.diff === "mul") return genMul();
  return genMix();
}
/* 生成一个干扰算式：答案不同，但数值接近 */
function genDistractor(targetAnswer) {
  for (let i = 0; i < 40; i++) {
    const q = genQ();
    if (q.answer !== targetAnswer && q.answer >= 0) return q;
  }
  return genAddSub();
}

/* ---------- 屏幕导航 ---------- */
function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}
function goHome() {
  if (App.currentGame && Games[App.currentGame]) Games[App.currentGame].stop();
  App.currentGame = null;
  hideOverlay();
  showScreen("home");
}
document.querySelectorAll("[data-home]").forEach(b => b.addEventListener("click", goHome));
document.querySelectorAll(".menu-card").forEach(card => {
  card.addEventListener("click", () => {
    const g = card.dataset.game;
    App.currentGame = g;
    showScreen("game-" + g);
    Games[g].start();
  });
});
document.querySelectorAll(".diff-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".diff-btn").forEach(b => b.classList.remove("on"));
    btn.classList.add("on");
    App.diff = btn.dataset.diff;
  });
});

/* ---------- 九宫格数字键盘 ----------
   buildKeypad(container, displayEl, onSubmit(numStr))  */
function buildKeypad(container, displayEl, onSubmit) {
  const keys = ["1","2","3","4","5","6","7","8","9","del","0","ok"];
  container.innerHTML = "";
  keys.forEach(k => {
    const b = document.createElement("button");
    b.className = "key" + (k === "ok" ? " ok" : k === "del" ? " del" : "");
    b.textContent = k === "ok" ? "✓" : k === "del" ? "⌫" : k;
    b.addEventListener("click", () => {
      const ph = displayEl.querySelector(".placeholder");
      if (ph) ph.remove();
      if (k === "del") {
        displayEl.textContent = displayEl.textContent.slice(0, -1);
        if (!displayEl.textContent) displayEl.innerHTML = '<span class="placeholder">点下面的数字</span>';
      } else if (k === "ok") {
        const v = displayEl.textContent.trim();
        if (v) { onSubmit(v); displayEl.innerHTML = '<span class="placeholder">点下面的数字</span>'; }
      } else {
        if (displayEl.textContent.replace(/\D/g, "").length < 3)
          displayEl.textContent += k;
      }
    });
    container.appendChild(b);
  });
}

/* ---------- 结算弹层 ---------- */
const overlay = document.getElementById("overlay");
function showResult({ title, stars, lines }) {
  document.getElementById("rTitle").textContent = title;
  document.getElementById("rStars").textContent = "⭐".repeat(stars) + "☆".repeat(3 - stars);
  document.getElementById("rLines").innerHTML = lines;
  overlay.classList.add("show");
}
function hideOverlay() { overlay.classList.remove("show"); }
document.getElementById("rHome").addEventListener("click", goHome);
document.getElementById("rAgain").addEventListener("click", () => {
  hideOverlay();
  if (App.currentGame) Games[App.currentGame].start();
});

/* ---------- 答对/答错小反馈 ---------- */
function flash(displayEl, good) {
  displayEl.style.background = good ? "#C8F5CC" : "#FFD6D2";
  setTimeout(() => displayEl.style.background = "#fff", 260);
}

const Games = {}; // 各游戏挂载点

/* ================= 数据统计模块 =================
   数据只存在本机浏览器 localStorage，最多保留 400 局 */
const Stats = {
  KEY: "mathPark.records",
  cur: null,

  begin(game, extra) {
    this.cur = { game, diff: App.diff, ts: Date.now(), extra: extra || {}, logs: [] };
  },

  // 题型识别：乘加乘减 / 三数加减 / 乘法 / 加法 / 减法
  qtype(text) {
    if (!text) return "其他";
    const ops = (text.match(/[+−×]/g) || []).length;
    const hasMul = text.includes("×");
    if (hasMul && ops >= 2) return "乘加乘减";
    if (hasMul) return "乘法";
    if (ops >= 2) return "三数加减";
    if (text.includes("+")) return "加法";
    return "减法";
  },

  // entry: {text, answer, ok, ms, gave, kind}  kind:'escape' 表示打地鼠漏打
  log(entry) {
    if (!this.cur) return;
    entry.type = this.qtype(entry.text);
    this.cur.logs.push(entry);
  },

  finish(score, stars) {
    if (!this.cur) return null;
    const c = this.cur;
    const answered = c.logs.filter(l => l.kind !== "escape");
    const escapes = c.logs.length - answered.length;
    const correct = answered.filter(l => l.ok).length;
    const times = answered.filter(l => l.ms).map(l => l.ms);
    const slow = times.filter(t => t > 10000).length + escapes;
    const rec = {
      ts: c.ts, dur: Math.round((Date.now() - c.ts) / 1000),
      game: c.game, diff: c.diff, speed: c.extra.speed || "",
      score, stars,
      total: answered.length, correct, wrong: answered.length - correct,
      escapes, slow,
      avgMs: times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0,
      logs: c.logs,
    };
    try {
      const all = Stats.all();
      all.push(rec);
      while (all.length > 400) all.shift();
      localStorage.setItem(Stats.KEY, JSON.stringify(all));
    } catch (e) { /* 存储满或不可用时静默跳过 */ }
    this.cur = null;
    return rec;
  },

  discard() { this.cur = null; },

  all() {
    try { return JSON.parse(localStorage.getItem(Stats.KEY) || "[]"); }
    catch (e) { return []; }
  },

  clear() { try { localStorage.removeItem(Stats.KEY); } catch (e) {} },
};

const GAME_NAMES = { mole: "口算打地鼠", bridge: "搭桥救动物", race: "口算赛车", snake: "贪吃蛇吃答案" };
const DIFF_NAMES = { addsub: "加减法", mul: "乘法", mix: "混合运算" };
