# Plan B — Jev 페이지 "엔지니어 실전 이해" 보강

목표: 개념 소개 페이지를 넘어, 처음 읽는 엔지니어가 "이걸 어떻게 호출하고 어떻게 읽는지"까지
감을 잡게 만든다. 시각 언어(흑백 + amber/magenta)와 스크롤 서사는 그대로 유지하고,
**기존 섹션에 최소한으로 끼워 넣는다** (새 대형 섹션 없음).

근거 자료: docs.typesafe.ai — primitives/{choice,score,noul}.md, concepts/how-to-build-with-system-one.md
실제 API 형태 (docs 원문 확인 완료):

```python
response = client.system_one(state=state, questions=questions)
answers["topic"].choice          # Choice → 선택된 옵션
answers["bug_severity"].score    # Score  → 기대값 (예: 1.06) + .confidence
answers["refund_requested"].noul # Noul   → P(yes), 0~1 단일 확률
```

---

## 작업 1 — Primitives 카드에 선언/응답 코드 스니펫

각 카드(Choice/Score/Noul) 하단에 접이식이 아닌 **상시 노출 미니 코드 블록** 추가.
왼쪽 = 질문 선언, 오른쪽(또는 아래 한 줄) = 코드에서 읽는 법.

- Choice 카드:
  ```python
  "team": Choice(instructions="어느 팀이 처리해야 하는가?",
                 options=["billing", "technical", "account", "refund"])
  # → answers["team"].choice == "billing", .confidence == 0.90
  ```
- Score 카드:
  ```python
  "anger": Score(instructions="고객은 얼마나 화가 났나?",
                 criteria=[{...0: 차분}, {...1: 짜증}, {...2: 분노}])
  # → answers["anger"].score == 1.7  (probabilities의 기대값)
  ```
- Noul 카드:
  ```python
  "refund": Noul(instructions="환불을 요청하고 있는가?")
  # → answers["refund"].noul == 0.87  # P(yes) 단일 확률
  ```
- 스타일: `.card__code` — struct__json과 같은 다크 패널, 11.5px mono, 카드 폭에 맞춤.
- 시나리오 칩 클릭 시 주석의 결과값(`.choice`, `.score`, `.noul`)도 함께 갱신 (기존 렌더 함수에 한 줄씩).

## 작업 2 — Score 기대값 시각화

현재 Score 카드는 마커가 1.7 위치로 미끄러질 뿐, "왜 1.7인가"가 안 보인다.
- 레벨(0/1/2) 아래에 **레벨별 확률 미니 막대** 추가 (예: 0:0.05, 1:0.20, 2:0.75).
- 기대값 계산식을 카드 답변 줄에 명시: `score = Σ level × p = 1.7`.
- 마커가 막대 무게중심에서 나온다는 것이 시각적으로 연결되도록 막대→마커 위치 동일 x축 사용.
- 데이터: data.js 시나리오별 score 분포는 이미 존재(레벨 확률) → 렌더만 추가.

## 작업 3 — Noul 이름/특성 각주

- Noul 카드에 각주 한 줄: "Noul은 boolean이 아니다 — 답이 아니라 **P(yes)라는 확률 하나**를
  돌려준다. 0.5는 '중간 정도'가 아니라 '모르겠다'는 뜻. 정도를 재려면 Score를 써라." (docs 원문 논지)
- confidence 필드가 따로 없다는 점 명시 (noul 값 자체가 확신의 표현).
- 어원은 docs에 공식 설명이 없으므로 지어내지 않는다 — "typesafe가 정의한 고유 타입명" 정도로만.

## 작업 4 — Calibration 섹션에 RLCD 명시

- 브릿지(Confidence→Calibration) 문장에 이름 추가:
  "그래서 Jev는 **RLCD**(Reinforcement Learning from Calibrated Distributions)로 학습됩니다 —
  보상이 '정답을 맞혔는가'가 아니라 '말한 확률만큼 맞혔는가'."
  (정확한 풀네임은 docs 확인 후 표기; 확인 불가 시 "RLCD — calibration을 보상으로 주는 RL"로만.)
- Calibration 섹션 리드 끝에도 한 문장: "이 곡선이 대각선에 붙어 있도록 만드는 것이 RLCD의 학습 목표다."

## 작업 5 — State vs 프롬프트 차별점 한 문단

- State 섹션 리드에 추가: "LLM의 대화 히스토리와 뭐가 다른가? — 프롬프트는 매 호출마다
  다시 조립하는 문자열이지만, state는 **질문과 분리된 1급 객체**다. 같은 state 하나에
  N개의 질문을 병렬로 던지고, state가 자라면 같은 질문을 다시 던진다.
  '무엇을 보여줄까'와 '무엇을 물을까'가 분리된다."
- 인터랙션 변경 없음 (기존 타임라인이 이미 이걸 보여주고 있음 — 텍스트만 연결).

## 작업 6 — Structure 섹션에 요청 코드 반쪽 추가

- 현재: 필드 카드 → JSON 응답만 있음. 입력 선언이 없다.
- 필드 카드 위(또는 좌측)에 요청 코드 스니펫 추가:
  ```python
  questions = {
    "team": Choice(...), "anger": Score(...),
    "wants_refund": Noul(...), "auto_resolvable": Noul(...),
  }
  response = client.system_one(state=ticket, questions=questions)
  ```
  → "이 dict가 곧 스키마"라는 문장으로 필드 카드와 연결.

## 작업 7 — 에필로그에 routing 실코드

- docs의 실전 패턴을 6줄로 압축한 코드 블록을 에필로그 위에 추가:
  ```python
  if answers["topic"].confidence < 0.75: return route_to_human(ticket)
  if answers["refund"].noul >= 0.7:      return route_to_billing(ticket)
  ...
  ```
- Act 5(Routing) 시각화의 임계값 0.75/0.4와 숫자를 일치시켜 "방금 만진 슬라이더가 이 코드"임을 연결.

---

## 순서와 검증

1 → 2 → 3 (Primitives 묶음) → 4 → 5 (텍스트만) → 6 → 7 (코드 블록 묶음)

- 각 묶음마다: `node --check` + 브라우저 스크린샷 (칩 전환 시 코드 주석 값 갱신 확인 포함)
- CSS는 `.card__code`, `.score-probs` 두 클래스만 신설, 나머지는 기존 재사용
- 커밋은 전체 완료·확인 후 (기존 보류 방침 유지)

## 하지 않는 것

- API 문법의 세부(criteria 오브젝트 전체 형태 등)를 그대로 복제하지 않는다 — 개인 공부용 요약 수준
- 실 API 호출 없음 (기존 원칙), 새 대형 인터랙션 없음, 반응형 없음
