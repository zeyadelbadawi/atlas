/**
 * Localization Provider.
 *
 * Owns the active language, persists the choice, and applies the document
 * attributes that make RTL work platform-wide. Because `dir` is set on the
 * document root, every component inherits direction automatically and no
 * component needs a direction branch of its own.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { I18nextProvider } from "react-i18next";
import type { i18n as I18nInstance } from "i18next";
import { APP_CONFIG } from "@config";
import { STORAGE_KEYS } from "@constants";
import {
  LANGUAGE_LIST,
  createI18nInstance,
  isSupportedLanguage,
} from "@localization";
import { LANGUAGES } from "@localization";
import type { LanguageCode } from "@types";
import { readStoredValue, writeStoredValue } from "@utils";
import { LocalizationContext } from "./localization.context";
import type { LocalizationContextValue } from "./localization.context";

/** Reads the persisted language, falling back to the browser then the default. */
function readInitialLanguage(): LanguageCode {
  const stored = readStoredValue<unknown>(
    STORAGE_KEYS.language,
    APP_CONFIG.defaultLanguage,
  );

  if (typeof stored === "string" && isSupportedLanguage(stored)) {
    return stored;
  }

  const browserLanguage = navigator.language?.split("-")[0] ?? "";
  return isSupportedLanguage(browserLanguage)
    ? browserLanguage
    : APP_CONFIG.defaultLanguage;
}

export interface AtlasLocalizationProviderProps {
  readonly children: ReactNode;
}

export function AtlasLocalizationProvider({
  children,
}: AtlasLocalizationProviderProps): JSX.Element {
  const [language, setLanguageState] =
    useState<LanguageCode>(readInitialLanguage);

  // The instance is created once; language changes are applied to it in place.
  const i18nRef = useRef<I18nInstance>();
  if (!i18nRef.current) {
    i18nRef.current = createI18nInstance(language);
  }
  const i18n = i18nRef.current;

  const languageDefinition = LANGUAGES[language];

  useEffect(() => {
    if (i18n.language !== language) {
      void i18n.changeLanguage(language);
    }

    // Direction and language live on the document root so the entire tree —
    // including portalled dialogs and toasts — inherits them.
    const root = document.documentElement;
    root.lang = language;
    root.dir = languageDefinition.direction;
  }, [i18n, language, languageDefinition.direction]);

  const setLanguage = useCallback((next: LanguageCode) => {
    setLanguageState(next);
    writeStoredValue(STORAGE_KEYS.language, next);
  }, []);

  const value = useMemo<LocalizationContextValue>(
    () => ({
      language,
      languageDefinition,
      direction: languageDefinition.direction,
      isRtl: languageDefinition.direction === "rtl",
      locale: languageDefinition.locale,
      availableLanguages: LANGUAGE_LIST,
      setLanguage,
    }),
    [language, languageDefinition, setLanguage],
  );

  return (
    <I18nextProvider i18n={i18n}>
      <LocalizationContext.Provider value={value}>
        {children}
      </LocalizationContext.Provider>
    </I18nextProvider>
  );
}
