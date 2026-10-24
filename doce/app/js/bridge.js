/* ================= 搭桥救动物 ================= */
(function () {
  const scene = document.getElementById("bridgeScene");
  const track = document.getElementById("bridgeTrack");
  const boy = scene.querySelector(".bridge-boy");
  const animalEl = document.getElementById("bridgeAnimal");
  const qEl = document.getElementById("bridge-q");
  const progEl = document.getElementById("bridge-progress");
  const display = document.getElementById("bridge-display");
  const keypad = document.getElementById("bridge-keypad");

  const TOTAL = 10;
  const ANIMALS = ["🐰", "🐿️", "🦔", "🐥", "🦊", "🐢"];
  let q, index = 0, wrong = 0, busy = false, animal = "🐰", qStart = 0;

  buildKeypad(keypad, display, onSubmit);

  // 桥板
  track.innerHTML = "";
  const planks = [];
  for (let i = 0; i < TOTAL; i++) {
    const p = document.createElement("div");
    p.className = "plank";
    track.appendChild(p);
    planks.push(p);
  }

  function nextQ() {
    q = genQ();
    qEl.textContent = q.text + " = ?";
    progEl.textContent = `第 ${index + 1} / ${TOTAL} 题`;
    qStart = Date.now();
  }

  function step() {
    planks[index].classList.add("on");
    // 小男孩往前走一步
    const pct = (index + 1) / TOTAL;
    const w = track.offsetWidth;
    boy.style.transition = "left .35s ease";
    boy.style.left = (8 + w * pct * 0.85) + "px";
  }

  function onSubmit(val) {
    if (busy) return;
    if (parseInt(val, 10) === q.answer) {
      busy = true;
      Stats.log({ text: q.text, answer: q.answer, ok: true, ms: Date.now() - qStart });
      flash(display, true);
      step();
      index++;
      setTimeout(() => {
        busy = false;
        if (index >= TOTAL) win();
        else nextQ();
      }, 420);
    } else {
      wrong++;
      Stats.log({ text: q.text, answer: q.answer, ok: false, ms: Date.now() - qStart, gave: parseInt(val, 10) });
      flash(display, false);
    }
  }

  function win() {
    scene.classList.add("saved");
    const stars = wrong === 0 ? 3 : wrong <= 3 ? 2 : 1;
    Stats.finish(TOTAL * 10, stars);
    setTimeout(() => {
      showResult({
        title: `成功救出小${animalName()}！`,
        stars,
        lines: `答对 <b>${TOTAL}</b> 题<br>答错 <b>${wrong}</b> 次<br>${wrong === 0 ? "全部正确，太厉害了！" : "再练几次会更棒！"}`,
      });
    }, 900);
  }
  function animalName() {
    return { "🐰": "兔子", "🐿️": "松鼠", "🦔": "刺猬", "🐥": "小鸡", "🦊": "狐狸", "🐢": "乌龟" }[animal] || "动物";
  }

  Games.bridge = {
    start() {
      index = 0; wrong = 0; busy = false;
      animal = pick(ANIMALS);
      animalEl.textContent = animal;
      scene.classList.remove("saved");
      boy.style.left = "8px";
      planks.forEach(p => p.classList.remove("on"));
      display.innerHTML = '<span class="placeholder">点下面的数字</span>';
      Stats.begin("bridge");
      nextQ();
    },
    stop() { Stats.discard(); },
  };
})();
