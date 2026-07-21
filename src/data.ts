/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ProcessStep, QMSDocument, WorkflowItem } from './types';

export const ISO_9001_PROCESSES: ProcessStep[] = [
  {
    id: 'sales',
    name: 'Sales & Inquiries',
    description: 'Capture customer requirements and initiate potential QMS-compliant business transactions.',
    procedures: ['PR-01 Customer Requirements Identification'],
    workInstructions: ['WI-01 Inquiry Logging and CRM Entry'],
    forms: ['FR-01 Inquiry Intake Form'],
    templates: ['T-01 Customer Inquiry Template'],
    previousExamples: ['EX-01 Logged Inquiry - TechCorp Inc.'],
    risks: ['Incomplete requirements capture', 'Delays in response leading to customer churn'],
    kpis: ['Inquiry response time (< 4 hours)', 'Lead conversion rate (> 25%)']
  },
  {
    id: 'quotation',
    name: 'Quotation',
    description: 'Prepare, price, and issue professional, costed, and risk-assessed proposals to customers.',
    procedures: ['PR-02 Pricing and Proposal Preparation'],
    workInstructions: ['WI-02 Commercial Estimation Guidelines'],
    forms: ['FR-02 Proposal Costing Sheet'],
    templates: ['T-02 Standard Proposal Template'],
    previousExamples: ['EX-02 Quotation Q-2026-9042 - TechCorp'],
    risks: ['Underpricing leading to negative margins', 'Missed proposal deadlines'],
    kpis: ['Quotation accuracy (100%)', 'Quote win rate (> 35%)']
  },
  {
    id: 'contract-review',
    name: 'Contract Review',
    description: 'Formally review contract terms, specifications, and delivery capabilities against Clause 8.2.',
    procedures: ['PR-03 Contract and Order Review Procedure'],
    workInstructions: ['WI-03 Capability and Capacity Assessment Guide'],
    forms: ['FR-03 Contract Review Sign-off Form'],
    templates: ['T-03 Contract Review Checklist'],
    previousExamples: ['EX-03 Contract Review - TechCorp Service Agreement'],
    risks: ['Accepting unachievable delivery times', 'Unclear liability or service level terms'],
    kpis: ['Order entry error rate (< 1%)', 'Review sign-off compliance (100%)']
  },
  {
    id: 'planning',
    name: 'Planning & Design',
    description: 'Establish project schedules, resource allocations, and operational design controls under Clause 8.1 & 8.3.',
    procedures: ['PR-04 Quality Planning and Design Control'],
    workInstructions: ['WI-04 Gantt Chart Setup and Resource Leveling'],
    forms: ['FR-04 Project Quality Plan (PQP)'],
    templates: ['T-04 Project Master Schedule Template'],
    previousExamples: ['EX-04 PQP for TechCorp Enterprise Portal'],
    risks: ['Resource bottlenecks during parallel phases', 'Scope creep without formal change request'],
    kpis: ['Milestone delivery rate (95%+)', 'Resource utilization efficiency (85%)']
  },
  {
    id: 'delivery',
    name: 'Product & Service Delivery',
    description: 'Execute service operations, maintain quality standards, and package/deliver output under Clause 8.5.',
    procedures: ['PR-05 Operations and Delivery Control'],
    workInstructions: ['WI-05 Service Deployment Checklist', 'WI-06 Quality Assurance Sampling Inspection'],
    forms: ['FR-05 Inspection and Testing Record', 'FR-06 Final Release Certificate'],
    templates: ['T-05 Delivery Note Template'],
    previousExamples: ['EX-05 Released Build Delivery Log - TechCorp'],
    risks: ['Defective service or product delivered', 'Mishandling of customer property'],
    kpis: ['First-time-right yield (> 98%)', 'On-time delivery (OTD) rate (> 97%)']
  },
  {
    id: 'customer-feedback',
    name: 'Customer Feedback & Complaints',
    description: 'Collect customer satisfaction metrics, log complaints, and drive continuous improvement (Clause 9.1.2 & 10.2).',
    procedures: ['PR-06 Customer Satisfaction Measurement', 'PR-07 Nonconformity and Corrective Action (CAPA)'],
    workInstructions: ['WI-07 Customer Feedback Survey Campaign'],
    forms: ['FR-07 Customer Complaint Log', 'FR-08 Supplier Evaluation Form', 'FR-09 Nonconformity Report (NCR)'],
    templates: ['T-06 CSAT Survey Email Template'],
    previousExamples: ['EX-06 CSAT Review Q2 2026'],
    risks: ['Unresolved customer complaints', 'Failing to identify systemic repeat defects'],
    kpis: ['Net Promoter Score (NPS > 65)', 'CAPA closure rate within 30 days (100%)']
  }
];

export const ISO_9001_CLAUSES = [
  { clause: 'Clause 4', name: 'Context of the Organization', description: 'Understanding organizational context, stakeholder needs, and QMS scope.' },
  { clause: 'Clause 5', name: 'Leadership', description: 'Leadership commitment, quality policy, and organizational roles & responsibilities.' },
  { clause: 'Clause 6', name: 'Planning', description: 'Actions to address risks and opportunities, quality objectives, and planning of changes.' },
  { clause: 'Clause 7', name: 'Support', description: 'Resources, competence, awareness, communication, and documented information.' },
  { clause: 'Clause 8', name: 'Operation', description: 'Operational planning, product/service requirements, design, external providers, and release of outputs.' },
  { clause: 'Clause 8.1', name: 'Operational Planning and Control', description: 'Establishing criteria for processes and acceptance of products/services.' },
  { clause: 'Clause 8.2', name: 'Requirements for Products and Services', description: 'Customer communication, determining and reviewing product/service requirements.' },
  { clause: 'Clause 8.3', name: 'Design and Development', description: 'Design planning, inputs, controls, outputs, and change management.' },
  { clause: 'Clause 8.4', name: 'Control of Externally Provided Processes', description: 'Supplier evaluations, selection, re-evaluation, and monitoring.' },
  { clause: 'Clause 8.5', name: 'Production and Service Provision', description: 'Controlled conditions of delivery, identification, traceability, and preservation.' },
  { clause: 'Clause 9', name: 'Performance Evaluation', description: 'Monitoring, measurement, analysis, customer satisfaction, internal audits, and management review.' },
  { clause: 'Clause 9.2', name: 'Internal Audit', description: 'Formally conducting audits to verify compliance and QMS effectiveness.' },
  { clause: 'Clause 10', name: 'Improvement', description: 'Nonconformity, corrective actions (CAPA), and continual improvement.' }
];

export const MOCK_DOCUMENTS: QMSDocument[] = [
  {
    id: 'mock-doc-1',
    title: 'ISO 9001 Quality Manual',
    docNumber: 'QM-01',
    revision: 'Rev 1',
    owner: 'John Doe (Director)',
    department: 'Quality Assurance',
    clause: 'Clause 4.4',
    keywords: ['manual', 'quality manual', 'scope', 'qms'],
    status: 'Approved',
    driveLink: '#',
    nextReviewDate: '2027-01-15',
    description: 'The overarching Quality Manual defining the scope, policies, and interactive process architecture of the QMS.'
  },
  {
    id: 'mock-doc-2',
    title: 'Internal Quality Audit Procedure',
    docNumber: 'PR-07',
    revision: 'Rev 5',
    owner: 'Jane Smith (Quality Manager)',
    department: 'Quality Assurance',
    clause: 'Clause 9.2',
    keywords: ['audit', 'internal audit', 'procedure'],
    status: 'Approved',
    driveLink: '#',
    nextReviewDate: '2027-01-20',
    description: 'Procedure detailing audit scheduling, team selection, checklist preparation, finding logs, and corrective action assignment.'
  },
  {
    id: 'mock-doc-3',
    title: 'Supplier Evaluation and Approval Procedure',
    docNumber: 'PR-08',
    revision: 'Rev 4',
    owner: 'Jane Smith (Quality Manager)',
    department: 'Purchasing',
    clause: 'Clause 8.4',
    keywords: ['supplier', 'vendor', 'purchasing', 'evaluation', 'qualification'],
    status: 'Approved',
    driveLink: '#',
    nextReviewDate: '2027-02-10',
    description: 'Defines the selection, onboarding, risk assessment, and periodic qualification reviews for raw materials and service providers.'
  },
  {
    id: 'mock-doc-4',
    title: 'Supplier Evaluation Form',
    docNumber: 'FR-08',
    revision: 'Rev 4',
    owner: 'Jane Smith (Quality Manager)',
    department: 'Purchasing',
    clause: 'Clause 8.4',
    keywords: ['supplier', 'form', 'evaluation', 'vendor score'],
    status: 'Approved',
    driveLink: '#',
    nextReviewDate: '2027-02-10',
    description: 'Active scoring questionnaire used by procurement to audit vendor certificates, operational speed, and product defect rates.'
  },
  {
    id: 'mock-doc-5',
    title: 'Nonconformity and Corrective Action Form',
    docNumber: 'FR-09',
    revision: 'Rev 3',
    owner: 'Jane Smith (Quality Manager)',
    department: 'Quality Assurance',
    clause: 'Clause 10.2',
    keywords: ['nonconformity', 'ncr', 'capa', 'corrective action', 'form'],
    status: 'Approved',
    driveLink: '#',
    nextReviewDate: '2027-04-05',
    description: 'Interactive checklist used to log compliance deviations, identify root causes, assign owners, and track corrective action closure.'
  },
  {
    id: 'mock-doc-6',
    title: 'Control of Documents Procedure',
    docNumber: 'PR-05',
    revision: 'Rev 7',
    owner: 'Jane Smith (Quality Manager)',
    department: 'Quality Assurance',
    clause: 'Clause 7.5',
    keywords: ['control', 'documents', 'revision', 'approval', 'obsolete'],
    status: 'Approved',
    driveLink: '#',
    nextReviewDate: '2027-05-18',
    description: 'Procedure outlining document drafting, formatting, peer review, approval matrix, distribution, and archival of obsolete versions.'
  },
  {
    id: 'mock-doc-7',
    title: 'Quality Policy Statement',
    docNumber: 'POL-01',
    revision: 'Rev 2',
    owner: 'John Doe (Director)',
    department: 'Management',
    clause: 'Clause 5.2',
    keywords: ['policy', 'mission', 'commitment', 'customer focus'],
    status: 'Approved',
    driveLink: '#',
    nextReviewDate: '2027-06-30',
    description: 'Direct statement from executive leadership outlining our core commitment to continuous improvement, regulatory compliance, and customer satisfaction.'
  }
];

export const MOCK_WORKFLOWS: WorkflowItem[] = [
  {
    id: 'WF-001',
    type: 'Nonconformity',
    date: '2026-07-15',
    source: 'contact@globalexpertdragan.com',
    description: 'Incoming batch of custom polymer castings from Supplier Tech-Plast lacked material trace certificates (violates Clause 8.4.3).',
    assignedTo: 'jane.smith@example.com',
    status: 'Action Assigned',
    resolution: 'Contacted vendor to supply material certificates. Added quality flag on the incoming bay ERP log.',
    verification: '',
    driveLink: '#'
  },
  {
    id: 'WF-002',
    type: 'SupplierEvaluation',
    date: '2026-07-18',
    source: 'contact@globalexpertdragan.com',
    description: 'Completed Supplier Evaluation for Core-Fab Steel Co. Score: 88/100. Minor risk identified in transport delays.',
    assignedTo: 'contact@globalexpertdragan.com',
    status: 'Submitted',
    driveLink: '#'
  },
  {
    id: 'WF-003',
    type: 'CAPA',
    date: '2026-06-10',
    source: 'Internal Quality Audit Findings',
    description: 'Equipment PR-02 (Digital Calibrator) was found operating past its annual calibration date (violates Clause 7.1.5).',
    assignedTo: 'maintenance.team@example.com',
    status: 'Closed',
    resolution: 'Calibrator serviced by certified ISO 17025 laboratory. Calibration certificate #CAL-902 received and appended to the Equipment Register.',
    verification: 'Quality Manager verified physical label and digital ledger matching PR-02 on 2026-06-14.',
    driveLink: '#'
  }
];
