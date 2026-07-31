import { QuizQuestion } from '../types';

export const OFFICIAL_QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    question: 'A colleague asks you to clock them in because they are running late. What should you do?',
    options: [
      'A. Refuse and tell them to record their own attendance accurately.',
      'B. Clock them in if they confirm their arrival time by message.',
      'C. Clock them in and inform the Supervisor at the end of the day.',
      'D. Use a manual attendance entry so the system is not affected.'
    ],
    correctOptionIndex: 0,
    questionType: 'single',
    category: 'Working Hours, Attendance and Overtime',
    explanation: 'Employees must record their own attendance accurately. Clocking in or out for another employee and falsifying attendance records are prohibited and may constitute serious misconduct.',
    handbookSource: 'Part 4, Timekeeping Policy (PDF p. 20)'
  },
  {
    id: 2,
    question: 'You expect to arrive after your scheduled reporting time because of an unforeseen transport problem. What should you do first?',
    options: [
      'A. Wait until you arrive and explain the reason.',
      'B. Notify your Supervisor immediately and provide a valid reason.',
      'C. Use the 15-minute grace period without notifying anyone.',
      'D. Ask a colleague to update the attendance record for you.'
    ],
    correctOptionIndex: 1,
    questionType: 'single',
    category: 'Working Hours, Attendance and Overtime',
    explanation: 'An employee who expects to be late must notify the Supervisor immediately with a valid and acceptable reason. The 15-minute grace period is discretionary, not an entitlement.',
    handbookSource: 'Part 4, Late Coming Policy (PDF pp. 20-21)'
  },
  {
    id: 3,
    question: 'When working remotely, which responsibilities continue to apply? Select all that apply.',
    options: [
      'A. Remain contactable during working hours.',
      'B. Attend meetings and calls promptly.',
      'C. Meet deadlines and maintain productivity standards.',
      'D. Protect Company and client information.',
      'E. Treat remote work as a permanent entitlement that cannot be withdrawn.'
    ],
    correctOptionIndices: [0, 1, 2, 3],
    questionType: 'multiple',
    category: 'Working Hours, Attendance and Overtime',
    explanation: 'Remote employees remain responsible for availability, meetings, deliverables, performance and information security. Remote work is discretionary and employees may be instructed to return to the office.',
    handbookSource: 'Part 4, Remote Work Policy (PDF p. 19)'
  },
  {
    id: 4,
    question: 'A project requires you to work on a public holiday. Which arrangement best follows the handbook?',
    options: [
      'A. Work first and decide later whether to claim overtime or leave.',
      'B. Obtain prior approval; any overtime, time-off or replacement leave is then determined under Company policy.',
      'C. Record the extra hours as annual leave credit without approval.',
      'D. Arrange a private shift swap and do not inform the Reporting Manager.'
    ],
    correctOptionIndex: 1,
    questionType: 'single',
    category: 'Working Hours, Attendance and Overtime',
    explanation: 'Overtime must be approved by the Reporting Manager. Replacement Leave also requires prior approval and must generally be used within one month from the date earned.',
    handbookSource: 'Part 4, Overtime and Replacement Leave Policies (PDF pp. 21-22)'
  },
  {
    id: 5,
    question: 'You want to take two days of planned Annual Leave. What is the normal minimum application timing?',
    options: [
      'A. At least one week in advance.',
      'B. At least three working days in advance.',
      'C. One month in advance for every Annual Leave request.',
      'D. On the first day of leave, provided a handover is completed.'
    ],
    correctOptionIndex: 0,
    questionType: 'single',
    category: 'Leave Administration',
    explanation: 'The general Annual Leave rule requires application at least one week in advance. The more specific longer-leave procedure applies to requests of three days or more.',
    handbookSource: 'Part 5, Annual Leave Policy (PDF pp. 24-25)'
  },
  {
    id: 6,
    question: 'Which sequence correctly follows the Sick Leave reporting procedure?',
    options: [
      'A. Inform Supervisor at least 1 hour before work -> Supervisor informs HR Group -> obtain MC -> upload MC in HERD within 48 hours -> submit original on return -> HR updates records.',
      'B. Obtain MC -> return to work -> inform Supervisor -> upload MC within 7 days -> HR updates records.',
      'C. Inform HR directly after work starts -> ask Supervisor for approval -> upload MC on return -> keep the original.',
      'D. Upload the MC first -> inform the Supervisor within 48 hours -> send the original only if HR requests it.'
    ],
    correctOptionIndex: 0,
    questionType: 'sequencing',
    category: 'Leave Administration',
    explanation: 'The handbook specifies this six-step sequence, beginning with advance notice to the Supervisor and ending with HR updating attendance and leave records.',
    handbookSource: 'Part 5, Sick Leave Policy and Leave Application Procedure (PDF pp. 25 and 28-29)'
  },
  {
    id: 7,
    question: 'You received an MC for one day of Sick Leave. By when must a copy be submitted through HERD?',
    options: [
      'A. Within 24 hours.',
      'B. Within 48 hours.',
      'C. Within three working days.',
      'D. Only when you return to work.'
    ],
    correctOptionIndex: 1,
    questionType: 'single',
    category: 'Leave Administration',
    explanation: 'A copy of the MC must be submitted through HERD within 48 hours, and the original must be provided to HR or the immediate superior upon return.',
    handbookSource: 'Part 5, Sick Leave Policy (PDF p. 25)'
  },
  {
    id: 8,
    question: 'A serious family emergency prevents you from reporting to work. What is the correct first action?',
    options: [
      'A. Inform your Supervisor immediately.',
      'B. Submit an Unpaid Leave form after returning.',
      'C. Ask a colleague to obtain approval on your behalf.',
      'D. Wait for Management to contact you.'
    ],
    correctOptionIndex: 0,
    questionType: 'single',
    category: 'Leave Administration',
    explanation: 'For Emergency Leave, the employee must inform the Supervisor immediately. The Supervisor then informs the HR Group for acknowledgement.',
    handbookSource: 'Part 5, Emergency Leave and Leave Application Procedure (PDF pp. 26 and 29)'
  },
  {
    id: 9,
    question: 'You plan to apply for four consecutive days of leave. When must the request be submitted under the specific planned-leave procedure?',
    options: [
      'A. At least one week in advance.',
      'B. Two weeks in advance.',
      'C. One month in advance.',
      'D. Two months in advance.'
    ],
    correctOptionIndex: 2,
    questionType: 'single',
    category: 'Leave Administration',
    explanation: 'Requests for three to five days must be submitted one month in advance. Requests exceeding five days must be submitted two months in advance.',
    handbookSource: 'Part 5, Leave Application Procedure (PDF p. 28)'
  },
  {
    id: 10,
    question: 'Before and during approved leave, which employee responsibilities apply? Select all that apply.',
    options: [
      'A. Obtain approval before proceeding on leave.',
      'B. Complete a proper work handover.',
      'C. Apply honestly and responsibly.',
      'D. Remain contactable during emergencies where practicable.',
      'E. Proceed if the Supervisor has not replied by the intended start date.'
    ],
    correctOptionIndices: [0, 1, 2, 3],
    questionType: 'multiple',
    category: 'Leave Administration',
    explanation: 'The general leave guidelines require approval, honest use, proper handover and emergency contactability where practicable. Employees must not proceed without approval.',
    handbookSource: 'Part 5, General Leave Guidelines (PDF p. 29)'
  },
  {
    id: 11,
    question: 'You submit an otherwise valid business expense claim on the 27th day of the month. What normally happens?',
    options: [
      'A. It is automatically rejected.',
      'B. It is carried forward to the next month\'s processing cycle, provided it is still submitted within one month of the expense.',
      'C. It is paid with salary on the last day of the same month.',
      'D. It is converted into Replacement Leave.'
    ],
    correctOptionIndex: 1,
    questionType: 'single',
    category: 'Payroll, Claims and Employee Records',
    explanation: 'Claims submitted after the 25th cut-off are carried to the next processing cycle. All claims must still be submitted within one month from the expense date.',
    handbookSource: 'Part 6, Claims and Reimbursement Policy (PDF p. 32)'
  },
  {
    id: 12,
    question: 'A sales employee submits a client-meal claim without a receipt or Supervisor approval. What is the most likely result?',
    options: [
      'A. The claim must be paid because it was for a client.',
      'B. The claim may be rejected as incomplete or unsupported.',
      'C. The claim is approved if the employee explains it verbally.',
      'D. The claim is paid first and checked during the annual audit.'
    ],
    correctOptionIndex: 1,
    questionType: 'single',
    category: 'Payroll, Claims and Employee Records',
    explanation: 'Employees must use the prescribed form or system, attach original receipts or supporting documents and obtain Supervisor approval. Incomplete or unsupported claims may be rejected.',
    handbookSource: 'Part 6, Claims and Reimbursement Policy (PDF p. 32)'
  },
  {
    id: 13,
    question: 'Which payroll and employee-record responsibilities are correct? Select all that apply.',
    options: [
      'A. Notify HR of changes to personal information within seven calendar days.',
      'B. Wait until the next annual review to update bank details.',
      'C. Ensure bank account details are accurate and up to date.',
      'D. Report a payslip discrepancy within seven calendar days from the payment date.',
      'E. HR may never request supporting documents for personal-information updates.'
    ],
    correctOptionIndices: [0, 2, 3],
    questionType: 'multiple',
    category: 'Payroll, Claims and Employee Records',
    explanation: 'Employees must notify HR of personal-information changes within seven calendar days, keep bank details current and report payslip discrepancies within seven calendar days from payment. HR may request verification documents.',
    handbookSource: 'Part 2, Employee Records (PDF p. 8); Part 6, Payroll Policy (PDF pp. 30-31)'
  },
  {
    id: 14,
    question: 'You receive an unexpected email asking you to open a link and sign in to a Company account. What should you do?',
    options: [
      'A. Open the link on a personal phone to test it.',
      'B. Forward it to colleagues to ask whether it is genuine.',
      'C. Do not click the link and report the suspicious activity immediately to Management or the designated IT representative.',
      'D. Reply to the sender and request the password-reset details.'
    ],
    correctOptionIndex: 2,
    questionType: 'single',
    category: 'IT, Cybersecurity, AI, Confidentiality and PDPA',
    explanation: 'Employees must not click suspicious links and must report suspected cyber incidents immediately to Management or the designated IT representative.',
    handbookSource: 'Part 10, Cybersecurity Policy (PDF p. 61)'
  },
  {
    id: 15,
    question: 'When using a personal device for work, which security actions apply? Select all that apply.',
    options: [
      'A. Obtain Company approval for BYOD use.',
      'B. Use password protection and screen lock.',
      'C. Install software updates.',
      'D. Use MFA where available and report a lost or stolen device immediately.',
      'E. Store confidential information without approval if the device is encrypted.'
    ],
    correctOptionIndices: [0, 1, 2, 3],
    questionType: 'multiple',
    category: 'IT, Cybersecurity, AI, Confidentiality and PDPA',
    explanation: 'BYOD use is subject to approval. Personal work devices must be protected, updated and reported immediately if lost or stolen. Confidential information must not be stored without approval.',
    handbookSource: 'Part 10, BYOD and Password Management Policies (PDF pp. 60-61)'
  },
  {
    id: 16,
    question: 'A designer wants to paste an unpublished client campaign brief into a public AI tool to generate ideas. What is required?',
    options: [
      'A. Remove the client\'s logo and upload the rest.',
      'B. Obtain approval before uploading confidential or client information; otherwise do not upload it.',
      'C. Upload it if the AI account is registered using a Company email.',
      'D. Upload it if the final ideas will be reviewed by a manager.'
    ],
    correctOptionIndex: 1,
    questionType: 'single',
    category: 'IT, Cybersecurity, AI, Confidentiality and PDPA',
    explanation: 'Confidential or client information must not be uploaded to public AI platforms without approval.',
    handbookSource: 'Part 10, AI Usage Policy (PDF pp. 61-62)'
  },
  {
    id: 17,
    question: 'Which actions are required when handling AI output, confidential information and personal data? Select all that apply.',
    options: [
      'A. Verify AI-generated output instead of relying on it without checking.',
      'B. Remain responsible for the accuracy and quality of work produced with AI.',
      'C. Process personal data only for legitimate purposes and protect it from unauthorised access.',
      'D. Report data breaches immediately.',
      'E. Share client information internally with anyone who asks for it.'
    ],
    correctOptionIndices: [0, 1, 2, 3],
    questionType: 'multiple',
    category: 'IT, Cybersecurity, AI, Confidentiality and PDPA',
    explanation: 'Employees must verify AI outputs, remain accountable for deliverables, process personal data legitimately, prevent unauthorised access and report breaches immediately.',
    handbookSource: 'Part 10, AI Usage, Confidentiality and PDPA Policies (PDF pp. 61-63)'
  },
  {
    id: 18,
    question: 'True or False: A Company social media or advertising account becomes the employee\'s property if the employee created and managed it.',
    options: [
      'A. True',
      'B. False'
    ],
    correctOptionIndex: 1,
    questionType: 'boolean',
    category: 'IT, Cybersecurity, AI, Confidentiality and PDPA',
    explanation: 'Company-owned social media, advertising and other digital accounts remain Company property. Access credentials must be returned upon cessation of employment.',
    handbookSource: 'Part 10, Social Media Policy and Digital Asset Ownership (PDF pp. 59-60 and 64)'
  },
  {
    id: 19,
    question: 'A team member repeatedly humiliates a colleague in group chats and deliberately excludes them from work discussions. How is this treated?',
    options: [
      'A. Acceptable performance management if the team is under pressure.',
      'B. Potential bullying or harassment that should be reported.',
      'C. A private communication issue with no workplace relevance.',
      'D. Acceptable if no offensive language is used.'
    ],
    correctOptionIndex: 1,
    questionType: 'single',
    category: 'Code of Conduct and Ethics',
    explanation: 'Repeated humiliation, deliberate exclusion and unwelcome conduct that causes distress or interferes with work may constitute bullying or harassment. Incidents should be reported promptly.',
    handbookSource: 'Part 9, Anti-Harassment and Anti-Bullying Policies (PDF pp. 53-54)'
  },
  {
    id: 20,
    question: 'A vendor offers you cash after you influence a purchasing decision in the vendor\'s favour. What should you do?',
    options: [
      'A. Accept it if the amount is modest.',
      'B. Decline it and report the suspected improper influence.',
      'C. Accept it and share it with the project team.',
      'D. Convert it into a personal gift voucher.'
    ],
    correctOptionIndex: 1,
    questionType: 'single',
    category: 'Code of Conduct and Ethics',
    explanation: 'Employees must not accept cash or inducements intended to influence decisions. Suspected corruption must be reported immediately.',
    handbookSource: 'Part 9, Gift and Hospitality and Anti-Bribery Policies (PDF pp. 55-56)'
  },
  {
    id: 21,
    question: 'You want to take regular freelance marketing work outside your Company duties. What must you do before accepting it?',
    options: [
      'A. Obtain prior written approval from Management.',
      'B. Tell only your closest colleague.',
      'C. Accept it if the work is completed outside office hours.',
      'D. Use annual leave for the freelance work without disclosing it.'
    ],
    correctOptionIndex: 0,
    questionType: 'single',
    category: 'Code of Conduct and Ethics',
    explanation: 'Employees intending to undertake outside employment, freelance work or a business must obtain prior written Management approval.',
    handbookSource: 'Part 9, Outside Employment Policy (PDF p. 57)'
  },
  {
    id: 22,
    question: 'True or False: An employee who makes a good-faith report of suspected misconduct may report to a Supervisor, HR, Management or a designated reporting channel, and the Company will endeavour to protect the employee from retaliation.',
    options: [
      'A. True',
      'B. False'
    ],
    correctOptionIndex: 0,
    questionType: 'boolean',
    category: 'Code of Conduct and Ethics',
    explanation: 'The Whistleblowing Policy lists these reporting routes and provides for confidentiality and protection from retaliation for good-faith reports. False and malicious allegations may result in discipline.',
    handbookSource: 'Part 9, Whistleblowing Policy (PDF pp. 56-57)'
  },
  {
    id: 23,
    question: 'Which sequence correctly follows the Fire Evacuation Procedure?',
    options: [
      'A. Activate alarm if safe -> notify nearby people -> use designated exit -> go to assembly point -> follow emergency instructions -> re-enter only when authorised.',
      'B. Collect personal items -> use the nearest lift -> notify HR -> wait outside the building entrance.',
      'C. Notify colleagues -> finish urgent work -> use any available route -> return when smoke is no longer visible.',
      'D. Call the Supervisor -> remain at the workstation -> evacuate only after receiving a personal message.'
    ],
    correctOptionIndex: 0,
    questionType: 'sequencing',
    category: 'Health, Safety and Emergency Procedures',
    explanation: 'The procedure requires alarm activation if safe, warning others, immediate evacuation through designated exits without using lifts, assembly, following emergency personnel and no re-entry until authorised.',
    handbookSource: 'Part 11, Fire Evacuation Procedure (PDF p. 68)'
  },
  {
    id: 24,
    question: 'During event setup, equipment nearly falls on a colleague but no one is injured. What should happen?',
    options: [
      'A. No report is needed because there was no injury.',
      'B. Report the near miss immediately; the Supervisor informs HR and Management, an incident report is completed, and corrective action follows.',
      'C. Record it only if equipment was damaged.',
      'D. Wait until the next safety meeting to mention it.'
    ],
    correctOptionIndex: 1,
    questionType: 'single',
    category: 'Health, Safety and Emergency Procedures',
    explanation: 'All accidents, injuries and near misses must be reported immediately and handled through the stated reporting, incident-report and corrective-action process.',
    handbookSource: 'Part 11, Accident Reporting Procedure (PDF pp. 68-69)'
  },
  {
    id: 25,
    question: 'Which statement best describes a Performance Improvement Plan (PIP)?',
    options: [
      'A. It automatically ends employment after 30 days.',
      'B. It documents performance gaps and improvement objectives, provides support and reviews progress before Management decides the outcome.',
      'C. It is used only for serious misconduct.',
      'D. It guarantees promotion after successful completion.'
    ],
    correctOptionIndex: 1,
    questionType: 'single',
    category: 'Performance, Complaints and Disciplinary Procedures',
    explanation: 'A PIP supports improvement by identifying gaps, documenting expectations, providing coaching and holding regular reviews. Outcomes may include completion, extension or further action.',
    handbookSource: 'Part 8, Performance Improvement Plan (PDF pp. 45-46)'
  },
  {
    id: 26,
    question: 'An employee verbally reports a workplace harassment complaint. What may the Company do under the complaint procedure?',
    options: [
      'A. Reject it because complaints must always be written.',
      'B. Investigate, request supporting information, interview relevant parties and implement corrective measures where appropriate.',
      'C. Publish the complaint to the department for transparency.',
      'D. Require the employee to resolve it directly with the alleged person before HR can act.'
    ],
    correctOptionIndex: 1,
    questionType: 'single',
    category: 'Performance, Complaints and Disciplinary Procedures',
    explanation: 'Complaints may be verbal or written. The Company may investigate, request evidence, interview relevant parties and take corrective measures while endeavouring to act fairly and confidentially.',
    handbookSource: 'Part 13, Complaint Handling Procedure (PDF pp. 81-82)'
  },
  {
    id: 27,
    question: 'A disputed allegation may involve serious misconduct and possible dismissal. Which process may be used to establish facts and allow the employee to present evidence and witnesses?',
    options: [
      'A. Annual performance appraisal.',
      'B. Domestic Inquiry.',
      'C. Exit Interview.',
      'D. Leave Application review.'
    ],
    correctOptionIndex: 1,
    questionType: 'single',
    category: 'Performance, Complaints and Disciplinary Procedures',
    explanation: 'A Domestic Inquiry may be used for serious misconduct, disputed facts, potential dismissal or significant policy breaches. It supports fact-finding, the right to be heard and procedural fairness.',
    handbookSource: 'Part 13, Domestic Inquiry Procedure (PDF p. 82)'
  },
  {
    id: 28,
    question: 'You decide to resign. Which action follows the handbook?',
    options: [
      'A. Send a written resignation letter to the Immediate Supervisor and HR, stating the intended last working day and notice to be served.',
      'B. Tell the team verbally and stop attending after the final handover.',
      'C. Submit the letter only after Management agrees to waive notice.',
      'D. Send the letter to a colleague and ask them to inform HR later.'
    ],
    correctOptionIndex: 0,
    questionType: 'single',
    category: 'Resignation and Exit Clearance',
    explanation: 'A written resignation must be submitted to the Immediate Supervisor and HR and should state the intended last working day and notice period. The Employment Contract controls the applicable notice length.',
    handbookSource: 'Part 14, Resignation and Notice Period Policies (PDF pp. 87-88)'
  },
  {
    id: 29,
    question: 'Before leaving the Company, which set of actions best meets the employee\'s exit obligations?',
    options: [
      'A. Complete the handover, return physical property and digital credentials, settle outstanding matters, and continue protecting confidential information after employment.',
      'B. Return only items recorded in the asset register and keep account passwords for reference.',
      'C. Delete all client files from Company systems after making a personal backup.',
      'D. Complete the exit interview; no other clearance is required.'
    ],
    correctOptionIndex: 0,
    questionType: 'single',
    category: 'Resignation and Exit Clearance',
    explanation: 'Exit clearance includes handover, return of Company property and digital assets, closure of access rights and settlement of administrative matters. Confidentiality continues after employment.',
    handbookSource: 'Part 14, Exit Clearance and Post-Employment Obligations (PDF pp. 90-92; duplicated at pp. 95-97)'
  },
  {
    id: 30,
    question: 'True or False: Employees are responsible for reading and following the Handbook, complying with later amendments and Company directives, and asking HR for clarification when needed.',
    options: [
      'A. True',
      'B. False'
    ],
    correctOptionIndex: 0,
    questionType: 'boolean',
    category: 'General Employee Responsibilities',
    explanation: 'The Final Provisions and Employee Acknowledgement make employees responsible for understanding, following and staying updated on Company policies and seeking HR clarification when required.',
    handbookSource: 'Final Provisions and Employee Acknowledgement (PDF pp. 98-99)'
  }
];
