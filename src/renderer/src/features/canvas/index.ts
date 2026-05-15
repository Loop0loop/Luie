/**
 * Canvas feature 인덱스 — 외부에서 사용하는 진입점만 export.
 *
 * 내부 모듈(stores/hooks/types 등)은 캔버스 안에서만 import한다. 다른
 * feature가 캔버스 내부를 직접 import하면 boundary가 무너지므로 인덱스에
 * 추가 export하지 않는다.
 */
export { WorldCanvasPanel } from "./WorldCanvasPanel";
