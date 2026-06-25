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
};

export function EntityGallery<T extends GalleryEntity>({
  groups,
  title,
  noDescriptionLabel,
  icon: Icon,
  onSelect,
}: EntityGalleryProps<T>) {
  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="border-b-2 border-border mb-6 pb-4">
        <div className="text-2xl font-extrabold text-fg leading-tight">
          {title}
        </div>
      </div>

      {Object.entries(groups).map(([group, entities]) => (
        <div key={group} className="mb-8">
          <div className="text-lg font-bold mb-4 pb-2 border-b-2 text-accent border-b-accent">
            {group}
          </div>

          <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-6">
            {entities.map((entity) => (
              <div
                key={entity.id}
                className="flex flex-col cursor-pointer hover:bg-surface-hover p-2 rounded transition-colors"
                onClick={() => onSelect(entity.id)}
              >
                <div className="w-full h-32 bg-surface flex items-center justify-center border-b mb-2 rounded border-accent">
                  <Icon size={40} className="text-accent" />
                </div>
                <div className="font-semibold text-sm mb-0.5">
                  {entity.name}
                </div>
                <div className="text-xs text-subtle">
                  {entity.description || noDescriptionLabel}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
