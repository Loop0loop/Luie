import { memo } from "react";
import type { TFunction } from "i18next";
import { setLanguage } from "../../../i18n";

interface LanguageTabProps {
    t: TFunction;
    language: string;
}

export const LanguageTab = memo(function LanguageTab({ t, language }: LanguageTabProps) {
    return (
        <div className="space-y-6 max-w-2xl content-visibility-auto contain-intrinsic-size-[1px_400px]">
            <section>
                <h3 className="text-base font-semibold text-fg mb-2">{t("settings.section.language")}</h3>
                <div className="flex gap-3">
                    <button
                        onClick={() => setLanguage("ko")}
                        className={`px-4 py-2 rounded-lg border text-sm transition-colors duration-150 ${language === "ko" ? "border-accent text-accent bg-accent/5 ring-1 ring-accent" : "border-border text-muted hover:text-fg"
                            }`}
                    >
                        {t("settings.language.options.ko")}
                    </button>
                    <button
                        onClick={() => setLanguage("en")}
                        className={`px-4 py-2 rounded-lg border text-sm transition-colors duration-150 ${language === "en" ? "border-accent text-accent bg-accent/5 ring-1 ring-accent" : "border-border text-muted hover:text-fg"
                            }`}
                    >
                        {t("settings.language.options.en")}
                    </button>
                    <button
                        onClick={() => setLanguage("ja")}
                        className={`px-4 py-2 rounded-lg border text-sm transition-colors duration-150 ${language === "ja" ? "border-accent text-accent bg-accent/5 ring-1 ring-accent" : "border-border text-muted hover:text-fg"
                            }`}
                    >
                        {t("settings.language.options.ja")}
                    </button>
                </div>
            </section>
        </div>
    );
});
