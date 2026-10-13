const skills = {
	1: '보고 기간에 완료된 업무를 모은다.\n성과 · 진행 중 · 다음 주 계획으로 정리한다.\n각 항목에 원문 출처를 연결한다.',
	2: '보고 기간에 완료된 업무를 모은다.\n성과 · 진행 중 · 다음 주 계획으로 정리한다.\n보고 기준 시점의 업무 상태를 확인한다.\n완료 후 다시 시작한 업무는 진행 중으로 분류한다.\n각 항목에 원문 출처를 연결한다.',
};
const stages = [
	['assembled', 'context 조립', '첫 호출에는 skill catalog만 있다', 'system prompt, tool definitions, 사용자 요청과 스킬의 이름·설명을 전달합니다. 본문은 아직 읽지 않았습니다.', 'model'],
	['selected', '스킬 선택', '설명을 보고 절차를 선택한다', 'weekly-report를 선택했습니다. 선택만으로 파일의 내용이 context에 추가되지는 않습니다.', 'model'],
	['requested', 'tool call', '모델이 요청하고, harness가 읽는다', 'read_skill은 파일 읽기 tool call입니다. 읽기 허용 여부와 실제 실행은 harness가 담당합니다.', 'runtime'],
	['loaded', 'tool result', '본문은 tool result로 돌아온다', 'harness가 반환한 본문을 history에 추가했습니다. 진행 중이던 model call의 context가 소급해서 바뀌지는 않습니다.', 'store'],
	['prepared', '다음 context', '다음 호출에 절차가 들어간다', '이전 tool call과 tool result를 history에 포함합니다. 스킬 본문은 별도의 system prompt가 아닙니다.', 'model'],
	['finished', '후속 tool call', '새 context에서 다음 행동이 나온다', '절차에 맞춰 업무 조회를 요청합니다. 이 프로토타입은 조회 요청까지이며 실제 업무 조회나 보고서 생성은 하지 않습니다.', 'runtime'],
];

function createState(version = 1) {
	return { storedVersion: version, cursor: 0, playing: false, events: [{ stage: 0, loadedVersion: null, inputVersion: null, call: 1 }] };
}

function advance(state) {
	if (state.cursor < state.events.length - 1) {
		state.cursor += 1;
		return;
	}
	const previous = state.events[state.cursor];
	if (previous.stage === 5) return;
	const event = { ...previous, stage: previous.stage + 1 };
	if (event.stage === 3) event.loadedVersion = state.storedVersion;
	if (event.stage === 4) {
		event.inputVersion = event.loadedVersion;
		event.call += 1;
	}
	state.events.push(event);
	state.cursor += 1;
}

function reloadSkill(state) {
	const previous = state.events[state.events.length - 1];
	if (previous.stage !== 5 || state.cursor !== state.events.length - 1) return;
	state.events.push({ ...previous, stage: 2 });
	state.cursor += 1;
}

function model(state) {
	const event = state.events[state.cursor];
	const [kind, label, title, description, active] = stages[event.stage];
	const blocks = [
		{ id: 'system', label: 'SYSTEM PROMPT', text: '근거 없는 실적을 생성하지 않는다.\n보고서 작성은 발송 권한을 의미하지 않는다.' },
		{ id: 'tools', label: 'TOOLS', text: 'read_skill(name)\nsearch_work(period, include_status_history)' },
		{ id: 'catalog', label: 'SKILL CATALOG', text: 'weekly-report\n주간 업무 데이터를 근거가 있는 보고서로 정리한다.' },
		{ id: 'scope', label: 'RUN CONTEXT', text: '보고 기간: 2026-09-28 ~ 2026-10-04\n시간대: Asia/Seoul · 사전 확정된 실행 설정' },
		{ id: 'user', label: 'USER', text: '주간보고 작성해줘' },
	];
	if (event.inputVersion) {
		blocks.push({ id: 'read', label: 'HISTORY', text: `read_skill("weekly-report")\ntool call ↔ tool result: read-${event.call - 1}` });
		blocks.push({ id: 'skill', label: `TOOL RESULT\nv${event.inputVersion}`, text: skills[event.inputVersion] });
	}
	let payload;
	if (event.stage === 0) payload = { event: 'context_assembled', call: event.call, skill_catalog: ['weekly-report'], skill_body: null };
	if (event.stage === 1) payload = { event: 'skill_selected', name: 'weekly-report', body_loaded: false };
	if (event.stage === 2) payload = { type: 'tool_call', call_id: `read-${event.call}`, name: 'read_skill', arguments: { name: 'weekly-report' } };
	if (event.stage === 3) payload = { type: 'tool_result', call_id: `read-${event.call}`, version: `v${event.loadedVersion}`, content: skills[event.loadedVersion] };
	if (event.stage === 4) payload = { event: 'context_assembled', call: event.call, history_added: ['tool_call', 'tool_result'], loaded_skill: `weekly-report@v${event.inputVersion}` };
	if (event.stage === 5) payload = { type: 'tool_call', name: 'search_work', arguments: { period: '2026-09-28/2026-10-04', include_status_history: event.inputVersion === 2 } };
	const latest = state.events[state.events.length - 1];
	return { ...event, kind, label, title, description, active, blocks, payload, latest, canReload: latest.stage === 5 && state.cursor === state.events.length - 1, atEnd: event.stage === 5 && state.cursor === state.events.length - 1 };
}

const loopData = {
	limit: 10,
	calls: [
		{ id: 'read-1', tool: 'read_skill', request: 'read_skill("weekly-report")', added: 'system prompt · tool definitions · 보고 기간 · skill catalog · user message', process: '스킬 파일 읽기', result: { title: 'weekly-report v2 본문', lines: ['업무 수집 · 분류 · 출처 연결', '+ 재개 업무 → 진행 중'] } },
		{ id: 'search-1', tool: 'search_work', request: 'search_work(기간, status_history=true)', process: '업무 데이터 조회', result: { title: '업무 조회 결과 2건', lines: ['WORK-17 · 10/2 완료 → 10/3 재개', 'WORK-21 · 10/1 완료'], gaps: ['재개 사유 없음', '다음 조치 없음'] } },
		{ id: 'detail-1', tool: 'get_work_detail', request: 'get_work_detail("WORK-17")', process: '상세 데이터 조회', result: { title: 'WORK-17 상세', lines: ['사유: 결제 수단 오류 재발', '조치: 재현 테스트 보강'] } },
		{ id: 'final', final: true, process: '사용자에게 전달 · 종료', title: '주간보고 9/28 ~ 10/4', summary: '성과 1 · 진행 중 1 · 계획 1 · 출처 3' },
	],
	report: [
		{ heading: '성과', text: '배포 점검표 정리를 완료했습니다.', source: 'WORK-21', record: 'search-1' },
		{ heading: '진행 중', text: '결제 오류 수정 작업을 다시 시작했습니다. 특정 결제 수단에서 같은 오류가 재발했습니다.', source: 'WORK-17 / comment-8', record: 'detail-1' },
		{ heading: '다음 주 계획', text: '재현 테스트를 보강하고 수정안을 검증합니다.', source: 'WORK-17 / plan-3', record: 'detail-1' },
	],
};

const clamp = value => Math.min(1, Math.max(0, value));
const span = (progress, from, to) => clamp((progress - from) / (to - from));

function callInput(call) {
	return { base: 5, records: loopData.calls.slice(0, call - 1).map(item => item.id) };
}

function runTool(state, call, progress) {
	const move = span(progress, 0.3, 0.6);
	const done = progress >= 0.82;
	Object.assign(state, {
		phase: progress < 0.3 ? 'check' : 'execute', label: true, exit: progress >= 0.12 ? 'tool' : null,
		output: move > 0 ? 0 : call, outputT: 1, docked: move >= 1 ? call : 0,
		checks: (progress >= 0.66) + (progress >= 0.74), result: done ? call : 0, resultT: span(progress, 0.82, 0.96),
		counter: call - 1 + done, mover: { kind: 'tool', call, from: 'output', to: 'dock', t: move },
	});
}

function nextCall(state, call, progress) {
	const arrive = span(progress, 0.45, 0.68);
	const building = progress >= 0.25;
	Object.assign(state, {
		phase: progress < 0.25 ? 'record' : progress < 0.8 ? 'prepare' : 'call',
		call: building ? call : call - 1, cardOut: building ? 0 : span(progress, 0.08, 0.25),
		card: building ? (progress < 0.8 ? 'preparing' : 'running') : 'output',
		base: building ? span(progress, 0.25, 0.38) * 5 : 5,
		records: building ? (progress >= 0.4 ? call - 2 : 0) + (arrive >= 1) : call - 2,
		fresh: arrive >= 1, completed: call - 2 + building, counter: call - 1,
		docked: arrive > 0 ? 0 : call - 1, checks: arrive > 0 ? 0 : 2, result: arrive > 0 ? 0 : call - 1, resultT: 1,
		recorded: progress >= 0.05 && arrive <= 0, gaps: call === 4 && arrive >= 1 ? 'filled' : 'missing',
		mover: { kind: 'result', call: call - 1, from: 'result', to: 'records', t: arrive },
	});
}

function loopState(scene, progress) {
	const state = { scene, phase: 'idle', status: 'idle', call: 0, card: 'empty', cardOut: 0, base: 0, records: 0, fresh: false, gaps: 'missing', output: 0, outputT: 0, label: false, exit: null, docked: 0, checks: 0, result: 0, resultT: 0, recorded: false, counter: 0, completed: 0, mover: null, response: false };
	const running = { status: 'running' };
	if (scene === 'A') {
		const move = span(progress, 0.25, 0.75);
		Object.assign(state, { status: move >= 1 ? 'received' : 'idle', mover: { kind: 'request', call: 0, from: 'request', to: 'status', t: move } });
	} else if (scene === 'B') {
		Object.assign(state, running, { phase: 'prepare', call: 1, card: 'preparing', base: span(progress, 0.05, 0.85) * 5 });
	} else if (scene === 'C') {
		Object.assign(state, running, { phase: progress < 0.4 ? 'call' : 'check', call: 1, card: progress < 0.3 ? 'running' : 'output', base: 5, output: 1, outputT: span(progress, 0.1, 0.3), label: progress >= 0.4, exit: progress >= 0.65 ? 'tool' : null });
	} else if (scene === 'D') {
		Object.assign(state, running, { call: 2, card: 'output', base: 5, records: 1, completed: 1 });
		runTool(state, 2, progress);
	} else if (scene === 'E') {
		Object.assign(state, running);
		nextCall(state, 3, progress);
	} else if (scene === 'F') {
		Object.assign(state, running, { call: 3, base: 5, records: 2, completed: 2, counter: 2, gaps: progress >= 0.08 ? 'highlight' : 'missing' });
		if (progress < 0.45) Object.assign(state, { phase: 'call', card: progress < 0.42 ? 'running' : 'output', output: 3, outputT: span(progress, 0.25, 0.42) });
		else {
			state.card = 'output';
			runTool(state, 3, span(progress, 0.45, 1));
		}
	} else if (scene === 'G') {
		Object.assign(state, running);
		nextCall(state, 4, progress);
	} else if (scene === 'H') {
		const move = span(progress, 0.55, 0.85);
		const end = progress >= 0.85;
		Object.assign(state, {
			status: end ? 'done · responded' : 'running', phase: progress < 0.35 ? 'call' : end ? 'done' : 'check',
			call: 4, card: progress < 0.3 ? 'running' : end ? 'done' : 'output', base: 5, records: 3, gaps: 'filled', counter: 3, completed: end ? 4 : 3,
			output: move > 0 ? 0 : 4, outputT: span(progress, 0.08, 0.3), label: progress >= 0.35, exit: progress >= 0.42 ? 'final' : null,
			mover: { kind: 'report', call: 4, from: 'output', to: 'response', t: move }, response: move >= 1,
		});
	}
	return state;
}

if (typeof module !== 'undefined') module.exports = { createState, advance, reloadSkill, model, loopData, loopState, callInput };

if (typeof document !== 'undefined') {
	const script = [];
	const simulation = createState();
	const snapshot = () => ({ storedVersion: simulation.storedVersion, cursor: simulation.cursor, events: structuredClone(simulation.events) });
	script.push(snapshot());
	for (let index = 0; index < 3; index += 1) advance(simulation);
	script.push(snapshot());
	advance(simulation);
	script.push(snapshot());
	advance(simulation);
	simulation.storedVersion = 2;
	script.push(snapshot());
	reloadSkill(simulation);
	for (let index = 0; index < 3; index += 1) advance(simulation);
	script.push(snapshot());

	const get = id => document.getElementById(id);
	const skillScrolly = get('skill-scrolly');
	const steps = Array.from(skillScrolly.querySelectorAll('.step'));
	const graphic = get('graphic');
	const sheet = get('skill-document');
	const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
	const captions = [
		'모델은 스킬의 이름과 설명만 받습니다.',
		'harness가 읽은 v1 본문입니다.',
		'모델은 다음 호출에서 v1 본문을 context로 받습니다.',
		'파일은 v2입니다. 이전 context는 v1입니다.',
		'모델은 v2 본문을 받고 조회 조건을 바꿉니다.',
	];
	let scene = -1;
	let detailKey = '';

	function details(index, settled) {
		const key = `${index}-${settled}`;
		if (detailKey === key) return;
		detailKey = key;
		const derived = model(script[index === 4 && !settled ? 3 : index]);
		get('payload').textContent = JSON.stringify(derived.payload, null, 2);
		get('context-blocks').replaceChildren(...derived.blocks.map(block => {
			const row = document.createElement('div');
			row.className = 'context-block';
			const label = document.createElement('span');
			label.className = 'block-label';
			label.textContent = block.label;
			const text = document.createElement('p');
			text.textContent = block.text;
			row.append(label, text);
			return row;
		}));
	}

	function render(index, fraction) {
		const progress = reducedMotion.matches ? 1 : fraction;
		const movement = index === 2 || index === 4 ? Math.min(1, progress / 0.72) : index >= 3 ? 1 : 0;
		const settled = index >= 2 && (index !== 4 || movement === 1);
		const version = index === 4 ? 2 : 1;
		const revised = index >= 3;
		graphic.dataset.scene = index;
		graphic.dataset.version = version;
		get('store-badge').textContent = revised ? 'v2' : 'v1';
		get('document-version').textContent = `v${version}`;
		get('rule-label').textContent = version === 2 ? '+ 추가 규칙' : '기존 규칙';
		get('rule-text').textContent = version === 2 ? '재개 업무 → 진행 중' : '재개 업무 규칙 없음';
		get('call-label').textContent = index === 4 && settled ? 'MODEL CALL 03' : index >= 2 ? 'MODEL CALL 02' : 'MODEL CALL 01';
		get('history-value').textContent = index === 4 && settled ? '포함' : '제외';
		const visible = index > 0;
		sheet.style.opacity = visible ? 1 : 0;
		const expansion = index === 1 ? Math.min(1, progress / 0.6) : 1;
		sheet.style.clipPath = `inset(0 0 ${(1 - expansion) * 76}% 0)`;
		sheet.querySelector('.document-body').style.opacity = expansion;
		const graphicRect = graphic.getBoundingClientRect();
		const libraryRect = graphic.querySelector('.library').getBoundingClientRect();
		const route = graphic.querySelector('.read-route');
		route.style.top = `${libraryRect.bottom - graphicRect.top + 10}px`;
		graphic.style.setProperty('--sheet-top', `${route.getBoundingClientRect().bottom - graphicRect.top + 10}px`);
		sheet.style.transform = 'none';
		const sheetRect = sheet.getBoundingClientRect();
		const slotRect = graphic.querySelector('.skill-slot').getBoundingClientRect();
		const distance = slotRect.left - sheetRect.left;
		const vertical = slotRect.top - sheetRect.top;
		sheet.style.transform = `translate(${distance * movement}px, ${vertical * movement}px)`;
		get('source-document').style.opacity = revised ? 1 : 0;
		get('frozen-copy').style.opacity = index === 4 ? 1 : 0;
		const action = graphic.querySelector('.action-result');
		action.style.top = `${slotRect.bottom - graphicRect.top + 4}px`;
		action.style.opacity = index >= 3 || index === 2 && movement === 1 ? 1 : 0;
		graphic.querySelector('.read-route').style.opacity = index === 1 || index === 4 && !settled ? 1 : 0;
		graphic.querySelector('.graphic-progress span').style.transform = `scaleX(${(index + fraction) / 5})`;
		get('graphic-caption').textContent = captions[index];
		graphic.setAttribute('aria-label', `${steps[index].querySelector('h2').textContent}. ${captions[index]}`);
		details(index, settled);
		if (scene === index) return;
		scene = index;
		steps.forEach((step, stepIndex) => {
			if (stepIndex === index) step.setAttribute('aria-current', 'true');
			else step.removeAttribute('aria-current');
		});
		get('announcement').textContent = captions[index];
	}

	function trackScrolly(scrolly, draw) {
		const scrollySteps = Array.from(scrolly.querySelectorAll('.step'));
		const stage = scrolly.querySelector('.scrolly__stage');
		return () => {
			const mobile = matchMedia('(max-width: 900px)').matches;
			const stageHeight = stage.offsetHeight;
			const trigger = mobile ? Math.min(innerHeight - 60, stageHeight + (innerHeight - stageHeight) * 0.45) : innerHeight * 0.55;
			let active = 0;
			let progress = 0;
			scrollySteps.forEach((step, index) => {
				const rect = step.getBoundingClientRect();
				if (rect.top < trigger) {
					active = index;
					progress = clamp((trigger - rect.top) / rect.height);
				}
			});
			draw(active, progress);
		};
	}

	const frame = trackScrolly(skillScrolly, render);

	const marks = '①②③④';
	const loopCaptions = {
		A: 'harness가 사용자 요청을 받습니다. 모델은 아직 호출하지 않았습니다.',
		B: 'harness가 다섯 가지를 모아 model call ①의 context를 만듭니다.',
		C: 'model call ①의 출력은 tool call입니다.',
		D: 'harness가 search_work를 검사하고 실행합니다.',
		E: 'model call ②는 끝났습니다. tool result는 새 호출 ③의 context로 들어갑니다.',
		F: '빠진 정보 때문에 모델이 상세 조회 tool call을 출력합니다.',
		G: '같은 순서로 model call ④를 시작합니다.',
		H: 'model call ④의 출력은 final response입니다. 실행이 끝납니다.',
	};
	const cardStates = { empty: 'not called', preparing: 'building context', running: 'running · context frozen', output: 'returned · context frozen', done: 'done' };
	const anchors = { request: '[data-anchor="request"]', status: '[data-status]', output: '[data-output]', dock: '[data-docked]', result: '[data-result]', records: '[data-records]', response: '[data-response]' };
	const lines = items => items.map(text => `<span class="doc-line">${text}</span>`).join('');
	const gaps = items => (items || []).map(text => `<span class="gap">${text}</span>`).join('');
	const requestDoc = call => `<span class="doc-kind">tool call · ${loopData.calls[call - 1].id}</span><code>${loopData.calls[call - 1].request}</code>`;
	const finalDoc = () => `<span class="doc-kind">final response</span><strong>${loopData.calls[3].title}</strong><span class="doc-line">${loopData.calls[3].summary}</span>`;
	const resultDoc = call => {
		const item = loopData.calls[call - 1];
		return `<span class="doc-kind">tool result · ${item.id}</span><strong>${item.result.title}</strong>${lines(item.result.lines)}${gaps(item.result.gaps)}`;
	};
	const recordRow = (call, fresh) => {
		const item = loopData.calls[call - 1];
		return `<li${fresh ? ' class="is-new"' : ''}><span class="record-head">${marks[call - 1]} ${item.tool} → ${item.id}</span><span class="doc-line">${item.result.title}</span>${call === 3 ? lines(item.result.lines) : ''}${gaps(item.result.gaps)}${fresh ? '<em>+ 새로 추가</em>' : ''}</li>`;
	};
	const moverDoc = mover => {
		if (mover.kind === 'request') return ['doc doc--request', '<span class="doc-kind">USER</span>주간보고 작성해줘'];
		if (mover.kind === 'tool') return ['doc', requestDoc(mover.call)];
		if (mover.kind === 'result') return ['doc doc--result', resultDoc(mover.call)];
		return ['doc doc--final', finalDoc()];
	};
	const ease = t => t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;

	function setupLoop(scrolly) {
		const stage = scrolly.querySelector('[data-loop-stage]');
		stage.prepend(get('loop-template').content.cloneNode(true));
		const graphic = stage.querySelector('.loop-graphic');
		const find = selector => graphic.querySelector(selector);
		const all = selector => Array.from(graphic.querySelectorAll(selector));
		const el = {
			caption: stage.querySelector('[data-loop-caption]'), status: find('[data-status]'), counter: find('[data-counter]'),
			phases: all('[data-phase]'), tools: all('[data-tool]'), dock: find('[data-dock]'), docked: find('[data-docked]'),
			checks: all('[data-check]'), result: find('[data-result]'), card: find('[data-card]'), callLabel: find('[data-call-label]'),
			cardState: find('[data-card-state]'), base: all('.loop-base li'), records: find('[data-records]'), output: find('[data-output]'),
			exits: all('[data-exit]'), ledger: find('[data-ledger]'), response: find('[data-response]'), mover: find('[data-mover]'),
		};
		const loopSteps = Array.from(scrolly.querySelectorAll('.step'));
		const cache = new Map();
		const once = (key, value, apply) => {
			if (cache.get(key) === value) return;
			cache.set(key, value);
			apply();
		};
		let currentScene = '';

		function place(mover) {
			const moving = mover && mover.t > 0 && mover.t < 1;
			el.mover.style.opacity = moving ? 1 : 0;
			if (!moving) return;
			once('mover', `${mover.kind}-${mover.call}`, () => {
				const [className, content] = moverDoc(mover);
				el.mover.className = `loop-mover ${className}`;
				el.mover.innerHTML = content;
			});
			const base = graphic.getBoundingClientRect();
			const from = find(anchors[mover.from]).getBoundingClientRect();
			const to = find(anchors[mover.to]).getBoundingClientRect();
			const t = ease(mover.t);
			const mix = (start, end) => start + (end - start) * t;
			el.mover.style.width = `${mix(from.width, to.width)}px`;
			el.mover.style.transform = `translate(${mix(from.left, to.left) - base.left}px, ${mix(from.top, mover.to === 'records' ? to.bottom : to.top) - base.top}px)`;
		}

		function draw(index, fraction) {
			const scene = loopSteps[index].dataset.scene;
			const s = loopState(scene, reducedMotion.matches ? 1 : fraction);
			graphic.dataset.gaps = s.gaps;
			graphic.dataset.response = s.response;
			el.status.textContent = s.status;
			el.counter.textContent = s.counter;
			el.phases.forEach(item => {
				if (item.dataset.phase === s.phase) item.setAttribute('aria-current', 'step');
				else item.removeAttribute('aria-current');
			});
			const toolCall = s.docked || s.result || (s.mover && s.mover.kind === 'tool' && s.mover.t > 0 ? s.mover.call : 0);
			const activeTool = toolCall ? loopData.calls[toolCall - 1].tool : '';
			el.tools.forEach(item => item.classList.toggle('is-active', item.dataset.tool === activeTool));
			once('docked', s.docked, () => {
				el.docked.className = s.docked ? 'loop-docked doc' : 'loop-docked';
				el.docked.innerHTML = s.docked ? requestDoc(s.docked) : '';
			});
			el.checks.forEach((item, index) => item.classList.toggle('is-on', index < s.checks));
			once('result', s.result, () => {
				el.result.className = s.result ? 'loop-result doc doc--result' : 'loop-result';
				el.result.innerHTML = s.result ? resultDoc(s.result) : '';
			});
			el.result.style.opacity = s.resultT;
			el.dock.dataset.recorded = s.recorded;
			el.card.dataset.state = s.card;
			el.callLabel.textContent = s.call ? `model call ${marks[s.call - 1]}` : 'model call';
			el.cardState.textContent = cardStates[s.card];
			el.card.style.opacity = 1 - s.cardOut;
			el.card.style.transform = s.cardOut ? `translateY(${s.cardOut * 48}px) scale(${1 - s.cardOut * 0.35})` : 'none';
			el.base.forEach((item, index) => item.style.setProperty('--t', clamp(s.base - index)));
			once('records', `${s.records}-${s.fresh}`, () => {
				el.records.innerHTML = Array.from({ length: s.records }, (_, index) => recordRow(index + 1, s.fresh && index === s.records - 1)).join('');
			});
			once('output', s.output, () => {
				const item = loopData.calls[s.output - 1];
				el.output.className = s.output ? `loop-output-doc doc${item.final ? ' doc--final' : ''}` : 'loop-output-doc';
				el.output.innerHTML = s.output ? (item.final ? finalDoc() : requestDoc(s.output)) : '';
			});
			el.output.classList.toggle('show-kind', s.label);
			el.output.style.opacity = s.output ? s.outputT : 1;
			el.exits.forEach(item => item.classList.toggle('is-active', item.dataset.exit === s.exit));
			once('ledger', s.completed, () => {
				el.ledger.innerHTML = Array.from({ length: s.completed }, (_, index) => `<b>${marks[index]}</b>`).join('');
			});
			el.response.textContent = s.response ? loopData.calls[3].summary : '아직 없음';
			place(s.mover);
			if (scene === currentScene) return;
			currentScene = scene;
			el.caption.textContent = loopCaptions[scene];
			graphic.setAttribute('aria-label', loopCaptions[scene]);
			loopSteps.forEach((step, stepIndex) => {
				if (stepIndex === index) step.setAttribute('aria-current', 'true');
				else step.removeAttribute('aria-current');
			});
			const rect = scrolly.getBoundingClientRect();
			if (rect.top < innerHeight && rect.bottom > 0) get('announcement').textContent = loopCaptions[scene];
		}

		return trackScrolly(scrolly, draw);
	}

	function buildRunRecord() {
		const list = get('run-list');
		loopData.calls.forEach((item, index) => {
			const previous = loopData.calls[index - 1];
			const row = document.createElement('li');
			row.id = `record-${item.id}`;
			const cells = [
				['', marks[index]],
				['context에 추가된 것', previous ? `${previous.tool} tool call + tool result ${previous.id}` : item.added],
				['model output', item.final ? 'final response (보고서)' : item.request],
				['harness 처리', item.final ? item.process : `${item.process} → ${item.id}`],
			];
			cells.forEach(([label, text], cellIndex) => {
				const cell = document.createElement('span');
				cell.className = cellIndex ? 'run-cell' : 'run-call';
				if (label) {
					const caption = document.createElement('small');
					caption.textContent = label;
					cell.append(caption);
				}
				cell.append(text);
				row.append(cell);
			});
			list.append(row);
		});
		loopData.report.forEach(entry => {
			const paragraph = document.createElement('p');
			const heading = document.createElement('b');
			heading.textContent = entry.heading;
			const link = document.createElement('a');
			link.href = `#record-${entry.record}`;
			link.textContent = `[${entry.source}]`;
			paragraph.append(heading, ` ${entry.text} `, link);
			get('run-report').append(paragraph);
		});
	}

	buildRunRecord();
	const loopFrames = Array.from(document.querySelectorAll('[data-loop]'), setupLoop);
	const frameAll = () => {
		frame();
		loopFrames.forEach(loopFrame => loopFrame());
	};

	let queued = false;
	function requestFrame() {
		if (queued) return;
		queued = true;
		requestAnimationFrame(() => { frameAll(); queued = false; });
	}
	addEventListener('scroll', requestFrame, { passive: true });
	addEventListener('resize', requestFrame, { passive: true });
	reducedMotion.addEventListener('change', requestFrame);
	frameAll();
}
