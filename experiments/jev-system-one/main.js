// jev-system-one — Act 2: one state, three primitives answering in parallel.
// state → model → view → interaction (see docs/ARCHITECTURE.md)

/* global d3, SCENARIOS, CHOICE_OPTIONS, SCORE_LEVELS */

// ---- state ----------------------------------------------------------

const appState = { scenario: SCENARIOS[0] };

// ---- shared ---------------------------------------------------------

const DUR = 550;
const EASE = d3.easeCubicOut;
const AMBER = getComputedStyle(document.documentElement)
  .getPropertyValue("--warm-amber").trim() || "#f59300";
const MAGENTA = getComputedStyle(document.documentElement)
  .getPropertyValue("--warm-magenta").trim() || "#f0157a";

const fmt = d3.format(".2f");

// ---- view: choice (horizontal probability bars) --------------------

const choiceView = (() => {
  const W = 260, H = 170, LABEL = 76, ROW = 50;
  const svg = d3.select("#viz-choice").append("svg")
    .attr("width", W).attr("height", H);

  const x = d3.scaleLinear().domain([0, 1]).range([0, W - LABEL - 46]);
  const rows = svg.selectAll("g")
    .data(CHOICE_OPTIONS)
    .join("g")
    .attr("transform", (d, i) => `translate(0, ${18 + i * ROW})`);

  rows.append("text").attr("class", "viz-label")
    .attr("y", 4).text(d => d);
  rows.append("rect")
    .attr("class", "track")
    .attr("x", LABEL).attr("y", -8).attr("height", 16)
    .attr("width", x(1)).attr("fill", "#f1f1f1");
  rows.append("rect")
    .attr("class", "bar")
    .attr("x", LABEL).attr("y", -8).attr("height", 16)
    .attr("width", 0);
  rows.append("text").attr("class", "viz-value")
    .attr("x", W - 40).attr("y", 4).text("");

  return function render(sc) {
    const winner = CHOICE_OPTIONS.reduce((a, b) =>
      sc.choice[a] >= sc.choice[b] ? a : b);
    const g = svg.selectAll("g").data(CHOICE_OPTIONS);
    g.select(".bar").transition().duration(DUR).ease(EASE)
      .attr("width", d => x(sc.choice[d]))
      .attr("fill", d => (d === winner ? AMBER : "#111"));
    g.select(".viz-value").transition().duration(DUR)
      .tween("text", function (d) {
        const self = d3.select(this);
        const from = parseFloat(self.text()) || 0;
        const it = d3.interpolateNumber(from, sc.choice[d]);
        return t => self.text(fmt(it(t)));
      });
    d3.select("#ans-choice").html(
      `<code>choice: "${winner}"</code> · 선택 확률 <code>${sc.choice[winner].toFixed(2)}</code>`);
  };
})();

// ---- view: score (marker on ordered levels + level bars) ------------

const scoreView = (() => {
  const W = 260, H = 170, AXIS_Y = 118, PAD = 18;
  const svg = d3.select("#viz-score").append("svg")
    .attr("width", W).attr("height", H);

  const x = d3.scaleLinear().domain([0, SCORE_LEVELS.length - 1])
    .range([PAD, W - PAD]);

  // level probability bars (rising from axis)
  const BARW = 34;
  const bars = svg.selectAll(".lvl")
    .data(SCORE_LEVELS)
    .join("g").attr("class", "lvl");
  bars.append("rect")
    .attr("class", "bar")
    .attr("x", (d, i) => x(i) - BARW / 2)
    .attr("width", BARW)
    .attr("y", AXIS_Y).attr("height", 0)
    .attr("fill", "#111");
  bars.append("text").attr("class", "viz-tick")
    .attr("x", (d, i) => x(i)).attr("y", AXIS_Y + 18)
    .attr("text-anchor", "middle").text(d => d);
  bars.append("text").attr("class", "score-prob")
    .attr("x", (d, i) => x(i)).attr("y", AXIS_Y - 8)
    .attr("text-anchor", "middle").text("");

  // axis line
  svg.append("line")
    .attr("x1", PAD).attr("x2", W - PAD)
    .attr("y1", AXIS_Y).attr("y2", AXIS_Y)
    .attr("stroke", "#111").attr("stroke-width", 1);

  // score marker (triangle below axis)
  const marker = svg.append("path")
    .attr("d", "M0,-7 L6,4 L-6,4 Z")
    .attr("fill", MAGENTA)
    .attr("transform", `translate(${x(0)}, ${AXIS_Y + 8})`);

  const yBar = d3.scaleLinear().domain([0, 1]).range([0, 86]);

  return function render(sc) {
    svg.selectAll(".lvl .bar").data(sc.score.probs)
      .transition().duration(DUR).ease(EASE)
      .attr("y", p => AXIS_Y - yBar(p))
      .attr("height", p => yBar(p));
    const expected = sc.score.probs.reduce((sum, p, i) => sum + i * p, 0);
    svg.selectAll(".lvl .score-prob").data(sc.score.probs)
      .attr("y", p => AXIS_Y - yBar(p) - 8)
      .text(p => p.toFixed(2));
    marker.transition().duration(DUR).ease(EASE)
      .attr("transform", `translate(${x(expected)}, ${AXIS_Y + 8})`);
    d3.select("#ans-score").html(
      `<code>score: ${expected.toFixed(2)}</code> · probs의 기대값 (레벨 사이 값)`);
  };
})();

// ---- view: noul (0→1 gauge) ----------------------------------------

const noulView = (() => {
  const W = 260, H = 170, Y = 86, PAD = 18;
  const svg = d3.select("#viz-noul").append("svg")
    .attr("width", W).attr("height", H);

  const x = d3.scaleLinear().domain([0, 1]).range([PAD, W - PAD]);

  svg.append("line")
    .attr("x1", x(0)).attr("x2", x(1)).attr("y1", Y).attr("y2", Y)
    .attr("stroke", "#e6e6e6").attr("stroke-width", 6)
    .attr("stroke-linecap", "round");

  const fill = svg.append("line")
    .attr("x1", x(0)).attr("x2", x(0)).attr("y1", Y).attr("y2", Y)
    .attr("stroke", "#111").attr("stroke-width", 6)
    .attr("stroke-linecap", "round");

  const dot = svg.append("circle")
    .attr("cy", Y).attr("cx", x(0)).attr("r", 9)
    .attr("fill", MAGENTA);

  const value = svg.append("text").attr("class", "viz-label")
    .attr("x", x(0)).attr("y", Y - 24)
    .attr("text-anchor", "middle")
    .attr("font-variant-numeric", "tabular-nums");

  [["0", 0, "no"], ["1", 1, "yes"]].forEach(([t, v, sub]) => {
    svg.append("text").attr("class", "viz-tick")
      .attr("x", x(v)).attr("y", Y + 26).attr("text-anchor", "middle")
      .text(`${t} · ${sub}`);
  });

  return function render(sc) {
    fill.transition().duration(DUR).ease(EASE).attr("x2", x(sc.noul));
    dot.transition().duration(DUR).ease(EASE).attr("cx", x(sc.noul));
    value.transition().duration(DUR).ease(EASE)
      .attr("x", x(sc.noul))
      .tween("text", function () {
        const self = d3.select(this);
        const from = parseFloat(self.text()) || 0;
        const it = d3.interpolateNumber(from, sc.noul);
        return t => self.text(fmt(it(t)));
      });
    d3.select("#ans-noul").html(
      `<code>P(yes): ${fmt(sc.noul)}</code> · 별도 confidence 없음`);
  };
})();

// ---- view: state text & chips ---------------------------------------

function renderState(sc) {
  d3.select("#state-text")
    .style("opacity", 0)
    .text(`“${sc.state}”`)
    .transition().duration(400)
    .style("opacity", 1);
  d3.selectAll("#chips .chip").classed("is-active", d => d.id === sc.id);
}

// ---- interaction -----------------------------------------------------

d3.select("#chips").selectAll("button")
  .data(SCENARIOS)
  .join("button")
  .attr("class", "chip")
  .attr("type", "button")
  .text(d => d.label)
  .on("click", (event, d) => {
    if (appState.scenario.id === d.id) return;
    appState.scenario = d;
    update();
  });

// ---- update ----------------------------------------------------------

function update() {
  const sc = appState.scenario;
  renderState(sc);
  choiceView(sc);
  scoreView(sc);
  noulView(sc);
  if (typeof window.__jevRenderExtras === "function") window.__jevRenderExtras(sc);
}

update();

// ====================================================================
// Act 4 — confidence is the shape of the distribution
// Drag bars to sculpt a distribution; the gauge reacts.
// ====================================================================

const confView = (() => {
  const OPTS = ["billing", "technical", "account", "spam"];
  const conf = { probs: [0.55, 0.25, 0.12, 0.08] };

  const W = 560, H = 300, LABEL = 86, PAD_T = 24, ROW = (H - PAD_T * 2) / OPTS.length;
  const BARH = 26;

  const svg = d3.select("#conf-bars").append("svg")
    .attr("width", W).attr("height", H);

  const x = d3.scaleLinear().domain([0, 1]).range([0, W - LABEL - 60]);

  // ---- normalized confidence (normalized entropy complement) ----
  function confidence(p) {
    const n = p.length;
    let ent = 0;
    p.forEach(v => { if (v > 1e-9) ent -= v * Math.log(v); });
    return 1 - ent / Math.log(n);
  }

  // redistribute so probs sum to 1, keeping dragged index fixed
  function rebalance(idx, val) {
    const p = conf.probs.slice();
    val = Math.max(0.01, Math.min(0.97, val));
    const others = p.reduce((s, v, i) => (i === idx ? s : s + v), 0);
    const rest = 1 - val;
    OPTS.forEach((_, i) => {
      if (i === idx) { p[i] = val; }
      else { p[i] = others > 1e-9 ? p[i] / others * rest : rest / (OPTS.length - 1); }
    });
    conf.probs = p;
  }

  const rows = svg.selectAll("g").data(OPTS).join("g")
    .attr("transform", (d, i) => `translate(0, ${PAD_T + i * ROW + ROW / 2})`);

  rows.append("text").attr("class", "viz-label").attr("y", 5).text(d => d);

  rows.append("rect")
    .attr("x", LABEL).attr("y", -BARH / 2).attr("height", BARH)
    .attr("width", x(1)).attr("fill", "#f1f1f1");

  const bars = rows.append("rect").attr("class", "cbar")
    .attr("x", LABEL).attr("y", -BARH / 2).attr("height", BARH)
    .attr("fill", "#111").attr("cursor", "ew-resize");

  const handles = rows.append("circle").attr("class", "chandle")
    .attr("cy", 0).attr("r", 8)
    .attr("fill", "#fff").attr("stroke", "#111").attr("stroke-width", 2)
    .attr("cursor", "ew-resize");

  const values = rows.append("text").attr("class", "viz-value")
    .attr("x", W - 52).attr("y", 5);

  // ---- gauge (arc) ----
  const GW = 280, GH = 300, R = 104;
  const gsvg = d3.select("#conf-gauge").append("svg")
    .attr("width", GW).attr("height", GH);
  const g = gsvg.append("g").attr("transform", `translate(${GW / 2}, ${GH / 2 + 30})`);

  const arc = d3.arc().innerRadius(R - 14).outerRadius(R)
    .startAngle(-Math.PI / 2);

  g.append("path")
    .attr("d", arc({ endAngle: Math.PI / 2 }))
    .attr("fill", "#f1f1f1");

  const fg = g.append("path").attr("fill", AMBER);

  const num = g.append("text")
    .attr("text-anchor", "middle").attr("y", -8)
    .attr("font-family", "SF Mono, Menlo, monospace")
    .attr("font-size", 40).attr("fill", "#111");

  const cap = g.append("text").attr("class", "viz-tick")
    .attr("text-anchor", "middle").attr("y", 22).text("confidence");

  const zone = g.append("text")
    .attr("text-anchor", "middle").attr("y", 52)
    .attr("font-size", 13);

  function zoneOf(c) {
    if (c >= 0.75) return ["자동 처리", "#111"];
    if (c >= 0.4) return ["재확인 후 진행", AMBER];
    return ["사람에게 에스컬레이션", MAGENTA];
  }

  function render(animate) {
    const p = conf.probs;
    const winner = p.indexOf(Math.max(...p));
    const c = confidence(p);

    const sel = animate
      ? s => s.transition().duration(DUR).ease(EASE)
      : s => s;

    sel(bars.data(p))
      .attr("width", v => x(v))
      .attr("fill", (v, i) => (i === winner ? AMBER : "#111"));
    sel(handles.data(p)).attr("cx", v => LABEL + x(v));
    values.data(p).text(v => fmt(v));

    if (animate) {
      fg.interrupt().transition().duration(DUR).ease(EASE)
        .attrTween("d", function () {
          const from = this.__ang ?? -Math.PI / 2;
          const to = -Math.PI / 2 + Math.PI * c;
          const it = d3.interpolateNumber(from, to);
          this.__ang = to;
          return t => arc({ endAngle: it(t) });
        });
    } else {
      const to = -Math.PI / 2 + Math.PI * c;
      fg.interrupt();
      fg.node().__ang = to;
      fg.attr("d", arc({ endAngle: to }));
    }

    num.text(fmt(c));
    const [label, color] = zoneOf(c);
    zone.text(label).attr("fill", color);

    d3.select("#conf-readout").html(
      `교육용 정규화 엔트로피 지표 <span class="ro-dist">[${p.map(fmt).join(", ")}]</span>` +
      ` → confidence <span class="ro-num">${fmt(c)}</span>` +
      ` · 가장 확률 높은 답 <span class="ro-win">${OPTS[winner]}</span>` +
      ` <small>(공식 SDK 수식 아님)</small>`);
  }

  // ---- drag interaction ----
  const drag = d3.drag()
    .on("drag", function (event, d) {
      const i = OPTS.indexOf(d3.select(this.parentNode).datum());
      rebalance(i, x.invert(event.x - LABEL));
      render(false);
    });

  bars.call(drag);
  handles.call(drag);

  // ---- presets ----
  const PRESETS = [
    { label: "확신", probs: [0.94, 0.03, 0.02, 0.01] },
    { label: "2파전", probs: [0.46, 0.44, 0.06, 0.04] },
    { label: "완전 균등", probs: [0.25, 0.25, 0.25, 0.25] }
  ];

  d3.select("#conf-presets").selectAll("button")
    .data(PRESETS).join("button")
    .attr("class", "tab").attr("type", "button")
    .text(d => d.label)
    .on("click", function (e, d) {
      conf.probs = d.probs.slice();
      d3.selectAll("#conf-presets .tab").classed("is-active", p => p === d);
      render(true);
    });

  render(true);
})();

// ====================================================================
// Act 1 — same input, different contract
// ====================================================================

(() => {
  const REPLIES = [
    "Hi! I'm so sorry to hear about your cancelled flight. You are absolutely eligible for a refund — I've flagged your booking and you should see the amount back on your card within 5–7 business days.",
    "Hello, thanks for reaching out. Since your flight was cancelled by the airline, a full refund applies. I can start that process now; it usually takes about a week to appear on your statement.",
    "So sorry about the cancellation! Good news: cancelled flights qualify for a full refund. I've gone ahead and submitted the request — keep an eye on your email for confirmation.",
    "Hi there. I understand how frustrating a cancelled flight is. You're entitled to a refund under our policy, and I've initiated it for you. Expect the funds within several business days.",
    "Thanks for contacting us. Because the airline cancelled your flight, you qualify for a complete refund. I've put the request through — you'll get a confirmation email shortly."
  ];

  let count = 0;
  const jevBox = d3.select("#duel-jev");

  // typed answer bar
  const W = 380, H = 120;
  const svg = jevBox.append("svg").attr("width", W).attr("height", H);
  const x = d3.scaleLinear().domain([0, 1]).range([0, W - 120]);

  svg.append("text").attr("class", "viz-label").attr("x", 0).attr("y", 34)
    .text("refund_requested");
  svg.append("rect").attr("x", 0).attr("y", 46).attr("height", 18)
    .attr("width", x(1)).attr("fill", "#f1f1f1");
  const bar = svg.append("rect").attr("x", 0).attr("y", 46).attr("height", 18)
    .attr("width", 0).attr("fill", AMBER);
  const val = svg.append("text").attr("class", "viz-value")
    .attr("x", x(1) + 12).attr("y", 60).text("");

  let typer = null;

  function send() {
    count += 1;
    d3.select("#duel-count").text(`${count}번 보냄 — 왼쪽은 매번 다르고, 오른쪽은 거의 같다`);

    // LLM side: typewriter, different reply each time
    const reply = REPLIES[(count - 1) % REPLIES.length];
    const el = d3.select("#llm-text");
    el.text("");
    if (typer) clearInterval(typer);
    let i = 0;
    typer = setInterval(() => {
      i += 3;
      el.text(reply.slice(0, i));
      if (i >= reply.length) clearInterval(typer);
    }, 18);

    // Jev side: tiny jitter around 0.95
    const p = Math.max(0.9, Math.min(0.98, 0.95 + (Math.random() - 0.5) * 0.02));
    bar.transition().duration(DUR).ease(EASE).attr("width", x(p));
    val.transition().duration(DUR)
      .tween("text", function () {
        const self = d3.select(this);
        const from = parseFloat(self.text()) || 0;
        const it = d3.interpolateNumber(from, p);
        return t => self.text(fmt(it(t)));
      });
  }

  d3.select("#resend").on("click", send);
  send();
})();

// ====================================================================
// Act 3 — calibration: balls fall into buckets, curve emerges
// ====================================================================

(() => {
  const canvas = document.getElementById("calib-canvas");
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  const M = { l: 52, r: 20, t: 18, b: 46 };
  const PW = W - M.l - M.r, PH = H - M.t - M.b;
  const NB = 10;                       // buckets
  const N = 200;                       // predictions
  const R = 4;                         // ball radius

  let overconf = 0;
  let balls = [];                      // {stated, correct, x, y, vy, targetY, settled}
  let dropping = false;

  // stated prob -> actual accuracy under overconfidence
  // shrink accuracy toward 0.5 as overconf grows for high-stated balls
  function actualAcc(stated, oc) {
    return stated - oc * (stated - 0.5) * 1.4 * stated;
  }

  function makeBalls(rng) {
    const arr = [];
    for (let i = 0; i < N; i++) {
      // stated probabilities skew high-ish like a real classifier
      const stated = Math.min(0.999, Math.max(0.001, d3.randomNormal.source(rng)(0.58, 0.24)()));
      arr.push({ stated, u: rng() });
    }
    return arr;
  }

  let BASE = makeBalls(d3.randomLcg(42));

  function bucketOf(s) { return Math.min(NB - 1, Math.floor(s * NB)); }
  function bx(b) { return M.l + (b + 0.5) / NB * PW; }

  function assign() {
    // compute correctness under current overconf, then stack positions
    const perBucket = Array.from({ length: NB }, () => []);
    balls = BASE.map(b => {
      const acc = Math.max(0, Math.min(1, actualAcc(b.stated, overconf)));
      const correct = b.u < acc;
      return { ...b, correct };
    });
    balls.forEach(b => {
      const k = bucketOf(b.stated);
      const stack = perBucket[k].length;
      perBucket[k].push(b);
      const col = stack % 5, row = Math.floor(stack / 5);
      b.tx = bx(k) - 2.2 * R * 2 + col * (R * 2 + 1);
      b.ty = M.t + PH - R - row * (R * 2 + 1);
    });
  }

  function curvePoints() {
    const sums = Array.from({ length: NB }, () => ({ n: 0, c: 0 }));
    balls.forEach(b => {
      const k = bucketOf(b.stated);
      sums[k].n++; if (b.correct) sums[k].c++;
    });
    return sums.map((s, k) => s.n >= 4
      ? { x: bx(k), y: M.t + PH - (s.c / s.n) * PH }
      : null).filter(Boolean);
  }

  function drawStatic(withCurve) {
    ctx.clearRect(0, 0, W, H);

    // axes
    ctx.strokeStyle = "#111"; ctx.lineWidth = 1;
    ctx.strokeRect(M.l, M.t, PW, PH);

    // diagonal (perfect calibration)
    ctx.save();
    ctx.setLineDash([5, 5]); ctx.strokeStyle = "#bbb";
    ctx.beginPath();
    ctx.moveTo(M.l, M.t + PH); ctx.lineTo(M.l + PW, M.t);
    ctx.stroke();
    ctx.restore();

    // labels
    ctx.fillStyle = "#6b6b6b"; ctx.font = "11px -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("모델이 말한 확률 →", M.l + PW / 2, H - 14);
    ctx.save();
    ctx.translate(16, M.t + PH / 2); ctx.rotate(-Math.PI / 2);
    ctx.fillText("실제 정답률 →", 0, 0);
    ctx.restore();
    ctx.textAlign = "left";

    // balls
    balls.forEach(b => {
      if (b.y === undefined) return;
      ctx.beginPath();
      ctx.arc(b.x, b.y, R, 0, Math.PI * 2);
      if (b.correct) { ctx.fillStyle = "#111"; ctx.fill(); }
      else { ctx.strokeStyle = "#999"; ctx.lineWidth = 1.2; ctx.stroke(); }
    });

    // calibration curve
    if (withCurve) {
      const pts = curvePoints();
      if (pts.length > 1) {
        ctx.strokeStyle = MAGENTA; ctx.lineWidth = 2.5;
        ctx.beginPath();
        pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
        ctx.stroke();
        pts.forEach(p => {
          ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
          ctx.fillStyle = MAGENTA; ctx.fill();
        });
      }
    }
  }

  function note() {
    const gap = overconf;
    let msg;
    if (gap < 0.15) msg = "잘 보정된 예시 — 곡선이 대각선에 가깝습니다.";
    else if (gap < 0.5) msg = "약한 과신 — 높은 확률 구간부터 대각선 아래로 처지기 시작합니다.";
    else msg = "큰 과신 — 높은 확률을 말한 집단의 실제 정답률이 낮아집니다.";
    d3.select("#calib-note").text(msg);
  }

  function drop() {
    if (dropping) return;
    dropping = true;
    BASE = makeBalls(d3.randomLcg(Math.floor(Math.random() * 1e9)));
    assign();
    balls.forEach((b, i) => {
      b.x = b.tx;
      b.y = -10 - (i % 40) * 10 - Math.floor(i / 40) * 120;
      b.vy = 0;
    });
    const g = 0.5;
    function tick() {
      let moving = 0;
      balls.forEach(b => {
        if (b.y >= b.ty) { b.y = b.ty; return; }
        b.vy += g; b.y = Math.min(b.ty, b.y + b.vy);
        if (b.y < b.ty) moving++;
      });
      drawStatic(moving === 0);
      if (moving > 0) requestAnimationFrame(tick);
      else dropping = false;
    }
    tick();
  }

  d3.select("#calib-drop").on("click", drop);

  d3.select("#overconf").on("input", function () {
    overconf = +this.value;
    d3.select("#overconf-val").text(fmt(overconf));
    if (!dropping && balls.length) {
      assign();
      balls.forEach(b => { b.x = b.tx; b.y = b.ty; });
      drawStatic(true);
    }
    note();
  });

  // initial frame: empty axes
  drawStatic(false);
  note();
})();

// ====================================================================
// Act 5 — tickets flow through confidence gates
// ====================================================================

(() => {
  const canvas = document.getElementById("pipe-canvas");
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;

  const GATE_X = W * 0.42;
  const LANES = [
    { key: "auto",   label: "자동 처리",        y: H * 0.22, color: "#111" },
    { key: "verify", label: "재확인 후 진행",    y: H * 0.5,  color: AMBER },
    { key: "human",  label: "사람 검토",        y: H * 0.78, color: MAGENTA }
  ];

  let thLow = 0.5, thHigh = 0.9;
  const counts = { auto: 0, verify: 0, human: 0 };
  let tickets = [];
  const rng = d3.randomLcg(7);

  function laneOf(c) {
    if (c >= thHigh) return 0;
    if (c >= thLow) return 1;
    return 2;
  }

  function spawn() {
    // confidence distribution: mostly confident, tail of unsure
    const c = Math.max(0.02, Math.min(0.99,
      1 - Math.abs(d3.randomNormal.source(rng)(0, 0.28)())));
    tickets.push({
      c, x: -8, y: H / 2 + (rng() - 0.5) * 30,
      lane: null, done: false
    });
  }

  function counters() {
    const total = counts.auto + counts.verify + counts.human || 1;
    d3.select("#pipe-counters").html(
      LANES.map(l =>
        `<div class="pipe__counter">
           <span class="k">${l.label}</span>
           <span class="v" style="color:${l.color}">${counts[l.key]}</span>
           <span class="k">${Math.round(counts[l.key] / total * 100)}%</span>
         </div>`).join(""));
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // inflow line
    ctx.strokeStyle = "#e6e6e6"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(GATE_X, H / 2); ctx.stroke();

    // gate
    ctx.strokeStyle = "#111"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(GATE_X, 30); ctx.lineTo(GATE_X, H - 30); ctx.stroke();
    ctx.fillStyle = "#6b6b6b"; ctx.font = "11px -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`confidence gate  [${fmt(thLow)} / ${fmt(thHigh)}]`, GATE_X, 18);

    // lanes
    ctx.textAlign = "left";
    LANES.forEach(l => {
      ctx.strokeStyle = "#eee";
      ctx.beginPath(); ctx.moveTo(GATE_X, l.y); ctx.lineTo(W - 90, l.y); ctx.stroke();
      ctx.fillStyle = l.color;
      ctx.font = "12px -apple-system, sans-serif";
      ctx.fillText(l.label, W - 84, l.y + 4);
    });

    // tickets
    tickets.forEach(t => {
      ctx.beginPath();
      ctx.arc(t.x, t.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = t.lane === null ? "#111" : LANES[t.lane].color;
      ctx.fill();
    });
  }

  function step() {
    if (rng() < 0.06 && tickets.length < 90) spawn();

    tickets.forEach(t => {
      if (t.done) return;
      t.x += 2.2;
      if (t.lane === null && t.x >= GATE_X) t.lane = laneOf(t.c);
      if (t.lane !== null) {
        const ty = LANES[t.lane].y;
        t.y += (ty - t.y) * 0.12;
        if (t.x >= W - 96) {
          t.done = true;
          counts[LANES[t.lane].key]++;
          counters();
        }
      }
    });
    tickets = tickets.filter(t => !t.done);
    draw();
    requestAnimationFrame(step);
  }

  function bind(id, valId, set) {
    d3.select(id).on("input", function () {
      set(+this.value);
      if (thLow > thHigh) {
        if (id === "#th-low") thLow = thHigh;
        else thHigh = thLow;
        d3.select("#th-low").property("value", thLow);
        d3.select("#th-high").property("value", thHigh);
        d3.select("#th-low-val").text(fmt(thLow));
        d3.select("#th-high-val").text(fmt(thHigh));
      } else {
        d3.select(valId).text(fmt(+this.value));
      }
      if (window.__jevRenderRoutingCode) window.__jevRenderRoutingCode();
    });
  }
  bind("#th-low", "#th-low-val", v => { thLow = v; });
  bind("#th-high", "#th-high-val", v => { thHigh = v; });

  d3.select("#risk-toggle").on("click", () => {
    thLow = 0.6; thHigh = 0.97;
    d3.select("#th-low").property("value", thLow);
    d3.select("#th-high").property("value", thHigh);
    d3.select("#th-low-val").text(fmt(thLow));
    d3.select("#th-high-val").text(fmt(thHigh));
    if (window.__jevRenderRoutingCode) window.__jevRenderRoutingCode();
  });

  counters();
  step();
})();

// ====================================================================
// Scroll storytelling: reveal sections + auto-pour calibration balls
// ====================================================================

(() => {
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const owner = entry.target.closest(".reveal") || entry.target;
      owner.classList.add("is-in");
      revealObserver.unobserve(entry.target);
    });
  }, { threshold: 0.15 });

  document.querySelectorAll(".reveal").forEach(owner => {
    owner.classList.add("reveal-target");
    const trigger = owner.querySelector(":scope > .act__head");
    const target = trigger || owner;
    target.classList.add("reveal-trigger");
    revealObserver.observe(target);
  });

  const calibCanvas = document.getElementById("calib-canvas");
  const calibObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting || calibCanvas.__poured) return;
      calibCanvas.__poured = true;
      setTimeout(() => d3.select("#calib-drop").node().click(), 250);
      calibObserver.unobserve(calibCanvas);
    });
  }, { threshold: 0.15 });
  calibObserver.observe(calibCanvas);
})();

// ====================================================================
// State — accumulating context timeline; same Noul re-asked each step
// ====================================================================

(() => {
  const EVENTS = [
    { who: "고객", sys: false, text: "주문한 상품이 어제 도착했는데요.", p: 0.08 },
    { who: "고객", sys: false, text: "상자를 열어보니 액정에 금이 가 있었어요.", p: 0.22 },
    { who: "시스템", sys: true,  text: "order#4821 — 배송 완료 이벤트 기록됨", p: 0.24 },
    { who: "고객", sys: false, text: "교환보다는 그냥 돈으로 돌려받고 싶습니다.", p: 0.87 },
    { who: "상담원", sys: false, text: "불편을 드려 죄송합니다. 확인해 드릴게요.", p: 0.90 },
  ];

  const tl = d3.select("#state-timeline");
  const readout = d3.select("#state-readout");
  const btn = d3.select("#state-next");
  let idx = 0;

  // small horizontal probability bar as gauge
  const W = 300, H = 70;
  const svg = d3.select("#state-gauge").append("svg").attr("width", W).attr("height", H);
  svg.append("text").attr("x", 0).attr("y", 16).attr("font-size", 12).attr("fill", "#8a8378")
     .text("Noul: 환불을 요청하고 있는가?");
  svg.append("rect").attr("x", 0).attr("y", 30).attr("width", W).attr("height", 16).attr("fill", "#eee7db");
  const fill = svg.append("rect").attr("x", 0).attr("y", 30).attr("width", 0).attr("height", 16).attr("fill", "#f0157a");

  function step() {
    if (idx >= EVENTS.length) return;
    const ev = EVENTS[idx++];
    tl.append("div").attr("class", "sevent" + (ev.sys ? " sevent--sys" : ""))
      .html(`<p class="sevent__who">${ev.who}</p><p class="sevent__text">${ev.text}</p>`)
      .node().offsetHeight; // reflow
    tl.selectAll(".sevent").classed("is-on", true);
    fill.transition().duration(650).ease(d3.easeCubicOut).attr("width", W * ev.p);
    readout.html(`이벤트 ${idx}개 누적 → P(환불 요청) = <span class="ro-num">${ev.p.toFixed(2)}</span>`);
    if (idx >= EVENTS.length) btn.attr("disabled", true).text("state 완성 — 분포가 이야기를 따라왔다");
  }

  btn.on("click", step);
  step(); // seed first event
})();

// ====================================================================
// Advanced: Structure — assemble a typed Ticket object from questions
// ====================================================================

(() => {
  const FIELDS = [
    { name: "team",           type: "Choice", val: '"billing"',  conf: 0.90 },
    { name: "anger",          type: "Score",  val: "1.70",       conf: 0.74 },
    { name: "wants_refund",   type: "Noul",   val: "0.87",       conf: null },
    { name: "auto_resolvable",type: "Noul",   val: "0.19",       conf: null },
  ];

  const wrap = d3.select("#struct-fields");
  FIELDS.forEach(f => {
    wrap.append("div").attr("class", "sfield").attr("data-name", f.name)
      .html(`<span class="sfield__val"></span><p class="sfield__name">${f.name}</p><span class="sfield__type">${f.type}</span>`);
  });

  const jsonEl = d3.select("#struct-json");
  jsonEl.node().insertAdjacentHTML(
    "beforebegin",
    '<p class="struct__json-label">Illustrative response.answers excerpt — probabilities omitted; Noul has no confidence.</p>'
  );
  jsonEl.text("{}");

  let timers = [];
  function run() {
    timers.forEach(clearTimeout);
    timers = [];
    wrap.selectAll(".sfield").classed("is-filled", false).select(".sfield__val").text("");
    jsonEl.text("{}");
    FIELDS.forEach((f, i) => {
      const timer = setTimeout(() => {
        const el = wrap.select(`[data-name="${f.name}"]`);
        el.classed("is-filled", true);
        el.select(".sfield__val").text(f.conf === null ? `${f.val} · noul` : `${f.val} · conf ${f.conf}`);
        const done = FIELDS.slice(0, i + 1);
        const answers = Object.fromEntries(done.map(d => {
          if (d.type === "Choice") {
            return [d.name, { type: d.type.toLowerCase(), choice: JSON.parse(d.val), confidence: d.conf }];
          }
          if (d.type === "Score") {
            return [d.name, { type: d.type.toLowerCase(), score: Number(d.val), confidence: d.conf }];
          }
          return [d.name, { type: d.type.toLowerCase(), noul: Number(d.val) }];
        }));
        jsonEl.attr("data-label", "illustrative response.answers; Noul has no confidence")
          .attr("title", "Illustrative response.answers object — Noul has no confidence")
          .text(JSON.stringify(answers, null, 2));
      }, 600 * (i + 1));
      timers.push(timer);
    });
  }

  d3.select("#struct-run").on("click", run);

  // auto-run on first viewport entry; observe the compact assembly, not the whole section.
  const io2 = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { run(); io2.unobserve(e.target); }
  }), { threshold: 0.35 });
  io2.observe(document.querySelector("#act-structure .struct"));
})();

// ====================================================================
// Plan B — code snippets per primitive + Score expected-value bars
// ====================================================================

(() => {
  const esc = s => String(s).replace(/</g, "&lt;");
  const K = t => `<span class="c-key">${t}</span>`;
  const S = t => `<span class="c-str">${esc(t)}</span>`;
  const C = t => `<span class="c-cm">${esc(t)}</span>`;
  const O = t => `<span class="c-out">${esc(t)}</span>`;

  function renderExtras(sc) {
    const topTeam = CHOICE_OPTIONS.reduce((a, b) => sc.choice[a] >= sc.choice[b] ? a : b);
    const topP = sc.choice[topTeam];

    // Choice snippet
    d3.select("#code-choice").html(
`team_question = Choice(
    criteria={"billing": "결제 관련", "technical": "기술 문제", "account": "계정 관련"},
    instructions="어느 팀이 처리해야 하는가?",
)
# result: Choice answer and confidence are separate SDK fields
answers["team"].choice  # demo result: "${topTeam}"; 선택 확률 ${topP.toFixed(2)}
# confidence는 SDK의 별도 결과 필드입니다.`);

    // Score snippet + shared expectation calculation
    const probs = sc.score.probs;
    const ev = probs.reduce((s, p, i) => s + i * p, 0);
    d3.select("#score-calc").html("score = Σ level × p = " +
      probs.map((p, i) => `${i}×${p.toFixed(2)}`).join(" + ") +
      ` = <b>${ev.toFixed(2)}</b>`);

    d3.select("#code-score").html(
`anger_question = Score(
    criteria=["차분", "짜증", "분노"],
    instructions="고객은 얼마나 화가 났나?",
)
# result: expected value of the Score probability distribution
answers["anger"].score  # demo result: ${ev.toFixed(2)}`);

    // Noul snippet
    d3.select("#code-noul").html(
`refund_question = Noul(
    instructions="환불을 요청하고 있는가?",
)
# result: Noul is P(yes), with no separate confidence field
answers["refund_requested"].noul  # demo result: ${sc.noul.toFixed(2)}
# hard decisions are an application-level threshold
wants_refund = answers["refund_requested"].noul >= 0.7  # 결과: ${sc.noul >= 0.7 ? "True" : "False"}`);
  }

  // update() calls this once for every scenario, keeping all primitive outputs in one path.
  window.__jevRenderExtras = renderExtras;
  renderExtras(appState.scenario);
})();

// ====================================================================
// Plan B — Structure request snippet + epilogue routing code
// ====================================================================

(() => {
  const K = t => `<span class="c-key">${t}</span>`;
  const S = t => `<span class="c-str">${t}</span>`;
  const C = t => `<span class="c-cm">${t}</span>`;
  const O = t => `<span class="c-out">${t}</span>`;

  d3.select("#struct-req").text(
`# response.answers를 앱 객체로 조합하는 예시
from typesafe_sdk import Choice, Score, Noul, TypeSafeClient

state = {"message": "결제 문제를 확인해 주세요"}
ticket = state
questions = {
    "team": Choice(
        criteria={"billing": "결제 관련", "technical": "기술 문제", "account": "계정 관련"},
        instructions="어느 팀이 처리해야 하는가?",
    ),
    "anger": Score(
        criteria=["차분", "짜증", "분노"],
        instructions="고객은 얼마나 화가 났나?",
    ),
    "wants_refund": Noul(
        instructions="환불을 요청하고 있는가?",
    ),
    "auto_resolvable": Noul(
        instructions="자동으로 해결 가능한가?",
    ),
}

with TypeSafeClient() as client:
    response = client.system_one(state=ticket, questions=questions)
    answers = response.answers
# 앱이 answers를 type / choice / score / noul 구조로 조립한다`);

  function renderRoutingCode() {
  const low = +document.getElementById("th-low").value;
  const high = +document.getElementById("th-high").value;
  d3.select("#routing-code").text(
`def route(ticket, answers):
    topic = answers["team"]

    if topic.confidence < ${low.toFixed(2)}:  # 하한: 사람 검토
        return route_to_human(ticket)  # app-defined handler

    if topic.confidence >= ${high.toFixed(2)}:  # 상한: 자동 처리
        return auto_resolve(ticket, team=topic.choice)  # app-defined handler

    # 그 사이는 재확인 후 진행
    return route_with_review(
        ticket,
        team=topic.choice,
        wants_refund=answers["wants_refund"].noul >= 0.7,
        priority="high" if answers["anger"].score >= 1.5 else "normal",
    )  # app-defined handler`);
  }
  renderRoutingCode();
  window.__jevRenderRoutingCode = renderRoutingCode;
})();
