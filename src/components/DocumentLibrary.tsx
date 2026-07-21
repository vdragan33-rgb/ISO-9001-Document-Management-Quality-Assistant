/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { QMSDocument } from '../types';
import { 
  Search, 
  Filter, 
  ExternalLink, 
  Clock, 
  Archive, 
  CheckCircle, 
  Edit, 
  User as UserIcon,
  HelpCircle,
  Tag,
  History,
  CornerDownRight,
  ShieldAlert
} from 'lucide-react';

interface DocumentLibraryProps {
  documents: QMSDocument[];
  selectedDocument: QMSDocument | null;
  onSelectDoc: (doc: QMSDocument | null) => void;
  userRole: string;
  onUpdateDocumentStatus?: (id: string, newStatus: any) => void;
}

export default function DocumentLibrary({
  documents,
  selectedDocument,
  onSelectDoc,
  userRole,
  onUpdateDocumentStatus
}: DocumentLibraryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');
  const [selectedClause, setSelectedClause] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');

  // Gather unique clauses and departments for filter dropdowns
  const clauses = ['All', ...Array.from(new Set(documents.map(d => d.clause.split('.')[0])))];
  const departments = ['All', ...Array.from(new Set(documents.map(d => d.department)))];

  // Filters logic
  const filteredDocs = documents.filter(doc => {
    const matchesSearch = 
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.docNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.keywords.some(k => k.toLowerCase().includes(searchTerm.toLowerCase())) ||
      doc.description.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesDept = selectedDept === 'All' || doc.department === selectedDept;
    const matchesClause = selectedClause === 'All' || doc.clause.startsWith(selectedClause);
    const matchesStatus = selectedStatus === 'All' || doc.status === selectedStatus;

    return matchesSearch && matchesDept && matchesClause && matchesStatus;
  });

  // Mocked archive data for older revisions
  const getArchivedRevisions = (docNumber: string, currentRev: string) => {
    const revNum = parseInt(currentRev.replace(/[^\d]/g, ''));
    if (isNaN(revNum) || revNum <= 1) return [];
    
    const archives = [];
    for (let i = revNum - 1; i >= 1; i--) {
      archives.push({
        revision: `Rev ${i}`,
        date: `202${6 - (revNum - i)}-05-12`,
        archivedBy: 'Jane Smith (Quality Manager)',
        status: 'Archived'
      });
    }
    return archives;
  };

  const isQM = userRole === 'Quality Manager';
  const isDH = userRole === 'Department Head';

  return (
    <div className="font-sans text-slate-800 space-y-6" id="document-library-view">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4" id="library-header-bar">
        <div>
          <span className="text-slate-500 font-medium text-xs tracking-wider uppercase block">Clause 7.5 Documented Information</span>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-0.5">QMS Document Library</h1>
          <p className="text-slate-600 text-xs mt-1 leading-relaxed">
            Browse and inspect active, approved procedures, manual pages, and logs. Obsolescence guard active: older revisions are automatically locked.
          </p>
        </div>
      </div>

      {/* Filter and Search Panel */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4" id="filter-panel">
        <div className="flex flex-col md:flex-row gap-4" id="search-filter-grid">
          {/* Search bar */}
          <div className="flex-1 relative" id="search-bar-container">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search by title, document number, clause, or keywords (e.g. 'PR-08', 'calibration')..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl pl-10 pr-4 py-2.5 text-xs font-medium transition-all outline-none"
              id="library-search-input"
            />
          </div>

          {/* Department Filter */}
          <div className="flex items-center gap-2" id="filter-dept-container">
            <Filter size={14} className="text-slate-400 shrink-0" />
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold cursor-pointer outline-none transition-all"
              id="filter-dept-select"
            >
              <option value="All">All Departments</option>
              {departments.filter(d => d !== 'All').map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Clause Filter */}
          <div className="flex items-center gap-2" id="filter-clause-container">
            <Filter size={14} className="text-slate-400 shrink-0" />
            <select
              value={selectedClause}
              onChange={(e) => setSelectedClause(e.target.value)}
              className="bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold cursor-pointer outline-none transition-all"
              id="filter-clause-select"
            >
              <option value="All">All Clauses</option>
              {clauses.filter(c => c !== 'All').map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold cursor-pointer outline-none transition-all"
            id="filter-status-select"
          >
            <option value="All">All Statuses</option>
            <option value="Approved">Approved</option>
            <option value="Pending Review">Pending Review</option>
            <option value="Draft">Draft</option>
          </select>
        </div>
      </div>

      {/* Main split grid: Document Listing / Selected Detail Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8" id="library-split-layout">
        {/* Left columns: Documents List */}
        <div className="lg:col-span-2 space-y-4" id="documents-list-panel">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden" id="documents-table-card">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between" id="table-legend">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Registered QMS Documents</span>
              <span className="text-[10px] text-slate-500 font-semibold">{filteredDocs.length} items found</span>
            </div>

            <div className="divide-y divide-slate-100" id="documents-list">
              {filteredDocs.length > 0 ? (
                filteredDocs.map((doc) => {
                  const isSelected = selectedDocument?.id === doc.id;
                  return (
                    <div
                      key={doc.id}
                      onClick={() => onSelectDoc(doc)}
                      className={`p-4 hover:bg-slate-50/50 cursor-pointer transition-all flex items-center justify-between gap-4 ${
                        isSelected ? 'bg-slate-50 border-l-4 border-blue-600 pl-3' : ''
                      }`}
                      id={`doc-row-${doc.docNumber}`}
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/50">
                            {doc.docNumber}
                          </span>
                          <span className="text-xs text-slate-400">•</span>
                          <span className="text-[10px] font-bold text-slate-500">{doc.clause}</span>
                          <span className="text-xs text-slate-400">•</span>
                          <span className="text-[10px] font-semibold text-slate-500">{doc.department}</span>
                        </div>
                        <h3 className="font-bold text-sm text-slate-950 truncate pr-4">{doc.title}</h3>
                        <p className="text-xs text-slate-500 truncate">{doc.description}</p>
                      </div>

                      <div className="text-right shrink-0 space-y-1.5">
                        <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded ${
                          doc.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                          doc.status === 'Pending Review' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                          'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {doc.status}
                        </span>
                        <p className="text-[10px] text-slate-400 font-mono font-medium">{doc.revision}</p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-12 text-center" id="empty-library">
                  <HelpCircle className="mx-auto text-slate-300 mb-3" size={32} />
                  <p className="text-xs font-semibold text-slate-600">No documents match the active search filters.</p>
                  <p className="text-[11px] text-slate-400 mt-1">Try resetting the department or status filters.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right column: Document Inspector Detail Card */}
        <div className="space-y-6" id="document-inspector-panel">
          {selectedDocument ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6 sticky top-4" id="inspector-card">
              {/* Card Header */}
              <div className="border-b border-slate-100 pb-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    {selectedDocument.docNumber}
                  </span>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded ${
                    selectedDocument.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                    selectedDocument.status === 'Pending Review' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                    'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}>
                    {selectedDocument.status}
                  </span>
                </div>
                <h3 className="font-bold text-base text-slate-950 tracking-tight leading-snug">
                  {selectedDocument.title}
                </h3>
              </div>

              {/* Document Specs */}
              <div className="space-y-3.5 text-xs" id="doc-specs">
                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-400 font-medium">Revision Code</span>
                  <span className="font-bold text-slate-800 font-mono">{selectedDocument.revision} (Latest)</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-400 font-medium flex items-center gap-1">
                    <UserIcon size={14} className="text-slate-400" />
                    <span>Owner / Author</span>
                  </span>
                  <span className="font-semibold text-slate-800">{selectedDocument.owner}</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-400 font-medium">Department</span>
                  <span className="font-semibold text-slate-800">{selectedDocument.department}</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-400 font-medium">Associated ISO Clause</span>
                  <span className="font-bold text-slate-800 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
                    {selectedDocument.clause}
                  </span>
                </div>
                {selectedDocument.nextReviewDate && (
                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-400 font-medium flex items-center gap-1">
                      <Clock size={14} className="text-slate-400" />
                      <span>Next Review Date</span>
                    </span>
                    <span className="font-semibold text-rose-600">{selectedDocument.nextReviewDate}</span>
                  </div>
                )}
                <div className="space-y-1 pt-2">
                  <span className="text-slate-400 font-medium block">Scope & Objective</span>
                  <p className="text-slate-600 text-[11px] leading-relaxed bg-slate-50/50 p-2.5 rounded-lg border border-slate-200">
                    {selectedDocument.description}
                  </p>
                </div>
              </div>

              {/* Keywords Tagging */}
              <div className="space-y-1.5" id="keywords-panel">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Keywords Tagging</span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedDocument.keywords.map((k, i) => (
                    <span key={i} className="bg-slate-50 text-slate-600 text-[10px] px-2 py-1 rounded border border-slate-200 flex items-center gap-0.5">
                      <Tag size={10} className="text-slate-400" />
                      {k}
                    </span>
                  ))}
                </div>
              </div>

              {/* Revision Control Archive Accordion */}
              <div className="border border-slate-200 bg-slate-50/50 rounded-xl p-3.5 space-y-3" id="revision-archive-panel">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <Archive size={14} className="text-slate-500" />
                  <span>Obsolete Revision Archives</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-slate-900">{selectedDocument.revision}</span>
                    <span className="text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded text-[9px] border border-emerald-200/50">Active / Approved</span>
                  </div>
                  {getArchivedRevisions(selectedDocument.docNumber, selectedDocument.revision).map((arch, idx) => (
                    <div key={idx} className="flex items-center justify-between text-[11px] text-slate-400" id={`archive-rev-${idx}`}>
                      <div className="flex items-center gap-1 pl-1">
                        <CornerDownRight size={10} className="text-slate-300" />
                        <span className="font-mono">{arch.revision}</span>
                      </div>
                      <span className="font-medium flex items-center gap-0.5">
                        <History size={10} />
                        Obsolete / Archived
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions & Drive Link */}
              <div className="space-y-3 pt-2" id="doc-actions">
                {selectedDocument.driveLink && selectedDocument.driveLink !== '#' ? (
                  <a
                    href={selectedDocument.driveLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-1.5 bg-slate-950 hover:bg-slate-800 text-white font-semibold text-xs py-3 rounded-xl transition shadow-sm cursor-pointer"
                    id="open-drive-doc-btn"
                  >
                    Open Document in Google Drive
                    <ExternalLink size={14} />
                  </a>
                ) : (
                  <div className="text-center p-3 bg-amber-50 text-amber-800 text-[11px] rounded-xl border border-amber-200/50 leading-relaxed">
                    ⚠️ Current file is locally cached. Seed Google Drive to host files securely!
                  </div>
                )}

                {/* Status Transitions for Management */}
                {(isQM || isDH) && selectedDocument.status === 'Pending Review' && onUpdateDocumentStatus && (
                  <button
                    onClick={() => {
                      const confirmApprove = window.confirm(`Are you sure you want to approve "${selectedDocument.title}" as the active revision? This updates the central register.`);
                      if (confirmApprove) {
                        onUpdateDocumentStatus(selectedDocument.id, 'Approved');
                      }
                    }}
                    className="w-full inline-flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-3 rounded-xl transition cursor-pointer shadow-sm"
                    id="approve-doc-revision-btn"
                  >
                    <CheckCircle size={14} />
                    Approve Revision to Central Register
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 border-dashed rounded-2xl p-12 text-center flex flex-col justify-center items-center h-full min-h-[400px]" id="no-inspector-selection">
              <Search className="text-slate-300 mb-3" size={32} />
              <p className="text-xs font-semibold text-slate-500">Document Inspector</p>
              <p className="text-[11px] text-slate-400 mt-1 max-w-xs leading-relaxed">
                Click any document in the list to inspect revision history, metadata tracking, and view files.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
