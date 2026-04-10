import React, { useEffect, useState, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import QRCode from 'qrcode';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_KEY
);

export default function Invitations() {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [eventData, setEventData] = useState(null);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [msg, setMsg] = useState(null);
  const [qrImages, setQrImages] = useState({});

  function flash(type, text) { setMsg({ type, text }); setTimeout(() => setMsg(null), 4000); }

  useEffect(() => {
    supabase.from('events').select('id, event_name, event_date, start_time, venue_name, venue_address, donors(donor_name, donor_type)')
      .eq('is_active', true).order('event_date', { ascending: false })
      .then(({ data }) => setEvents(data || []));
  }, []);

  async function loadInvitations(eventId) {
    setLoading(true);
    const ev = events.find(e => e.id === eventId);
    setEventData(ev);
    const { data } = await supabase
      .from('invitations')
      .select('*, families(head_name, address, mobile, email), members(full_name, relation, mobile, email)')
      .eq('event_id', eventId);
    setInvitations(data || []);

    // Generate QR images
    const imgs = {};
    for (const inv of (data || [])) {
      try {
        imgs[inv.id] = await QRCode.toDataURL(inv.qr_code, { width: 150, margin: 1, color: { dark: '#1e1b4b', light: '#ffffff' } });
      } catch (e) {}
    }
    setQrImages(imgs);
    setLoading(false);
  }

  async function generateQRCodes() {
    if (!selectedEvent) return flash('error', 'Please select an event first');
    if (!window.confirm('This will generate unique QR codes for ALL active members for this event. Continue?')) return;
    setGenerating(true);
    const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/invitations/generate/${selectedEvent}`, { method: 'POST' });
    const data = await res.json();
    if (data.error) { flash('error', data.error); } else {
      flash('success', `Generated ${data.generated} QR codes successfully!`);
      loadInvitations(selectedEvent);
    }
    setGenerating(false);
  }

  function buildInviteText(inv) {
    if (!eventData) return '';
    const name = inv.members?.full_name || inv.families?.head_name || '';
    const mainDonor = eventData.donors?.find(d => d.donor_type === 'main');
    const subDonors = eventData.donors?.filter(d => d.donor_type === 'sub') || [];
    const dateStr = new Date(eventData.event_date).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    return `🙏 *Jai Jinendra* 🙏

*VPJ Jain Sangh* cordially invites you to:

*${eventData.event_name}*

📅 *Date:* ${dateStr}
⏰ *Time:* ${eventData.start_time || ''} ${eventData.end_time ? '- ' + eventData.end_time : ''}
📍 *Venue:* ${eventData.venue_name}
${eventData.venue_address ? `${eventData.venue_address}` : ''}

${mainDonor ? `🌟 *Main Donor:* ${mainDonor.donor_name}` : ''}
${subDonors.length > 0 ? `✨ *Sub Donors:* ${subDonors.map(d => d.donor_name).join(', ')}` : ''}

Dear *${name}*,
Your personal entry QR Code: *${inv.qr_code}*
Please show this QR code at the entrance.

_VPJ Jain Sangh_`;
  }

  function sendWhatsApp(inv) {
    const mobile = inv.members?.mobile || inv.families?.mobile || '';
    if (!mobile) return flash('error', 'No mobile number for this member');
    const text = encodeURIComponent(buildInviteText(inv));
    const num = mobile.replace(/\D/g, '');
    const intl = num.startsWith('91') ? num : `91${num}`;
    window.open(`https://wa.me/${intl}?text=${text}`, '_blank');
  }

  function sendAllWhatsApp() {
    let count = 0;
    invitations.forEach((inv, i) => {
      const mobile = inv.members?.mobile || inv.families?.mobile || '';
      if (mobile) {
        setTimeout(() => {
          const text = encodeURIComponent(buildInviteText(inv));
          const num = mobile.replace(/\D/g, '');
          const intl = num.startsWith('91') ? num : `91${num}`;
          window.open(`https://wa.me/${intl}?text=${text}`, '_blank');
        }, i * 1500);
        count++;
      }
    });
    flash('success', `Opening WhatsApp for ${count} members. Please allow popups if blocked.`);
  }

  function printInvitation(inv) {
    const qrImg = qrImages[inv.id];
    const name = inv.members?.full_name || inv.families?.head_name || '';
    const dateStr = eventData ? new Date(eventData.event_date).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '';
    const mainDonor = eventData?.donors?.find(d => d.donor_type === 'main');
    const subDonors = eventData?.donors?.filter(d => d.donor_type === 'sub') || [];

    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html><html><head><title>Invitation - ${name}</title>
    <style>body{font-family:Arial,sans-serif;max-width:600px;margin:40px auto;padding:24px;border:2px solid #7c3aed;border-radius:12px;}
    h1{color:#7c3aed;text-align:center;}.sub{text-align:center;color:#6b7280;font-size:14px;}
    .detail{margin:8px 0;font-size:15px;}.qr{text-align:center;margin:20px 0;}
    .donor-main{color:#7c3aed;font-weight:bold;}.footer{text-align:center;color:#9ca3af;font-size:12px;margin-top:20px;}</style>
    </head><body>
    <div style="text-align:center;font-size:22px;margin-bottom:4px;">🙏 Jai Jinendra 🙏</div>
    <h1>VPJ Jain Sangh</h1>
    <p class="sub">cordially invites</p>
    <h2 style="text-align:center;color:#1e1b4b;">${name}</h2>
    <hr style="border-color:#ede9fe;margin:16px 0;">
    <h3 style="text-align:center;">${eventData?.event_name || ''}</h3>
    <div class="detail">📅 <b>Date:</b> ${dateStr}</div>
    <div class="detail">⏰ <b>Time:</b> ${eventData?.start_time || ''} ${eventData?.end_time ? '- ' + eventData.end_time : ''}</div>
    <div class="detail">📍 <b>Venue:</b> ${eventData?.venue_name || ''}</div>
    ${eventData?.venue_address ? `<div class="detail" style="color:#6b7280;font-size:13px;">${eventData.venue_address}</div>` : ''}
    ${mainDonor ? `<div class="detail donor-main">⭐ Main Donor: ${mainDonor.donor_name}</div>` : ''}
    ${subDonors.length > 0 ? `<div class="detail">✨ Sub Donors: ${subDonors.map(d => d.donor_name).join(', ')}</div>` : ''}
    <div class="qr">
      <p style="font-size:13px;color:#6b7280;">Your personal entry QR code</p>
      ${qrImg ? `<img src="${qrImg}" width="160" height="160" />` : ''}
      <p style="font-size:12px;color:#9ca3af;">${inv.qr_code}</p>
    </div>
    <div class="footer">Please show this QR code at the entrance gate · VPJ Jain Sangh</div>
    </body></html>`);
    win.document.close();
    win.print();
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Invitations &amp; QR Codes</div>
          <div className="page-sub">Generate and send personalised invitations</div>
        </div>
      </div>

      {msg && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body">
          <div className="form-grid">
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Select Event</label>
              <select className="form-control" value={selectedEvent} onChange={e => { setSelectedEvent(e.target.value); if (e.target.value) loadInvitations(e.target.value); }}>
                <option value="">-- Choose an event --</option>
                {events.map(ev => <option key={ev.id} value={ev.id}>{ev.event_name} ({new Date(ev.event_date).toLocaleDateString('en-IN')})</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
              <button className="btn btn-primary" onClick={generateQRCodes} disabled={generating || !selectedEvent}>
                {generating ? 'Generating...' : '⬡ Generate QR Codes for All Members'}
              </button>
              {invitations.length > 0 && (
                <button className="btn btn-success" onClick={sendAllWhatsApp}>
                  Send All via WhatsApp
                </button>
              )}
            </div>
          </div>
          {invitations.length > 0 && (
            <div className="alert alert-info" style={{ marginTop: 16, marginBottom: 0 }}>
              {invitations.length} invitations generated · Click "Send via WhatsApp" on each card, or "Send All via WhatsApp" to send to everyone
            </div>
          )}
        </div>
      </div>

      {loading ? <div className="loading">Loading invitations...</div> : (
        invitations.length === 0 && selectedEvent ? (
          <div className="empty-state">
            <div className="empty-state-icon">▣</div>
            <div className="empty-state-title">No QR codes yet for this event</div>
            <div className="empty-state-sub">Click "Generate QR Codes for All Members" above</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {invitations.map(inv => {
              const name = inv.members?.full_name || inv.families?.head_name || '';
              const relation = inv.members?.relation || 'Head of Family';
              const mobile = inv.members?.mobile || inv.families?.mobile || '';
              return (
                <div className="card" key={inv.id} style={{ textAlign: 'center', padding: 0 }}>
                  <div className="card-body">
                    <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>{name}</div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>{relation} · {mobile || 'No mobile'}</div>
                    {qrImages[inv.id] ? (
                      <img src={qrImages[inv.id]} alt="QR" style={{ width: 140, height: 140, borderRadius: 8, border: '1px solid #e5e7eb' }} />
                    ) : (
                      <div style={{ width: 140, height: 140, background: '#f3f4f6', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', color: '#9ca3af', fontSize: 12 }}>Generating...</div>
                    )}
                    <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 6, wordBreak: 'break-all' }}>{inv.qr_code}</div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                      <button className="btn btn-success btn-sm" onClick={() => sendWhatsApp(inv)} disabled={!mobile}>
                        WhatsApp
                      </button>
                      <button className="btn btn-outline btn-sm" onClick={() => printInvitation(inv)}>
                        Print/Save
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
