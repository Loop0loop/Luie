import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
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
  X,
} from "lucide-react";
import { DropdownMenu } from "radix-ui";
import type { LucideIcon } from "lucide-react";
import { parseStructuredAttributes } from "@renderer/features/research/utils/parseStructuredAttributes";

type GalleryEntity = {
  id: string;
  name: string;
  description?: string | null;
  attributes?: unknown;
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
  onClose?: () => void;
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
            className="flex cursor-pointer items-center gap-2 rounded-control px-2.5 py-2 text-xs text-fg outline-hidden hover:bg-surface-hover focus:bg-surface-hover"
            onSelect={() => onSelect(entity.id)}
          >
            열기
          </DropdownMenu.Item>
          {onEdit ? (
            <DropdownMenu.Item
              className="flex cursor-pointer items-center gap-2 rounded-control px-2.5 py-2 text-xs text-fg outline-hidden hover:bg-surface-hover focus:bg-surface-hover"
              onSelect={() => onEdit(entity.id)}
            >
              <Pencil className="icon-xs text-muted" aria-hidden="true" />
              편집
            </DropdownMenu.Item>
          ) : null}
          {onDelete ? (
            <DropdownMenu.Item
              className="flex cursor-pointer items-center gap-2 rounded-control px-2.5 py-2 text-xs text-danger outline-hidden hover:bg-danger/10 focus:bg-danger/10"
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
  onClose,
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
      className="flex h-full min-h-0 flex-1 flex-col bg-research"
      data-view-mode={viewMode}
    >
      <header
        className="@container shrink-0 bg-sidebar px-4"
        style={{ WebkitAppRegion: "drag" } as CSSProperties}
      >
        <div
          className="flex min-h-11 flex-wrap items-center gap-2 py-2"
          style={{ WebkitAppRegion: "no-drag" } as CSSProperties}
        >
          <div className="flex min-w-0 flex-1 items-center gap-2">
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

          <div className="flex max-w-full flex-wrap items-center justify-end gap-1.5">
            <div className="relative flex h-7 w-28 min-w-0 items-center rounded-control border border-border-strong bg-element px-2 transition-all focus-within:border-accent focus-within:ring-2 focus-within:ring-accent sm:w-44">
              <Search className="icon-xs text-subtle shrink-0 mr-1.5" aria-hidden="true" />
              <input
                aria-label={`Search ${title}`}
                className="w-full bg-transparent text-xs text-fg outline-hidden placeholder:text-subtle"
                autoComplete="off"
                name="entity-search"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="검색..."
                type="search"
                value={query}
              />
            </div>

            <div className="flex items-center rounded-control bg-element p-0.5 border border-border">
              <button
                type="button"
                aria-label="Grid view"
                aria-pressed={viewMode === "grid"}
                className={`flex size-6 items-center justify-center rounded-[5px] transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring ${
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
                className={`flex size-6 items-center justify-center rounded-[5px] transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring ${
                  viewMode === "list"
                    ? "bg-surface text-fg shadow-xs"
                    : "text-subtle hover:text-fg"
                }`}
                onClick={() => setViewMode("list")}
              >
                <List className="icon-xs" aria-hidden="true" />
              </button>
            </div>

            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  type="button"
                  aria-label="정렬 옵션"
                  className="flex size-7 items-center justify-center rounded-control text-subtle transition-colors hover:bg-surface-hover hover:text-fg focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
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
                      className="flex cursor-pointer items-center gap-2 rounded-control px-2.5 py-2 text-xs text-fg outline-hidden hover:bg-surface-hover focus:bg-surface-hover"
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
                className="inline-flex h-7 items-center gap-1 rounded-control bg-accent px-2.5 text-xs font-medium text-accent-fg transition-colors hover:bg-accent-bg-hover focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring shadow-control"
                onClick={onAdd}
              >
                <Plus className="icon-xs" aria-hidden="true" />
                <span>추가</span>
              </button>
            ) : null}
            {onClose ? (
              <button
                type="button"
                onClick={onClose}
                className="flex size-7 items-center justify-center rounded-control text-subtle transition-colors hover:bg-surface-hover hover:text-fg focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="닫기"
                title="닫기"
              >
                <X className="icon-xs" />
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-6xl px-4 py-5 md:px-6 md:py-6">
          {displayGroups.length > 0 ? (
            displayGroups.map(([label, entities]) => {
              const isCollapsed = collapsedGroups[label];
              return (
                <section key={label} className="mb-8 last:mb-0">
                  <button
                    type="button"
                    onClick={() => toggleGroupCollapse(label)}
                    className="group mb-3.5 flex items-center gap-2 text-left focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring rounded-control py-0.5 px-1 -ml-1 transition-colors hover:bg-surface-hover"
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
                        <div className="grid grid-cols-[repeat(auto-fill,minmax(175px,190px))] gap-3">
                          {entities.map((entity) => {
                            const attrs = entity.attributes
                              ? parseStructuredAttributes(entity.attributes)
                              : {};
                            const color = (attrs.characterColor as string) || undefined;
                            const image = (attrs.generatedImage as string) || undefined;
                            const roles = (attrs.roles as string[]) || [];

                            return (
                              <article
                                key={entity.id}
                                /* NOTE: rest에 장식선, hover에 상태선을 쓰는 정규 카드 패턴이다.
                                   이전에는 어두운 hex를 하드코딩해 light·sepia에서 검은 outline이
                                   떴다. `.research-surface`가 border token을 더는 평탄화하지
                                   않으므로 token이 그대로 동작한다. */
                                className="group relative flex flex-col items-center overflow-hidden rounded-panel border border-border bg-surface p-3 shadow-xs transition-colors duration-150 hover:border-border-active hover:shadow-md active:scale-[0.99]"
                              >
                                <button
                                  type="button"
                                  data-entity-id={entity.id}
                                  className="flex flex-col items-center w-full flex-1 text-center focus:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                                  onClick={(event) => {
                                    event.currentTarget.blur();
                                    onSelect(entity.id);
                                  }}
                                >
                                  {/* Profile Avatar Header */}
                                  <div className="relative mb-2.5 flex items-center justify-center">
                                    {image ? (
                                      <div className="size-13 overflow-hidden rounded-full border-2 border-border shadow-xs ring-2 ring-element">
                                        <img
                                          src={image}
                                          alt={entity.name}
                                          loading="lazy"
                                          decoding="async"
                                          className="h-full w-full object-cover"
                                        />
                                      </div>
                                    ) : (
                                      <div
                                        className="flex size-13 items-center justify-center rounded-full bg-element border-2 shadow-xs text-muted transition-colors group-hover:text-accent"
                                        style={{
                                          borderColor: color ? `${color}60` : "var(--color-border)",
                                        }}
                                      >
                                        <Icon className="size-6" strokeWidth={1.5} aria-hidden="true" />
                                      </div>
                                    )}

                                    {color && (
                                      <span
                                        className="absolute bottom-0 right-0 size-2.5 rounded-full ring-2 ring-surface"
                                        style={{ backgroundColor: color }}
                                        title={`Theme: ${color}`}
                                      />
                                    )}
                                  </div>

                                  {/* Name */}
                                  <span className="block w-full truncate text-xs font-semibold text-fg group-hover:text-accent transition-colors">
                                    {entity.name}
                                  </span>

                                  {/* Role / Classification Badge */}
                                  <div className="mt-1 flex items-center justify-center gap-1 flex-wrap w-full">
                                    {roles.length > 0 ? (
                                      roles.slice(0, 1).map((role) => (
                                        <span
                                          key={role}
                                          className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-element border border-border text-[10px] font-medium text-muted truncate max-w-full"
                                        >
                                          {role}
                                        </span>
                                      ))
                                    ) : (
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-element/50 border border-border text-[10px] text-subtle truncate max-w-full">
                                        {entity.description || noDescriptionLabel}
                                      </span>
                                    )}
                                  </div>

                                  {/* Description (if role was displayed) */}
                                  {roles.length > 0 && entity.description && (
                                    <p className="mt-1.5 line-clamp-2 text-[10px] leading-relaxed text-subtle w-full">
                                      {entity.description}
                                    </p>
                                  )}
                                </button>

                                {hasEntityActions ? (
                                  <div className="absolute right-1.5 top-1.5 z-10">
                                    <EntityActions
                                      entity={entity}
                                      onDelete={onDelete}
                                      onEdit={onEdit}
                                      onSelect={onSelect}
                                    />
                                  </div>
                                ) : null}
                              </article>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {entities.map((entity) => {
                            const attrs = entity.attributes
                              ? parseStructuredAttributes(entity.attributes)
                              : {};
                            const color = (attrs.characterColor as string) || undefined;
                            const image = (attrs.generatedImage as string) || undefined;
                            const roles = (attrs.roles as string[]) || [];

                            return (
                              <article
                                key={entity.id}
                                className="group flex items-center gap-3.5 rounded-panel border border-border bg-surface px-4 py-3 shadow-2xs hover:border-border-active hover:bg-surface hover:shadow-xs active:bg-surface-hover transition-colors duration-150"
                              >
                                <button
                                  type="button"
                                  data-entity-id={entity.id}
                                  className="flex min-w-0 flex-1 items-center gap-3.5 text-left focus:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                                  onClick={(event) => {
                                    event.currentTarget.blur();
                                    onSelect(entity.id);
                                  }}
                                >
                                  {image ? (
                                    <img
                                      src={image}
                                      alt=""
                                      loading="lazy"
                                      decoding="async"
                                      className="size-10 shrink-0 rounded-full object-cover border border-border"
                                    />
                                  ) : (
                                    <span
                                      className="flex size-10 shrink-0 items-center justify-center rounded-full bg-element shadow-2xs border text-muted transition-colors group-hover:text-accent"
                                      style={{
                                        borderColor: color ? `${color}50` : "var(--color-border)",
                                      }}
                                    >
                                      <Icon
                                        className="size-5"
                                        strokeWidth={1.5}
                                        aria-hidden="true"
                                      />
                                    </span>
                                  )}

                                  <span className="min-w-0 flex-1">
                                    <span className="flex items-center gap-2">
                                      <span className="block truncate text-xs font-semibold text-fg group-hover:text-accent transition-colors">
                                        {entity.name}
                                      </span>
                                      {color && (
                                        <span
                                          className="size-1.5 rounded-full shrink-0"
                                          style={{ backgroundColor: color }}
                                        />
                                      )}
                                      {roles.length > 0 && (
                                        <span className="hidden sm:inline-flex items-center px-1.5 py-0.2 rounded-full bg-element border border-border text-[10px] font-medium text-muted">
                                          {roles[0]}
                                        </span>
                                      )}
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
                            );
                          })}
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
