import { useMemo, useState, type ReactNode } from "react";
import {
  Grid2X2,
  List,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Check,
  SlidersHorizontal,
  Trash2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { DropdownMenu } from "radix-ui";
import type { LucideIcon } from "lucide-react";

type GalleryEntity = {
  id: string;
  name: string;
  description?: string | null;
};

type EntityGalleryProps<T extends GalleryEntity> = {
  groups: Record<string, T[]>;
  title: string;
  noDescriptionLabel: string;
  icon: LucideIcon;
  onSelect: (id: string) => void;
  onAdd?: () => void;
  onDelete?: (id: string) => void;
  onEdit?: (id: string) => void;
  query?: string;
  onQueryChange?: (query: string) => void;
  viewMode?: EntityGalleryViewMode;
  onViewModeChange?: (viewMode: EntityGalleryViewMode) => void;
  sortMode?: EntityGallerySortMode;
  onSortModeChange?: (sortMode: EntityGallerySortMode) => void;
  tabs?: ReactNode;
};

export type EntityGalleryViewMode = "grid" | "list";
export type EntityGallerySortMode = "group" | "alphabetical";

type EntityActionsProps = {
  entity: GalleryEntity;
  onDelete?: (id: string) => void;
  onEdit?: (id: string) => void;
  onSelect: (id: string) => void;
};

function EntityActions({
  entity,
  onDelete,
  onEdit,
  onSelect,
}: EntityActionsProps) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={`${entity.name} 메뉴`}
          className="flex size-7 items-center justify-center rounded-control text-subtle opacity-0 transition-opacity hover:bg-surface-hover hover:text-fg focus-visible:opacity-100 group-hover:opacity-100"
          onClick={(event) => event.stopPropagation()}
        >
          <MoreHorizontal className="icon-sm" aria-hidden="true" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          className="z-dropdown min-w-28 rounded-panel border border-border bg-panel p-1 shadow-panel"
          onClick={(event) => event.stopPropagation()}
          sideOffset={4}
        >
          <DropdownMenu.Item
            className="flex cursor-pointer items-center gap-2 rounded-control px-2.5 py-2 text-xs text-fg outline-none hover:bg-surface-hover focus:bg-surface-hover"
            onSelect={() => onSelect(entity.id)}
          >
            열기
          </DropdownMenu.Item>
          {onEdit ? (
            <DropdownMenu.Item
              className="flex cursor-pointer items-center gap-2 rounded-control px-2.5 py-2 text-xs text-fg outline-none hover:bg-surface-hover focus:bg-surface-hover"
              onSelect={() => onEdit(entity.id)}
            >
              <Pencil className="icon-xs text-muted" aria-hidden="true" />
              편집
            </DropdownMenu.Item>
          ) : null}
          {onDelete ? (
            <DropdownMenu.Item
              className="flex cursor-pointer items-center gap-2 rounded-control px-2.5 py-2 text-xs text-danger outline-none hover:bg-danger/10 focus:bg-danger/10"
              onSelect={() => onDelete(entity.id)}
            >
              <Trash2 className="icon-xs" aria-hidden="true" />
              삭제
            </DropdownMenu.Item>
          ) : null}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

/**
 * Shared card/list surface for Characters, Factions, and Events. Grouping is
 * retained for scanability; controls are intentionally contained in the panel
 * header so the writing surface remains visually quiet.
 */
export function EntityGallery<T extends GalleryEntity>({
  groups,
  title,
  noDescriptionLabel,
  icon: Icon,
  onSelect,
  onAdd,
  onDelete,
  onEdit,
  query: controlledQuery,
  onQueryChange,
  viewMode: controlledViewMode,
  onViewModeChange,
  sortMode: controlledSortMode,
  onSortModeChange,
  tabs,
}: EntityGalleryProps<T>) {
  const [uncontrolledQuery, setUncontrolledQuery] = useState("");
  const [uncontrolledViewMode, setUncontrolledViewMode] =
    useState<EntityGalleryViewMode>("grid");
  const [uncontrolledSortMode, setUncontrolledSortMode] =
    useState<EntityGallerySortMode>("group");
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const query = controlledQuery ?? uncontrolledQuery;
  const viewMode = controlledViewMode ?? uncontrolledViewMode;
  const sortMode = controlledSortMode ?? uncontrolledSortMode;

  const setQuery = (nextQuery: string) => {
    onQueryChange?.(nextQuery);
    if (controlledQuery === undefined) {
      setUncontrolledQuery(nextQuery);
    }
  };
  const setViewMode = (nextViewMode: EntityGalleryViewMode) => {
    onViewModeChange?.(nextViewMode);
    if (controlledViewMode === undefined) {
      setUncontrolledViewMode(nextViewMode);
    }
  };
  const setSortMode = (nextSortMode: EntityGallerySortMode) => {
    onSortModeChange?.(nextSortMode);
    if (controlledSortMode === undefined) {
      setUncontrolledSortMode(nextSortMode);
    }
  };

  const toggleGroupCollapse = (groupLabel: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupLabel]: !prev[groupLabel],
    }));
  };

  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filteredGroups = useMemo(
    () =>
      Object.entries(groups)
        .map(([label, entities]) => [
          label,
          entities.filter((entity) =>
            `${entity.name} ${entity.description ?? ""}`
              .toLocaleLowerCase()
              .includes(normalizedQuery),
          ),
        ] as const)
        .filter(([, entities]) => entities.length > 0),
    [groups, normalizedQuery],
  );

  const entityCount = useMemo(
    () => Object.values(groups).reduce((count, entities) => count + entities.length, 0),
    [groups],
  );

  const displayGroups = useMemo(() => {
    if (sortMode === "group") return filteredGroups;
    if (filteredGroups.length === 0) return [];
    return [
      [
        "가나다순",
        filteredGroups
          .flatMap(([, entities]) => entities)
          .sort((a, b) => a.name.localeCompare(b.name, "ko")),
      ],
    ] as const;
  }, [filteredGroups, sortMode]);

  const hasEntityActions = Boolean(onDelete || onEdit);

  return (
    <section
      className="flex h-full min-h-0 flex-1 flex-col bg-app"
      data-view-mode={viewMode}
    >
      {/* 1단 통합 툴바 헤더 (Single-deck Unified Toolbar) */}
      <header className="shrink-0 border-b border-border bg-sidebar/30 px-4">
        <div className="flex h-11 items-center justify-between gap-3">
          {/* Left: 서브 탭 & 카운트 */}
          <div className="flex items-center gap-2 min-w-0">
            {tabs ? (
              tabs
            ) : (
              <h2 className="min-w-0 truncate text-sm font-semibold text-fg">
                {title}
              </h2>
            )}
            <span className="rounded-full bg-element px-2 py-0.5 text-[11px] font-medium tabular-nums text-subtle">
              {entityCount}
            </span>
          </div>

          {/* Right: 검색 + 뷰 토글 + 정렬 + 추가 버튼 */}
          <div className="flex items-center gap-2">
            {/* Inline Compact Search */}
            <div className="relative flex h-7 items-center rounded-control border border-border/80 bg-element px-2 transition-all focus-within:border-accent focus-within:ring-1 focus-within:ring-accent w-32 sm:w-44">
              <Search className="icon-xs text-subtle shrink-0 mr-1.5" aria-hidden="true" />
              <input
                aria-label={`Search ${title}`}
                className="w-full bg-transparent text-xs text-fg outline-none placeholder:text-subtle"
                autoComplete="off"
                name="entity-search"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="검색..."
                type="search"
                value={query}
              />
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center rounded-control bg-element p-0.5 border border-border/60">
              <button
                type="button"
                aria-label="Grid view"
                aria-pressed={viewMode === "grid"}
                className={`flex size-6 items-center justify-center rounded-[5px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                  viewMode === "grid"
                    ? "bg-surface text-fg shadow-xs"
                    : "text-subtle hover:text-fg"
                }`}
                onClick={() => setViewMode("grid")}
              >
                <Grid2X2 className="icon-xs" aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label="List view"
                aria-pressed={viewMode === "list"}
                className={`flex size-6 items-center justify-center rounded-[5px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                  viewMode === "list"
                    ? "bg-surface text-fg shadow-xs"
                    : "text-subtle hover:text-fg"
                }`}
                onClick={() => setViewMode("list")}
              >
                <List className="icon-xs" aria-hidden="true" />
              </button>
            </div>

            {/* Sort Menu */}
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  type="button"
                  aria-label="정렬 옵션"
                  className="flex size-7 items-center justify-center rounded-control text-subtle transition-colors hover:bg-surface-hover hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <SlidersHorizontal className="icon-xs" aria-hidden="true" />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="end"
                  className="z-dropdown min-w-32 rounded-panel border border-border bg-panel p-1 shadow-panel"
                  sideOffset={4}
                >
                  {[
                    ["group", "그룹별 보기"],
                    ["alphabetical", "가나다순"],
                  ].map(([mode, label]) => (
                    <DropdownMenu.Item
                      key={mode}
                      className="flex cursor-pointer items-center gap-2 rounded-control px-2.5 py-2 text-xs text-fg outline-none hover:bg-surface-hover focus:bg-surface-hover"
                      onSelect={() => setSortMode(mode as EntityGallerySortMode)}
                    >
                      <Check
                        className={`icon-xs ${sortMode === mode ? "opacity-100" : "opacity-0"}`}
                        aria-hidden="true"
                      />
                      {label}
                    </DropdownMenu.Item>
                  ))}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>

            {/* Primary Add Button */}
            {onAdd ? (
              <button
                type="button"
                className="inline-flex h-7 items-center gap-1 rounded-control bg-accent px-2.5 text-xs font-medium text-accent-fg transition-colors hover:bg-accent-bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent shadow-xs"
                onClick={onAdd}
              >
                <Plus className="icon-xs" aria-hidden="true" />
                <span>추가</span>
              </button>
            ) : null}
          </div>
        </div>
      </header>

      {/* Main Responsive Grid & Content Canvas */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-6xl px-4 py-5 md:px-6 md:py-6">
          {displayGroups.length > 0 ? (
            displayGroups.map(([label, entities]) => {
              const isCollapsed = collapsedGroups[label];
              return (
                <section key={label} className="mb-8 last:mb-0">
                  {/* Section Collapsible Header */}
                  <button
                    type="button"
                    onClick={() => toggleGroupCollapse(label)}
                    className="group mb-3.5 flex items-center gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-control py-0.5 px-1 -ml-1 transition-colors hover:bg-surface-hover"
                  >
                    {isCollapsed ? (
                      <ChevronRight className="icon-xs text-subtle transition-transform group-hover:text-fg" aria-hidden="true" />
                    ) : (
                      <ChevronDown className="icon-xs text-subtle transition-transform group-hover:text-fg" aria-hidden="true" />
                    )}
                    <h3 className="text-xs font-semibold text-fg tracking-tight">
                      {label}
                    </h3>
                    <span className="rounded-full bg-element px-1.5 py-0.5 text-[10px] font-medium text-subtle tabular-nums">
                      {entities.length}
                    </span>
                  </button>

                  {!isCollapsed && (
                    <>
                      {viewMode === "grid" ? (
                        <div className="grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-4">
                          {entities.map((entity) => (
                            <article
                              key={entity.id}
                              className="group relative overflow-hidden rounded-panel border border-border/70 bg-surface shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-border-active hover:shadow-md active:scale-[0.99] active:shadow-xs"
                            >
                              <button
                                type="button"
                                data-entity-id={entity.id}
                                className="block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
                                onClick={(event) => {
                                  event.currentTarget.blur();
                                  onSelect(entity.id);
                                }}
                              >
                                {/* Card Aspect Banner & Initials Badge */}
                                <div className="relative flex aspect-[16/9] items-center justify-center bg-gradient-to-br from-element via-surface-hover to-element/50 border-b border-border/40">
                                  <div className="flex size-10 items-center justify-center rounded-full bg-surface/90 shadow-xs border border-border/40 text-accent transition-transform duration-200 group-hover:scale-105">
                                    <Icon className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
                                  </div>
                                </div>
                                <div className="p-3">
                                  <span className="block truncate text-xs font-semibold text-fg group-hover:text-accent transition-colors">
                                    {entity.name}
                                  </span>
                                  <span className="mt-1 block truncate text-[11px] text-subtle">
                                    {entity.description || noDescriptionLabel}
                                  </span>
                                </div>
                              </button>
                              {hasEntityActions ? (
                                <div className="absolute right-1.5 top-1.5">
                                  <EntityActions
                                    entity={entity}
                                    onDelete={onDelete}
                                    onEdit={onEdit}
                                    onSelect={onSelect}
                                  />
                                </div>
                              ) : null}
                            </article>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {entities.map((entity) => (
                            <article
                              key={entity.id}
                              className="group flex items-center gap-3 rounded-panel border border-transparent px-3 py-2 transition-colors hover:border-border/60 hover:bg-surface-hover hover:shadow-xs active:bg-surface-hover/80"
                            >
                              <button
                                type="button"
                                data-entity-id={entity.id}
                                className="flex min-w-0 flex-1 items-center gap-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
                                onClick={(event) => {
                                  event.currentTarget.blur();
                                  onSelect(entity.id);
                                }}
                              >
                                <span className="flex size-8 shrink-0 items-center justify-center rounded-control bg-element text-accent border border-border/40">
                                  <Icon className="icon-sm" strokeWidth={1.5} aria-hidden="true" />
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-xs font-medium text-fg group-hover:text-accent transition-colors">
                                    {entity.name}
                                  </span>
                                  <span className="mt-0.5 block truncate text-[11px] text-subtle">
                                    {entity.description || noDescriptionLabel}
                                  </span>
                                </span>
                              </button>
                              {hasEntityActions ? (
                                <EntityActions
                                  entity={entity}
                                  onDelete={onDelete}
                                  onEdit={onEdit}
                                  onSelect={onSelect}
                                />
                              ) : null}
                            </article>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </section>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Search className="h-8 w-8 text-subtle/50 mb-2" strokeWidth={1.25} />
              <p className="text-xs font-medium text-muted">
                검색 결과가 없습니다.
              </p>
              <p className="text-[11px] text-subtle mt-1">
                다른 검색어를 입력하시거나 필터를 변경해보세요.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

