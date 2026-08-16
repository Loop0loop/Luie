# Startup readiness 원격 검사가 창 생성을 무기한 막은 문제

## 증상

연결된 Supabase session의 health endpoint가 응답하지 않으면 startup readiness가
끝나지 않아 startup wizard와 main window가 생성되지 않을 수 있었다.

## 근본 원인

창 생성 전에 await하는 원격 `fetch`에 timeout 또는 abort signal이 없었다. 검사
결과는 non-blocking으로 분류됐지만 Promise 대기 자체는 startup을 막았다.

## 수정

원격 session health check에 네이티브 `AbortSignal.timeout(5_000)`을 적용한다.
timeout 오류는 기존 check 실패 경로로 흡수되어 readiness 평가가 계속된다.

## 예방

창 생성 전에 실행되는 모든 원격 readiness 검사는 결과의 blocking 플래그와 별개로
유한한 timeout을 가져야 한다.

## 변경 파일

- `src/main/services/features/startup/startupReadinessService.ts`
- `tests/main/services/startupReadinessService.test.ts`
- `docs/architecture/current-main.md`
- `.gemini/antigravity/brain/bugs/2026-08-14-startup-readiness-fetch-timeout.md`
