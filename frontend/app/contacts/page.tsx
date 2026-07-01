'use client';

import { useState, useEffect, useRef } from 'react';
import AppShell from '@/components/layout/AppShell';
import { useAuth } from '@/lib/AuthContext';
import { API_URL } from '@/lib/config';
import {
  Users, UserPlus, Phone, MapPin, Trash2, ShieldCheck,
  Upload, Download, FileSpreadsheet, CheckCircle2, AlertTriangle, X
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface Subscriber {
  id: number;
  phone_number: string;
  ta_area: string;
  is_active: boolean;
}

interface ImportResult {
  added: number;
  skipped: number;
  errors: string[];
  message: string;
}

const TA_ZONES = ['TA Ngabu', 'TA Makhwira', 'TA Lundu', 'TA Kasisi', 'TA Chapananga'];

export default function ContactsPage() {
  const { authFetch } = useAuth();
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);

  // Single-add form state
  const [phone, setPhone] = useState('');
  const [taArea, setTaArea] = useState(TA_ZONES[0]);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Import state
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchSubscribers = async () => {
    try {
      const res = await authFetch(`${API_URL}/api/v1/subscribers`);
      if (res.ok) {
        const data = await res.json();
        setSubscribers(data);
      }
    } catch (err) {
      console.error('Failed to fetch subscribers', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSubscribers(); }, []);

  // ── Download Excel Template ────────────────────────────────────────────
  const downloadTemplate = () => {
    const templateRows = [
      { 'Phone Number': '+265981234567', 'TA Area': 'TA Ngabu' },
      { 'Phone Number': '+265992345678', 'TA Area': 'TA Makhwira' },
      { 'Phone Number': '+265993456789', 'TA Area': 'TA Lundu' },
    ];

    const ws = XLSX.utils.json_to_sheet(templateRows);

    // Set column widths
    ws['!cols'] = [{ wch: 20 }, { wch: 20 }];

    // Style the header row text (SheetJS community edition supports basic styles)
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Contacts');

    // Add a notes sheet with instructions
    const notes = [
      { Instructions: 'Fill in the Phone Number and TA Area columns only.' },
      { Instructions: 'Phone numbers must start with + and country code, e.g. +265.' },
      { Instructions: 'TA Area must be one of: ' + TA_ZONES.join(', ') },
      { Instructions: 'Do not change the column headers (Row 1).' },
      { Instructions: 'Delete the example rows before importing.' },
      { Instructions: 'Save as .xlsx then upload using the Import button.' },
    ];
    const wsNotes = XLSX.utils.json_to_sheet(notes);
    wsNotes['!cols'] = [{ wch: 80 }];
    XLSX.utils.book_append_sheet(wb, wsNotes, 'Instructions');

    XLSX.writeFile(wb, 'Chikwawa_FRS_Contacts_Template.xlsx');
  };

  // ── Process uploaded Excel file ────────────────────────────────────────
  const processFile = async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      alert('Please upload a valid Excel file (.xlsx, .xls) or CSV file.');
      return;
    }

    setIsImporting(true);
    setImportResult(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const wb = XLSX.read(arrayBuffer, { type: 'array' });

      // Read the first sheet
      const firstSheet = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });

      if (rows.length === 0) {
        alert('The spreadsheet is empty. Please add contact rows.');
        setIsImporting(false);
        return;
      }

      // Normalize column names — handle common variations
      const contacts = rows
        .map((row: any) => {
          const phone =
            row['Phone Number'] || row['phone_number'] || row['Phone'] || row['PHONE'] || '';
          const ta =
            row['TA Area'] || row['ta_area'] || row['TA'] || row['Area'] || row['AREA'] || '';
          return {
            phone_number: String(phone).trim(),
            ta_area: String(ta).trim(),
          };
        })
        .filter(c => c.phone_number && c.ta_area);

      if (contacts.length === 0) {
        alert(
          'No valid rows found. Make sure your sheet has "Phone Number" and "TA Area" columns.'
        );
        setIsImporting(false);
        return;
      }

      const res = await authFetch(`${API_URL}/api/v1/subscribers/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contacts }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Bulk import failed');

      setImportResult(data as ImportResult);
      fetchSubscribers(); // refresh the list
    } catch (err: any) {
      alert(`Import error: ${err.message}`);
    } finally {
      setIsImporting(false);
      // Reset file input so the same file can be re-imported after fixing issues
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  // ── Single-add ─────────────────────────────────────────────────────────
  const handleAddSubscriber = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    setSubmitSuccess(false);
    setIsSubmitting(true);
    try {
      const res = await authFetch(`${API_URL}/api/v1/subscribers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: phone, ta_area: taArea }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Failed to add subscriber');
      }
      setSubmitSuccess(true);
      setPhone('');
      fetchSubscribers();
    } catch (err: any) {
      setSubmitError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to remove this contact?')) return;
    try {
      const res = await authFetch(`${API_URL}/api/v1/subscribers/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) setSubscribers(prev => prev.filter(sub => sub.id !== id));
    } catch (err) {
      console.error('Delete failed', err);
    }
  };

  return (
    <AppShell>
      <div className="topbar">
        <div>
          <div className="topbar-title">Resident Contacts Directory</div>
          <div className="topbar-subtitle">
            Manage emergency broadcast recipients ({subscribers.length} total)
          </div>
        </div>

        {/* Header actions */}
        <div className="topbar-actions">
          <button
            className="btn btn-ghost"
            onClick={downloadTemplate}
            style={{ display: 'flex', alignItems: 'center', gap: 7 }}
            title="Download the Excel template to fill in contacts offline"
          >
            <Download size={15} />
            Download Template
          </button>
        </div>
      </div>

      <div className="two-col-responsive">

        {/* ── LEFT COLUMN: Forms ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Single-add form */}
          <div className="card" style={{ height: 'fit-content' }}>
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <UserPlus size={18} /> Add New Contact
            </div>

            <form onSubmit={handleAddSubscriber} style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 20 }}>
              {submitError && (
                <div style={{ color: 'var(--risk-high)', fontSize: 13 }}>{submitError}</div>
              )}
              {submitSuccess && (
                <div style={{ color: 'var(--risk-low)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ShieldCheck size={14} /> Contact registered
                </div>
              )}

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>
                  Phone Number
                </label>
                <div style={{ position: 'relative' }}>
                  <Phone size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
                  <input
                    type="tel"
                    placeholder="+265..."
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    style={{
                      width: '100%', padding: '10px 12px 10px 36px',
                      borderRadius: 6, border: '1px solid var(--border)',
                      background: 'var(--bg-main)', color: 'var(--text-primary)',
                      outline: 'none', fontSize: 13
                    }}
                    required
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>
                  Traditional Authority (TA)
                </label>
                <div style={{ position: 'relative' }}>
                  <MapPin size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
                  <select
                    value={taArea}
                    onChange={e => setTaArea(e.target.value)}
                    style={{
                      width: '100%', padding: '10px 12px 10px 36px',
                      borderRadius: 6, border: '1px solid var(--border)',
                      background: 'var(--bg-main)', color: 'var(--text-primary)',
                      outline: 'none', fontSize: 13, appearance: 'none'
                    }}
                  >
                    {TA_ZONES.map(ta => <option key={ta} value={ta}>{ta}</option>)}
                  </select>
                </div>
              </div>

              <button type="submit" className="btn btn-primary" disabled={isSubmitting} style={{ marginTop: 8 }}>
                {isSubmitting ? 'Registering...' : 'Register Contact'}
              </button>
            </form>
          </div>

          {/* ── Bulk Import card ── */}
          <div className="card" style={{ height: 'fit-content' }}>
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileSpreadsheet size={18} /> Bulk Import from Excel
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, marginBottom: 16 }}>
              Upload an .xlsx or .csv file with columns <strong>Phone Number</strong> and <strong>TA Area</strong>.
              Existing numbers are automatically skipped (no duplicates).
            </p>

            {/* Drag-and-drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? 'var(--brand-blue)' : 'var(--border)'}`,
                borderRadius: 10,
                padding: '28px 20px',
                textAlign: 'center',
                cursor: 'pointer',
                background: dragOver ? 'rgba(37,99,235,0.05)' : 'var(--bg-primary)',
                transition: 'all 0.2s',
              }}
            >
              <Upload
                size={28}
                style={{
                  margin: '0 auto 10px',
                  color: dragOver ? 'var(--brand-blue)' : 'var(--text-muted)',
                  transition: 'color 0.2s',
                }}
              />
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                {isImporting ? 'Importing...' : 'Click or drag & drop your Excel file here'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Supports .xlsx, .xls, .csv — max 10,000 rows
              </div>
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />

            {/* Helper: Download template link */}
            <button
              onClick={downloadTemplate}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                marginTop: 14, background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--brand-blue)', fontSize: 12, fontWeight: 600, padding: 0,
              }}
            >
              <Download size={13} /> Download blank template
            </button>

            {/* Import result banner */}
            {importResult && (
              <div style={{
                marginTop: 16, padding: '12px 14px', borderRadius: 8, fontSize: 13,
                background: importResult.added > 0 ? 'var(--risk-low-bg)' : 'var(--risk-med-bg)',
                border: `1px solid ${importResult.added > 0 ? 'var(--risk-low)' : 'var(--risk-med)'}`,
                color: importResult.added > 0 ? 'var(--risk-low)' : 'var(--risk-med)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
                    {importResult.added > 0
                      ? <CheckCircle2 size={16} />
                      : <AlertTriangle size={16} />
                    }
                    {importResult.message}
                  </div>
                  <button
                    onClick={() => setImportResult(null)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.6 }}
                  >
                    <X size={14} />
                  </button>
                </div>
                {importResult.errors.length > 0 && (
                  <ul style={{ marginTop: 8, paddingLeft: 18, fontSize: 11, opacity: 0.8 }}>
                    {importResult.errors.slice(0, 5).map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                    {importResult.errors.length > 5 && (
                      <li>...and {importResult.errors.length - 5} more</li>
                    )}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT COLUMN: Contacts table ── */}
        <div className="card">
          <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Users size={18} /> Registered Residents
          </div>

          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading contacts...
            </div>
          ) : subscribers.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-main)', borderRadius: 8 }}>
              <Users size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
              <div style={{ fontSize: 14, fontWeight: 600 }}>No contacts found</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Add residents individually or import an Excel sheet.</div>
            </div>
          ) : (
            <div className="contacts-table-wrapper" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600 }}>Phone Number</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600 }}>TA Area</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600 }}>Status</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subscribers.map(sub => (
                    <tr key={sub.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px', fontWeight: 600 }}>{sub.phone_number}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <MapPin size={14} color="var(--brand-cyan)" /> {sub.ta_area}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        {sub.is_active
                          ? <span className="badge badge-low"><span className="badge-dot" /> ACTIVE</span>
                          : <span className="badge badge-medium"><span className="badge-dot" /> INACTIVE</span>
                        }
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        <button
                          className="btn btn-ghost"
                          style={{ padding: '6px 10px', color: 'var(--risk-high)' }}
                          onClick={() => handleDelete(sub.id)}
                        >
                          <Trash2 size={14} /> Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
