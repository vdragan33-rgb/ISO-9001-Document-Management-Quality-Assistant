/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  Users, 
  Plus, 
  Trash2, 
  Check, 
  AlertTriangle, 
  Loader2, 
  RefreshCw, 
  ExternalLink,
  Info
} from 'lucide-react';
import { QMSEvent } from '../types';
import { 
  getEventsFromFirestore, 
  saveEventToFirestore, 
  deleteEventFromFirestore 
} from '../firebaseDb';

interface CalendarViewProps {
  token: string | null;
  userEmail: string | null;
}

export default function CalendarView({ token, userEmail }: CalendarViewProps) {
  const [qmsEvents, setQmsEvents] = useState<QMSEvent[]>([]);
  const [googleEvents, setGoogleEvents] = useState<any[]>([]);
  const [filterType, setFilterType] = useState<string>('All');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formType, setFormType] = useState<QMSEvent['eventType']>('Internal Audit');
  const [formDescription, setFormDescription] = useState('');
  const [formStartDate, setFormStartDate] = useState('');
  const [formStartTime, setFormStartTime] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formEndTime, setFormEndTime] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formAttendees, setFormAttendees] = useState('');
  const [syncToGoogle, setSyncToGoogle] = useState(true);

  // Sync state
  const [isGoogleSyncing, setIsGoogleSyncing] = useState(false);

  useEffect(() => {
    if (userEmail) {
      fetchEvents();
    }
  }, [userEmail, token]);

  const fetchEvents = async () => {
    if (!userEmail) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      // 1. Fetch from Firestore
      const dbEvents = await getEventsFromFirestore(userEmail);
      setQmsEvents(dbEvents);

      // 2. Fetch from Google Calendar (if token available)
      if (token) {
        setIsGoogleSyncing(true);
        const response = await fetch(`/api/calendar/events?timeMin=${encodeURIComponent(new Date().toISOString())}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setGoogleEvents(data.items || []);
        } else {
          console.warn('Could not retrieve Google Calendar events');
        }
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage('Failed to fetch scheduled events. Please ensure you are authorized.');
    } finally {
      setIsLoading(false);
      setIsGoogleSyncing(false);
    }
  };

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userEmail) return;

    if (!formTitle.trim() || !formStartDate || !formStartTime || !formEndDate || !formEndTime) {
      setErrorMessage('Please fill out all required fields.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const startDateTime = `${formStartDate}T${formStartTime}:00Z`;
    const endDateTime = `${formEndDate}T${formEndTime}:00Z`;

    // Basic Validation: End date/time after Start date/time
    if (new Date(endDateTime) <= new Date(startDateTime)) {
      setErrorMessage('Event end date/time must be after the start date/time.');
      setIsSaving(false);
      return;
    }

    try {
      let googleCalId: string | undefined = undefined;

      // 1. If Syncing with Google Calendar, call backend API first
      if (syncToGoogle && token) {
        const attendeeArray = formAttendees
          ? formAttendees.split(',').map(e => e.trim()).filter(e => e.includes('@'))
          : [];

        const gCalResponse = await fetch('/api/calendar/events', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            title: `[QMS] ${formTitle} (${formType})`,
            description: `${formDescription}\n\nScheduled via QMS Quality Assistant.\nType: ${formType}`,
            startDateTime,
            endDateTime,
            location: formLocation,
            attendees: attendeeArray
          })
        });

        const gCalData = await gCalResponse.json();
        if (gCalResponse.ok && gCalData.success) {
          googleCalId = gCalData.event.id;
        } else {
          throw new Error(gCalData.error || 'Google Calendar sync failed.');
        }
      }

      // 2. Save event record to Firestore database
      const newEvent: QMSEvent = {
        id: `evt_${Date.now()}`,
        title: formTitle,
        description: formDescription,
        eventType: formType,
        status: 'Scheduled',
        startDateTime,
        endDateTime,
        location: formLocation,
        attendees: formAttendees ? formAttendees.split(',').map(e => e.trim()).filter(Boolean) : [],
        calendarEventId: googleCalId,
        createdBy: userEmail
      };

      await saveEventToFirestore(newEvent);
      
      setSuccessMessage('Event successfully scheduled and synchronized!');
      setShowAddModal(false);
      
      // Reset Form fields
      setFormTitle('');
      setFormDescription('');
      setFormLocation('');
      setFormAttendees('');
      setFormStartDate('');
      setFormStartTime('');
      setFormEndDate('');
      setFormEndTime('');

      // Refresh listings
      await fetchEvents();
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Error scheduling event. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEvent = async (event: QMSEvent) => {
    const confirmDelete = window.confirm(`Are you sure you want to cancel the event "${event.title}"?`);
    if (!confirmDelete) return;

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      // 1. Delete from Google Calendar if synced
      if (event.calendarEventId && token) {
        const delResponse = await fetch(`/api/calendar/events/${event.calendarEventId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!delResponse.ok) {
          console.warn('Failed to delete Google Calendar event, proceeding with local deletion.');
        }
      }

      // 2. Delete from Firestore database
      await deleteEventFromFirestore(event.id);
      setSuccessMessage('Event cancelled successfully.');
      await fetchEvents();
    } catch (err: any) {
      console.error(err);
      setErrorMessage('Error cancelling event. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Format dates elegantly
  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Filter events based on criteria
  const filteredEvents = filterType === 'All'
    ? qmsEvents
    : qmsEvents.filter(e => e.eventType === filterType);

  return (
    <div className="font-sans text-slate-800 space-y-8" id="calendar-view-container">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4" id="calendar-header">
        <div>
          <span className="text-slate-500 font-medium text-xs tracking-wider uppercase block">Clause 9.2 & 9.3 Management Reviews & Audits</span>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-0.5">QMS Audit & Review Calendar</h1>
          <p className="text-slate-600 text-xs mt-1 max-w-xl leading-relaxed">
            Schedule compliance internal audits, document lifecycle reviews, CAPA alignment loops, and formal management review meetings synchronized to Google Calendar.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={fetchEvents} 
            className="p-2.5 border border-slate-200 hover:border-slate-300 text-slate-600 rounded-xl hover:bg-slate-50 transition cursor-pointer"
            title="Refresh Schedules"
            id="refresh-calendar-btn"
          >
            <RefreshCw size={15} className={isGoogleSyncing ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 bg-[#0f172a] hover:bg-slate-800 text-white font-semibold text-xs py-2.5 px-4 rounded-xl transition cursor-pointer shadow-sm"
            id="add-event-trigger"
          >
            <Plus size={15} />
            Schedule Quality Event
          </button>
        </div>
      </div>

      {/* Messages */}
      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl flex items-start gap-3 text-xs" id="calendar-err-msg">
          <AlertTriangle className="shrink-0 mt-0.5" size={16} />
          <p>{errorMessage}</p>
        </div>
      )}

      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-start gap-3 text-xs" id="calendar-success-msg">
          <Check className="shrink-0 mt-0.5 text-emerald-600" size={16} />
          <p>{successMessage}</p>
        </div>
      )}

      {/* Layout split: Local scheduled quality events & Realtime Google Calendar stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8" id="calendar-split-layout">
        {/* Left Column: Scheduled Quality Audits & Reviews */}
        <div className="lg:col-span-2 space-y-6" id="local-qms-events-panel">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden" id="qms-schedule-card">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3" id="qms-schedule-header">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active ISO Compliance Logs</span>
              
              {/* Type Filtering Tab Pills */}
              <div className="flex flex-wrap gap-1.5" id="calendar-filter-pills">
                {['All', 'Internal Audit', 'External Audit', 'Document Review', 'Management Review', 'CAPA Follow-up'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setFilterType(t)}
                    className={`text-[9px] font-bold px-2 py-1 rounded transition-colors cursor-pointer ${
                      filterType === t 
                        ? 'bg-[#0f172a] text-white' 
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                    }`}
                  >
                    {t.replace(' ', '\u00a0')}
                  </button>
                ))}
              </div>
            </div>

            <div className="divide-y divide-slate-100" id="qms-events-list">
              {isLoading ? (
                <div className="py-12 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                  <Loader2 className="animate-spin text-slate-400" size={24} />
                  <span>Loading QMS schedule registry...</span>
                </div>
              ) : filteredEvents.length > 0 ? (
                filteredEvents.map((evt) => (
                  <div key={evt.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors" id={`event-row-${evt.id}`}>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${
                          evt.eventType === 'Internal Audit' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                          evt.eventType === 'External Audit' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                          evt.eventType === 'Document Review' ? 'bg-teal-50 text-teal-700 border-teal-100' :
                          evt.eventType === 'Management Review' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                          'bg-amber-50 text-amber-700 border-amber-100'
                        }`}>
                          {evt.eventType}
                        </span>
                        {evt.calendarEventId && (
                          <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                            Google Synced
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-sm text-slate-900">{evt.title}</h4>
                      {evt.description && (
                        <p className="text-xs text-slate-600 max-w-xl">{evt.description}</p>
                      )}
                      
                      {/* Meta information row */}
                      <div className="flex flex-wrap gap-4 text-[10px] text-slate-400 pt-1">
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {formatDateTime(evt.startDateTime)}
                        </span>
                        {evt.location && (
                          <span className="flex items-center gap-1">
                            <MapPin size={12} />
                            {evt.location}
                          </span>
                        )}
                        {evt.attendees && evt.attendees.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Users size={12} />
                            {evt.attendees.length} Attendees
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => handleDeleteEvent(evt)}
                        className="p-2 text-rose-600 hover:text-rose-800 hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-xl transition cursor-pointer"
                        title="Cancel Event"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-xs text-slate-400">
                  No quality events scheduled for this filter. Click "Schedule Quality Event" to plan your cycle audits!
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Realtime Google Calendar Synced Feed */}
        <div className="space-y-6" id="google-calendar-feed-panel">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4" id="google-feed-card">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wide">Live Google Calendar Stream</h3>
              </div>
              <span className="text-[10px] text-slate-400 font-semibold">Primary Feed</span>
            </div>

            <div className="space-y-3.5 max-h-[480px] overflow-y-auto pr-1" id="google-stream-list">
              {isGoogleSyncing ? (
                <div className="py-8 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                  <Loader2 className="animate-spin text-slate-400" size={18} />
                  <span>Streaming direct from Google API...</span>
                </div>
              ) : googleEvents.length > 0 ? (
                googleEvents.map((evt: any) => {
                  const startStr = evt.start?.dateTime || evt.start?.date;
                  const isQmsTag = evt.summary?.startsWith('[QMS]');
                  
                  return (
                    <div key={evt.id} className="p-3 border border-slate-200 bg-white rounded-xl space-y-1.5 hover:border-slate-300 transition-all text-xs" id={`gcal-${evt.id}`}>
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold text-slate-900 line-clamp-1 leading-snug">
                          {evt.summary || '(No Title)'}
                        </h4>
                        {isQmsTag && (
                          <span className="text-[8px] bg-blue-50 text-blue-700 font-bold px-1 py-0.2 rounded border border-blue-100 shrink-0">
                            QMS Sync
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-slate-400">
                        <Clock size={11} />
                        <span>{startStr ? formatDateTime(startStr) : 'All Day Event'}</span>
                      </div>
                      {evt.location && (
                        <div className="flex items-center gap-1 text-[10px] text-slate-400">
                          <MapPin size={11} />
                          <span className="truncate">{evt.location}</span>
                        </div>
                      )}
                      {evt.htmlLink && (
                        <a 
                          href={evt.htmlLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-0.5 text-[10px] text-blue-600 hover:text-blue-800 font-semibold"
                        >
                          View in Google Calendar <ExternalLink size={10} />
                        </a>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="py-6 text-center text-[11px] text-slate-400">
                  <Info size={16} className="mx-auto mb-1.5 text-slate-300" />
                  No events found on Google Calendar for today or future dates. Connect workspace setup first if missing.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Interactive scheduling Modal Dialog */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="schedule-modal">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-xl"
          >
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Schedule Compliance Quality Event</h3>
                <p className="text-[10px] text-slate-400">Plan and coordinate a scheduled QMS process validation loop</p>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 font-semibold text-xs border border-slate-200 px-2.5 py-1 rounded hover:bg-slate-50 cursor-pointer"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleAddEvent} className="p-6 space-y-4 text-xs">
              {/* Event Title */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Event Title *</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Q4 Internal Audit for Logistics and Storage"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs outline-none focus:border-blue-500 transition-all"
                />
              </div>

              {/* Event Type & Sync Checkbox */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Event Type *</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as QMSEvent['eventType'])}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs outline-none focus:border-blue-500 transition-all"
                  >
                    <option value="Internal Audit">Internal Audit</option>
                    <option value="External Audit">External Audit</option>
                    <option value="Document Review">Document Review</option>
                    <option value="Management Review">Management Review</option>
                    <option value="CAPA Follow-up">CAPA Follow-up</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-5">
                  <input
                    type="checkbox"
                    id="sync-google-checkbox"
                    checked={syncToGoogle}
                    onChange={(e) => setSyncToGoogle(e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-slate-50 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="sync-google-checkbox" className="font-semibold text-slate-700 select-none">
                    Sync to Google Calendar
                  </label>
                </div>
              </div>

              {/* Start Date & Time */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs outline-none focus:border-blue-500 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Start Time *</label>
                  <input
                    type="time"
                    required
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs outline-none focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              {/* End Date & Time */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">End Date *</label>
                  <input
                    type="date"
                    required
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs outline-none focus:border-blue-500 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">End Time *</label>
                  <input
                    type="time"
                    required
                    value={formEndTime}
                    onChange={(e) => setFormEndTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs outline-none focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              {/* Location */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Location / Link</label>
                <input
                  type="text"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  placeholder="e.g. Conference Room B or Zoom Meeting Link"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs outline-none focus:border-blue-500 transition-all"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Description / Agenda</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Detail agenda items, documents to review, clauses to audit..."
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs resize-none outline-none focus:border-blue-500 transition-all"
                />
              </div>

              {/* Attendees */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Invitees (Emails, comma-separated)</label>
                <input
                  type="text"
                  value={formAttendees}
                  onChange={(e) => setFormAttendees(e.target.value)}
                  placeholder="e.g. jane.smith@example.com, auditor@expert.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs outline-none focus:border-blue-500 transition-all"
                />
              </div>

              {/* Action buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold py-2.5 px-4 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-6 rounded-xl transition cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Scheduling...
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      Schedule Event
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
