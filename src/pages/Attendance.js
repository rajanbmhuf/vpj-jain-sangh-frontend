import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_KEY
);

export default function Attendance() {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [attendance, setAttendance] = useState([]);
  const [invTotal, setInvTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    supabase.from('events').select('id, event_name, event_date')
      .eq('is_active', true).order('event_date', { ascending: false })
      .then(({ data }) => setEvents(data || []));
  }, []);

  async function loadAttendance(eventId) {
    setLoading(true);
    const [att, inv] = await Promise.all([
      supabase.from('attendance')
        .select('*, members(full_name, relation), families(head_name)')
        .eq('event_id', eventId).order('scanned_at', { ascending: false }),
      supabase.from('invitations').select('id', { count: 'exact' }).eq('event_id', eventId),
    ]);
    setAttendance(att.data || []);
    setInvTotal(inv.count || 0);
    setLoading(false);
  }

  const filtered = attendance.filter(a => {
    const name = a.members?.full_name || a.families?.head_name || '';
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const pct = invTotal > 0 ? Math.round((attendance.length / invTotal) * 100) : 0;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Attendance</div>
          <div className="page-sub">Live check-in records from QR scanning</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body">
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Select Event to View Attendance</label>
            <select className="form-control" value={selectedEvent} onChange={e => { setSelectedEvent(e.target.value); if (e.target.value) loadAttendance(e.target.value); }} style={{ maxWidth: 400 }}>
              <option value="">-- Choose an event --</option>
              {events.map(ev => <option key={ev.id} value={ev.id}>{ev.event_name} ({new Date(ev.event_date).toLocaleDateString('en-IN')})</option>)}
            </select>
          </div>
        </div>
      </div>

      {selectedEvent && (
        <>
          <div className="stat-grid" style={{ marginBottom: 20 }}>
            <div className="stat-card" style={{ borderTop: '3px solid #7c3aed' }}>
              <div className="stat-label">Total Checked In</div>
              <div className="stat-value" style={{ color: '#7c3aed' }}>{attendance.length}</div>
              <div className="stat-sub">Members scanned</div>
            </div>
            <div className="stat-card" style={{ borderTop: '3px solid #059669' }}>
              <div className="stat-label">Total Invitations</div>
              <div className="stat-value" style={{ color: '#059669' }}>{invTotal}</div>
              <div className="stat-sub">QR codes sent</div>
            </div>
            <div className="stat-card" style={{ borderTop: '3px solid #d97706' }}>
              <div className="stat-label">Attendance Rate</div>
              <div className="stat-value" style={{ color: '#d97706' }}>{pct}%</div>
              <div style={{ marginTop: 8 }}>
                <div style={{ background: '#f3f4f6', borderRadius: 4, height: 6 }}>
                  <div style={{ background: '#d97706', borderRadius: 4, height: 6, width: `${pct}%`, transition: 'width 0.5s' }} />
                </div>
              </div>
            </div>
            <div className="stat-card" style={{ borderTop: '3px solid #6b7280' }}>
              <div className="stat-label">Not Yet Arrived</div>
              <div className="stat-value" style={{ color: '#6b7280' }}>{invTotal - attendance.length}</div>
              <div className="stat-sub">Pending check-in</div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">Check-in Log</div>
              <button className="btn btn-outline btn-sm" onClick={() => loadAttendance(selectedEvent)}>Refresh</button>
            </div>
            <div style={{ padding: '0 20px 12px' }}>
              <input className="search-input" style={{ width: '100%' }} placeholder="Search by member name..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            {loading ? <div className="loading">Loading attendance...</div> : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Member Name</th>
                      <th>Relation</th>
                      <th>Family (Head)</th>
                      <th>Scanned At</th>
                      <th>Scanned By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 && (
                      <tr><td colSpan={6} style={{ textAlign: 'center', color: '#9ca3af', padding: 32 }}>No check-ins yet</td></tr>
                    )}
                    {filtered.map((a, i) => (
                      <tr key={a.id}>
                        <td style={{ color: '#9ca3af' }}>{i + 1}</td>
                        <td><strong>{a.members?.full_name || a.families?.head_name}</strong></td>
                        <td><span className="badge badge-purple">{a.members?.relation || 'Head of Family'}</span></td>
                        <td>{a.families?.head_name}</td>
                        <td>{new Date(a.scanned_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</td>
                        <td>{a.scanned_by || 'Volunteer'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {!selectedEvent && (
        <div className="empty-state">
          <div className="empty-state-icon">✓</div>
          <div className="empty-state-title">Select an event above</div>
          <div className="empty-state-sub">You will see live attendance as volunteers scan QR codes at the event entrance</div>
        </div>
      )}
    </div>
  );
}
