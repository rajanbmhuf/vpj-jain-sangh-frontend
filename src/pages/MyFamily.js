import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_KEY
);

const BLOOD_GROUPS = ['A+','A-','B+','B-','AB+','AB-','O+','O-','Unknown'];
const RELATIONS    = ['Wife','Husband','Son','Daughter','Father','Mother','Brother','Sister','Grandfather','Grandmother','Other'];

// ── Helpers ───────────────────────────────────────────────────
function fullName(r) { return [r.first_name,r.middle_name,r.last_name].filter(Boolean).join(' '); }
function formatDate(iso) { if (!iso) return '—'; const [y,m,d]=iso.split('-'); return `${d}/${m}/${y}`; }
function formatDOBInput(raw) {
  const d=raw.replace(/\D/g,'').slice(0,8);
  if (d.length<=2) return d;
  if (d.length<=4) return d.slice(0,2)+'/'+d.slice(2);
  return d.slice(0,2)+'/'+d.slice(2,4)+'/'+d.slice(4);
}
function parseDOB(raw) {
  const digits=raw.replace(/\D/g,'');
  if (digits.length!==8) return {iso:'',age:'',valid:false};
  const day=parseInt(digits.slice(0,2),10),mon=parseInt(digits.slice(2,4),10),year=parseInt(digits.slice(4,8),10);
  const now=new Date();
  if (mon<1||mon>12||day<1||day>31||year<1900||year>now.getFullYear()) return {iso:'',age:'',valid:false};
  const dob=new Date(year,mon-1,day);
  if (isNaN(dob.getTime())) return {iso:'',age:'',valid:false};
  let age=now.getFullYear()-dob.getFullYear();
  if (now.getMonth()<dob.getMonth()||(now.getMonth()===dob.getMonth()&&now.getDate()<dob.getDate())) age--;
  return {iso:`${year}-${String(mon).padStart(2,'0')}-${String(day).padStart(2,'0')}`,age,valid:true};
}
function dobToDisplay(iso) { if (!iso) return ''; const [y,m,d]=iso.split('-'); return `${d}/${m}/${y}`; }
function onlyDigits(v,n) { return v.replace(/\D/g,'').slice(0,n); }

// ── Components defined OUTSIDE main ──────────────────────────
function VpjBadge({ id }) {
  if (!id) return null;
  const parts=id.split('/'); const isHead=parts[2]==='00';
  return (
    <span style={{ display:'inline-flex',alignItems:'center',fontFamily:'monospace',fontSize:12,fontWeight:700,borderRadius:6,overflow:'hidden',border:isHead?'1px solid #7c3aed':'1px solid #0369a1' }}>
      <span style={{ background:isHead?'#7c3aed':'#0369a1',color:'#fff',padding:'2px 6px' }}>VPJ</span>
      <span style={{ background:isHead?'#ede9fe':'#e0f2fe',color:isHead?'#5b21b6':'#0c4a6e',padding:'2px 6px' }}>{parts[1]}/{parts[2]}</span>
    </span>
  );
}

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

const EMPTY_MEMBER = {
  first_name:'',middle_name:'',last_name:'',relation:'',
  dob_display:'',date_of_birth:'',age:'',
  blood_group:'',aadhar_number:'',mobile:'',email:'',
  education:'',profession:''
};

// ── Main component ────────────────────────────────────────────
export default function MyFamily() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [family,  setFamily]  = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [msg,     setMsg]     = useState(null);

  const [showModal,   setShowModal]   = useState(false);
  const [editMemberId,setEditMemberId]= useState(null);
  const [mForm,  setMForm]  = useState(EMPTY_MEMBER);
  const [mErr,   setMErr]   = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: fam }, { data: mems }] = await Promise.all([
      supabase.from('families').select('*').eq('id', user.familyId).single(),
      supabase.from('members').select('*').eq('family_id', user.familyId).eq('is_active',true).order('member_seq'),
    ]);
    setFamily(fam);
    setMembers(mems || []);
    setLoading(false);
  }, [user.familyId]);

  useEffect(() => { load(); }, [load]);

  function flash(type,text) { setMsg({type,text}); setTimeout(()=>setMsg(null),4000); }
  function setM(k,v) { setMForm(p=>({...p,[k]:v})); }

  function handleDOB(raw) {
    const fmt=formatDOBInput(raw);
    const {iso,age,valid}=parseDOB(fmt);
    setMForm(p=>({...p,dob_display:fmt,date_of_birth:valid?iso:'',age:valid?age:''}));
    setMErr(e=>({...e,dob:fmt.length===10&&!valid?'Invalid date':''}));
  }
  function handleMobile(v) { setMForm(p=>({...p,mobile:onlyDigits(v,10)})); setMErr(e=>({...e,mobile:''})); }
  function handleAadhar(v) { setMForm(p=>({...p,aadhar_number:onlyDigits(v,12)})); }

  function openAdd() {
    setEditMemberId(null);
    setMForm({...EMPTY_MEMBER, last_name: family?.last_name||''});
    setMErr({});
    setShowModal(true);
  }

  function openEdit(m) {
    setEditMemberId(m.id);
    setMForm({
      first_name:m.first_name||'',middle_name:m.middle_name||'',last_name:m.last_name||'',
      relation:m.relation||'',dob_display:dobToDisplay(m.date_of_birth),
      date_of_birth:m.date_of_birth||'',age:m.age||'',
      blood_group:m.blood_group||'',aadhar_number:m.aadhar_number||'',
      mobile:m.mobile||'',email:m.email||'',education:m.education||'',profession:m.profession||'',
    });
    setMErr({});
    setShowModal(true);
  }

  async function validate() {
    const e={};
    if (!mForm.first_name.trim()) e.first_name='Required';
    if (!mForm.last_name.trim())  e.last_name='Required';
    if (!mForm.relation)           e.relation='Required';
    if (mForm.mobile&&mForm.mobile.length>0&&mForm.mobile.length!==10) e.mobile='Must be 10 digits';
    if (mForm.aadhar_number&&mForm.aadhar_number.length!==12) e.aadhar='Must be 12 digits';
    if (mForm.dob_display.length===10&&!mForm.date_of_birth) e.dob='Invalid date';
    if (mForm.mobile&&mForm.mobile.length===10) {
      const {data:fd}=await supabase.from('families').select('id').eq('mobile',mForm.mobile).eq('is_active',true);
      const {data:md}=await supabase.from('members').select('id').eq('mobile',mForm.mobile).eq('is_active',true);
      if ((fd||[]).length>0||(md||[]).filter(r=>r.id!==editMemberId).length>0) e.mobile='Mobile already registered';
    }
    setMErr(e); return Object.keys(e).length===0;
  }

  async function saveMember() {
    if (saving) return;
    if (!(await validate())) return;
    setSaving(true);
    const payload={
      family_id:user.familyId,
      first_name:mForm.first_name.trim(),middle_name:mForm.middle_name.trim(),last_name:mForm.last_name.trim(),
      relation:mForm.relation,date_of_birth:mForm.date_of_birth||null,
      age:mForm.age!==''?parseInt(mForm.age):null,blood_group:mForm.blood_group||null,
      aadhar_number:mForm.aadhar_number||null,mobile:mForm.mobile||null,
      email:mForm.email.trim(),education:mForm.education.trim(),profession:mForm.profession.trim(),
    };
    const {error}= editMemberId
      ? await supabase.from('members').update(payload).eq('id',editMemberId)
      : await supabase.from('members').insert(payload);
    setSaving(false);
    if (error) { flash('error',error.message); return; }
    flash('success',editMemberId?'Member updated!':'Member added!');
    setShowModal(false);
    load();
  }

  async function removeMember(id) {
    if (!window.confirm('Remove this member from your family?')) return;
    await supabase.from('members').update({is_active:false}).eq('id',id);
    flash('success','Member removed.');
    load();
  }

  if (loading) return <div style={{textAlign:'center',padding:60,color:'#6b7280'}}>Loading your family profile...</div>;

  return (
    <div style={{ minHeight:'100vh', background:'#f5f4f0' }}>

      {/* Top nav */}
      <div style={{ background:'#1e1b4b', padding:'0 24px', display:'flex', alignItems:'center', justifyContent:'space-between', height:60 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:36,height:36,borderRadius:10,background:'#7c3aed',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:16 }}>J</div>
          <div>
            <div style={{ color:'#fff',fontWeight:600,fontSize:14 }}>VPJ Jain Sangh</div>
            <div style={{ color:'#a5b4fc',fontSize:11 }}>Family Portal</div>
          </div>
        </div>
        <div style={{ display:'flex',alignItems:'center',gap:16 }}>
          <div style={{ textAlign:'right' }}>
            <div style={{ color:'#fff',fontSize:13,fontWeight:500 }}>{user.name}</div>
            <div style={{ color:'#a5b4fc',fontSize:11 }}>{user.vpjId}</div>
          </div>
          <button onClick={logout} style={{ background:'rgba(255,255,255,0.1)',color:'#fff',border:'1px solid rgba(255,255,255,0.2)',borderRadius:8,padding:'6px 14px',fontSize:12,cursor:'pointer',fontWeight:500 }}>
            Sign Out
          </button>
        </div>
      </div>

      <div style={{ maxWidth:800, margin:'0 auto', padding:'28px 16px' }}>

        {msg && <div style={{ padding:'10px 16px',borderRadius:8,marginBottom:16,fontSize:13,background:msg.type==='success'?'#d1fae5':'#fee2e2',color:msg.type==='success'?'#065f46':'#991b1b',border:`1px solid ${msg.type==='success'?'#6ee7b7':'#fca5a5'}` }}>{msg.text}</div>}

        {/* Family header card */}
        {family && (
          <div style={{ background:'linear-gradient(135deg,#1e1b4b,#3730a3)',borderRadius:16,padding:'24px 28px',marginBottom:24,color:'#fff' }}>
            <div style={{ display:'flex',alignItems:'center',gap:16,flexWrap:'wrap' }}>
              <div style={{ width:60,height:60,borderRadius:'50%',background:'#7c3aed',border:'3px solid #a5b4fc',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:22,flexShrink:0 }}>
                {(family.first_name||'').charAt(0)}{(family.last_name||'').charAt(0)}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex',alignItems:'center',gap:10,flexWrap:'wrap',marginBottom:4 }}>
                  <span style={{ fontSize:20,fontWeight:700 }}>{fullName(family)}</span>
                  <VpjBadge id={family.vpj_id} />
                  <span style={{ background:'#7c3aed',color:'#fff',borderRadius:20,padding:'2px 10px',fontSize:11,fontWeight:600 }}>Head of Family</span>
                </div>
                <div style={{ fontSize:12,color:'#c7d2fe',display:'flex',gap:16,flexWrap:'wrap' }}>
                  {family.mobile&&<span>📱 {family.mobile}</span>}
                  {family.email&&<span>✉ {family.email}</span>}
                  {family.blood_group&&<span>🩸 {family.blood_group}</span>}
                  {family.age&&<span>Age {family.age}</span>}
                </div>
                {family.address&&<div style={{fontSize:11,color:'#a5b4fc',marginTop:4}}>📍 {family.address}</div>}
              </div>
              <div style={{ display:'flex',gap:12 }}>
                <div style={{ background:'rgba(255,255,255,0.1)',borderRadius:10,padding:'10px 16px',textAlign:'center' }}>
                  <div style={{ fontSize:22,fontWeight:700,color:'#fff' }}>{members.length+1}</div>
                  <div style={{ fontSize:10,color:'#a5b4fc',textTransform:'uppercase',letterSpacing:'0.5px' }}>Members</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Head personal details */}
        {family && (
          <div style={{ background:'#fff',borderRadius:12,border:'1px solid #e5e7eb',marginBottom:20,overflow:'hidden' }}>
            <div style={{ padding:'14px 20px',background:'#f9fafb',borderBottom:'1px solid #f3f4f6',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
              <span style={{ fontWeight:600,fontSize:14 }}>Your Personal Details</span>
              <span style={{ fontSize:11,color:'#9ca3af' }}>Contact Admin to update Head of Family details</span>
            </div>
            <div style={{ padding:'16px 20px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 32px' }}>
              {[
                ['Date of Birth', formatDate(family.date_of_birth)],
                ['Blood Group',   family.blood_group || '—'],
                ['Aadhar No.',    family.aadhar_number ? family.aadhar_number.replace(/(\d{4})(\d{4})(\d{4})/,'$1-$2-$3') : '—'],
                ['Profession',    family.profession || '—'],
                ['Education',     family.education  || '—'],
                ['Email',         family.email      || '—'],
              ].map(([label,value])=>(
                <div key={label} style={{ display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:'0.5px solid #f3f4f6',fontSize:13 }}>
                  <span style={{ color:'#9ca3af',fontWeight:500 }}>{label}</span>
                  <span style={{ color:'#1a1a1a' }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Members section */}
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16 }}>
          <div style={{ fontWeight:600,fontSize:16,color:'#111' }}>
            Family Members
            <span style={{ marginLeft:10,background:'#e0f2fe',color:'#0369a1',borderRadius:20,padding:'3px 12px',fontSize:12,fontWeight:600 }}>
              {members.length} sub-member{members.length!==1?'s':''}
            </span>
          </div>
          <button className="btn btn-primary" onClick={openAdd}>+ Add Member</button>
        </div>

        {members.length===0 ? (
          <div style={{ textAlign:'center',padding:'40px 20px',background:'#fff',borderRadius:12,border:'1px dashed #e5e7eb',color:'#9ca3af' }}>
            <div style={{ fontSize:36,marginBottom:12 }}>👨‍👩‍👧‍👦</div>
            <div style={{ fontWeight:500,marginBottom:6 }}>No family members added yet</div>
            <div style={{ fontSize:13 }}>Click "+ Add Member" to add your family members</div>
          </div>
        ) : members.map(m => (
          <div key={m.id} style={{ background:'#fff',border:'1px solid #e5e7eb',borderRadius:12,marginBottom:12,overflow:'hidden' }}>
            <div style={{ padding:'14px 18px',display:'flex',alignItems:'center',gap:12,justifyContent:'space-between' }}>
              <div style={{ display:'flex',alignItems:'center',gap:12 }}>
                <div style={{ width:44,height:44,borderRadius:'50%',background:'#ede9fe',color:'#7c3aed',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:16,flexShrink:0 }}>
                  {(m.first_name||'').charAt(0)}{(m.last_name||'').charAt(0)}
                </div>
                <div>
                  <div style={{ display:'flex',alignItems:'center',gap:8,flexWrap:'wrap' }}>
                    <span style={{ fontWeight:600,fontSize:15 }}>{fullName(m)}</span>
                    <VpjBadge id={m.vpj_id} />
                    <span style={{ background:'#f3f4f6',color:'#374151',borderRadius:20,padding:'2px 10px',fontSize:12 }}>{m.relation}</span>
                    {m.blood_group&&m.blood_group!=='Unknown'&&<span style={{ background:'#fee2e2',color:'#991b1b',borderRadius:20,padding:'2px 8px',fontSize:11,fontWeight:700 }}>{m.blood_group}</span>}
                  </div>
                  <div style={{ fontSize:12,color:'#9ca3af',marginTop:3 }}>
                    {m.age?`Age ${m.age}`:''}{m.mobile?(m.age?' · ':'')+m.mobile:''}
                    {m.date_of_birth ? ` · DOB: ${formatDate(m.date_of_birth)}` : ''}
                  </div>
                </div>
              </div>
              <div style={{ display:'flex',gap:8,flexShrink:0 }}>
                <button className="btn btn-outline btn-sm" onClick={()=>openEdit(m)}>Edit</button>
                <button className="btn btn-danger  btn-sm" onClick={()=>removeMember(m.id)}>Remove</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Member Modal ── */}
      {showModal && (
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:16 }}
          onClick={()=>setShowModal(false)}>
          <div style={{ background:'#fff',borderRadius:16,padding:28,width:'100%',maxWidth:580,maxHeight:'90vh',overflowY:'auto' }}
            onClick={e=>e.stopPropagation()}>
            <div style={{ fontWeight:700,fontSize:18,marginBottom:20 }}>
              {editMemberId ? 'Edit Member' : 'Add New Member'}
            </div>

            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12 }}>
              <Field label="First Name" required error={mErr.first_name}>
                <input className="form-control" value={mForm.first_name} onChange={e=>setM('first_name',e.target.value)} placeholder="First name" />
              </Field>
              <Field label="Middle Name">
                <input className="form-control" value={mForm.middle_name} onChange={e=>setM('middle_name',e.target.value)} placeholder="Middle name" />
              </Field>
              <Field label="Last Name" required error={mErr.last_name}>
                <input className="form-control" value={mForm.last_name} onChange={e=>setM('last_name',e.target.value)} placeholder="Last name" />
              </Field>
            </div>

            <Field label="Relation with Head of Family" required error={mErr.relation}>
              <select className="form-control" value={mForm.relation} onChange={e=>setM('relation',e.target.value)}>
                <option value="">Select relation</option>
                {RELATIONS.map(r=><option key={r} value={r}>{r}</option>)}
              </select>
            </Field>

            <div style={{ display:'grid',gridTemplateColumns:'1fr 100px',gap:12 }}>
              <Field label="Date of Birth (DD/MM/YYYY)" error={mErr.dob}>
                <input className="form-control" value={mForm.dob_display} onChange={e=>handleDOB(e.target.value)} placeholder="DD/MM/YYYY" maxLength={10} />
              </Field>
              <Field label="Age (auto)">
                <input className="form-control" value={mForm.age} readOnly style={{ background:'#f9fafb',color:'#6b7280',cursor:'not-allowed' }} placeholder="—" />
              </Field>
            </div>

            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
              <Field label="Blood Group">
                <select className="form-control" value={mForm.blood_group} onChange={e=>setM('blood_group',e.target.value)}>
                  <option value="">Select</option>
                  {BLOOD_GROUPS.map(b=><option key={b} value={b}>{b}</option>)}
                </select>
              </Field>
              <Field label="Aadhar (12 digits)" error={mErr.aadhar}>
                <input className="form-control" value={mForm.aadhar_number} onChange={e=>handleAadhar(e.target.value)} placeholder="12-digit" maxLength={12} inputMode="numeric" />
              </Field>
            </div>

            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
              <Field label="Mobile (10 digits)" error={mErr.mobile}>
                <input className="form-control" value={mForm.mobile} onChange={e=>handleMobile(e.target.value)} placeholder="10-digit" maxLength={10} inputMode="numeric" />
              </Field>
              <Field label="Email">
                <input className="form-control" value={mForm.email} onChange={e=>setM('email',e.target.value)} placeholder="email@example.com" type="email" />
              </Field>
            </div>

            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
              <Field label="Profession">
                <input className="form-control" value={mForm.profession} onChange={e=>setM('profession',e.target.value)} placeholder="Profession" />
              </Field>
              <Field label="Education">
                <input className="form-control" value={mForm.education} onChange={e=>setM('education',e.target.value)} placeholder="Degree / School" />
              </Field>
            </div>

            <div style={{ display:'flex',justifyContent:'flex-end',gap:10,marginTop:20 }}>
              <button className="btn btn-outline" onClick={()=>setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveMember} disabled={saving}>
                {saving?'Saving...':editMemberId?'Update Member':'Add Member'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
