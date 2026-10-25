// Reviewed help content. Edit this typed module when a workflow changes.
import type { HelpGuide, HelpTask } from './help-contract';

export const HELP_REVIEWED_ON = '2026-10-26';

export const HELP_GUIDES: readonly HelpGuide[] = [
  {
    "id": "recruiter",
    "name": "Recruiter",
    "summary": "Source candidates and track submissions",
    "intro": "The recruiter workspace brings together your active requisitions, candidate sourcing, personal submissions, and upcoming interviews. Start with the assigned requirement, review its criteria, then find or import a candidate and track the submission through internal review and interviews.",
    "sections": [
      {
        "id": "1-understand-your-requirement",
        "title": "1. Understand your requirement",
        "body": "In Priority requisitions, check the role, client, and sourcing coverage. Open the job and read its title, code, employment type, location, work mode, authorization, budget, skills, and description before submitting. Job access depends on approval, your assignment, and workspace scope; the existence of a job does not mean every recruiter can see it."
      },
      {
        "id": "2-search-before-adding-a-profile",
        "title": "2. Search before adding a profile",
        "body": "Use Search candidates to look for an existing profile. Add candidate starts profile entry; Add CV starts the job-related import workflow. The individual resume import accepts PDF, DOC, DOCX, and TXT and displays a 10 MB limit. Review extracted details for accuracy; parsing does not guarantee every field is correct."
      },
      {
        "id": "3-distinguish-import-from-submission",
        "title": "3. Distinguish import from submission",
        "body": "A candidate in the pool is not automatically a candidate submitted to every job. The import workflow can optionally submit to a selected requirement. Check the selected job and the confirmation message. Duplicate detection may reuse an existing profile; the message distinguishes a profile already in the pool from a duplicate CV successfully submitted to the requisition."
      },
      {
        "id": "4-follow-screening-and-interview-progress",
        "title": "4. Follow screening and interview progress",
        "body": "Open My submissions or the job’s Pipeline tab. A submission awaiting internal approval cannot have interviews updated yet. Authorized reviewers handle internal screening. Interview scheduling, L1/L2/L3 results, remarks, and final outcomes have separate capabilities; your screen may be read-only even when you can view the record."
      },
      {
        "id": "5-keep-outcomes-accurate",
        "title": "5. Keep outcomes accurate",
        "body": "Follow current status and feedback rather than treating upload as completion. Selection, offer, and joining are separate outcomes. If a result needs correction, use the authorized correction flow and provide the requested reason. Do not create another candidate merely to work around a pending or rejected submission."
      },
      {
        "id": "6-submit-an-existing-profile-or-cv-to-a-requirement",
        "title": "6. Submit an existing profile or CV to a requirement",
        "body": "Open an eligible job and choose Submit New Candidate, or start Add CV from the priority row. Follow the profile/CV selection offered, confirm the specific requirement, review extracted details and any market-specific pay fields, then submit. Check the result in My submissions; a profile upload by itself is not proof of a job submission."
      }
    ],
    "faqs": [
      {
        "id": "why-can-t-i-see-a-job",
        "title": "Why can’t I see a job?",
        "body": "First check the selected dashboard, branch/unit, and filters. A requirement pending approval is hidden from recruiters until approved. Approved jobs still follow assignment and scope rules. Ask your authorized manager to verify the job status and assignment; switching the guide does not grant access."
      },
      {
        "id": "does-add-candidate-submit-the-candidate-to-a-job",
        "title": "Does Add candidate submit the candidate to a job?",
        "body": "Not by itself in every workflow. Candidate creation/import and submission are different operations. When the import offers submission to a requirement, verify that option and the chosen job. Confirm the result in My submissions or the job pipeline."
      },
      {
        "id": "what-happens-when-the-cv-is-a-duplicate",
        "title": "What happens when the CV is a duplicate?",
        "body": "The individual resume import reports that the candidate already exists. When submission to a job is selected and succeeds, its message says the duplicate CV was submitted to the requisition. Read the result before retrying, and check the existing profile instead of assuming a new candidate was created."
      },
      {
        "id": "why-can-t-i-update-interview-feedback",
        "title": "Why can’t I update interview feedback?",
        "body": "Internal approval is required before interview updates. A submission rejected during internal review has read-only rounds. Otherwise, access depends on the scheduling, round-result, notes, and final-outcome capabilities returned for that submission."
      },
      {
        "id": "what-do-0-2-and-ai-match-mean",
        "title": "What do 0/2 and AI match mean?",
        "body": "The priority-requisition row shows sourcing coverage against its required submission target. AI match opens candidate matches for that particular requirement. A match is a review aid, not a completed submission or hiring decision."
      },
      {
        "id": "which-file-formats-can-i-upload",
        "title": "Which file formats can I upload?",
        "body": "The individual resume import advertises PDF, DOC, DOCX, and TXT, with a 10 MB maximum. Other upload areas may have different limits. Use the instructions shown in the uploader you opened and retain the error message if parsing fails."
      },
      {
        "id": "does-selecting-a-role-guide-change-my-access",
        "title": "Does selecting a role guide change my access?",
        "body": "No. The guide selector only changes documentation. In the application, your assigned dashboard views and granular permissions determine the available workspace and actions. The backend independently checks authorization and ownership."
      },
      {
        "id": "why-do-my-counts-differ-from-this-guide",
        "title": "Why do my counts differ from this guide?",
        "body": "These are captured demo-tenant examples, not live counters. Current records, your assigned branch/unit, permissions, selected view, date range, and filters can produce different counts. Compare labels and scope before reporting a discrepancy."
      },
      {
        "id": "what-should-i-send-to-support",
        "title": "What should I send to support?",
        "body": "Include the page name or URL, the action attempted, expected result, actual message, and approximate time with timezone. Use a screenshot only after removing candidate contact details, compensation details not needed for the issue, credentials, and other private information. Never send passwords or sign-in codes."
      }
    ],
    "pages": [
      {
        "id": "your-recruiter-workspace",
        "title": "Your recruiter workspace",
        "caption": "Dashboard → Recruiter view",
        "description": "This dashboard is your starting point for sourcing. The markings identify candidate search, profile creation, your submission tracker, and the priority-requisition actions. Check coverage before starting work; the screenshot is a captured example, not a live performance report.",
        "image": {
          "src": "/help/screenshots/recruiter-dashboard.png",
          "width": 65536,
          "height": 4292542531,
          "capturedOn": "2026-10-25"
        },
        "markers": [
          {
            "x": 57.3,
            "y": 30.7,
            "width": 13.6,
            "height": 4.5,
            "title": "Search existing candidates",
            "body": "Use Search candidates to find a profile before adding another."
          },
          {
            "x": 71.4,
            "y": 30.7,
            "width": 11.3,
            "height": 4.5,
            "title": "Add a candidate",
            "body": "Open Add candidate to start entering a new profile."
          },
          {
            "x": 83.4,
            "y": 30.7,
            "width": 12.2,
            "height": 4.5,
            "title": "Track your submissions",
            "body": "Open My submissions to follow candidate progress."
          },
          {
            "x": 2.4,
            "y": 74.8,
            "width": 94.5,
            "height": 23,
            "title": "Work your priority roles",
            "body": "Check coverage, then use Add CV or AI match for the relevant job."
          }
        ]
      },
      {
        "id": "review-a-job-before-submitting",
        "title": "Review a job before submitting",
        "caption": "Job Posting → Job Details · Captured in Tenant Admin view",
        "description": "Job Details connects the requirement with its candidate pipeline and matching tools. Review the requirement before choosing Submit New Candidate. The screenshot was captured in Tenant Admin view; recruiters may see fewer actions, and publication/editing rights are not implied.",
        "image": {
          "src": "/help/screenshots/recruiter-job.png",
          "width": 65536,
          "height": 4292542531,
          "capturedOn": "2026-10-25"
        },
        "markers": [
          {
            "x": 8.1,
            "y": 19.2,
            "width": 25.2,
            "height": 12,
            "title": "Confirm the requirement",
            "body": "Review job code, status, client, location, and employment type."
          },
          {
            "x": 42,
            "y": 22.8,
            "width": 16,
            "height": 4.7,
            "title": "Start a submission",
            "body": "Use Submit New Candidate when the action is available to you."
          },
          {
            "x": 14.3,
            "y": 36.8,
            "width": 10,
            "height": 4.1,
            "title": "Follow the pipeline",
            "body": "The Pipeline tab shows submissions associated with this job."
          },
          {
            "x": 24.4,
            "y": 36.8,
            "width": 17.5,
            "height": 4.1,
            "title": "Review matching candidates",
            "body": "AI Candidate Matches opens the job-specific match view."
          }
        ]
      }
    ]
  },
  {
    "id": "account-manager",
    "name": "Account Manager",
    "summary": "Manage requisitions and client delivery",
    "intro": "The Account Manager dashboard summarizes the requisitions and candidate activity in your portfolio. Use it to monitor demand, create accurate job requirements, associate the correct client, and follow candidate delivery. Creating a requirement, making it active, and publishing it to the careers website are distinct steps.",
    "sections": [
      {
        "id": "1-review-your-account-portfolio",
        "title": "1. Review your account portfolio",
        "body": "The dashboard shows Total Jobs, Total Submissions, In Interview, and Filled Jobs. Submission activity can be viewed over 7, 30, or 90 days. The portfolio table connects job codes, client names, locations, submission coverage, and commercial information. Read each label: job demand counts and candidate progress counts measure different things."
      },
      {
        "id": "2-start-the-requirement",
        "title": "2. Start the requirement",
        "body": "Choose Post New Job, then Manual Creation or Parse Job Details. Manual Creation opens the requirement form. Confirm the workspace/business unit and generated job code, and provide the title, type, work mode, priority, work authorization, and budget. Review parsed values rather than assuming extraction has completed the form correctly."
      },
      {
        "id": "3-use-the-correct-employment-type-fields",
        "title": "3. Use the correct employment-type fields",
        "body": "For the captured India Staffing form, Full Time uses a budget in LPA and Client Commission (%). Contract changes the budget to a monthly rupee amount, shows optional expected start/end dates, and replaces commission with Client Bill Rate using Monthly or Hourly units. Leave optional contract dates blank when unconfirmed. These details apply to this market form; do not copy its units into a different market."
      },
      {
        "id": "4-link-the-client-and-complete-the-requirement",
        "title": "4. Link the client and complete the requirement",
        "body": "Choose Client, relevant contact, and End Client where applicable; contact fields may remain unavailable until an account is chosen. Complete location, experience, primary/secondary skills, number of positions, maximum allowed submissions, and job description. Add assignments only where your capabilities allow them. Positions and allowed submissions are different fields."
      },
      {
        "id": "5-save-obtain-approval-and-publish-appropriately",
        "title": "5. Save, obtain approval, and publish appropriately",
        "body": "Save as Draft preserves work without making it a live requirement. Publishing/submission behavior depends on permissions and approval rules. Pending or rejected client/end-client accounts block activation. A requirement pending approval remains hidden from recruiters. On an eligible job, Publish to website controls careers-site publication separately from the job’s internal Active status."
      },
      {
        "id": "6-assign-direct-recruiters-or-pods",
        "title": "6. Assign direct recruiters or pods",
        "body": "In the job form, open Organizational Information → Job Assignment → Select Pods or Recruiters. Choose the enabled channel and eligible targets, then Apply Assignment and complete the parent form’s save/publish action. Existing jobs have scoped recruiter/pod assignment controls. Automatic mode chooses the next eligible unit pod on publication; saving a draft does not use a round-robin turn."
      },
      {
        "id": "7-update-a-candidate-s-submission-pipeline",
        "title": "7. Update a candidate’s submission pipeline",
        "body": "Open Recruitment and the relevant submission. Use Review for internal screening when enabled; use the available update action for interviews and final status. Confirm candidate/job, choose the round, record interviewer/date/time/timezone and feedback, then Save changes. Later rounds follow prior clearance. Corrections can require a reason and confirmation to reset later rounds; use View change history to verify the result."
      }
    ],
    "faqs": [
      {
        "id": "why-does-a-requirement-remain-pending-approval",
        "title": "Why does a requirement remain pending approval?",
        "body": "Direct publishing depends on your permissions. The backend also checks linked client and end-client approval states. A pending or rejected account prevents activation. Ask an authorized reviewer to check the account and requirement rather than repeatedly submitting the form."
      },
      {
        "id": "is-an-active-job-automatically-visible-on-the-careers-website",
        "title": "Is an Active job automatically visible on the careers website?",
        "body": "Do not assume it is. Job Details shows a separate website-publication state and Publish to website action. Website visibility also depends on eligibility and approval state. Check the displayed publication status as well as the internal job status."
      },
      {
        "id": "what-is-the-difference-between-lpa-and-the-monthly-contract-budget",
        "title": "What is the difference between LPA and the monthly contract budget?",
        "body": "LPA is an annual salary expressed in lakhs. The captured India contract form uses a per-month rupee budget. Enter amounts using the visible unit; do not enter an annual figure into a monthly field."
      },
      {
        "id": "why-did-client-commission-change-to-client-bill-rate",
        "title": "Why did Client Commission change to Client Bill Rate?",
        "body": "The form changes commercial fields with the employment type. Full Time shows placement commission. Contract shows a bill rate and Monthly/Hourly unit selector, plus optional contract dates. Review both candidate budget and client billing fields."
      },
      {
        "id": "why-is-point-of-contact-disabled",
        "title": "Why is Point of Contact disabled?",
        "body": "The captured form disables the contact selector before the associated client is chosen. Select the correct client or end client first, then choose an available contact. If none is available, have an authorized user check the account’s contact setup."
      },
      {
        "id": "are-number-of-positions-and-maximum-allowed-submissions-the-same",
        "title": "Are Number of Positions and Maximum Allowed Submissions the same?",
        "body": "No. Positions describes hiring demand; Maximum Allowed Submissions defines the requirement’s submission target/limit. Review both. Dashboard coverage and pipeline figures should be read against their own labels and denominators."
      },
      {
        "id": "can-i-approve-my-own-client-or-requirement",
        "title": "Can I approve my own client or requirement?",
        "body": "The guide does not grant approval rights. Approval requires the relevant explicit permissions and the backend’s scope checks. Use the action shown for your account; if it is unavailable, route the item to an authorized reviewer."
      },
      {
        "id": "why-are-pods-or-recruiters-missing-from-job-assignment",
        "title": "Why are Pods or Recruiters missing from Job Assignment?",
        "body": "The modal combines explicit assignment permissions with the selected unit’s routing settings. Manual pods are unavailable in automatic-pod mode; direct recruiters appear only if enabled. A missing operating unit or empty eligible pool can also prevent selection."
      },
      {
        "id": "does-apply-assignment-publish-my-job",
        "title": "Does Apply Assignment publish my job?",
        "body": "No. In the job-creation form it applies the selected channel to the form. Finish the parent Save as Draft or publish/submission action to persist the requirement."
      },
      {
        "id": "how-do-i-update-the-submission-pipeline",
        "title": "How do I update the submission pipeline?",
        "body": "Open the submission from Recruitment, verify candidate and job, then use the available interview/update action. Internal approval is required first. Update only permitted rounds/outcomes, include required remarks or correction reasons, save, and check change history."
      },
      {
        "id": "which-action-opens-the-pipeline-editor",
        "title": "Which action opens the pipeline editor?",
        "body": "In the captured Submissions Tracker, open the intended row’s Actions menu and choose Edit status. The Update submission dialog contains the permitted interview round, remarks, final status, change history, and Save changes. The fields depend on approval and current progression."
      },
      {
        "id": "does-selecting-a-role-guide-change-my-access",
        "title": "Does selecting a role guide change my access?",
        "body": "No. The guide selector only changes documentation. In the application, your assigned dashboard views and granular permissions determine the available workspace and actions. The backend independently checks authorization and ownership."
      },
      {
        "id": "why-do-my-counts-differ-from-this-guide",
        "title": "Why do my counts differ from this guide?",
        "body": "These are captured demo-tenant examples, not live counters. Current records, your assigned branch/unit, permissions, selected view, date range, and filters can produce different counts. Compare labels and scope before reporting a discrepancy."
      },
      {
        "id": "what-should-i-send-to-support",
        "title": "What should I send to support?",
        "body": "Include the page name or URL, the action attempted, expected result, actual message, and approximate time with timezone. Use a screenshot only after removing candidate contact details, compensation details not needed for the issue, credentials, and other private information. Never send passwords or sign-in codes."
      }
    ],
    "pages": [
      {
        "id": "monitor-your-account-portfolio",
        "title": "Monitor your account portfolio",
        "caption": "Dashboard → Account Manager view",
        "description": "Use the portfolio dashboard to identify demand and follow delivery. The period buttons affect the activity chart; total portfolio figures have their own labels. Scroll further for the hiring pipeline and portfolio table.",
        "image": {
          "src": "/help/screenshots/account-manager-dashboard.png",
          "width": 65536,
          "height": 4292542531,
          "capturedOn": "2026-10-25"
        },
        "markers": [
          {
            "x": 68.6,
            "y": 17,
            "width": 12,
            "height": 4.5,
            "title": "Create a requirement",
            "body": "Use Post New Job to open the requisition form."
          },
          {
            "x": 2.2,
            "y": 27.4,
            "width": 94.8,
            "height": 16,
            "title": "Review portfolio metrics",
            "body": "Compare total jobs, submissions, interviews, and filled jobs."
          },
          {
            "x": 2.2,
            "y": 46.1,
            "width": 94.8,
            "height": 52.8,
            "title": "Check submission activity",
            "body": "Use the date-range controls to inspect activity across the selected period."
          }
        ]
      },
      {
        "id": "create-a-full-time-requirement",
        "title": "Create a full-time requirement",
        "caption": "Job Posting → Post New Job · Full Time · Account Manager view",
        "description": "This full-time India Staffing form uses LPA for the annual candidate budget and a placement commission for the client. Complete the remaining skills, location, description, positions, and submission fields before saving. The publication button shown belongs to the captured Account Manager account; approval rules still apply.",
        "image": {
          "src": "/help/screenshots/account-manager-form.png",
          "width": 65536,
          "height": 4292542531,
          "capturedOn": "2026-10-25"
        },
        "markers": [
          {
            "x": 50.2,
            "y": 30.5,
            "width": 44,
            "height": 4,
            "title": "Enter the job title",
            "body": "Use a clear title and verify the workspace and generated job code."
          },
          {
            "x": 5,
            "y": 38,
            "width": 21.5,
            "height": 4,
            "title": "Choose the employment type",
            "body": "Full Time is selected in this example."
          },
          {
            "x": 50.2,
            "y": 45.4,
            "width": 44,
            "height": 4,
            "title": "Set the salary budget",
            "body": "The full-time budget range uses LPA."
          },
          {
            "x": 3.6,
            "y": 53.2,
            "width": 92,
            "height": 21.4,
            "title": "Link the client",
            "body": "Choose the client and relevant contacts; review the placement commission."
          },
          {
            "x": 79.2,
            "y": 15,
            "width": 16.7,
            "height": 4.2,
            "title": "Complete and review before publishing",
            "body": "Finish all required sections below. Save as Draft or submit through the action available to your permissions."
          }
        ]
      },
      {
        "id": "create-a-contract-requirement",
        "title": "Create a contract requirement",
        "caption": "Job Posting → Post New Job · Contract · Account Manager view",
        "description": "Choosing Contract changes the budget to a monthly amount and exposes optional start/end dates. Client billing uses a bill rate with its own Monthly/Hourly selector. Review the unit beside each field; changing the employment type alone does not create or publish a job.",
        "image": {
          "src": "/help/screenshots/account-manager-contract.png",
          "width": 65536,
          "height": 4292542531,
          "capturedOn": "2026-10-25"
        },
        "markers": [
          {
            "x": 5,
            "y": 38,
            "width": 21.5,
            "height": 4,
            "title": "Choose Contract",
            "body": "Select Contract in Job Type."
          },
          {
            "x": 50.2,
            "y": 45.4,
            "width": 44,
            "height": 4,
            "title": "Review the monthly budget",
            "body": "Contract budgets use a monthly amount instead of LPA."
          },
          {
            "x": 3.6,
            "y": 51.7,
            "width": 92,
            "height": 35.8,
            "title": "Confirm dates and billing",
            "body": "Start/end dates are optional. Review Client Bill Rate and its monthly/hourly unit."
          }
        ]
      },
      {
        "id": "assign-recruiters-or-pods",
        "title": "Assign recruiters or pods",
        "caption": "Job creation → Job Assignment · Tenant Admin capture",
        "description": "The actual job-creation assignment dialog separates Recruitment Pods and Individual Recruiters. It was captured without selecting or applying targets. Unit policy controls manual versus automatic allocation and whether direct or unassigned work is allowed.",
        "image": {
          "src": "/help/screenshots/job-assignment.png",
          "width": 65536,
          "height": 4292542531,
          "capturedOn": "2026-10-26"
        },
        "markers": [
          {
            "x": 22.4,
            "y": 20.4,
            "width": 17.3,
            "height": 5,
            "title": "Choose pods when enabled",
            "body": "Recruitment Pods lists eligible unit pods in manual mode. Automatic policy uses its own allocation path."
          },
          {
            "x": 40.8,
            "y": 20.4,
            "width": 19.1,
            "height": 5,
            "title": "Choose direct recruiters when enabled",
            "body": "Individual Recruiters is available only when both your capability and unit policy permit it."
          },
          {
            "x": 22.4,
            "y": 29,
            "width": 55.2,
            "height": 45,
            "title": "Review the eligible selection",
            "body": "Search and choose intended targets. Eligibility and scope are enforced by the actual workflow."
          },
          {
            "x": 58.6,
            "y": 86.3,
            "width": 18.2,
            "height": 4.3,
            "title": "Apply, then save the job",
            "body": "Apply Assignment updates this job form. Complete the parent form save/publish action to persist it."
          }
        ]
      },
      {
        "id": "update-the-submission-pipeline",
        "title": "Update the submission pipeline",
        "caption": "Recruitment → Actions → Edit status · Tenant Admin capture",
        "description": "The actual Edit status action opens Update submission. This capture shows L1 Pending and final In progress; later-stage controls appear according to clearance, current state, and capabilities. No statuses were changed for the screenshot.",
        "image": {
          "src": "/help/screenshots/submission-update.png",
          "width": 65536,
          "height": 4292542531,
          "capturedOn": "2026-10-26"
        },
        "markers": [
          {
            "x": 19.5,
            "y": 33.5,
            "width": 30,
            "height": 7,
            "title": "Update the eligible interview round",
            "body": "Review the current status and permitted values. Schedule and feedback fields appear as the workflow progresses."
          },
          {
            "x": 19.5,
            "y": 41.5,
            "width": 59.2,
            "height": 8.8,
            "title": "Record meaningful round remarks",
            "body": "Use the relevant round remarks to document feedback. Required correction/rejection reasons depend on the action."
          },
          {
            "x": 19.5,
            "y": 55.5,
            "width": 60.5,
            "height": 16.8,
            "title": "Review final outcome separately",
            "body": "Selection, offer, joining, and other final outcomes have separate validation and capability checks."
          },
          {
            "x": 19.5,
            "y": 73.6,
            "width": 14.1,
            "height": 3.5,
            "title": "Verify change history",
            "body": "View change history shows recorded updates. Corrections can require a reason and a later-round reset confirmation."
          },
          {
            "x": 67.4,
            "y": 80.2,
            "width": 13.4,
            "height": 4.4,
            "title": "Save the reviewed changes",
            "body": "Use Save changes only after confirming candidate, job, round, and outcome. This captured editor was closed without saving."
          }
        ]
      }
    ]
  },
  {
    "id": "delivery-head",
    "name": "Delivery Head",
    "summary": "Monitor delivery and interview bottlenecks",
    "intro": "The Delivery Head dashboard combines active demand, submissions, scheduled interviews, joined candidates, stage distribution, priority jobs, and pod workload. Use it to locate delivery gaps and open the relevant workflow. A dashboard count is a navigation aid and summary; it does not itself approve, assign, or finalize a record.",
    "sections": [
      {
        "id": "1-establish-your-delivery-scope",
        "title": "1. Establish your delivery scope",
        "body": "Check the branch and unit displayed in the header. The dashboard is scoped to the authenticated workspace and permissions. Active jobs links to Priority jobs; Scheduled interviews links to Upcoming interviews. Total submissions and Joined candidates select the relevant submission view."
      },
      {
        "id": "2-read-the-interview-pipeline-correctly",
        "title": "2. Read the interview pipeline correctly",
        "body": "Total submissions displays submitted count against required submissions and the coverage percentage. Stage cards show the current L1, L2, L3, and Final distribution. Pending, Scheduled, and Feedback break down that stage. Select a stage to inspect matching submissions. Stage share is measured against total submissions; it is not the same measure as required-submission coverage."
      },
      {
        "id": "3-resolve-internal-review-before-interview-work",
        "title": "3. Resolve internal review before interview work",
        "body": "An Internal review stage is shown when there are pending reviews and you have review capability. Open the review workflow to assess the submission; interview updates require internal approval. Rejected internal reviews remain read-only for interview rounds. Viewing the pipeline alone does not grant review permission."
      },
      {
        "id": "4-review-priority-demand-and-workload",
        "title": "4. Review priority demand and workload",
        "body": "Priority jobs shows up to eight active jobs ordered by priority. Pod workload summarizes active job counts and members by pod. Use the jobs and Recruitment Pods workspaces to investigate or assign work when authorized. Opening a job or a pod summary does not change its assignment."
      },
      {
        "id": "5-control-interview-corrections-and-outcomes",
        "title": "5. Control interview corrections and outcomes",
        "body": "Scheduling, individual round results, notes, and final outcome changes are separate capabilities. The tracker can require remarks for direct outcomes or unfinished interview rounds, reasons for corrections, and confirmation when earlier-round changes reset later-round data. Review those prompts carefully before saving. Selection, offer, and joining should reflect actual confirmed events."
      },
      {
        "id": "6-manage-eligible-staff-and-designated-managers",
        "title": "6. Manage eligible staff and designated managers",
        "body": "Open Users & Teams, select the correct unit, and use the allowed profile, business-role, status, review-request, or Assign Manager action for that member. Management requires user-management capability, matching scope, and an unprotected target. Assign Manager sets a designated review route or Auto (Hierarchy); it does not create branch or tenant administrative authority."
      },
      {
        "id": "7-build-pods-and-distribute-job-work",
        "title": "7. Build pods and distribute job work",
        "body": "Use Recruitment Pods → Create Pod/Edit Pod Details & Members for team structure. Confirm the unit, choose an eligible lead and recruiter members, and review before saving. Job-level assignment is separate: assign pods or individual recruiters through the job’s enabled assignment controls."
      },
      {
        "id": "8-understand-your-administration-limit",
        "title": "8. Understand your administration limit",
        "body": "The current backend explicitly prevents Delivery Heads from managing role definitions/permissions or assigning administrative roles. Ask the tenant administrator for custom-role policy changes. Staff business-role assignment remains subject to its own scope and capability checks."
      }
    ],
    "faqs": [
      {
        "id": "why-is-the-internal-review-stage-missing",
        "title": "Why is the Internal review stage missing?",
        "body": "The delivery presentation shows it only when a pending review exists and the user can review. If there are no pending reviews or you lack the capability, that stage is not shown. Its absence alone does not indicate an error."
      },
      {
        "id": "why-do-the-pipeline-percentages-have-different-denominators",
        "title": "Why do the pipeline percentages have different denominators?",
        "body": "Submission coverage compares completed submissions with the requirement target. L1/L2/L3/Final stage share compares candidates in that current stage with total submissions. They answer different questions, so their percentages should not be treated as interchangeable."
      },
      {
        "id": "do-candidates-count-in-every-interview-round-they-have-completed",
        "title": "Do candidates count in every interview round they have completed?",
        "body": "The delivery view describes current-stage distribution. A candidate’s historical progress is different from the current-stage count. Open the submission for its individual round statuses and history instead of summing completed rounds as separate candidates."
      },
      {
        "id": "why-can-t-i-change-a-result-even-as-delivery-head",
        "title": "Why can’t I change a result even as Delivery Head?",
        "body": "Role names group permissions; the server supplies the actual submission capabilities. Internal approval, closed/rejected states, paused workflows, scope, and individual round capabilities can make actions read-only. Use the permitted review or correction flow."
      },
      {
        "id": "what-happens-if-an-earlier-cleared-round-is-corrected",
        "title": "What happens if an earlier cleared round is corrected?",
        "body": "If later rounds already contain results, dates, or remarks, the tracker can require confirmation to reset affected later rounds. Corrections to recorded results require a reason. Review the affected rounds before saving; do not assume later information will remain valid."
      },
      {
        "id": "can-i-record-offer-or-joined-directly",
        "title": "Can I record Offer or Joined directly?",
        "body": "The tracker validates progression and can require final remarks for a direct outcome or unfinished interview. L1 clearance and rejection checks also affect available progression. Follow the current validation prompts and your final-outcome permission; a dashboard card is not a bypass."
      },
      {
        "id": "does-the-priority-list-contain-every-active-job",
        "title": "Does the priority list contain every active job?",
        "body": "No. This dashboard section displays up to eight active jobs, highest priority first. Use the jobs workspace for the wider list, while respecting branch/unit scope."
      },
      {
        "id": "can-a-delivery-head-create-custom-roles-or-change-permissions",
        "title": "Can a Delivery Head create custom roles or change permissions?",
        "body": "No. The current backend expressly blocks Delivery Heads from role and permission management. Request the change from the tenant administrator."
      },
      {
        "id": "can-a-delivery-head-manage-staff",
        "title": "Can a Delivery Head manage staff?",
        "body": "With user-management capability, within the permitted branch/unit and for eligible unprotected targets. This does not permit assigning administrative roles or managing role definitions."
      },
      {
        "id": "how-do-i-appoint-a-pod-lead",
        "title": "How do I appoint a pod lead?",
        "body": "Create or edit the pod in Recruitment Pods. Select its branch/unit, choose an eligible lead through + Assign, review members, and save the pod. Pod Lead access follows that relationship."
      },
      {
        "id": "why-is-pod-deletion-blocked",
        "title": "Why is pod deletion blocked?",
        "body": "The live pod list blocks deletion when jobs are still assigned. Reassign or remove those job assignments through the authorized workflow before attempting deletion."
      },
      {
        "id": "does-selecting-a-role-guide-change-my-access",
        "title": "Does selecting a role guide change my access?",
        "body": "No. The guide selector only changes documentation. In the application, your assigned dashboard views and granular permissions determine the available workspace and actions. The backend independently checks authorization and ownership."
      },
      {
        "id": "why-do-my-counts-differ-from-this-guide",
        "title": "Why do my counts differ from this guide?",
        "body": "These are captured demo-tenant examples, not live counters. Current records, your assigned branch/unit, permissions, selected view, date range, and filters can produce different counts. Compare labels and scope before reporting a discrepancy."
      },
      {
        "id": "what-should-i-send-to-support",
        "title": "What should I send to support?",
        "body": "Include the page name or URL, the action attempted, expected result, actual message, and approximate time with timezone. Use a screenshot only after removing candidate contact details, compensation details not needed for the issue, credentials, and other private information. Never send passwords or sign-in codes."
      }
    ],
    "pages": [
      {
        "id": "read-the-delivery-pipeline",
        "title": "Read the delivery pipeline",
        "caption": "Dashboard → Delivery Head view",
        "description": "Use this view to find bottlenecks in the current interview pipeline. Active jobs and scheduled interviews link to sections below, while submission and stage cards select corresponding records. Scroll for stage distribution, priority jobs, pod workload, and upcoming interviews.",
        "image": {
          "src": "/help/screenshots/delivery-head-dashboard.png",
          "width": 65536,
          "height": 4292542531,
          "capturedOn": "2026-10-25"
        },
        "markers": [
          {
            "x": 2.2,
            "y": 27.4,
            "width": 46.8,
            "height": 9.6,
            "title": "Review active demand",
            "body": "Active jobs links to the priority jobs section."
          },
          {
            "x": 50.1,
            "y": 27.4,
            "width": 46.8,
            "height": 9.6,
            "title": "Inspect submissions",
            "body": "Total submissions selects the submission list."
          },
          {
            "x": 2.2,
            "y": 38.5,
            "width": 46.8,
            "height": 9.6,
            "title": "Check scheduled interviews",
            "body": "Scheduled interviews links to upcoming interviews."
          },
          {
            "x": 22.3,
            "y": 59.2,
            "width": 17.5,
            "height": 22.9,
            "title": "Find L1 bottlenecks",
            "body": "Select the L1 stage to inspect its submissions; compare pending, scheduled, and feedback counts."
          },
          {
            "x": 40.7,
            "y": 59.2,
            "width": 54.8,
            "height": 22.9,
            "title": "Follow later-stage progress",
            "body": "Select L2, L3, or Final to inspect that stage. Scroll for priority jobs, pod workload, and upcoming interviews."
          }
        ]
      },
      {
        "id": "assign-recruiters-or-pods",
        "title": "Assign recruiters or pods",
        "caption": "Job creation → Job Assignment · Tenant Admin capture",
        "description": "The actual job-creation assignment dialog separates Recruitment Pods and Individual Recruiters. It was captured without selecting or applying targets. Unit policy controls manual versus automatic allocation and whether direct or unassigned work is allowed.",
        "image": {
          "src": "/help/screenshots/job-assignment.png",
          "width": 65536,
          "height": 4292542531,
          "capturedOn": "2026-10-26"
        },
        "markers": [
          {
            "x": 22.4,
            "y": 20.4,
            "width": 17.3,
            "height": 5,
            "title": "Choose pods when enabled",
            "body": "Recruitment Pods lists eligible unit pods in manual mode. Automatic policy uses its own allocation path."
          },
          {
            "x": 40.8,
            "y": 20.4,
            "width": 19.1,
            "height": 5,
            "title": "Choose direct recruiters when enabled",
            "body": "Individual Recruiters is available only when both your capability and unit policy permit it."
          },
          {
            "x": 22.4,
            "y": 29,
            "width": 55.2,
            "height": 45,
            "title": "Review the eligible selection",
            "body": "Search and choose intended targets. Eligibility and scope are enforced by the actual workflow."
          },
          {
            "x": 58.6,
            "y": 86.3,
            "width": 18.2,
            "height": 4.3,
            "title": "Apply, then save the job",
            "body": "Apply Assignment updates this job form. Complete the parent form save/publish action to persist it."
          }
        ]
      },
      {
        "id": "create-a-pod-and-choose-its-lead",
        "title": "Create a pod and choose its lead",
        "caption": "Recruitment Pods → Create Pod · Tenant Admin capture",
        "description": "Pod structure is managed separately from job assignment. This tenant-admin reference shows the pod name, branch/unit, lead selection, and member list.",
        "image": {
          "src": "/help/screenshots/create-pod.png",
          "width": 65536,
          "height": 4292542531,
          "capturedOn": "2026-10-26"
        },
        "markers": [
          {
            "x": 22,
            "y": 21.1,
            "width": 56,
            "height": 14,
            "title": "Set the pod identity and scope",
            "body": "Enter a pod name, then choose branch and operating unit."
          },
          {
            "x": 22,
            "y": 38.5,
            "width": 56,
            "height": 13.2,
            "title": "Choose the pod lead",
            "body": "Use + Assign. This tenant labels its Pod Lead role teamLead. Leadership access is linked to this pod assignment."
          },
          {
            "x": 22,
            "y": 53.7,
            "width": 56,
            "height": 14.7,
            "title": "Build the recruiting team",
            "body": "Choose eligible recruiters from the same unit. Review availability before selecting members."
          },
          {
            "x": 69,
            "y": 83.4,
            "width": 9,
            "height": 4.3,
            "title": "Save after review",
            "body": "Create Pod persists the lead and members. This preview only displays the workflow."
          }
        ]
      },
      {
        "id": "add-staff-and-assign-business-roles",
        "title": "Add staff and assign business roles",
        "caption": "Users & Teams → Add Team Member · Tenant Admin capture",
        "description": "Staff administration is scoped and capability controlled. The tenant-admin reference may show administrative controls that a Delivery Head is not allowed to use.",
        "image": {
          "src": "/help/screenshots/add-team-member.png",
          "width": 65536,
          "height": 4292542531,
          "capturedOn": "2026-10-26"
        },
        "markers": [
          {
            "x": 22,
            "y": 26,
            "width": 56,
            "height": 14,
            "title": "Identify the staff member",
            "body": "Enter their name and work email in the actual staff workflow."
          },
          {
            "x": 22,
            "y": 43.5,
            "width": 14.5,
            "height": 3.5,
            "title": "Choose the access category",
            "body": "Use Staff & Business Roles for staffing roles; administrative access is a separate protected tab."
          },
          {
            "x": 22,
            "y": 49.2,
            "width": 56,
            "height": 7.4,
            "title": "Set branch and unit",
            "body": "Choose the intended office and branch unit before selecting custom roles."
          },
          {
            "x": 22,
            "y": 60,
            "width": 56,
            "height": 7.2,
            "title": "Select eligible roles",
            "body": "Roles come from the scoped role pool. Complete the remaining required fields and review before adding the member."
          }
        ]
      },
      {
        "id": "update-the-submission-pipeline",
        "title": "Update the submission pipeline",
        "caption": "Recruitment → Actions → Edit status · Tenant Admin capture",
        "description": "The actual Edit status action opens Update submission. This capture shows L1 Pending and final In progress; later-stage controls appear according to clearance, current state, and capabilities. No statuses were changed for the screenshot.",
        "image": {
          "src": "/help/screenshots/submission-update.png",
          "width": 65536,
          "height": 4292542531,
          "capturedOn": "2026-10-26"
        },
        "markers": [
          {
            "x": 19.5,
            "y": 33.5,
            "width": 30,
            "height": 7,
            "title": "Update the eligible interview round",
            "body": "Review the current status and permitted values. Schedule and feedback fields appear as the workflow progresses."
          },
          {
            "x": 19.5,
            "y": 41.5,
            "width": 59.2,
            "height": 8.8,
            "title": "Record meaningful round remarks",
            "body": "Use the relevant round remarks to document feedback. Required correction/rejection reasons depend on the action."
          },
          {
            "x": 19.5,
            "y": 55.5,
            "width": 60.5,
            "height": 16.8,
            "title": "Review final outcome separately",
            "body": "Selection, offer, joining, and other final outcomes have separate validation and capability checks."
          },
          {
            "x": 19.5,
            "y": 73.6,
            "width": 14.1,
            "height": 3.5,
            "title": "Verify change history",
            "body": "View change history shows recorded updates. Corrections can require a reason and a later-round reset confirmation."
          },
          {
            "x": 67.4,
            "y": 80.2,
            "width": 13.4,
            "height": 4.4,
            "title": "Save the reviewed changes",
            "body": "Use Save changes only after confirming candidate, job, round, and outcome. This captured editor was closed without saving."
          }
        ]
      }
    ]
  },
  {
    "id": "tenant-admin",
    "name": "Tenant Admin",
    "summary": "Branches, units, staffing, roles and permissions",
    "intro": "Tenant administration connects the organizational structure with staff access. Set up branches, their operating units, unit routing policies, custom business roles, and staff assignments in that order. Branch heads, unit administrators, pod leads, and designated approval managers each have their own assignment workflow.",
    "sections": [
      {
        "id": "1-establish-branches",
        "title": "1. Establish branches",
        "body": "Open Branch & Units → Branch. Add New Branch collects the name, code, and office location. Assign Branch Admins or Branch Head / Location Admin identifies local leadership. Reopen the branch after saving to verify the result."
      },
      {
        "id": "2-configure-each-operating-unit",
        "title": "2. Configure each operating unit",
        "body": "Open Units → Add Branch Unit. Choose a host branch, unit name/code, market segment, currency, and working schedule. Unit settings control timezone, working days, direct assignment, pod strategy, and assignment-later behavior; these are unit policies, not tenant-wide guarantees."
      },
      {
        "id": "3-connect-staff-and-responsibilities",
        "title": "3. Connect staff and responsibilities",
        "body": "Use Users & Teams for profiles and scoped business-role assignments. Use Assign Staff on a unit for unit membership, and the branch/unit administration controls for administrative responsibility. A role label alone does not establish every relationship."
      },
      {
        "id": "4-define-custom-roles-and-permissions",
        "title": "4. Define custom roles and permissions",
        "body": "Open Role Management → Create Custom Role. Select branch/unit and base role, name the custom role, and review Customize Permissions. The base-role ceiling restricts available actions. Use a role’s Permissions control for later changes and its Staff control to assign eligible users."
      },
      {
        "id": "5-maintain-leadership-separately",
        "title": "5. Maintain leadership separately",
        "body": "Configure a unit’s Pod Lead role as tenant administrator, then choose the person in Recruitment Pods. Assign Manager in Users & Teams is the designated review/approval route and may be Auto (Hierarchy); it is distinct from a branch head or pod lead."
      }
    ],
    "faqs": [
      {
        "id": "does-creating-a-branch-create-its-units-and-staff",
        "title": "Does creating a branch create its units and staff?",
        "body": "No. Branch creation establishes the office location. Units, unit membership, custom roles, and leadership are configured through their own workflows. Verify each after saving."
      },
      {
        "id": "where-are-shift-and-routing-settings-configured",
        "title": "Where are shift and routing settings configured?",
        "body": "On the operating Branch Unit. The captured creation form includes market, currency, timezone, working hours/days, direct recruiter assignment, recruitment pods, pod distribution strategy, and unassigned requisitions."
      },
      {
        "id": "how-do-i-assign-a-branch-admin",
        "title": "How do I assign a Branch Admin?",
        "body": "Use the Branch Admin cell/actions on the branch, or the Branch Head / Location Admin field when creating/editing it. Administrative Access in Users & Teams is a separate protected role/scope workflow. Verify both the recorded responsibility and the effective access."
      },
      {
        "id": "can-a-custom-role-enable-every-permission",
        "title": "Can a custom role enable every permission?",
        "body": "No. Permissions are limited by its base archetype and backend policy. Locked capabilities are not enabled by renaming the role or selecting all allowed permissions."
      },
      {
        "id": "how-is-pod-lead-access-assigned",
        "title": "How is Pod Lead access assigned?",
        "body": "The tenant administrator configures the unit’s Pod Lead role. Selecting a lead in Recruitment Pods grants leadership through that pod relationship. Manual staff assignment of Pod Lead roles is rejected."
      },
      {
        "id": "does-changing-a-role-affect-other-staff",
        "title": "Does changing a role affect other staff?",
        "body": "A role is a shared permission bundle. Review assigned staff before saving a permission change; it can change their effective capabilities. It does not itself transfer branch/unit membership or assign a review manager."
      },
      {
        "id": "does-selecting-a-role-guide-change-my-access",
        "title": "Does selecting a role guide change my access?",
        "body": "No. The guide selector only changes documentation. In the application, your assigned dashboard views and granular permissions determine the available workspace and actions. The backend independently checks authorization and ownership."
      },
      {
        "id": "why-do-my-counts-differ-from-this-guide",
        "title": "Why do my counts differ from this guide?",
        "body": "These are captured demo-tenant examples, not live counters. Current records, your assigned branch/unit, permissions, selected view, date range, and filters can produce different counts. Compare labels and scope before reporting a discrepancy."
      },
      {
        "id": "what-should-i-send-to-support",
        "title": "What should I send to support?",
        "body": "Include the page name or URL, the action attempted, expected result, actual message, and approximate time with timezone. Use a screenshot only after removing candidate contact details, compensation details not needed for the issue, credentials, and other private information. Never send passwords or sign-in codes."
      }
    ],
    "pages": [
      {
        "id": "manage-branches-and-branch-heads",
        "title": "Manage branches and branch heads",
        "caption": "Branch & Units → Branch · Tenant Admin capture",
        "description": "Create branches and assign local leadership here. A branch is an office location; shifts, market alignment, and job routing belong to its operating units.",
        "image": {
          "src": "/help/screenshots/tenant-branches.png",
          "width": 65536,
          "height": 4292542531,
          "capturedOn": "2026-10-26"
        },
        "markers": [
          {
            "x": 60,
            "y": 23.7,
            "width": 13,
            "height": 4,
            "title": "Create a branch",
            "body": "Use Add New Branch; complete identity, code, and location."
          },
          {
            "x": 53.5,
            "y": 48.9,
            "width": 13.5,
            "height": 9.6,
            "title": "Assign branch leadership",
            "body": "Use the Branch Admin cell or the branch actions to assign an eligible branch administrator."
          },
          {
            "x": 42.8,
            "y": 48.9,
            "width": 9,
            "height": 9.6,
            "title": "Open the branch units",
            "body": "Use the unit count to inspect units belonging to that branch."
          },
          {
            "x": 67.5,
            "y": 48.9,
            "width": 8.7,
            "height": 9.6,
            "title": "Review staff allocation",
            "body": "Use the staff count to inspect branch staff; unit membership and business roles are separate."
          }
        ]
      },
      {
        "id": "configure-units-and-routing",
        "title": "Configure units and routing",
        "caption": "Branch & Units → Units · Tenant Admin capture",
        "description": "Units establish operational market, currency, scheduling, membership, and job routing within a branch.",
        "image": {
          "src": "/help/screenshots/tenant-units.png",
          "width": 65536,
          "height": 4292542531,
          "capturedOn": "2026-10-26"
        },
        "markers": [
          {
            "x": 85.3,
            "y": 13.4,
            "width": 12.7,
            "height": 4.4,
            "title": "Create an operating unit",
            "body": "Use Add Branch Unit and choose its host branch."
          },
          {
            "x": 3,
            "y": 38.1,
            "width": 67.3,
            "height": 4.5,
            "title": "Select the correct scope",
            "body": "Filter by branch and market before selecting the unit."
          },
          {
            "x": 56.7,
            "y": 59,
            "width": 8.7,
            "height": 16.5,
            "title": "Assign staff to the unit",
            "body": "Open the staff count or Assign Staff action and review selected members."
          },
          {
            "x": 78.6,
            "y": 58.4,
            "width": 10.4,
            "height": 17.9,
            "title": "Review job routing",
            "body": "Unit policy controls manual/automatic pods, direct recruiters, and unassigned requisitions."
          }
        ]
      },
      {
        "id": "create-a-custom-role",
        "title": "Create a custom role",
        "caption": "Role Management → Create Custom Role · Tenant Admin capture",
        "description": "A custom role is a scoped bundle of capabilities with a base-role ceiling. Create its definition before assigning eligible staff.",
        "image": {
          "src": "/help/screenshots/tenant-create-role.png",
          "width": 65536,
          "height": 4292542531,
          "capturedOn": "2026-10-26"
        },
        "markers": [
          {
            "x": 18.2,
            "y": 26,
            "width": 64,
            "height": 7.3,
            "title": "Choose branch and unit",
            "body": "Scope the role to the intended office and operating unit."
          },
          {
            "x": 18.2,
            "y": 35,
            "width": 64,
            "height": 7.1,
            "title": "Describe the role",
            "body": "Enter a clear custom role name and responsibilities."
          },
          {
            "x": 18.2,
            "y": 58,
            "width": 64,
            "height": 7,
            "title": "Choose its base role",
            "body": "The base role defines the permitted capability ceiling."
          },
          {
            "x": 18.2,
            "y": 67,
            "width": 64,
            "height": 7.9,
            "title": "Customize permissions",
            "body": "Enable only the allowed actions needed for this role."
          },
          {
            "x": 67.7,
            "y": 77.4,
            "width": 14.4,
            "height": 4.6,
            "title": "Review and create",
            "body": "Create the definition, then assign eligible staff separately. Pod Lead assignment follows the pod lifecycle."
          }
        ]
      },
      {
        "id": "add-staff-and-assign-business-roles",
        "title": "Add staff and assign business roles",
        "caption": "Users & Teams → Add Team Member · Tenant Admin capture",
        "description": "Staff setup separates business-role assignment from administrative access. Adding the member is a separate final action from opening this form.",
        "image": {
          "src": "/help/screenshots/add-team-member.png",
          "width": 65536,
          "height": 4292542531,
          "capturedOn": "2026-10-26"
        },
        "markers": [
          {
            "x": 22,
            "y": 26,
            "width": 56,
            "height": 14,
            "title": "Identify the staff member",
            "body": "Enter their name and work email in the actual staff workflow."
          },
          {
            "x": 22,
            "y": 43.5,
            "width": 14.5,
            "height": 3.5,
            "title": "Choose the access category",
            "body": "Use Staff & Business Roles for staffing roles; administrative access is a separate protected tab."
          },
          {
            "x": 22,
            "y": 49.2,
            "width": 56,
            "height": 7.4,
            "title": "Set branch and unit",
            "body": "Choose the intended office and branch unit before selecting custom roles."
          },
          {
            "x": 22,
            "y": 60,
            "width": 56,
            "height": 7.2,
            "title": "Select eligible roles",
            "body": "Roles come from the scoped role pool. Complete the remaining required fields and review before adding the member."
          }
        ]
      },
      {
        "id": "create-a-pod-and-choose-its-lead",
        "title": "Create a pod and choose its lead",
        "caption": "Recruitment Pods → Create Pod · Tenant Admin capture",
        "description": "Pods have a unit, lead, and eligible recruiter members. This tenant calls the lead role teamLead.",
        "image": {
          "src": "/help/screenshots/create-pod.png",
          "width": 65536,
          "height": 4292542531,
          "capturedOn": "2026-10-26"
        },
        "markers": [
          {
            "x": 22,
            "y": 21.1,
            "width": 56,
            "height": 14,
            "title": "Set the pod identity and scope",
            "body": "Enter a pod name, then choose branch and operating unit."
          },
          {
            "x": 22,
            "y": 38.5,
            "width": 56,
            "height": 13.2,
            "title": "Choose the pod lead",
            "body": "Use + Assign. This tenant labels its Pod Lead role teamLead. Leadership access is linked to this pod assignment."
          },
          {
            "x": 22,
            "y": 53.7,
            "width": 56,
            "height": 14.7,
            "title": "Build the recruiting team",
            "body": "Choose eligible recruiters from the same unit. Review availability before selecting members."
          },
          {
            "x": 69,
            "y": 83.4,
            "width": 9,
            "height": 4.3,
            "title": "Save after review",
            "body": "Create Pod persists the lead and members. This preview only displays the workflow."
          }
        ]
      },
      {
        "id": "assign-recruiters-or-pods",
        "title": "Assign recruiters or pods",
        "caption": "Job creation → Job Assignment · Tenant Admin capture",
        "description": "The actual job-creation assignment dialog separates Recruitment Pods and Individual Recruiters. It was captured without selecting or applying targets. Unit policy controls manual versus automatic allocation and whether direct or unassigned work is allowed.",
        "image": {
          "src": "/help/screenshots/job-assignment.png",
          "width": 65536,
          "height": 4292542531,
          "capturedOn": "2026-10-26"
        },
        "markers": [
          {
            "x": 22.4,
            "y": 20.4,
            "width": 17.3,
            "height": 5,
            "title": "Choose pods when enabled",
            "body": "Recruitment Pods lists eligible unit pods in manual mode. Automatic policy uses its own allocation path."
          },
          {
            "x": 40.8,
            "y": 20.4,
            "width": 19.1,
            "height": 5,
            "title": "Choose direct recruiters when enabled",
            "body": "Individual Recruiters is available only when both your capability and unit policy permit it."
          },
          {
            "x": 22.4,
            "y": 29,
            "width": 55.2,
            "height": 45,
            "title": "Review the eligible selection",
            "body": "Search and choose intended targets. Eligibility and scope are enforced by the actual workflow."
          },
          {
            "x": 58.6,
            "y": 86.3,
            "width": 18.2,
            "height": 4.3,
            "title": "Apply, then save the job",
            "body": "Apply Assignment updates this job form. Complete the parent form save/publish action to persist it."
          }
        ]
      },
      {
        "id": "configure-allowed-permissions",
        "title": "Configure allowed permissions",
        "caption": "Role Management → Customize Permissions · Tenant Admin capture",
        "description": "The live permission-customization view separates enabled actions from unavailable capabilities under the selected base archetype. This capture shows an unsaved Recruiter-based role draft; no permissions were changed or saved.",
        "image": {
          "src": "/help/screenshots/tenant-permissions.png",
          "width": 65536,
          "height": 4292542531,
          "capturedOn": "2026-10-26"
        },
        "markers": [
          {
            "x": 18.2,
            "y": 49.5,
            "width": 63,
            "height": 4.8,
            "title": "Confirm the base role",
            "body": "The chosen archetype sets the available capability ceiling."
          },
          {
            "x": 18.2,
            "y": 56.5,
            "width": 63,
            "height": 7,
            "title": "Review the permission bundle",
            "body": "The enabled count summarizes this role draft; it is not a grant to every user."
          },
          {
            "x": 52,
            "y": 65.4,
            "width": 6.2,
            "height": 3.2,
            "title": "Expand permission groups",
            "body": "Use Expand All or a group heading to inspect individual allowed capabilities."
          },
          {
            "x": 19.5,
            "y": 70.7,
            "width": 58.6,
            "height": 15.1,
            "title": "Choose allowed actions deliberately",
            "body": "Inspect job, candidate, and sourcing groups. Group selection changes multiple allowed actions."
          },
          {
            "x": 19.5,
            "y": 86.5,
            "width": 58.6,
            "height": 4.8,
            "title": "Recognize locked capabilities",
            "body": "Unavailable groups cannot be enabled through renaming or selecting all allowed permissions. Review the whole role before saving."
          }
        ]
      }
    ]
  },
  {
    "id": "branch-admin",
    "name": "Branch Admin",
    "summary": "Manage your branch, units and eligible staff",
    "intro": "Branch administration is limited to your assigned branch. Manage eligible branch units, local staff allocation, and local leadership only where the relevant capabilities are enabled. Tenant-wide configuration and other branches remain outside this scope.",
    "sections": [
      {
        "id": "1-confirm-the-branch",
        "title": "1. Confirm the branch",
        "body": "Check the selected dashboard and assigned branch. Branch Admin screenshots here use tenant-admin reference captures; your actual view may contain fewer controls."
      },
      {
        "id": "2-manage-units-in-your-branch",
        "title": "2. Manage units in your branch",
        "body": "Use Branch & Units → Units. Create or edit a unit only within the branch allowed by your account. Select its market, schedule, and recruitment-routing settings."
      },
      {
        "id": "3-allocate-branch-staff",
        "title": "3. Allocate branch staff",
        "body": "Use the branch staff controls and the unit’s Assign Staff workflow. Review existing unit membership and any transfer indication before saving."
      },
      {
        "id": "4-manage-local-business-roles",
        "title": "4. Manage local business roles",
        "body": "Role-management actions require user-management capability and scope. Choose the correct branch/unit and base role. Do not use a custom role to bypass administrative-assignment restrictions."
      },
      {
        "id": "5-escalate-tenant-wide-changes",
        "title": "5. Escalate tenant-wide changes",
        "body": "For another branch, tenant-wide permission policy, or Pod Lead role configuration, use the tenant administrator workflow. Missing scope is not fixed by changing a filter."
      }
    ],
    "faqs": [
      {
        "id": "can-i-create-units-in-another-branch",
        "title": "Can I create units in another branch?",
        "body": "No. The backend constrains branch administration to the assigned branch. Tenant-level permissions are required for wider administration."
      },
      {
        "id": "can-i-manage-all-tenant-staff",
        "title": "Can I manage all tenant staff?",
        "body": "No. Scope and protected-target rules still apply. Use the current branch/unit and the actions allowed for that specific member."
      },
      {
        "id": "can-i-configure-a-pod-lead-role",
        "title": "Can I configure a Pod Lead role?",
        "body": "Pod Lead role configuration is reserved for tenant administration. Branch-scoped pod management and selecting an eligible lead are separate tasks."
      },
      {
        "id": "why-does-assign-staff-show-a-transfer",
        "title": "Why does Assign Staff show a transfer?",
        "body": "The member may already belong to a different operating unit. Review the transfer indication and confirm the intended staffing arrangement before saving."
      },
      {
        "id": "does-selecting-a-role-guide-change-my-access",
        "title": "Does selecting a role guide change my access?",
        "body": "No. The guide selector only changes documentation. In the application, your assigned dashboard views and granular permissions determine the available workspace and actions. The backend independently checks authorization and ownership."
      },
      {
        "id": "why-do-my-counts-differ-from-this-guide",
        "title": "Why do my counts differ from this guide?",
        "body": "These are captured demo-tenant examples, not live counters. Current records, your assigned branch/unit, permissions, selected view, date range, and filters can produce different counts. Compare labels and scope before reporting a discrepancy."
      },
      {
        "id": "what-should-i-send-to-support",
        "title": "What should I send to support?",
        "body": "Include the page name or URL, the action attempted, expected result, actual message, and approximate time with timezone. Use a screenshot only after removing candidate contact details, compensation details not needed for the issue, credentials, and other private information. Never send passwords or sign-in codes."
      }
    ],
    "pages": [
      {
        "id": "manage-branches-and-branch-heads",
        "title": "Manage branches and branch heads",
        "caption": "Branch & Units → Branch · Tenant Admin capture",
        "description": "Branch administration uses the same management workflows within its authorized branch. The reference capture is from Tenant Admin and may show additional actions.",
        "image": {
          "src": "/help/screenshots/tenant-branches.png",
          "width": 65536,
          "height": 4292542531,
          "capturedOn": "2026-10-26"
        },
        "markers": [
          {
            "x": 60,
            "y": 23.7,
            "width": 13,
            "height": 4,
            "title": "Create a branch",
            "body": "Use Add New Branch; complete identity, code, and location."
          },
          {
            "x": 53.5,
            "y": 48.9,
            "width": 13.5,
            "height": 9.6,
            "title": "Assign branch leadership",
            "body": "Use the Branch Admin cell or the branch actions to assign an eligible branch administrator."
          },
          {
            "x": 42.8,
            "y": 48.9,
            "width": 9,
            "height": 9.6,
            "title": "Open the branch units",
            "body": "Use the unit count to inspect units belonging to that branch."
          },
          {
            "x": 67.5,
            "y": 48.9,
            "width": 8.7,
            "height": 9.6,
            "title": "Review staff allocation",
            "body": "Use the staff count to inspect branch staff; unit membership and business roles are separate."
          }
        ]
      },
      {
        "id": "configure-units-and-routing",
        "title": "Configure units and routing",
        "caption": "Branch & Units → Units · Tenant Admin capture",
        "description": "Choose only units in your assigned branch. The backend enforces scope even if a URL or filter is changed.",
        "image": {
          "src": "/help/screenshots/tenant-units.png",
          "width": 65536,
          "height": 4292542531,
          "capturedOn": "2026-10-26"
        },
        "markers": [
          {
            "x": 85.3,
            "y": 13.4,
            "width": 12.7,
            "height": 4.4,
            "title": "Create an operating unit",
            "body": "Use Add Branch Unit and choose its host branch."
          },
          {
            "x": 3,
            "y": 38.1,
            "width": 67.3,
            "height": 4.5,
            "title": "Select the correct scope",
            "body": "Filter by branch and market before selecting the unit."
          },
          {
            "x": 56.7,
            "y": 59,
            "width": 8.7,
            "height": 16.5,
            "title": "Assign staff to the unit",
            "body": "Open the staff count or Assign Staff action and review selected members."
          },
          {
            "x": 78.6,
            "y": 58.4,
            "width": 10.4,
            "height": 17.9,
            "title": "Review job routing",
            "body": "Unit policy controls manual/automatic pods, direct recruiters, and unassigned requisitions."
          }
        ]
      },
      {
        "id": "add-staff-and-assign-business-roles",
        "title": "Add staff and assign business roles",
        "caption": "Users & Teams → Add Team Member · Tenant Admin capture",
        "description": "Staff management requires capability, scope, and an eligible target. Administrative access is protected separately.",
        "image": {
          "src": "/help/screenshots/add-team-member.png",
          "width": 65536,
          "height": 4292542531,
          "capturedOn": "2026-10-26"
        },
        "markers": [
          {
            "x": 22,
            "y": 26,
            "width": 56,
            "height": 14,
            "title": "Identify the staff member",
            "body": "Enter their name and work email in the actual staff workflow."
          },
          {
            "x": 22,
            "y": 43.5,
            "width": 14.5,
            "height": 3.5,
            "title": "Choose the access category",
            "body": "Use Staff & Business Roles for staffing roles; administrative access is a separate protected tab."
          },
          {
            "x": 22,
            "y": 49.2,
            "width": 56,
            "height": 7.4,
            "title": "Set branch and unit",
            "body": "Choose the intended office and branch unit before selecting custom roles."
          },
          {
            "x": 22,
            "y": 60,
            "width": 56,
            "height": 7.2,
            "title": "Select eligible roles",
            "body": "Roles come from the scoped role pool. Complete the remaining required fields and review before adding the member."
          }
        ]
      }
    ]
  },
  {
    "id": "unit-admin",
    "name": "Unit Admin",
    "summary": "Manage your operating unit and staff scope",
    "intro": "A Unit Admin manages one assigned operating unit within its branch. This can include unit configuration, scoped staff membership, and recruitment coordination when enabled. It does not grant branch-wide or tenant-wide administration.",
    "sections": [
      {
        "id": "1-confirm-unit-membership",
        "title": "1. Confirm unit membership",
        "body": "Check the branch and unit in the header. Without an assigned unit, unit-scoped administration and pod operations cannot resolve their working scope."
      },
      {
        "id": "2-configure-the-permitted-unit",
        "title": "2. Configure the permitted unit",
        "body": "Open the unit’s edit/settings workflow and review market, currency, shift/timezone, and assignment policy. Only change settings available under your account."
      },
      {
        "id": "3-maintain-unit-staffing",
        "title": "3. Maintain unit staffing",
        "body": "Open Assign Staff for the unit. Search and review eligible staff, select the intended membership, and save. Staff profile, role assignment, designated manager, and pod membership are separate relationships."
      },
      {
        "id": "4-coordinate-pods-and-delivery",
        "title": "4. Coordinate pods and delivery",
        "body": "Use Recruitment Pods and job allocation controls when enabled. A pod belongs to the unit; lead and member choices must satisfy eligibility and scope rules."
      },
      {
        "id": "5-respect-administrative-boundaries",
        "title": "5. Respect administrative boundaries",
        "body": "Unit Admin assignment is restricted to the actor’s own branch/unit and allowed permissions. Tenant/branch administrative access cannot be granted through this unit-level flow."
      }
    ],
    "faqs": [
      {
        "id": "can-i-assign-another-unit-admin",
        "title": "Can I assign another Unit Admin?",
        "body": "Only if your enabled capabilities and backend policy permit it. The target and role must remain in your current branch/unit, contain only permitted Unit Admin scope, and stay within your allowed permissions."
      },
      {
        "id": "can-i-assign-branch-admin-or-tenant-admin",
        "title": "Can I assign Branch Admin or Tenant Admin?",
        "body": "Unit-level administrative assignment does not permit those elevated scopes. Ask the tenant administrator."
      },
      {
        "id": "why-can-t-i-manage-a-user-in-another-unit",
        "title": "Why can’t I manage a user in another unit?",
        "body": "The user-management policy checks both branch and unit unless higher authorized scope applies. The same tenant alone is insufficient."
      },
      {
        "id": "does-adding-a-recruiter-to-the-unit-put-them-in-a-pod",
        "title": "Does adding a recruiter to the unit put them in a pod?",
        "body": "No. Unit membership and pod membership are separate. Select the recruiter through the pod’s member workflow after confirming eligibility."
      },
      {
        "id": "does-selecting-a-role-guide-change-my-access",
        "title": "Does selecting a role guide change my access?",
        "body": "No. The guide selector only changes documentation. In the application, your assigned dashboard views and granular permissions determine the available workspace and actions. The backend independently checks authorization and ownership."
      },
      {
        "id": "why-do-my-counts-differ-from-this-guide",
        "title": "Why do my counts differ from this guide?",
        "body": "These are captured demo-tenant examples, not live counters. Current records, your assigned branch/unit, permissions, selected view, date range, and filters can produce different counts. Compare labels and scope before reporting a discrepancy."
      },
      {
        "id": "what-should-i-send-to-support",
        "title": "What should I send to support?",
        "body": "Include the page name or URL, the action attempted, expected result, actual message, and approximate time with timezone. Use a screenshot only after removing candidate contact details, compensation details not needed for the issue, credentials, and other private information. Never send passwords or sign-in codes."
      }
    ],
    "pages": [
      {
        "id": "configure-units-and-routing",
        "title": "Configure units and routing",
        "caption": "Branch & Units → Units · Tenant Admin capture",
        "description": "Configure only the unit assigned to your account. A tenant-admin reference capture illustrates the page structure.",
        "image": {
          "src": "/help/screenshots/tenant-units.png",
          "width": 65536,
          "height": 4292542531,
          "capturedOn": "2026-10-26"
        },
        "markers": [
          {
            "x": 85.3,
            "y": 13.4,
            "width": 12.7,
            "height": 4.4,
            "title": "Create an operating unit",
            "body": "Use Add Branch Unit and choose its host branch."
          },
          {
            "x": 3,
            "y": 38.1,
            "width": 67.3,
            "height": 4.5,
            "title": "Select the correct scope",
            "body": "Filter by branch and market before selecting the unit."
          },
          {
            "x": 56.7,
            "y": 59,
            "width": 8.7,
            "height": 16.5,
            "title": "Assign staff to the unit",
            "body": "Open the staff count or Assign Staff action and review selected members."
          },
          {
            "x": 78.6,
            "y": 58.4,
            "width": 10.4,
            "height": 17.9,
            "title": "Review job routing",
            "body": "Unit policy controls manual/automatic pods, direct recruiters, and unassigned requisitions."
          }
        ]
      },
      {
        "id": "add-staff-and-assign-business-roles",
        "title": "Add staff and assign business roles",
        "caption": "Users & Teams → Add Team Member · Tenant Admin capture",
        "description": "Assign members and roles within your unit; tenant/branch administrative assignments are outside ordinary unit authority.",
        "image": {
          "src": "/help/screenshots/add-team-member.png",
          "width": 65536,
          "height": 4292542531,
          "capturedOn": "2026-10-26"
        },
        "markers": [
          {
            "x": 22,
            "y": 26,
            "width": 56,
            "height": 14,
            "title": "Identify the staff member",
            "body": "Enter their name and work email in the actual staff workflow."
          },
          {
            "x": 22,
            "y": 43.5,
            "width": 14.5,
            "height": 3.5,
            "title": "Choose the access category",
            "body": "Use Staff & Business Roles for staffing roles; administrative access is a separate protected tab."
          },
          {
            "x": 22,
            "y": 49.2,
            "width": 56,
            "height": 7.4,
            "title": "Set branch and unit",
            "body": "Choose the intended office and branch unit before selecting custom roles."
          },
          {
            "x": 22,
            "y": 60,
            "width": 56,
            "height": 7.2,
            "title": "Select eligible roles",
            "body": "Roles come from the scoped role pool. Complete the remaining required fields and review before adding the member."
          }
        ]
      },
      {
        "id": "create-a-pod-and-choose-its-lead",
        "title": "Create a pod and choose its lead",
        "caption": "Recruitment Pods → Create Pod · Tenant Admin capture",
        "description": "Pod operations remain within the unit and require the corresponding pod capabilities.",
        "image": {
          "src": "/help/screenshots/create-pod.png",
          "width": 65536,
          "height": 4292542531,
          "capturedOn": "2026-10-26"
        },
        "markers": [
          {
            "x": 22,
            "y": 21.1,
            "width": 56,
            "height": 14,
            "title": "Set the pod identity and scope",
            "body": "Enter a pod name, then choose branch and operating unit."
          },
          {
            "x": 22,
            "y": 38.5,
            "width": 56,
            "height": 13.2,
            "title": "Choose the pod lead",
            "body": "Use + Assign. This tenant labels its Pod Lead role teamLead. Leadership access is linked to this pod assignment."
          },
          {
            "x": 22,
            "y": 53.7,
            "width": 56,
            "height": 14.7,
            "title": "Build the recruiting team",
            "body": "Choose eligible recruiters from the same unit. Review availability before selecting members."
          },
          {
            "x": 69,
            "y": 83.4,
            "width": 9,
            "height": 4.3,
            "title": "Save after review",
            "body": "Create Pod persists the lead and members. This preview only displays the workflow."
          }
        ]
      }
    ]
  },
  {
    "id": "pod-lead",
    "name": "Pod Lead",
    "summary": "Distribute pod work and review candidate delivery",
    "intro": "Pod Leads coordinate the work assigned to pods they lead. This tenant calls the custom role teamLead, based on POD_LEAD. Leadership comes from the pod relationship; a role name or a manually checked business role is not a substitute.",
    "sections": [
      {
        "id": "1-receive-leadership-through-a-pod",
        "title": "1. Receive leadership through a pod",
        "body": "An authorized pod manager selects you as lead in Recruitment Pods. A tenant administrator maintains the unit’s Pod Lead role definition."
      },
      {
        "id": "2-review-pod-demand",
        "title": "2. Review pod demand",
        "body": "Use Pod Jobs and pod-related submission views available in navigation. Check requirements, sourcing coverage, and the recruiters attached to the job."
      },
      {
        "id": "3-distribute-work-to-eligible-recruiters",
        "title": "3. Distribute work to eligible recruiters",
        "body": "Use the job’s recruiter-assignment action when enabled. The pod-lead assignment dialog loads recruiters within the job/pod scope; it does not offer unrestricted tenant staffing."
      },
      {
        "id": "4-follow-candidate-delivery",
        "title": "4. Follow candidate delivery",
        "body": "Review pod submissions, internal screening, interview feedback, and outcomes only where your permission bundle allows them. Keep review remarks and interview records current."
      },
      {
        "id": "5-request-roster-changes-appropriately",
        "title": "5. Request roster changes appropriately",
        "body": "Ask the authorized pod manager for changes outside your available actions. Pod membership management and assigning a recruiter to one job are different operations."
      }
    ],
    "faqs": [
      {
        "id": "why-can-t-i-assign-the-pod-lead-role-manually",
        "title": "Why can’t I assign the Pod Lead role manually?",
        "body": "The backend links leadership roles to pod leadership. Choose a lead in Recruitment Pods; manual role assignment is rejected."
      },
      {
        "id": "why-is-a-recruiter-missing-from-the-assignment-list",
        "title": "Why is a recruiter missing from the assignment list?",
        "body": "The list is constrained by the job/pod, branch, unit, active status, and recruiter eligibility. A person being visible in Users & Teams does not make them eligible for every pod or job."
      },
      {
        "id": "do-i-keep-lead-access-after-being-removed-as-a-lead",
        "title": "Do I keep lead access after being removed as a lead?",
        "body": "Leadership roles follow current pod leadership. When a user no longer heads a pod, the leadership-role lifecycle removes the corresponding access while preserving unrelated business roles."
      },
      {
        "id": "does-a-pod-lead-automatically-approve-all-jobs-and-interviews",
        "title": "Does a Pod Lead automatically approve all jobs and interviews?",
        "body": "No. Review, assignment, scheduling, round results, and final outcomes are separate capabilities. Follow the actions available for the scoped record."
      },
      {
        "id": "does-selecting-a-role-guide-change-my-access",
        "title": "Does selecting a role guide change my access?",
        "body": "No. The guide selector only changes documentation. In the application, your assigned dashboard views and granular permissions determine the available workspace and actions. The backend independently checks authorization and ownership."
      },
      {
        "id": "why-do-my-counts-differ-from-this-guide",
        "title": "Why do my counts differ from this guide?",
        "body": "These are captured demo-tenant examples, not live counters. Current records, your assigned branch/unit, permissions, selected view, date range, and filters can produce different counts. Compare labels and scope before reporting a discrepancy."
      },
      {
        "id": "what-should-i-send-to-support",
        "title": "What should I send to support?",
        "body": "Include the page name or URL, the action attempted, expected result, actual message, and approximate time with timezone. Use a screenshot only after removing candidate contact details, compensation details not needed for the issue, credentials, and other private information. Never send passwords or sign-in codes."
      }
    ],
    "pages": [
      {
        "id": "understand-pod-leadership",
        "title": "Understand pod leadership",
        "caption": "Role Management reference · Tenant Admin capture; not a Pod Lead dashboard",
        "description": "This is a Role Management reference showing how the tenant’s teamLead role maps to POD_LEAD. It is not a screenshot of a Pod Lead dashboard.",
        "image": {
          "src": "/help/screenshots/tenant-roles.png",
          "width": 65536,
          "height": 4292542531,
          "capturedOn": "2026-10-26"
        },
        "markers": [
          {
            "x": 6.8,
            "y": 67.1,
            "width": 37.7,
            "height": 4.8,
            "title": "Recognize the lead role",
            "body": "This tenant uses teamLead for the POD_LEAD base role. A custom display name does not change its scope."
          },
          {
            "x": 50,
            "y": 67.1,
            "width": 11.2,
            "height": 4.8,
            "title": "Review configured capabilities",
            "body": "A tenant administrator controls this unit’s Pod Lead permission bundle. Actual leadership is assigned by choosing a lead in Recruitment Pods."
          }
        ]
      }
    ]
  },
  {
    "id": "bdm",
    "name": "BDM",
    "summary": "Client development using your configured business role",
    "intro": "BDM is a custom business-role name in the captured tenant, using the Account Manager base archetype. It can support client development and requisition coordination, but its permission bundle differs from Account Manager. Follow the shared account workflow only for actions actually enabled for your role.",
    "sections": [
      {
        "id": "1-check-your-configured-role",
        "title": "1. Check your configured role",
        "body": "The Role Management reference shows BDM based on ACCOUNT_MANAGER. The display name is not a separate unlimited authorization model."
      },
      {
        "id": "2-maintain-client-relationships",
        "title": "2. Maintain client relationships",
        "body": "Use Clients and its available contact/account actions. New client approval and direct activation depend on your permissions and account state."
      },
      {
        "id": "3-create-and-allocate-requirements-when-enabled",
        "title": "3. Create and allocate requirements when enabled",
        "body": "Follow the Account Manager procedures for job posting, direct recruiters, or pods. Routing policy and explicit assignment permissions still apply."
      },
      {
        "id": "4-track-delivery-and-feedback",
        "title": "4. Track delivery and feedback",
        "body": "Use the available requisition and submission views. Interview changes and outcomes require their own capabilities."
      },
      {
        "id": "5-ask-for-an-access-review-when-needed",
        "title": "5. Ask for an access review when needed",
        "body": "An authorized role administrator can inspect the BDM permission bundle. Changing dashboard view or renaming the role does not grant an unavailable capability."
      }
    ],
    "faqs": [
      {
        "id": "is-bdm-identical-to-account-manager",
        "title": "Is BDM identical to Account Manager?",
        "body": "Not necessarily. In the demo both use ACCOUNT_MANAGER as the base, but the configured permission bundles differ. Inspect the role’s enabled capabilities."
      },
      {
        "id": "can-bdm-assign-recruiters-or-pods",
        "title": "Can BDM assign recruiters or pods?",
        "body": "Only with the relevant assignment permissions, eligible job scope, and unit policy. The Account Manager how-to describes the workflow, not a universal grant."
      },
      {
        "id": "can-bdm-update-interview-outcomes",
        "title": "Can BDM update interview outcomes?",
        "body": "Only if the submission provides the required scheduling/result/outcome capabilities and its workflow state permits the change."
      },
      {
        "id": "does-selecting-a-role-guide-change-my-access",
        "title": "Does selecting a role guide change my access?",
        "body": "No. The guide selector only changes documentation. In the application, your assigned dashboard views and granular permissions determine the available workspace and actions. The backend independently checks authorization and ownership."
      },
      {
        "id": "why-do-my-counts-differ-from-this-guide",
        "title": "Why do my counts differ from this guide?",
        "body": "These are captured demo-tenant examples, not live counters. Current records, your assigned branch/unit, permissions, selected view, date range, and filters can produce different counts. Compare labels and scope before reporting a discrepancy."
      },
      {
        "id": "what-should-i-send-to-support",
        "title": "What should I send to support?",
        "body": "Include the page name or URL, the action attempted, expected result, actual message, and approximate time with timezone. Use a screenshot only after removing candidate contact details, compensation details not needed for the issue, credentials, and other private information. Never send passwords or sign-in codes."
      }
    ],
    "pages": [
      {
        "id": "understand-your-bdm-role",
        "title": "Understand your BDM role",
        "caption": "Role Management reference · Tenant Admin capture",
        "description": "The captured registry confirms BDM is a custom Account Manager-based role. Use its own enabled capabilities rather than assuming identical access.",
        "image": {
          "src": "/help/screenshots/tenant-roles.png",
          "width": 65536,
          "height": 4292542531,
          "capturedOn": "2026-10-26"
        },
        "markers": [
          {
            "x": 6.8,
            "y": 47.7,
            "width": 24.4,
            "height": 4.6,
            "title": "Check the base role",
            "body": "The captured tenant defines BDM using the Account Manager base."
          },
          {
            "x": 50,
            "y": 47.7,
            "width": 11.2,
            "height": 4.6,
            "title": "Check its own permissions",
            "body": "BDM and Account Manager have different configured permission bundles. Use only the actions available in your selected BDM view."
          }
        ]
      }
    ]
  }
];

export const HELP_TASKS: readonly HelpTask[] = [
  {
    "id": "post-job",
    "guideIds": [
      "account-manager",
      "bdm"
    ],
    "title": "Post a job requirement",
    "where": "Job Posting → Create Job / Post New Job",
    "prerequisites": "Job creation capability and an assigned operating workspace.",
    "steps": [
      "Choose Manual Creation or Parse Job Details.",
      "Confirm branch/unit, generated code, job title, job type, work mode, work authorization, and priority.",
      "Select the correct client/end client and contacts. Pending or rejected linked accounts block activation.",
      "Enter budget and commercial fields using the visible market/type units; complete location, experience, skills, positions, maximum submissions, and description.",
      "Open Job Assignment if required. Choose a permitted channel and apply it.",
      "Review the whole form. Save as Draft for unfinished work, or use the permitted publishing/submission action.",
      "Reopen the requirement and check its approval, assignment, and website-publication states separately."
    ],
    "result": "A persisted draft, pending requirement, or active requirement according to permissions and approval rules.",
    "troubleshooting": "A displayed Publish action does not bypass client approval. Required fields and assignment rules still apply."
  },
  {
    "id": "direct-assignment",
    "guideIds": [
      "account-manager",
      "delivery-head",
      "tenant-admin",
      "branch-admin",
      "unit-admin",
      "pod-lead",
      "bdm"
    ],
    "title": "Assign recruiters directly to a job",
    "where": "Job form → Organizational Information → Job Assignment; existing job assignment action",
    "prerequisites": "Direct recruiter assignment capability, an eligible job, and direct assignment enabled in the unit.",
    "steps": [
      "Confirm the job’s branch/unit and current assignment.",
      "In creation, select Select Pods or Recruiters; for an existing job use its recruiter-assignment action.",
      "Choose Individual Recruiters where enabled and search the eligible list.",
      "Select the intended recruiter(s); review the complete selection. Select All includes the eligible unit list, not just an assumed single search result.",
      "Apply Assignment in the creation form, then finish saving the parent form. In an existing-job dialog, use its save/confirm action.",
      "Refresh/reopen the job and verify the recorded recruiters."
    ],
    "result": "The saved job lists the selected eligible recruiters.",
    "troubleshooting": "Recruiter membership in a pod, unit membership, and assignment to one job are different relationships. An override may require additional capability and a reason."
  },
  {
    "id": "pod-assignment",
    "guideIds": [
      "account-manager",
      "delivery-head",
      "tenant-admin",
      "branch-admin",
      "unit-admin",
      "bdm"
    ],
    "title": "Assign a job to a pod or automatic queue",
    "where": "Job Assignment and operating-unit assignment policy",
    "prerequisites": "Pod assignment capability and the unit’s recruitment-pod system enabled.",
    "steps": [
      "Check whether the unit uses Manual Lead Selection or Automatic Round-Robin.",
      "For manual assignment, open Job Assignment, choose Recruitment Pods, and review each eligible pod’s lead and member count.",
      "Select the intended pod(s), then Apply Assignment.",
      "For automatic mode, use Automatic pod assignment. The next eligible pod is chosen on publication; a draft does not consume a turn.",
      "Complete the job save/publish action and verify the final assignment."
    ],
    "result": "Manual targets are saved or the automatic unit queue allocates an eligible pod.",
    "troubleshooting": "Manual selection is not available in automatic mode. No eligible pods, disabled policy, or missing permission can prevent assignment."
  },
  {
    "id": "submit-candidate",
    "guideIds": [
      "recruiter",
      "pod-lead"
    ],
    "title": "Submit a candidate to a job",
    "where": "Priority requisition → Add CV or Job Details → Submit New Candidate",
    "prerequisites": "Candidate/submission capabilities and access to an eligible accepting requirement.",
    "steps": [
      "Review the job requirement and its current status before sourcing.",
      "Search the candidate pool for an existing profile, or choose the supported CV/profile submission path.",
      "Confirm the selected requirement; review candidate details, availability, skills, and displayed compensation fields.",
      "When importing, confirm whether submission to the requirement is selected. Handle a duplicate-profile message according to its actual result.",
      "Complete the submission action once and wait for confirmation.",
      "Open My submissions or the job Pipeline to verify the candidate-to-job record and its internal-review state."
    ],
    "result": "A candidate-to-job submission exists in the relevant tracker.",
    "troubleshooting": "An imported candidate profile alone is not a submission. A pending/rejected/closed or inaccessible requirement can prevent submission."
  },
  {
    "id": "pipeline-update",
    "guideIds": [
      "account-manager",
      "delivery-head",
      "pod-lead",
      "bdm"
    ],
    "title": "Update the submission pipeline and interview rounds",
    "where": "Recruitment → submission row Actions → Edit status → Update submission",
    "prerequisites": "Per-submission scheduling, round-result, notes, or final-outcome capabilities; internal approval must be complete.",
    "steps": [
      "Open the exact candidate/job submission and read its current internal review and final status.",
      "If Awaiting internal approval is displayed, use the authorized Review workflow or wait for its reviewer.",
      "Choose Actions → Edit status to open Update submission. Confirm the candidate/job and any interview timezone shown.",
      "For the permitted round, record status, interviewer, date/time, and relevant remarks. Later rounds depend on earlier clearance.",
      "Record final outcome only when permitted and supported by the actual event. Add final remarks when direct progression or unfinished interviews require them.",
      "If correcting a prior result, provide Correction reason and review any confirmation to reset later rounds.",
      "Save changes. Use View change history and View submission to verify the result; reload latest values if the record changed elsewhere."
    ],
    "result": "The saved rounds and outcome reflect the confirmed interview progress, with recorded history.",
    "troubleshooting": "Read-only controls can mean missing capability, internal rejection, closed/paused state, or an unmet stage prerequisite. Do not alter another candidate as a workaround."
  },
  {
    "id": "internal-review",
    "guideIds": [
      "account-manager",
      "delivery-head",
      "pod-lead"
    ],
    "title": "Review a candidate submission internally",
    "where": "Recruitment → Review / delivery Internal review",
    "prerequisites": "Internal-screening capability for this scoped submission.",
    "steps": [
      "Open the submission requiring review and confirm candidate and job.",
      "Review the available profile, requirement comparison, documents, and existing remarks.",
      "Use the review workspace’s available decision controls and provide required feedback.",
      "Save the decision and check the submission state.",
      "Only proceed with interview updates once internal approval is complete."
    ],
    "result": "An authorized internal review decision and remarks are recorded.",
    "troubleshooting": "Seeing a submission or a dashboard count does not grant internal-review permission."
  },
  {
    "id": "create-pod",
    "guideIds": [
      "delivery-head",
      "tenant-admin",
      "branch-admin",
      "unit-admin"
    ],
    "title": "Create a recruitment pod and select a lead",
    "where": "More Options → Recruitment Pods → Create Pod",
    "prerequisites": "Pod creation capability, an enabled pod system, and an authorized branch/unit.",
    "steps": [
      "Enter Pod Name and choose the branch and operating unit available to your account.",
      "Under the lead section (teamLead in this tenant), use + Assign, choose an eligible person, and confirm Assign Lead.",
      "In Pod Members, search and select eligible recruiters in that unit.",
      "Review the lead, member count, description, and scope.",
      "Use Create Pod and reopen it to verify the saved structure."
    ],
    "result": "A unit-scoped pod records its lead and eligible members.",
    "troubleshooting": "Missing unit, no eligible members, another pod membership, or an unavailable Pod Lead role can block setup. Ask the tenant administrator to configure the unit’s lead role where needed."
  },
  {
    "id": "edit-pod",
    "guideIds": [
      "delivery-head",
      "tenant-admin",
      "branch-admin",
      "unit-admin"
    ],
    "title": "Maintain pod members and leadership",
    "where": "Recruitment Pods → Edit Pod Details & Members",
    "prerequisites": "Pod editing capability and access to the pod’s unit.",
    "steps": [
      "Find the pod within the permitted operating-unit scope.",
      "Open Edit Pod Details & Members and review the existing lead and members.",
      "Use the lead assignment/removal controls for leadership changes. Search Pod Members for membership changes.",
      "Review unavailable recruiters and any affected job assignments before changing the roster.",
      "Save the pod and verify the recorded lead and members."
    ],
    "result": "Pod structure is updated through its own membership/lead lifecycle.",
    "troubleshooting": "Pod Lead access follows actual leadership, not a manually assigned role checkbox. The current UI excludes recruiters already assigned to other pods."
  },
  {
    "id": "manage-users",
    "guideIds": [
      "delivery-head",
      "tenant-admin",
      "branch-admin",
      "unit-admin"
    ],
    "title": "Manage staff profiles and business-role assignments",
    "where": "More Options → Users & Teams",
    "prerequisites": "User-management capability, matching scope, and an eligible unprotected target.",
    "steps": [
      "Filter staff by branch, role, and status; select the intended member.",
      "Use the member action to edit profile or assign member roles.",
      "Confirm Office Branch and Branch Unit before selecting Custom / Business Roles.",
      "Review the assigned roles; existing protected roles may be read-only.",
      "Save and reopen the member to confirm scope and roles.",
      "Use status/session controls only for the intended member when enabled; they are separate from profile edits."
    ],
    "result": "The selected member has the intended scoped profile and allowed business roles.",
    "troubleshooting": "Delivery Heads cannot manage role definitions/permissions or assign administrative roles. Scoped managers cannot edit protected higher-privilege targets."
  },
  {
    "id": "add-user",
    "guideIds": [
      "delivery-head",
      "tenant-admin",
      "branch-admin",
      "unit-admin"
    ],
    "title": "Add a team member",
    "where": "Users & Teams → Add Team Member",
    "prerequisites": "Creation and assignment actions must be enabled for your current management scope.",
    "steps": [
      "Enter the staff member’s first name, last name, and work email.",
      "Use Staff & Business Roles; choose the correct office branch and branch unit.",
      "Select the available custom business roles for that scope.",
      "Complete the required account fields through the authorized account-creation flow; do not share passwords in support requests.",
      "Review and use Add Member, then verify the new directory entry."
    ],
    "result": "A staff account is created with its allowed scope and business roles.",
    "troubleshooting": "Administrative Access is a separate protected flow; available administrative choices vary by actor. The preview does not create accounts."
  },
  {
    "id": "role-request",
    "guideIds": [
      "delivery-head",
      "tenant-admin",
      "branch-admin",
      "unit-admin"
    ],
    "title": "Review a pending role request",
    "where": "Users & Teams → Pending Role Requests",
    "prerequisites": "Request-review capability and access to the requester’s permitted scope.",
    "steps": [
      "Open Pending Role Requests and select the request.",
      "Confirm the person, requested role, office, and operating unit.",
      "Review the assignable role pool and the actions offered for this request.",
      "Approve or reject through the available decision action, completing required assignment or feedback fields.",
      "Verify the resulting request and member states before handling another request."
    ],
    "result": "The request is resolved with the authorized role/scope decision.",
    "troubleshooting": "Do not substitute a broader administrative role because a requested business role is missing. Ask an authorized role administrator to configure the correct scoped role."
  },
  {
    "id": "designated-manager",
    "guideIds": [
      "delivery-head",
      "tenant-admin",
      "branch-admin",
      "unit-admin"
    ],
    "title": "Assign a user’s designated review manager",
    "where": "Users & Teams → member Manager cell / User Actions → Assign Manager",
    "prerequisites": "Manager-assignment capability for the selected member and an eligible manager option.",
    "steps": [
      "Locate the correct staff member and open Assign Manager.",
      "Review the current designated manager and available eligible reviewers.",
      "Choose the intended manager or Auto (Hierarchy).",
      "Confirm Assign Manager or Save as Auto as displayed.",
      "Reopen the member and verify the Manager column."
    ],
    "result": "The member has an explicit designated review route or uses the configured hierarchy.",
    "troubleshooting": "This is not the branch-head, unit-admin, pod-lead, or general personnel-reporting assignment. Auto follows configured hierarchy, not an invented fallback person."
  },
  {
    "id": "create-branch",
    "guideIds": [
      "tenant-admin"
    ],
    "title": "Create a branch location",
    "where": "Branch & Units → Branch → Add New Branch",
    "prerequisites": "Tenant/branch creation capability.",
    "steps": [
      "Enter Branch Name and the intended Branch Code.",
      "Choose the city and review state/country and address.",
      "Optionally choose Branch Head / Location Admin; otherwise leave assignment for the authorized follow-up workflow.",
      "Review the global remarks-template option.",
      "Create/save the branch and verify it appears in Branch Office Locations.",
      "Create operating units separately; branch creation does not configure their shifts or routing."
    ],
    "result": "A branch office location exists in the tenant.",
    "troubleshooting": "Name, code, and city are required by the inspected creation flow. Verify leadership separately if branch creation succeeds but its follow-up assignment fails."
  },
  {
    "id": "branch-manager",
    "guideIds": [
      "tenant-admin",
      "branch-admin"
    ],
    "title": "Assign or change branch leadership",
    "where": "Branch Office Locations → Branch Admin cell/actions; branch edit governance section",
    "prerequisites": "Branch-manager assignment capability and permission for that branch.",
    "steps": [
      "Select the intended branch.",
      "Open Assign Branch Admins / Change Branch Admins or the branch governance edit control.",
      "Choose the eligible branch administrator(s) provided by the screen.",
      "Review and save, then reopen the branch to verify its Branch Admin listing.",
      "Check the person’s scoped administrative access through the appropriate user workflow if needed."
    ],
    "result": "Branch leadership is recorded for the intended location.",
    "troubleshooting": "Do not confuse this with a user’s designated review manager. The backend independently enforces assignment permission and branch scope."
  },
  {
    "id": "create-unit",
    "guideIds": [
      "tenant-admin",
      "branch-admin"
    ],
    "title": "Create and configure an operating unit",
    "where": "Branch & Units → Units → Add Branch Unit",
    "prerequisites": "Tenant administration or branch administration for the selected host branch.",
    "steps": [
      "Choose host Branch, Branch Unit Name, and Unit Code. Review any Custom Job Code Pattern.",
      "Choose Market Segment and Operating Currency.",
      "Set Operational Timezone, shift name, start/end, break duration, and working days.",
      "Review Job Assignment Policy: direct recruiters, recruitment pods, automatic/manual strategy, and unassigned requisitions.",
      "Save Branch Unit and verify its host branch, market, schedule, and routing badges in the unit list.",
      "Assign staff and unit administration through their own workflows."
    ],
    "result": "An operating unit defines its own market, schedule, currency, and recruitment-routing policy.",
    "troubleshooting": "Changing the unit policy can change the channels available on job forms. Do not assume all units use the same strategy or hours."
  },
  {
    "id": "unit-staff",
    "guideIds": [
      "tenant-admin",
      "branch-admin",
      "unit-admin"
    ],
    "title": "Assign staff to an operating unit",
    "where": "Units → staff count / Actions → Assign Staff",
    "prerequisites": "Administration access to the target unit.",
    "steps": [
      "Open the intended unit and choose Assign Staff.",
      "Search the eligible staff list and review existing membership.",
      "Select the intended members; review any indication that a person will be transferred from another unit.",
      "Use Save Assignments and confirm the unit’s staff listing.",
      "Review business roles, pod membership, and existing work assignments separately."
    ],
    "result": "The unit’s recorded staff membership reflects the saved selection.",
    "troubleshooting": "Unit assignment is distinct from role assignment or pod membership; do not assume a transfer automatically redesigns every relationship."
  },
  {
    "id": "unit-admin",
    "guideIds": [
      "tenant-admin",
      "branch-admin"
    ],
    "title": "Assign unit administration",
    "where": "Branch/unit management → Unit Admin (Branch Unit Manager); protected Administrative Access workflow",
    "prerequisites": "Tenant or permitted branch administration and target-unit access.",
    "steps": [
      "Select the intended branch and unit.",
      "Use the available Unit Admin (Branch Unit Manager) management control.",
      "Choose an eligible administrator and review the target scope.",
      "Save and verify the recorded administrator.",
      "Where administrative role assignment is managed in Users & Teams, confirm the corresponding branch/unit there."
    ],
    "result": "The intended operating unit has the configured administrative responsibility/access.",
    "troubleshooting": "The backend’s unit-admin assignment endpoint requires tenant or allowed branch administration; an ordinary Delivery Head cannot grant administrative roles."
  },
  {
    "id": "create-custom-role",
    "guideIds": [
      "tenant-admin",
      "branch-admin",
      "unit-admin"
    ],
    "title": "Create a custom business role",
    "where": "More Options → Role Management → Create Custom Role",
    "prerequisites": "Role-management capability and allowed scope/base archetype. Delivery Head is explicitly excluded.",
    "steps": [
      "Select Target Branch Office and Target Branch Unit as required by the form.",
      "Enter Custom Role Name and a description of its duties.",
      "Choose Select Base Role to load the appropriate capability ceiling/defaults.",
      "Open Customize Permissions, inspect groups, and enable only the allowed actions required.",
      "Review name, scope, and permissions, then Create Custom Role.",
      "Assign eligible staff separately through the role’s Staff control or Users & Teams."
    ],
    "result": "A scoped role definition exists; staff gain it only through the proper assignment flow.",
    "troubleshooting": "Locked permissions cannot be enabled by Select All Allowed. Custom Pod Lead configuration is tenant-admin only and needs the matching unit."
  },
  {
    "id": "edit-permissions",
    "guideIds": [
      "tenant-admin",
      "branch-admin",
      "unit-admin"
    ],
    "title": "Change a custom role’s permissions",
    "where": "Role Management → role Permissions count / Edit Role Details & Configuration",
    "prerequisites": "Allowed role administration; not available to Delivery Heads.",
    "steps": [
      "Filter to the correct branch/unit and locate the exact role.",
      "Review Base Role and Users Assigned before changing a shared bundle.",
      "Open the Permissions control or Customize Permissions in role edit.",
      "Select individual allowed actions, respecting the base-role ceiling. Avoid broad Select All changes unless that scope is explicitly intended.",
      "Use Save Custom Permissions or the role-edit save action.",
      "Verify the role and review an assigned member’s resulting permitted actions."
    ],
    "result": "The role’s saved capability bundle reflects the intended policy.",
    "troubleshooting": "A display-name change does not change the archetype or bypass locked permissions. Scope and protected administrative assignment rules still apply."
  },
  {
    "id": "assign-custom-role",
    "guideIds": [
      "delivery-head",
      "tenant-admin",
      "branch-admin",
      "unit-admin"
    ],
    "title": "Assign existing business roles to staff",
    "where": "Users & Teams → Assign Member Roles; Role Management → Staff / Assign Staff where permitted",
    "prerequisites": "User-role assignment capability and eligible member/role scope.",
    "steps": [
      "Select the member and verify their branch and unit.",
      "Open Staff & Business Roles or the role’s permitted Assign Staff workflow.",
      "Choose only the custom business roles in the allowed pool.",
      "Review whether the action adds or replaces roles; preserve unrelated intended assignments.",
      "Save and verify the member’s role listing.",
      "For Pod Lead, use pod leadership assignment instead of this manual role flow."
    ],
    "result": "Eligible business roles are recorded against the intended member.",
    "troubleshooting": "Delivery Head staff management does not permit creating definitions, changing permission bundles, or assigning administrative roles."
  }
];
