/**
 * Canvas Scope — "어디를 기준으로 볼 것인가". PRD §12.
 *
 * Scope는 Mode와 직교한다. Mode가 "어떻게 볼지"를 결정한다면 Scope는
 * "어떤 chapter들을 입력으로 줄지"를 결정한다. binderBar에서 선택한다.
 *
 * Discriminated union으로 둬서 추가 type 확장이 안전하다(custom 등).
 */

export type CanvasScopeKind =
  | "single-chapter"
  | "chapter-range"
  | "arc"
  | "custom";

export type CanvasScope =
  | {
      type: "single-chapter";
      chapterId: string;
    }
  | {
      type: "chapter-range";
      fromChapterId: string;
      toChapterId: string;
    }
  | {
      type: "arc";
      arcId: string;
    }
  | {
      type: "custom";
      chapterIds: string[];
    };

/**
 * Scope 비교 — 같은 chapter 집합을 가리키는지 판단할 때 쓰는 기준값.
 *
 * UI에서 "현재 active scope"를 강조할 때 reference equality만으로 판단할 수
 * 없어 별도 helper가 필요하다. 비교 로직은 utils 쪽에 둔다 (이 타입
 * 모듈은 데이터 표현만 담당).
 */
