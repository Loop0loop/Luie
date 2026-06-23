import { useTranslation } from "react-i18next";
import { Book, FileText, FileType } from "lucide-react";

interface ProjectCategorySidebarProps {
    activeCategory: string;
    onSelectCategory: (category: string) => void;
}

export function ProjectCategorySidebar({
    activeCategory,
    onSelectCategory
}: ProjectCategorySidebarProps) {
    const { t } = useTranslation();

    const categories = [
        { id: "all", label: t("settings.projectTemplate.category.all"), icon: <Book className="w-4 h-4" /> },
        { id: "novel", label: t("settings.projectTemplate.category.novel"), icon: <Book className="w-4 h-4" /> },
        { id: "script", label: t("settings.projectTemplate.category.script"), icon: <FileText className="w-4 h-4" /> },
        { id: "misc", label: t("settings.projectTemplate.category.general"), icon: <FileType className="w-4 h-4" /> },
    ];

    return (
        <div className="w-60 bg-sidebar py-8 px-4 flex flex-col gap-2 border-r border-border">
            <div className="text-[11px] font-bold text-muted mb-4 pl-3 uppercase tracking-widest">
                {t("settings.projectTemplate.sidebarTitle")}
            </div>
            {categories.map((cat) => (
                <div
                    key={cat.id}
                    className={`
            px-4 py-3 rounded-lg text-sm transition-all duration-200 ease-[cubic-bezier(0.2,0,0,1)] flex items-center gap-2.5
            ${activeCategory === cat.id
                            ? "bg-accent text-accent-fg font-semibold shadow-md"
                            : "text-muted hover:bg-active hover:text-fg cursor-pointer"}
          `}
                    onClick={() => onSelectCategory(cat.id)}
                >
                    {cat.icon}
                    {cat.label}
                </div>
            ))}
        </div>
    );
}
