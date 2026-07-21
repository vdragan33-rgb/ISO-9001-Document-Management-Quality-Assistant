/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

// Initialize Gemini API
const geminiApiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (geminiApiKey && geminiApiKey !== 'MY_GEMINI_API_KEY') {
  ai = new GoogleGenAI({ apiKey: geminiApiKey });
}

app.use(express.json({ limit: '10mb' }));

// Helper to make fetch calls to Google API using the user's token
async function callGoogleApi(url: string, token: string, options: RequestInit = {}) {
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  
  const res = await fetch(url, {
    ...options,
    headers
  });
  
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google API error (${res.status}): ${errText}`);
  }
  
  return res.json();
}

// 1. AI QMS Chat Assistant Endpoint
app.post('/api/ai/chat', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!ai) {
      res.status(500).json({ error: 'Gemini API key is not configured on the server. Please set GEMINI_API_KEY.' });
      return;
    }

    const { message, history, documentsContext, currentStep } = req.body;

    const systemInstruction = `
You are an expert ISO 9001 Quality Management System (QMS) Consultant, Lead Auditor, and Process Assistant.
Your task is to help the user manage their ISO 9001 compliance, explain procedures, and guide them through workflows.

Here is the context of currently registered QMS Documents in the user's Google Drive:
${JSON.stringify(documentsContext || [])}

Currently active process step selected by user (if any):
${JSON.stringify(currentStep || 'None')}

Guidelines:
1. Provide highly professional, clear, and actionable advice aligned with ISO 9001:2015 clauses (especially Clause 4, 5, 6, 7, 8, 9, 10).
2. Recommend specific documents from the context if they exist. Use their exact Document Number and Title.
3. Your response MUST be a structured JSON matching this schema:
{
  "text": "Markdown-formatted explanation or answer to the user's question.",
  "suggestedActions": [
    "List of 1-3 immediate actionable next steps. For example: 'Read Procedure PR-08', 'Complete Form FR-08', 'Log a Nonconformity in Workflows tab'."
  ],
  "relatedDocNumbers": [
    "Array of related document numbers from the context that are highly relevant to the discussion, e.g., ['PR-08', 'FR-08']"
  ]
}
Do not return any raw text other than the JSON block.
`;

    // Map history to contents array for Gemini
    const contents: any[] = [];
    if (history && Array.isArray(history)) {
      for (const msg of history) {
        contents.push({
          role: msg.sender === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text }]
        });
      }
    }
    contents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            text: { type: 'STRING', description: 'The markdown response explanation' },
            suggestedActions: {
              type: 'ARRAY',
              items: { type: 'STRING' },
              description: '1-3 recommended actions'
            },
            relatedDocNumbers: {
              type: 'ARRAY',
              items: { type: 'STRING' },
              description: 'Related document numbers, e.g., PR-08'
            }
          },
          required: ['text']
        }
      }
    });

    const textResponse = response.text || '{}';
    res.json(JSON.parse(textResponse));
  } catch (error: any) {
    console.error('AI Chat Error:', error);
    res.status(500).json({ error: error.message || 'An error occurred during chat processing' });
  }
});

// 2. AI Document Quality Auditor Endpoint
app.post('/api/ai/audit', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!ai) {
      res.status(500).json({ error: 'Gemini API key is not configured on the server. Please set GEMINI_API_KEY.' });
      return;
    }

    const { docTitle, docContent, targetClause } = req.body;

    const auditPrompt = `
You are an experienced ISO 9001 Lead Auditor. Perform a rigorous quality audit of the following document draft to evaluate its readiness, completeness, and compliance.

Document Title: ${docTitle}
Target ISO 9001 Clause: ${targetClause || 'General QMS documented information (Clause 7.5)'}
Document Content:
---
${docContent}
---

Your response MUST be a structured JSON block matching this schema:
{
  "compliant": true/false (is this document structurally complete and compliant with standard ISO expectations?),
  "score": 0 to 100 (overall readiness score),
  "strengths": ["Array of key strengths or well-defined sections"],
  "findings": ["Array of formal observations/findings against ISO requirements"],
  "gaps": ["Array of gaps, missing elements, or weaknesses in control clauses"],
  "recommendations": ["Array of specific, wording-level recommendations to fix gaps"]
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: auditPrompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            compliant: { type: 'BOOLEAN' },
            score: { type: 'INTEGER' },
            strengths: { type: 'ARRAY', items: { type: 'STRING' } },
            findings: { type: 'ARRAY', items: { type: 'STRING' } },
            gaps: { type: 'ARRAY', items: { type: 'STRING' } },
            recommendations: { type: 'ARRAY', items: { type: 'STRING' } }
          },
          required: ['compliant', 'score', 'strengths', 'findings', 'gaps', 'recommendations']
        }
      }
    });

    const textResponse = response.text || '{}';
    res.json(JSON.parse(textResponse));
  } catch (error: any) {
    console.error('AI Audit Error:', error);
    res.status(500).json({ error: error.message || 'An error occurred during document auditing' });
  }
});

// 3. Google Drive Seeding Endpoint
app.post('/api/drive/seed', async (req: Request, res: Response): Promise<void> => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    res.status(401).json({ error: 'Unauthorized: Missing OAuth Access Token' });
    return;
  }

  try {
    // A. Check if the parent 'ISO 9001 QMS' folder already exists
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=name='ISO 9001 QMS' and mimeType='application/vnd.google-apps.folder' and trashed=false&fields=files(id,name)`;
    const searchResult = await callGoogleApi(searchUrl, token);
    
    let parentFolderId = '';
    if (searchResult.files && searchResult.files.length > 0) {
      parentFolderId = searchResult.files[0].id;
    } else {
      // Create parent folder
      const createFolderRes = await callGoogleApi('https://www.googleapis.com/drive/v3/files', token, {
        method: 'POST',
        body: JSON.stringify({
          name: 'ISO 9001 QMS',
          mimeType: 'application/vnd.google-apps.folder'
        })
      });
      parentFolderId = createFolderRes.id;
    }

    // B. Create the 11 subfolders
    const subfolderNames = [
      '01 Manual',
      '02 Policies',
      '03 Procedures',
      '04 Work Instructions',
      '05 Forms',
      '06 Records',
      '07 Templates',
      '08 Training',
      '09 Audits',
      '10 CAPA',
      '11 Management Review'
    ];

    const folderMap: { [name: string]: string } = {};

    for (const subName of subfolderNames) {
      // Check if subfolder exists
      const subSearchUrl = `https://www.googleapis.com/drive/v3/files?q=name='${subName}' and '${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false&fields=files(id,name)`;
      const subSearchResult = await callGoogleApi(subSearchUrl, token);
      
      if (subSearchResult.files && subSearchResult.files.length > 0) {
        folderMap[subName] = subSearchResult.files[0].id;
      } else {
        const createSubFolderRes = await callGoogleApi('https://www.googleapis.com/drive/v3/files', token, {
          method: 'POST',
          body: JSON.stringify({
            name: subName,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [parentFolderId]
          })
        });
        folderMap[subName] = createSubFolderRes.id;
      }
    }

    // C. Check if the register spreadsheet already exists
    const sheetSearchUrl = `https://www.googleapis.com/drive/v3/files?q=name='ISO 9001 QMS Register' and '${parentFolderId}' in parents and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false&fields=files(id,name,webViewLink)`;
    const sheetSearchResult = await callGoogleApi(sheetSearchUrl, token);

    let spreadsheetId = '';
    let spreadsheetLink = '';
    let sheetsCreatedNew = false;

    if (sheetSearchResult.files && sheetSearchResult.files.length > 0) {
      spreadsheetId = sheetSearchResult.files[0].id;
      spreadsheetLink = sheetSearchResult.files[0].webViewLink;
    } else {
      // Create new Google Spreadsheet using Google Sheets API to define sheets
      const createSheetRes = await callGoogleApi('https://sheets.googleapis.com/v4/spreadsheets', token, {
        method: 'POST',
        body: JSON.stringify({
          properties: { title: 'ISO 9001 QMS Register' },
          sheets: [
            { properties: { title: 'Documents' } },
            { properties: { title: 'Workflows' } },
            { properties: { title: 'UserRoles' } }
          ]
        })
      });
      spreadsheetId = createSheetRes.spreadsheetId;
      spreadsheetLink = createSheetRes.spreadsheetUrl;
      sheetsCreatedNew = true;

      // Move spreadsheet to 'ISO 9001 QMS' parent folder
      await callGoogleApi(`https://www.googleapis.com/drive/v3/files/${spreadsheetId}?addParents=${parentFolderId}`, token, {
        method: 'PATCH'
      });
    }

    // D. If spreadsheet is newly created, populate headers & default user roles
    if (sheetsCreatedNew) {
      const email = req.body.email || 'contact@globalexpertdragan.com';
      await callGoogleApi(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, token, {
        method: 'POST',
        body: JSON.stringify({
          valueInputOption: 'USER_ENTERED',
          data: [
            {
              range: 'Documents!A1:L1',
              values: [
                ['File ID', 'Title', 'Doc Number', 'Revision', 'Owner', 'Department', 'Clause', 'Keywords', 'Status', 'Drive Link', 'Next Review Date', 'Description']
              ]
            },
            {
              range: 'Workflows!A1:K1',
              values: [
                ['Workflow ID', 'Type', 'Date', 'Source', 'Description', 'Assigned To', 'Status', 'Resolution', 'Verification', 'Record File ID', 'Drive Link']
              ]
            },
            {
              range: 'UserRoles!A1:D1',
              values: [
                ['User Email', 'Name', 'Role', 'Department'],
                [email, 'Global Expert Dragan', 'Quality Manager', 'Quality Assurance'],
                ['jane.smith@example.com', 'Jane Smith', 'Department Head', 'Purchasing'],
                ['john.doe@example.com', 'John Doe', 'Employee', 'Operations']
              ]
            }
          ]
        })
      });
    }

    // E. Create a default sample procedure file to populate Google Drive if empty
    // Let's check if there are documents in the procedures folder
    const procFolderId = folderMap['03 Procedures'];
    const procFilesUrl = `https://www.googleapis.com/drive/v3/files?q='${procFolderId}' in parents and trashed=false&fields=files(id)`;
    const procFilesResult = await callGoogleApi(procFilesUrl, token);
    
    const seededDocuments: any[] = [];

    if (!procFilesResult.files || procFilesResult.files.length === 0) {
      // Seed a couple of default markdown files
      const defaultFiles = [
        {
          name: 'PR-08 Supplier Evaluation and Approval Procedure.md',
          folderId: folderMap['03 Procedures'],
          folderName: '03 Procedures',
          mimeType: 'text/markdown',
          docNumber: 'PR-08',
          clause: 'Clause 8.4',
          keywords: 'supplier, vendor, purchasing, evaluation',
          department: 'Purchasing',
          description: 'Defines the selection, onboarding, risk assessment, and periodic qualification reviews for raw materials and service providers.',
          content: `# PR-08 Supplier Evaluation and Approval Procedure
**Document Number:** PR-08  
**Revision:** 4  
**Effective Date:** 2026-07-20  

## 1. PURPOSE & SCOPE
This procedure defines the system for selecting, evaluating, monitoring, and re-evaluating external providers of products and services to ensure compliance with ISO 9001:2015 Clause 8.4.

## 2. RESPONSIBILITIES
- **Purchasing Manager:** Coordinates supplier audits, requests quotes, and maintains the Approved Supplier Register.
- **Quality Manager:** Approves supplier quality status, reviews corrective action plans from underperforming vendors.

## 3. SELECTION CRITERIA
Suppliers are selected based on:
1. ISO Certification status (ISO 9001, ISO 14001, etc.).
2. Cost, capacity, and historical lead-time reliability.
3. Technical capability assessment.

## 4. PERIODIC EVALUATION
All active critical suppliers must be evaluated annually using Form FR-08. Targets:
- **Score > 85:** Fully approved.
- **Score 70-85:** Conditional Approval (Requires monitoring).
- **Score < 70:** Under review. Requires an immediate Corrective Action request (CAPA).`
        },
        {
          name: 'QM-01 ISO 9001 Quality Manual.md',
          folderId: folderMap['01 Manual'],
          folderName: '01 Manual',
          mimeType: 'text/markdown',
          docNumber: 'QM-01',
          clause: 'Clause 4.4',
          keywords: 'manual, scope, policy, quality manual',
          department: 'Quality Assurance',
          description: 'The overarching Quality Manual defining the scope, policies, and interactive process architecture of the QMS.',
          content: `# QM-01 ISO 9001 Quality Manual
**Document Number:** QM-01  
**Revision:** 1  
**Effective Date:** 2026-07-20  

## 1. SCOPE OF ORGANIZATIONAL QMS
Our QMS encompasses the design, development, delivery, and support of advanced enterprise web applications and operational tools.

## 2. LEADERSHIP & QUALITY POLICY
Management is fully committed to maintaining compliance with the ISO 9001:2015 standard and fostering a culture of continuous improvement, customer satisfaction, and risk-based decision making.

## 3. CORE PROCESS FLOW
Our organization coordinates processes in an integrated workflow:
Sales -> Quotation -> Contract Review -> Planning -> Delivery -> Customer Feedback.`
        }
      ];

      for (const df of defaultFiles) {
        const boundary = 'iso_seed_boundary';
        const fileMetadata = {
          name: df.name,
          parents: [df.folderId],
          mimeType: df.mimeType
        };

        const multipartBody = 
          `\r\n--${boundary}\r\n` +
          `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
          `${JSON.stringify(fileMetadata)}\r\n` +
          `\r\n--${boundary}\r\n` +
          `Content-Type: text/markdown\r\n\r\n` +
          `${df.content}\r\n` +
          `--${boundary}--`;

        const seedRes = await callGoogleApi('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', token, {
          method: 'POST',
          headers: {
            'Content-Type': `multipart/related; boundary=${boundary}`
          },
          body: multipartBody
        });

        // Get web view link
        const fileInfo = await callGoogleApi(`https://www.googleapis.com/drive/v3/files/${seedRes.id}?fields=id,name,webViewLink`, token);

        // Append to Google Sheet 'Documents' tab
        const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Documents!A:L:append?valueInputOption=USER_ENTERED`;
        await callGoogleApi(appendUrl, token, {
          method: 'POST',
          body: JSON.stringify({
            values: [
              [
                fileInfo.id,
                df.name.replace('.md', ''),
                df.docNumber,
                'Rev 1',
                'Jane Smith (Quality Manager)',
                df.department,
                df.clause,
                df.keywords,
                'Approved',
                fileInfo.webViewLink,
                '2027-07-20',
                df.description
              ]
            ]
          })
        });

        seededDocuments.push({
          id: fileInfo.id,
          title: df.name.replace('.md', ''),
          docNumber: df.docNumber,
          revision: 'Rev 1',
          owner: 'Jane Smith (Quality Manager)',
          department: df.department,
          clause: df.clause,
          keywords: df.keywords.split(', '),
          status: 'Approved',
          driveLink: fileInfo.webViewLink,
          nextReviewDate: '2027-07-20',
          description: df.description,
          mimeType: df.mimeType,
          folderName: df.folderName
        });
      }
    }

    res.json({
      success: true,
      spreadsheetId,
      spreadsheetLink,
      parentFolderId,
      folderMap,
      seededDocuments
    });

  } catch (error: any) {
    console.error('Seeding error:', error);
    res.status(500).json({ error: error.message || 'An error occurred during seeding' });
  }
});

// 4. Save Form Submission to Google Drive and log in Spreadsheet Register
app.post('/api/drive/save-form', async (req: Request, res: Response): Promise<void> => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    res.status(401).json({ error: 'Unauthorized: Missing OAuth Access Token' });
    return;
  }

  try {
    const { formType, formData, spreadsheetId, recordFolderId } = req.body;

    const timestamp = new Date().toISOString().split('T')[0];
    const userEmail = req.body.email || 'contact@globalexpertdragan.com';

    // A. Format form content as plain text or markdown to look like a clean PDF-like audit report
    let fileName = '';
    let docNumber = '';
    let reportContent = '';
    let description = '';

    if (formType === 'SupplierEvaluation') {
      fileName = `FR-08_Supplier_Evaluation_${formData.supplierName.replace(/\s+/g, '_')}_${timestamp}.md`;
      docNumber = 'FR-08';
      description = `Supplier evaluation report for ${formData.supplierName} (Score: ${formData.totalScore}/100)`;
      reportContent = `# ISO 9001 Supplier Quality Evaluation Report (FR-08)
**Evaluation Date:** ${timestamp}  
**Evaluator:** ${userEmail}  
**Reference Clause:** Clause 8.4  

---

## SUPPLIER PROFILE
- **Supplier Name:** ${formData.supplierName}
- **Representative Product/Service:** ${formData.productScope}
- **Quality Contact Email:** ${formData.supplierEmail || 'N/A'}

## PERFORMANCE AUDIT & SCORING (Max 100)
1. **Quality & Defects Assurance (Max 30):** ${formData.scoreQuality} / 30
2. **On-Time Delivery & Lead Times (Max 30):** ${formData.scoreDelivery} / 30
3. **Responsive Support & Service (Max 20):** ${formData.scoreService} / 20
4. **QMS / ISO 9001 Certification Level (Max 20):** ${formData.scoreCert} / 20

### **TOTAL RATING:** ${formData.totalScore} / 100
**APPROVAL STATUS:** ${formData.totalScore >= 85 ? 'APPROVED (Green)' : formData.totalScore >= 70 ? 'CONDITIONALLY APPROVED (Orange)' : 'UNAPPROVED (Red - CAPA Required)'}

---

## EVALUATOR COMMENTS & ASSESSMENT
${formData.comments || 'No additional comments provided.'}

## ACTION & COMPLIANCE SIGN-OFF
This document serves as a digital record of supplier qualification under ISO 9001:2015 Clause 8.4.2 control guidelines.
`;
    } else {
      // Nonconformity Report
      fileName = `NCR_Log_${formData.source.replace(/\s+/g, '_')}_${timestamp}.md`;
      docNumber = 'FR-09';
      description = `Nonconformity Report: ${formData.defectDescription.substring(0, 50)}...`;
      reportContent = `# ISO 9001 Nonconformity & Corrective Action Report (FR-09 / NCR)
**Report Date:** ${timestamp}  
**Log Originator:** ${userEmail}  
**ISO Clause:** ${formData.clause || 'Clause 10.2'}

---

## 1. NONCONFORMITY DETAIL
- **Department/Process Source:** ${formData.source}
- **Specific Defect/Compliance Deviation:**
${formData.defectDescription}

- **Immediate Containment Actions taken:**
${formData.containmentAction || 'None.'}

---

## 2. CORRECTIVE ACTION PLAN (CAPA)
- **Assigned Actionee:** ${formData.assignedTo}
- **Target Closure Date:** ${formData.targetDate || '30 days from logged date'}
- **Identified Root Cause (5-Whys Approach):**
*Under Quality Manager review*

---

## 3. AUDITING & VERIFICATION
*To be filled by Quality Manager upon verification of corrective action effectiveness.*
- **Verification Status:** Pending Action
- **Resolution Date:** N/A
`;
    }

    // B. Find or fallback to '06 Records' folder
    let targetFolderId = recordFolderId;
    if (!targetFolderId && spreadsheetId) {
      // If we don't have recordFolderId, look for a folder named '06 Records' inside the parent of the Spreadsheet
      // Retrieve Spreadsheet info to find its parent
      const sheetInfo = await callGoogleApi(`https://www.googleapis.com/drive/v3/files/${spreadsheetId}?fields=parents`, token);
      if (sheetInfo.parents && sheetInfo.parents.length > 0) {
        const parentId = sheetInfo.parents[0];
        const searchRecUrl = `https://www.googleapis.com/drive/v3/files?q=name='06 Records' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false&fields=files(id)`;
        const searchRecResult = await callGoogleApi(searchRecUrl, token);
        if (searchRecResult.files && searchRecResult.files.length > 0) {
          targetFolderId = searchRecResult.files[0].id;
        } else {
          // Create the records folder
          const recRes = await callGoogleApi('https://www.googleapis.com/drive/v3/files', token, {
            method: 'POST',
            body: JSON.stringify({
              name: '06 Records',
              mimeType: 'application/vnd.google-apps.folder',
              parents: [parentId]
            })
          });
          targetFolderId = recRes.id;
        }
      }
    }

    // Default to root if nothing found
    const parents = targetFolderId ? [targetFolderId] : [];

    // C. Upload file to Google Drive (using multipart/related upload)
    const boundary = 'form_save_boundary';
    const fileMetadata = {
      name: fileName,
      parents: parents,
      mimeType: 'text/markdown'
    };

    const multipartBody = 
      `\r\n--${boundary}\r\n` +
      `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
      `${JSON.stringify(fileMetadata)}\r\n` +
      `\r\n--${boundary}\r\n` +
      `Content-Type: text/markdown\r\n\r\n` +
      `${reportContent}\r\n` +
      `--${boundary}--`;

    const uploadRes = await callGoogleApi('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', token, {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body: multipartBody
    });

    const fileInfo = await callGoogleApi(`https://www.googleapis.com/drive/v3/files/${uploadRes.id}?fields=id,name,webViewLink`, token);

    // D. If Google Sheets Spreadsheet ID is connected, append a record row
    if (spreadsheetId) {
      if (formType === 'SupplierEvaluation') {
        const status = formData.totalScore >= 85 ? 'Approved' : 'Pending Review';
        
        // Append to Documents tab as a Record
        const appendDocUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Documents!A:L:append?valueInputOption=USER_ENTERED`;
        await callGoogleApi(appendDocUrl, token, {
          method: 'POST',
          body: JSON.stringify({
            values: [
              [
                fileInfo.id,
                `Supplier Evaluation - ${formData.supplierName}`,
                'FR-08-REC',
                'Rev 1',
                userEmail,
                'Purchasing',
                'Clause 8.4',
                `supplier, evaluation, record, ${formData.supplierName}`,
                status,
                fileInfo.webViewLink,
                '',
                description
              ]
            ]
          })
        });

        // Also append to Workflows tab
        const appendWfUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Workflows!A:K:append?valueInputOption=USER_ENTERED`;
        const wfId = `WF-SE-${Math.floor(100 + Math.random() * 900)}`;
        await callGoogleApi(appendWfUrl, token, {
          method: 'POST',
          body: JSON.stringify({
            values: [
              [
                wfId,
                'SupplierEvaluation',
                timestamp,
                userEmail,
                `Supplier Performance Scorecard: ${formData.supplierName} (${formData.totalScore}/100)`,
                formData.assignedTo || 'contact@globalexpertdragan.com',
                'Submitted',
                formData.comments,
                'Awaiting Verification',
                fileInfo.id,
                fileInfo.webViewLink
              ]
            ]
          })
        });

      } else {
        // Nonconformity Report / CAPA
        const appendWfUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Workflows!A:K:append?valueInputOption=USER_ENTERED`;
        const wfId = `WF-NCR-${Math.floor(100 + Math.random() * 900)}`;
        await callGoogleApi(appendWfUrl, token, {
          method: 'POST',
          body: JSON.stringify({
            values: [
              [
                wfId,
                'Nonconformity',
                timestamp,
                userEmail,
                `LoggedNCR - Source: ${formData.source}. Issue: ${formData.defectDescription}`,
                formData.assignedTo || 'jane.smith@example.com',
                'Submitted',
                formData.containmentAction,
                '',
                fileInfo.id,
                fileInfo.webViewLink
              ]
            ]
          })
        });
      }
    }

    res.json({
      success: true,
      fileId: fileInfo.id,
      webViewLink: fileInfo.webViewLink,
      fileName: fileInfo.name
    });

  } catch (error: any) {
    console.error('Save Form Error:', error);
    res.status(500).json({ error: error.message || 'An error occurred during form submission' });
  }
});

// 5. Google Calendar: List Events Endpoint
app.get('/api/calendar/events', async (req: Request, res: Response): Promise<void> => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    res.status(401).json({ error: 'Unauthorized: Missing OAuth Access Token' });
    return;
  }

  try {
    const timeMin = req.query.timeMin as string || new Date().toISOString();
    // Default to listing up to 50 events
    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&singleEvents=true&orderBy=startTime&maxResults=50`;
    
    const calendarData = await callGoogleApi(url, token);
    res.json(calendarData);
  } catch (error: any) {
    console.error('List Calendar Events Error:', error);
    res.status(500).json({ error: error.message || 'An error occurred while fetching calendar events' });
  }
});

// 6. Google Calendar: Create Event Endpoint
app.post('/api/calendar/events', async (req: Request, res: Response): Promise<void> => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    res.status(401).json({ error: 'Unauthorized: Missing OAuth Access Token' });
    return;
  }

  try {
    const { title, description, startDateTime, endDateTime, location, attendees } = req.body;

    const eventBody = {
      summary: title,
      description: description || '',
      location: location || '',
      start: {
        dateTime: startDateTime,
        timeZone: 'UTC'
      },
      end: {
        dateTime: endDateTime,
        timeZone: 'UTC'
      },
      attendees: (attendees || []).map((email: string) => ({ email }))
    };

    const url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
    const createdEvent = await callGoogleApi(url, token, {
      method: 'POST',
      body: JSON.stringify(eventBody)
    });

    res.json({
      success: true,
      event: createdEvent
    });
  } catch (error: any) {
    console.error('Create Calendar Event Error:', error);
    res.status(500).json({ error: error.message || 'An error occurred while creating the calendar event' });
  }
});

// 7. Google Calendar: Delete Event Endpoint
app.delete('/api/calendar/events/:eventId', async (req: Request, res: Response): Promise<void> => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    res.status(401).json({ error: 'Unauthorized: Missing OAuth Access Token' });
    return;
  }

  try {
    const { eventId } = req.params;
    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`;
    
    await callGoogleApi(url, token, {
      method: 'DELETE'
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('Delete Calendar Event Error:', error);
    res.status(500).json({ error: error.message || 'An error occurred while deleting the calendar event' });
  }
});

// Serve static assets and handle Vite routes
const startServer = async () => {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // For Express v4 use '*'
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
};

startServer();
