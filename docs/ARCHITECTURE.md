# 인터랙티브 AI 학습 사이트 아키텍처

## 1. 문서 목적

이 문서는 `cindy-choi.github.io`를 단순한 기술 블로그가 아니라, AI 개념을 사용자가 직접 조작하고 관찰하는 **인터랙티브 학습 사이트**로 발전시키기 위한 초기 구조를 정의한다.

가장 중요한 레퍼런스는 Brown University의 [Seeing Theory](https://seeing-theory.brown.edu/)다. Seeing Theory에서 계승할 핵심은 특정 시각 스타일이 아니라 다음의 학습 루프다.

```text
사용자 입력
  → 내부 상태 변경
  → 계산/시뮬레이션
  → 시각 요소 업데이트
  → 애니메이션으로 변화 관찰
  → 다시 조작하고 비교
```

애니메이션은 장식이 아니라 **상태 변화와 인과관계를 보여주는 설명 도구**여야 한다.

## 2. 현재 저장소의 역할

현재 저장소는 Beautiful Jekyll 기반의 GitHub Pages 사이트다. 기존 Jekyll 구조를 유지하고, 인터랙티브 실험을 점진적으로 추가한다.

```text
cindy-choi.github.io/
├── _config.yml             # Jekyll 전역 설정
├── _posts/                 # 일반 학습 기록 및 블로그 글
├── _layouts/               # Jekyll 페이지 레이아웃
├── _includes/              # 공통 UI 조각
├── assets/                 # 사이트 공통 정적 자산
├── experiments/            # 인터랙티브 실험 페이지
├── docs/                   # 설계·개발 문서
└── index.html              # 사이트 진입점
```

### 원칙

- 기존 Jekyll 블로그 기능과 테마를 먼저 보존한다.
- 실험은 일반 포스트와 분리해 독립적으로 실행·검증할 수 있게 한다.
- 첫 단계에서는 React나 복잡한 애플리케이션 프레임워크를 도입하지 않는다.
- GitHub Pages에서 정적 파일로 제공할 수 있어야 한다.
- 실험 하나가 다른 실험의 상태나 전역 JavaScript에 의존하지 않도록 한다.

## 3. 인터랙티브 실험의 기본 구조

각 실험은 하나의 작은 시뮬레이션 애플리케이션으로 구성한다.

```text
experiments/<experiment-name>/
├── index.html              # 설명, 컨트롤, 시각화 컨테이너
├── style.css               # 실험 전용 스타일
├── state.js                # 상태와 기본값
├── model.js                # 계산·시뮬레이션·파생 데이터
├── view.js                 # SVG/Canvas 렌더링
└── interaction.js          # slider, drag, click, keyboard 이벤트
```

작은 실험에서는 파일을 하나의 `main.js`로 합칠 수 있지만, 다음 경계는 유지한다.

```text
상태(state) ≠ 계산(model) ≠ 렌더링(view) ≠ 입력(interaction)
```

이 경계를 지켜야 나중에 같은 개념을 다른 데이터나 UI로 재사용할 수 있다.

## 4. 렌더링 기술 선택

### 4.1 SVG + D3.js: 데이터와 직접 연결되는 시각화

Seeing Theory의 핵심 구현 방식이다. 다음 요소에 사용한다.

- 확률 막대
- 분포 곡선
- 산점도와 회귀선
- 토큰별 확률
- 모델 라우팅 그래프
- agent 상태 노드
- 축·라벨·툴팁

기본 흐름:

```javascript
const svg = d3.select('#visualization').append('svg');

function render(data) {
  const marks = svg.selectAll('.mark').data(data, d => d.id);

  marks.enter()
    .append('rect')
    .attr('class', 'mark')
    .merge(marks)
    .transition()
    .duration(300)
    .attr('x', d => xScale(d.x))
    .attr('y', d => yScale(d.y))
    .attr('height', d => heightScale(d.value));

  marks.exit().remove();
}
```

핵심은 매 프레임마다 화면을 임의로 그리는 것이 아니라, **데이터가 바뀐 결과를 D3가 시각 요소에 반영**하게 하는 것이다.

### 4.2 Canvas: 많은 입자와 반복 프레임

다음에만 Canvas를 사용한다.

- 수백 개 이상의 입자
- 파티클·노이즈·흐름장
- 지속적인 물리 시뮬레이션
- 개별 DOM/SVG 요소가 필요 없는 배경 애니메이션

Canvas는 결과 표시용이며, 중요한 값·라벨·접근 가능한 설명은 HTML/SVG로 제공한다.

### 4.3 CSS: UI 상태와 단순 전환

- hover/focus
- panel 열림·닫힘
- opacity·transform 전환
- 버튼 피드백
- reduced-motion 대응

CSS만으로 표현 가능한 애니메이션에 JavaScript를 사용하지 않는다.

## 5. 상태 업데이트 아키텍처

모든 실험은 다음 단방향 흐름을 따른다.

```text
사용자 이벤트
  ↓
상태 변경
  ↓
모델 재계산
  ↓
파생 데이터 생성
  ↓
view render
  ↓
transition / animation
```

예시: Token cost playground

```text
텍스트 입력
  ↓
선택한 tokenizer와 모델 상태 변경
  ↓
token 분할·수·비용·context 사용량 계산
  ↓
token별 시각 데이터와 요약 지표 생성
  ↓
토큰 박스·비용 막대·context 게이지 업데이트
```

상태 예시:

```javascript
const state = {
  inputText: '',
  tokenizer: 'cl100k_base',
  model: 'default',
  temperature: 0.7,
  sampleCount: 1,
  isRunning: false,
};
```

상태 객체를 직접 DOM 곳곳에서 수정하지 않고, 이벤트 핸들러를 통해 변경한 뒤 하나의 `update()` 흐름으로 화면을 갱신한다.

## 6. 첫 번째 실험 후보

### 6.1 Token Cost Playground

첫 구현 후보로 가장 적합하다.

```text
문장 입력
  → token 분할
  → token별 색상·길이 표시
  → token 수 계산
  → context window 사용량 표시
  → 모델별 비용 비교
```

Seeing Theory의 다음 패턴을 그대로 적용할 수 있다.

- 그래프 요소 자체를 조작 가능한 입력으로 사용
- 관측값과 기준값을 함께 표시
- 한 번 실행과 여러 번 실행을 비교
- 값이 바뀌면 애니메이션으로 변화 과정을 보여줌

### 6.2 Model Routing Playground

두 번째 후보다.

```text
요청 특성 입력
  → 난이도·비용 한도·지연시간 계산
  → router가 모델 선택
  → 경로와 대안 모델 표시
  → 조건 변경 시 routing 결과 transition
```

### 6.3 Agent State Machine

세 번째 후보다.

```text
요청
  → 계획
  → tool 선택
  → 실행
  → 관찰
  → 재시도/fallback
  → 완료
```

상태 노드와 연결선을 SVG로 표시하고, 실행 순서를 강조 애니메이션으로 보여준다.

## 7. URL 및 페이지 구성

초기에는 Jekyll 포스트와 실험을 구분한다.

```text
/blog/<post>
/experiments/token-cost/
/experiments/model-routing/
/experiments/agent-state-machine/
/docs/architecture/
```

각 실험은 독립적인 `index.html`을 가지므로 GitHub Pages에서 별도의 빌드 서버 없이 제공할 수 있다. 공통 스타일과 유틸리티가 충분히 누적된 뒤에만 shared module을 만든다.

## 8. 접근성·성능 기본 원칙

- 모든 조작 요소는 키보드로 접근 가능해야 한다.
- slider에는 현재 값과 단위를 텍스트로 표시한다.
- SVG에는 `aria-label`, 제목, 설명을 제공한다.
- Canvas에 표시되는 핵심 정보는 HTML 텍스트나 표로도 제공한다.
- `prefers-reduced-motion: reduce`일 때 자동 애니메이션을 줄인다.
- 애니메이션과 계산을 분리해 불필요한 재계산을 피한다.
- 작은 데이터는 SVG, 많은 반복 요소는 Canvas를 사용한다.
- 모바일에서는 hover에 의존하지 않고 tap·drag·slider를 사용한다.
- 외부 AI API 호출은 초기 시뮬레이션과 분리한다. 첫 버전은 재현 가능한 로컬 모델/규칙으로 동작시킨다.

## 9. 개발 단계

### Phase 0 — 현재 단계

- Jekyll 저장소와 GitHub Pages 배포 확인
- 아키텍처 문서 작성
- 인터랙티브 실험 폴더 규칙 확정

### Phase 1 — Seeing Theory 스타일의 최소 실험

- D3.js와 SVG로 하나의 상태 기반 시각화 구현
- slider 또는 drag 입력 추가
- 값 변경 → 계산 → transition 검증
- 모바일·키보드 입력 확인

### Phase 2 — 첫 AI 실험

- Token Cost Playground 구현
- 실제 tokenizer 데이터 또는 명시적인 교육용 tokenizer adapter 연결
- 모델·비용·context 비교
- 결과를 URL로 공유할 수 있는 상태 직렬화 추가

### Phase 3 — 콘텐츠와 실험 연결

- Jekyll 포스트에서 실험으로 이동하는 링크 추가
- 실험 안에 설명·가설·관찰·정리 섹션 추가
- 실험별 README와 검증 체크리스트 추가

### Phase 4 — 공통 런타임 정리

- 공통 SVG helper와 control component 추출
- 필요할 때만 TypeScript 또는 Vite 도입
- 실험 수가 늘어난 뒤 공통 상태·라우팅·번들 전략 재평가

## 10. 결정 사항과 비결정 사항

### 결정

- 현재 Jekyll/GitHub Pages 구조를 유지한다.
- 실험은 `experiments/` 아래 독립 정적 페이지로 시작한다.
- 핵심 렌더링은 D3.js + SVG로 한다.
- Canvas는 입자·대량 반복 렌더링에만 사용한다.
- 상태·계산·뷰·입력을 분리한다.
- 첫 실험 후보는 Token Cost Playground다.

### 아직 결정하지 않음

- React/Svelte 도입 여부
- Vite/TypeScript 도입 시점
- 실제 tokenizer 실행 위치와 지원 모델 범위
- 외부 AI API를 사용할지 여부
- 콘텐츠 다국어 구조

결정하지 않은 항목은 첫 실험을 실제로 만들어 본 뒤 복잡도와 유지보수 비용을 기준으로 결정한다.

## 참고 자료

- Seeing Theory: https://seeing-theory.brown.edu/
- Seeing Theory source: https://github.com/seeingtheory/Seeing-Theory
- D3.js: https://d3js.org/
- Seeing Theory의 HTML5 Canvas 애니메이션 관련 Hacker News discussion: https://news.ycombinator.com/item?id=16617632
- Seeing Theory의 아키텍처에 참고한 조사 문서: `/Users/sena/wiki/output/interactive-storytelling-research.md`
