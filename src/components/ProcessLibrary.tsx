/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ISO_9001_PROCESSES } from '../data';
import { ProcessStep, QMSDocument } from '../types';
import { 
  ArrowRight, 
  FileText, 
  Binary, 
  PenTool, 
  LayoutTemplate, 
  History, 
  ShieldAlert, 
  Activity,
  ArrowUpRight,
  ExternalLink,
  Bot
} from 'lucide-react';

interface ProcessLibraryProps {
  documents: QMSDocument[];
  onNavigate: (tab: string) => void;
  onSelectDoc: (doc: QMSDocument) => void;
  onAskAI: (question: string) => void;
}

export default function ProcessLibrary({ documents, onNavigate, onSelectDoc, onAskAI }: ProcessLibraryProps) {
  const [activeStepId, setActiveStepId] = useState<string>('sales');

  const activeStep = ISO_9001_PROCESSES.find(p => p.id === activeStepId) || ISO_9001_PROCESSES[0];

  // Helper to map resource names to active documents registered in Drive if matching
  const findMatchingDoc = (resourceName: string): QMSDocument | null => {
    // Look for partial matches, e.g. "PR-08" in docNumber or "Supplier Evaluation" in title
    const docNumMatch = resourceName.match(/(QM-\d+|PR-\d+|FR-\d+|WI-\d+|POL-\d+|T-\d+|EX-\d+)/);
    if (docNumMatch) {
      const num = docNumMatch[1];
      const found = documents.find(d => d.docNumber.toUpperCase() === num.toUpperCase() || d.title.includes(num));
      if (found) return found;
    }
    const foundByTitle = documents.find(d => resourceName.toLowerCase().includes(d.title.toLowerCase()) || d.title.toLowerCase().includes(resourceName.toLowerCase()));
    return foundByTitle || null;
  };

  const handleResourceClick = (resourceName: string) => {
    const matched = findMatchingDoc(resourceName);
    if (matched) {
      onSelectDoc(matched);
      onNavigate('documents');
    } else {
      // Prompt user to query AI about the resource
      onAskAI(`Can you explain the requirements or details of "${resourceName}"?`);
      onNavigate('ai');
    }
  };

  return (
    <div className="font-sans text-slate-800 space-y-8" id="process-library-container">
      <div>
        <span className="text-slate-500 font-medium text-xs tracking-wider uppercase block">Clause 8.1 / 8.5 Operations</span>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-0.5">Interactive QMS Process Directory</h1>
        <p className="text-slate-600 text-xs mt-1 max-w-2xl leading-relaxed">
          Select a process block from our master quality loop. Everything required for compliance at each node is consolidated on a single screen.
        </p>
      </div>

      {/* Horizontal Process Chevron Flow */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm overflow-x-auto" id="process-flow-container">
        <div className="flex items-center min-w-[800px] justify-between relative" id="process-flow-track">
          {ISO_9001_PROCESSES.map((step, idx) => {
            const isActive = step.id === activeStepId;
            return (
              <React.Fragment key={step.id}>
                <button
                  onClick={() => setActiveStepId(step.id)}
                  className={`flex-1 py-4 px-3 rounded-xl text-center border transition-all duration-200 cursor-pointer text-xs ${
                    isActive
                      ? 'bg-[#0f172a] border-slate-900 text-white shadow-md transform scale-[1.03] font-bold'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900'
                  }`}
                  id={`process-step-${step.id}`}
                >
                  <span className="text-[10px] text-slate-400 font-bold block mb-1 uppercase tracking-wider">Step {idx + 1}</span>
                  <span className="truncate block font-semibold">{step.name}</span>
                </button>
                {idx < ISO_9001_PROCESSES.length - 1 && (
                  <div className="px-1.5 text-slate-300 flex items-center justify-center shrink-0">
                    <ArrowRight size={14} className="animate-pulse" />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Active Step Core Info and Resources Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8" id="active-step-details">
        {/* Left Column: Process Description & Controls */}
        <div className="space-y-6" id="step-description-col">
          <div className="bg-[#0f172a] text-white rounded-2xl p-6 shadow-sm space-y-4" id="step-intro-card">
            <span className="text-blue-400 font-bold text-[10px] tracking-widest uppercase">Process Operations Focus</span>
            <h2 className="text-xl font-bold tracking-tight">{activeStep.name}</h2>
            <p className="text-slate-300 text-xs leading-relaxed">
              {activeStep.description}
            </p>

            <button
              onClick={() => {
                onAskAI(`Explain the ISO 9001 requirements for the process: ${activeStep.name}.`);
                onNavigate('ai');
              }}
              className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-semibold border border-blue-500/20 bg-blue-500/10 px-4 py-2.5 rounded-xl transition w-full justify-center cursor-pointer"
              id="ask-ai-about-process-btn"
            >
              <Bot size={14} />
              Process Consultation
            </button>
          </div>

          {/* Risks and KPIs Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5" id="controls-card">
            <div>
              <div className="flex items-center gap-1.5 text-rose-600 font-bold text-xs uppercase tracking-wider mb-3">
                <ShieldAlert size={16} />
                <span>Identified Operational Risks</span>
              </div>
              <ul className="space-y-2 text-xs text-slate-600 list-disc list-inside">
                {activeStep.risks.map((risk, i) => (
                  <li key={i} className="leading-relaxed">{risk}</li>
                ))}
              </ul>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-xs uppercase tracking-wider mb-3">
                <Activity size={16} />
                <span>Core Process KPIs</span>
              </div>
              <ul className="space-y-2 text-xs text-slate-600 list-disc list-inside">
                {activeStep.kpis.map((kpi, i) => (
                  <li key={i} className="leading-relaxed">{kpi}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Right 2 Columns: Quality Resources Directory */}
        <div className="md:col-span-2 space-y-6" id="quality-resources-col">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm" id="resources-panel">
            <h3 className="font-bold text-slate-900 text-sm mb-5 pb-3 border-b border-slate-100">Quality Management Resources Directory</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="resources-grid">
              {/* Category: Procedures */}
              <div className="space-y-2.5" id="res-procedures">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                  <FileText size={15} className="text-slate-500" />
                  <span>Procedures (PR)</span>
                </div>
                {activeStep.procedures.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleResourceClick(p)}
                    className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center justify-between gap-2 group transition"
                    id={`proc-${idx}`}
                  >
                    <span className="truncate">{p}</span>
                    <ArrowUpRight size={14} className="text-slate-400 group-hover:text-slate-900 transition-colors" />
                  </button>
                ))}
              </div>

              {/* Category: Work Instructions */}
              <div className="space-y-2.5" id="res-workinstructions">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                  <Binary size={15} className="text-slate-500" />
                  <span>Work Instructions (WI)</span>
                </div>
                {activeStep.workInstructions.map((wi, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleResourceClick(wi)}
                    className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center justify-between gap-2 group transition"
                    id={`wi-${idx}`}
                  >
                    <span className="truncate">{wi}</span>
                    <ArrowUpRight size={14} className="text-slate-400 group-hover:text-slate-900 transition-colors" />
                  </button>
                ))}
              </div>

              {/* Category: Active Forms */}
              <div className="space-y-2.5" id="res-forms">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                  <PenTool size={15} className="text-slate-500" />
                  <span>Active Forms (FR)</span>
                </div>
                {activeStep.forms.map((f, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      if (f.includes('FR-08')) {
                        onNavigate('forms'); // Let them open forms
                      } else if (f.includes('FR-09') || f.includes('NCR')) {
                        onNavigate('forms');
                      } else {
                        handleResourceClick(f);
                      }
                    }}
                    className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center justify-between gap-2 group transition"
                    id={`form-${idx}`}
                  >
                    <span className="truncate">{f}</span>
                    <ArrowUpRight size={14} className="text-slate-400 group-hover:text-slate-900 transition-colors" />
                  </button>
                ))}
              </div>

              {/* Category: Templates */}
              <div className="space-y-2.5" id="res-templates">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                  <LayoutTemplate size={15} className="text-slate-500" />
                  <span>Templates (T)</span>
                </div>
                {activeStep.templates.map((t, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleResourceClick(t)}
                    className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center justify-between gap-2 group transition"
                    id={`temp-${idx}`}
                  >
                    <span className="truncate">{t}</span>
                    <ArrowUpRight size={14} className="text-slate-400 group-hover:text-slate-900 transition-colors" />
                  </button>
                ))}
              </div>

              {/* Category: Historic Examples */}
              <div className="space-y-2.5 md:col-span-2" id="res-examples">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                  <History size={15} className="text-slate-500" />
                  <span>Previous Examples / Records (EX)</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeStep.previousExamples.map((ex, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleResourceClick(ex)}
                      className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center justify-between gap-2 group transition"
                      id={`ex-${idx}`}
                    >
                      <span className="truncate">{ex}</span>
                      <ArrowUpRight size={14} className="text-slate-400 group-hover:text-slate-900 transition-colors" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
