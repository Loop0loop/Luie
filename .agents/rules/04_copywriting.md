---
trigger: always_on
---

# Luie — Copywriting

## Language

All UI copy is written in Korean.
Tone: calm, clear, functional, professional.
Not childish. Not overly emotional. Not marketing.

---

## Good vs Bad Copy

### Labels and titles

✅ 새 작품 만들기
✅ 챕터를 선택하세요
✅ 아직 등록된 캐릭터가 없습니다
✅ 작품 설정
✅ 최근 수정됨

❌ 당신의 창작 여정을 시작해보세요!
❌ 놀라운 이야기를 펼쳐보세요!
❌ Awesome Novel Dashboard
❌ {templateId} 템플릿으로 생성됨  ← dev artifact, never ship this

### Buttons — use clear action verbs

✅ 작성하기
✅ 추가하기
✅ 저장하기
✅ 불러오기
✅ 내보내기
✅ 삭제하기

❌ 확인  (too vague)
❌ OK
❌ Submit

---

## Naming Consistency

Do not mix Korean and English within the same UI surface.

❌ 원고 (MANUSCRIPT)
❌ 휴지통 (Trash)
❌ 작품 개요 (Synopsis)

✅ 원고
✅ 휴지통
✅ 작품 개요

Internal code names (components, files, variables) are always English.
Follow existing naming conventions in the codebase.

---

## No Hardcoded Production Data

❌ Fake novel titles in production components
❌ Fake chapter names in production components
❌ Fake usernames
❌ Placeholder IDs visible to users

If temporary data is needed during development, mark it clearly and isolate it.