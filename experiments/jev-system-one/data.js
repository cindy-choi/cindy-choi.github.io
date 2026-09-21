// jev-system-one/data.js
// Pre-computed distributions (no live API). Each scenario is one state
// plus the three primitive answers Jev would return.

const SCENARIOS = [
  {
    id: "refund",
    label: "환불 요청 (명확)",
    state: "My flight was cancelled. Can I get a refund?",
    choice: { billing: 0.78, technical: 0.06, account: 0.16 },
    score: { probs: [0.52, 0.36, 0.12] },
    noul: 0.95
  },
  {
    id: "outage",
    label: "장애 신고 (급함)",
    state: "Our API integration started returning 500 errors on every request 20 minutes ago. We can't process any orders until this is fixed!",
    choice: { billing: 0.04, technical: 0.90, account: 0.06 },
    score: { probs: [0.06, 0.24, 0.70] },
    noul: 0.08
  },
  {
    id: "double-charge",
    label: "중복 결제 (화남)",
    state: "This is the THIRD time I'm writing. My card was charged twice for the same order and nobody has answered me. Fix this NOW.",
    choice: { billing: 0.85, technical: 0.05, account: 0.10 },
    score: { probs: [0.03, 0.18, 0.79] },
    noul: 0.62
  },
  {
    id: "password",
    label: "로그인 문제 (차분)",
    state: "Hi, I forgot my password and the reset email never arrives. Could you check if my address is correct in the system?",
    choice: { billing: 0.05, technical: 0.38, account: 0.57 },
    score: { probs: [0.72, 0.24, 0.04] },
    noul: 0.03
  },
  {
    id: "vague",
    label: "모호한 문의 (분포가 퍼짐)",
    state: "Hello, something seems off with my account since last week. Can someone look into it?",
    choice: { billing: 0.30, technical: 0.33, account: 0.37 },
    score: { probs: [0.42, 0.44, 0.14] },
    noul: 0.22
  }
];

const CHOICE_OPTIONS = ["billing", "technical", "account"];
const SCORE_LEVELS = ["calm", "concerned", "angry"];
