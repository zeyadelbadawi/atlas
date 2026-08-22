/**
 * Dialog Provider.
 *
 * Provides the single confirmation experience used for every destructive or
 * permanent action. Exposing it as a promise lets a feature simply `await` the
 * user's decision instead of managing dialog state and callbacks.
 */
import { useCallback, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@utils";
import { DialogContext } from "./dialog.context";
import type { ConfirmRequest, DialogContextValue } from "./dialog.context";

export interface AtlasDialogProviderProps {
  readonly children: ReactNode;
}

export function AtlasDialogProvider({
  children,
}: AtlasDialogProviderProps): JSX.Element {
  const { t } = useTranslation();
  const [request, setRequest] = useState<ConfirmRequest | null>(null);

  // Holds the pending promise resolver for the dialog currently on screen.
  const resolverRef = useRef<((confirmed: boolean) => void) | null>(null);

  const settle = useCallback((confirmed: boolean) => {
    resolverRef.current?.(confirmed);
    resolverRef.current = null;
    setRequest(null);
  }, []);

  const confirm = useCallback((next: ConfirmRequest): Promise<boolean> => {
    // A second request while one is open would orphan the first promise.
    resolverRef.current?.(false);

    setRequest(next);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      // Dismissing by overlay click or Escape must resolve as "not confirmed".
      if (!isOpen) settle(false);
    },
    [settle],
  );

  const value = useMemo<DialogContextValue>(() => ({ confirm }), [confirm]);

  const isDestructive = request?.intent === "destructive";

  return (
    <DialogContext.Provider value={value}>
      {children}
      <AlertDialog open={request !== null} onOpenChange={handleOpenChange}>
        <AlertDialogContent className="rounded-xl border-border">
          {request ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle className="font-display text-lg">
                  {t(request.titleKey, request.values ?? {})}
                </AlertDialogTitle>
                <AlertDialogDescription className="text-sm text-muted-foreground">
                  {t(request.descriptionKey, request.values ?? {})}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => settle(false)}>
                  {t(request.cancelLabelKey ?? "common:actions.cancel")}
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => settle(true)}
                  className={cn(
                    isDestructive &&
                      "bg-destructive text-destructive-foreground hover:bg-destructive/90",
                  )}
                >
                  {t(request.confirmLabelKey, request.values ?? {})}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          ) : null}
        </AlertDialogContent>
      </AlertDialog>
    </DialogContext.Provider>
  );
}
