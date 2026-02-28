# Supabase Edge Function OpenAI Proxy

이 문서는 Luie에서 사용하는 `openai-proxy` Edge Function 배포 절차를 정리합니다.

## 1) 사전 준비

1. Supabase CLI 로그인

```bash
pnpm exec supabase login
```

2. 로컬 환경변수 준비 (`.env` 또는 쉘)

```bash
SUPABASE_PROJECT_REF=your-project-ref
OPENAI_API_KEY=sk-...
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY`는 앱 런타임/Sync에 필요하고,  
`OPENAI_API_KEY`는 `supabase secrets set` 업로드 용도로만 사용합니다.

## 2) 프로젝트 링크

```bash
pnpm supabase:openai:link
```

## 3) OpenAI Secret 업로드

```bash
pnpm supabase:openai:set-secret
```

## 4) 함수 배포

```bash
pnpm supabase:openai:deploy
```

## 5) 로컬 함수 실행 (선택)

```bash
pnpm supabase:openai:serve
```

## 6) 호출 규약

엔드포인트:

`POST https://<project-ref>.supabase.co/functions/v1/openai-proxy`

필수 헤더:

- `Authorization: Bearer <supabase-access-token>`
- `Content-Type: application/json`

요청 예시 (`responses` API):

```json
{
  "model": "gpt-4o-mini",
  "input": "hello"
}
```

요청 예시 (`chat.completions` API):

```json
{
  "endpoint": "chat.completions",
  "model": "gpt-4o-mini",
  "messages": [{ "role": "user", "content": "hello" }]
}
```

함수는 JWT를 검증한 사용자 요청만 OpenAI로 프록시합니다.
