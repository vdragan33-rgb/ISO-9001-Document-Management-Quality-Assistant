/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { QMSDocument, WorkflowItem } from '../types';
import { 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  Calendar, 
  Users, 
  Clock, 
  TrendingUp, 
  ShieldAlert,
  ArrowUpRight,
  ClipboardList
} from 'lucide-react';

interface DashboardProps {
  documents: QMSDocument[];
  workflows: WorkflowItem[];
  userRole: string;
  onNavigate: (tab: string) => void;
  onSelectDoc: (doc: QMSDocument) => void;
}

export default function Dashboard({ documents, workflows, userRole, onNavigate, onSelectDoc }: DashboardProps) {
  // Statistics calculations
  const totalDocs = documents.length;
  const approvedDocs = documents.filter(d => d.status === 'Approved').length;
  const pendingDocs = documents.filter(d => d.status === 'Pending Review').length;
  const draftDocs = documents.filter(d => d.status === 'Draft').length;

  const openWorkflows = workflows.filter(w => w.status !== 'Closed');
  const criticalNCRs = workflows.filter(w => w.type === 'Nonconformity' && w.status !== 'Closed').length;
  const pendingAudits = workflows.filter(w => w.type === 'Audit' && w.status !== 'Closed').length;
  const supplierScores = workflows.filter(w => w.type === 'SupplierEvaluation');
  
  const avgSupplierScore = supplierScores.length > 0
    ? Math.round(supplierScores.reduce((acc, curr) => {
        // Extract score from text (e.g. "Score: 88/100") or default to 85
        const match = curr.description.match(/(\d+)\/100/);
        return acc + (match ? parseInt(match[1]) : 85);
      }, 0) / supplierScores.length)
    : 92;

  // Documents nearing review (e.g. review date in 2027 or past)
  const nearingReview = documents.filter(d => {
    if (!d.nextReviewDate) return false;
    const reviewYear = new Date(d.nextReviewDate).getFullYear();
    return reviewYear <= 2027;
  });

  // Compliance score calculation based on Approved vs Total, and Open CAPAs
  const complianceScore = totalDocs > 0 
    ? Math.min(100, Math.round((approvedDocs / totalDocs) * 100 - (criticalNCRs * 5)))
    : 95;

  return (
    <div className="font-sans text-slate-800 space-y-8" id="dashboard-container">
      {/* Overview stats header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4" id="dashboard-header">
        <div>
          <span className="text-slate-500 font-medium text-xs tracking-wider uppercase block">QMS Control Tower</span>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-0.5">ISO 9001:2015 Management Dashboard</h1>
        </div>
        <div className="flex items-center gap-2 text-xs bg-slate-100 border border-slate-200 py-1.5 px-3 rounded-lg text-slate-600 font-semibold" id="role-status">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
          Role: {userRole}
        </div>
      </div>

      {/* Grid: High impact stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6" id="dashboard-grid-stats">
        {/* Compliance score */}
        <div className="bg-[#0f172a] text-white rounded-2xl p-6 relative overflow-hidden shadow-sm" id="stat-compliance">
          <div className="absolute -bottom-8 -right-8 opacity-5">
            <TrendingUp size={140} />
          </div>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block">System Compliance Index</span>
          <div className="flex items-baseline gap-2 mt-4">
            <span className="text-4xl font-extrabold tracking-tight text-white">{complianceScore}%</span>
            <span className="text-xs text-blue-400 font-semibold">Optimal</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-4 overflow-hidden">
            <div className="bg-blue-500 h-full" style={{ width: `${complianceScore}%` }}></div>
          </div>
          <p className="text-[11px] text-slate-400 mt-3 leading-relaxed">
            Derived from approved files ratio and active containment.
          </p>
        </div>

        {/* Active documents */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm" id="stat-documents">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block">Active QMS Library</span>
              <span className="text-3xl font-extrabold text-slate-900 block mt-3">{totalDocs}</span>
            </div>
            <div className="w-10 h-10 bg-slate-50 text-slate-700 rounded-lg flex items-center justify-center border border-slate-100">
              <FileText size={20} />
            </div>
          </div>
          <div className="flex items-center gap-4 mt-5 text-[11px] text-slate-500">
            <div><span className="font-semibold text-slate-900">{approvedDocs}</span> Approved</div>
            <div><span className="font-semibold text-slate-900">{pendingDocs}</span> Review</div>
            <div><span className="font-semibold text-slate-900">{draftDocs}</span> Drafts</div>
          </div>
        </div>

        {/* Actionable deviations */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm" id="stat-ncr">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block">Logged Deviations (NCR)</span>
              <span className="text-3xl font-extrabold text-slate-900 block mt-3">{criticalNCRs}</span>
            </div>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${criticalNCRs > 0 ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
              <AlertTriangle size={20} />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-5 text-[11px]">
            <span className={`px-2 py-0.5 rounded font-bold uppercase tracking-wide text-[9px] ${criticalNCRs > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-500'}`}>
              {criticalNCRs > 0 ? 'Action Required' : 'All Clear'}
            </span>
            <span className="text-slate-500 font-medium">Pending root cause verification.</span>
          </div>
        </div>

        {/* Vendor assurance */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm" id="stat-vendor">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block">Average Supplier Rating</span>
              <span className="text-3xl font-extrabold text-slate-900 block mt-3">{avgSupplierScore}</span>
            </div>
            <div className="w-10 h-10 bg-slate-50 text-slate-700 rounded-lg flex items-center justify-center border border-slate-100">
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-5 text-[11px] text-slate-500">
            <span className="font-semibold text-blue-600">{supplierScores.length} Evaluations</span>
            <span>conducted this cycle.</span>
          </div>
        </div>
      </div>

      {/* Grid: Detailed rows */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8" id="dashboard-grid-details">
        {/* Left 2 columns: Critical action items */}
        <div className="md:col-span-2 space-y-6" id="dashboard-critical-actions">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm" id="upcoming-audits-card">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ClipboardList size={18} className="text-slate-600" />
                <h3 className="font-bold text-slate-900 text-sm">Active QMS Improvement Logs & CAPA</h3>
              </div>
              <button onClick={() => onNavigate('workflows')} className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-0.5">
                Manage Workflows <ArrowUpRight size={14} />
              </button>
            </div>

            <div className="divide-y divide-slate-100" id="改善logs-list">
              {openWorkflows.length > 0 ? (
                openWorkflows.slice(0, 4).map((wf) => (
                  <div key={wf.id} className="py-3.5 flex items-start justify-between gap-4 first:pt-0 last:pb-0" id={`wf-item-${wf.id}`}>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-500">{wf.id}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          wf.type === 'Nonconformity' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                          wf.type === 'CAPA' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                          'bg-indigo-50 text-indigo-700 border border-indigo-100'
                        }`}>
                          {wf.type}
                        </span>
                        <span className="text-xs text-slate-400">{wf.date}</span>
                      </div>
                      <p className="text-xs text-slate-700 line-clamp-2 leading-relaxed pr-4">
                        {wf.description}
                      </p>
                    </div>
                    <div className="shrink-0 text-right space-y-1">
                      <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded">
                        {wf.status}
                      </span>
                      <p className="text-[10px] text-gray-400 font-medium">Assigned: {wf.assignedTo.split('@')[0]}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-xs text-slate-400">
                  No active corrective actions or nonconformity logs pending. Excellent process capability!
                </div>
              )}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm" id="process-overview-card">
            <h3 className="font-bold text-slate-900 text-sm mb-4">Core Process Metrics (KPI Monitoring)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="kpi-grid">
              <div className="border border-slate-200 p-4 rounded-xl bg-slate-50/50">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Sales Response</span>
                <span className="text-xl font-bold text-slate-900 block mt-2">2.8 hrs</span>
                <div className="flex items-center gap-1 text-[10px] text-blue-600 mt-1 font-semibold">
                  <span>94% within Target</span>
                </div>
              </div>
              <div className="border border-slate-200 p-4 rounded-xl bg-slate-50/50">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Release Certificate</span>
                <span className="text-xl font-bold text-slate-900 block mt-2">99.2%</span>
                <div className="flex items-center gap-1 text-[10px] text-blue-600 mt-1 font-semibold">
                  <span>0 defects released</span>
                </div>
              </div>
              <div className="border border-slate-200 p-4 rounded-xl bg-slate-50/50">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Customer NPS</span>
                <span className="text-xl font-bold text-slate-900 block mt-2">68 / 100</span>
                <div className="flex items-center gap-1 text-[10px] text-blue-600 mt-1 font-semibold">
                  <span>Target exceeded</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Document review & compliance checks */}
        <div className="space-y-6" id="dashboard-sidebar">
          {/* Documents nearing review */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm" id="nearing-review-card">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Clock size={18} className="text-slate-600" />
                <h3 className="font-bold text-slate-900 text-sm">Review Cycle Alerts</h3>
              </div>
              <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-bold">
                {nearingReview.length} Pending
              </span>
            </div>

            <div className="space-y-3" id="alert-docs-list">
              {nearingReview.length > 0 ? (
                nearingReview.slice(0, 4).map((doc) => (
                  <div 
                    key={doc.id} 
                    onClick={() => {
                      onNavigate('documents');
                      onSelectDoc(doc);
                    }}
                    className="p-3 border border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 rounded-xl cursor-pointer transition-all flex items-center justify-between gap-3"
                    id={`nearing-${doc.docNumber}`}
                  >
                    <div className="min-w-0">
                      <h4 className="font-semibold text-xs text-slate-900 truncate">{doc.title}</h4>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">{doc.docNumber} • Review {doc.nextReviewDate}</p>
                    </div>
                    <span className="text-[9px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded font-bold shrink-0 border border-slate-200">
                      Inspect
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-xs text-slate-400">
                  All documents have long-term approval.
                </div>
              )}
            </div>
          </div>

          {/* Audit guidelines box */}
          <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-6 relative overflow-hidden shadow-sm" id="audit-guidelines-box">
            <div className="absolute top-0 right-0 p-4 text-blue-100 pointer-events-none">
              <Calendar size={72} />
            </div>
            <h4 className="font-bold text-blue-900 text-xs uppercase tracking-wider mb-2">Lead Auditor Prompt</h4>
            <p className="text-xs text-blue-800 leading-relaxed">
              Ensure you log external audit schedules at least 30 days in advance. Under Clause 9.2.2, auditor competence must be verified and cataloged prior to initiating the checklist audit loop.
            </p>
            <button 
              onClick={() => onNavigate('ai')} 
              className="mt-4 inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded shadow-sm transition cursor-pointer"
              id="ai-audit-assistant-btn"
            >
              Auditor AI Assistant
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
