/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { googleSignIn, logout } from '../googleAuth';
import { Database, FolderHeart, ShieldAlert, CheckCircle, Loader2 } from 'lucide-react';
import { User } from 'firebase/auth';

interface GoogleSetupProps {
  user: User | null;
  token: string | null;
  onAuthChange: (user: User | null, token: string | null) => void;
  spreadsheetId: string | null;
  spreadsheetLink: string | null;
  onSeedCompleted: (data: any) => void;
  isLoading: boolean;
  setIsLoading: (val: boolean) => void;
}

export default function GoogleSetup({
  user,
  token,
  onAuthChange,
  spreadsheetId,
  spreadsheetLink,
  onSeedCompleted,
  isLoading,
  setIsLoading
}: GoogleSetupProps) {
  const [error, setError] = useState<string | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);

  const handleSignIn = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const res = await googleSignIn();
      if (res) {
        onAuthChange(res.user, res.accessToken);
      }
    } catch (err: any) {
      console.error('Sign-in Error:', err);
      setError(err.message || 'Google Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    setError(null);
    try {
      await logout();
      onAuthChange(null, null);
    } catch (err: any) {
      setError(err.message || 'Logout failed.');
    }
  };

  const handleSeedDrive = async () => {
    if (!token) return;
    setError(null);
    setIsSeeding(true);
    try {
      const response = await fetch('/api/drive/seed', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: user?.email || 'contact@globalexpertdragan.com'
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to seed Google Drive structure.');
      }

      onSeedCompleted(data);
    } catch (err: any) {
      console.error('Seeding Error:', err);
      setError(err.message || 'Error occurred while creating Google Drive files.');
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 font-sans text-gray-800" id="google-setup-container">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden mb-8" id="setup-card">
        <div className="bg-[#0f172a] px-8 py-10 text-white relative overflow-hidden" id="setup-header">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <Database size={160} />
          </div>
          <span className="bg-blue-500/20 text-blue-300 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider mb-4 inline-block">
            Step 1: Workspace Integration
          </span>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Connect Google Workspace Storage</h1>
          <p className="text-slate-300 max-w-xl text-sm leading-relaxed">
            Link your professional Google Drive & Google Sheets accounts to initialize a compliant ISO 9001:2015 process directory, revision register, and audit files.
          </p>
        </div>

        <div className="p-8" id="setup-body">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-6 flex items-start gap-3 text-sm" id="setup-error">
              <ShieldAlert className="shrink-0 mt-0.5" size={18} />
              <div>
                <p className="font-semibold">Authorization / Seeding Error</p>
                <p>{error}</p>
              </div>
            </div>
          )}

          {!user ? (
            <div className="space-y-6" id="auth-unconnected-ui">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="benefits-grid">
                <div className="border border-slate-200 p-5 rounded-xl hover:bg-slate-50 transition-colors" id="benefit-drive">
                  <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center mb-4">
                    <FolderHeart size={20} />
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-1">Durable Document Storage</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Automatically organizes your ISO manuals, templates, checklists, and forms in structured Google Drive folders under <strong>ISO9001/</strong> parent directory.
                  </p>
                </div>
                <div className="border border-slate-200 p-5 rounded-xl hover:bg-slate-50 transition-colors" id="benefit-sheets">
                  <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center mb-4">
                    <Database size={20} />
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-1">Central Sheets Register</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Saves supplier audits, employee nonconformity submissions, CAPA tracking logs, and approval signatures in real-time inside structured spreadsheets.
                  </p>
                </div>
              </div>

              <div className="text-center pt-4" id="google-signin-btn-container">
                <button
                  onClick={handleSignIn}
                  disabled={isLoading}
                  className="inline-flex items-center gap-3 bg-slate-950 hover:bg-slate-800 text-white font-medium px-8 py-3.5 rounded-xl transition shadow-sm disabled:opacity-50 text-sm cursor-pointer"
                  id="google-signin-btn"
                >
                  {isLoading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M12.24 10.285V13.4h6.887C18.2 15.614 15.645 18 12.24 18c-3.86 0-7-3.14-7-7s3.14-7 7-7c1.7 0 3.25.61 4.47 1.615l2.4-2.4C17.29 1.63 14.92 1 12.24 1 6.58 1 2 5.58 2 11.25s4.58 10.25 10.24 10.25c5.91 0 9.83-4.15 9.83-10 0-.67-.06-1.32-.18-1.965H12.24z" />
                    </svg>
                  )}
                  {isLoading ? 'Connecting to Google...' : 'Sign in with Google Workspace'}
                </button>
                <p className="text-[11px] text-gray-400 mt-3">
                  With your permission, this app will securely interact with Google Drive and Google Sheets.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6" id="auth-connected-ui">
              <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 flex items-center justify-between" id="user-info-bar">
                <div className="flex items-center gap-3">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName || 'User'} className="w-10 h-10 rounded-full border border-gray-200" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-10 h-10 bg-slate-800 text-white rounded-full flex items-center justify-center font-bold text-sm">
                      {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold text-sm text-slate-900">{user.displayName || 'Authorized User'}</h3>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="text-xs text-red-600 hover:text-red-800 font-semibold border border-red-200 bg-red-50/50 hover:bg-red-50 px-3 py-1.5 rounded-lg transition cursor-pointer"
                  id="logout-btn"
                >
                  Disconnect Account
                </button>
              </div>

              {!spreadsheetId ? (
                <div className="border border-blue-100 bg-blue-50/40 rounded-xl p-6 text-center" id="seed-onboarding-panel">
                  <h3 className="font-bold text-slate-900 mb-2">Seed QMS Files and Directories</h3>
                  <p className="text-xs text-slate-600 max-w-lg mx-auto leading-relaxed mb-6">
                    Click below to automatically construct the 11 standard ISO 9001 parent directories in your Google Drive and set up the active <strong>ISO 9001 QMS Register</strong> Spreadsheet! We will also seed high-quality templates for immediate auditor testing.
                  </p>
                  <button
                    onClick={handleSeedDrive}
                    disabled={isSeeding}
                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl transition text-xs shadow-sm cursor-pointer disabled:opacity-50"
                    id="seed-drive-btn"
                  >
                    {isSeeding ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Constructing ISO Directories & Register...
                      </>
                    ) : (
                      <>
                        <FolderHeart size={16} />
                        Seed Google Drive QMS
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="border border-emerald-100 bg-emerald-50/30 rounded-xl p-6" id="seeded-success-panel">
                  <div className="flex items-start gap-3 mb-4">
                    <CheckCircle className="text-emerald-600 shrink-0 mt-0.5" size={20} />
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">System Successfully Synchronized!</h4>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        Your Google Drive has been seeded with standard ISO 9001:2015 directories. The <strong>ISO 9001 QMS Register</strong> is now actively logging live document statuses, workflows, and role classifications.
                      </p>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3" id="sheet-link-card">
                    <div className="text-center sm:text-left">
                      <span className="text-[10px] text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">Active Database Register</span>
                      <h5 className="font-semibold text-xs text-slate-900 mt-1">ISO 9001 QMS Register.xlsx</h5>
                    </div>
                    {spreadsheetLink && (
                      <a
                        href={spreadsheetLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 font-semibold px-4 py-2 rounded-lg transition"
                        id="open-register-link"
                      >
                        Open Spreadsheet Register
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
