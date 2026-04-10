import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// ── Tab button (outside component - no re-render issue) ───────
function TabBtn({ label, active, onClick, color }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, padding: '12px 8px', border: 'none', cursor: 'pointer',
        fontWeight: 600, fontSize: 13, transition: 'all 0.2s',
        borderBottom: active ? `3px solid ${color}` : '3px solid transparent',
        background: active ? '#fff' : '#f9fafb',
        color: active ? color : '#9ca3af',
        borderRadius: 0,
      }}
    >
      {label}
    </button>
  );
}

function InputField({ label, type='text', value, onChange, placeholder, maxLength, error, inputMode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display:'block', fontSize:13, fontWeight:500, color:'#374151', marginBottom:6 }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        maxLength={maxLength}
        inputMode={inputMode}
        style={{
          width:'100%', padding:'10px 14px',
          border: error ? '1.5px solid #dc2626' : '1px solid #d1d5db',
          borderRadius:8, fontSize:14, outline:'none',
          transition:'border 0.15s',
        }}
        onFocus={e => { if (!error) e.target.style.borderColor='#7c3aed'; }}
        onBlur={e  => { if (!error) e.target.style.borderColor='#d1d5db'; }}
      />
      {error && <div style={{ fontSize:11, color:'#dc2626', marginTop:4 }}>{error}</div>}
    </div>
  );
}

export default function Login() {
  const navigate          = useNavigate();
  const { loginAdmin, loginVolunteer, loginFamily } = useAuth();

  const [tab,      setTab]      = useState('admin');     // 'admin' | 'volunteer' | 'family'
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  // admin form
  const [aEmail,   setAEmail]   = useState('');
  const [aPass,    setAPass]    = useState('');

  // volunteer form
  const [vMobile,  setVMobile]  = useState('');
  const [vPin,     setVPin]     = useState('');

  // family form
  const [fEmail,   setFEmail]   = useState('');
  const [fPass,    setFPass]    = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    let result;
    if (tab === 'admin') {
      result = await loginAdmin(aEmail, aPass);
    } else if (tab === 'volunteer') {
      result = await loginVolunteer(vMobile, vPin);
    } else {
      result = await loginFamily(fEmail, fPass);
    }

    setLoading(false);
    if (!result.success) { setError(result.error); return; }

    // Redirect based on role
    if (tab === 'admin')     navigate('/');
    if (tab === 'volunteer') navigate('/scan');
    if (tab === 'family')    navigate('/my-family');
  }

  const TAB_COLORS = { admin:'#7c3aed', volunteer:'#059669', family:'#2563eb' };
  const color = TAB_COLORS[tab];

  return (
    <div style={{
      minHeight:'100vh', background:'#f5f4f0',
      display:'flex', alignItems:'center', justifyContent:'center',
      padding:16,
    }}>
      <div style={{ width:'100%', maxWidth:440 }}>

        {/* Brand */}
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{
            width:64, height:64, borderRadius:16,
            background:'#1e1b4b', color:'#fff',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:28, fontWeight:800, margin:'0 auto 16px',
          }}>J</div>
          <div style={{ fontSize:22, fontWeight:700, color:'#1e1b4b' }}>VPJ Jain Sangh</div>
          <div style={{ fontSize:13, color:'#6b7280', marginTop:4 }}>Community Management System</div>
        </div>

        {/* Card */}
        <div style={{
          background:'#fff', borderRadius:16,
          border:'1px solid #e5e7eb',
          overflow:'hidden',
        }}>
          {/* Tabs */}
          <div style={{ display:'flex', borderBottom:'1px solid #e5e7eb' }}>
            <TabBtn label="Super Admin"   active={tab==='admin'}     onClick={()=>{setTab('admin');     setError('');}} color={TAB_COLORS.admin}     />
            <TabBtn label="Volunteer"     active={tab==='volunteer'} onClick={()=>{setTab('volunteer'); setError('');}} color={TAB_COLORS.volunteer}  />
            <TabBtn label="Family Login"  active={tab==='family'}    onClick={()=>{setTab('family');    setError('');}} color={TAB_COLORS.family}     />
          </div>

          <form onSubmit={handleSubmit} style={{ padding:'28px 28px 20px' }}>

            {/* Role description */}
            <div style={{
              fontSize:12, color:'#6b7280', marginBottom:20,
              padding:'8px 12px', background:'#f9fafb', borderRadius:8,
              borderLeft:`3px solid ${color}`,
            }}>
              {tab==='admin'     && 'Full access — manage all members, events, invitations and attendance.'}
              {tab==='volunteer' && 'Scan QR codes at event entrance and view attendance records.'}
              {tab==='family'    && 'View and manage your own family members only.'}
            </div>

            {/* Admin fields */}
            {tab === 'admin' && <>
              <InputField label="Email Address" type="email" value={aEmail}
                onChange={e=>setAEmail(e.target.value)} placeholder="admin@vpjjainsamgh.com" />
              <InputField label="Password" type="password" value={aPass}
                onChange={e=>setAPass(e.target.value)} placeholder="Enter password" />
            </>}

            {/* Volunteer fields */}
            {tab === 'volunteer' && <>
              <InputField label="Registered Mobile Number" value={vMobile}
                onChange={e=>setVMobile(e.target.value.replace(/\D/g,'').slice(0,10))}
                placeholder="10-digit mobile" maxLength={10} inputMode="numeric" />
              <InputField label="PIN" type="password" value={vPin}
                onChange={e=>setVPin(e.target.value.replace(/\D/g,'').slice(0,6))}
                placeholder="4–6 digit PIN" maxLength={6} inputMode="numeric" />
            </>}

            {/* Family fields */}
            {tab === 'family' && <>
              <InputField label="Email Address" type="email" value={fEmail}
                onChange={e=>setFEmail(e.target.value)} placeholder="your@email.com" />
              <InputField label="Password" type="password" value={fPass}
                onChange={e=>setFPass(e.target.value)} placeholder="Enter password" />
              <div style={{ textAlign:'right', marginTop:-8, marginBottom:16 }}>
                <span
                  onClick={()=>navigate('/signup')}
                  style={{ fontSize:12, color:'#2563eb', cursor:'pointer', textDecoration:'underline' }}
                >
                  New user? Sign up here
                </span>
              </div>
            </>}

            {/* Error */}
            {error && (
              <div style={{
                background:'#fee2e2', color:'#991b1b', borderRadius:8,
                padding:'10px 14px', fontSize:13, marginBottom:16,
                border:'1px solid #fca5a5',
              }}>{error}</div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width:'100%', padding:'12px',
                background: loading ? '#9ca3af' : color,
                color:'#fff', border:'none', borderRadius:8,
                fontSize:15, fontWeight:600, cursor: loading ? 'not-allowed' : 'pointer',
                transition:'background 0.2s',
              }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>

          </form>
        </div>

        <div style={{ textAlign:'center', fontSize:11, color:'#9ca3af', marginTop:20 }}>
          VPJ Jain Sangh © 2025 · Community Management System
        </div>
      </div>
    </div>
  );
}
