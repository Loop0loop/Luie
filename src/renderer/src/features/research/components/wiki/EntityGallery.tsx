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
      <header className="shrink-0 border-b border-border bg-sidebar/40">
        <div className="flex h-11 items-center gap-3 px-4">
          {tabs ? (
            <>
              {tabs}
              <span className="text-xs tabular-nums text-subtle">{entityCount}</span>
            </>
          ) : (
            <>
              <h2 className="min-w-0 truncate text-sm font-semibold text-fg">
                {title}
              </h2>
              <span className="text-xs tabular-nums text-subtle">{entityCount}</span>
            </>
          )}
          <div className="ml-auto flex items-center rounded-control bg-element p-0.5">
            <button
              type="button"
              aria-label="Grid view"
              aria-pressed={viewMode === "grid"}
              className={`flex size-7 items-center justify-center rounded-[6px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                viewMode === "grid"
                  ? "bg-active text-fg"
                  : "text-subtle hover:text-fg"
              }`}
              onClick={() => setViewMode("grid")}
            >
              <Grid2X2 className="icon-sm" aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="List view"
              aria-pressed={viewMode === "list"}
              className={`flex size-7 items-center justify-center rounded-[6px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                viewMode === "list"
                  ? "bg-active text-fg"
                  : "text-subtle hover:text-fg"
              }`}
              onClick={() => setViewMode("list")}
            >
              <List className="icon-sm" aria-hidden="true" />
            </button>
          </div>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                type="button"
                aria-label="정렬 옵션"
                className="ml-1 flex size-7 items-center justify-center rounded-control text-subtle transition-colors hover:bg-surface-hover hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <SlidersHorizontal className="icon-sm" aria-hidden="true" />
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
          {onAdd ? (
            <button
              type="button"
              className="ml-1 inline-flex h-7 items-center gap-1.5 rounded-control bg-element px-2 text-xs font-medium text-fg transition-colors hover:bg-element-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              onClick={onAdd}
            >
              <Plus className="icon-xs" aria-hidden="true" />
              추가
            </button>
          ) : null}
        </div>
        <label className="flex h-12 items-center gap-2 border-t border-border px-4 text-subtle">
          <Search className="icon-sm shrink-0" aria-hidden="true" />
          <input
            aria-label={`Search ${title}`}
            className="min-w-0 flex-1 bg-transparent text-xs text-fg outline-none placeholder:text-subtle"
            autoComplete="off"
            name="entity-search"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="검색..."
            type="search"
            value={query}
          />
        </label>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {displayGroups.length > 0 ? (
          displayGroups.map(([label, entities]) => (
            <section key={label} className="mb-6 last:mb-0">
              <div className="mb-3 flex items-center gap-2">
                <h3 className="text-[11px] font-medium tracking-wide text-subtle">
                  {label}
                </h3>
                <span className="rounded-[5px] bg-element px-1.5 py-0.5 text-[10px] text-subtle">
                  {entities.length}
                </span>
              </div>
              {viewMode === "grid" ? (
                <div className="grid grid-cols-2 gap-2.5">
                  {entities.map((entity) => (
                    <article
                      key={entity.id}
                      className="group relative overflow-hidden rounded-[8px] bg-surface"
                    >
                      <button
                        type="button"
                        data-entity-id={entity.id}
                        className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
                        onClick={() => onSelect(entity.id)}
                      >
                        <div className="flex aspect-[4/3] items-center justify-center bg-element text-subtle">
                          <Icon className="h-7 w-7" strokeWidth={1.25} aria-hidden="true" />
                        </div>
                        <div className="px-2.5 py-2">
                          <span className="block truncate text-[13px] font-medium text-fg">
                            {entity.name}
                          </span>
                          <span className="mt-0.5 block truncate text-[11px] text-subtle">
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
                <div className="space-y-1">
                  {entities.map((entity) => (
                    <article key={entity.id} className="group flex items-center gap-3 rounded-[8px] px-2 py-2 hover:bg-surface-hover">
                      <button
                        type="button"
                        data-entity-id={entity.id}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
                        onClick={() => onSelect(entity.id)}
                      >
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-[6px] bg-element text-subtle">
                          <Icon className="icon-sm" strokeWidth={1.25} aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-medium text-fg">
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
            </section>
          ))
        ) : (
          <p className="py-10 text-center text-xs text-subtle">
            검색 결과가 없습니다.
          </p>
        )}
      </div>
    </section>
  );
}
