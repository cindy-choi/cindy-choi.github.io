// jev-system-one/data.js
// Pre-computed distributions (no live API). Each scenario is one state
// plus the three primitive answers Jev would return.

const SCENARIOS = [
  {
    id: "event-1",
    label: "이벤트 1 · 도착",
    state: "order.arrived_at: 어제 도착 (고객 진술)",
    choice: { returns: 0.30, product_support: 0.25, delivery_support: 0.45 },
    score: { probs: [0.82, 0.15, 0.03] },
    noul: 0.05
  },
  {
    id: "event-2",
    label: "이벤트 2 · 파손",
    state: "order.arrived_at: 어제 도착 (고객 진술)\nproduct.reported_condition: 액정에 금이 있음 (고객 진술)",
    choice: { returns: 0.20, product_support: 0.72, delivery_support: 0.08 },
    score: { probs: [0.72, 0.24, 0.04] },
    noul: 0.08
  },
  {
    id: "event-3",
    label: "이벤트 3 · 주문 확인",
    state: "order.id: #4821\norder.arrived_at: 어제 도착 (고객 진술)\norder.delivery_status: 배송 완료 (시스템 기록)\nproduct.reported_condition: 액정에 금이 있음 (고객 진술)",
    choice: { returns: 0.28, product_support: 0.67, delivery_support: 0.05 },
    score: { probs: [0.72, 0.24, 0.04] },
    noul: 0.08
  },
  {
    id: "event-4",
    label: "이벤트 4 · 환불 요청",
    state: "order.id: #4821\norder.arrived_at: 어제 도착 (고객 진술)\norder.delivery_status: 배송 완료 (시스템 기록)\nproduct.reported_condition: 액정에 금이 있음 (고객 진술)\nconversation.customer_request: 교환보다는 그냥 돈으로 돌려받고 싶습니다.",
    choice: { returns: 0.82, product_support: 0.16, delivery_support: 0.02 },
    score: { probs: [0.76, 0.21, 0.03] },
    noul: 0.96
  },
  {
    id: "event-5",
    label: "이벤트 5 · 상담원 응답",
    state: "order.id: #4821\norder.arrived_at: 어제 도착 (고객 진술)\norder.delivery_status: 배송 완료 (시스템 기록)\nproduct.reported_condition: 액정에 금이 있음 (고객 진술)\nconversation.customer_request: 교환보다는 그냥 돈으로 돌려받고 싶습니다.\nconversation.agent_reply: 불편을 드려 죄송합니다. 확인해 드릴게요.",
    choice: { returns: 0.82, product_support: 0.16, delivery_support: 0.02 },
    score: { probs: [0.76, 0.21, 0.03] },
    noul: 0.96
  }
];

const CHOICE_OPTIONS = ["returns", "product_support", "delivery_support"];
const SCORE_LEVELS = ["calm", "concerned", "angry"];
