import type { ScrapMemo } from "@shared/types";

type NotesViewProps = {
  currentProjectId: string | null;
  notesLoading: boolean;
  notesSaving: boolean;
  activeNote: ScrapMemo | null;
  onCreateNote: () => void;
  onUpdateNote: (noteId: string, updates: Partial<Omit<ScrapMemo, "id">>) => void;
  onDeleteNote: (noteId: string) => void;
  onSaveNow: () => void;
};

export function NotesView({
  currentProjectId,
  notesLoading,
  notesSaving,
  activeNote,
  onCreateNote,
  onUpdateNote,
  onDeleteNote,
  onSaveNow,
}: NotesViewProps) {
  if (!currentProjectId) {
    return (
      <div className="flex h-full items-center justify-center bg-[#0f1319] px-8">
        <div className="max-w-md rounded-[24px] border border-dashed border-border/60 bg-white/5 px-6 py-8 text-center text-sm text-fg/65">
          프로젝트를 열면 스크랩 노트가 여기에서 편집됩니다.
        </div>
      </div>
    );
  }

  if (notesLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-[#0f1319] text-sm text-fg/65">
        노트를 불러오는 중입니다...
      </div>
    );
  }

  if (!activeNote) {
    return (
      <div className="flex h-full items-center justify-center bg-[#0f1319] px-8">
        <div className="max-w-md rounded-[24px] border border-dashed border-border/60 bg-white/5 px-6 py-8 text-center">
          <p className="text-sm text-fg/70">아직 노트가 없습니다.</p>
          <button
            type="button"
            onClick={onCreateNote}
            className="mt-5 rounded-xl border border-border/60 bg-white/10 px-4 py-2 text-sm text-fg transition hover:bg-white/15"
          >
            첫 노트 만들기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-[#0f1319]">
      <div className="mx-auto flex max-w-4xl flex-col px-10 py-10">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex flex-1 flex-wrap items-center gap-2 rounded-2xl border border-border/60 bg-[#161a21] px-4 py-3">
            <span className="text-xs text-fg/45">태그</span>
            <input
              value={activeNote.tags.join(", ")}
              onChange={(event) =>
                onUpdateNote(activeNote.id, {
                  tags: event.target.value
                    .split(",")
                    .map((tag) => tag.trim())
                    .filter(Boolean),
                })
              }
              className="min-w-[240px] flex-1 bg-transparent text-sm text-fg outline-none"
              placeholder="예: 떡밥, 시즌1, 설정"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onSaveNow}
              className="rounded-xl border border-border/60 bg-white/10 px-4 py-2 text-sm text-fg transition hover:bg-white/15"
            >
              {notesSaving ? "저장 중..." : "지금 저장"}
            </button>
            <button
              type="button"
              onClick={() => onDeleteNote(activeNote.id)}
              className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-2 text-sm text-red-200 transition hover:bg-red-500/15"
            >
              삭제
            </button>
          </div>
        </div>

        <input
          value={activeNote.title}
          onChange={(event) =>
            onUpdateNote(activeNote.id, { title: event.target.value })
          }
          className="border-none bg-transparent pb-4 text-4xl font-semibold tracking-tight text-fg outline-none"
          placeholder="노트 제목"
        />

        <textarea
          value={activeNote.content}
          onChange={(event) =>
            onUpdateNote(activeNote.id, { content: event.target.value })
          }
          className="min-h-[560px] w-full resize-none border-none bg-transparent text-base leading-8 text-fg/85 outline-none"
          placeholder="설정, 메모, 장면 아이디어를 자유롭게 적으세요."
        />
      </div>
    </div>
  );
}
