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
import { cn } from "../../../../shared/types/utils";

interface ExportPreviewPanelProps {
  title?: string;
  onClose?: () => void;
}

type ExportFormat = "hwp" | "word";

export default function ExportPreviewPanel({ title }: ExportPreviewPanelProps) {
  const { t } = useTranslation();
  const resolvedTitle = title ?? t("exportPreview.defaultTitle");
  const [format, setFormat] = useState<ExportFormat>("hwp");

  const handleExport = () => {
    // Placeholder for actual export logic
    const ext = format === "hwp" ? "hwp" : "docx";
    alert(t("exportPreview.alertExport", { ext }));
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
    <div className="flex flex-col h-full bg-white text-black overflow-hidden relative border-l border-border">
      {/* Header / Selection & Actions */}
      <div className="flex items-center justify-between px-4 py-3 bg-secondary border-b border-border shrink-0">
        <div className="flex items-center gap-2 bg-input/50 p-1 rounded-lg border border-border">
          <button
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5",
              format === "hwp" ? "bg-white text-accent shadow-sm" : "text-muted hover:text-fg"
            )}
            onClick={() => setFormat("hwp")}
          >
            <span className="font-bold">{t("exportPreview.format.hwpShort")}</span> {t("exportPreview.format.hwp")}
          </button>
          <button
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5",
              format === "word" ? "bg-white text-blue-600 shadow-sm" : "text-muted hover:text-fg"
            )}
            onClick={() => setFormat("word")}
          >
             <FileText className="w-3.5 h-3.5" /> {t("exportPreview.format.word")}
          </button>
        </div>

        <button 
          className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white rounded-md text-xs font-medium hover:brightness-110 transition-all shadow-sm"
          onClick={handleExport}
        >
          <Download className="w-3.5 h-3.5" />
          {t("exportPreview.action.export")}
        </button>
      </div>

      {/* Emulated UI Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {format === "hwp" ? (
          // HWP Style UI
          <div className="flex flex-col h-full bg-[#f0f0f0]">
            {/* Title Bar Equivalent */}
            <div className="bg-[#3e81f6] text-white px-2 py-1 text-[10px] flex items-center justify-between">
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
            
            {/* Menu Bar */}
            <div className="bg-white border-b border-gray-300 flex text-[11px] text-gray-700">
               {hwpMenuItems.map((menu) => (
                 <div key={menu} className="px-3 py-1.5 hover:bg-gray-100 cursor-default">{menu}</div>
               ))}
            </div>

            {/* Standard Toolbar */}
            <div className="bg-[#f0f0f0] border-b border-gray-300 p-1 flex items-center gap-1 shrink-0 overflow-x-auto whitespace-nowrap">
               <div className="flex items-center gap-1 bg-white border border-gray-300 rounded-sm px-1 py-0.5">
                  <div className="w-3 h-3 bg-gray-400 rounded-sm opacity-50" />
                <span className="text-[11px] font-medium text-gray-800 px-1 min-w-12.5">{t("exportPreview.hwp.toolbar.baseStyle")}</span>
                  <ChevronDown className="w-3 h-3 text-gray-500" />
               </div>
               <div className="w-px h-4 bg-gray-300 mx-1" />
               
               <div className="flex items-center gap-1 bg-white border border-gray-300 rounded-sm px-1 py-0.5">
                 <span className="text-[11px] font-medium text-gray-800 px-1 min-w-17.5">{t("exportPreview.hwp.toolbar.fontName")}</span>
                 <ChevronDown className="w-3 h-3 text-gray-500" />
               </div>
               
               <div className="flex items-center gap-1 bg-white border border-gray-300 rounded-sm px-1 py-0.5 ml-1">
                 <span className="text-[11px] font-medium text-gray-800 px-1 min-w-6">{t("exportPreview.hwp.toolbar.fontSize")}</span>
                 <div className="flex flex-col -gap-1">
                   <ChevronDown className="w-2 h-2 text-gray-500 rotate-180" />
                   <ChevronDown className="w-2 h-2 text-gray-500" />
                 </div>
               </div>

               <div className="w-px h-4 bg-gray-300 mx-1" />

               <div className="flex items-center gap-0.5 text-gray-600">
                 <button className="p-1 hover:bg-gray-200 rounded"><Bold className="w-3.5 h-3.5" /></button>
                 <button className="p-1 hover:bg-gray-200 rounded"><Italic className="w-3.5 h-3.5" /></button>
                 <button className="p-1 hover:bg-gray-200 rounded"><Underline className="w-3.5 h-3.5" /></button>
               </div>
               
               <div className="w-px h-4 bg-gray-300 mx-1" />
               
               <div className="flex items-center gap-0.5 text-gray-600">
                  <button className="p-1 hover:bg-gray-200 rounded"><AlignLeft className="w-3.5 h-3.5" /></button>
                  <button className="p-1 hover:bg-gray-200 rounded"><AlignCenter className="w-3.5 h-3.5" /></button>
                  <button className="p-1 hover:bg-gray-200 rounded"><AlignRight className="w-3.5 h-3.5" /></button>
               </div>
            </div>

            {/* Canvas Area */}
            <div className="flex-1 overflow-auto bg-[#d6d6d6] p-4 flex justify-center items-start">
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
                  {/* Page Margin Guidelines (Corner) */}
                  <div className="absolute top-8 left-8 w-4 h-4 border-t border-l border-gray-300" />
                  <div className="absolute top-8 right-8 w-4 h-4 border-t border-r border-gray-300" />
                  <div className="absolute bottom-8 left-8 w-4 h-4 border-b border-l border-gray-300" />
                  <div className="absolute bottom-8 right-8 w-4 h-4 border-b border-r border-gray-300" />

                  <h1 className="text-xl font-bold mb-6 text-center">{resolvedTitle}</h1>
                  <p className="mb-2">
                    {t("exportPreview.hwp.previewNotice")}
                  </p>
                  <p>
                    {t("exportPreview.hwp.sampleText")}
                  </p>
               </div>
            </div>

            {/* Status Bar */}
            <div className="bg-[#f0f0f0] border-t border-gray-300 h-6 flex items-center px-2 text-[10px] text-gray-600 justify-between shrink-0">
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
          // Word Style UI
          <div className="flex flex-col h-full bg-[#f3f4f6]">
            {/* Word Header */}
            <div className="bg-[#185abd] text-white px-3 py-1.5 flex items-center justify-between shrink-0">
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
                  <span className="bg-orange-500 text-white text-[10px] font-bold px-1 rounded">{t("exportPreview.word.premium")}</span>
                  <div className="w-6 h-6 rounded-full bg-blue-300 flex items-center justify-center text-xs font-bold text-blue-900">U</div>
               </div>
            </div>

            {/* Ribbon Tabs */}
            <div className="bg-white border-b border-gray-200 px-2 flex text-[12px] text-gray-600">
               {wordTabs.map((menu) => (
                 <div 
                   key={menu} 
                   className={cn(
                     "px-3 py-2 cursor-pointer border-b-2 border-transparent hover:text-blue-700 hover:bg-gray-50",
                     menu === t("exportPreview.word.tabs.home") && "text-blue-700 border-blue-700 font-medium"
                   )}
                 >
                   {menu}
                 </div>
               ))}
            </div>

            {/* Ribbon Toolbar */}
            <div className="bg-[#f9f9f9] border-b border-gray-200 p-2 flex items-center gap-2 shrink-0 overflow-x-auto whitespace-nowrap h-20">
               {/* Undo/Clipboard Group */}
               <div className="flex flex-col items-center gap-1 pr-2 border-r border-gray-300">
                  <div className="flex gap-1">
                    <Undo className="w-4 h-4 text-gray-600" />
                    <Redo className="w-4 h-4 text-gray-600 opacity-50" />
                  </div>
                  <span className="text-[10px] text-gray-500 mt-1">{t("exportPreview.word.undo")}</span>
               </div>

               {/* Font Group */}
               <div className="flex flex-col gap-1 px-2 border-r border-gray-300">
                  <div className="flex items-center gap-1 mb-1">
                    <div className="bg-white border border-gray-300 px-1 py-0.5 rounded text-[11px] w-24 flex justify-between items-center">
                       Calibri <ChevronDown className="w-3 h-3" />
                    </div>
                    <div className="bg-white border border-gray-300 px-1 py-0.5 rounded text-[11px] w-10 flex justify-between items-center">
                       11 <ChevronDown className="w-3 h-3" />
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-gray-700">
                     <Bold className="w-4 h-4 p-0.5 rounded hover:bg-gray-200" />
                     <Italic className="w-4 h-4 p-0.5 rounded hover:bg-gray-200" />
                     <Underline className="w-4 h-4 p-0.5 rounded hover:bg-gray-200" />
                     <span className="text-gray-300">|</span>
                     <Palette className="w-4 h-4 p-0.5 rounded hover:bg-gray-200 text-red-500" />
                  </div>
               </div>

               {/* Paragraph Group */}
               <div className="flex flex-col gap-1 px-2 border-r border-gray-300">
                  <div className="flex items-center gap-1 text-gray-700 mb-1">
                     <span className="w-4 h-4 bg-gray-300 rounded-sm" /> 
                     <span className="w-4 h-4 bg-gray-300 rounded-sm" /> 
                  </div>
                  <div className="flex items-center gap-1 text-gray-700">
                     <AlignLeft className="w-4 h-4 p-0.5 rounded bg-gray-200" />
                     <AlignCenter className="w-4 h-4 p-0.5 rounded hover:bg-gray-200" />
                     <AlignRight className="w-4 h-4 p-0.5 rounded hover:bg-gray-200" />
                  </div>
               </div>

               {/* Styles Group */}
               <div className="flex items-center gap-1 px-2">
                  <div className="flex flex-col items-center bg-white border border-gray-300 rounded p-1 w-12 h-14 justify-center">
                     <span className="text-[16px] font-light">AaBbCc</span>
                    <span className="text-[10px] text-blue-600">{t("exportPreview.word.styles.standard")}</span>
                  </div>
                  <div className="flex flex-col items-center hover:bg-white hover:border border-transparent border rounded p-1 w-12 h-14 justify-center">
                     <span className="text-[16px] font-light">AaBbCc</span>
                    <span className="text-[10px] text-gray-600">{t("exportPreview.word.styles.noSpacing")}</span>
                  </div>
                  <div className="flex flex-col items-center hover:bg-white hover:border border-transparent border rounded p-1 w-12 h-14 justify-center">
                     <span className="text-[16px] font-light text-blue-600">AaBbCc</span>
                    <span className="text-[10px] text-gray-600">{t("exportPreview.word.styles.heading1")}</span>
                  </div>
               </div>
            </div>

            {/* Canvas Area */}
            <div className="flex-1 overflow-auto bg-[#eaddd7] p-4 flex justify-center items-start">
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
                  <h1 className="text-2xl font-bold mb-4 text-blue-900">{resolvedTitle}</h1>
                  <p className="mb-2">
                    {t("exportPreview.word.previewNotice")}
                  </p>
                  <p>
                    {t("exportPreview.word.sampleText")}
                  </p>
               </div>
            </div>

            {/* Word Status Bar */}
            <div className="bg-[#185abd] text-white h-6 flex items-center px-4 text-[10px] justify-between shrink-0">
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
