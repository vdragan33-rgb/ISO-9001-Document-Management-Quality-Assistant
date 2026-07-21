/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { WorkflowItem } from '../types';
import { 
  ArrowRight, 
  CheckCircle2, 
  HelpCircle, 
  CheckSquare, 
  Clock, 
  User as UserIcon, 
  ExternalLink,
  ShieldAlert,
  ClipboardList,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface WorkflowManagerProps {
  workflows: WorkflowItem[];
  userRole: string;
  onUpdateWorkflowStatus: (id: string, updatedFields: Partial<WorkflowItem>) => void;
}

export default function WorkflowManager({
  workflows,
  userRole,
  onUpdateWorkflowStatus
}: WorkflowManagerProps) {
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);

  // Workflow steps list
  const steps = [
    { key: 'Submitted', label: '1. Submitted' },
    { key: 'QM Notified', label: '2. QM Notified' },
    { key: 'Action Assigned', label: '3. CAPA Assigned' },
    { key: 'Verification', label: '4. Verification' },
    { key: 'Closed', label: '5. Closed & Archived' }
  ];

  const getStepIndex = (status: string) => {
    return steps.findIndex(s => s.key === status);
  };

  const selectedWf = workflows.find(w => w.id === selectedWorkflowId) || null;

  const isQM = userRole === 'Quality Manager';
  
  // Custom states for forms inside the workflow card
  const [resolutionText, setResolutionText] = useState('');
  const [verificationText, setVerificationText] = useState('');
  const [newAssignee, setNewAssignee] = useState('contact@globalexpertdragan.com');

  const handleNextStep = () => {
    if (!selectedWf) return;
    
    // Require confirmation for data mutation
    const confirmMove = window.confirm(`Update workflow ${selectedWf.id} to the next compliance stage?`);
    if (!confirmMove) return;

    const currentIndex = getStepIndex(selectedWf.status);
    if (currentIndex < steps.length - 1) {
      const nextStatus = steps[currentIndex + 1].key as any;
      const updates: Partial<WorkflowItem> = { status: nextStatus };
      
      if (nextStatus === 'Action Assigned') {
        updates.assignedTo = newAssignee;
      } else if (nextStatus === 'Verification') {
        updates.resolution = resolutionText;
      } else if (nextStatus === 'Closed') {
        updates.verification = verificationText;
      }

      onUpdateWorkflowStatus(selectedWf.id, updates);
      
      // Clear forms
      setResolutionText('');
      setVerificationText('');
    }
  };

  return (
    <div className="font-sans text-slate-800 space-y-6" id="workflow-manager-view">
      <div>
        <span className="text-slate-500 font-medium text-xs tracking-wider uppercase block">Clause 10.2 Quality Workflows</span>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-0.5">Automated CAPA Workflows</h1>
        <p className="text-slate-600 text-xs mt-1 max-w-xl leading-relaxed">
          Monitor incoming quality alerts, assign corrective action loops, audit implementations, and archive compliance records seamlessly.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8" id="workflow-split-layout">
        {/* Left Columns: List of Workflows */}
        <div className="lg:col-span-2 space-y-4" id="workflows-list-panel">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden" id="workflows-table-card">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between" id="workflows-table-header">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Quality Loops</span>
              <span className="text-[10px] text-slate-500 font-semibold">{workflows.length} alerts logged</span>
            </div>

            <div className="divide-y divide-slate-100" id="workflows-list">
              {workflows.map((wf) => {
                const isSelected = selectedWorkflowId === wf.id;
                const stepIdx = getStepIndex(wf.status);
                
                return (
                  <div
                    key={wf.id}
                    onClick={() => {
                      setSelectedWorkflowId(wf.id);
                      setResolutionText(wf.resolution || '');
                      setVerificationText(wf.verification || '');
                      setNewAssignee(wf.assignedTo || '');
                    }}
                    className={`p-5 hover:bg-slate-50/50 cursor-pointer transition-all flex flex-col gap-3.5 ${
                      isSelected ? 'bg-slate-50 border-l-4 border-blue-600 pl-4' : ''
                    }`}
                    id={`wf-row-${wf.id}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-500">{wf.id}</span>
                          <span className="text-slate-300">•</span>
                          <span className="text-[10px] text-slate-500 font-semibold">{wf.date}</span>
                        </div>
                        <h4 className="font-bold text-sm text-slate-900 leading-snug">
                          {wf.type === 'Nonconformity' ? 'Nonconformity Deviation' : 'Supplier Scorecard'} - {wf.source.split('@')[0]}
                        </h4>
                      </div>

                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md ${
                        wf.status === 'Closed' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {wf.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {wf.description}
                    </p>

                    {/* Progress Indicator Dots in Row */}
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                      <span>Pipeline:</span>
                      {steps.map((st, sIdx) => (
                        <div key={st.key} className="flex items-center gap-1">
                          <span className={`w-2 h-2 rounded-full ${
                            sIdx <= stepIdx ? 'bg-blue-600' : 'bg-slate-200'
                          }`}></span>
                          {sIdx === stepIdx && (
                            <span className="text-[9px] font-bold text-slate-700 mr-1">{st.label.split(' ')[1]}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Active Interactive Timeline & Control Card */}
        <div className="space-y-6" id="workflow-timeline-panel">
          {selectedWf ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6 sticky top-4" id="workflow-timeline-card">
              <div className="border-b border-slate-100 pb-4">
                <span className="font-mono text-xs font-bold text-slate-400">{selectedWf.id}</span>
                <h3 className="font-bold text-base text-slate-950 mt-1">CAPA Execution Control</h3>
              </div>

              {/* Status Stepper Visualizer */}
              <div className="space-y-4" id="visual-timeline-track">
                {steps.map((st, sIdx) => {
                  const currentIdx = getStepIndex(selectedWf.status);
                  const isPassed = sIdx < currentIdx;
                  const isActive = sIdx === currentIdx;
                  
                  return (
                    <div key={st.key} className="flex items-start gap-3 text-xs" id={`timeline-step-${st.key}`}>
                      <div className="flex flex-col items-center">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] border ${
                          isPassed ? 'bg-[#0f172a] text-white border-slate-900' :
                          isActive ? 'bg-white text-blue-600 border-blue-500 border-2 scale-110 shadow-sm' :
                          'bg-slate-50 text-slate-400 border-slate-200'
                        }`}>
                          {isPassed ? '✓' : sIdx + 1}
                        </div>
                        {sIdx < steps.length - 1 && (
                          <div className={`w-0.5 h-8 mt-1 ${isPassed ? 'bg-[#0f172a]' : 'bg-slate-100'}`}></div>
                        )}
                      </div>
                      <div className="pt-0.5 min-w-0">
                        <span className={`font-bold block ${isActive ? 'text-slate-950 font-bold' : 'text-slate-500'}`}>
                          {st.label}
                        </span>
                        {isActive && (
                          <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                            Active stage in compliance loop
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Interactive Quality Actions Panel */}
              <div className="border-t border-slate-100 pt-5 space-y-4" id="quality-interaction-panel">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                  <ClipboardList size={15} />
                  <span>Interactive Quality Control</span>
                </div>

                <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200/50 p-3 rounded-lg leading-relaxed">
                  <p className="font-bold text-slate-900 mb-1">Issue Overview:</p>
                  <p className="line-clamp-3">{selectedWf.description}</p>
                </div>

                {/* QM Notify Stage */}
                {selectedWf.status === 'Submitted' && isQM && (
                  <div className="space-y-3" id="qm-assign-box">
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      As Quality Manager, you must notify the relevant Department Head or personnel. Assign a corrective actionee below.
                    </p>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Corrective Actionee Email</label>
                      <input
                        type="email"
                        value={newAssignee}
                        onChange={(e) => setNewAssignee(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs outline-none focus:border-blue-500 transition-all"
                      />
                    </div>
                    <button
                      onClick={handleNextStep}
                      className="w-full bg-[#0f172a] hover:bg-slate-800 text-white font-semibold text-xs py-3 rounded-xl transition cursor-pointer shadow-sm"
                    >
                      Assign CAPA & Progress Loop
                    </button>
                  </div>
                )}

                {/* Action Assigned Stage */}
                {selectedWf.status === 'Action Assigned' && (
                  <div className="space-y-3" id="assignee-resolution-box">
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      The assigned owner <strong>{selectedWf.assignedTo}</strong> must execute containment corrections and document the corrective action resolution below.
                    </p>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Corrective Resolution Details</label>
                      <textarea
                        value={resolutionText}
                        onChange={(e) => setResolutionText(e.target.value)}
                        placeholder="Detail root-cause containment, process fixes, training completed..."
                        rows={3}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs resize-none outline-none focus:border-blue-500 transition-all"
                      />
                    </div>
                    <button
                      onClick={handleNextStep}
                      disabled={!resolutionText.trim()}
                      className="w-full bg-[#0f172a] hover:bg-slate-800 text-white font-semibold text-xs py-3 rounded-xl transition cursor-pointer disabled:opacity-50 shadow-sm"
                    >
                      Submit Action Resolution
                    </button>
                  </div>
                )}

                {/* Verification Stage */}
                {selectedWf.status === 'Verification' && isQM && (
                  <div className="space-y-3" id="qm-verification-box">
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      As Quality Manager, you must physically or digitally audit the resolution and confirm effectiveness before closure.
                    </p>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase font-mono">Auditor Audit Verification</label>
                      <textarea
                        value={verificationText}
                        onChange={(e) => setVerificationText(e.target.value)}
                        placeholder="Document how effectiveness was audited and verified (e.g. reviewed trace logs on PR-02 calibrator)..."
                        rows={3}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs resize-none outline-none focus:border-blue-500 transition-all"
                      />
                    </div>
                    <button
                      onClick={handleNextStep}
                      disabled={!verificationText.trim()}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-3 rounded-xl transition cursor-pointer disabled:opacity-50 shadow-sm"
                    >
                      Verify Effectiveness & Archive Record
                    </button>
                  </div>
                )}

                {/* Closed & Archived State */}
                {selectedWf.status === 'Closed' && (
                  <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl space-y-2 text-xs text-emerald-800" id="closed-archive-box">
                    <div className="flex items-center gap-1.5 font-bold">
                      <CheckCircle2 size={16} className="text-emerald-600 animate-bounce" />
                      <span>Closed & Document Archived</span>
                    </div>
                    <p className="leading-relaxed">
                      <strong>Resolution:</strong> {selectedWf.resolution || 'N/A'}
                    </p>
                    <p className="leading-relaxed border-t border-emerald-100/50 pt-1.5">
                      <strong>Auditor Sign-off:</strong> {selectedWf.verification || 'N/A'}
                    </p>
                  </div>
                )}

                {/* Drive link for raw NCR file if exists */}
                {selectedWf.driveLink && selectedWf.driveLink !== '#' && (
                  <a
                    href={selectedWf.driveLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs py-2.5 rounded-xl transition"
                  >
                    Inspect Uploaded Record
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 border-dashed rounded-2xl p-12 text-center flex flex-col justify-center items-center h-full min-h-[400px]" id="no-timeline-selection">
              <Clock className="text-slate-300 mb-3" size={32} />
              <p className="text-xs font-semibold text-slate-500">CAPA Flow Monitor</p>
              <p className="text-[11px] text-slate-400 mt-1 max-w-xs leading-relaxed">
                Click any workflow row to view the detailed timeline step indicator and execute compliance transitions.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
