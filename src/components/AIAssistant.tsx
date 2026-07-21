/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { QMSDocument, ChatMessage } from '../types';
import { 
  Bot, 
  Send, 
  Sparkles, 
  Loader2, 
  ExternalLink, 
  HelpCircle, 
  AlertCircle,
  CheckCircle,
  FileText,
  Bookmark,
  ShieldCheck,
  Hammer
} from 'lucide-react';

interface AIAssistantProps {
  documents: QMSDocument[];
  onNavigate: (tab: string) => void;
  onSelectDoc: (doc: QMSDocument) => void;
  chatHistory: ChatMessage[];
  onSetChatHistory: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
}

export default function AIAssistant({
  documents,
  onNavigate,
  onSelectDoc,
  chatHistory,
  onSetChatHistory
}: AIAssistantProps) {
  const [activeSubTab, setActiveSubTab] = useState<'consultant' | 'auditor'>('consultant');
  
  // Consultant State
  const [inputMessage, setInputMessage] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auditor State
  const [docTitle, setDocTitle] = useState('Supplier Onboarding Procedure');
  const [targetClause, setTargetClause] = useState('Clause 8.4');
  const [docContent, setDocContent] = useState(`# PR-10 Supplier Onboarding Procedure
1. Purpose: This procedure outlines how we select new raw steel suppliers.
2. Responsibility: The Purchasing department will choose vendors.
3. Scoring: If the vendor is ISO certified, they are approved. Otherwise, we will audit them.
4. Review: Every few years we review them.`);
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState<{
    compliant: boolean;
    score: number;
    strengths: string[];
    findings: string[];
    gaps: string[];
    recommendations: string[];
  } | null>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const handleAskConsultant = async (e?: React.FormEvent, presetText?: string) => {
    if (e) e.preventDefault();
    const queryText = presetText || inputMessage;
    if (!queryText.trim() || isAsking) return;

    // Add user message to chat
    const userMsg: ChatMessage = {
      id: `chat-usr-${Date.now()}`,
      sender: 'user',
      text: queryText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    onSetChatHistory(prev => [...prev, userMsg]);
    setInputMessage('');
    setIsAsking(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: queryText,
          history: chatHistory,
          documentsContext: documents.map(d => ({
            docNumber: d.docNumber,
            title: d.title,
            clause: d.clause,
            department: d.department,
            owner: d.owner,
            status: d.status,
            description: d.description
          }))
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to query AI');

      // Map document references
      const relatedDocsList: any[] = [];
      if (data.relatedDocNumbers && Array.isArray(data.relatedDocNumbers)) {
        for (const num of data.relatedDocNumbers) {
          const found = documents.find(d => d.docNumber.toUpperCase() === num.toUpperCase());
          if (found) {
            relatedDocsList.push({
              title: found.title,
              docNumber: found.docNumber,
              driveLink: found.driveLink,
              revision: found.revision
            });
          }
        }
      }

      const assistantMsg: ChatMessage = {
        id: `chat-ai-${Date.now()}`,
        sender: 'assistant',
        text: data.text || 'I was unable to formulate a response.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        relatedDocs: relatedDocsList
      };

      onSetChatHistory(prev => [...prev, assistantMsg]);

    } catch (err: any) {
      console.error(err);
      onSetChatHistory(prev => [...prev, {
        id: `chat-err-${Date.now()}`,
        sender: 'assistant',
        text: `⚠️ **API Connection Error:** ${err.message || 'Please verify that GEMINI_API_KEY is configured on the server.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setIsAsking(false);
    }
  };

  const handleRunAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docContent.trim() || isAuditing) return;

    setIsAuditing(true);
    setAuditResult(null);

    try {
      const response = await fetch('/api/ai/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docTitle: docTitle,
          docContent: docContent,
          targetClause: targetClause
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to run document quality audit');

      setAuditResult(data);
    } catch (err: any) {
      console.error(err);
      alert(`Audit failed: ${err.message || 'Check connection details'}`);
    } finally {
      setIsAuditing(false);
    }
  };

  const handleActionClick = (action: string) => {
    // Navigate smart actions
    if (action.includes('PR-08') || action.toLowerCase().includes('supplier evaluation')) {
      onNavigate('forms');
    } else if (action.includes('PR-07') || action.toLowerCase().includes('audit')) {
      const found = documents.find(d => d.docNumber === 'PR-07');
      if (found) {
        onSelectDoc(found);
        onNavigate('documents');
      }
    } else if (action.toLowerCase().includes('nonconformity') || action.includes('FR-09')) {
      onNavigate('forms');
    } else {
      // General question back to chat
      handleAskConsultant(undefined, `Tell me more about how to: ${action}`);
    }
  };

  return (
    <div className="font-sans text-slate-800 max-w-5xl mx-auto space-y-6" id="ai-assistant-view">
      {/* Tab Select Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-3" id="ai-header-panel">
        <div>
          <span className="text-slate-500 font-medium text-xs tracking-wider uppercase block">AI Cognitive Layer</span>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-0.5">ISO 9001 Intelligent Assistant</h1>
        </div>

        <div className="flex bg-slate-100/80 p-1 rounded-xl border border-slate-200/50" id="ai-sub-tabs">
          <button
            onClick={() => setActiveSubTab('consultant')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'consultant' ? 'bg-white text-slate-950 shadow-sm font-semibold' : 'text-slate-500 hover:text-slate-900'
            }`}
            id="subtab-consultant"
          >
            ISO 9001 Consultant
          </button>
          <button
            onClick={() => setActiveSubTab('auditor')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'auditor' ? 'bg-white text-slate-950 shadow-sm font-semibold' : 'text-slate-500 hover:text-slate-900'
            }`}
            id="subtab-auditor"
          >
            ISO Document Quality Auditor
          </button>
        </div>
      </div>

      {/* SUB-TAB: CONSULTANT (RAG Q&A CHAT) */}
      {activeSubTab === 'consultant' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8" id="chat-consultant-layout">
          {/* Preset Helper Sidebar */}
          <div className="space-y-4" id="presets-sidebar">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4" id="presets-card">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Auditor Presets</span>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => handleAskConsultant(undefined, 'How do I perform supplier evaluation?')}
                  className="w-full text-left p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition truncate cursor-pointer"
                  id="preset-1"
                >
                  Supplier Evaluation Steps
                </button>
                <button
                  onClick={() => handleAskConsultant(undefined, 'Show me every document related to Clause 8.4.')}
                  className="w-full text-left p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition truncate cursor-pointer"
                  id="preset-2"
                >
                  Which docs belong to Clause 8.4?
                </button>
                <button
                  onClick={() => handleAskConsultant(undefined, 'What is the procedure for handling a Nonconformity Report?')}
                  className="w-full text-left p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition truncate cursor-pointer"
                  id="preset-3"
                >
                  Nonconformity CAPA Steps
                </button>
              </div>
            </div>

            <div className="bg-[#0f172a] text-white rounded-2xl p-5 shadow-sm space-y-3" id="cognitive-notes-card">
              <span className="text-[10px] text-blue-400 font-bold uppercase tracking-widest block">Active Search Indexing</span>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                The Gemini AI engine has context awareness of all currently registered documents. It parses exact titles, document numbers, and descriptions to provide bulletproof compliance references.
              </p>
            </div>
          </div>

          {/* Main Chat Frame */}
          <div className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col overflow-hidden h-[500px]" id="chat-frame">
            {/* Header info */}
            <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center justify-between" id="chat-header">
              <div className="flex items-center gap-2">
                <Bot className="text-slate-700" size={18} />
                <span className="font-bold text-slate-800 text-xs uppercase tracking-wide">ISO Compliance Auditor Core</span>
              </div>
              <span className="text-[10px] text-slate-400 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded font-mono font-bold">gemini-3.5-flash</span>
            </div>

            {/* Chat message stream */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4" id="chat-stream">
              {chatHistory.length === 0 ? (
                <div className="h-full flex flex-col justify-center items-center text-center p-8 space-y-4" id="chat-onboarding">
                  <div className="w-12 h-12 bg-slate-50 border border-slate-200/60 text-slate-400 rounded-full flex items-center justify-center">
                    <Sparkles size={24} className="animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">Consult your ISO 9001 QMS Register</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed mt-1">
                      Ask questions like: *"How do I onboard suppliers?"*, *"What documents belong to Purchasing?"*, or *"Help me prep for a Clause 9.2 Audit."*
                    </p>
                  </div>
                </div>
              ) : (
                chatHistory.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    id={msg.id}
                  >
                    <div className={`max-w-xl rounded-2xl p-4 text-xs space-y-3 ${
                      msg.sender === 'user'
                        ? 'bg-[#0f172a] text-white rounded-tr-none shadow-sm'
                        : 'bg-slate-50 text-slate-800 border border-slate-200 rounded-tl-none'
                    }`}>
                      <div className="flex justify-between items-center gap-4 text-[10px] text-slate-400 font-bold border-b border-slate-100/10 pb-1">
                        <span>{msg.sender === 'user' ? 'Logged Operator' : 'Auditor Assistant'}</span>
                        <span>{msg.timestamp}</span>
                      </div>

                      <div className="prose prose-sm leading-relaxed" style={{ wordBreak: 'break-word' }}>
                        {msg.text.split('\n').map((para, i) => (
                          <p key={i} className="mb-2 last:mb-0">{para}</p>
                        ))}
                      </div>

                      {/* Render related document helper buttons */}
                      {msg.relatedDocs && msg.relatedDocs.length > 0 && (
                        <div className="pt-2 border-t border-slate-200 space-y-1.5" id="related-docs-panel">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Linked Reference Library</span>
                          <div className="flex flex-wrap gap-2">
                            {msg.relatedDocs.map((doc, dIdx) => (
                              <button
                                key={dIdx}
                                onClick={() => {
                                  const found = documents.find(d => d.docNumber === doc.docNumber);
                                  if (found) {
                                    onSelectDoc(found);
                                    onNavigate('documents');
                                  }
                                }}
                                className="inline-flex items-center gap-1 bg-white hover:bg-slate-100 text-[10px] font-semibold text-slate-700 px-2.5 py-1.5 rounded-lg border border-slate-200 shadow-sm transition"
                                id={`link-doc-${doc.docNumber}`}
                              >
                                <Bookmark size={11} className="text-slate-400" />
                                {doc.docNumber} - {doc.title.split(' ')[0]}...
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
              {isAsking && (
                <div className="flex justify-start" id="ai-typing-loader">
                  <div className="bg-slate-50 text-slate-500 border border-slate-200 rounded-2xl rounded-tl-none p-4 text-xs flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin text-slate-700" />
                    <span>Analyzing QMS metadata & ISO clauses...</span>
                  </div>
                </div>
              )
              }
              <div ref={chatEndRef}></div>
            </div>

            {/* Input Form */}
            <form onSubmit={(e) => handleAskConsultant(e)} className="bg-slate-50 p-4 border-t border-slate-200 flex gap-3" id="chat-input-form">
              <input
                type="text"
                required
                placeholder="Ask about ISO 9001 compliance, specific procedures, or form logging..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                className="flex-1 bg-white border border-slate-200 hover:border-slate-300 focus:border-blue-500 rounded-xl px-4 py-3 text-xs outline-none transition-all"
                id="chat-text-input"
              />
              <button
                type="submit"
                disabled={isAsking || !inputMessage.trim()}
                className="bg-[#0f172a] hover:bg-slate-800 text-white p-3 rounded-xl transition disabled:opacity-40 cursor-pointer shrink-0"
                id="send-chat-message-btn"
              >
                <Send size={15} />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SUB-TAB: AUDITOR (DOCUMENT QUALITY COMPLIANCE AUDIT) */}
      {activeSubTab === 'auditor' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6" id="auditor-panel">
          <div className="border-b border-slate-100 pb-4">
            <span className="text-blue-600 font-bold text-xs uppercase tracking-wider block">Clause 7.5.3 Control of Documented Information</span>
            <h2 className="text-lg font-bold text-slate-900 mt-1">ISO 9001 Compliance Draft Auditor</h2>
            <p className="text-xs text-slate-500 leading-relaxed mt-1">
              Draft or copy-paste a procedure, manual page, or quality policy draft below. The AI auditor will perform an immediate audit checking against standard ISO 9001 clause controls.
            </p>
          </div>

          <form onSubmit={handleRunAudit} className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="audit-form-grid">
            {/* Input parameters */}
            <div className="lg:col-span-1 space-y-4" id="audit-params-col">
              <div className="space-y-1.5">
                <label className="text-xs text-slate-500 font-medium">Draft Document Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Calibration Work Instruction"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl p-2.5 text-xs outline-none transition-all"
                  id="audit-doc-title"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-500 font-medium">Target ISO 9001 Clause</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Clause 8.4"
                  value={targetClause}
                  onChange={(e) => setTargetClause(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl p-2.5 text-xs outline-none transition-all"
                  id="audit-target-clause"
                />
              </div>

              <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl space-y-2 text-xs text-blue-900" id="audit-info-box">
                <div className="flex items-center gap-1 font-bold text-blue-950">
                  <ShieldCheck size={16} />
                  <span>Interactive Audit Criteria</span>
                </div>
                <p className="leading-relaxed">
                  The draft auditor parses specific clause controls. It evaluates if objectives are clear, if responsibilities are named, and if corrective loops are complete.
                </p>
              </div>

              <button
                type="submit"
                disabled={isAuditing || !docContent.trim()}
                className="w-full inline-flex items-center justify-center gap-2 bg-[#0f172a] hover:bg-slate-800 text-white font-semibold text-xs py-3 rounded-xl transition shadow-sm disabled:opacity-50 cursor-pointer"
                id="trigger-audit-btn"
              >
                {isAuditing ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Auditing Draft Document...
                  </>
                ) : (
                  <>
                    <Hammer size={14} />
                    Run Quality Compliance Audit
                  </>
                )}
              </button>
            </div>

            {/* Document drafting block */}
            <div className="lg:col-span-2 space-y-1.5" id="audit-content-col">
              <label className="text-xs text-slate-500 font-medium block">Document Content Draft (Markdown or Plain Text)</label>
              <textarea
                value={docContent}
                onChange={(e) => setDocContent(e.target.value)}
                rows={12}
                placeholder="Draft procedure structure here..."
                className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl p-4 text-xs font-mono outline-none transition-all resize-none leading-relaxed"
                id="audit-doc-content"
              />
            </div>
          </form>

          {/* Audit results section */}
          {auditResult && (
            <div className="border-t border-slate-200 pt-6 space-y-6" id="audit-results-container">
              <div className="flex items-center justify-between" id="results-headline">
                <h3 className="font-bold text-slate-900 text-sm">Lead Auditor Compliance Audit Results</h3>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                    auditResult.compliant ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/50' : 'bg-rose-50 text-rose-700 border border-rose-200/50'
                  }`}>
                    {auditResult.compliant ? 'Structurally Compliant' : 'Non-Compliant Gaps Identified'}
                  </span>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Readiness Score</span>
                    <span className="text-xl font-extrabold text-slate-950 block">{auditResult.score} / 100</span>
                  </div>
                </div>
              </div>

              {/* Bento Grid layout for findings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="results-findings-grid">
                {/* Strengths */}
                <div className="border border-emerald-100 bg-emerald-50/20 p-5 rounded-xl space-y-3" id="audit-strengths">
                  <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block flex items-center gap-1">
                    <CheckCircle size={15} /> Strengths & Compliant Controls
                  </span>
                  <ul className="space-y-2 text-xs text-emerald-950 list-disc list-inside">
                    {auditResult.strengths.map((str, idx) => (
                      <li key={idx} className="leading-relaxed">{str}</li>
                    ))}
                  </ul>
                </div>

                {/* Gaps & Weaknesses */}
                <div className="border border-rose-100 bg-rose-50/20 p-5 rounded-xl space-y-3" id="audit-gaps">
                  <span className="text-xs font-bold text-rose-800 uppercase tracking-wider block flex items-center gap-1">
                    <AlertCircle size={15} /> Identified Gaps & Nonconformity Risks
                  </span>
                  <ul className="space-y-2 text-xs text-rose-950 list-disc list-inside">
                    {auditResult.gaps.map((gap, idx) => (
                      <li key={idx} className="leading-relaxed">{gap}</li>
                    ))}
                  </ul>
                </div>

                {/* Audit Observations */}
                <div className="border border-slate-200 bg-slate-50 p-5 rounded-xl space-y-3 md:col-span-2" id="audit-recs">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                    Lead Auditor Quality Recommendations & Specific Wording Fixes
                  </span>
                  <ul className="space-y-2 text-xs text-slate-700 list-decimal list-inside">
                    {auditResult.recommendations.map((rec, idx) => (
                      <li key={idx} className="leading-relaxed">{rec}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
