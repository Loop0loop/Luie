import { Search, Plus, Filter, MoreHorizontal, FileText, Image as ImageIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

const MOCK_ENTITIES = [
  { id: 1, name: "아르웬", type: "Character", tags: ["주연", "전사"], updatedAt: "2026-03-12" },
  { id: 2, name: "리아", type: "Character", tags: ["주연", "마법사"], updatedAt: "2026-03-11" },
  { id: 3, name: "마왕", type: "Character", tags: ["반동인물", "보스"], updatedAt: "2026-03-10" },
  { id: 4, name: "왕도", type: "Place", tags: ["수도", "시작점"], updatedAt: "2026-03-09" },
  { id: 5, name: "안개 계곡", type: "Place", tags: ["격전지"], updatedAt: "2026-03-09" },
];

export function EntityMainView() {
  const { t } = useTranslation();

  return (
    <div className="flex h-full w-full flex-col bg-app">
      {/* Header / Toolbar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/40 shrink-0">
        <h2 className="text-sm font-semibold text-fg">Entity Database</h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted" />
            <input
              type="text"
              placeholder="Search entities..."
              className="w-64 rounded-md border border-border/60 bg-element pl-8 pr-3 py-1.5 text-xs text-fg placeholder:text-muted focus:border-accent focus:outline-none"
            />
          </div>
          <button className="flex items-center gap-1.5 rounded-md border border-border/60 bg-element px-3 py-1.5 text-xs text-muted hover:bg-element-hover hover:text-fg transition-colors">
            <Filter className="h-3.5 w-3.5" />
            Filter
          </button>
          <button className="flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-fg hover:bg-accent/90 transition-colors">
            <Plus className="h-3.5 w-3.5" />
            New Entity
          </button>
        </div>
      </div>

      {/* Main Content: Table View */}
      <div className="flex-1 overflow-auto p-6">
        <div className="rounded-lg border border-border/40 bg-element/20 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border/40 bg-element/50 text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Tags</th>
                <th className="px-4 py-3 font-medium">Last Modified</th>
                <th className="px-4 py-3 font-medium w-[50px]"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20 text-fg">
              {MOCK_ENTITIES.map((entity) => (
                <tr key={entity.id} className="hover:bg-element/50 transition-colors group cursor-pointer">
                  <td className="px-4 py-3 font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted" />
                    {entity.name}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full bg-border/40 px-2 py-0.5 text-[11px] text-muted">
                      {entity.type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      {entity.tags.map((tag) => (
                        <span key={tag} className="inline-flex items-center rounded text-muted border border-border px-1.5 py-0.5 text-[10px]">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted text-xs">{entity.updatedAt}</td>
                  <td className="px-4 py-3 text-right">
                    <button className="p-1 rounded-md text-muted hover:bg-border/60 hover:text-fg opacity-0 group-hover:opacity-100 transition-all">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}