/* ================= 家长报告 ================= */
(function () {
  const body = document.getElementById("reportBody");

  const dayKey = ts => {
    const d = new Date(ts);
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  };
  const fmtDur = s => s >= 60 ? `${Math.floor(s / 60)} 分 ${s % 60} 秒` : `${s} 秒`;
  const pct = (c, t) => t ? Math.round(c / t * 100) + "%" : "—";

  function render() {
    const all = Stats.all();
    if (!all.length) {
      body.innerHTML = `<div class="r-empty">还没有练习记录<br>小朋友玩一局后，这里就会有数据啦</div>`;
      return;
    }

    /* ---- 今日概览 ---- */
    const today = dayKey(Date.now());
    const todayRecs = all.filter(r => dayKey(r.ts) === today);
    const tGames = todayRecs.length;
    const tDur = todayRecs.reduce((a, r) => a + r.dur, 0);
    const tQ = todayRecs.reduce((a, r) => a + r.total, 0);
    const tC = todayRecs.reduce((a, r) => a + r.correct, 0);

    /* ---- 近 7 天 ---- */
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
      const next = d.getTime() + 86400000;
      const rs = all.filter(r => r.ts >= d.getTime() && r.ts < next);
      days.push({
        label: `${d.getMonth() + 1}/${d.getDate()}`,
        q: rs.reduce((a, r) => a + r.total, 0),
        acc: rs.reduce((a, r) => a + r.total, 0)
          ? Math.round(rs.reduce((a, r) => a + r.correct, 0) / rs.reduce((a, r) => a + r.total, 0) * 100) : null,
      });
    }
    const maxQ = Math.max(1, ...days.map(d => d.q));

    /* ---- 本周 vs 上周 ---- */
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const dow = (now.getDay() + 6) % 7;                    // 周一为 0
    const weekStart = now.getTime() - dow * 86400000;
    const lastWeekStart = weekStart - 7 * 86400000;
    const inRange = (a, b) => all.filter(r => r.ts >= a && r.ts < b);
    const sum = rs => ({
      q: rs.reduce((a, r) => a + r.total, 0),
      c: rs.reduce((a, r) => a + r.correct, 0),
      g: rs.length,
    });
    const tw = sum(inRange(weekStart, Infinity));
    const lw = sum(inRange(lastWeekStart, weekStart));

    /* ---- 按游戏 ---- */
    const byGame = {};
    all.forEach(r => {
      const g = byGame[r.game] = byGame[r.game] || { n: 0, q: 0, c: 0, ms: 0, msn: 0 };
      g.n++; g.q += r.total; g.c += r.correct;
      if (r.avgMs) { g.ms += r.avgMs; g.msn++; }
    });

    /* ---- 按题型（近 30 天明细） ---- */
    const monthAgo = Date.now() - 30 * 86400000;
    const byType = {};
    const wrongMap = {};
    let misreadCnt = 0, escapeCnt = 0;
    all.filter(r => r.ts >= monthAgo).forEach(r => {
      (r.logs || []).forEach(l => {
        if (l.kind === "escape") { escapeCnt++; return; }
        if (l.kind === "misread") misreadCnt++;
        const t = byType[l.type] = byType[l.type] || { q: 0, c: 0, ms: 0, msn: 0 };
        t.q++; if (l.ok) t.c++;
        if (l.ms) { t.ms += l.ms; t.msn++; }
        if (!l.ok && l.text) {
          const w = wrongMap[l.text] = wrongMap[l.text] || { n: 0, answer: l.answer, gave: [] };
          w.n++;
          if (l.gave !== undefined && w.gave.length < 2) w.gave.push(l.gave);
        }
      });
    });

    /* ---- 薄弱分析 ---- */
    const insights = [];
    const types = Object.entries(byType).filter(([, v]) => v.q >= 5);
    if (types.length) {
      types.sort((a, b) => a[1].c / a[1].q - b[1].c / b[1].q);
      const [wName, wV] = types[0];
      const wAcc = Math.round(wV.c / wV.q * 100);
      if (wAcc < 90) insights.push(`🎯 <b>${wName}</b>正确率最低（${wAcc}%），建议重点练习`);
      const slowest = types.filter(([, v]) => v.msn >= 3)
        .sort((a, b) => b[1].ms / b[1].msn - a[1].ms / a[1].msn)[0];
      if (slowest && slowest[1].ms / slowest[1].msn > 8000)
        insights.push(`🐢 <b>${slowest[0]}</b>平均用时 ${(slowest[1].ms / slowest[1].msn / 1000).toFixed(1)} 秒，偏慢，可以先用「慢」档练熟再提速`);
    }
    if (misreadCnt >= 5) insights.push(`👀 打地鼠<b>看错/点错 ${misreadCnt} 次</b>，提示孩子先看清目标数再下手`);
    if (escapeCnt >= 5) insights.push(`⏱️ 打地鼠<b>漏打正确地鼠 ${escapeCnt} 次</b>，属于速度问题，建议降到「慢」档`);
    if (!insights.length) insights.push(`🌟 各题型表现都不错，继续保持！`);

    /* ---- 错题榜 ---- */
    const wrongs = Object.entries(wrongMap).sort((a, b) => b[1].n - a[1].n).slice(0, 8);

    /* ---- 拼装 HTML ---- */
    body.innerHTML = `
      <div class="r-sec">
        <h3>📅 今日概览</h3>
        <div class="r-grid">
          <div><div class="r-num">${tGames}</div><div class="r-lbl">玩了几局</div></div>
          <div><div class="r-num">${fmtDur(tDur)}</div><div class="r-lbl">总时长</div></div>
          <div><div class="r-num">${tQ}</div><div class="r-lbl">答题数</div></div>
          <div><div class="r-num">${pct(tC, tQ)}</div><div class="r-lbl">正确率</div></div>
        </div>
      </div>

      <div class="r-sec">
        <h3>📈 近 7 天趋势（柱：题量 / 下：正确率）</h3>
        <div class="r-bars">
          ${days.map(d => `
            <div class="r-bar-col">
              <div class="r-bar-a">${d.acc === null ? "" : d.acc + "%"}</div>
              <div class="r-bar" style="height:${Math.round(d.q / maxQ * 72)}px"></div>
              <div class="r-bar-d">${d.label}</div>
            </div>`).join("")}
        </div>
      </div>

      <div class="r-sec">
        <h3>🗓️ 本周总结</h3>
        <div class="r-summary">
          本周玩了 <b>${tw.g}</b> 局、<b>${tw.q}</b> 题，正确率 <b>${pct(tw.c, tw.q)}</b>；
          上周玩了 <b>${lw.g}</b> 局、<b>${lw.q}</b> 题，正确率 <b>${pct(lw.c, lw.q)}</b>。
          ${lw.q ? (tw.q >= lw.q ? "练习量稳中有升 👍" : "本周练习量比上周少，加油补上 💪") : ""}
        </div>
      </div>

      <div class="r-sec">
        <h3>🧭 薄弱分析（近 30 天）</h3>
        <ul class="r-insight">${insights.map(i => `<li>${i}</li>`).join("")}</ul>
      </div>

      <div class="r-sec">
        <h3>🎮 按游戏统计</h3>
        <table class="r-table">
          <tr><th>游戏</th><th>局数</th><th>题数</th><th>正确率</th><th>均时</th></tr>
          ${Object.entries(byGame).map(([k, v]) => `
            <tr><td>${GAME_NAMES[k] || k}</td><td>${v.n}</td><td>${v.q}</td>
            <td>${pct(v.c, v.q)}</td><td>${v.msn ? (v.ms / v.msn / 1000).toFixed(1) + "s" : "—"}</td></tr>`).join("")}
        </table>
      </div>

      <div class="r-sec">
        <h3>❗ 错题榜（近 30 天，按错误次数）</h3>
        ${wrongs.length ? wrongs.map(([text, w]) => `
          <div class="r-wrong-item">
            <span>${text} = ${w.answer}${w.gave.length ? ` <small>孩子答：${w.gave.join("、")}</small>` : ""}</span>
            <span class="r-badge">错 ${w.n} 次</span>
          </div>`).join("") : `<div class="r-summary">暂无错题，太棒了！</div>`}
      </div>

      <button class="r-clear" id="btnClearStats">清空全部记录</button>
    `;

    document.getElementById("btnClearStats").addEventListener("click", () => {
      if (confirm("确定清空全部练习记录吗？此操作不可恢复。")) {
        Stats.clear();
        render();
      }
    });
  }

  Games.report = { start: render, stop() {} };
})();
