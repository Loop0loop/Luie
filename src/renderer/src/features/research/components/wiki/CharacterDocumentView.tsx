import { useTranslation } from "react-i18next";
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

  return (
    <NotionDocumentView
      properties={headerRows}
      sections={effectiveSections}
      getSectionContent={attrs.getSectionContent}
      setSections={attrs.setSections}
      setSectionContent={attrs.setSectionContent}
      bodyPlaceholder={t(
        "character.document.bodyPlaceholder",
        "# 제목 으로 섹션을 만들고 자유롭게 써보세요. 마크다운(##, -, **굵게**)을 사용할 수 있어요.",
      )}
    />
  );
}
