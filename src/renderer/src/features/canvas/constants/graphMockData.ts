import type { Node, Edge } from "reactflow";
import type { GraphNodeData } from "../types/graph";

export const MOCK_GRAPH_NODES: Node<GraphNodeData>[] = [
  {
    id: "jinseo",
    type: "pensive",
    position: { x: 0, y: 0 },
    data: {
      label: "진서",
      type: "character",
      description: "작품의 주인공. 제국 학술원 출신의 마법학자이자 아카데미 교수.",
      relatedChapters: ["12화 - 학술원의 이단아", "13화 - 뜻밖의 의뢰", "15화 - 습격"],
      relationships: [
        { targetName: "세린", type: "동료", details: "대화 8회, 협력 4회" },
        { targetName: "황궁", type: "소속", details: "소속 및 정보 수집" },
        { targetName: "마차 습격 사건", type: "사건 관련", details: "직접 관여 및 전투 참여" }
      ],
      sourceTexts: [
        "진서는 마른침을 삼켰다. 눈앞에 나타난 마차는 반쯤 박살 나 있었다.",
        "학술원을 떠나며 다짐했던 마법 공식의 진의를 그제야 깨달을 수 있었다."
      ]
    }
  },
  {
    id: "serin",
    type: "pensive",
    position: { x: 0, y: 0 },
    data: {
      label: "세린",
      type: "character",
      description: "그림자 길드 소속의 최정예 첩보원. 마차 수송 작전 중 주인공 진서의 생명을 구한 후 임시 동행 중.",
      relatedChapters: ["12화 - 학술원의 이단아", "15화 - 습격"],
      relationships: [
        { targetName: "진서", type: "동료", details: "마법 스크롤 거래 계약 관계" },
        { targetName: "그림자 길드", type: "소속", details: "상부의 지령 수행 중" }
      ],
      sourceTexts: [
        "세린은 단검을 가볍게 돌려 쥐었다. '교수님, 뒤는 제가 맡을 테니 마법 준비나 하시죠.'"
      ]
    }
  },
  {
    id: "guild",
    type: "pensive",
    position: { x: 0, y: 0 },
    data: {
      label: "그림자 길드",
      type: "faction",
      description: "제국 전역에 암약하는 거대 첩보 정보 길드. 돈만 지불하면 황제의 일거수일투족까지 조사한다고 소문나 있다.",
      relatedChapters: ["13화 - 뜻밖의 의뢰"],
      relationships: [
        { targetName: "세린", type: "소속", details: "정예 요원 관리" }
      ],
      sourceTexts: [
        "그림자는 언제나 빛의 뒤편에 숨어 있는 법이다. 길드의 철칙은 단 하나, 의뢰인의 비밀 보장이었다."
      ]
    }
  },
  {
    id: "palace",
    type: "pensive",
    position: { x: 0, y: 0 },
    data: {
      label: "황궁",
      type: "world-entity",
      description: "제국의 심장부. 현재 권력 투쟁이 극에 달해 황제 직속 세력과 보수파 귀족 연합이 대립 중.",
      relatedChapters: ["13화 - 뜻밖의 의뢰", "15화 - 습격"],
      relationships: [
        { targetName: "진서", type: "소속", details: "직속 마법학관 임명 대기" },
        { targetName: "반란군", type: "대적", details: "제국 전복 음모 의심" }
      ]
    }
  },
  {
    id: "ambush",
    type: "pensive",
    position: { x: 0, y: 0 },
    data: {
      label: "마차 습격 사건",
      type: "event",
      description: "황도로 진입하는 비밀 통로인 안개 숲에서 진서 일행이 마차를 탄 채 습격받은 사건.",
      relatedChapters: ["15화 - 습격"],
      relationships: [
        { targetName: "진서", type: "사건 인물", details: "학술원 마법 장벽 전개" },
        { targetName: "반란군", type: "배후 세력", details: "습격 주도 및 마력 결정 탈취 시도" }
      ],
      sourceTexts: [
        "안개 속에서 번뜩이는 붉은 눈빛들이 사방을 에워쌌다. 습격은 계획적이었고, 한 치의 오차도 없었다."
      ]
    }
  },
  {
    id: "rebels",
    type: "pensive",
    position: { x: 0, y: 0 },
    data: {
      label: "반란군",
      type: "faction",
      description: "황실 전복을 꾀하는 수수께끼의 무장 단체. 마력 결정을 노리고 제국 연구소를 습격하고 있다.",
      relatedChapters: ["15화 - 습격"],
      relationships: [
        { targetName: "마차 습격 사건", type: "배후 세력", details: "습격 주도" },
        { targetName: "황궁", type: "대적", details: "황실 무력화 목적" }
      ]
    }
  },
  {
    id: "chapter15",
    type: "pensive",
    position: { x: 0, y: 0 },
    data: {
      label: "15화 - 습격",
      type: "chapter",
      description: "주인공이 황도로 입성하던 중 안개 숲에서 반란군의 기습을 마주하고 실전을 치르는 전투 회차.",
      relatedChapters: ["15화 - 습격"],
      relationships: [
        { targetName: "마차 습격 사건", type: "사건 포함", details: "주요 갈등 발생지" }
      ]
    }
  }
];

export const MOCK_GRAPH_EDGES: Edge[] = [
  { id: "e-jinseo-serin", source: "jinseo", target: "serin", data: { strength: 3 } },
  { id: "e-jinseo-palace", source: "jinseo", target: "palace", data: { strength: 1 } },
  { id: "e-jinseo-ambush", source: "jinseo", target: "ambush", data: { strength: 2 } },
  { id: "e-serin-guild", source: "serin", target: "guild", data: { strength: 3 } },
  { id: "e-palace-rebels", source: "palace", target: "rebels", data: { strength: 2 } },
  { id: "e-ambush-rebels", source: "ambush", target: "rebels", data: { strength: 3 } },
  { id: "e-chapter15-ambush", source: "chapter15", target: "ambush", data: { strength: 1 } },
];
