/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { initAuth } from './googleAuth';
import { User } from 'firebase/auth';
import { QMSDocument, WorkflowItem, ChatMessage, UserProfile } from './types';
import { MOCK_DOCUMENTS, MOCK_WORKFLOWS } from './data';
import Dashboard from './components/Dashboard';
import ProcessLibrary from './components/ProcessLibrary';
import DocumentLibrary from './components/DocumentLibrary';
import SmartForms from './components/SmartForms';
import WorkflowManager from './components/WorkflowManager';
import CalendarView from './components/CalendarView';
import AIAssistant from './components/AIAssistant';
import GoogleSetup from './components/GoogleSetup';
import { testConnection } from './firebaseDb';

import { 
  Compass, 
  FileText, 
  LayoutDashboard, 
  FileEdit, 
  Workflow, 
  Calendar as CalendarIcon,
  Bot, 
  Settings, 
  ChevronRight, 
  User as UserIcon,
  Database,
  Loader2,
  Info,
  LogOut,
  Sparkles,
  ClipboardCheck
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  
  // Storage & Register States
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(null);
  const [spreadsheetLink, setSpreadsheetLink] = useState<string | null>(null);
  const [parentFolderId, setParentFolderId] = useState<string | null>(null);
  const [folderMap, setFolderMap] = useState<{ [name: string]: string } | null>(null);

  // Live and Mock Data State
  const [documents, setDocuments] = useState<QMSDocument[]>(MOCK_DOCUMENTS);
  const [workflows, setWorkflows] = useState<WorkflowItem[]>(MOCK_WORKFLOWS);
  
  // Selected Document in library for direct inspection
  const [selectedDoc, setSelectedDoc] = useState<QMSDocument | null>(null);

  // Shared Chat History
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

  // Sandbox Mode Indicator
  const [isSandbox, setIsSandbox] = useState<boolean>(false);

  // Current Logged-In User Profile & Role Switcher
  const [userProfile, setUserProfile] = useState<UserProfile>({
    email: 'contact@globalexpertdragan.com',
    name: 'Global Expert Dragan',
    role: 'Quality Manager',
    department: 'Quality Assurance'
  });

  // Track initial Auth state on load
  useEffect(() => {
    testConnection(); // Validate Firestore connectivity on boot
    const unsubscribe = initAuth(
      (authUser, authToken) => {
        setUser(authUser);
        setToken(authToken);
        setIsSandbox(false);
        setIsLoading(false);
        
        // Check if we have spreadsheet IDs saved in session
        const savedSheetId = sessionStorage.getItem('qms_sheet_id');
        const savedSheetLink = sessionStorage.getItem('qms_sheet_link');
        const savedParentId = sessionStorage.getItem('qms_parent_id');
        const savedFolderMap = sessionStorage.getItem('qms_folder_map');
        
        if (savedSheetId) setSpreadsheetId(savedSheetId);
        if (savedSheetLink) setSpreadsheetLink(savedSheetLink);
        if (savedParentId) setParentFolderId(savedParentId);
        if (savedFolderMap) setFolderMap(JSON.parse(savedFolderMap));

        // Update default profile details
        setUserProfile({
          email: authUser.email || 'contact@globalexpertdragan.com',
          name: authUser.displayName || 'QMS Operator',
          role: 'Quality Manager', // Default to QM for connected user
          department: 'Quality Assurance'
        });
      },
      () => {
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Fetch live sheets database when token & sheetId are available
  useEffect(() => {
    if (token && spreadsheetId) {
      loadLiveSheetsData(token, spreadsheetId);
    }
  }, [token, spreadsheetId]);

  const loadLiveSheetsData = async (authToken: string, sheetId: string) => {
    try {
      // 1. Fetch Documents Value Range
      const docsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Documents!A2:L`;
      const resDocs = await fetch(docsUrl, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      
      let loadedDocs: QMSDocument[] = [];
      if (resDocs.ok) {
        const dataDocs = await resDocs.json();
        if (dataDocs.values && Array.isArray(dataDocs.values)) {
          loadedDocs = dataDocs.values.map((row: any) => ({
            id: row[0] || '',
            title: row[1] || '',
            docNumber: row[2] || '',
            revision: row[3] || 'Rev 1',
            owner: row[4] || '',
            department: row[5] || '',
            clause: row[6] || '',
            keywords: row[7] ? row[7].split(', ') : [],
            status: row[8] || 'Approved',
            driveLink: row[9] || '#',
            nextReviewDate: row[10] || '',
            description: row[11] || ''
          }));
        }
      }

      // 2. Fetch Workflows Value Range
      const wfUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Workflows!A2:K`;
      const resWf = await fetch(wfUrl, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      let loadedWfs: WorkflowItem[] = [];
      if (resWf.ok) {
        const dataWf = await resWf.json();
        if (dataWf.values && Array.isArray(dataWf.values)) {
          loadedWfs = dataWf.values.map((row: any) => ({
            id: row[0] || '',
            type: row[1] || 'Nonconformity',
            date: row[2] || '',
            source: row[3] || '',
            description: row[4] || '',
            assignedTo: row[5] || '',
            status: row[6] || 'Submitted',
            resolution: row[7] || '',
            verification: row[8] || '',
            recordFileId: row[9] || '',
            driveLink: row[10] || '#'
          }));
        }
      }

      // Merge / Update States
      if (loadedDocs.length > 0) {
        setDocuments(loadedDocs);
      }
      if (loadedWfs.length > 0) {
        setWorkflows(loadedWfs);
      }

    } catch (err) {
      console.error('Error loading Google Sheet registers:', err);
    }
  };

  const handleSeedCompleted = (data: any) => {
    setSpreadsheetId(data.spreadsheetId);
    setSpreadsheetLink(data.spreadsheetLink);
    setParentFolderId(data.parentFolderId);
    setFolderMap(data.folderMap);

    sessionStorage.setItem('qms_sheet_id', data.spreadsheetId);
    sessionStorage.setItem('qms_sheet_link', data.spreadsheetLink);
    sessionStorage.setItem('qms_parent_id', data.parentFolderId);
    sessionStorage.setItem('qms_folder_map', JSON.stringify(data.folderMap));

    if (data.seededDocuments && data.seededDocuments.length > 0) {
      setDocuments(data.seededDocuments);
    }
    setActiveTab('dashboard');
  };

  // 1. Live/Offline status writing: Update Document status (e.g., Approve)
  const handleUpdateDocumentStatus = async (id: string, newStatus: 'Approved' | 'Pending Review' | 'Draft') => {
    // Local Update
    const updatedDocs = documents.map(doc => {
      if (doc.id === id) {
        return { ...doc, status: newStatus };
      }
      return doc;
    });
    setDocuments(updatedDocs);
    if (selectedDoc?.id === id) {
      setSelectedDoc(prev => prev ? { ...prev, status: newStatus } : null);
    }

    // Google Sheets live update
    if (token && spreadsheetId) {
      try {
        const docIndex = documents.findIndex(d => d.id === id);
        if (docIndex !== -1) {
          const rowNum = docIndex + 2; // +2 due to 1-indexed and header row
          const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Documents!I${rowNum}?valueInputOption=USER_ENTERED`;
          
          await fetch(updateUrl, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              values: [[newStatus]]
            })
          });
        }
      } catch (err) {
        console.error('Failed to update Document state in Google Sheets:', err);
      }
    }
  };

  // 2. Live/Offline status writing: Update Workflow status (e.g. CAPA progress)
  const handleUpdateWorkflowStatus = async (id: string, updatedFields: Partial<WorkflowItem>) => {
    const updatedWfs = workflows.map(wf => {
      if (wf.id === id) {
        return { ...wf, ...updatedFields };
      }
      return wf;
    });
    setWorkflows(updatedWfs);

    // Google Sheets live update
    if (token && spreadsheetId) {
      try {
        const wfIndex = workflows.findIndex(w => w.id === id);
        if (wfIndex !== -1) {
          const rowNum = wfIndex + 2;
          const targetWf = updatedWfs[wfIndex];

          const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Workflows!A${rowNum}:K${rowNum}?valueInputOption=USER_ENTERED`;
          
          await fetch(updateUrl, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              values: [[
                targetWf.id,
                targetWf.type,
                targetWf.date,
                targetWf.source,
                targetWf.description,
                targetWf.assignedTo,
                targetWf.status,
                targetWf.resolution || '',
                targetWf.verification || '',
                targetWf.recordFileId || '',
                targetWf.driveLink || '#'
              ]]
            })
          });
        }
      } catch (err) {
        console.error('Failed to update Workflow row in Google Sheets:', err);
      }
    }
  };

  const handleFormSubmitted = (newWf: any) => {
    setWorkflows(prev => [newWf, ...prev]);
    setActiveTab('workflows');
  };

  const triggerAskAI = (question: string) => {
    setChatHistory(prev => [
      ...prev,
      {
        id: `chat-usr-${Date.now()}`,
        sender: 'user',
        text: question,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    setActiveTab('ai');
  };

  const handleEnterSandbox = () => {
    setIsSandbox(true);
    setActiveTab('dashboard');
  };

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex flex-col justify-center items-center bg-slate-50 font-sans text-slate-700" id="global-loader">
        <Loader2 size={36} className="animate-spin text-slate-900 mb-4" />
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">ISO 9001 QMS Core Initializing...</p>
      </div>
    );
  }

  // LOGIN SCREEN (Choice between Real Integration and Offline Sandbox)
  if (!user && !isSandbox) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 font-sans text-slate-800" id="login-screen">
        <div className="bg-white border border-slate-100 rounded-3xl shadow-xl max-w-5xl w-full grid grid-cols-1 md:grid-cols-2 overflow-hidden" id="login-layout">
          
          {/* Left panel: Info & Concept */}
          <div className="bg-slate-950 p-12 text-white relative flex flex-col justify-between" id="login-info-panel">
            <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
              <ClipboardCheck size={280} />
            </div>
            
            <div className="space-y-3" id="login-branding">
              <span className="bg-sky-500/20 text-sky-300 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest inline-block">
                Clause 4.4 Quality System
              </span>
              <h1 className="text-3xl font-extrabold tracking-tight leading-tight">ISO 9001 Document Management & Quality Assistant</h1>
              <p className="text-xs text-slate-400 leading-relaxed max-w-md">
                A fully operational, modern full-stack QMS integrating direct Google Drive document syncing and Google Sheets register automation, backed by a Gemini compliance auditor.
              </p>
            </div>

            <div className="space-y-4 pt-12" id="login-features">
              <div className="flex gap-3 text-xs" id="feat-1">
                <span className="w-5 h-5 bg-sky-500/10 text-sky-400 rounded-full flex items-center justify-center shrink-0">✓</span>
                <p className="text-slate-300 leading-relaxed">
                  <strong>Process Library (8.1)</strong>: Dynamic bento-grid resource directory consolidating procedures, work instructions, and checklists.
                </p>
              </div>
              <div className="flex gap-3 text-xs" id="feat-2">
                <span className="w-5 h-5 bg-sky-500/10 text-sky-400 rounded-full flex items-center justify-center shrink-0">✓</span>
                <p className="text-slate-300 leading-relaxed">
                  <strong>Digital Forms (8.4/10.2)</strong>: Supplier qualifications and nonconformity containments saving live records directly to your Google Drive.
                </p>
              </div>
              <div className="flex gap-3 text-xs" id="feat-3">
                <span className="w-5 h-5 bg-sky-500/10 text-sky-400 rounded-full flex items-center justify-center shrink-0">✓</span>
                <p className="text-slate-300 leading-relaxed">
                  <strong>Cognitive AI (7.5)</strong>: Smart chatbot connected to your actual registers, plus a draft compliance auditor for procedure review.
                </p>
              </div>
            </div>

            <p className="text-[10px] text-slate-500 font-medium">
              ISO 9001:2015 Compliance Suite • Google Cloud Native
            </p>
          </div>

          {/* Right panel: Controls */}
          <div className="p-12 flex flex-col justify-center space-y-8" id="login-controls-panel">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Access Control Center</h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Choose your QMS execution mode below. Connect your Google Workspace to unlock live storage syncing, or enter our preloaded demo sandbox instantly.
              </p>
            </div>

            <div className="space-y-4" id="login-modes">
              {/* Connected Google Setup */}
              <div className="border border-sky-100 bg-sky-50/20 rounded-2xl p-5 space-y-4" id="real-onboarding">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-sky-700 uppercase tracking-wider block">Recommended Mode</span>
                  <h3 className="font-bold text-xs text-slate-900">Google Workspace Sync</h3>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Uses secure Google Sign-In popups to authorize file storage folders and document registers directly in your Google Drive.
                  </p>
                </div>
                <button
                  onClick={() => setIsSandbox(false)} // This stays on setup view
                  className="w-full bg-slate-950 hover:bg-slate-800 text-white font-semibold text-xs py-3 rounded-xl transition shadow-sm cursor-pointer"
                  id="go-to-google-setup-btn"
                >
                  Configure Workspace Connection
                </button>
              </div>

              {/* Sandbox fallback */}
              <div className="border border-slate-100 hover:border-slate-200 rounded-2xl p-5 flex items-center justify-between gap-4" id="sandbox-onboarding">
                <div className="min-w-0">
                  <h3 className="font-bold text-xs text-slate-900">Sandbox Demo Environment</h3>
                  <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5 truncate">
                    Explore the full dashboard, process map, AI assistant, and compliance forms using preloaded mock databases.
                  </p>
                </div>
                <button
                  onClick={handleEnterSandbox}
                  className="text-xs text-slate-700 hover:text-slate-900 font-bold border border-slate-200 hover:border-slate-300 bg-white px-4 py-2 rounded-xl transition cursor-pointer shrink-0"
                  id="demo-sandbox-btn"
                >
                  Enter Demo Sandbox
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col font-sans text-slate-800" id="app-shell">
      
      {/* Dynamic Mode Notification Bar */}
      {!user && isSandbox && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-2 flex items-center justify-between text-amber-800 text-xs" id="sandbox-banner">
          <div className="flex items-center gap-2">
            <Info size={14} className="shrink-0" />
            <span><strong>QMS Sandbox Active</strong>: Currently running with offline mock databases. Link your real Google Drive in the settings page to enable persistent cloud document archives!</span>
          </div>
          <button 
            onClick={() => { setIsSandbox(false); setUser(null); }} 
            className="text-[10px] font-bold uppercase tracking-wider text-amber-900 hover:underline bg-amber-500/20 px-2 py-1 rounded"
          >
            Connect Drive
          </button>
        </div>
      )}

      {/* Main Layout Container */}
      <div className="flex-1 flex flex-col lg:flex-row" id="app-content-layout">
        
        {/* Navigation Sidebar (Desktop) */}
        <aside className="w-full lg:w-64 bg-[#0f172a] text-slate-400 flex flex-col justify-between" id="app-sidebar">
          <div className="p-6 space-y-8">
            {/* Branding */}
            <div className="flex items-center gap-3 pb-2 border-b border-slate-800" id="sidebar-branding">
              <div className="w-8 h-8 bg-blue-600 text-white rounded flex items-center justify-center font-bold text-sm">
                Q
              </div>
              <div>
                <h2 className="font-semibold text-white tracking-tight text-sm">ISO-QMS Assistant</h2>
                <span className="text-[10px] text-slate-500 font-bold block mt-0.5">Clause 4.4 Suite</span>
              </div>
            </div>

            {/* Navigation Links */}
            <nav className="space-y-1" id="sidebar-nav">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'dashboard' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                }`}
                id="tab-dashboard"
              >
                <LayoutDashboard size={16} />
                <span>QMS Control Tower</span>
              </button>

              <button
                onClick={() => setActiveTab('process-library')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'process-library' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                }`}
                id="tab-process-library"
              >
                <Compass size={16} />
                <span>Process Library</span>
              </button>

              <button
                onClick={() => setActiveTab('documents')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'documents' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                }`}
                id="tab-documents"
              >
                <FileText size={16} />
                <span>Document Library</span>
              </button>

              <button
                onClick={() => setActiveTab('forms')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'forms' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                }`}
                id="tab-forms"
              >
                <FileEdit size={16} />
                <span>Compliance Forms</span>
              </button>

              <button
                onClick={() => setActiveTab('workflows')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'workflows' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                }`}
                id="tab-workflows"
              >
                <Workflow size={16} />
                <span>CAPA Workflows</span>
              </button>

              <button
                onClick={() => setActiveTab('calendar')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'calendar' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                }`}
                id="tab-calendar"
              >
                <CalendarIcon size={16} />
                <span>Audit & Review Calendar</span>
              </button>

              <button
                onClick={() => setActiveTab('ai')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'ai' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                }`}
                id="tab-ai"
              >
                <Bot size={16} />
                <span>Cognitive Auditor AI</span>
              </button>

              <button
                onClick={() => setActiveTab('setup')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'setup' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                }`}
                id="tab-setup"
              >
                <Settings size={16} />
                <span>Workspace Setup</span>
              </button>
            </nav>
          </div>

          {/* Quick info and Sign out / Profile block in sidebar footer */}
          <div className="p-6 border-t border-slate-800 bg-slate-900/30" id="sidebar-footer">
            <div className="flex items-center gap-2.5" id="profile-block">
              <div className="w-8 h-8 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-full flex items-center justify-center font-bold text-xs">
                {userProfile.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-medium text-xs text-slate-200 truncate leading-none">{userProfile.name}</h4>
                <span className="text-[10px] text-slate-500 font-medium block mt-1 truncate">{userProfile.email}</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Workspace Frame */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden" id="main-frame">
          
          {/* Top Profile / Global Action Bar */}
          <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0" id="top-action-bar">
            {/* Left side info */}
            <div className="flex items-center gap-2" id="qms-register-status">
              <Database size={15} className={spreadsheetId ? 'text-blue-600' : 'text-slate-400'} />
              <span className="text-xs font-semibold text-slate-600">
                {spreadsheetId ? (
                  <>Registered Cloud Database Connected</>
                ) : (
                  <>Running Sandbox Registers</>
                )}
              </span>
            </div>

            {/* Right side role switcher & user action */}
            <div className="flex items-center gap-4" id="role-switcher-container">
              {/* Role Selection Dropdown */}
              <div className="flex items-center gap-1.5" id="role-selection-wrapper">
                <span className="text-[10px] text-slate-400 font-bold uppercase shrink-0">Perm Role:</span>
                <select
                  value={userProfile.role}
                  onChange={(e) => {
                    const role = e.target.value as any;
                    const dept = role === 'Quality Manager' ? 'Quality Assurance' : role === 'Department Head' ? 'Purchasing' : 'Operations';
                    setUserProfile(prev => ({ ...prev, role, department: dept }));
                  }}
                  className="bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 cursor-pointer outline-none"
                  id="top-role-select"
                >
                  <option value="Quality Manager">Quality Manager (QM)</option>
                  <option value="Department Head">Department Head (DH)</option>
                  <option value="Employee">Employee (EM)</option>
                </select>
              </div>

              {/* Reset to exit sandbox or disconnect */}
              <button 
                onClick={() => {
                  sessionStorage.clear();
                  window.location.reload();
                }}
                className="text-[10px] font-bold text-red-600 hover:text-red-800 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition shrink-0 flex items-center gap-1"
              >
                <LogOut size={12} />
                Reset session
              </button>
            </div>
          </header>

          {/* Workspace Area */}
          <main className="flex-1 overflow-y-auto p-8 bg-[#f1f5f9]" id="workspace-area">
            {activeTab === 'dashboard' && (
              <Dashboard 
                documents={documents} 
                workflows={workflows} 
                userRole={userProfile.role}
                onNavigate={setActiveTab}
                onSelectDoc={setSelectedDoc}
              />
            )}

            {activeTab === 'process-library' && (
              <ProcessLibrary 
                documents={documents}
                onNavigate={setActiveTab}
                onSelectDoc={setSelectedDoc}
                onAskAI={triggerAskAI}
              />
            )}

            {activeTab === 'documents' && (
              <DocumentLibrary 
                documents={documents}
                selectedDocument={selectedDoc}
                onSelectDoc={setSelectedDoc}
                userRole={userProfile.role}
                onUpdateDocumentStatus={handleUpdateDocumentStatus}
              />
            )}

            {activeTab === 'forms' && (
              <SmartForms 
                token={token}
                spreadsheetId={spreadsheetId}
                recordFolderId={folderMap ? folderMap['06 Records'] : null}
                userEmail={userProfile.email}
                onFormSubmitted={handleFormSubmitted}
              />
            )}

            {activeTab === 'workflows' && (
              <WorkflowManager 
                workflows={workflows}
                userRole={userProfile.role}
                onUpdateWorkflowStatus={handleUpdateWorkflowStatus}
              />
            )}

            {activeTab === 'calendar' && (
              <CalendarView 
                token={token}
                userEmail={userProfile.email}
              />
            )}

            {activeTab === 'ai' && (
              <AIAssistant 
                documents={documents}
                onNavigate={setActiveTab}
                onSelectDoc={setSelectedDoc}
                chatHistory={chatHistory}
                onSetChatHistory={setChatHistory}
              />
            )}

            {activeTab === 'setup' && (
              <GoogleSetup 
                user={user}
                token={token}
                onAuthChange={(u, t) => {
                  setUser(u);
                  setToken(t);
                  if (u) {
                    setIsSandbox(false);
                    setUserProfile(prev => ({ ...prev, email: u.email || '', name: u.displayName || 'QMS Operator' }));
                  }
                }}
                spreadsheetId={spreadsheetId}
                spreadsheetLink={spreadsheetLink}
                onSeedCompleted={handleSeedCompleted}
                isLoading={isLoading}
                setIsLoading={setIsLoading}
              />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
