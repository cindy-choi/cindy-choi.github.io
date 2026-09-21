# Jev 페이지 수정 설계 — 읽기 흐름과 수치 일관성

## 목표와 작업 경계
설계: 메인 에이전트. 구현: openai-codex / gpt-5.6-luna (호출 확인 완료).
기존 plain HTML/D3/Canvas와 흑백·warm 마커 팔레트를 유지한다. 반응형, 프레임워크, 테스트 스위트, 실제 Jev API 호출은 추가하지 않는다. 커밋·푸시 금지. 수정 범위는 experiments/jev-system-one/와 이 문서뿐이며 다른 미커밋 변경(.github/workflows 포함)은 건드리지 않는다.

## 실제 화면/소스에서 확인된 문제
- .cards의 3열 min-content 크기에 긴 pre가 더해져 데스크톱에서도 문서 전체가 가로로 넘친다.
- 카드마다 그래프/설명/코드 시작 높이가 다르고 11px 코드와 중복 Score 막대 때문에 시선이 분산된다.
- Score 마커는 score.value, 계산식은 probs의 기대값을 사용한다. 장애 신고는 마커 1.7과 계산식 1.64가 불일치한다.
- Choice 코드가 최대 선택 확률을 confidence로 표시한다. 둘은 다른 값이다.
- Routing 기본 하한 0.50, 에필로그 코드 0.40이며 코드가 슬라이더 변경에 따라 갱신되지 않는다.
- State를 누적 객체로만 정의하고 문자열과 대비하지만 공식 State는 문자열·객체·배열 모두 허용한다.
- Structure가 Noul에도 confidence가 붙는다고 설명하고 boolean을 원시 응답처럼 보여준다.
- 130px 브릿지 여백과 110px 섹션 여백, 반복 문단이 과도하게 쌓인다.

## 수정안
### 1. 페이지의 읽기 순서를 고정한다
System One → State → Primitives (Questions): Choice / Score / Noul → Confidence → Calibration → Advanced: Structure → Routing → 짧은 에필로그.
- System One은 정확한 섹션명으로 노출하고 Jev와 개념의 관계를 한 문장으로 설명.
- Structure를 Routing 전으로 옮겨 ‘여러 답을 받는다 → 코드로 행동을 결정한다’ 순서로 완결.
- 각 섹션 제목, 2~3문장 리드, 인터랙션, 해석/코드 순서를 일정하게.
- 브릿지는 다음 질문을 던지는 1~2문장으로 줄이고 상하 여백은 약 64~80px. 본문은 16px 안팎으로 읽기 편하게.
- 과장(안심하고 분기, 진짜 구조, LLM은 매번 달라진다 등)을 제거하고 차이를 출력 계약 중심으로 설명. 데모가 실제 Jev 측정값이 아님을 도입과 관련 시각화에서 표시.

### 2. Primitives는 좁은 3열에서 세 개의 가로형 섹션으로
같은 state 시나리오 선택기를 공통 입력으로 유지한다. Choice, Score, Noul을 정확한 이름의 독립 article/소섹션으로 세로 나열한다.
각 행 왼쪽은 질문/시각화/강조 결과, 오른쪽은 짧은 설명과 ‘질문 선언 → 결과 읽기’ 코드 패널. 약 40:60 비율, 두 열 모두 min-width:0. 그림은 기존 D3 상호작용을 재사용.
- 긴 코드는 의미 단위로 줄바꿈. 페이지 전체를 overflow:hidden으로 가리지 말고 minmax(0,1fr), pre min-width:0 등으로 근본 해결.
- 코드 폰트 12~13px. 문자열/코드만 가득한 카드 대신 결과 수치가 먼저 읽히게.
- Score는 기존 세 레벨 막대에 확률 라벨을 추가하고 중복 가로 막대를 제거. 기대값 식은 하나만 남기고 마커·readout·코드 모두 probs로부터 계산한다.
- Choice는 probabilities[winner]를 ‘선택 확률’로 표기. 임의 숫자를 SDK confidence라고 쓰지 않는다.
- Noul은 P(yes), 별도 confidence 없음, 0.5는 yes/no 비슷한 확률이지 중간 강도가 아니라는 정확한 설명.

### 3. 데이터와 코드의 단일 기준
- score.value는 제거하거나 사용 중단하고 모든 Score 표시는 동일한 기대값 함수를 이용.
- renderExtras를 독립 클릭 이벤트/전역 훅 대신 시나리오 update 경로에 통합하거나 동등하게 단일 상태로 연결.
- Confidence의 1-H/log(n)는 ‘이 페이지의 교육용 정규화 엔트로피 지표’라고 명시. 공식 docs는 요약값을 설명하나 이 식을 공식 구현이라고 확정하지 않는다.
- Routing live code를 Routing 섹션 바로 아래에 옮기고 하한/상한 및 고위험 프리셋 변화에 따라 코드 값 갱신. 이벤트 실행 순서에도 실제 clamped 값과 동일하게.
- Structure의 예시는 실제 response.answers의 타입별 형태를 구분: Choice/Score와 Noul의 noul 확률. boolean 변환은 애플리케이션 코드의 별도 단계. ‘모든 필드 confidence’ 문구 삭제. 재실행 중 타이머 중복도 작은 변경으로 해결.

### 4. 문서 근거에 맞는 본문/스니펫
확인한 공식 출처:
- https://docs.typesafe.ai/concepts/system-one.md — typed judgments; calibration은 집단 특성, 단일 답의 정답 보장 아님.
- https://docs.typesafe.ai/concepts/state.md — State = 판단할 자료. string/dict/list를 직접 전달, 모든 질문이 같은 state를 독립 평가. 자동 누적 메모리를 API가 관리한다는 주장 금지. 타임라인은 앱이 새 state를 만들어 재평가하는 데모.
- https://docs.typesafe.ai/confidence.md — Choice/Score에 confidence; Noul에는 없음. 최대 확률과 혼동 금지.
- https://docs.typesafe.ai/introduction/machine-learning-primer.md — RLCD = Reinforcement learning for calibrated decisions. ‘정확도 대신 보정만’ 또는 미확인 보상함수 단정 금지.
- https://docs.typesafe.ai/sdk/python/api/types/questions.md — from typesafe_sdk import Choice, Score, Noul, TypeSafeClient. Choice(criteria={"billing":"결제 관련", "technical":"기술 문제", "account":"계정 관련"}, instructions="...") : options= 아님. Score(criteria=["차분", "짜증", "분노"], instructions="..."). Noul(instructions="..."). client.system_one(state=..., questions=...).
현재 문서 인덱스에 별도 Structure API 페이지가 없으므로 Advanced: Structure 명칭은 유지하되 ‘질문을 묶고 응답을 앱 객체로 조합하는 패턴’이라고 설명. 독립 SDK 타입인 것처럼 쓰지 않는다.
스니펫의 출력은 Python 주석으로 표기하고 필수 import/호출을 한 군데에 완결된 예제로 둔다. 생략 기호나 화살표를 실행 코드로 섞지 않는다. 실제 네트워크 호출은 하지 않는다.

### 5. 유지할 상호작용
- 재전송 비교, State 이벤트 추가, 5개 시나리오, Confidence 드래그/70% 3탭, Calibration 최초 진입 자동 200개 낙하 + 다시 쏟기 새 표본, 과신 슬라이더는 동일 표본, Routing 게이트/프리셋, Structure 재조립.
- 큰 섹션 전체 높이 비율에 의존한 reveal은 긴 섹션에서 영원히 안 뜰 수 있으므로 작은 헤더/캔버스 진입을 트리거로. 공은 캔버스가 보이기 전에 쏟지 않는다.
- 기존 --c-* 누락 변수를 실제 palette의 --warm-* 토큰으로 정리. append-only CSS 대신 관련 정의를 직접 고쳐 중복 최소화.

## 완료 검증 (가볍지만 실제로)
1. node --check main.js, data.js.
2. 1280px 데스크톱에서 document.scrollWidth <= innerWidth; 각 주요 섹션 실제 스크린샷 확인.
3. 로드 전 에러 수집 리스너 설치. 시나리오 5개 순환하여 Score 기대값/마커/코드 일치와 Choice/Noul 갱신 검사.
4. 임계값과 고위험 프리셋 조작 후 코드·슬라이더 값 일치.
5. Calibration 진입 자동 실행, 다시 쏟기 전후 캔버스 이미지 차이, 과신 슬라이더 반응.
6. State 끝까지 추가, Structure 재조립, confidence 프리셋 및 드래그 회귀 확인.
7. 페이지에 사실과 다른 options=, 모든 필드 confidence, 자동 누적 메모리, 공식 엔트로피 식 단정이 남지 않았는지 확인.

구현 결과는 로컬 URL로 검토하며 커밋·푸시는 계속 보류한다.
