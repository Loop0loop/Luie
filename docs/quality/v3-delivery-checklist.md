# V3 Delivery Checklist

## Phase order
1. V3-A (dependency + IPC contract)
2. V3-B (security + input boundary)
3. V3-C (scope drift + reproducibility)

## Mandatory sequence
1. 요구사항 확정
2. 참고 근거(코드/문서) 수집
3. 단일 기능 범위 잠금
4. 테스트/게이트 기준 작성
5. 구현
6. 회귀 검증

## Gate checklist
- [ ] `pnpm -s typecheck`
- [ ] `pnpm -s lint`
- [ ] `pnpm -s qa:core`
- [ ] `pnpm -s build`

## Output checklist
- [ ] 변경 파일 목록
- [ ] 리스크/제약 사항
- [ ] 다음 단계 제안(필요한 경우만)
