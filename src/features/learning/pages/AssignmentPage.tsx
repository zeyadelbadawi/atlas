/**
 * Assignment Page.
 *
 * View instructions, submit a response (with an optional attachment), and
 * see submission state. Grading/instructor workflows are out of scope.
 */
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2, Upload } from "lucide-react";
import { PageContainer, PageHeader } from "@components/layout";
import { ErrorState } from "@components/feedback";
import { StatusBadge } from "@components/data-display";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { useFilePicker } from "@hooks";
import { DASHBOARD_ROUTES, buildPath } from "@app/routes/route-paths";
import {
  useAssignment,
  useAssignmentSubmission,
  useSubmitAssignment,
} from "../hooks";
import {
  assignmentSubmissionSchema,
  type AssignmentSubmissionFormData,
} from "../schemas/learning.schemas";
import {
  ALLOWED_ASSIGNMENT_ATTACHMENT_TYPES,
  MAX_ASSIGNMENT_ATTACHMENT_FILE_SIZE,
} from "../constants/learning.constants";
import { getSubmissionStatusTone } from "../utils/learning-status.utils";

export default function AssignmentPage(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { courseId, assignmentId } = useParams<{
    courseId: string;
    assignmentId: string;
  }>();
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [attachmentName, setAttachmentName] = useState<string | null>(null);

  const {
    data: assignment,
    isLoading: isLoadingAssignment,
    error: assignmentError,
    refetch: refetchAssignment,
  } = useAssignment(courseId ?? "", assignmentId ?? "");
  const { data: submission, isLoading: isLoadingSubmission } =
    useAssignmentSubmission(courseId ?? "", assignmentId ?? "");
  const { mutateAsync: submitAssignment, isPending: isSubmitting } =
    useSubmitAssignment(courseId ?? "", assignmentId ?? "");

  const form = useForm<AssignmentSubmissionFormData>({
    resolver: zodResolver(assignmentSubmissionSchema),
    values: submission
      ? {
          response: submission.response ?? "",
          attachmentUrl: submission.attachmentUrl,
        }
      : { response: "", attachmentUrl: undefined },
  });

  const filePicker = useFilePicker({
    accept: ALLOWED_ASSIGNMENT_ATTACHMENT_TYPES.join(","),
  });

  useEffect(() => {
    const file = filePicker.files?.[0];
    if (!file) return;

    if (file.size > MAX_ASSIGNMENT_ATTACHMENT_FILE_SIZE) {
      form.setError("attachmentUrl", {
        type: "validation",
        message: "learning:assignment.attachmentTooLarge",
      });
      filePicker.clearFiles();
      return;
    }
    if (!ALLOWED_ASSIGNMENT_ATTACHMENT_TYPES.includes(file.type)) {
      form.setError("attachmentUrl", {
        type: "validation",
        message: "learning:assignment.attachmentInvalidType",
      });
      filePicker.clearFiles();
      return;
    }

    form.clearErrors("attachmentUrl");
    setAttachmentName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      form.setValue("attachmentUrl", reader.result as string, {
        shouldDirty: true,
      });
    };
    reader.readAsDataURL(file);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filePicker.files]);

  const alreadySubmitted = submission?.status === "submitted";
  const canEdit = !alreadySubmitted || assignment?.allowResubmission;

  const onSubmit = async (data: AssignmentSubmissionFormData) => {
    try {
      await submitAssignment({
        response: data.response || undefined,
        attachmentUrl: data.attachmentUrl,
      });
      toast({ title: t("learning:assignment.submitSuccess") });
      setJustSubmitted(true);
    } catch {
      toast({
        title: t("learning:assignment.submitError"),
        description: t("errors:generic"),
        variant: "destructive",
      });
    }
  };

  if (isLoadingAssignment || isLoadingSubmission) {
    return (
      <PageContainer>
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      </PageContainer>
    );
  }

  if (assignmentError || !assignment) {
    return (
      <PageContainer>
        <PageHeader titleKey="learning:assignment.listTitle" />
        <ErrorState onRetry={() => refetchAssignment()} />
      </PageContainer>
    );
  }

  if (justSubmitted) {
    return (
      <PageContainer>
        <PageHeader title={assignment.title} titleKey="learning:assignment.listTitle" />
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <span className="flex size-12 items-center justify-center rounded-pill bg-success-surface text-success">
              <CheckCircle2 className="size-6" strokeWidth={1.75} aria-hidden />
            </span>
            <div className="space-y-1.5">
              <h3 className="font-display text-base font-semibold text-foreground">
                {t("learning:assignment.submitSuccess")}
              </h3>
              <p className="text-sm font-medium text-muted-foreground">
                {t("learning:assignment.submitSuccessNextStep")}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("learning:assignment.submitSuccessNextStepDescription")}
              </p>
            </div>
            {courseId ? (
              <Button
                onClick={() =>
                  navigate(
                    buildPath(DASHBOARD_ROUTES.learningCourseDetail, {
                      courseId,
                    })
                  )
                }
              >
                {t("learning:learn.backToCourse")}
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader title={assignment.title} titleKey="learning:assignment.listTitle" />

      <div className="mx-auto max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{t("learning:assignment.instructionsTitle")}</CardTitle>
              {submission ? (
                <StatusBadge
                  labelKey={`learning:assignment.status.${submission.status}`}
                  tone={getSubmissionStatusTone(submission.status)}
                />
              ) : null}
            </div>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-line text-sm text-muted-foreground">
              {assignment.instructions || assignment.description}
            </p>
          </CardContent>
        </Card>

        {alreadySubmitted && !canEdit ? (
          <Card>
            <CardContent className="space-y-2 py-6">
              <p className="text-sm text-muted-foreground">
                {t("learning:assignment.resubmissionUnavailable")}
              </p>
              {submission?.response ? (
                <p className="whitespace-pre-line text-sm text-foreground">
                  {submission.response}
                </p>
              ) : null}
            </CardContent>
          </Card>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <Card>
                <CardContent className="space-y-4 py-6">
                  <FormField
                    control={form.control}
                    name="response"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t("learning:assignment.responseLabel")}
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            rows={6}
                            placeholder={t(
                              "learning:assignment.responsePlaceholder"
                            )}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="attachmentUrl"
                    render={() => (
                      <FormItem>
                        <FormLabel>
                          {t("learning:assignment.attachmentLabel")}
                        </FormLabel>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={filePicker.openFilePicker}
                        >
                          <Upload className="size-4" strokeWidth={2} aria-hidden />
                          {attachmentName
                            ? t("learning:assignment.changeAttachment")
                            : t("learning:assignment.uploadAttachment")}
                        </Button>
                        {attachmentName ? (
                          <p className="text-xs text-muted-foreground">
                            {attachmentName}
                          </p>
                        ) : null}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : null}
                {alreadySubmitted
                  ? t("learning:assignment.resubmitAction")
                  : t("learning:assignment.submitAction")}
              </Button>
            </form>
          </Form>
        )}
      </div>
    </PageContainer>
  );
}
