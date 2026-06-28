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
  /** Character signature colour (hex). */
  accentColor?: string;
};

/**
 * Character wrapper around the shared Notion-style document view. Builds the
 * header property rows (classification / description / infobox fields) and
 * delegates rendering + body editing to NotionDocumentView.
 */
export function CharacterDocumentView({
  classification,
  description,
  onDescriptionSave,
  properties,
  attrs,
  accentColor,
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

  const color = accentColor ?? attrs.characterColor;

  const pageHeader = (
    <div className="flex items-center gap-3">
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full"
        style={{ backgroundColor: `${color}1a`, border: `1px solid ${color}33` }}
      >
        {attrs.generatedImage ? (
          <img src={attrs.generatedImage} alt="" className="h-full w-full object-cover" />
        ) : (
          <User size={22} color={color} />
        )}
      </div>
      <BufferedInput
        value={attrs.tagline}
        placeholder="이 인물을 한 마디로 표현한다면..."
        onSave={attrs.setTagline}
        className="flex-1 min-w-0 border-none bg-transparent p-0 text-[15px] italic text-fg/70 focus:outline-none placeholder:text-subtle"
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
      accentColor={color}
      bodyPlaceholder={t(
        "character.document.bodyPlaceholder",
        "이 섹션을 자유롭게 채워보세요…",
      )}
    />
  );
}
