import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_KEY
);

const EMPTY_EVENT = { event_name: '', description: '', event_date: '', start_time: '', end_time: '', venue_name: '', venue_address: '', venue_map_link: '' };

export default function Events() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDonorModal, setShowDonorModal] = useState(false);
  const [editEvent, setEditEvent] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [form, setForm] = useState(EMPTY_EVENT);
  const [donorForm, setDonorForm] = useState({ donor_name: '', donor_type: 'sub', mobile: '', amount: '' });
  const [msg, setMsg] = useState(null);

  async function loadEvents() {
    setLoading(true);
    const { data } = await supabase
      .from('events').select('*, donors(*)')
      .eq('is_active', true).order('event_date', { ascending: false });
    setEvents(data || []);
    setLoading(false);
  }

  useEffect(() => { loadEvents(); }, []);

  function flash(type, text) { setMsg({ type, text }); setTimeout(() => setMsg(null), 3000); }

  async function saveEvent() {
    if (!form.event_name || !form.event_date || !form.venue_name) return flash('error', 'Event name, date and venue are required');
    if (editEvent) {
      await supabase.from('events').update(form).eq('id', editEvent.id);
      flash('success', 'Event updated!');
    } else {
      await supabase.from('events').insert(form);
      flash('success', 'Event created!');
    }
    setShowModal(false); setEditEvent(null); setForm(EMPTY_EVENT); loadEvents();
  }

  async function addDonor() {
    if (!donorForm.donor_name) return flash('error', 'Donor name is required');
    await supabase.from('donors').insert({ ...donorForm, event_id: selectedEvent.id, amount: donorForm.amount ? parseFloat(donorForm.amount) : null });
    flash('success', 'Donor added!');
    setDonorForm({ donor_name: '', donor_type: 'sub', mobile: '', amount: '' });
    loadEvents();
  }

  async function removeDonor(id) {
    await supabase.from('donors').delete().eq('id', id);
    loadEvents();
  }

  async function deleteEvent(id) {
    if (!window.confirm('Remove this event?')) return;
    await supabase.from('events').update({ is_active: false }).eq('id', id);
    loadEvents();
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Events</div>
          <div className="page-sub">{events.length} events created</div>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditEvent(null); setForm(EMPTY_EVENT); setShowModal(true); }}>+ Create Event</button>
      </div>

      {msg && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}

      {loading ? <div className="loading">Loading events...</div> : events.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📅</div>
          <div className="empty-state-title">No events yet</div>
          <div className="empty-state-sub">Create your first community event</div>
        </div>
      ) : events.map(ev => {
        const mainDonor = ev.donors?.find(d => d.donor_type === 'main');
        const subDonors = ev.donors?.filter(d => d.donor_type === 'sub') || [];
        return (
          <div className="card" key={ev.id} style={{ marginBottom: 16 }}>
            <div className="card-header">
              <div>
                <div style={{ fontWeight: 600, fontSize: 16 }}>{ev.event_name}</div>
                <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
                  {new Date(ev.event_date).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  {ev.start_time && ` · ${ev.start_time}`}
                  {ev.end_time && ` – ${ev.end_time}`}
                </div>
                <div style={{ fontSize: 13, color: '#9ca3af' }}>{ev.venue_name}{ev.venue_address ? ` · ${ev.venue_address}` : ''}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <button className="btn btn-outline btn-sm" onClick={() => { setSelectedEvent(ev); setShowDonorModal(true); }}>+ Donors</button>
                <button className="btn btn-outline btn-sm" onClick={() => { setEditEvent(ev); setForm({ event_name: ev.event_name, description: ev.description || '', event_date: ev.event_date, start_time: ev.start_time || '', end_time: ev.end_time || '', venue_name: ev.venue_name, venue_address: ev.venue_address || '', venue_map_link: ev.venue_map_link || '' }); setShowModal(true); }}>Edit</button>
                <button className="btn btn-danger btn-sm" onClick={() => deleteEvent(ev.id)}>Remove</button>
              </div>
            </div>
            {ev.description && <div style={{ padding: '0 20px 12px', fontSize: 13, color: '#6b7280' }}>{ev.description}</div>}
            {(mainDonor || subDonors.length > 0) && (
              <div className="card-body" style={{ paddingTop: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 8 }}>DONORS</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {mainDonor && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#ede9fe', borderRadius: 8, padding: '6px 12px' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#7c3aed' }}>MAIN DONOR</span>
                      <span style={{ fontSize: 13, color: '#4c1d95', fontWeight: 500 }}>{mainDonor.donor_name}</span>
                      <button onClick={() => removeDonor(mainDonor.id)} style={{ background: 'none', border: 'none', color: '#7c3aed', cursor: 'pointer', fontSize: 14, padding: '0 2px' }}>×</button>
                    </div>
                  )}
                  {subDonors.map(d => (
                    <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f3f4f6', borderRadius: 8, padding: '6px 12px' }}>
                      <span style={{ fontSize: 13, color: '#374151' }}>{d.donor_name}</span>
                      <button onClick={() => removeDonor(d.id)} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 14, padding: '0 2px' }}>×</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Event Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">{editEvent ? 'Edit Event' : 'Create New Event'}</div>
            <div className="form-group">
              <label className="form-label">Event Name *</label>
              <input className="form-control" value={form.event_name} onChange={e => setForm({ ...form, event_name: e.target.value })} placeholder="e.g. Paryushan Mahaparva 2025" />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-control" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Brief description of the event" />
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Event Date *</label>
                <input className="form-control" type="date" value={form.event_date} onChange={e => setForm({ ...form, event_date: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Start Time</label>
                <input className="form-control" type="time" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} />
              </div>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">End Time</label>
                <input className="form-control" type="time" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Venue Name *</label>
                <input className="form-control" value={form.venue_name} onChange={e => setForm({ ...form, venue_name: e.target.value })} placeholder="Hall / Mandir name" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Venue Address</label>
              <textarea className="form-control" rows={2} value={form.venue_address} onChange={e => setForm({ ...form, venue_address: e.target.value })} placeholder="Full address of venue" />
            </div>
            <div className="form-group">
              <label className="form-label">Google Maps Link</label>
              <input className="form-control" value={form.venue_map_link} onChange={e => setForm({ ...form, venue_map_link: e.target.value })} placeholder="https://maps.google.com/..." />
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveEvent}>{editEvent ? 'Update Event' : 'Create Event'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Donor Modal */}
      {showDonorModal && selectedEvent && (
        <div className="modal-overlay" onClick={() => setShowDonorModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Manage Donors — {selectedEvent.event_name}</div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Donor Name *</label>
                <input className="form-control" value={donorForm.donor_name} onChange={e => setDonorForm({ ...donorForm, donor_name: e.target.value })} placeholder="Full name" />
              </div>
              <div className="form-group">
                <label className="form-label">Donor Type</label>
                <select className="form-control" value={donorForm.donor_type} onChange={e => setDonorForm({ ...donorForm, donor_type: e.target.value })}>
                  <option value="main">Main Donor</option>
                  <option value="sub">Sub Donor</option>
                </select>
              </div>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Mobile</label>
                <input className="form-control" value={donorForm.mobile} onChange={e => setDonorForm({ ...donorForm, mobile: e.target.value })} placeholder="Mobile number" />
              </div>
              <div className="form-group">
                <label className="form-label">Donation Amount (₹)</label>
                <input className="form-control" type="number" value={donorForm.amount} onChange={e => setDonorForm({ ...donorForm, amount: e.target.value })} placeholder="Optional" />
              </div>
            </div>
            <button className="btn btn-success" onClick={addDonor} style={{ width: '100%', marginBottom: 16 }}>Add Donor</button>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 8 }}>CURRENT DONORS</div>
            {(selectedEvent.donors || []).length === 0 ? <div style={{ fontSize: 13, color: '#9ca3af' }}>No donors added yet</div> : (
              selectedEvent.donors.map(d => (
                <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f9fafb', borderRadius: 8, marginBottom: 6 }}>
                  <div>
                    <span style={{ fontWeight: 500, fontSize: 13 }}>{d.donor_name}</span>
                    <span className={`badge ${d.donor_type === 'main' ? 'badge-purple' : 'badge-gray'}`} style={{ marginLeft: 8 }}>{d.donor_type === 'main' ? 'Main' : 'Sub'}</span>
                    {d.amount && <span style={{ fontSize: 12, color: '#059669', marginLeft: 8 }}>₹{d.amount}</span>}
                  </div>
                  <button onClick={() => { removeDonor(d.id); setSelectedEvent({ ...selectedEvent, donors: selectedEvent.donors.filter(x => x.id !== d.id) }); }} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 18 }}>×</button>
                </div>
              ))
            )}
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowDonorModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
