/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface QMSDocument {
  id: string; // Google Drive File ID
  title: string;
  docNumber: string;
  revision: string;
  owner: string;
  department: string;
  clause: string;
  keywords: string[];
  status: 'Draft' | 'Pending Review' | 'Approved' | 'Obsolete';
  driveLink: string;
  nextReviewDate: string;
  description: string;
  mimeType?: string;
  folderName?: string;
}

export interface WorkflowItem {
  id: string; // e.g., WF-001
  type: 'Nonconformity' | 'CAPA' | 'Audit' | 'SupplierEvaluation';
  date: string;
  source: string; // e.g. user email or audit finding
  description: string;
  assignedTo: string; // email of assignee
  status: 'Submitted' | 'QM Notified' | 'Action Assigned' | 'Verification' | 'Closed';
  resolution?: string;
  verification?: string;
  recordFileId?: string;
  driveLink?: string;
}

export interface UserProfile {
  email: string;
  name: string;
  role: 'Quality Manager' | 'Department Head' | 'Employee';
  department: string;
}

export interface ProcessStep {
  id: string;
  name: string;
  description: string;
  procedures: string[]; // Doc numbers, e.g. ["PR-05", "PR-07"]
  workInstructions: string[]; // Doc numbers, e.g. ["WI-03"]
  forms: string[]; // Form/Doc numbers, e.g. ["FR-08"]
  templates: string[];
  previousExamples: string[];
  risks: string[];
  kpis: string[];
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  relatedDocs?: { title: string; docNumber: string; driveLink: string; revision: string }[];
}

export interface QMSEvent {
  id: string;
  title: string;
  description?: string;
  eventType: 'Internal Audit' | 'External Audit' | 'Document Review' | 'Management Review' | 'CAPA Follow-up';
  status: 'Scheduled' | 'Confirmed' | 'Completed' | 'Cancelled';
  startDateTime: string;
  endDateTime: string;
  location?: string;
  attendees?: string[];
  calendarEventId?: string;
  createdBy: string;
  createdAt?: any;
  updatedAt?: any;
}

