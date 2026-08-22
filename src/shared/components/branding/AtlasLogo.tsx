/**
 * Atlas brand mark.
 *
 * Rendered as inline SVG rather than an image asset so it stays crisp at every
 * size, inherits the current text color, and adapts to Light and Dark Mode
 * without shipping two files.
 */
import { useTranslation } from "react-i18next";
import { cn } from "@utils";

/** Mark sizes, aligned with the layout header metrics. */
const MARK_SIZE_CLASS = {
  sm: "size-7",
  md: "size-8",
  lg: "size-10",
} as const;

const WORDMARK_SIZE_CLASS = {
  sm: "text-base",
  md: "text-lg",
  lg: "text-2xl",
} as const;

export type LogoSize = keyof typeof MARK_SIZE_CLASS;

export interface AtlasLogoProps {
  readonly size?: LogoSize;
  /** Hides the wordmark, leaving only the mark. Used by the collapsed sidebar. */
  readonly markOnly?: boolean;
  readonly className?: string;
}

export function AtlasLogo({
  size = "md",
  markOnly = false,
  className,
}: AtlasLogoProps): JSX.Element {
  const { t } = useTranslation();
  const productName = t("common:product.name");

  return (
    <span
      className={cn("flex items-center gap-2.5 text-foreground", className)}
      aria-label={productName}
    >
      <svg
        viewBox="0 0 32 32"
        className={cn("shrink-0", MARK_SIZE_CLASS[size])}
        role="img"
        aria-hidden
        focusable="false"
      >
        <rect width="32" height="32" rx="9" className="fill-primary" />
        {/*
          Three ascending meridians: a compact reference to an atlas, and a
          visual metaphor for growth across the platform's modules.
        */}
        <path
          d="M9 22.5 15.2 9.5h1.6L23 22.5"
          className="stroke-primary-foreground"
          strokeWidth="2.1"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <path
          d="M12.4 18.2h7.2"
          className="stroke-primary-foreground"
          strokeWidth="2.1"
          strokeLinecap="round"
          fill="none"
          opacity="0.75"
        />
      </svg>

      {markOnly ? null : (
        <span
          className={cn(
            "font-display font-semibold tracking-tight",
            WORDMARK_SIZE_CLASS[size],
          )}
        >
          {productName}
        </span>
      )}
    </span>
  );
}
