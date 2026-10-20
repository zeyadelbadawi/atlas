---
id: DOC-TRB-011
title: Quiz timer, autosave and full-screen problems
description: Why the quiz timer keeps running, how answers are saved as you go, when a quiz submits automatically, and what to do if full screen isn't available.
summary: >
  A timed quiz's clock starts when you press Start and keeps running even if
  you close the page. Your answers are saved as you go, and when time runs out
  the saved answers are submitted automatically. If a quiz needs full screen
  and you leave it, the questions are hidden until you return. Instructors can
  give one learner extra time with an override.
type: troubleshooting
audience: [learner, instructor]
order: 10
priority: P1
related: [DOC-LRN-033, DOC-LRN-016, DOC-LRN-018, DOC-REF-006, DOC-FAQ-006]
keywords: [quiz timer, time ran out, submitted automatically, autosave, full screen, exam, iphone, الامتحان قفل لوحده, الوقت خلص, ملء الشاشة, الاختبار اتسلم لوحده, الإجابات اتحفظت, امتحان]
updated: 2026-10-20
---

## Symptom

- The timer kept counting after you closed the quiz or lost your connection.
- The quiz says "Time ran out. Your answers were submitted automatically." or "Submitted automatically".
- You aren't sure your answers were saved.
- The questions disappeared and you see "Return to full screen to continue", or "Full screen isn’t available in this browser".

## Why it happens

Each quiz follows the settings its instructor chose: whether it has a time limit, how many attempts you get, and whether it must be taken in full screen.

- **The timer runs on Atlas, not on your device.** "The clock starts when you press Start and keeps running even if you close this page. When it reaches zero, the answers you have saved are submitted automatically."
- **Answers are saved as you go.** The top of the quiz shows the save state: "Saving…", "Saved just now", "Saved 2 min ago", "Unsaved changes", or "Offline — will retry" when your connection drops.
- **Full screen.** "If you leave full screen, the questions are hidden until you return — your answers and the timer are kept — and leaving is recorded."
- **Recorded events.** Some quizzes record when you switch tabs, leave full screen, copy, paste or print. Your reviewer sees them "with plain explanations — they are prompts for a conversation, not proof of anything." If the quiz warns you each time, it can be submitted automatically once a set number of events is recorded: "The quiz was submitted because the recorded-event limit was reached. The answers you had saved were graded as they were."

## Fix

### For learners

- **The timer keeps running:** return to the quiz as soon as you can and choose **Resume Quiz**. You can't pause the time limit.
- **"Offline — will retry":** stay on the page. Atlas saves again when your connection returns. Don't close the quiz until it shows "Saved just now".
- **"Return to full screen to continue":** choose **Enter full screen**. Your answers are saved and the timer keeps running. If your browser refuses ("Your browser didn’t allow full screen."), choose **Continue without full screen**.
- **"Full screen isn’t available in this browser"** (common on iPhone): you can take the quiz as it is. "Your instructor will see that full screen wasn’t available."
- **Submitted automatically:** the answers you had saved were graded. If you think something went wrong, contact your instructor or academy; only they can give you another attempt.

### For instructors: give one learner extra time

If a learner lost time for a reason you accept, give them an override before their next attempt.

1. Open the quiz's **Quiz Results** from your Teaching Dashboard and choose **Overrides**.
2. Add an override for the learner: extra time, extra attempts or a different window. "The server applies an override when that student starts an attempt."

   ![The Student overrides panel on the Quiz Results page](shot:troubleshooting/quiz-overrides)

> [!LIMITATION]
> Recorded events are signals for you to review, not proof of cheating. Full screen can't be enforced on every browser: where it isn't available, the learner can still take the quiz and you see that it wasn't available.

## Still stuck?

- **Learners:** contact your academy (in My Learn, choose **Contact your academy**) with the quiz name and what you saw.
- **Instructors and academy staff:** open a ticket from **Support** ([open Support](app:/dashboard/support)). See [Getting help](category:support).

Related: [Courses, quizzes and certificates](category:courses).
