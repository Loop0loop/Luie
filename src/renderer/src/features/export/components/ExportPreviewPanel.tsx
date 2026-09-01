/**
 * NOTE : no i18n key
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  FileText,
  Download,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Underline,
  Search,
  ChevronDown,
  Save,
  Undo,
  Redo,
  Palette,
  Globe
} from "lucide-react";
import { cn } from '@shared/types/utils';
import { useDialog } from '@shared/ui/useDialog';

interface ExportPreviewPanelProps {
  title?: string;
  onClose?: () => void;
}

type ExportFormat = "hwp" | "word";

export default function ExportPreviewPanel({ title }: ExportPreviewPanelProps) {
  const { t } = useTranslation();
  const dialog = useDialog();
  const resolvedTitle = title ?? t("exportPreview.defaultTitle");
  const [format, setFormat] = useState<ExportFormat>("hwp");

  const handleExport = () => {
    // TODO: export API와 연결해 선택한 format으로 실제 파일을 생성한다.
    const ext = format === "hwp" ? "hwp" : "docx";
    dialog.toast(t("exportPreview.alertExport", { ext }), "info");
  };

  const hwpMenuItems = [
    t("exportPreview.hwp.menu.file"),
    t("exportPreview.hwp.menu.edit"),
    t("exportPreview.hwp.menu.view"),
    t("exportPreview.hwp.menu.input"),
    t("exportPreview.hwp.menu.format"),
    t("exportPreview.hwp.menu.page"),
    t("exportPreview.hwp.menu.security"),
    t("exportPreview.hwp.menu.review"),
    t("exportPreview.hwp.menu.tools"),
  ];

  const wordTabs = [
    t("exportPreview.word.tabs.file"),
    t("exportPreview.word.tabs.home"),
    t("exportPreview.word.tabs.insert"),
    t("exportPreview.word.tabs.draw"),
    t("exportPreview.word.tabs.layout"),
    t("exportPreview.word.tabs.references"),
    t("exportPreview.word.tabs.review"),
    t("exportPreview.word.tabs.view"),
    t("exportPreview.word.tabs.help"),
  ];

  return (
    <div className="flex flex-col h-full bg-panel text-fg overflow-hidden relative border-l border-border">
      <div className="flex items-center justify-between px-4 py-3 bg-secondary border-b border-border shrink-0">
        <div className="flex items-center gap-2 bg-input/50 p-1 rounded-panel border border-border">
          <button
            className={cn(
              "px-3 py-1.5 rounded-control text-xs font-medium transition-all flex items-center gap-1.5",
              format === "hwp" ? "bg-surface text-accent shadow-control" : "text-muted hover:text-fg"
            )}
            onClick={() => setFormat("hwp")}
          >
            <span className="font-bold">{t("exportPreview.format.hwpShort")}</span> {t("exportPreview.format.hwp")}
          </button>
          <button
            className={cn(
              "px-3 py-1.5 rounded-control text-xs font-medium transition-all flex items-center gap-1.5",
              format === "word" ? "bg-surface text-accent shadow-control" : "text-muted hover:text-fg"
            )}
            onClick={() => setFormat("word")}
          >
            <FileText className="w-3.5 h-3.5" /> {t("exportPreview.format.word")}
          </button>
        </div>

        <button
          className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-on-accent rounded-control text-xs font-medium hover:brightness-110 transition-all shadow-control"
          onClick={handleExport}
        >
          <Download className="w-3.5 h-3.5" />
          {t("exportPreview.action.export")}
        </button>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden relative">
        {format === "hwp" ? (
          <div className="flex flex-col h-full bg-[var(--hwp-toolbar-bg)]">
            <div className="bg-[var(--hwp-titlebar-bg)] text-white px-2 py-1 text-[10px] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold">{t("exportPreview.hwp.appTitle")}</span>
                <span className="opacity-80 mx-1">|</span>
                <span>{resolvedTitle}.hwp</span>
              </div>
              <div className="flex gap-1.5">
                <Undo className="w-3 h-3 opacity-80" />
                <Redo className="w-3 h-3 opacity-80" />
                <Save className="w-3 h-3 opacity-80" />
              </div>
            </div>

            <div className="bg-white border-b border-[var(--hwp-toolbar-border)] flex text-[11px] text-[var(--hwp-menubar-text)]">
              {hwpMenuItems.map((menu) => (
                <div key={menu} className="px-3 py-1.5 hover:bg-[var(--hwp-menubar-hover)] cursor-default">{menu}</div>
              ))}
            </div>

            <div className="bg-[var(--hwp-toolbar-bg)] border-b border-[var(--hwp-toolbar-border)] p-1 flex items-center gap-1 shrink-0 overflow-x-auto whitespace-nowrap">
              <div className="flex items-center gap-1 bg-white border border-[var(--hwp-toolbar-border)] rounded-xs px-1 py-0.5">
                <div className="w-3 h-3 bg-[var(--hwp-toolbar-icon)] rounded-xs opacity-50" />
                <span className="text-[11px] font-medium text-[var(--hwp-toolbar-control-text)] px-1 min-w-12.5">{t("exportPreview.hwp.toolbar.baseStyle")}</span>
                <ChevronDown className="w-3 h-3 text-[var(--hwp-toolbar-icon)]" />
              </div>
              <div className="w-px h-4 bg-[var(--hwp-toolbar-border)] mx-1" />

              <div className="flex items-center gap-1 bg-white border border-[var(--hwp-toolbar-border)] rounded-xs px-1 py-0.5">
                <span className="text-[11px] font-medium text-[var(--hwp-toolbar-control-text)] px-1 min-w-17.5">{t("exportPreview.hwp.toolbar.fontName")}</span>
                <ChevronDown className="w-3 h-3 text-[var(--hwp-toolbar-icon)]" />
              </div>

              <div className="flex items-center gap-1 bg-white border border-[var(--hwp-toolbar-border)] rounded-xs px-1 py-0.5 ml-1">
                <span className="text-[11px] font-medium text-[var(--hwp-toolbar-control-text)] px-1 min-w-6">{t("exportPreview.hwp.toolbar.fontSize")}</span>
                <div className="flex flex-col -gap-1">
                  <ChevronDown className="w-2 h-2 text-[var(--hwp-toolbar-icon)] rotate-180" />
                  <ChevronDown className="w-2 h-2 text-[var(--hwp-toolbar-icon)]" />
                </div>
              </div>

              <div className="w-px h-4 bg-[var(--hwp-toolbar-border)] mx-1" />

              <div className="flex items-center gap-0.5 text-[var(--hwp-toolbar-icon)]">
                <button className="p-1 hover:bg-[var(--hwp-toolbar-button-hover)] rounded"><Bold className="w-3.5 h-3.5" /></button>
                <button className="p-1 hover:bg-[var(--hwp-toolbar-button-hover)] rounded"><Italic className="w-3.5 h-3.5" /></button>
                <button className="p-1 hover:bg-[var(--hwp-toolbar-button-hover)] rounded"><Underline className="w-3.5 h-3.5" /></button>
              </div>

              <div className="w-px h-4 bg-[var(--hwp-toolbar-border)] mx-1" />

              <div className="flex items-center gap-0.5 text-[var(--hwp-toolbar-icon)]">
                <button className="p-1 hover:bg-[var(--hwp-toolbar-button-hover)] rounded"><AlignLeft className="w-3.5 h-3.5" /></button>
                <button className="p-1 hover:bg-[var(--hwp-toolbar-button-hover)] rounded"><AlignCenter className="w-3.5 h-3.5" /></button>
                <button className="p-1 hover:bg-[var(--hwp-toolbar-button-hover)] rounded"><AlignRight className="w-3.5 h-3.5" /></button>
              </div>
            </div>

            <div className="flex-1 overflow-auto bg-[var(--hwp-app-section-bg)] p-4 flex justify-center items-start">
              <div
                className="bg-white shadow-lg text-black px-8 py-10 text-[10px] leading-relaxed relative"
                style={{
                  width: "100%",
                  maxWidth: "210mm",
                  minHeight: "297mm",
                  transform: "scale(0.8)",
                  transformOrigin: "top center"
                }}
              >
                <div className="absolute top-8 left-8 w-4 h-4 border-t border-l border-[var(--hwp-toolbar-border)]" />
                <div className="absolute top-8 right-8 w-4 h-4 border-t border-r border-[var(--hwp-toolbar-border)]" />
                <div className="absolute bottom-8 left-8 w-4 h-4 border-b border-l border-[var(--hwp-toolbar-border)]" />
                <div className="absolute bottom-8 right-8 w-4 h-4 border-b border-r border-[var(--hwp-toolbar-border)]" />

                <h1 className="text-xl font-bold mb-6 text-center">{resolvedTitle}</h1>
                <p className="mb-2">
                  {t("exportPreview.hwp.previewNotice")}
                </p>
                <p>
                  {t("exportPreview.hwp.sampleText")}
                </p>
              </div>
            </div>

            <div className="bg-[var(--hwp-toolbar-bg)] border-t border-[var(--hwp-toolbar-border)] h-6 flex items-center px-2 text-[10px] text-[var(--hwp-toolbar-icon)] justify-between shrink-0">
              <div className="flex gap-3">
                <span>{t("exportPreview.hwp.status.pageCount")}</span>
                <span>{t("exportPreview.hwp.status.column")}</span>
                <span>{t("exportPreview.hwp.status.layout")}</span>
              </div>
              <div className="flex gap-3">
                <span>{t("exportPreview.hwp.status.insert")}</span>
                <span>{t("exportPreview.hwp.status.trackChanges")}</span>
                <span>{t("exportPreview.hwp.status.zoom")}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full bg-[var(--word-ribbon-bg)]">
            <div className="bg-[var(--word-titlebar-bg)] text-white px-3 py-1.5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="grid grid-cols-3 gap-0.5 w-4 h-4">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} className="bg-white rounded-[1px]" />
                  ))}
                </div>
                <span className="font-semibold text-sm">{t("exportPreview.word.title")}</span>
                <span className="text-xs opacity-80">{resolvedTitle}</span>
              </div>
              <div className="w-1/3 bg-white/20 rounded px-2 py-0.5 flex items-center gap-2 text-xs">
                <Search className="w-3 h-3" />
                <span className="opacity-70">{t("exportPreview.word.searchPlaceholder")}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="bg-[var(--word-premium-badge-bg)] text-white text-[10px] font-bold px-1 rounded">{t("exportPreview.word.premium")}</span>
                <div className="w-6 h-6 rounded-full bg-[var(--word-user-avatar-bg)] flex items-center justify-center text-xs font-bold text-[var(--word-user-avatar-text)]">U</div>
              </div>
            </div>

            <div className="bg-white border-b border-[var(--word-ribbon-border)] px-2 flex text-[12px] text-[var(--hwp-toolbar-icon)]">
              {wordTabs.map((menu) => (
                <div
                  key={menu}
                  className={cn(
                    "px-3 py-2 cursor-pointer border-b-2 border-transparent hover:text-[var(--word-tab-accent)] hover:bg-[var(--word-ribbon-hover-bg)]",
                    menu === t("exportPreview.word.tabs.home") && "text-[var(--word-tab-accent)] border-[var(--word-tab-accent)] font-medium"
                  )}
                >
                  {menu}
                </div>
              ))}
            </div>

            <div className="bg-[var(--word-ribbon-section-bg)] border-b border-[var(--word-ribbon-border)] p-2 flex items-center gap-2 shrink-0 overflow-x-auto whitespace-nowrap h-20">
              <div className="flex flex-col items-center gap-1 pr-2 border-r border-[var(--hwp-toolbar-border)]">
                <div className="flex gap-1">
                  <Undo className="w-4 h-4 text-[var(--hwp-toolbar-icon)]" />
                  <Redo className="w-4 h-4 text-[var(--hwp-toolbar-icon)] opacity-50" />
                </div>
                <span className="text-[10px] text-[var(--hwp-toolbar-icon)] mt-1">{t("exportPreview.word.undo")}</span>
              </div>

              <div className="flex flex-col gap-1 px-2 border-r border-[var(--hwp-toolbar-border)]">
                <div className="flex items-center gap-1 mb-1">
                  <div className="bg-white border border-[var(--hwp-toolbar-border)] px-1 py-0.5 rounded text-[11px] w-24 flex justify-between items-center">
                    Calibri <ChevronDown className="w-3 h-3" />
                  </div>
                  <div className="bg-white border border-[var(--hwp-toolbar-border)] px-1 py-0.5 rounded text-[11px] w-10 flex justify-between items-center">
                    11 <ChevronDown className="w-3 h-3" />
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[var(--hwp-menubar-text)]">
                  <Bold className="w-4 h-4 p-0.5 rounded hover:bg-[var(--hwp-toolbar-button-hover)]" />
                  <Italic className="w-4 h-4 p-0.5 rounded hover:bg-[var(--hwp-toolbar-button-hover)]" />
                  <Underline className="w-4 h-4 p-0.5 rounded hover:bg-[var(--hwp-toolbar-button-hover)]" />
                  <span className="text-[var(--word-ribbon-divider)]">|</span>
                  <Palette className="w-4 h-4 p-0.5 rounded hover:bg-[var(--hwp-toolbar-button-hover)] text-red-500" />
                </div>
              </div>

              <div className="flex flex-col gap-1 px-2 border-r border-[var(--hwp-toolbar-border)]">
                <div className="flex items-center gap-1 text-[var(--hwp-menubar-text)] mb-1">
                  <span className="w-4 h-4 bg-[var(--hwp-toolbar-border)] rounded-xs" />
                  <span className="w-4 h-4 bg-[var(--hwp-toolbar-border)] rounded-xs" />
                </div>
                <div className="flex items-center gap-1 text-[var(--hwp-menubar-text)]">
                  <AlignLeft className="w-4 h-4 p-0.5 rounded bg-[var(--word-ribbon-control-bg)]" />
                  <AlignCenter className="w-4 h-4 p-0.5 rounded hover:bg-[var(--hwp-toolbar-button-hover)]" />
                  <AlignRight className="w-4 h-4 p-0.5 rounded hover:bg-[var(--hwp-toolbar-button-hover)]" />
                </div>
              </div>

              <div className="flex items-center gap-1 px-2">
                <div className="flex flex-col items-center bg-white border border-[var(--hwp-toolbar-border)] rounded p-1 w-12 h-14 justify-center">
                  <span className="text-[16px] font-light">AaBbCc</span>
                  <span className="text-[10px] text-[var(--word-style-text)]">{t("exportPreview.word.styles.standard")}</span>
                </div>
                <div className="flex flex-col items-center hover:bg-white hover:border border-transparent border rounded p-1 w-12 h-14 justify-center">
                  <span className="text-[16px] font-light">AaBbCc</span>
                  <span className="text-[10px] text-[var(--hwp-toolbar-icon)]">{t("exportPreview.word.styles.noSpacing")}</span>
                </div>
                <div className="flex flex-col items-center hover:bg-white hover:border border-transparent border rounded p-1 w-12 h-14 justify-center">
                  <span className="text-[16px] font-light text-[var(--word-style-text)]">AaBbCc</span>
                  <span className="text-[10px] text-[var(--hwp-toolbar-icon)]">{t("exportPreview.word.styles.heading1")}</span>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-auto bg-[var(--word-paper-section-bg)] p-4 flex justify-center items-start">
              <div
                className="bg-white shadow-lg text-black px-8 py-10 text-[11px] leading-relaxed relative"
                style={{
                  width: "100%",
                  maxWidth: "210mm",
                  minHeight: "297mm",
                  transform: "scale(0.8)",
                  transformOrigin: "top center"
                }}
              >
                <h1 className="text-2xl font-bold mb-4 text-[var(--word-user-avatar-text)]">{resolvedTitle}</h1>
                <p className="mb-2">
                  {t("exportPreview.word.previewNotice")}
                </p>
                <p>
                  {t("exportPreview.word.sampleText")}
                </p>
              </div>
            </div>

            <div className="bg-[var(--word-titlebar-bg)] text-white h-6 flex items-center px-4 text-[10px] justify-between shrink-0">
              <div className="flex gap-4">
                <span>{t("exportPreview.word.status.pageInfo")}</span>
                <span>{t("exportPreview.word.status.wordCount")}</span>
                <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> {t("exportPreview.word.status.language")}</span>
              </div>
              <div className="flex gap-4 items-center">
                <span>{t("exportPreview.word.status.accessibility")}</span>
                <div className="flex gap-2">
                  <span className="hover:bg-white/20 p-0.5 rounded cursor-pointer">{t("exportPreview.word.status.view.read")}</span>
                  <span className="bg-white/20 p-0.5 rounded cursor-pointer">{t("exportPreview.word.status.view.print")}</span>
                  <span className="hover:bg-white/20 p-0.5 rounded cursor-pointer">{t("exportPreview.word.status.view.web")}</span>
                </div>
                <span>{t("exportPreview.word.status.zoom")}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
