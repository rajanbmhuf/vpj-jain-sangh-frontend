import { useNavigate } from 'react-router-dom';
import React, { useEffect, useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_KEY
);

const BLOOD_GROUPS = ['A+','A-','B+','B-','AB+','AB-','O+','O-','Unknown'];
const RELATIONS    = ['Wife','Husband','Son','Daughter','Father','Mother',
                      'Brother','Sister','Grandfather','Grandmother','Other'];

const EMPTY_FAMILY = {
  first_name:'', middle_name:'', last_name:'',
  dob_display:'', date_of_birth:'', age:'',
  blood_group:'', aadhar_number:'',
  address:'', mobile:'', email:'', profession:'', education:''
};
const EMPTY_MEMBER = {
  first_name:'', middle_name:'', last_name:'', relation:'',
  dob_display:'', date_of_birth:'', age:'',
  blood_group:'', aadhar_number:'',
  mobile:'', email:'', education:'', profession:''
};

/* ─────────────────────────────────────────────
   Pure helper functions  (no hooks, safe to call anywhere)
───────────────────────────────────────────── */
function dobToDisplay(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function parseDOB(raw) {
  if (!raw) return { iso:'', age:'', valid:false };
  const digits = raw.replace(/\D/g,'');
  if (digits.length !== 8) return { iso:'', age:'', valid:false };
  const day=parseInt(digits.slice(0,2),10), mon=parseInt(digits.slice(2,4),10), year=parseInt(digits.slice(4,8),10);
  const now = new Date();
  if (mon<1||mon>12||day<1||day>31||year<1900||year>now.getFullYear())
    return { iso:'', age:'', valid:false };
  const dob = new Date(year, mon-1, day);
  if (isNaN(dob.getTime())) return { iso:'', age:'', valid:false };
  let age = now.getFullYear() - dob.getFullYear();
  if (now.getMonth()<dob.getMonth()||(now.getMonth()===dob.getMonth()&&now.getDate()<dob.getDate())) age--;
  const iso = `${year}-${String(mon).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  return { iso, age, valid:true };
}

function formatDOBInput(raw) {
  const d = raw.replace(/\D/g,'').slice(0,8);
  if (d.length<=2) return d;
  if (d.length<=4) return `${d.slice(0,2)}/${d.slice(2)}`;
  return `${d.slice(0,2)}/${d.slice(2,4)}/${d.slice(4)}`;
}

function onlyDigits(v, max) { return v.replace(/\D/g,'').slice(0, max); }

function fullName(r) {
  return [r.first_name, r.middle_name, r.last_name].filter(Boolean).join(' ');
}

/* ─────────────────────────────────────────────
   VpjBadge  —  defined OUTSIDE main component
───────────────────────────────────────────── */
function VpjBadge({ id }) {
  if (!id) return null;
  const parts = id.split('/');
  const isHead = parts[2] === '00';
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:0,
      fontFamily:'monospace', fontSize:12, fontWeight:700,
      borderRadius:6, overflow:'hidden', verticalAlign:'middle',
      border: isHead ? '1px solid #7c3aed' : '1px solid #0369a1',
    }}>
      <span style={{ background: isHead ? '#7c3aed' : '#0369a1', color:'#fff', padding:'2px 6px' }}>VPJ</span>
      <span style={{
        background: isHead ? '#ede9fe' : '#e0f2fe',
        color: isHead ? '#5b21b6' : '#0c4a6e',
        padding:'2px 6px'
      }}>{parts[1]}/{parts[2]}</span>
    </span>
  );
}

/* ─────────────────────────────────────────────
   InfoRow  —  one label+value row in detail panel
───────────────────────────────────────────── */
function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div style={{
      display:'flex', gap:8, padding:'7px 0',
      borderBottom:'0.5px solid #f3f4f6', fontSize:13,
    }}>
      <span style={{ width:130, flexShrink:0, color:'#6b7280', fontWeight:500 }}>{label}</span>
      <span style={{ color:'#111', wordBreak:'break-word', flex:1 }}>{value}</span>
    </div>
  );
}

/* ─────────────────────────────────────────────
   FamilyDetailPanel  —  popup that opens on name click
   Defined OUTSIDE main component so it never remounts
───────────────────────────────────────────── */
function FamilyDetailPanel({
  family, onClose,
  onAddMember, onEditFamily, onEditMember, onDeleteMember,
}) {
  if (!family) return null;

  const activeMembers = (family.members || [])
    .filter(m => m.is_active)
    .sort((a, b) => (a.member_seq||0) - (b.member_seq||0));

  return (
    <div
      style={{
        position:'fixed', inset:0,
        background:'rgba(0,0,0,0.6)',
        display:'flex', alignItems:'center', justifyContent:'center',
        zIndex:2000, padding:'16px',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background:'#fff', borderRadius:16,
          width:'100%', maxWidth:720,
          maxHeight:'92vh', display:'flex', flexDirection:'column',
          boxShadow:'0 24px 64px rgba(0,0,0,0.3)',
        }}
      >

        {/* ── sticky header ── */}
        <div style={{
          display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'20px 24px 16px',
          borderBottom:'1px solid #f3f4f6',
          borderRadius:'16px 16px 0 0',
          flexShrink:0,
          background:'#fff',
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            {/* big avatar */}
            <div style={{
              width:56, height:56, borderRadius:'50%',
              background:'linear-gradient(135deg,#7c3aed,#a855f7)',
              color:'#fff', display:'flex', alignItems:'center',
              justifyContent:'center', fontSize:22, fontWeight:800, flexShrink:0,
            }}>
              {(family.first_name||'').charAt(0)}{(family.last_name||'').charAt(0)}
            </div>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                <span style={{ fontSize:19, fontWeight:700, color:'#111' }}>{fullName(family)}</span>
                <VpjBadge id={family.vpj_id} />
              </div>
              <div style={{ fontSize:12, color:'#6b7280', marginTop:4 }}>
                Head of Family
                {activeMembers.length > 0
                  ? ` · ${activeMembers.length} registered member${activeMembers.length>1?'s':''}`
                  : ' · No members registered yet'}
              </div>
            </div>
          </div>
          {/* X button */}
          <button
            onClick={onClose}
            title="Close"
            style={{
              width:36, height:36, borderRadius:'50%',
              border:'1px solid #e5e7eb', background:'#f9fafb',
              fontSize:20, lineHeight:'1', cursor:'pointer', color:'#6b7280',
              display:'flex', alignItems:'center', justifyContent:'center',
              flexShrink:0, transition:'background 0.15s',
            }}
            onMouseEnter={e => e.target.style.background='#fee2e2'}
            onMouseLeave={e => e.target.style.background='#f9fafb'}
          >×</button>
        </div>

        {/* ── scrollable body ── */}
        <div style={{ overflowY:'auto', flex:1, padding:'0 24px 16px' }}>

          {/* Head section */}
          <div style={{ marginTop:20, marginBottom:24 }}>
            <div style={{
              display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10,
            }}>
              <span style={{
                display:'inline-block', fontSize:11, fontWeight:700,
                letterSpacing:'0.8px', background:'#ede9fe', color:'#7c3aed',
                padding:'4px 14px', borderRadius:20,
              }}>HEAD OF FAMILY DETAILS</span>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => { onClose(); onEditFamily(family); }}
              >Edit Details</button>
            </div>

            <div style={{
              background:'#fafafa', border:'0.5px solid #e5e7eb',
              borderRadius:10, padding:'4px 16px',
            }}>
              <InfoRow label="VPJ ID"        value={family.vpj_id} />
              <InfoRow label="Full Name"     value={fullName(family)} />
              <InfoRow label="Date of Birth" value={dobToDisplay(family.date_of_birth)} />
              <InfoRow label="Age"           value={family.age ? `${family.age} years` : ''} />
              <InfoRow label="Blood Group"   value={family.blood_group} />
              <InfoRow label="Mobile"        value={family.mobile} />
              <InfoRow label="Email"         value={family.email} />
              <InfoRow label="Aadhar No."    value={family.aadhar_number} />
              <InfoRow label="Address"       value={family.address} />
              <InfoRow label="Profession"    value={family.profession} />
              <InfoRow label="Education"     value={family.education} />
            </div>
          </div>

          {/* Members section */}
          <div style={{ marginBottom:16 }}>
            <div style={{
              display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12,
            }}>
              <span style={{
                display:'inline-block', fontSize:11, fontWeight:700,
                letterSpacing:'0.8px', background:'#e0f2fe', color:'#0369a1',
                padding:'4px 14px', borderRadius:20,
              }}>FAMILY MEMBERS ({activeMembers.length})</span>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => { onClose(); onAddMember(family); }}
              >+ Add Member</button>
            </div>

            {activeMembers.length === 0 ? (
              <div style={{
                textAlign:'center', padding:'32px 20px',
                background:'#f9fafb', borderRadius:10,
                color:'#9ca3af', fontSize:13,
                border:'0.5px dashed #d1d5db',
              }}>
                No family members added yet.
                Click "+ Add Member" above to add members to this family.
              </div>
            ) : (
              activeMembers.map((m, idx) => (
                <div
                  key={m.id}
                  style={{
                    marginBottom:10,
                    border:'0.5px solid #e5e7eb',
                    borderRadius:10, overflow:'hidden',
                    background: idx % 2 === 0 ? '#f9fafb' : '#f0fdf4',
                  }}
                >
                  {/* member title bar */}
                  <div style={{
                    display:'flex', alignItems:'center', justifyContent:'space-between',
                    padding:'10px 14px',
                    background: idx % 2 === 0 ? '#f3f4f6' : '#dcfce7',
                    borderBottom:'0.5px solid #e5e7eb',
                  }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{
                        width:36, height:36, borderRadius:'50%',
                        background:'#0369a1', color:'#fff',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:13, fontWeight:700, flexShrink:0,
                      }}>
                        {(m.first_name||'').charAt(0)}{(m.last_name||'').charAt(0)}
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                        <span style={{ fontWeight:700, fontSize:14, color:'#111' }}>{fullName(m)}</span>
                        <VpjBadge id={m.vpj_id} />
                        <span style={{
                          background:'#dbeafe', color:'#1e40af',
                          fontSize:11, fontWeight:600,
                          padding:'2px 8px', borderRadius:12,
                        }}>{m.relation}</span>
                        {m.blood_group && (
                          <span style={{
                            background:'#ffedd5', color:'#9a3412',
                            fontSize:11, fontWeight:600,
                            padding:'2px 8px', borderRadius:12,
                          }}>{m.blood_group}</span>
                        )}
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => { onClose(); onEditMember(family, m); }}
                      >Edit</button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => onDeleteMember(m.id)}
                      >Remove</button>
                    </div>
                  </div>

                  {/* member detail grid */}
                  <div style={{
                    display:'grid',
                    gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))',
                    padding:'4px 16px 10px',
                    gap:'0 16px',
                  }}>
                    <InfoRow label="Date of Birth" value={dobToDisplay(m.date_of_birth)} />
                    <InfoRow label="Age"           value={m.age ? `${m.age} years` : ''} />
                    <InfoRow label="Blood Group"   value={m.blood_group} />
                    <InfoRow label="Mobile"        value={m.mobile} />
                    <InfoRow label="Email"         value={m.email} />
                    <InfoRow label="Aadhar No."    value={m.aadhar_number} />
                    <InfoRow label="Profession"    value={m.profession} />
                    <InfoRow label="Education"     value={m.education} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── sticky footer ── */}
        <div style={{
          padding:'14px 24px', textAlign:'center',
          borderTop:'1px solid #f3f4f6',
          borderRadius:'0 0 16px 16px',
          background:'#fff', flexShrink:0,
        }}>
          <button
            onClick={onClose}
            style={{
              padding:'10px 52px', borderRadius:8,
              background:'#7c3aed', color:'#fff',
              border:'none', cursor:'pointer',
              fontSize:14, fontWeight:600, letterSpacing:'0.3px',
            }}
          >Close</button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Field  —  defined OUTSIDE main component
   (this prevents focus-loss bug on every keystroke)
───────────────────────────────────────────── */
function Field({ label, error, required, children }) {
  return (
    <div className="form-group" style={{ marginBottom:14 }}>
      <label className="form-label">
        {label}{required && <span style={{ color:'#dc2626' }}> *</span>}
      </label>
      {children}
      {error && <div style={{ fontSize:11, color:'#dc2626', marginTop:4 }}>{error}</div>}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main Families component
───────────────────────────────────────────── */
export default function Families() {
  const navigate = useNavigate();
  const [families,         setFamilies]         = useState([]);
  const [search,           setSearch]           = useState('');
  const [loading,          setLoading]          = useState(true);
  const [saving,           setSaving]           = useState(false);
  const [msg,              setMsg]              = useState(null);

  /* which family's detail panel is open */
  const [viewFamily,       setViewFamily]       = useState(null);

  const [showFamilyModal,  setShowFamilyModal]  = useState(false);
  const [showMemberModal,  setShowMemberModal]  = useState(false);
  const [editFamilyId,     setEditFamilyId]     = useState(null);
  const [editMemberId,     setEditMemberId]     = useState(null);
  const [selectedFamilyId, setSelectedFamilyId] = useState(null);

  const [fForm, setFForm] = useState(EMPTY_FAMILY);
  const [mForm, setMForm] = useState(EMPTY_MEMBER);
  const [fErr,  setFErr]  = useState({});
  const [mErr,  setMErr]  = useState({});

  /* ── load ── */
  const loadFamilies = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('families')
      .select('*, members(*)')
      .eq('is_active', true)
      .order('family_number');
    setFamilies(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadFamilies(); }, [loadFamilies]);

  /* keep viewFamily in sync after reload */
  useEffect(() => {
    if (viewFamily) {
      const updated = families.find(f => f.id === viewFamily.id);
      if (updated) setViewFamily(updated);
    }
  }, [families]); // eslint-disable-line

  function flash(type, text) { setMsg({ type, text }); setTimeout(() => setMsg(null), 4000); }

  const filtered = families.filter(f => {
    const name = fullName(f).toLowerCase();
    const s    = search.toLowerCase();
    return name.includes(s) || (f.mobile||'').includes(search) || (f.vpj_id||'').toLowerCase().includes(s);
  });

  const selectedFamily = families.find(f => f.id === selectedFamilyId) || null;

  /* ── field setters ── */
  function setF(k, v) { setFForm(p => ({...p, [k]:v})); }
  function setM(k, v) { setMForm(p => ({...p, [k]:v})); }

  function handleFDOB(raw) {
    const fmt = formatDOBInput(raw);
    const { iso, age, valid } = parseDOB(fmt);
    setFForm(p => ({...p, dob_display:fmt, date_of_birth:valid?iso:'', age:valid?age:''}));
    setFErr(e => ({...e, dob: fmt.length===10&&!valid ? 'Invalid date — use DD/MM/YYYY' : ''}));
  }
  function handleMDOB(raw) {
    const fmt = formatDOBInput(raw);
    const { iso, age, valid } = parseDOB(fmt);
    setMForm(p => ({...p, dob_display:fmt, date_of_birth:valid?iso:'', age:valid?age:''}));
    setMErr(e => ({...e, dob: fmt.length===10&&!valid ? 'Invalid date — use DD/MM/YYYY' : ''}));
  }
  function handleFMobile(v) { setFForm(p=>({...p, mobile:onlyDigits(v,10)})); setFErr(e=>({...e,mobile:''})); }
  function handleMMobile(v) { setMForm(p=>({...p, mobile:onlyDigits(v,10)})); setMErr(e=>({...e,mobile:''})); }
  function handleFAadhar(v) { setFForm(p=>({...p, aadhar_number:onlyDigits(v,12)})); }
  function handleMAadhar(v) { setMForm(p=>({...p, aadhar_number:onlyDigits(v,12)})); }

  /* ── validate ── */
  async function validateFForm() {
    const e = {};
    if (!fForm.first_name.trim()) e.first_name = 'First name is required';
    if (!fForm.last_name.trim())  e.last_name  = 'Last name is required';
    if (!fForm.mobile)             e.mobile     = 'Mobile is required';
    else if (fForm.mobile.length!==10) e.mobile = 'Must be exactly 10 digits';
    if (fForm.aadhar_number && fForm.aadhar_number.length!==12) e.aadhar = 'Must be exactly 12 digits';
    if (fForm.dob_display.length===10 && !fForm.date_of_birth)  e.dob    = 'Invalid date of birth';
    if (fForm.mobile.length===10) {
      const {data:fd} = await supabase.from('families').select('id').eq('mobile',fForm.mobile).eq('is_active',true);
      const {data:md} = await supabase.from('members').select('id').eq('mobile',fForm.mobile).eq('is_active',true);
      if ((fd||[]).filter(r=>r.id!==editFamilyId).length>0 || (md||[]).length>0)
        e.mobile = 'This mobile number is already registered';
    }
    setFErr(e); return Object.keys(e).length === 0;
  }

  async function validateMForm() {
    const e = {};
    if (!mForm.first_name.trim()) e.first_name = 'First name is required';
    if (!mForm.last_name.trim())  e.last_name  = 'Last name is required';
    if (!mForm.relation)           e.relation   = 'Relation is required';
    if (mForm.mobile && mForm.mobile.length>0 && mForm.mobile.length!==10) e.mobile = 'Must be exactly 10 digits';
    if (mForm.aadhar_number && mForm.aadhar_number.length!==12) e.aadhar = 'Must be exactly 12 digits';
    if (mForm.dob_display.length===10 && !mForm.date_of_birth)  e.dob    = 'Invalid date of birth';
    if (mForm.mobile && mForm.mobile.length===10) {
      const {data:fd} = await supabase.from('families').select('id').eq('mobile',mForm.mobile).eq('is_active',true);
      const {data:md} = await supabase.from('members').select('id').eq('mobile',mForm.mobile).eq('is_active',true);
      if ((fd||[]).length>0 || (md||[]).filter(r=>r.id!==editMemberId).length>0)
        e.mobile = 'This mobile number is already registered';
    }
    setMErr(e); return Object.keys(e).length === 0;
  }

  /* ── save family ── */
  async function saveFamily() {
    if (saving) return;
    if (!(await validateFForm())) return;
    setSaving(true);
    const payload = {
      first_name:fForm.first_name.trim(), middle_name:fForm.middle_name.trim(), last_name:fForm.last_name.trim(),
      date_of_birth:fForm.date_of_birth||null, age:fForm.age!==''?parseInt(fForm.age):null,
      blood_group:fForm.blood_group||null, aadhar_number:fForm.aadhar_number||null,
      address:fForm.address.trim(), mobile:fForm.mobile, email:fForm.email.trim(),
      profession:fForm.profession.trim(), education:fForm.education.trim(),
    };
    const {error} = editFamilyId
      ? await supabase.from('families').update(payload).eq('id',editFamilyId)
      : await supabase.from('families').insert(payload);
    setSaving(false);
    if (error) { flash('error', error.message); return; }
    flash('success', editFamilyId ? 'Family updated!' : 'Family added! VPJ ID assigned automatically.');
    setShowFamilyModal(false);
    loadFamilies();
  }

  /* ── save member ── */
  async function saveMember() {
    if (saving) return;
    if (!(await validateMForm())) return;
    setSaving(true);
    const payload = {
      family_id:selectedFamilyId,
      first_name:mForm.first_name.trim(), middle_name:mForm.middle_name.trim(), last_name:mForm.last_name.trim(),
      relation:mForm.relation, date_of_birth:mForm.date_of_birth||null,
      age:mForm.age!==''?parseInt(mForm.age):null,
      blood_group:mForm.blood_group||null, aadhar_number:mForm.aadhar_number||null,
      mobile:mForm.mobile||null, email:mForm.email.trim(),
      education:mForm.education.trim(), profession:mForm.profession.trim(),
    };
    const {error} = editMemberId
      ? await supabase.from('members').update(payload).eq('id',editMemberId)
      : await supabase.from('members').insert(payload);
    setSaving(false);
    if (error) { flash('error', error.message); return; }
    flash('success', editMemberId ? 'Member updated!' : 'Member added! VPJ ID assigned automatically.');
    setShowMemberModal(false);
    loadFamilies();
  }

  /* ── open modals ── */
  function openAddFamily() {
    setEditFamilyId(null); setFForm(EMPTY_FAMILY); setFErr({}); setShowFamilyModal(true);
  }
  function openEditFamily(f) {
    setEditFamilyId(f.id);
    setFForm({
      first_name:f.first_name||'', middle_name:f.middle_name||'', last_name:f.last_name||'',
      dob_display:dobToDisplay(f.date_of_birth), date_of_birth:f.date_of_birth||'', age:f.age||'',
      blood_group:f.blood_group||'', aadhar_number:f.aadhar_number||'',
      address:f.address||'', mobile:f.mobile||'', email:f.email||'',
      profession:f.profession||'', education:f.education||'',
    });
    setFErr({}); setShowFamilyModal(true);
  }
  function openAddMember(family) {
    setSelectedFamilyId(family.id); setEditMemberId(null);
    setMForm({...EMPTY_MEMBER, last_name:family.last_name||''});
    setMErr({}); setShowMemberModal(true);
  }
  function openEditMember(family, member) {
    setSelectedFamilyId(family.id); setEditMemberId(member.id);
    setMForm({
      first_name:member.first_name||'', middle_name:member.middle_name||'', last_name:member.last_name||'',
      relation:member.relation||'', dob_display:dobToDisplay(member.date_of_birth),
      date_of_birth:member.date_of_birth||'', age:member.age||'',
      blood_group:member.blood_group||'', aadhar_number:member.aadhar_number||'',
      mobile:member.mobile||'', email:member.email||'',
      education:member.education||'', profession:member.profession||'',
    });
    setMErr({}); setShowMemberModal(true);
  }

  async function deleteFamily(id) {
    if (!window.confirm('Remove this family and all their members?')) return;
    await supabase.from('families').update({is_active:false}).eq('id',id);
    if (viewFamily?.id === id) setViewFamily(null);
    loadFamilies();
  }
  async function deleteMember(id) {
    if (!window.confirm('Remove this member?')) return;
    await supabase.from('members').update({is_active:false}).eq('id',id);
    loadFamilies();
  }

  /* ─────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────── */
  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Members &amp; Families</div>
          <div className="page-sub">{families.length} families · Click a name to view full details</div>
        </div>
        <button className="btn btn-primary" onClick={openAddFamily}>+ Add Family</button>
      </div>

      {msg && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}

      <div className="search-bar">
        <input className="search-input"
          placeholder="Search by name, mobile or VPJ ID (e.g. VPJ/0001)..."
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="loading">Loading families...</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">👨‍👩‍👧‍👦</div>
          <div className="empty-state-title">No families found</div>
          <div className="empty-state-sub">Click "Add Family" to register your first family</div>
        </div>
      ) : filtered.map(family => (
        <div className="card" key={family.id} style={{ marginBottom:14 }}>
          <div className="card-header">
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              {/* Avatar */}
              <div style={{
                width:46, height:46, borderRadius:'50%',
                background:'#ede9fe', color:'#7c3aed',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontWeight:700, fontSize:16, flexShrink:0,
              }}>
                {(family.first_name||'').charAt(0)}{(family.last_name||'').charAt(0)}
              </div>

              <div>
                {/* ── Clickable name row ── */}
                <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                  <span
                    onClick={() => navigate('/families/' + family.id)}
                    style={{
                      fontWeight:700, fontSize:16, color:'#7c3aed',
                      cursor:'pointer', textDecoration:'underline',
                      textDecorationColor:'#c4b5fd',
                      textUnderlineOffset:'3px',
                    }}
                    title="Click to view full family details"
                  >
                    {fullName(family)}
                  </span>
                  <VpjBadge id={family.vpj_id} />
                  <span className="badge badge-purple">Head of Family</span>
                  {family.blood_group && <span className="badge badge-orange">{family.blood_group}</span>}
                  {/* member count pill */}
                  {family.members?.filter(m=>m.is_active).length > 0 && (
                    <span style={{
                      background:'#e0f2fe', color:'#0369a1',
                      fontSize:11, fontWeight:600,
                      padding:'2px 8px', borderRadius:12,
                    }}>
                      {family.members.filter(m=>m.is_active).length} member{family.members.filter(m=>m.is_active).length>1?'s':''}
                    </span>
                  )}
                </div>
                {/* info row */}
                <div style={{ fontSize:12, color:'#6b7280', marginTop:3 }}>
                  {family.mobile}
                  {family.age        ? ` · Age ${family.age}`        : ''}
                  {family.email      ? ` · ${family.email}`           : ''}
                  {family.profession ? ` · ${family.profession}`      : ''}
                </div>
                {family.address && <div style={{ fontSize:12, color:'#9ca3af' }}>{family.address}</div>}
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', justifyContent:'flex-end' }}>
              <button className="btn btn-outline btn-sm"
                onClick={() => navigate('/families/' + family.id)}>View Details</button>
              <button className="btn btn-outline btn-sm"
                onClick={() => openAddMember(family)}>+ Add Member</button>
              <button className="btn btn-outline btn-sm"
                onClick={() => openEditFamily(family)}>Edit</button>
              <button className="btn btn-danger  btn-sm"
                onClick={() => deleteFamily(family.id)}>Remove</button>
            </div>
          </div>
        </div>
      ))}

      {/* ════════════ FAMILY DETAIL PANEL ════════════ */}
      {viewFamily && (
        <FamilyDetailPanel
          family={viewFamily}
          onClose={() => setViewFamily(null)}
          onAddMember={fam  => { setViewFamily(null); openAddMember(fam); }}
          onEditFamily={fam => { setViewFamily(null); openEditFamily(fam); }}
          onEditMember={(fam,mem) => { setViewFamily(null); openEditMember(fam,mem); }}
          onDeleteMember={async id => {
            if (!window.confirm('Remove this member?')) return;
            await supabase.from('members').update({is_active:false}).eq('id',id);
            loadFamilies();
          }}
        />
      )}

      {/* ════════════ FAMILY FORM MODAL ════════════ */}
      {showFamilyModal && (
        <div className="modal-overlay" onClick={() => setShowFamilyModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth:640 }}>
            <div className="modal-title">
              {editFamilyId
                ? <span>Edit Family &nbsp;<VpjBadge id={families.find(f=>f.id===editFamilyId)?.vpj_id} /></span>
                : 'Add New Family — VPJ ID assigned automatically'}
            </div>

            {!editFamilyId && (
              <div className="alert alert-info" style={{ marginBottom:16, fontSize:12 }}>
                A unique VPJ ID (e.g. <strong>VPJ/0001/00</strong>) will be automatically assigned when you save.
              </div>
            )}

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
              <Field label="First Name" required error={fErr.first_name}>
                <input className="form-control" value={fForm.first_name}
                  onChange={e=>setF('first_name',e.target.value)} placeholder="First name" />
              </Field>
              <Field label="Middle Name">
                <input className="form-control" value={fForm.middle_name}
                  onChange={e=>setF('middle_name',e.target.value)} placeholder="Middle name" />
              </Field>
              <Field label="Last Name" required error={fErr.last_name}>
                <input className="form-control" value={fForm.last_name}
                  onChange={e=>setF('last_name',e.target.value)} placeholder="Last name" />
              </Field>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 110px', gap:12 }}>
              <Field label="Date of Birth (DD/MM/YYYY)" error={fErr.dob}>
                <input className="form-control" value={fForm.dob_display}
                  onChange={e=>handleFDOB(e.target.value)} placeholder="DD/MM/YYYY" maxLength={10} />
              </Field>
              <Field label="Age (auto)">
                <input className="form-control" value={fForm.age} readOnly
                  style={{ background:'#f9fafb', color:'#6b7280', cursor:'not-allowed' }} placeholder="—" />
              </Field>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <Field label="Blood Group">
                <select className="form-control" value={fForm.blood_group} onChange={e=>setF('blood_group',e.target.value)}>
                  <option value="">Select blood group</option>
                  {BLOOD_GROUPS.map(b=><option key={b} value={b}>{b}</option>)}
                </select>
              </Field>
              <Field label="Aadhar Number (12 digits)" error={fErr.aadhar}>
                <input className="form-control" value={fForm.aadhar_number}
                  onChange={e=>handleFAadhar(e.target.value)} placeholder="12-digit number"
                  maxLength={12} inputMode="numeric" />
              </Field>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <Field label="Mobile Number (10 digits)" required error={fErr.mobile}>
                <input className="form-control" value={fForm.mobile}
                  onChange={e=>handleFMobile(e.target.value)} placeholder="10-digit mobile"
                  maxLength={10} inputMode="numeric" />
              </Field>
              <Field label="Email ID">
                <input className="form-control" value={fForm.email}
                  onChange={e=>setF('email',e.target.value)} placeholder="email@example.com" type="email" />
              </Field>
            </div>

            <Field label="Address">
              <textarea className="form-control" rows={2} value={fForm.address}
                onChange={e=>setF('address',e.target.value)} placeholder="Full address" />
            </Field>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <Field label="Profession">
                <input className="form-control" value={fForm.profession}
                  onChange={e=>setF('profession',e.target.value)} placeholder="Business / Service / etc." />
              </Field>
              <Field label="Education Qualification">
                <input className="form-control" value={fForm.education}
                  onChange={e=>setF('education',e.target.value)} placeholder="Graduate / B.Com / etc." />
              </Field>
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowFamilyModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveFamily} disabled={saving}>
                {saving ? 'Saving...' : editFamilyId ? 'Update Family' : 'Add Family'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════ MEMBER FORM MODAL ════════════ */}
      {showMemberModal && (
        <div className="modal-overlay" onClick={() => setShowMemberModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth:640 }}>
            <div className="modal-title">
              {editMemberId
                ? <span>Edit Member &nbsp;<VpjBadge id={families.flatMap(f=>f.members||[]).find(m=>m.id===editMemberId)?.vpj_id} /></span>
                : <span>Add Member — {selectedFamily ? <><strong>{fullName(selectedFamily)}</strong>'s Family</> : ''}</span>
              }
            </div>

            {!editMemberId && (
              <div className="alert alert-info" style={{ marginBottom:16, fontSize:12 }}>
                Member VPJ ID (e.g. <strong>VPJ/{String(selectedFamily?.family_number||0).padStart(4,'0')}/01</strong>) will be assigned automatically.
              </div>
            )}

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
              <Field label="First Name" required error={mErr.first_name}>
                <input className="form-control" value={mForm.first_name}
                  onChange={e=>setM('first_name',e.target.value)} placeholder="First name" />
              </Field>
              <Field label="Middle Name">
                <input className="form-control" value={mForm.middle_name}
                  onChange={e=>setM('middle_name',e.target.value)} placeholder="Middle name" />
              </Field>
              <Field label="Last Name" required error={mErr.last_name}>
                <input className="form-control" value={mForm.last_name}
                  onChange={e=>setM('last_name',e.target.value)} placeholder="Last name" />
              </Field>
            </div>

            <Field label="Relation with Head of Family" required error={mErr.relation}>
              <select className="form-control" value={mForm.relation} onChange={e=>setM('relation',e.target.value)}>
                <option value="">Select relation</option>
                {RELATIONS.map(r=><option key={r} value={r}>{r}</option>)}
              </select>
            </Field>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 110px', gap:12 }}>
              <Field label="Date of Birth (DD/MM/YYYY)" error={mErr.dob}>
                <input className="form-control" value={mForm.dob_display}
                  onChange={e=>handleMDOB(e.target.value)} placeholder="DD/MM/YYYY" maxLength={10} />
              </Field>
              <Field label="Age (auto)">
                <input className="form-control" value={mForm.age} readOnly
                  style={{ background:'#f9fafb', color:'#6b7280', cursor:'not-allowed' }} placeholder="—" />
              </Field>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <Field label="Blood Group">
                <select className="form-control" value={mForm.blood_group} onChange={e=>setM('blood_group',e.target.value)}>
                  <option value="">Select blood group</option>
                  {BLOOD_GROUPS.map(b=><option key={b} value={b}>{b}</option>)}
                </select>
              </Field>
              <Field label="Aadhar Number (12 digits)" error={mErr.aadhar}>
                <input className="form-control" value={mForm.aadhar_number}
                  onChange={e=>handleMAadhar(e.target.value)} placeholder="12-digit number"
                  maxLength={12} inputMode="numeric" />
              </Field>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <Field label="Mobile Number (10 digits)" error={mErr.mobile}>
                <input className="form-control" value={mForm.mobile}
                  onChange={e=>handleMMobile(e.target.value)} placeholder="10-digit mobile"
                  maxLength={10} inputMode="numeric" />
              </Field>
              <Field label="Email ID">
                <input className="form-control" value={mForm.email}
                  onChange={e=>setM('email',e.target.value)} placeholder="email@example.com" type="email" />
              </Field>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <Field label="Profession">
                <input className="form-control" value={mForm.profession}
                  onChange={e=>setM('profession',e.target.value)} placeholder="Profession" />
              </Field>
              <Field label="Education Qualification">
                <input className="form-control" value={mForm.education}
                  onChange={e=>setM('education',e.target.value)} placeholder="Degree / School / etc." />
              </Field>
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowMemberModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveMember} disabled={saving}>
                {saving ? 'Saving...' : editMemberId ? 'Update Member' : 'Add Member'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
