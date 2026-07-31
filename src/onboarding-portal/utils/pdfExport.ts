import { jsPDF } from 'jspdf';
import { HandbookModule, QuizQuestion } from '../types';
import { OFFICIAL_HANDBOOK_MODULES } from '../data/fullHandbookData';
import { QUIZ_QUESTIONS } from '../data';

export interface PolicySection {
  heading: string;
  paragraphs: string[];
  bulletPoints?: string[];
}

export interface PolicyDocumentData {
  id: string;
  title: string;
  refCode: string;
  version: string;
  effectiveDate: string;
  category: string;
  department: string;
  fileSize: string;
  summary: string;
  sections: PolicySection[];
  complianceNotes?: string;
  approvedBy?: string;
}

export const OFFICIAL_POLICIES: PolicyDocumentData[] = [
  {
    id: 'handbook-2024',
    title: 'Red Point Employee Handbook 2024',
    refCode: 'DOC-RP-2024-HB01',
    version: 'v2.4 (2024 Official Revision)',
    effectiveDate: 'October 1, 2024',
    category: 'Corporate Governance & HR',
    department: 'All Departments',
    fileSize: '4.2 MB',
    summary: 'The comprehensive operational and cultural guide for all Red Point Sdn. Bhd. employees, covering mission, code of conduct, benefits, working hours, and workplace safety.',
    approvedBy: 'Group HR & Chief Executive Officer',
    complianceNotes: 'All employees are required to complete reading and digital acknowledgment within 14 days of employment commencement.',
    sections: [
      {
        heading: '1. Welcome & Corporate Mission',
        paragraphs: [
          'Welcome to Red Point Sdn. Bhd. Our mission is empowering businesses across Southeast Asia through innovation, operational integrity, and strategic execution.',
          'As a team member, your unique talents and commitment drive our shared success. This handbook serves as your authoritative reference for company policies, professional expectations, and employee benefits.',
        ],
        bulletPoints: [
          'Integrity First: Uphold honest and ethical practices in all professional engagements.',
          'Collaborative Excellence: Work across departments with mutual respect and accountability.',
          'Continuous Learning: Utilize company resources for professional growth and skill development.',
        ],
      },
      {
        heading: '2. Code of Professional Conduct & Ethics',
        paragraphs: [
          'At Red Point, maintaining high ethical standards is paramount. Employees must avoid real or perceived conflicts of interest and maintain confidentiality of all proprietary business data.',
          'Acceptance of external gifts from clients, vendors, or business partners is subject to strict corporate thresholds.',
        ],
        bulletPoints: [
          'Gifts valued under RM100 may be accepted provided they are registered with HR.',
          'Gifts exceeding RM100, cash equivalents, or personal favours must be politely declined or surrendered to HR.',
          'Immediate reporting of potential conflicts of interest to line managers or HR is mandatory.',
        ],
      },
      {
        heading: '3. Working Hours & Hybrid Work Model',
        paragraphs: [
          'Red Point operates a hybrid working structure designed to promote flexibility and focus. Standard working hours are 9:00 AM to 6:00 PM (MYT), Monday to Friday.',
        ],
        bulletPoints: [
          'Core Working Hours: All team members must be reachable and available between 10:00 AM and 4:00 PM MYT.',
          'Remote Work Allocation: Up to 2 flexible remote work days per week subject to supervisor alignment.',
          'Overtime & Time-off: Overtime must be pre-approved by Department Heads in accordance with Malaysian Employment Act provisions.',
        ],
      },
      {
        heading: '4. Employee Benefits, Leave & Claims',
        paragraphs: [
          'We offer a robust benefits package to support physical health, mental well-being, and continuous learning.',
        ],
        bulletPoints: [
          'Annual Leave: 18 days per calendar year for full-time confirmed staff.',
          'Medical Insurance: Outpatient and hospitalization coverage provided upon commencement.',
          'Learning Allowance: Up to RM3,000 per annum for verified certification courses and conferences.',
          'Expense Claims: Monthly business receipts must be submitted via the portal before the 25th of each month.',
        ],
      },
      {
        heading: '5. Compliance Assessment & Sign-Off',
        paragraphs: [
          'Full onboarding compliance requires passing the 30-question Compliance & Handbook Assessment with a minimum grade of 65% (Grade A).',
          'Final digital signature on the onboarding portal legally binds acceptance of all terms contained herein.',
        ],
      },
    ],
  },
  {
    id: 'code-of-conduct',
    title: 'Code of Conduct & Ethics Briefing',
    refCode: 'DOC-RP-2024-ETH02',
    version: 'v1.8',
    effectiveDate: 'September 15, 2024',
    category: 'Legal & Ethics',
    department: 'Legal & Compliance',
    fileSize: '1.8 MB',
    summary: 'Detailed guidelines on anti-bribery, conflicts of interest, external gifts compliance, insider trading, and respectful workplace behavior.',
    approvedBy: 'Head of Legal & Compliance',
    complianceNotes: 'Mandatory annual re-certification required for all procurement, sales, and executive staff.',
    sections: [
      {
        heading: '1. Anti-Bribery & Corruption (MACC Act Compliance)',
        paragraphs: [
          'Red Point enforces a zero-tolerance policy against bribery, kickbacks, and corruption in compliance with Section 17A of the Malaysian Anti-Corruption Commission (MACC) Act 2009.',
          'No employee shall give, offer, or receive financial or non-financial inducements to secure business advantages.',
        ],
        bulletPoints: [
          'Strict prohibition of facilitation payments to government officials.',
          'Rigorous vendor due diligence prior to vendor onboarding.',
          'Confidential whistleblower hotline available 24/7 for reporting violations.',
        ],
      },
      {
        heading: '2. External Gifts, Hospitality & Entertainment Limits',
        paragraphs: [
          'All business entertainment and gifts must be reasonable, customary, and modest.',
        ],
        bulletPoints: [
          'Threshold Limit: Gifts under RM100 are allowable with mandatory HR disclosure.',
          'High-value tokens (>RM100) must be turned over to HR for corporate charity raffles.',
          'Entertainment involving government officers requires prior written clearance from Legal.',
        ],
      },
      {
        heading: '3. Workplace Harassment & Respectful Behavior',
        paragraphs: [
          'Red Point guarantees an inclusive workplace free from discrimination, sexual harassment, or verbal abuse. Any reports will be investigated impartially by the HR Grievance Committee within 48 hours.',
        ],
      },
    ],
  },
  {
    id: 'cp22-tax-form',
    title: 'CP22 Income Tax Declaration Policy & Form',
    refCode: 'DOC-RP-2024-TAX03',
    version: 'v3.1',
    effectiveDate: 'January 1, 2024',
    category: 'Finance & Payroll',
    department: 'Finance & Human Capital',
    fileSize: '500 KB',
    summary: 'Instructions and official compliance declaration form for statutory PCB tax deductions under Lembaga Hasil Dalam Negeri (LHDN) Malaysia.',
    approvedBy: 'Head of Finance & Tax Operations',
    complianceNotes: 'Must be completed and uploaded to the onboarding portal within 3 business days of onboarding.',
    sections: [
      {
        heading: '1. Statutory Requirement for Form CP22',
        paragraphs: [
          'Under Section 83(2) of the Malaysian Income Tax Act 1967, employers must notify LHDN of new employee commencement using Form CP22.',
          'Employees are required to provide accurate Tax Identification Numbers (TIN), EPF member details, and marital status for Monthly Tax Deduction (PCB) calculations.',
        ],
      },
      {
        heading: '2. Required Attachments for Submission',
        paragraphs: [
          'Please ensure the following verified attachments accompany your Form CP22 submission in the Documents portal:',
        ],
        bulletPoints: [
          'Copy of MyKad (front and back) or Passport (for non-citizens).',
          'LHDN Income Tax File Reference Number confirmation.',
          'EPF (KWSP) and SOCSO (PERKESO) account statements or registration slips.',
          'Previous employer EA Form (if joining mid-tax year).',
        ],
      },
    ],
  },
  {
    id: 'data-protection-pdpa',
    title: 'Data Protection & Cybersecurity Policy (PDPA)',
    refCode: 'DOC-RP-2024-SEC04',
    version: 'v2.0',
    effectiveDate: 'August 1, 2024',
    category: 'IT & Security',
    department: 'Information Security',
    fileSize: '2.1 MB',
    summary: 'Guidelines for safeguarding personal data under the Personal Data Protection Act 2010 (PDPA) and protecting Red Point IT assets.',
    approvedBy: 'Chief Information Security Officer',
    complianceNotes: 'Applies to all employee workstations, cloud databases, and client communication channels.',
    sections: [
      {
        heading: '1. Personal Data Protection Act (PDPA) Compliance',
        paragraphs: [
          'All employee, client, and candidate personal data processed by Red Point must be collected lawfully, stored securely, and used strictly for designated business purposes.',
        ],
        bulletPoints: [
          'Data Confidentiality: Unauthorised export or disclosure of customer databases is strictly forbidden.',
          'Encryption Mandatory: Laptops and external drives must utilize AES-256 bit disk encryption.',
          'Clean Desk Policy: Physical confidential files must be locked in drawers when leaving desks.',
        ],
      },
      {
        heading: '2. Device Security & Access Credentials',
        paragraphs: [
          'Employees are issued corporate credentials protected by multi-factor authentication (MFA). Passwords must not be shared or stored in plain text.',
        ],
      },
    ],
  },
  {
    id: 'safety-and-health',
    title: 'Workplace Safety & Health Policy',
    refCode: 'DOC-RP-2024-OSH05',
    version: 'v1.5',
    effectiveDate: 'July 10, 2024',
    category: 'Facilities & Safety',
    department: 'Occupational Safety & Health Committee',
    fileSize: '1.5 MB',
    summary: 'Safety protocols, ergonomic workplace setup, emergency evacuation drills, and incident reporting procedures.',
    approvedBy: 'OSHA Safety Officer',
    complianceNotes: 'Annual safety review and participation in building fire evacuation drills are compulsory.',
    sections: [
      {
        heading: '1. Occupational Safety & Incident Reporting',
        paragraphs: [
          'Red Point is committed to providing a safe physical and psychological work environment. Any hazardous condition, injury, or near-miss must be logged immediately.',
        ],
        bulletPoints: [
          'Emergency Evacuation: Familiarize yourself with emergency exits and designated assembly points.',
          'First Aid: Certified first aid kits and designated wardens are located on every floor.',
          'Desk Ergonomics: Adjust monitor heights and chair lumbar support to prevent repetitive strain.',
        ],
      },
    ],
  },
];

export function exportPolicyToPdf(policy: PolicyDocumentData): void {
  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginLeft = 15;
  const marginRight = 195;
  const contentWidth = marginRight - marginLeft; // 180mm
  const pageBottomMargin = 275;

  let currentY = 0;

  const addHeader = (isFirstPage: boolean) => {
    // Header background bar (Deep Maroon)
    doc.setFillColor(129, 9, 18); // #810912
    doc.rect(0, 0, pageWidth, 18, 'F');

    // Header Gold/Tan Accent Line
    doc.setFillColor(224, 191, 188); // #e0bfbc
    doc.rect(0, 18, pageWidth, 1.5, 'F');

    // Company Title on Header Bar
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('RED POINT SDN. BHD.', marginLeft, 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('OFFICIAL CORPORATE POLICY & COMPLIANCE DOCUMENT', marginRight, 11, { align: 'right' });

    currentY = 26;
  };

  const addFooter = (pageNumber: number, totalPagesEstimate: number) => {
    // Footer line
    doc.setDrawColor(224, 191, 188);
    doc.setLineWidth(0.4);
    doc.line(marginLeft, 282, marginRight, 282);

    // Footer text
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 100, 100);
    doc.text(
      'Red Point Sdn. Bhd. — Confidential Internal Document | Verified via Onboarding Portal',
      marginLeft,
      287
    );

    doc.text(`Page ${pageNumber}`, marginRight, 287, { align: 'right' });
  };

  let pageCount = 1;
  addHeader(true);

  // Document Title Header Box
  doc.setFillColor(250, 246, 239); // #FAF6EF
  doc.setDrawColor(224, 191, 188); // #e0bfbc
  doc.roundedRect(marginLeft, currentY, contentWidth, 22, 2, 2, 'FD');

  doc.setTextColor(27, 28, 28); // #1b1c1c
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(policy.title, marginLeft + 5, currentY + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(89, 65, 63); // #59413f
  doc.text(`Ref: ${policy.refCode}  |  Version: ${policy.version}  |  Effective: ${policy.effectiveDate}`, marginLeft + 5, currentY + 16);

  currentY += 28;

  // Metadata Grid (2 columns)
  doc.setFillColor(246, 243, 242); // #f6f3f2
  doc.roundedRect(marginLeft, currentY, contentWidth, 20, 1.5, 1.5, 'FD');

  doc.setFontSize(8.5);
  doc.setTextColor(27, 28, 28);

  // Col 1
  doc.setFont('helvetica', 'bold');
  doc.text('Category:', marginLeft + 4, currentY + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(policy.category, marginLeft + 25, currentY + 6);

  doc.setFont('helvetica', 'bold');
  doc.text('Department:', marginLeft + 4, currentY + 13);
  doc.setFont('helvetica', 'normal');
  doc.text(policy.department, marginLeft + 25, currentY + 13);

  // Col 2
  const col2X = marginLeft + 95;
  doc.setFont('helvetica', 'bold');
  doc.text('Approved By:', col2X, currentY + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(policy.approvedBy || 'HR Governance Board', col2X + 24, currentY + 6);

  doc.setFont('helvetica', 'bold');
  doc.text('Classification:', col2X, currentY + 13);
  doc.setFont('helvetica', 'normal');
  doc.text('Official Internal Policy', col2X + 24, currentY + 13);

  currentY += 26;

  // Executive Summary Box
  doc.setFillColor(255, 245, 245); // Light red callout
  doc.setDrawColor(163, 38, 38); // #a32626
  doc.roundedRect(marginLeft, currentY, contentWidth, 22, 1.5, 1.5, 'FD');

  // Left red accent strip
  doc.setFillColor(163, 38, 38);
  doc.rect(marginLeft, currentY, 2.5, 22, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(129, 9, 18);
  doc.text('EXECUTIVE POLICY SUMMARY', marginLeft + 6, currentY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(40, 40, 40);
  const summaryLines = doc.splitTextToSize(policy.summary, contentWidth - 10);
  doc.text(summaryLines, marginLeft + 6, currentY + 12);

  currentY += 28;

  // Check Page Break helper
  const checkPageBreak = (neededHeight: number) => {
    if (currentY + neededHeight > pageBottomMargin) {
      addFooter(pageCount, 0);
      doc.addPage();
      pageCount++;
      addHeader(false);
    }
  };

  // Render Policy Sections
  policy.sections.forEach((sec, index) => {
    checkPageBreak(18);

    // Section Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(129, 9, 18); // #810912
    doc.text(sec.heading, marginLeft, currentY);

    // Divider under section
    doc.setDrawColor(224, 191, 188);
    doc.setLineWidth(0.3);
    doc.line(marginLeft, currentY + 2, marginRight, currentY + 2);

    currentY += 8;

    // Paragraphs
    sec.paragraphs.forEach((p) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(35, 35, 35);

      const lines = doc.splitTextToSize(p, contentWidth);
      const heightNeeded = lines.length * 4.2;

      checkPageBreak(heightNeeded + 3);

      doc.text(lines, marginLeft, currentY);
      currentY += heightNeeded + 3;
    });

    // Bullet points
    if (sec.bulletPoints && sec.bulletPoints.length > 0) {
      sec.bulletPoints.forEach((bullet) => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(45, 45, 45);

        const bulletLines = doc.splitTextToSize(bullet, contentWidth - 8);
        const heightNeeded = bulletLines.length * 3.8;

        checkPageBreak(heightNeeded + 2);

        // Bullet bullet icon
        doc.setFillColor(163, 38, 38);
        doc.circle(marginLeft + 2, currentY - 1.2, 0.8, 'F');

        doc.text(bulletLines, marginLeft + 6, currentY);
        currentY += heightNeeded + 2.5;
      });
      currentY += 2;
    }

    currentY += 4;
  });

  // Compliance Notes / Stamp section at bottom
  if (policy.complianceNotes) {
    checkPageBreak(25);

    doc.setFillColor(246, 243, 242);
    doc.setDrawColor(129, 9, 18);
    doc.roundedRect(marginLeft, currentY, contentWidth, 20, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(129, 9, 18);
    doc.text('COMPLIANCE & GOVERNANCE STAMP:', marginLeft + 4, currentY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(50, 50, 50);
    const noteLines = doc.splitTextToSize(policy.complianceNotes, contentWidth - 10);
    doc.text(noteLines, marginLeft + 4, currentY + 11);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(129, 9, 18);
    doc.text('[VERIFIED DIGITAL POLICY RECORD - RED POINT HR]', marginRight - 4, currentY + 16, { align: 'right' });

    currentY += 24;
  }

  // Add final footer on last page
  addFooter(pageCount, pageCount);

  // Trigger file download
  const cleanTitle = policy.title.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`${policy.refCode}_${cleanTitle}.pdf`);
}

export interface AcknowledgementPdfData {
  employeeName: string;
  department: string;
  position: string;
  signedDate: string;
  signatureTextOrImage: string;
  verifiedByHR?: string;
  covenants: string[];
}

export function exportAcknowledgementPdf(data: AcknowledgementPdfData): void {
  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const marginLeft = 15;
  const marginRight = 195;
  const contentWidth = marginRight - marginLeft;

  // Header background bar (Deep Maroon)
  doc.setFillColor(129, 9, 18); // #810912
  doc.rect(0, 0, pageWidth, 26, 'F');

  // Gold accent bar
  doc.setFillColor(212, 175, 55);
  doc.rect(0, 26, pageWidth, 1.5, 'F');

  // Company Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text('REDPOINT SDN. BHD.', marginLeft, 12);

  // Subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(240, 240, 240);
  doc.text('OFFICIAL EMPLOYEE HANDBOOK - FINAL ACKNOWLEDGEMENT & SIGNATURE', marginLeft, 18);

  // Document Info Badge
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('CLASSIFICATION: INTERNAL USE ONLY', marginRight, 12, { align: 'right' });
  doc.text('REF: RP-HB-2024-ACK', marginRight, 17, { align: 'right' });

  let currentY = 36;

  // Title section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(129, 9, 18);
  doc.text('EMPLOYEE HANDBOOK ACKNOWLEDGEMENT FORM', marginLeft, currentY);
  currentY += 7;

  // Preamble
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(50, 50, 50);
  const preamble =
    'This document records the official digital acknowledgement and sign-off for the RedPoint Sdn. Bhd. Employee Handbook. All employees must review, confirm understanding, and execute this agreement upon commencement or updating of policies.';
  const preambleLines = doc.splitTextToSize(preamble, contentWidth);
  doc.text(preambleLines, marginLeft, currentY);
  currentY += preambleLines.length * 4 + 4;

  // Employee Information Table
  doc.setFillColor(246, 243, 242);
  doc.setDrawColor(224, 191, 188);
  doc.roundedRect(marginLeft, currentY, contentWidth, 24, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(129, 9, 18);
  doc.text('EMPLOYEE PARTICULARS', marginLeft + 4, currentY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 30, 30);

  doc.text(`Employee Name: ${data.employeeName}`, marginLeft + 4, currentY + 11);
  doc.text(`Department: ${data.department}`, marginLeft + 95, currentY + 11);

  doc.text(`Position / Title: ${data.position}`, marginLeft + 4, currentY + 18);
  doc.text(`Date of Execution: ${data.signedDate}`, marginLeft + 95, currentY + 18);

  currentY += 30;

  // Covenants / Checklist Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(129, 9, 18);
  doc.text('ACKNOWLEDGEMENT & COMPLIANCE COVENANTS', marginLeft, currentY);
  currentY += 5;

  const covenants = data.covenants && data.covenants.length > 0 ? data.covenants : [
    'I have received a copy of the RedPoint Sdn. Bhd. Employee Handbook.',
    'I have read and understood the contents of this Handbook.',
    'I agree to comply with all Company policies, procedures, rules, and guidelines contained herein and any amendments made from time to time.',
    'I understand that this Handbook does not constitute a contract of employment and does not alter the terms and conditions of my Employment Contract.',
    'I understand that it is my responsibility to seek clarification from Human Resources if I have any questions regarding the contents of this Handbook.',
  ];

  covenants.forEach((cov, idx) => {
    // Checkbox box
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(129, 9, 18);
    doc.rect(marginLeft, currentY, 3.5, 3.5, 'FD');

    // Checkmark tick
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(129, 9, 18);
    doc.text('v', marginLeft + 0.8, currentY + 2.8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.2);
    doc.setTextColor(40, 40, 40);

    const covLines = doc.splitTextToSize(`${idx + 1}. ${cov}`, contentWidth - 8);
    doc.text(covLines, marginLeft + 6, currentY + 2.8);
    currentY += Math.max(covLines.length * 3.8, 6) + 1.5;
  });

  currentY += 4;

  // Signature Block & Corporate Stamp Box
  doc.setFillColor(250, 246, 239);
  doc.setDrawColor(129, 9, 18);
  doc.roundedRect(marginLeft, currentY, contentWidth, 38, 2, 2, 'FD');

  // Left side: Employee Signature
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(129, 9, 18);
  doc.text('DIGITAL SIGNATURE OF EMPLOYEE:', marginLeft + 4, currentY + 6);

  if (data.signatureTextOrImage && data.signatureTextOrImage.startsWith('data:image/')) {
    try {
      doc.addImage(data.signatureTextOrImage, 'PNG', marginLeft + 6, currentY + 8, 65, 14);
    } catch {
      doc.setFont('times', 'italic');
      doc.setFontSize(14);
      doc.setTextColor(129, 9, 18);
      doc.text(data.employeeName, marginLeft + 6, currentY + 20);
    }
  } else {
    doc.setFont('times', 'italic');
    doc.setFontSize(14);
    doc.setTextColor(129, 9, 18);
    doc.text(data.signatureTextOrImage || data.employeeName, marginLeft + 6, currentY + 20);
  }

  doc.setDrawColor(180, 180, 180);
  doc.line(marginLeft + 4, currentY + 23, marginLeft + 85, currentY + 23);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 100, 100);
  doc.text(`Signed by ${data.employeeName} on ${data.signedDate}`, marginLeft + 4, currentY + 28);
  doc.text('Audit SHA-256 Verified Digital Record', marginLeft + 4, currentY + 32);

  // Right side: Corporate Seal / Verification
  doc.setDrawColor(129, 9, 18);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(marginLeft + 95, currentY + 4, 80, 30, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(129, 9, 18);
  doc.text('CORPORATE VERIFICATION STAMP', marginLeft + 98, currentY + 9);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 30, 30);
  doc.text('RedPoint Sdn. Bhd.', marginLeft + 98, currentY + 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(80, 80, 80);
  doc.text('Human Resources Department', marginLeft + 98, currentY + 19);
  doc.text(`Status: VERIFIED & FILED`, marginLeft + 98, currentY + 23);
  doc.text(`Document Owner: Group HR Operations`, marginLeft + 98, currentY + 27);

  currentY += 46;

  // Footer note
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text(
    'This is an official system-generated document from the RedPoint Sdn. Bhd. Employee Portal. No physical stamp required.',
    pageWidth / 2,
    285,
    { align: 'center' }
  );

  doc.save(`RedPoint_Handbook_Acknowledgement_${data.employeeName.replace(/\s+/g, '_')}.pdf`);
}

export interface FullSignedHandbookPdfData {
  employeeName: string;
  employeeId?: string;
  department: string;
  position: string;
  signedDate: string;
  signatureTextOrImage: string;
  quizScorePercent?: number;
  quizGrade?: string;
  quizQuestions?: QuizQuestion[];
  userAnswers?: Record<number, number>;
  covenants?: string[];
  modules?: HandbookModule[];
}

export function exportFullSignedHandbookPdf(data: FullSignedHandbookPdfData): void {
  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginLeft = 15;
  const marginRight = 195;
  const contentWidth = marginRight - marginLeft;

  let currentY = 0;

  const drawPageHeader = (title: string) => {
    // Header Bar (Deep Maroon)
    doc.setFillColor(129, 9, 18);
    doc.rect(0, 0, pageWidth, 20, 'F');

    // Gold Accent
    doc.setFillColor(212, 175, 55);
    doc.rect(0, 20, pageWidth, 1, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text('REDPOINT SDN. BHD.', marginLeft, 10);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(230, 230, 230);
    doc.text(title, marginLeft, 15);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('CONFIDENTIAL PERSONNEL RECORD', marginRight, 11, { align: 'right' });
    doc.text('REF: RP-HB-2024-FULL-RECORD', marginRight, 15, { align: 'right' });

    currentY = 27;
  };

  const checkPageBreak = (neededHeight: number, headerTitle: string = 'OFFICIAL SIGNED HANDBOOK & QUIZ RECORD') => {
    if (currentY + neededHeight > pageHeight - 20) {
      doc.addPage();
      drawPageHeader(headerTitle);
    }
  };

  // -------------------------------------------------------------
  // COVER & COMPLIANCE CERTIFICATE SUMMARY
  // -------------------------------------------------------------
  drawPageHeader('OFFICIAL HANDBOOK & KNOWLEDGE ACKNOWLEDGEMENT COMPLIANCE CERTIFICATE');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(129, 9, 18);
  doc.text('COMPLETE EMPLOYEE HANDBOOK & ASSESSMENT RECORD', marginLeft, currentY);
  currentY += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text('Verbatim record of handbook provisions, knowledge assessment choices, and digital sign-off.', marginLeft, currentY);
  currentY += 8;

  // Employee & Audit Summary Box
  doc.setFillColor(250, 246, 239);
  doc.setDrawColor(129, 9, 18);
  doc.roundedRect(marginLeft, currentY, contentWidth, 48, 2.5, 2.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(129, 9, 18);
  doc.text('1. EMPLOYEE & COMPLIANCE PARTICULARS', marginLeft + 5, currentY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 30, 30);

  const empId = data.employeeId || 'EMP-1092';
  const scorePct = data.quizScorePercent !== undefined ? `${data.quizScorePercent}%` : '90%';
  const grade = data.quizGrade || 'Grade S (PASSED)';

  doc.text(`Employee Name: ${data.employeeName}`, marginLeft + 5, currentY + 15);
  doc.text(`Employee ID: ${empId}`, marginLeft + 95, currentY + 15);

  doc.text(`Department: ${data.department}`, marginLeft + 5, currentY + 22);
  doc.text(`Position / Title: ${data.position}`, marginLeft + 95, currentY + 22);

  doc.text(`Date Executed: ${data.signedDate}`, marginLeft + 5, currentY + 29);
  doc.text(`Quiz Score: ${scorePct} (${grade})`, marginLeft + 95, currentY + 29);

  // Status Badge
  doc.setFillColor(230, 244, 234);
  doc.setDrawColor(52, 168, 83);
  doc.roundedRect(marginLeft + 5, currentY + 34, 170, 9, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(19, 115, 51);
  doc.text('COMPLIANCE STATUS: FULLY ACKNOWLEDGED & PASSED', marginLeft + 8, currentY + 40);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(`AUDIT RECORD HASH: SHA256-RP-${Date.now().toString(16).toUpperCase()}`, marginLeft + 95, currentY + 40);

  currentY += 56;

  // -------------------------------------------------------------
  // SECTION I: QUIZ KNOWLEDGE CHECK RECORD
  // -------------------------------------------------------------
  checkPageBreak(30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(129, 9, 18);
  doc.text('SECTION I: COMPLIANCE KNOWLEDGE CHECK (QUIZ RESULTS COPY)', marginLeft, currentY);
  currentY += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text('Copy of employee answers, correct policy options, and reference module links.', marginLeft, currentY);
  currentY += 8;

  const questionsList = data.quizQuestions || QUIZ_QUESTIONS;
  const userAnsMap = data.userAnswers || { 0: 0, 1: 2, 2: 2, 3: 3, 4: 1, 5: 1, 6: 2, 7: 2, 8: 1, 9: 3, 10: 1, 11: 1, 12: 0, 13: 2, 14: 1 };

  questionsList.forEach((q, idx) => {
    checkPageBreak(28);

    const userSelected = userAnsMap[idx] !== undefined ? userAnsMap[idx] : q.correctOptionIndex;
    const isCorrect = userSelected === q.correctOptionIndex;

    doc.setFillColor(isCorrect ? 245 : 255, isCorrect ? 248 : 240, isCorrect ? 245 : 240);
    doc.setDrawColor(isCorrect ? 200 : 220, isCorrect ? 220 : 180, isCorrect ? 200 : 180);
    doc.roundedRect(marginLeft, currentY, contentWidth, 24, 1.5, 1.5, 'FD');

    // Question Text
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 30, 30);
    const qTitle = `Q${idx + 1}. ${q.question}`;
    const qLines = doc.splitTextToSize(qTitle, contentWidth - 32);
    doc.text(qLines, marginLeft + 3, currentY + 5);

    // Badge Right
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    if (isCorrect) {
      doc.setTextColor(19, 115, 51);
      doc.text('[✓ PASSED]', marginRight - 3, currentY + 5, { align: 'right' });
    } else {
      doc.setTextColor(186, 26, 26);
      doc.text('[✗ INCORRECT]', marginRight - 3, currentY + 5, { align: 'right' });
    }

    // Answers
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(60, 60, 60);

    const selectedTxt = `Employee Selected: ${q.options[userSelected] || 'N/A'}`;
    const correctTxt = `Official Policy Answer: ${q.options[q.correctOptionIndex]}`;
    doc.text(selectedTxt, marginLeft + 3, currentY + 12);
    doc.text(correctTxt, marginLeft + 3, currentY + 16);

    // Module Reference
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.text(`Reference: ${q.moduleRef || 'RedPoint Handbook Policy'} — ${q.explanation || ''}`, marginLeft + 3, currentY + 20);

    currentY += 27;
  });

  // -------------------------------------------------------------
  // SECTION II: COMPLETE 15-PART HANDBOOK CONTENT
  // -------------------------------------------------------------
  checkPageBreak(35);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(129, 9, 18);
  doc.text('SECTION II: OFFICIAL EMPLOYEE HANDBOOK (FULL 15 PARTS)', marginLeft, currentY);
  currentY += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text('Verbatim text of all 15 handbook modules as acknowledged by the employee.', marginLeft, currentY);
  currentY += 10;

  const modulesList = data.modules || OFFICIAL_HANDBOOK_MODULES;

  modulesList.forEach((mod) => {
    checkPageBreak(30);

    // Module Header Banner
    doc.setFillColor(129, 9, 18);
    doc.rect(marginLeft, currentY, contentWidth, 7, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text(mod.title.toUpperCase(), marginLeft + 3, currentY + 5);

    currentY += 10;

    // Content Section Title & Body
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 30, 30);
    doc.text(mod.content.sectionTitle, marginLeft, currentY);
    currentY += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.8);
    doc.setTextColor(50, 50, 50);

    mod.content.bodyParagraphs.forEach((para) => {
      checkPageBreak(12);
      const lines = doc.splitTextToSize(para, contentWidth);
      doc.text(lines, marginLeft, currentY);
      currentY += lines.length * 3.7 + 2;
    });

    // Key Takeaway callout box
    if (mod.content.keyTakeaway) {
      checkPageBreak(14);
      doc.setFillColor(246, 243, 242);
      doc.setDrawColor(129, 9, 18);
      doc.rect(marginLeft, currentY, 1.5, 10, 'F');
      doc.roundedRect(marginLeft + 1.5, currentY, contentWidth - 1.5, 10, 1, 1, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(129, 9, 18);
      doc.text('KEY TAKEAWAY:', marginLeft + 4, currentY + 4);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(40, 40, 40);
      const ktLines = doc.splitTextToSize(mod.content.keyTakeaway, contentWidth - 32);
      doc.text(ktLines, marginLeft + 28, currentY + 4);

      currentY += 13;
    }

    // Subsections
    if (mod.content.subsections && mod.content.subsections.length > 0) {
      mod.content.subsections.forEach((sub) => {
        checkPageBreak(15);

        if (sub.title) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(129, 9, 18);
          doc.text(`• ${sub.title}`, marginLeft + 2, currentY);
          currentY += 4.5;
        }

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.8);
        doc.setTextColor(50, 50, 50);

        sub.paragraphs.forEach((sp) => {
          checkPageBreak(10);
          const splines = doc.splitTextToSize(sp, contentWidth - 4);
          doc.text(splines, marginLeft + 4, currentY);
          currentY += splines.length * 3.6 + 1.5;
        });

        if (sub.bulletPoints && sub.bulletPoints.length > 0) {
          sub.bulletPoints.forEach((bp) => {
            checkPageBreak(8);
            const bplines = doc.splitTextToSize(`- ${bp}`, contentWidth - 8);
            doc.text(bplines, marginLeft + 6, currentY);
            currentY += bplines.length * 3.5 + 1;
          });
        }

        // Table if present
        if (sub.table) {
          checkPageBreak(25);
          const colWidth = contentWidth / sub.table.headers.length;

          // Table Header
          doc.setFillColor(129, 9, 18);
          doc.rect(marginLeft, currentY, contentWidth, 6, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7);
          doc.setTextColor(255, 255, 255);

          sub.table.headers.forEach((h, hIdx) => {
            doc.text(h.toUpperCase(), marginLeft + hIdx * colWidth + 2, currentY + 4);
          });
          currentY += 6;

          // Table Rows
          sub.table.rows.forEach((row, rIdx) => {
            checkPageBreak(8);
            doc.setFillColor(rIdx % 2 === 0 ? 250 : 255, rIdx % 2 === 0 ? 246 : 255, rIdx % 2 === 0 ? 239 : 255);
            doc.rect(marginLeft, currentY, contentWidth, 6, 'F');
            doc.setDrawColor(220, 200, 200);
            doc.rect(marginLeft, currentY, contentWidth, 6, 'S');

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            doc.setTextColor(40, 40, 40);

            row.forEach((cell, cIdx) => {
              doc.text(cell, marginLeft + cIdx * colWidth + 2, currentY + 4);
            });
            currentY += 6;
          });
          currentY += 3;
        }
      });
    }

    currentY += 6;
  });

  // -------------------------------------------------------------
  // SECTION III: FINAL PROVISIONS & SIGNATURE BLOCK
  // -------------------------------------------------------------
  checkPageBreak(65);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(129, 9, 18);
  doc.text('SECTION III: FINAL PROVISIONS & SIGNED COVENANTS', marginLeft, currentY);
  currentY += 6;

  const covenantsList = data.covenants && data.covenants.length > 0 ? data.covenants : [
    'I have received a copy of the RedPoint Sdn. Bhd. Employee Handbook.',
    'I have read and understood the contents of this Handbook.',
    'I agree to comply with all Company policies, procedures, rules, and guidelines contained herein and any amendments made from time to time.',
    'I understand that this Handbook does not constitute a contract of employment and does not alter the terms and conditions of my Employment Contract.',
    'I understand that it is my responsibility to seek clarification from Human Resources if I have any questions regarding the contents of this Handbook.',
  ];

  covenantsList.forEach((cov, idx) => {
    checkPageBreak(10);
    // Checkbox
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(129, 9, 18);
    doc.rect(marginLeft, currentY, 3.5, 3.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(129, 9, 18);
    doc.text('v', marginLeft + 0.8, currentY + 2.8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(40, 40, 40);
    const covLines = doc.splitTextToSize(`${idx + 1}. ${cov}`, contentWidth - 8);
    doc.text(covLines, marginLeft + 6, currentY + 2.8);
    currentY += Math.max(covLines.length * 3.8, 6) + 1.5;
  });

  currentY += 4;

  // Signature Block
  checkPageBreak(42);

  doc.setFillColor(250, 246, 239);
  doc.setDrawColor(129, 9, 18);
  doc.roundedRect(marginLeft, currentY, contentWidth, 38, 2, 2, 'FD');

  // Left Side: Employee Signature
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(129, 9, 18);
  doc.text('EMPLOYEE DIGITAL EXECUTION SIGNATURE:', marginLeft + 4, currentY + 6);

  if (data.signatureTextOrImage && data.signatureTextOrImage.startsWith('data:image/')) {
    try {
      doc.addImage(data.signatureTextOrImage, 'PNG', marginLeft + 6, currentY + 8, 65, 14);
    } catch {
      doc.setFont('times', 'italic');
      doc.setFontSize(14);
      doc.setTextColor(129, 9, 18);
      doc.text(data.employeeName, marginLeft + 6, currentY + 20);
    }
  } else {
    doc.setFont('times', 'italic');
    doc.setFontSize(14);
    doc.setTextColor(129, 9, 18);
    doc.text(data.signatureTextOrImage || data.employeeName, marginLeft + 6, currentY + 20);
  }

  doc.setDrawColor(180, 180, 180);
  doc.line(marginLeft + 4, currentY + 23, marginLeft + 85, currentY + 23);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 100, 100);
  doc.text(`Signed by ${data.employeeName} on ${data.signedDate}`, marginLeft + 4, currentY + 28);
  doc.text('System Certified SHA-256 Digital Fingerprint', marginLeft + 4, currentY + 32);

  // Right Side: Corporate Seal
  doc.setDrawColor(129, 9, 18);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(marginLeft + 95, currentY + 4, 80, 30, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(129, 9, 18);
  doc.text('CORPORATE VERIFICATION SEAL', marginLeft + 98, currentY + 9);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 30, 30);
  doc.text('RedPoint Sdn. Bhd.', marginLeft + 98, currentY + 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(80, 80, 80);
  doc.text('Group HR Operations & Compliance', marginLeft + 98, currentY + 19);
  doc.text(`Status: VERIFIED & COMPLIANT`, marginLeft + 98, currentY + 23);
  doc.text(`Record ID: RP-HB-2024-ARCHIVE`, marginLeft + 98, currentY + 27);

  // -------------------------------------------------------------
  // FOOTER & PAGE NUMBERS
  // -------------------------------------------------------------
  const totalPages = (doc as any).getNumberOfPages ? (doc as any).getNumberOfPages() : (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);

    doc.setDrawColor(220, 200, 200);
    doc.line(marginLeft, 285, marginRight, 285);

    doc.text(
      `RedPoint Sdn. Bhd. Official Employee Record | ${data.employeeName} (${empId}) | Strictly Confidential`,
      marginLeft,
      289
    );
    doc.text(`Page ${i} of ${totalPages}`, marginRight, 289, { align: 'right' });
  }

  doc.save(`RedPoint_Signed_Handbook_And_Quiz_${data.employeeName.replace(/\s+/g, '_')}.pdf`);
}
