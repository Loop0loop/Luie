# packaged renderer에 strict CSP header가 적용되지 않은 문제

## 증상

문서는 production에서 strict CSP header가 적용된다고 설명했지만 packaged renderer의
`file://` 응답은 코드에서 명시적으로 제외되어, 개발 호환용 meta CSP만 적용됐다.

## 근본 원인

`onHeadersReceived`가 CSP header를 설정할 때 `file://` URL을 건너뛰었고 문서에는
실제로 존재하는 meta CSP가 없다고 기록돼 있었다.

## 수정

production CSP가 결정된 경우 URL scheme과 관계없이 response header에 적용한다.
개발용 meta CSP와 production header의 역할을 문서에 실제 동작대로 기록한다.

## 예방

packaged main document의 CSP 적용 경로와 production script policy를 소스 기반 테스트로
고정한다.

## 변경 파일

- `src/main/lifecycle/app-ready/appReady.ts`
- `tests/scripts/rendererCspPolicy.test.ts`
- `docs/security/csp-policy.md`
- `.gemini/antigravity/brain/bugs/2026-08-14-packaged-file-csp-header.md`
