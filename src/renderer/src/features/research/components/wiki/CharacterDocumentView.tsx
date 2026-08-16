import { useTranslation } from "react-i18next";
import { User } from "lucide-react";
import { BufferedInput } from "@shared/ui/BufferedInput";
import NotionDocumentView, {
  type DocumentPropertyRow,
} from "@renderer/features/research/components/shared/NotionDocumentView";
import { useEffectiveCharacterSections } from "./hooks/useEffectiveCharacterSections";
import type { CharacterWikiAttrs } from "./hooks/useCharacterWikiAttrs";

export type { DocumentPropertyRow };

type CharacterDocumentViewProps = {
  classification: string;
  description: string;
  onDescriptionSave: (value: string) => void;
  properties: DocumentPropertyRow[];
  attrs: CharacterWikiAttrs;
};

export function CharacterDocumentView({
  classification,
  description,
  onDescriptionSave,
  properties,
  attrs,
}: CharacterDocumentViewProps) {
  const { t } = useTranslation();

  const effectiveSections = useEffectiveCharacterSections(attrs.sections);

  const headerRows: DocumentPropertyRow[] = [
    {
      label: t("character.classificationLabel"),
      readonlyValue: classification,
    },
    {
      label: t("character.wiki.descriptionLabel", "설명"),
      value: description,
      placeholder: t("character.uncategorized"),
      onSave: onDescriptionSave,
    },
    ...properties,
  ];

  const pageHeader = (
    <div className="flex items-center gap-3.5 pb-1">
      <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-panel bg-element text-muted border border-border/70 shadow-2xs">
        {attrs.generatedImage ? (
          <img src={attrs.generatedImage} alt="" className="h-full w-full object-cover" />
        ) : (
          <User size={20} />
        )}
      </div>
      <BufferedInput
        value={attrs.tagline}
        placeholder="이 인물을 한 마디로 표현한다면..."
        onSave={attrs.setTagline}
        className="flex-1 min-w-0 border-none bg-transparent p-0 text-sm font-medium italic text-fg/80 focus:outline-none placeholder:text-muted/40 font-serif"
      />
    </div>
  );

  return (
    <NotionDocumentView
      properties={headerRows}
      sections={effectiveSections}
      getSectionContent={attrs.getSectionContent}
      setSections={attrs.setSections}
      setSectionContent={attrs.setSectionContent}
      header={pageHeader}
      bodyPlaceholder={t(
        "character.document.bodyPlaceholder",
        "이 섹션을 자유롭게 채워보세요…",
      )}
    />
  );
}
