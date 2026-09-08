/**
 * SubmitTicketForm (Phase 8) — the customer's "submit a ticket" form.
 *
 * Every state is rendered inline, in the page, in the user's own
 * language: field-level validation, a disabled/busy submit button while
 * the request is in flight, a success confirmation, and a single generic
 * failure message. No `alert()`, no `window.confirm`, and — deliberately
 * — no rendering of the raw error: a support form must never show a
 * customer a stack trace, an HTTP status, or a backend message key, so
 * the failure branch shows one translated sentence regardless of what
 * actually went wrong. (The real error is still available to the
 * developer through the network tab and the server's own logs.)
 *
 * Validation mirrors the backend DTO's own limits exactly
 * (`MAX_SUPPORT_SUBJECT_LENGTH`/`MAX_SUPPORT_DESCRIPTION_LENGTH`) rather
 * than inventing its own — the server re-enforces them regardless, per
 * this codebase's blanket "never trust the client alone" rule.
 */
import { useState } from "react";
import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { LifeBuoy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSubmitSupportCase } from "../hooks/useTenantSupportCases";

/** Mirrors the backend's `support.constants.ts` values exactly. */
const MAX_SUBJECT_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 5000;

interface FieldErrors {
  readonly subject?: string;
  readonly description?: string;
}

export function SubmitTicketForm(): JSX.Element {
  const { t } = useTranslation();
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitted, setSubmitted] = useState(false);

  const { mutate, isPending, isError, reset } = useSubmitSupportCase();

  function validate(): FieldErrors {
    const next: FieldErrors = {
      subject: !subject.trim()
        ? "dashboard:support.form.errors.subjectRequired"
        : subject.trim().length > MAX_SUBJECT_LENGTH
          ? "dashboard:support.form.errors.subjectTooLong"
          : undefined,
      description: !description.trim()
        ? "dashboard:support.form.errors.descriptionRequired"
        : description.trim().length > MAX_DESCRIPTION_LENGTH
          ? "dashboard:support.form.errors.descriptionTooLong"
          : undefined,
    };
    return next;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    if (nextErrors.subject || nextErrors.description) return;

    mutate(
      { subject: subject.trim(), description: description.trim() },
      {
        onSuccess: () => {
          setSubject("");
          setDescription("");
          setSubmitted(true);
        },
      },
    );
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm text-success">
          {t("dashboard:support.form.success")}
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setSubmitted(false);
            reset();
          }}
        >
          {t("dashboard:support.form.submitAnother")}
        </Button>
      </div>
    );
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
      <div className="flex flex-col gap-2">
        <Label htmlFor="support-subject">
          {t("dashboard:support.form.subjectLabel")}
        </Label>
        <Input
          id="support-subject"
          value={subject}
          maxLength={MAX_SUBJECT_LENGTH}
          onChange={(event) => setSubject(event.target.value)}
          placeholder={t("dashboard:support.form.subjectPlaceholder")}
          aria-invalid={Boolean(errors.subject)}
          aria-describedby={errors.subject ? "support-subject-error" : undefined}
        />
        {errors.subject ? (
          <p id="support-subject-error" className="text-sm text-destructive">
            {t(errors.subject)}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="support-description">
          {t("dashboard:support.form.descriptionLabel")}
        </Label>
        <Textarea
          id="support-description"
          rows={5}
          value={description}
          maxLength={MAX_DESCRIPTION_LENGTH}
          onChange={(event) => setDescription(event.target.value)}
          placeholder={t("dashboard:support.form.descriptionPlaceholder")}
          aria-invalid={Boolean(errors.description)}
          aria-describedby={
            errors.description ? "support-description-error" : undefined
          }
        />
        {errors.description ? (
          <p id="support-description-error" className="text-sm text-destructive">
            {t(errors.description)}
          </p>
        ) : null}
      </div>

      {/* One generic sentence — never the underlying error. See this file's header comment. */}
      {isError ? (
        <p role="alert" className="text-sm text-destructive">
          {t("dashboard:support.form.errors.submitFailed")}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending}>
          <LifeBuoy className="me-2 h-4 w-4" aria-hidden="true" />
          {isPending
            ? t("dashboard:support.form.submitting")
            : t("dashboard:support.form.submit")}
        </Button>
      </div>
    </form>
  );
}
