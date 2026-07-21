/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Send, 
  User as UserIcon, 
  ChevronRight, 
  ShieldCheck, 
  Loader2, 
  AlertTriangle,
  ClipboardCheck,
  Percent,
  CheckCircle,
  ExternalLink,
  Plus
} from 'lucide-react';

interface SmartFormsProps {
  token: string | null;
  spreadsheetId: string | null;
  recordFolderId: string | null;
  userEmail: string;
  onFormSubmitted: (newWorkflow: any) => void;
}

export default function SmartForms({
  token,
  spreadsheetId,
  recordFolderId,
  userEmail,
  onFormSubmitted
}: SmartFormsProps) {
  const [activeForm, setActiveForm] = useState<'SupplierEvaluation' | 'Nonconformity'>('SupplierEvaluation');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<{ fileId: string; webViewLink: string; fileName: string } | null>(null);

  // Form State: Supplier Evaluation
  const [supplierName, setSupplierName] = useState('');
  const [productScope, setProductScope] = useState('');
  const [supplierEmail, setSupplierEmail] = useState('');
  const [scoreQuality, setScoreQuality] = useState(25); // Max 30
  const [scoreDelivery, setScoreDelivery] = useState(25); // Max 30
  const [scoreService, setScoreService] = useState(15); // Max 20
  const [scoreCert, setScoreCert] = useState(15); // Max 20
  const [comments, setComments] = useState('');

  // Form State: Nonconformity
  const [source, setSource] = useState('Product & Service Delivery');
  const [defectDescription, setDefectDescription] = useState('');
  const [containmentAction, setContainmentAction] = useState('');
  const [assignedTo, setAssignedTo] = useState('contact@globalexpertdragan.com');
  const [targetDate, setTargetDate] = useState('');

  const totalScore = scoreQuality + scoreDelivery + scoreService + scoreCert;

  const resetForm = () => {
    setSupplierName('');
    setProductScope('');
    setSupplierEmail('');
    setScoreQuality(25);
    setScoreDelivery(25);
    setScoreService(15);
    setScoreCert(15);
    setComments('');

    setDefectDescription('');
    setContainmentAction('');
    setTargetDate('');
    setSuccessData(null);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccessData(null);

    const formData = activeForm === 'SupplierEvaluation' 
      ? { supplierName, productScope, supplierEmail, scoreQuality, scoreDelivery, scoreService, scoreCert, totalScore, comments }
      : { source, defectDescription, containmentAction, assignedTo, targetDate };

    // Ask for user confirmation before data mutation
    const confirmSubmit = window.confirm(`Are you sure you want to submit this completed ISO 9001 form? This will upload a documented record to Google Drive and log a workflow entry.`);
    if (!confirmSubmit) {
      setIsSubmitting(false);
      return;
    }

    try {
      if (token) {
        // Real upload to Google Drive & Sheet log
        const response = await fetch('/api/drive/save-form', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            formType: activeForm,
            formData,
            spreadsheetId,
            recordFolderId,
            email: userEmail
          })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to submit form.');
        
        setSuccessData(data);

        // Add to local list in App state to update workflows instantly
        const simulatedWf = {
          id: activeForm === 'SupplierEvaluation' ? `WF-SE-${Math.floor(100 + Math.random() * 900)}` : `WF-NCR-${Math.floor(100 + Math.random() * 900)}`,
          type: activeForm,
          date: new Date().toISOString().split('T')[0],
          source: userEmail,
          description: activeForm === 'SupplierEvaluation' 
            ? `Supplier Scorecard: ${supplierName} (${totalScore}/100)` 
            : `LoggedNCR - Source: ${source}. Issue: ${defectDescription.substring(0, 100)}...`,
          assignedTo: activeForm === 'SupplierEvaluation' ? 'contact@globalexpertdragan.com' : assignedTo,
          status: 'Submitted',
          resolution: activeForm === 'SupplierEvaluation' ? comments : containmentAction,
          driveLink: data.webViewLink
        };
        onFormSubmitted(simulatedWf);

      } else {
        // Offline / Mock success
        setTimeout(() => {
          setSuccessData({
            fileId: `mock-file-${Math.random()}`,
            webViewLink: '#',
            fileName: activeForm === 'SupplierEvaluation' ? `FR-08_Supplier_${supplierName}_Report.md` : `NCR_Log_${source.replace(/\s+/g, '_')}.md`
          });

          const simulatedWf = {
            id: activeForm === 'SupplierEvaluation' ? `WF-SE-${Math.floor(100 + Math.random() * 900)}` : `WF-NCR-${Math.floor(100 + Math.random() * 900)}`,
            type: activeForm,
            date: new Date().toISOString().split('T')[0],
            source: userEmail,
            description: activeForm === 'SupplierEvaluation' 
              ? `Supplier Scorecard: ${supplierName} (${totalScore}/100) (Mock)` 
              : `LoggedNCR (Mock) - Source: ${source}. Issue: ${defectDescription.substring(0, 100)}...`,
            assignedTo: activeForm === 'SupplierEvaluation' ? 'contact@globalexpertdragan.com' : assignedTo,
            status: 'Submitted',
            resolution: activeForm === 'SupplierEvaluation' ? comments : containmentAction,
            driveLink: '#'
          };
          onFormSubmitted(simulatedWf);
          setIsSubmitting(false);
        }, 1500);
      }
    } catch (error: any) {
      console.error(error);
      alert(`Error submitting form: ${error.message}`);
    } finally {
      if (token) {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="font-sans text-slate-800 max-w-4xl mx-auto space-y-6" id="smart-forms-view">
      <div>
        <span className="text-slate-500 font-medium text-xs tracking-wider uppercase block">Clause 8.4 / 10.2 Digital Forms</span>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-0.5">ISO 9001 Compliance Forms</h1>
        <p className="text-slate-600 text-xs mt-1 max-w-xl leading-relaxed">
          Draft and submit digital audits directly. Submitting generates formatted records in Google Drive and updates the quality workflow dashboard.
        </p>
      </div>

      {/* Selector and Main Form Panel */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6" id="forms-split-layout">
        {/* Navigation / Choice Column */}
        <div className="space-y-3" id="form-selector-col">
          <button
            onClick={() => { setActiveForm('SupplierEvaluation'); resetForm(); }}
            className={`w-full text-left p-4 rounded-xl border flex items-center justify-between gap-2 transition-all cursor-pointer ${
              activeForm === 'SupplierEvaluation' 
                ? 'bg-[#0f172a] text-white border-slate-900 font-semibold shadow-md' 
                : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
            }`}
            id="select-supplier-eval-btn"
          >
            <div className="min-w-0">
              <span className="text-[9px] text-slate-400 block font-bold uppercase mb-0.5">FR-08 Supplier Control</span>
              <span className="text-xs truncate block">Supplier Evaluation</span>
            </div>
            <ChevronRight size={14} />
          </button>

          <button
            onClick={() => { setActiveForm('Nonconformity'); resetForm(); }}
            className={`w-full text-left p-4 rounded-xl border flex items-center justify-between gap-2 transition-all cursor-pointer ${
              activeForm === 'Nonconformity' 
                ? 'bg-[#0f172a] text-white border-slate-900 font-semibold shadow-md' 
                : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
            }`}
            id="select-ncr-btn"
          >
            <div className="min-w-0">
              <span className="text-[9px] text-slate-400 block font-bold uppercase mb-0.5">FR-09 Continuous Improvement</span>
              <span className="text-xs truncate block">Nonconformity Report</span>
            </div>
            <ChevronRight size={14} />
          </button>
        </div>

        {/* Content Column */}
        <div className="md:col-span-3 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm" id="form-container">
          {successData ? (
            <div className="text-center py-8 space-y-6" id="form-success-panel">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-200/50" id="success-icon">
                <CheckCircle size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="font-bold text-lg text-slate-900">Record Successfully Logged!</h3>
                <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                  Form <strong>{activeForm === 'SupplierEvaluation' ? 'FR-08' : 'FR-09'}</strong> has been processed. A markdown-formatted record has been uploaded to Google Drive, and the QMS workflows register has been appended.
                </p>
              </div>

              {/* Quality Manager Alert Overlay */}
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl max-w-md mx-auto text-left flex gap-3 text-blue-800 text-xs leading-relaxed" id="qm-notification-notice">
                <ShieldCheck className="shrink-0 text-blue-600 mt-0.5" size={18} />
                <div>
                  <span className="font-bold block text-blue-950">Manager Alert Active</span>
                  The system has automatically notified the Quality Manager to verify this containment log and assign corrective action schedules.
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3" id="success-actions">
                {successData.webViewLink !== '#' ? (
                  <a
                    href={successData.webViewLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 font-semibold px-5 py-2.5 rounded-lg transition"
                    id="success-open-drive-link"
                  >
                    View Document on Drive
                    <ExternalLink size={14} />
                  </a>
                ) : (
                  <span className="text-[10px] text-gray-400 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg">
                    Offline Mock File: {successData.fileName}
                  </span>
                )}
                <button
                  onClick={resetForm}
                  className="text-xs text-slate-600 hover:text-slate-900 font-bold border border-slate-200 bg-white hover:bg-slate-50 px-5 py-2.5 rounded-lg transition cursor-pointer"
                  id="reset-form-btn"
                >
                  Log Another Record
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleFormSubmit} className="space-y-6" id="compliance-active-form">
              <div className="border-b border-slate-100 pb-4 flex items-center gap-2" id="form-header-bar">
                <FileText className="text-slate-500" size={18} />
                <h3 className="font-bold text-slate-900 text-sm">
                  {activeForm === 'SupplierEvaluation' ? 'Supplier Evaluation Form (FR-08)' : 'Nonconformity & Corrective Action Log (FR-09)'}
                </h3>
              </div>

              {activeForm === 'SupplierEvaluation' ? (
                /* SUPPLIER EVALUATION FORM */
                <div className="space-y-5" id="supplier-form-fields">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-slate-400 font-medium text-xs">Supplier / Vendor Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Steel-Tech Inc."
                        value={supplierName}
                        onChange={(e) => setSupplierName(e.target.value)}
                        className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl p-2.5 text-xs outline-none transition-all"
                        id="form-supplier-name"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-slate-400 font-medium text-xs">Procured Product / Scope</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Raw Stainless Sheets"
                        value={productScope}
                        onChange={(e) => setProductScope(e.target.value)}
                        className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl p-2.5 text-xs outline-none transition-all"
                        id="form-product-scope"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-slate-400 font-medium text-xs">Vendor Quality Email (For Audits)</label>
                    <input
                      type="email"
                      placeholder="e.g. compliance@steeltech.com"
                      value={supplierEmail}
                      onChange={(e) => setSupplierEmail(e.target.value)}
                      className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl p-2.5 text-xs outline-none transition-all"
                      id="form-supplier-email"
                    />
                  </div>

                  {/* Rating sliders */}
                  <div className="space-y-4 pt-3 border-t border-slate-100" id="rating-sliders-section">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Operational Audits & Scores</span>

                    {/* Quality */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-700">1. Quality & Defect Assurance</span>
                        <span className="text-slate-900">{scoreQuality} / 30</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="30"
                        value={scoreQuality}
                        onChange={(e) => setScoreQuality(parseInt(e.target.value))}
                        className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                    </div>

                    {/* Delivery */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-700">2. On-Time Delivery & Shipping Speeds</span>
                        <span className="text-slate-900">{scoreDelivery} / 30</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="30"
                        value={scoreDelivery}
                        onChange={(e) => setScoreDelivery(parseInt(e.target.value))}
                        className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                    </div>

                    {/* Support */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-700">3. Support Responsiveness & Communication</span>
                        <span className="text-slate-900">{scoreService} / 20</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="20"
                        value={scoreService}
                        onChange={(e) => setScoreService(parseInt(e.target.value))}
                        className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                    </div>

                    {/* Certs */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-700">4. ISO Certification / Compliance Standard Level</span>
                        <span className="text-slate-900">{scoreCert} / 20</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="20"
                        value={scoreCert}
                        onChange={(e) => setScoreCert(parseInt(e.target.value))}
                        className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                    </div>

                    {/* Calculated rating box */}
                    <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 flex items-center justify-between" id="scorecard-total-box">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Combined Scorecard Rating</span>
                        <div className="flex items-baseline gap-2 mt-1">
                          <span className="text-2xl font-extrabold text-slate-900">{totalScore} / 100</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            totalScore >= 85 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/40' : 
                            totalScore >= 70 ? 'bg-amber-50 text-amber-700 border border-amber-200/40' : 'bg-rose-50 text-rose-700 border border-rose-200/40'
                          }`}>
                            {totalScore >= 85 ? 'Approved Status' : totalScore >= 70 ? 'Conditional Approval' : 'Unapproved'}
                          </span>
                        </div>
                      </div>
                      <div className="w-12 h-12 rounded-full border-4 border-slate-200 flex items-center justify-center font-bold text-xs text-slate-800" id="total-circle">
                        {totalScore}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-slate-400 font-medium text-xs">Evaluator Comments & Action Notes</label>
                    <textarea
                      placeholder="Add assessment notes regarding the vendor audit, certificate validation, or transport delays..."
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                      rows={3}
                      className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl p-2.5 text-xs outline-none transition resize-none"
                      id="form-comments"
                    />
                  </div>
                </div>
              ) : (
                /* NONCONFORMITY / NCR FORM */
                <div className="space-y-5" id="ncr-form-fields">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-slate-400 font-medium text-xs">Process / Department Origin</label>
                      <select
                        value={source}
                        onChange={(e) => setSource(e.target.value)}
                        className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl p-2.5 text-xs outline-none cursor-pointer transition-all"
                        id="form-ncr-source"
                      >
                        <option value="Sales & Inquiries">Sales & Inquiries</option>
                        <option value="Quotation">Quotation</option>
                        <option value="Contract Review">Contract Review</option>
                        <option value="Planning & Design">Planning & Design</option>
                        <option value="Product & Service Delivery">Product & Service Delivery</option>
                        <option value="Customer Feedback">Customer Feedback</option>
                        <option value="Purchasing / External Providers">Purchasing / External Providers</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-slate-400 font-medium text-xs">Assigned Corrective Actionee</label>
                      <input
                        type="text"
                        value={assignedTo}
                        onChange={(e) => setAssignedTo(e.target.value)}
                        placeholder="e.g. department.head@example.com"
                        className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl p-2.5 text-xs outline-none transition-all"
                        id="form-ncr-assignee"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-slate-400 font-medium text-xs">Target Verification Close Date</label>
                    <input
                      type="date"
                      required
                      value={targetDate}
                      onChange={(e) => setTargetDate(e.target.value)}
                      className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl p-2.5 text-xs outline-none transition-all"
                      id="form-ncr-targetdate"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-slate-400 font-medium text-xs">Deviation / Defect Description (Clause 10.2.1)</label>
                    <textarea
                      required
                      placeholder="Detail the exact nonconformity event. Specify what occurred, the quantity of parts/services affected, and what requirement/specification was violated."
                      value={defectDescription}
                      onChange={(e) => setDefectDescription(e.target.value)}
                      rows={3}
                      className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl p-2.5 text-xs outline-none transition resize-none"
                      id="form-ncr-description"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-slate-400 font-medium text-xs">Immediate Containment Action (Clause 10.2.1.a)</label>
                    <textarea
                      required
                      placeholder="Explain immediate containment or correction steps executed to isolate or resolve the symptom (e.g. isolated parts, halted ERP line)."
                      value={containmentAction}
                      onChange={(e) => setContainmentAction(e.target.value)}
                      rows={2}
                      className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl p-2.5 text-xs outline-none transition resize-none"
                      id="form-ncr-containment"
                    />
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between" id="form-actions-bar">
                <span className="text-[10px] text-gray-400 font-semibold uppercase flex items-center gap-1">
                  <ShieldCheck size={14} className="text-slate-400" />
                  ISO 9001:2015 Approved Schema
                </span>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 bg-[#0f172a] hover:bg-slate-800 text-white font-semibold text-xs px-6 py-3 rounded-xl transition shadow-sm disabled:opacity-50 cursor-pointer"
                  id="submit-compliance-form-btn"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Uploading to Google Drive...
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      Log Form & Notify Manager
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
