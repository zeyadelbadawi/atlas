---
id: DOC-LRN-005
title: "Build your curriculum: sections and lessons"
description: Add units (sections) and lessons in the Course Builder, place quizzes and assignments, put everything in order and publish items for learners.
summary: >
  In the Course Builder you add sections (units), then use Add content to add
  lessons or place existing quizzes and assignments in each one. Reorder items
  by dragging or with the move buttons; every change saves at once. Learners
  only see items set to Published. Owners, managers and the course's assigned
  instructors can build the curriculum.
type: step-by-step
audience: [owner, manager, instructor]
order: 5
priority: P0
related: [DOC-LRN-006, DOC-LRN-007, DOC-LRN-014, DOC-LRN-019, DOC-TRB-012]
keywords: [curriculum, course builder, sections, units, add lesson, reorder lessons, منهج, اضافة درس, ترتيب الدروس, وحدات, اقسام, drag and drop]
updated: 2026-10-20
---

The curriculum is the ordered list of what learners study. It is split into units: the Course Builder calls them **sections**, and the course wizard calls them **units**. Each unit holds lessons, quizzes and assignments in one order you control.

Owners and managers can edit any course's curriculum. An instructor can edit the curriculum of the courses they are assigned to: in the **Teaching Dashboard**, open the course and choose **Edit curriculum**.

## Build the curriculum

1. Open **Courses**, open the course's **Actions** menu and choose **Curriculum**. (In a course you are already editing, use the **Course Builder** tab.)

   ![The course Actions menu with Curriculum highlighted](shot:courses/list-actions-curriculum)

2. Choose **Add Section**, enter the **Section Title** and an optional **Description**, then choose **Save Section**.

   ![The Add Section dialog with the section title and description](shot:courses/section-dialog)

3. In the section, choose **Add content**, then **Add Lesson**.

   ![The Add content menu with Add Lesson, Add existing quiz and Add existing assignment](shot:courses/add-content-menu)

4. Enter the **Lesson Title**, choose the **Content Type**, paste the **Content URL** or attach a file, set **Availability** to **Draft** or **Published**, and choose **Save Lesson**. The table below explains each content type.

   ![The Add Lesson dialog with title, content type, availability and content URL](shot:courses/lesson-dialog)

5. To place a quiz or assignment in the unit, choose **Add content**, then **Add existing quiz** or **Add existing assignment**, and choose **Add** next to it. Quizzes and assignments are created on their own pages first; see [Create a quiz](doc:DOC-LRN-014) and [Assignments](doc:DOC-LRN-019).

   ![The Add an existing quiz dialog listing the course's quizzes](shot:courses/attach-quiz)

6. Put items in order. Drag an item or a section by its handle, or use the up and down arrow buttons. With a keyboard, focus the handle, press Space or Enter to pick it up, move it with the arrow keys, and press Space or Enter again to drop it. **Order saved** confirms the change.

   ![A unit's items with the move up and move down buttons](shot:courses/reorder)

7. To change or remove an item, open its **Item actions** menu: **Edit lesson** and **Delete lesson** for lessons, **Remove from unit** for quizzes and assignments. A section's own menu has **Edit section** and **Delete section**.

   ![The Item actions menu of a lesson with Edit lesson and Delete lesson](shot:courses/item-actions)

## Which content type to choose

| Content Type | Use it for | What learners see |
|---|---|---|
| **Video** with a YouTube link | Your teaching videos | The video plays inside the lesson with the learner's personal watermark. See [Add a YouTube video lesson](doc:DOC-LRN-006). |
| **File** with an uploaded file | Worksheets and notes as PDF or images | **Upload file** under **Lesson file** (PDF or image, up to 20 MB). Only learners enrolled in the course can open it, through a link that expires. Uploading is for owners and managers. |
| **Video** or **File** with any other link | Vimeo, Google Drive, a website | The link opens in a new tab, outside the academy. Anyone with the link can open it. See [Add a link lesson](doc:DOC-LRN-007). |

Add the link or file before you publish a lesson: a published lesson with nothing to open doesn't count towards publishing the course.

## Draft and published items

- Learners only see lessons, quizzes and assignments whose status is **Published**.
- Every published item counts towards the learner's progress, and items open in order.

## Delete or hide an item

Deleting a lesson or section is permanent: deleting a section also deletes all of its lessons. **Remove from unit** takes a quiz or assignment out of the unit without deleting it.

> [!WARNING]
> If learners already have progress, attempts or submissions in an item, Atlas refuses to delete it, because that would erase their records. Edit the item and set it to **Draft** instead: it disappears for learners and their records stay. See [Troubleshooting](category:troubleshooting).

If someone else changes the order at the same time, your change is not saved and the latest order is loaded. Make your change again.

## Related

- [Publish your course](doc:DOC-LRN-011)
- [Completion rules and learner progress](doc:DOC-LRN-013)
- [Courses overview](doc:DOC-LRN-001)
