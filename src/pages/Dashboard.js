import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_KEY
);

export default function Dashboard() {
  const [stats, setStats] = useState({ families: 0, members: 0, events: 0, invitations: 0 });
  const [recentEvents, setRecentEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [f, m, e, i] = await Promise.all([
        supabase.from('families').select('id', { count: 'exact' }).eq('is_active', true),
        supabase.from('members').select('id', { count: 'exact' }).eq('is_active', true),
        supabase.from('events').select('id', { count: 'exact' }).eq('is_active', true),
        supabase.from('invitations').select('id', { count: 'exact' }),
      ]);
      setStats({
        families: f.count || 0,
        members: m.count || 0,
        events: e.count || 0,
        invitations: i.count || 0,
      });

      const { data: evts } = await supabase
        .from('events').select('*, donors(donor_name, donor_type)')
        .eq('is_active', true).order('event_date', { ascending: false }).limit(5);
      setRecentEvents(evts || []);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="loading">Loading dashboard...</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Welcome to VPJ Jain Sangh</div>
          <div className="page-sub">Community Management System</div>
        </div>
      </div>

      <div className="stat-grid">
        {[
          { label: 'Total Families', value: stats.families, sub: 'Head of Family', color: '#7c3aed' },
          { label: 'Total Members', value: stats.members, sub: 'All family members', color: '#059669' },
          { label: 'Events Created', value: stats.events, sub: 'All events', color: '#d97706' },
          { label: 'Invitations Sent', value: stats.invitations, sub: 'QR codes generated', color: '#dc2626' },
        ].map(s => (
          <div className="stat-card" key={s.label} style={{ borderTop: `3px solid ${s.color}` }}>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
            <div className="stat-sub">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Recent Events</div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Event Name</th>
                <th>Date</th>
                <th>Venue</th>
                <th>Main Donor</th>
                <th>Sub Donors</th>
              </tr>
            </thead>
            <tbody>
              {recentEvents.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', color: '#9ca3af', padding: '32px' }}>No events yet. Create your first event!</td></tr>
              )}
              {recentEvents.map(ev => {
                const main = ev.donors?.find(d => d.donor_type === 'main');
                const subs = ev.donors?.filter(d => d.donor_type === 'sub') || [];
                return (
                  <tr key={ev.id}>
                    <td><strong>{ev.event_name}</strong></td>
                    <td>{new Date(ev.event_date).toLocaleDateString('en-IN')}</td>
                    <td>{ev.venue_name}</td>
                    <td>{main ? <span className="badge badge-purple">{main.donor_name}</span> : '-'}</td>
                    <td>{subs.length > 0 ? subs.map(s => s.donor_name).join(', ') : '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><div className="card-title">Quick Guide</div></div>
        <div className="card-body">
          {[
            ['1', 'Add Families', 'Go to Members & Families → Add Head of Family and their members', '#7c3aed'],
            ['2', 'Create Event', 'Go to Events → Create event with date, time, venue and donor details', '#059669'],
            ['3', 'Generate QR Codes', 'Go to Invitations → Select event → Generate QR for all members', '#d97706'],
            ['4', 'Send Invitations', 'Send invitation with QR code via Email or WhatsApp to each member', '#2563eb'],
            ['5', 'Scan at Event', 'Volunteers use the mobile app to scan QR codes at entry gate', '#dc2626'],
          ].map(([num, title, desc, color]) => (
            <div key={num} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>{num}</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{title}</div>
                <div style={{ fontSize: 13, color: '#6b7280' }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
