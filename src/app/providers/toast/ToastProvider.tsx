/**
 * Toast Provider.
 *
 * Every success and failure notification in Atlas passes through here, which
 * guarantees consistent placement, duration and wording, and keeps the
 * underlying toast library replaceable behind a stable contract.
 */
import { useCallback, useMemo } from "react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { toast as sonnerToast, Toaster } from "sonner";
import { APP_CONFIG } from "@config";
import { useLanguage, useTheme } from "@hooks";
import { ToastContext } from "./toast.context";
import type { ToastContextValue, ToastRequest } from "./toast.context";

export interface AtlasToastProviderProps {
  readonly children: ReactNode;
}

export function AtlasToastProvider({
  children,
}: AtlasToastProviderProps): JSX.Element {
  const { t } = useTranslation();
  const { resolvedTheme } = useTheme();
  const { isRtl } = useLanguage();

  const notify = useCallback(
    (request: ToastRequest) => {
      const title = t(request.titleKey, request.values ?? {});
      const description = request.descriptionKey
        ? t(request.descriptionKey, request.values ?? {})
        : undefined;

      const options = {
        description,
        duration: APP_CONFIG.toastDurationMs,
        action: request.action
          ? {
              label: t(request.action.labelKey),
              onClick: request.action.onAction,
            }
          : undefined,
      };

      switch (request.intent) {
        case "success":
          sonnerToast.success(title, options);
          return;
        case "error":
          sonnerToast.error(title, options);
          return;
        case "warning":
          sonnerToast.warning(title, options);
          return;
        case "info":
          sonnerToast.info(title, options);
          return;
      }
    },
    [t],
  );

  const notifySuccess = useCallback<ToastContextValue["notifySuccess"]>(
    (titleKey, descriptionKey, values) =>
      notify({ intent: "success", titleKey, descriptionKey, values }),
    [notify],
  );

  const notifyError = useCallback<ToastContextValue["notifyError"]>(
    (titleKey, descriptionKey, values) =>
      notify({ intent: "error", titleKey, descriptionKey, values }),
    [notify],
  );

  const dismissAll = useCallback(() => sonnerToast.dismiss(), []);

  const value = useMemo<ToastContextValue>(
    () => ({ notify, notifySuccess, notifyError, dismissAll }),
    [notify, notifySuccess, notifyError, dismissAll],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toaster
        theme={resolvedTheme}
        // Anchored to the reading edge so notifications never cover primary
        // actions, in either direction.
        position={isRtl ? "top-left" : "top-right"}
        dir={isRtl ? "rtl" : "ltr"}
        closeButton
        richColors={false}
        toastOptions={{
          classNames: {
            toast:
              "group border-border bg-popover text-popover-foreground shadow-md",
            title: "text-sm font-medium",
            description: "text-sm text-muted-foreground",
            actionButton:
              "bg-primary text-primary-foreground hover:bg-primary-hover",
            cancelButton: "bg-secondary text-secondary-foreground",
            closeButton: "bg-popover text-muted-foreground border-border",
          },
        }}
      />
    </ToastContext.Provider>
  );
}
