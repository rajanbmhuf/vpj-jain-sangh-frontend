import React, { useEffect, useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_KEY
);

function Field({ label, error, required, children }) {
  return (
    <div style={{ marginBottom:14 }}>
      <label style={{ display:'block',fontSize:13,fontWeight:500,color:'#374151',marginBottom:6 }}>
        {label}{required&&<span style={{color:'#dc2626'}}> *</span>}
      </label>
      {children}
      {error&&<div style={{fontSize:11,color:'#dc2626',marginTop:4}}>{error}</div>}
    </div>
  );
}

const EMPTY_VOL = { name:'', mobile:'', pin:'' };

export default function AdminUsers() {
  const [tab,          setTab]          = useState('pending');
  const [pendingFams,  setPendingFams]  = useState([]);
  const [volunteers,   setVolunteers]   = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [msg,          setMsg]          = useState(null);
  const [showVolModal, setShowVolModal] = useState(false);
  const [editVolId,    setEditVolId]    = useState(null);
  const [volForm,      setVolForm]      = useState(EMPTY_VOL);
  const [volErr,       setVolErr]       = useState({});
  const [saving,       setSaving]       = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data:pf }, { data:vols }] = await Promise.all([
      supabase.from('families').select('id,first_name,middle_name,last_name,vpj_id,login_email,mobile,is_verified').not('login_email','is',null).eq('is_active',true),
      supabase.from('volunteers').select('*').eq('is_active',true).order('name'),
    ]);
    setPendingFams((pf||[]).filter(f=>!f.is_verified));
    setVolunteers(vols||[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function flash(type,text) { setMsg({type,text}); setTimeout(()=>setMsg(null),4000); }

  async function approveFamily(id) {
    await supabase.from('families').update({ is_verified:true }).eq('id',id);
    flash('success','Family account approved! They can now login.');
    load();
  }

  async function rejectFamily(id) {
    if (!window.confirm('Reject and remove this signup? The family will need to sign up again.')) return;
    await supabase.from('families').update({ login_email:null, password_hash:null, is_verified:false }).eq('id',id);
    flash('success','Signup rejected.');
    load();
  }

  function setV(k,v) { setVolForm(p=>({...p,[k]:v})); setVolErr(e=>({...e,[k]:''})); }

  function validateVol() {
    const e={};
    if (!volForm.name.trim()) e.name='Name is required';
    if (!volForm.mobile||volForm.mobile.length!==10) e.mobile='10-digit mobile required';
    if (!volForm.pin||volForm.pin.length<4) e.pin='PIN must be at least 4 digits';
    setVolErr(e); return Object.keys(e).length===0;
  }

  async function saveVolunteer() {
    if (saving||!validateVol()) return;
    setSaving(true);
    const payload = { name:volForm.name.trim(), mobile:volForm.mobile, pin:volForm.pin };
    const {error} = editVolId
      ? await supabase.from('volunteers').update(payload).eq('id',editVolId)
      : await supabase.from('volunteers').insert(payload);
    setSaving(false);
    if (error) { flash('error',error.message); return; }
    flash('success',editVolId?'Volunteer updated!':'Volunteer added!');
    setShowVolModal(false);
    setEditVolId(null);
    setVolForm(EMPTY_VOL);
    load();
  }

  async function removeVolunteer(id) {
    if (!window.confirm('Remove this volunteer?')) return;
    await supabase.from('volunteers').update({ is_active:false }).eq('id',id);
    flash('success','Volunteer removed.');
    load();
  }

  const tabStyle = (t) => ({
    padding:'8px 20px', border:'none', cursor:'pointer', fontWeight:600, fontSize:13,
    borderBottom: tab===t ? '3px solid #7c3aed' : '3px solid transparent',
    background: tab===t ? '#fff' : '#f9fafb',
    color: tab===t ? '#7c3aed' : '#9ca3af',
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">User Management</div>
          <div className="page-sub">Approve family signups and manage volunteers</div>
        </div>
        {tab==='volunteers' && (
          <button className="btn btn-primary" onClick={()=>{setEditVolId(null);setVolForm(EMPTY_VOL);setVolErr({});setShowVolModal(true);}}>
            + Add Volunteer
          </button>
        )}
      </div>

      {msg && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}

      {/* Tabs */}
      <div style={{ display:'flex', borderBottom:'1px solid #e5e7eb', marginBottom:20, background:'#fff', borderRadius:'8px 8px 0 0', overflow:'hidden' }}>
        <button style={tabStyle('pending')} onClick={()=>setTab('pending')}>
          Pending Approvals
          {pendingFams.length>0&&<span style={{ marginLeft:8,background:'#dc2626',color:'#fff',borderRadius:20,padding:'1px 8px',fontSize:11 }}>{pendingFams.length}</span>}
        </button>
        <button style={tabStyle('volunteers')} onClick={()=>setTab('volunteers')}>Volunteers ({volunteers.length})</button>
      </div>

      {loading ? <div className="loading">Loading...</div> : (

        tab==='pending' ? (
          pendingFams.length===0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">✓</div>
              <div className="empty-state-title">No pending approvals</div>
              <div className="empty-state-sub">All family signup requests have been reviewed</div>
            </div>
          ) : (
            <div>
              <div className="alert alert-info" style={{marginBottom:16}}>
                {pendingFams.length} family head{pendingFams.length!==1?'s':''} waiting for approval to login
              </div>
              {pendingFams.map(f=>(
                <div key={f.id} className="card" style={{marginBottom:12}}>
                  <div className="card-header">
                    <div style={{display:'flex',alignItems:'center',gap:12}}>
                      <div style={{width:44,height:44,borderRadius:'50%',background:'#ede9fe',color:'#7c3aed',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:16}}>
                        {(f.first_name||'').charAt(0)}{(f.last_name||'').charAt(0)}
                      </div>
                      <div>
                        <div style={{fontWeight:600,fontSize:15}}>{[f.first_name,f.middle_name,f.last_name].filter(Boolean).join(' ')}</div>
                        <div style={{fontSize:12,color:'#6b7280'}}>
                          {f.vpj_id} · {f.mobile} · {f.login_email}
                        </div>
                        <div style={{fontSize:11,background:'#fef9c3',color:'#713f12',display:'inline-block',padding:'2px 8px',borderRadius:6,marginTop:4}}>
                          Awaiting approval
                        </div>
                      </div>
                    </div>
                    <div style={{display:'flex',gap:8}}>
                      <button className="btn btn-success btn-sm" onClick={()=>approveFamily(f.id)}>Approve</button>
                      <button className="btn btn-danger  btn-sm" onClick={()=>rejectFamily(f.id)}>Reject</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          volunteers.length===0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">👤</div>
              <div className="empty-state-title">No volunteers yet</div>
              <div className="empty-state-sub">Add volunteers who will scan QR codes at events</div>
            </div>
          ) : (
            <div className="card">
              <table className="data-table">
                <thead>
                  <tr><th>Name</th><th>Mobile</th><th>PIN</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {volunteers.map(v=>(
                    <tr key={v.id}>
                      <td><strong>{v.name}</strong></td>
                      <td>{v.mobile}</td>
                      <td><span style={{fontFamily:'monospace',background:'#f3f4f6',padding:'2px 8px',borderRadius:4}}>{'•'.repeat(v.pin.length)}</span></td>
                      <td>
                        <div style={{display:'flex',gap:6}}>
                          <button className="btn btn-outline btn-sm" onClick={()=>{setEditVolId(v.id);setVolForm({name:v.name,mobile:v.mobile,pin:v.pin});setVolErr({});setShowVolModal(true);}}>Edit</button>
                          <button className="btn btn-danger  btn-sm" onClick={()=>removeVolunteer(v.id)}>Remove</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )
      )}

      {/* Volunteer Modal */}
      {showVolModal && (
        <div className="modal-overlay" onClick={()=>setShowVolModal(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:400}}>
            <div className="modal-title">{editVolId?'Edit Volunteer':'Add Volunteer'}</div>
            <Field label="Full Name" required error={volErr.name}>
              <input className="form-control" value={volForm.name} onChange={e=>setV('name',e.target.value)} placeholder="Volunteer name" />
            </Field>
            <Field label="Mobile Number" required error={volErr.mobile}>
              <input className="form-control" value={volForm.mobile} onChange={e=>setV('mobile',e.target.value.replace(/\D/g,'').slice(0,10))} placeholder="10-digit mobile" maxLength={10} inputMode="numeric" />
            </Field>
            <Field label="PIN (4–6 digits)" required error={volErr.pin}>
              <input className="form-control" value={volForm.pin} onChange={e=>setV('pin',e.target.value.replace(/\D/g,'').slice(0,6))} placeholder="4–6 digit PIN" maxLength={6} inputMode="numeric" type="password" />
            </Field>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setShowVolModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveVolunteer} disabled={saving}>{saving?'Saving...':editVolId?'Update':'Add Volunteer'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
