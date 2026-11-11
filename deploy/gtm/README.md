# GA4 events for the quiz: GTM import files

| File | Container | GA4 property |
| --- | --- | --- |
| `mam-quiz-ga4-events-GTM-NHTDCN6S.json` | GTM-NHTDCN6S (moveaheadmedia.co.th: /quiz/ and /th/quiz/) | G-2X3GGXFP04 |
| `mam-quiz-ga4-events-GTM-NRK28BX5.json` | GTM-NRK28BX5 (moveaheadmedia.com.au: /quiz/) | G-66ZKHT35F3 |

Each file adds a **MAM Quiz** folder with five GA4 Event tags, five Custom Event
triggers and nine Data Layer Variables:

| Report as | GA4 event (= dataLayer event) | Fires when | Parameters (besides quiz_market, quiz_language) |
| --- | --- | --- | --- |
| Quiz Started | `mam_quiz_start` | the first answer of a quiz (question 1 is the landing view, there is no start button) | — |
| Quiz Step Completed | `mam_quiz_step_complete` | Continue on questions 1–5 (`quiz_step` 1–5), and the contact form sent (`quiz_step` 6) | `quiz_step`, `quiz_step_name` (profile, type, budget, objective, challenge, contact_form), `quiz_answer` (answer ids) |
| Quiz Completed | `mam_quiz_complete` | all 6 steps done, the plan is shown | `quiz_recommended`, `quiz_budget` |
| Consultation CTA Clicked | `mam_quiz_consultation_click` | "Book your free consultation" (`results`), "Talk to us" (`header`), the Free Strategy Consultation card (`plan`) | `cta_location` |
| LINE / WhatsApp Clicked | `mam_quiz_chat_click` | the chat button on the results (LINE in TH, WhatsApp in AU) | `chat_app`, `cta_location` |

"Lead Form Submitted" (`mam_quiz_lead`) is not in the files: it is already in both containers.

## Import

1. GTM → the container → **Admin → Import Container**.
2. Choose the file for that container.
3. Workspace: **Existing** (Default Workspace) or a new one.
4. Import option: **Merge**, then **Rename conflicting tags, triggers, and variables**. Never choose
   Overwrite.
5. Confirm, check the MAM Quiz folder (Preview on a quiz page if you like), then **Submit → Publish**.

## GA4

To use the parameters in GA4 reports and explorations, register them once per property:
**Admin → Custom definitions → Create custom dimension**. Use the event scope and the same name for
each of: `quiz_step`, `quiz_step_name`, `quiz_answer`, `quiz_recommended`, `quiz_budget`,
`cta_location`, `chat_app`, `quiz_market`, `quiz_language`. A funnel exploration on
`mam_quiz_step_complete` split by `quiz_step` shows where people drop out.

Regenerate the files with `node deploy/gtm/make-import.mjs` after changing an event in
`assets/js/app.js`.
