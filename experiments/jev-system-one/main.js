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
const CHOICE_LABELS = {
  returns: "환불·교환",
  product_support: "제품 결함",
  delivery_support: "배송 문제"
};

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
    .attr("y", 4).text(d => CHOICE_LABELS[d]);
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
    .attr("text-anchor", "middle").text((d, i) => ["0 · 차분", "1 · 불편", "2 · 격앙"][i]);
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
      `<code>score: ${expected.toFixed(2)}</code> · 확률로 가중한 평균`);
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
  if (typeof window.__jevRenderStructure === "function") window.__jevRenderStructure(sc);
}

update();

// ====================================================================
// Act 4 — confidence is the shape of the distribution
// Drag bars to sculpt a distribution; the gauge reacts.
// ====================================================================

const confView = (() => {
  const OPTS = ["returns", "product_support", "delivery_support", "other"];
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

  rows.append("text").attr("class", "viz-label").attr("y", 5)
    .text(d => CHOICE_LABELS[d] || "기타");

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
    .attr("text-anchor", "middle").attr("y", 22).text("교육용 집중도");

  const zone = g.append("text")
    .attr("text-anchor", "middle").attr("y", 52)
    .attr("font-size", 13);

  function zoneOf(c) {
    if (c >= 0.75) return ["한 선택지에 집중", "#111"];
    if (c >= 0.4) return ["일부 선택지에 집중", AMBER];
    return ["여러 선택지에 분산", MAGENTA];
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
      ` → 집중도 <span class="ro-num">${fmt(c)}</span>` +
      ` · 가장 확률 높은 답 <span class="ro-win">${CHOICE_LABELS[OPTS[winner]] || "기타"}</span>` +
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
    d3.select("#duel-count").text(`${count}번째 예시 · 답장 문장과 P(환불 요청)의 비교`);

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
  const context = canvas.getContext("2d");
  const margin = { left: 64, right: 26, top: 28, bottom: 60 };
  const plotWidth = canvas.width - margin.left - margin.right;
  const plotHeight = canvas.height - margin.top - margin.bottom;
  const bucketCount = 10;
  const sampleCount = 200;
  let overconf = 0;
  let selectedBucket = 8;
  const plotX = probability => margin.left + probability * plotWidth;
  const plotY = accuracy => margin.top + (1 - accuracy) * plotHeight;
  const percent = value => `${(value * 100).toFixed(1)}%`;

  function makeSamples(random) {
    const normal = d3.randomNormal.source(random)(0.58, 0.24);
    return Array.from({ length: sampleCount }, () => ({
      stated: Math.min(0.999, Math.max(0.001, normal())),
      draw: random()
    }));
  }

  let samples = makeSamples(d3.randomLcg(42));

  function summarize() {
    const buckets = Array.from({ length: bucketCount }, () => ({ predictions: [], correct: 0, totalProbability: 0 }));
    samples.forEach(sample => {
      const accuracy = sample.stated - overconf * (sample.stated - 0.5) * 1.4 * sample.stated;
      const correct = sample.draw < Math.max(0, Math.min(1, accuracy));
      const bucket = buckets[Math.floor(sample.stated * bucketCount)];
      bucket.predictions.push(correct);
      bucket.correct += Number(correct);
      bucket.totalProbability += sample.stated;
    });
    return buckets.map(bucket => ({
      ...bucket,
      total: bucket.predictions.length,
      mean: bucket.predictions.length ? bucket.totalProbability / bucket.predictions.length : null,
      accuracy: bucket.predictions.length ? bucket.correct / bucket.predictions.length : null
    }));
  }

  function render() {
    const buckets = summarize();
    const selected = buckets[selectedBucket];
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.font = "12px -apple-system, sans-serif";
    for (let tick = 0; tick <= 5; tick++) {
      const fraction = tick / 5;
      context.strokeStyle = "#e8e8e8";
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(plotX(0), plotY(fraction));
      context.lineTo(plotX(1), plotY(fraction));
      context.stroke();
      context.fillStyle = "#555";
      context.textAlign = "right";
      context.fillText(`${tick * 20}%`, margin.left - 10, plotY(fraction) + 4);
      context.textAlign = "center";
      context.fillText(`${tick * 20}%`, plotX(fraction), plotY(0) + 22);
    }
    context.fillText("모델이 말한 확률 (구간 평균)", plotX(0.5), canvas.height - 12);
    context.save();
    context.translate(17, margin.top + plotHeight / 2);
    context.rotate(-Math.PI / 2);
    context.fillText("실제 정답률", 0, 0);
    context.restore();

    context.save();
    context.setLineDash([5, 5]);
    context.strokeStyle = "#999";
    context.beginPath();
    context.moveTo(plotX(0), plotY(0));
    context.lineTo(plotX(1), plotY(1));
    context.stroke();
    context.restore();

    context.strokeStyle = MAGENTA;
    context.lineWidth = 2.5;
    context.beginPath();
    let connected = false;
    buckets.forEach(bucket => {
      if (!bucket.total) { connected = false; return; }
      if (connected) context.lineTo(plotX(bucket.mean), plotY(bucket.accuracy));
      else context.moveTo(plotX(bucket.mean), plotY(bucket.accuracy));
      connected = true;
    });
    context.stroke();
    buckets.forEach((bucket, index) => {
      if (!bucket.total) return;
      context.beginPath();
      context.arc(plotX(bucket.mean), plotY(bucket.accuracy), index === selectedBucket ? 7 : 4, 0, Math.PI * 2);
      context.fillStyle = MAGENTA;
      context.fill();
      if (index === selectedBucket) {
        context.save();
        context.setLineDash([3, 4]);
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(plotX(bucket.mean), plotY(bucket.accuracy));
        context.lineTo(plotX(bucket.mean), plotY(0));
        context.stroke();
        context.restore();
        context.textAlign = bucket.mean > 0.75 ? "right" : "left";
        context.fillText(`선택 ${percent(bucket.accuracy)}`, plotX(bucket.mean) + (bucket.mean > 0.75 ? -12 : 12), Math.max(16, plotY(bucket.accuracy) - 12));
      }
    });

    d3.select("#calib-dots").selectAll("span")
      .data(selected.predictions.slice().sort((first, second) => Number(second) - Number(first)))
      .join("span")
      .attr("class", correct => `calib__dot${correct ? " calib__dot--correct" : ""}`);
    const fractionText = selected.total
      ? `전체 ${selected.total}건 중 정답 ${selected.correct}건 → ${selected.correct} ÷ ${selected.total} = `
      : "이 구간에는 예측이 없습니다. ";
    d3.select("#calib-fraction").text(fractionText).append("strong")
      .text(selected.total ? `${percent(selected.accuracy)} (분홍 점의 높이)` : "정답률을 계산하지 않습니다.");
    const comparison = selected.total
      ? `말한 확률 평균 ${percent(selected.mean)} · 실제 정답률 ${percent(selected.accuracy)}.${selected.total < 5 ? " 표본이 적어 한 건만 달라져도 비율이 크게 바뀝니다." : ""}`
      : "다른 확률 구간을 선택하거나 새 표본을 만들 수 있습니다.";
    d3.select("#calib-comparison").text(comparison);
    canvas.setAttribute("aria-label", `확률 보정 그래프. 선택 구간 ${selectedBucket * 10}~${(selectedBucket + 1) * 10}%. ${fractionText} ${selected.total ? percent(selected.accuracy) : ""}. ${comparison}`);
    d3.select("#calib-note").text(overconf === 0
      ? "보정된 조건에서 뽑은 표본입니다. 유한한 표본이라 점들이 기준선에서 벗어날 수 있습니다."
      : "과신 조건: 높은 확률 구간에서 실제로 맞히는 비율이 낮아집니다. 예측 개수와 말한 확률은 유지됩니다.");
  }

  d3.select("#calib-bucket").selectAll("option")
    .data(d3.range(bucketCount)).join("option")
    .attr("value", index => index)
    .text(index => `${index * 10}% 이상 ${(index + 1) * 10}% ${index === bucketCount - 1 ? "이하" : "미만"}`);
  d3.select("#calib-bucket").property("value", selectedBucket).on("change", function () {
    selectedBucket = Number(this.value);
    render();
  });
  d3.select("#calib-drop").on("click", () => {
    samples = makeSamples(d3.randomLcg(Math.floor(Math.random() * 1e9)));
    render();
  });
  d3.select("#overconf").on("input", function () {
    overconf = +this.value;
    d3.select("#overconf-val").text(fmt(overconf));
    render();
  });
  render();
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
    { key: "auto",   label: "자동 배정",        y: H * 0.22, color: "#111" },
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

})();

// ====================================================================
// State — accumulating source-linked context from timeline events
// ====================================================================

(() => {
  const EVENTS = [
    { who: "고객", sys: false, text: "주문한 상품이 어제 도착했는데요.", fields: { arrival: "어제 도착 (고객 진술)" } },
    { who: "고객", sys: false, text: "상자를 열어보니 액정에 금이 가 있었어요.", fields: { condition: "액정에 금이 있음 (고객 진술)" } },
    { who: "시스템", sys: true, text: "order#4821 — 배송 완료 이벤트 기록됨", fields: { order: "#4821", delivery: "배송 완료 (시스템 기록)" } },
    { who: "고객", sys: false, text: "교환보다는 그냥 돈으로 돌려받고 싶습니다.", fields: { request: "교환보다는 그냥 돈으로 돌려받고 싶습니다." } },
    { who: "상담원", sys: false, text: "불편을 드려 죄송합니다. 확인해 드릴게요.", fields: { reply: "불편을 드려 죄송합니다. 확인해 드릴게요." } },
  ];
  const fields = [
    { key: "order", group: "주문·배송", label: "주문번호", path: "order.id" },
    { key: "arrival", group: "주문·배송", label: "도착 시점", path: "order.arrived_at" },
    { key: "delivery", group: "주문·배송", label: "배송 기록", path: "order.delivery_status" },
    { key: "condition", group: "상품 상태", label: "고객이 보고한 상태", path: "product.reported_condition" },
    { key: "request", group: "대화", label: "고객의 요청 원문", path: "conversation.customer_request" },
    { key: "reply", group: "대화", label: "상담원 응답 원문", path: "conversation.agent_reply" }
  ];
  const tl = d3.select("#state-timeline");
  const readout = d3.select("#state-readout");
  const btn = d3.select("#state-next");
  let idx = 0;
  let contextState = {};
  const rows = new Map();
  const summary = d3.select("#state-summary");
  [...new Set(fields.map(field => field.group))].forEach(group => {
    const section = summary.append("section").attr("class", "state-summary__group");
    section.append("h3").text(group);
    const list = section.append("dl");
    fields.filter(field => field.group === group).forEach(field => {
      const row = list.append("div").attr("class", "state-fact").attr("data-field", field.key);
      row.append("dt").html(`${field.label} <code>${field.path}</code>`);
      row.append("dd").attr("class", "state-fact__value");
      row.append("dd").attr("class", "state-fact__source");
      rows.set(field.key, row);
    });
  });

  function stateAsObject() {
    const result = {};
    fields.forEach(field => {
      const fact = contextState[field.key];
      if (!fact) return;
      const [group, key] = field.path.split(".");
      result[group] ??= {};
      result[group][key] = fact.value;
    });
    return result;
  }

  function renderStateSummary() {
    fields.forEach(field => {
      const fact = contextState[field.key];
      const row = rows.get(field.key);
      row.classed("is-new", !!fact && fact.event === idx)
        .classed("is-empty", !fact)
        .attr("aria-hidden", fact ? null : "true");
      row.select(".state-fact__value").text(fact ? fact.value : "");
      row.select(".state-fact__source").text(fact ? `← 이벤트 ${fact.event} · ${fact.who}` : "");
    });
    d3.select("#state-json").text(JSON.stringify(stateAsObject(), null, 2));
  }

  function setStateView(view) {
    const showJson = view === "json";
    d3.select("#state-summary").attr("hidden", showJson ? true : null);
    d3.select("#state-json").attr("hidden", showJson ? null : true);
    d3.select("#state-view-pretty").classed("is-active", !showJson).attr("aria-pressed", String(!showJson));
    d3.select("#state-view-json").classed("is-active", showJson).attr("aria-pressed", String(showJson));
  }

  function step() {
    if (idx >= EVENTS.length) return;
    const ev = EVENTS[idx++];
    Object.entries(ev.fields).forEach(([key, value]) => {
      contextState[key] = { value, event: idx, who: ev.who };
    });
    tl.selectAll(".sevent").classed("is-current", false);
    tl.append("div").attr("class", "sevent" + (ev.sys ? " sevent--sys" : ""))
      .classed("is-current", true)
      .html(`<p class="sevent__who">${idx} · ${ev.who}</p><p class="sevent__text">${ev.text}</p>`)
      .node().offsetHeight; // reflow
    tl.selectAll(".sevent").classed("is-on", true);
    renderStateSummary();
    readout.text(`이벤트 ${idx}/${EVENTS.length} · 정보 ${Object.keys(contextState).length}개 누적 · 아직 모델 판단 전`);
    if (idx >= EVENTS.length) btn.attr("disabled", true).text("자료 누적 완료");
  }

  btn.on("click", step);
  d3.select("#state-view-pretty").on("click", () => setStateView("pretty"));
  d3.select("#state-view-json").on("click", () => setStateView("json"));
  d3.select("#state-reset").on("click", () => {
    idx = 0;
    contextState = {};
    tl.selectAll(".sevent").remove();
    btn.attr("disabled", null).text("이벤트 추가 →");
    step();
  });
  step(); // seed first event
})();

// ====================================================================
// Advanced: Structure — named questions and answers share one State
// ====================================================================

(() => {
  const STATE_BY_SCENARIO = {
    "event-1": { order: { arrived_at: "어제 도착 (고객 진술)" } },
    "event-2": {
      order: { arrived_at: "어제 도착 (고객 진술)" },
      product: { reported_condition: "액정에 금이 있음 (고객 진술)" }
    },
    "event-3": {
      order: { id: "#4821", arrived_at: "어제 도착 (고객 진술)", delivery_status: "배송 완료 (시스템 기록)" },
      product: { reported_condition: "액정에 금이 있음 (고객 진술)" }
    },
    "event-4": {
      order: { id: "#4821", arrived_at: "어제 도착 (고객 진술)", delivery_status: "배송 완료 (시스템 기록)" },
      product: { reported_condition: "액정에 금이 있음 (고객 진술)" },
      conversation: { customer_request: "교환보다는 그냥 돈으로 돌려받고 싶습니다." }
    },
    "event-5": {
      order: { id: "#4821", arrived_at: "어제 도착 (고객 진술)", delivery_status: "배송 완료 (시스템 기록)" },
      product: { reported_condition: "액정에 금이 있음 (고객 진술)" },
      conversation: {
        customer_request: "교환보다는 그냥 돈으로 돌려받고 싶습니다.",
        agent_reply: "불편을 드려 죄송합니다. 확인해 드릴게요."
      }
    }
  };
  const FIELDS = [
    { name: "team", question: "어느 팀이 먼저 처리해야 할까?", type: "Choice", path: 'answers["team"].choice' },
    { name: "dissatisfaction", question: "고객 메시지에 드러난 불만 강도는?", type: "Score", path: 'answers["dissatisfaction"].score' },
    { name: "wants_refund", question: "고객이 환불을 명시적으로 요청했는가?", type: "Noul", path: 'answers["wants_refund"].noul' }
  ];

  const wrap = d3.select("#struct-fields");
  FIELDS.forEach(f => {
    wrap.append("div").attr("class", "sfield").attr("data-name", f.name)
      .html(`<div class="sfield__input"><span class="sfield__question">${f.question}</span><span class="sfield__name">${f.name}</span><span class="sfield__type">${f.type}</span></div><span class="sfield__arrow">→</span><div class="sfield__output"><code>${f.path}</code><strong class="sfield__val"></strong></div>`);
  });

  const jsonEl = d3.select("#struct-json");
  function render(sc) {
    const topTeam = CHOICE_OPTIONS.reduce((a, b) => sc.choice[a] >= sc.choice[b] ? a : b);
    const dissatisfaction = sc.score.probs.reduce((sum, probability, level) => sum + level * probability, 0);
    const answers = {
      team: { type: "choice", choice: topTeam },
      dissatisfaction: { type: "score", score: Number(dissatisfaction.toFixed(2)) },
      wants_refund: { type: "noul", noul: sc.noul }
    };
    const values = { team: topTeam, dissatisfaction: dissatisfaction.toFixed(2), wants_refund: sc.noul.toFixed(2) };
    d3.select("#struct-checkpoint").text(`${sc.label} · Questions와 같은 State`);
    wrap.selectAll(".sfield").each(function () {
      const field = d3.select(this);
      field.classed("is-filled", true).select(".sfield__val").text(values[field.attr("data-name")]);
    });
    jsonEl.text(JSON.stringify(answers, null, 2));
    d3.select("#struct-req").text(requestFor(sc, STATE_BY_SCENARIO[sc.id]));
  }

  function requestFor(sc, state) {
    return `# ${sc.label}: 같은 State에 이름 붙인 세 질문
from typesafe_sdk import Choice, Score, Noul, TypeSafeClient

state = ${JSON.stringify(state, null, 2)}
questions = {
    "team": Choice(
        criteria={"returns": "환불·교환", "product_support": "제품 결함", "delivery_support": "배송 문제"},
        instructions="어느 팀이 먼저 처리해야 하는가?",
    ),
    "dissatisfaction": Score(
        criteria=["차분", "불편", "격앙"],
        instructions="고객 메시지에 드러난 불만 강도는?",
    ),
    "wants_refund": Noul(
        instructions="고객이 환불을 명시적으로 요청했는가?",
    ),
}

with TypeSafeClient() as client:
    response = client.system_one(state=state, questions=questions)
    answers = response.answers
    team = answers["team"].choice
    dissatisfaction = answers["dissatisfaction"].score
    refund_probability = answers["wants_refund"].noul`;
  }

  window.__jevRenderStructure = render;
  render(appState.scenario);
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
  criteria={"returns": "환불·교환", "product_support": "제품 결함", "delivery_support": "배송 문제"},
  instructions="어느 팀이 먼저 처리해야 하는가?",
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
`dissatisfaction_question = Score(
  criteria=["차분", "불편", "격앙"],
  instructions="고객 메시지에 드러난 불만 강도는?",
)
# result: expected value of the Score probability distribution
answers["dissatisfaction"].score  # demo result: ${ev.toFixed(2)}`);

    // Noul snippet
    d3.select("#code-noul").html(
`refund_question = Noul(
  instructions="고객이 환불을 명시적으로 요청했는가?",
)
# result: Noul is P(yes), with no separate confidence field
answers["wants_refund"].noul  # demo result: ${sc.noul.toFixed(2)}
# hard decisions are an application-level threshold
refund_requested = answers["wants_refund"].noul >= 0.7  # 결과: ${sc.noul >= 0.7 ? "True" : "False"}`);
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

  function renderRoutingCode() {
  const low = +document.getElementById("th-low").value;
  const high = +document.getElementById("th-high").value;
  d3.select("#routing-code").text(
`def route(ticket, answers):
    topic = answers["team"]

    if topic.confidence < ${low.toFixed(2)}:
        return route_to_human(ticket)
    if topic.confidence >= ${high.toFixed(2)}:
        return assign_team(ticket, team=topic.choice)
    return review_team_assignment(ticket, team=topic.choice)`);
  }
  renderRoutingCode();
  window.__jevRenderRoutingCode = renderRoutingCode;
})();
