# AI Error Report Template

“오류가 났다” 수준 보고를 금지하고, 재현 가능한 형태로 기록합니다.

## 1) Summary
- 증상 한 줄 요약

## 2) Environment
- OS:
- Node:
- pnpm:
- Branch/Commit:

## 3) Reproduction Steps
1. ...
2. ...
3. ...

## 4) Expected vs Actual
- Expected:
- Actual:

## 5) Logs
- 콘솔/스택트레이스(필수)

## 6) Impact
- 영향 범위(기능/사용자/데이터)

## 7) Suspected Files
- `/absolute/path/to/file.ts`
- `/absolute/path/to/file.ts`

## 8) Verify After Fix
1. `pnpm -s typecheck`
2. `pnpm -s lint`
3. `pnpm -s qa:core`
