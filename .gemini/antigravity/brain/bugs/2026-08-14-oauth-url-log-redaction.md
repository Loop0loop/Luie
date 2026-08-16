# OAuth callback URL이 로그에 노출된 문제

## 증상

main bootstrap의 `argv`와 deep-link 로그에 OAuth callback URL이 그대로 기록되어
authorization code, state, fragment token이 파일 로그에 남을 수 있었다.

## 근본 원인

공통 logger는 민감한 객체 키와 Bearer/JWT 문자열은 가렸지만 URL query/hash 안의
민감 파라미터는 검사하지 않았다.

## 수정

공통 문자열 redaction에서 `code`, `state`, `*token`, `*verifier`, `*secret`
URL 파라미터 값을 마스킹한다. 안전한 파라미터와 일반 argv는 유지한다.

## 예방

인증 callback이나 외부 URL을 로그에 추가할 때 개별 호출부에 의존하지 않고 공통
logger의 URL redaction 회귀 테스트로 query와 fragment를 함께 검증한다.

## 변경 파일

- `src/shared/logger/index.ts`
- `tests/shared/logger.redaction.test.ts`
- `.gemini/antigravity/brain/bugs/2026-08-14-oauth-url-log-redaction.md`
