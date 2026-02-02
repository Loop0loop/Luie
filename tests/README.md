# Luie Vitest

## 목적
- main/services 비즈니스 로직의 단위 테스트
- 5만자 이상 에디터 컨텐츠, 스냅샷 복원, CRUD, 대규모 챕터 생성 시나리오 검증

## 실행
```bash
pnpm test
```

## 시나리오 요약
- ChapterService: 5만자 업데이트 후 `wordCount` 확인, 100챕터+5만자 스트레스
- SnapshotService: 스냅샷 생성/복원 검증
- ProjectService: CRUD 및 Prisma Client 재사용 확인
- SearchService: 챕터 콘텐츠 문장 검색 검증
