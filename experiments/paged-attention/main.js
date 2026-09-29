(function () {
  "use strict";
  const model = window.PagedAttentionModel;
  const d3 = window.d3;
  const $ = id => document.getElementById(id);
  const tokens = model.tokenFixture;
  const state = { act3: 6, storage: "contiguous", angle: 0, blockSize: 4, prompt: 6 };
  const scenes = {};
  const range = count => Array.from({ length: count }, (_, index) => index);
  const pad = value => String(value).padStart(2, "0");
  const root = id => d3.select(`#${id}`);
  const label = (group, id, value, x, y, className = "svg-label") => group.selectAll(`text[data-id='${id}']`).data([{ id, value, x, y }], d => d.id).join("text").attr("data-id", d => d.id).attr("class", className).attr("x", d => d.x).attr("y", d => d.y).text(d => d.value);
  const setIcon = (id, name) => { const button = $(id); if (button) button.innerHTML = `<i data-lucide="${name}"></i>`; };
  range(6).forEach(index => { setIcon(`act${index + 1}-play`, "play"); setIcon(`act${index + 1}-next`, "step-forward"); setIcon(`act${index + 1}-reset`, "rotate-ccw"); });
  if (window.lucide) window.lucide.createIcons();

  const MOTION = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const flights = svg => svg.selectAll("g.flights").data([0]).join("g").attr("class", "flights").raise();
  function flyChip(svg, from, to, { delay = 0, duration = 520, word = "KV", cls = "" } = {}) {
    if (!MOTION) return;
    const chip = flights(svg).append("g").attr("class", `chip ${cls}`).attr("transform", `translate(${from[0]},${from[1]})`).style("opacity", 0);
    chip.append("rect").attr("class", "chip-rect").attr("x", -24).attr("y", -12).attr("width", 48).attr("height", 24).attr("rx", 3);
    chip.append("text").attr("class", "chip-text").attr("text-anchor", "middle").attr("y", 4).text(word);
    chip.transition().delay(delay).duration(90).style("opacity", 1)
      .transition().duration(duration).ease(d3.easeCubicInOut)
      .attrTween("transform", () => t => `translate(${from[0] + (to[0] - from[0]) * t},${from[1] + (to[1] - from[1]) * t - 30 * Math.sin(Math.PI * t)})`)
      .transition().duration(150).style("opacity", 0).remove();
  }
  const routeShape = d3.line().curve(d3.curveBumpY);
  function drawRoute(svg, id, points, cls = "route-line") {
    const path = svg.selectAll(`path[data-id='${id}']`).data([points.map(point => point.join()).join("|")], d => d)
      .join("path").attr("data-id", id).attr("class", cls).attr("d", routeShape(points));
    const node = path.node();
    if (MOTION && node) { const length = node.getTotalLength(); path.attr("stroke-dasharray", `${length} ${length}`).attr("stroke-dashoffset", length).transition().duration(560).ease(d3.easeCubicOut).attr("stroke-dashoffset", 0); }
    return node;
  }
  function runner(svg, node, { delay = 0, duration = 680 } = {}) {
    if (!MOTION || !node) return;
    const length = node.getTotalLength();
    flights(svg).append("circle").attr("class", "trace").attr("r", 5)
      .transition().delay(delay).duration(duration).ease(d3.easeCubicInOut)
      .attrTween("transform", () => t => { const point = node.getPointAtLength(length * t); return `translate(${point.x},${point.y})`; })
      .transition().duration(120).style("opacity", 0).remove();
  }

  function controller(name, max, render, interval) {
    const scene = { phase: 0, max, playing: false, touched: false, timer: null, render };
    scenes[name] = scene;
    const delay = () => (interval ? interval(scene.phase) : 1000);
    const refresh = () => { render(); setIcon(`${name}-play`, scene.playing ? "pause" : "play"); const next = $(`${name}-next`); if (next) next.disabled = scene.phase >= scene.max; if (window.lucide) window.lucide.createIcons(); };
    scene.next = () => { scene.phase = Math.min(scene.max, scene.phase + 1); if (scene.phase === scene.max) scene.playing = false; refresh(); };
    scene.toggle = () => { scene.playing = !scene.playing; clearTimeout(scene.timer); const tick = () => { if (!scene.playing) return; scene.next(); if (scene.playing) scene.timer = setTimeout(tick, delay()); }; if (scene.playing) { if (scene.phase === scene.max) scene.phase = -1; scene.timer = setTimeout(tick, 350); } refresh(); };
    $(`${name}-play`) && ($(`${name}-play`).onclick = () => { scene.touched = true; scene.toggle(); });
    $(`${name}-next`).onclick = () => { scene.touched = true; scene.next(); };
    $(`${name}-reset`).onclick = () => { scene.touched = true; clearTimeout(scene.timer); scene.phase = 0; scene.playing = false; refresh(); };
    return scene;
  }
  function block(group, datum, x, y, size, selected = -1, mode = "base", width = 160) {
    const item = group.attr("transform", `translate(${x},${y})`);
    item.selectAll("rect.block").data([datum], d => d.physical).join("rect").attr("class", d => `block ${mode === "hot" ? "block-hot" : mode === "shared" ? "block-shared" : d.owner ? "block-base" : "block-free"}`).attr("width", width).attr("height", 66);
    label(item, `block-${datum.physical}`, `P${pad(datum.physical)}${datum.owner ? ` · ${datum.owner}` : ""}`, 8, 18, "svg-small");
    item.selectAll("rect.slot").data((datum.slots || range(size).map(() => null)).map((value, offset) => ({ value, offset })), d => d.offset).join("rect").attr("class", d => `slot ${d.offset === selected ? "slot-selected" : d.value ? "slot-live" : "slot-empty"}`).attr("x", d => 8 + d.offset * ((width - 18) / size)).attr("y", 29).attr("width", (width - 25) / size).attr("height", 25);
  }
  let lastCount1 = -1;
  function renderAct1() {
    const count = [0, 4, 5, 6, 7, 8, 9, 10][scenes.act1.phase]; const svg = root("act1-svg");
    label(svg, "title", "Request A · prefill → decode", 28, 25, "svg-title"); label(svg, "weights", "모델 가중치", 28, 70, "svg-small"); svg.selectAll("rect.weight-mark").data([0]).join("rect").attr("class", "weight-mark block-base").attr("x", 28).attr("y", 82).attr("width", 92).attr("height", 34);
    svg.selectAll("g.token").data(tokens, d => d.id).join("g").attr("class", "token").attr("transform", (_, index) => `translate(${150 + index * 88},52)`).each(function (d, index) { const item = d3.select(this); item.selectAll("rect.token-cell").data([d], value => value.id).join("rect").attr("class", index < count ? "token-cell token-live" : "token-cell token-pending").attr("width", 76).attr("height", 52); label(item, `word-${d.id}`, d.word, 5, 22, "svg-word"); label(item, `id-${d.id}`, d.id, 8, 43, "svg-tiny"); });
    label(svg, "cache", "KV cache", 150, 150, "svg-title"); svg.selectAll("rect.cache-slot").data(tokens, d => d.id).join("rect").attr("class", (d, index) => `cache-slot slot ${index < count ? "slot-live" : "slot-empty"}`).attr("x", (_, index) => 150 + index * 88).attr("y", 166).attr("width", 76).attr("height", 42);
    if (count > lastCount1 && lastCount1 >= 0) range(count - lastCount1).forEach(step => { const index = lastCount1 + step; flyChip(svg, [188 + index * 88, 104], [188 + index * 88, 187], { delay: step * 110, word: "K·V" }); });
    lastCount1 = count;
    $("act1-readout").textContent = count ? `${count}개 토큰 캐시됨 · 다음 입력: ${count < 10 ? `${tokens[count].word}(t${count})` : "완료"}` : "prefill 대기 · KV cache 비어 있음";
  }
  let lastPhase2 = -1; let lampTimer2 = null;
  const FOLLOWUP = ["그럼", "고양이는", "밤에", "주로", "뭘", "해?"];
  function renderAct2() {
    const phase = scenes.act2.phase; const svg = root("act2-svg");
    const cellX = index => 22 + index * 88;
    const contigFree = [1, 2, 5, 6, 9, 10];
    const pagedFree = [1, 3, 4, 6, 8, 9, 11];
    const placed = phase >= 2 ? pagedFree.slice(0, 6) : [];
    label(svg, "req-title", "새 질문 “그럼 고양이는 밤에 주로 뭘 해?” · 6토큰 = 6칸", 22, 32, "svg-title");
    svg.selectAll("rect.req-cell").data(range(6), d => d).join("rect")
      .attr("class", d => `req-cell slot ${phase >= 2 ? "slot-empty" : "slot-live"}`)
      .attr("x", d => 560 + d * 86).attr("y", 12).attr("width", 78).attr("height", 38);
    svg.selectAll("text.req-word").data(range(6), d => d).join("text").attr("class", "req-word svg-word")
      .attr("x", d => 560 + d * 86 + 8).attr("y", 30).text(d => phase >= 2 ? "" : FOLLOWUP[d]);
    svg.selectAll("text.req-id").data(range(6), d => d).join("text").attr("class", "req-id svg-tiny")
      .attr("x", d => 560 + d * 86 + 8).attr("y", 44).text(d => `t${d}`);
    const strips = [
      { key: "contig", title: "연속 할당", y: 150, free: contigFree, filled: [] },
      { key: "paged", title: "paged attention", y: 300, free: pagedFree, filled: placed }
    ];
    strips.forEach(strip => {
      label(svg, `${strip.key}-title`, strip.title, 22, strip.y - 18, "svg-title");
      svg.selectAll(`rect.cell-${strip.key}`).data(range(12), d => d).join("rect")
        .attr("class", d => `cell-${strip.key} slot ${strip.filled.includes(d) ? "slot-live" : strip.free.includes(d) ? "slot-empty" : "cell-used"}`)
        .attr("x", d => cellX(d)).attr("y", strip.y).attr("width", 80).attr("height", 48);
      svg.selectAll(`text.pid-${strip.key}`).data(range(12), d => d).join("text")
        .attr("class", `pid-${strip.key} svg-tiny`).attr("x", d => cellX(d) + 8).attr("y", strip.y + 16)
        .text(d => `P${pad(d)}`);
      svg.selectAll(`text.tag-${strip.key}`).data(range(12), d => d).join("text")
        .attr("class", `tag-${strip.key} svg-tiny`).attr("x", d => cellX(d) + 8).attr("y", strip.y + 38)
        .text(d => strip.filled.includes(d) ? FOLLOWUP[strip.filled.indexOf(d)] : strip.free.includes(d) ? "" : "사용 중");
      const lampOn = strip.key === "contig" ? phase >= 1 : phase >= 2;
      const lampClass = strip.key === "contig" ? "lamp--red" : "lamp--green";
      svg.selectAll(`circle.lamp-${strip.key}`).data([0]).join("circle")
        .attr("class", `lamp lamp-${strip.key} ${lampOn ? lampClass : "lamp--off"}`)
        .attr("cx", 1046).attr("cy", strip.y - 24).attr("r", 9);
    });
    // phase 1: 6칸짜리 창이 연속 줄을 훑고 실패 → 빨간불
    const window2 = svg.selectAll("rect.scan-window").data(phase === 1 ? [0] : []).join("rect")
      .attr("class", "scan-window").attr("y", 144).attr("width", 6 * 88 - 8).attr("height", 60);
    if (phase === 1 && lastPhase2 !== 1 && MOTION) {
      window2.attr("x", cellX(0) - 2)
        .transition().duration(1400).ease(d3.easeCubicInOut).attr("x", cellX(6) - 2)
        .transition().duration(400).attr("x", cellX(3) - 2);
    } else if (phase === 1) window2.attr("x", cellX(3) - 2);
    label(svg, "contig-verdict", phase >= 1 ? "✗ 연속 6칸 없음 — 대기" : "", 22, 232, "svg-small svg-verdict");
    label(svg, "paged-verdict", phase >= 2 ? "○ 6칸 분할 수용 — 순서는 주소표가 기억" : "", 22, 382, "svg-small svg-ok");
    // phase 2: 요청 칸들이 쪼개져 내려가 안착 → 초록불 켜졌다 꺼짐
    if (phase === 2 && lastPhase2 === 1) {
      placed.forEach((cell, index) =>
        flyChip(svg, [560 + index * 86 + 39, 31], [cellX(cell) + 40, 324], { delay: index * 130, duration: 620, word: FOLLOWUP[index], cls: "hot" }));
      clearTimeout(lampTimer2);
      lampTimer2 = setTimeout(() => { if (scenes.act2.phase === 2) svg.selectAll("circle.lamp-paged").attr("class", "lamp lamp-paged lamp--off"); }, 2300);
    }
    lastPhase2 = phase;
    $("act2-readout").textContent = [
      "빈칸: 연속 2칸×3 vs 흩어진 7칸",
      "연속 할당 실패 · 최대 연속 2칸",
      "paged 수용 · 6칸 분할 배치"
    ][phase];
  }
  let lastPhase3 = -1;
  function renderAct3() {
    const phase = scenes.act3.phase; const svg = root("act3-svg");
    const selected = model.resolveToken(state.act3, model.blockTable, 4);
    const naive = selected.logicalBlock; // 물리 순서 가정: L번째 블록이 P0L에 있으리라는 추측
    const naiveHasOthers = model.blockTable.indexOf(naive) >= 0;
    const tokenX = index => 20 + index * 104;
    const blockPos = id => [20 + (id % 4) * 264, 250 + Math.floor(id / 4) * 82];
    label(svg, "title", `“${tokens[state.act3].word}”(t${state.act3})의 KV는 어디에?`, 20, 25, "svg-title");
    svg.selectAll("g.token").data(tokens, d => d.id).join("g").attr("class", "token").attr("transform", (_, index) => `translate(${tokenX(index)},42)`)
      .on("click", (_, d) => { state.act3 = Number(d.id.slice(1)); $("act3-token").value = state.act3; scenes.act3.touched = true; scenes.act3.phase = 0; $("act3-next").disabled = false; lastPhase3 = -1; renderAct3(); })
      .each(function (d, index) { const item = d3.select(this); item.selectAll("rect.token-cell").data([d], value => value.id).join("rect").attr("class", index === state.act3 ? "token-cell token-live" : "token-cell token-pending").attr("width", 90).attr("height", 48); label(item, `word-${d.id}`, d.word, 5, 21, "svg-word"); label(item, `id-${d.id}`, d.id, 8, 39, "svg-tiny"); });
    const brackets = [0, 1, 2].map(logical => ({ logical, from: tokenX(logical * 4) + 2, to: tokenX(Math.min(logical * 4 + 3, 9)) + 88 }));
    svg.selectAll("path.l-bracket").data(brackets, d => d.logical).join("path")
      .attr("class", d => `l-bracket ${phase >= 2 && d.logical === selected.logicalBlock ? "is-active" : ""}`)
      .attr("d", d => `M${d.from},96 L${d.from},104 L${d.to},104 L${d.to},96`);
    svg.selectAll("text.l-label").data(brackets, d => d.logical).join("text")
      .attr("class", d => `l-label svg-tiny ${phase >= 2 && d.logical === selected.logicalBlock ? "is-active" : ""}`)
      .attr("x", d => (d.from + d.to) / 2 - 8).attr("y", 118).text(d => `L${d.logical}`);
    label(svg, "table", "block table · B=4", 20, 152, "svg-title");
    svg.selectAll("g.table-entry").data(model.blockTable, (_, index) => index).join("g").attr("class", "table-entry").attr("transform", (_, index) => `translate(${330 + index * 220},160)`).each(function (physical, index) { const item = d3.select(this); item.selectAll("rect.table-cell").data([physical]).join("rect").attr("class", phase >= 2 && index === selected.logicalBlock ? "table-cell token-live" : "table-cell slot-empty").attr("width", 180).attr("height", 44); label(item, `logical-${index}`, `L${index} → P${pad(physical)}`, 16, 28, "svg-label"); });
    svg.selectAll("g.physical").data(range(12), id => id).join("g").attr("class", "physical").each(function (id) {
      const logical = model.blockTable.indexOf(id);
      block(d3.select(this), { physical: id, owner: logical >= 0 ? "A" : null, slots: logical >= 0 ? range(4).map(offset => logical * 4 + offset < 10 ? `t${logical * 4 + offset}` : null) : [] }, ...blockPos(id), 4, phase >= 3 && id === selected.physicalBlock ? selected.offset : -1, phase >= 3 && id === selected.physicalBlock ? "hot" : "base", 244);
    });
    const slotWords = model.blockTable.flatMap((physical, logical) => range(4).map(offset => ({ physical, offset, token: tokens[logical * 4 + offset] })).filter(item => item.token));
    svg.selectAll("text.slot-word").data(slotWords, d => `${d.physical}-${d.offset}`).join("text")
      .attr("class", d => `slot-word svg-tiny ${phase >= 3 && d.physical === selected.physicalBlock && d.offset === selected.offset ? "is-picked" : ""}`)
      .attr("x", d => blockPos(d.physical)[0] + 12 + d.offset * 56).attr("y", d => blockPos(d.physical)[1] + 47).text(d => d.token.word.slice(0, 4));
    svg.selectAll("text.naive-mark").data(phase >= 1 ? [naive] : []).join("text").attr("class", "naive-mark svg-verdict svg-title")
      .attr("x", d => blockPos(d)[0] + 218).attr("y", d => blockPos(d)[1] + 20).text("✗");
    label(svg, "verdict", phase === 0 ? "" : phase === 1 ? `✗ 물리 순서라면 P${pad(naive)} — 하지만 ${naiveHasOthers ? "다른 토큰의 자리" : "빈 블록"}` : phase === 2 ? `floor(${state.act3}/4) = L${selected.logicalBlock} → 주소표: P${pad(selected.physicalBlock)}` : `○ ${state.act3}%4 = ${selected.offset} → P${pad(selected.physicalBlock)}의 ${selected.offset + 1}번째 칸`, 20, 236, phase === 1 ? "svg-small svg-verdict" : phase >= 3 ? "svg-small svg-ok" : "svg-small");
    if (phase !== lastPhase3) {
      if (phase === 1) runner(svg, drawRoute(svg, "act3-route", [[tokenX(state.act3) + 45, 90], [blockPos(naive)[0] + 122, blockPos(naive)[1]]], "route-line route-wrong"), { duration: 620 });
      if (phase === 2) runner(svg, drawRoute(svg, "act3-route", [[tokenX(state.act3) + 45, 90], [330 + selected.logicalBlock * 220 + 90, 160]]), { duration: 560 });
      if (phase === 3) {
        runner(svg, drawRoute(svg, "act3-route", [[330 + selected.logicalBlock * 220 + 90, 204], [blockPos(selected.physicalBlock)[0] + 122, blockPos(selected.physicalBlock)[1]]]), { duration: 560 });
        if (MOTION) range(selected.offset + 1).forEach(step => flights(svg).append("circle").attr("class", "trace").attr("r", 5)
          .attr("cx", blockPos(selected.physicalBlock)[0] + 36 + step * 56).attr("cy", blockPos(selected.physicalBlock)[1] + 42)
          .style("opacity", 0).transition().delay(620 + step * 240).duration(120).style("opacity", 1)
          .transition().delay(140).duration(160).style("opacity", step === selected.offset ? 1 : 0).remove());
      }
      if (phase === 0) svg.selectAll("path[data-id='act3-route']").remove();
      lastPhase3 = phase;
    }
    $("act3-token-value").textContent = state.act3;
    $("act3-readout").textContent = phase >= 3 ? `${tokens[state.act3].word} → L${selected.logicalBlock} / offset ${selected.offset} → P${pad(selected.physicalBlock)}` : ["다음을 눌러 위치를 추적하세요", "1단계 · 물리 순서 가정 실패", "2단계 · 주소표 조회"][phase];
  }
  function renderAct4() { const radians = state.angle * Math.PI / 180; const query = [Math.cos(radians), Math.sin(radians)]; const result = model.computeAttention(tokens, query, state.storage); const base = model.computeAttention(tokens, query, "contiguous"); const paged = model.computeAttention(tokens, query, "paged"); const error = Math.max(...base.output.map((value, index) => Math.abs(value - paged.output[index]))); const svg = root("act4-svg"); label(svg, "title", "Q / K 평면 · 전역 softmax · weighted output", 24, 25, "svg-title"); svg.selectAll("rect.plane").data([0]).join("rect").attr("class", "plane slot-empty").attr("x", 24).attr("y", 42).attr("width", 190).attr("height", 178); svg.selectAll("circle.key-dot").data(tokens, d => d.id).join("circle").attr("class", "key-dot").attr("cx", d => 118 + d.key[0] * 42).attr("cy", d => 130 - d.key[1] * 42).attr("r", 5);
    svg.selectAll("line.q-line").data([query]).join("line").attr("class", "q-line").attr("x1", 118).attr("y1", 130).transition().duration(160).attr("x2", 118 + query[0] * 80).attr("y2", 130 - query[1] * 80);
    svg.selectAll("rect.bar").data(result.weights, (_, index) => index).join(enter => enter.append("rect").attr("class", "bar").attr("x", (_, index) => 270 + index * 40).attr("width", 24).attr("y", 190).attr("height", 0)).attr("class", (_, index) => `bar ${scenes.act4.phase > index / 3 ? "active" : ""}`).transition().duration(420).ease(d3.easeCubicOut).attr("y", d => 190 - d * 140).attr("height", d => d * 140);
    svg.selectAll("text.bar-word").data(tokens, d => d.id).join("text").attr("class", "bar-word svg-tiny").attr("x", (_, index) => 272 + index * 40).attr("y", 205).text(d => d.word.slice(0, 4));
    label(svg, "out-title", "weighted output", 760, 42, "svg-small"); svg.selectAll("rect.output-plane").data([0]).join("rect").attr("class", "output-plane slot-empty").attr("x", 760).attr("y", 52).attr("width", 168).attr("height", 168);
    svg.selectAll("circle.output-dot").data([result.output]).join(enter => enter.append("circle").attr("class", "output-dot").attr("r", 7).attr("cx", 844).attr("cy", 136)).transition().duration(420).ease(d3.easeCubicOut).attr("cx", d => 844 + d[0] * 55).attr("cy", d => 136 - d[1] * 55);
    label(svg, "foot", `Q [${query.map(value => value.toFixed(2)).join(", ")}] · Σ weight 1.000 · max error ${error.toExponential(1)}`, 270, 290, "svg-small"); $("act4-angle-value").textContent = state.angle; $("act4-readout").textContent = `Q [${query.map(value => value.toFixed(2)).join(", ")}] · output [${result.output.map(value => value.toFixed(2)).join(", ")}] · max error ${error.toExponential(1)}`; }
  let lastOwned5 = null;
  function renderAct5() { const frame = model.lifecycleSnapshots(state.blockSize)[scenes.act5.phase]; const svg = root("act5-svg"); label(svg, "title", `reservation baseline · 12 slots · B=${state.blockSize}`, 20, 24, "svg-title"); svg.selectAll("rect.reserve").data(range(12), d => d).join("rect").attr("class", "reserve slot slot-empty").attr("x", d => 20 + d * 72).attr("y", 42).attr("width", 58).attr("height", 26); svg.selectAll("g.physical").data(frame.blocks, d => d.physical).join("g").attr("class", "physical").each(function (d) { block(d3.select(this), d, 20 + (d.physical % 6) * 176, 140 + Math.floor(d.physical / 6) * 78, state.blockSize, -1, d.owner === "B" ? "hot" : "base"); });
    const owned = frame.blocks.filter(item => item.owner).map(item => `${item.physical}:${item.owner}`);
    if (lastOwned5) owned.filter(key => !lastOwned5.includes(key)).forEach((key, step) => { const [physical, owner] = key.split(":"); flyChip(svg, [20 + Number(physical) * 72 + 29, 55], [20 + (Number(physical) % 6) * 176 + 80, 140 + Math.floor(Number(physical) / 6) * 78 + 40], { delay: step * 120, word: owner, cls: owner === "B" ? "hot" : "" }); });
    lastOwned5 = owned;
    label(svg, "metrics", `유효 ${frame.metrics.validSlots} · 할당 ${frame.metrics.allocatedSlots} · tail ${frame.metrics.tailWaste}`, 20, 320, "svg-label"); $("act5-readout").textContent = `${frame.phase} · 유효 ${frame.metrics.validSlots} · 할당 ${frame.metrics.allocatedSlots} · tail ${frame.metrics.tailWaste}`; }
  let lastPhase6 = "";
  function renderAct6() { const fixture = model.forkPrompt(state.prompt); scenes.act6.max = fixture.snapshots.length - 1; const frame = fixture.snapshots[Math.min(scenes.act6.phase, scenes.act6.max)]; const svg = root("act6-svg"); const blockPoint = id => [20 + (id % 6) * 176 + 80, 235 + Math.floor(id / 6) * 78]; label(svg, "title", `${frame.phase} · ${state.prompt}-token prompt · COW ${fixture.copyCount}`, 20, 24, "svg-title"); ["A", "B"].forEach((owner, row) => { const table = frame.tables[owner] || []; label(svg, `owner-${owner}`, `${owner}안`, 20, 65 + row * 74, "svg-title"); svg.selectAll(`g.row-${owner}`).data(table, (_, index) => `${owner}-${index}`).join("g").attr("class", `row-${owner}`).attr("transform", (_, index) => `translate(${86 + index * 190},${42 + row * 74})`).each(function (physical) { const item = d3.select(this); item.selectAll("rect.address").data([physical]).join("rect").attr("class", frame.refs[physical] > 1 ? "address block-shared" : "address slot-empty").attr("width", 155).attr("height", 42); label(item, `map-${owner}-${physical}`, `→ P${pad(physical)} · refs ${frame.refs[physical] || 0}`, 10, 27, "svg-small"); }); }); svg.selectAll("g.physical").data(range(12), d => d).join("g").attr("class", "physical").each(function (id) { block(d3.select(this), { physical: id, owner: frame.refs[id] ? `refs ${frame.refs[id]}` : null, slots: frame.physical[id] || range(4).map(() => null) }, 20 + (id % 6) * 176, 235 + Math.floor(id / 6) * 78, 4, -1, frame.refs[id] > 1 ? "shared" : "base"); });
    ["A", "B"].forEach((owner, row) => { const table = frame.tables[owner] || []; const routes = svg.selectAll(`path.cow-route.route-${owner.toLowerCase()}`).data(table.map((physical, index) => ({ physical, index })), d => d.index); routes.exit().remove(); routes.enter().append("path").attr("class", `cow-route route-line route-${owner.toLowerCase()}`).merge(routes).transition().duration(480).ease(d3.easeCubicInOut).attr("d", d => routeShape([[86 + d.index * 190 + 77, 84 + row * 74], [86 + d.index * 190 + 77, 160], blockPoint(d.physical)])); });
    const step = `${state.prompt}:${frame.phase}`;
    if (step !== lastPhase6) {
      if (frame.phase === "copy") [0, 1].forEach(offset => flyChip(svg, [blockPoint(9)[0] - 55 + offset * 36, blockPoint(9)[1] + 42], [blockPoint(5)[0] - 55 + offset * 36, blockPoint(5)[1] + 42], { delay: offset * 160, duration: 640, word: tokens[4 + offset].word, cls: "hot" }));
      if (frame.phase === "remap" || frame.phase === "write") flyChip(svg, [86 + 77, 84], blockPoint(state.prompt === 6 ? 5 : 5), { duration: 560, word: state.prompt === 6 ? "A6" : "A8", cls: "hot" });
      lastPhase6 = step;
    }
    $("act6-readout").textContent = `${frame.phase} · 공유 P03/P09 · refs ${Object.keys(frame.refs).length ? Math.max(...Object.values(frame.refs)) : 0} · copy ${fixture.copyCount}`; }
  scenes.act1 = controller("act1", 7, renderAct1); scenes.act2 = controller("act2", 2, renderAct2, phase => phase === 1 ? 2600 : 1500); scenes.act3 = controller("act3", 3, renderAct3, () => 1700); scenes.act4 = controller("act4", 3, renderAct4); scenes.act5 = controller("act5", 4, renderAct5, () => 1300); scenes.act6 = controller("act6", 6, renderAct6, () => 1500);
  $("act3-token").oninput = event => { state.act3 = Number(event.target.value); scenes.act3.touched = true; scenes.act3.phase = 0; $("act3-next").disabled = false; lastPhase3 = -1; renderAct3(); }; $("act4-angle").oninput = event => { state.angle = Number(event.target.value); scenes.act4.touched = true; renderAct4(); }; ["contiguous", "paged"].forEach(mode => $(`act4-${mode}`).onclick = () => { state.storage = mode; ["contiguous", "paged"].forEach(item => $(`act4-${item}`).classList.toggle("is-active", item === mode)); renderAct4(); }); [2, 4, 8].forEach(size => $(`act5-b${size}`).onclick = () => { state.blockSize = size; scenes.act5.phase = 0; $("act5-next").disabled = false; [2, 4, 8].forEach(item => $(`act5-b${item}`).classList.toggle("is-active", item === size)); renderAct5(); }); [6, 8].forEach(prompt => $(`act6-p${prompt}`).onclick = () => { state.prompt = prompt; scenes.act6.phase = 0; $("act6-next").disabled = false; [6, 8].forEach(item => $(`act6-p${item}`).classList.toggle("is-active", item === prompt)); renderAct6(); });
  document.querySelectorAll(".reveal").forEach(element => { if ("IntersectionObserver" in window) new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add("is-in"); })).observe(element); else element.classList.add("is-in"); });
  Object.values(scenes).forEach(scene => scene.render());
  window.PagedAttentionDemo = { getState: () => ({ ...state, scenes: Object.fromEntries(Object.entries(scenes).map(([name, scene]) => [name, { phase: scene.phase, playing: scene.playing, touched: scene.touched }])) }), lifecycleSnapshots: model.lifecycleSnapshots, forkPrompt: model.forkPrompt };
}());
