import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function InputField({ label, type='text', value, onChange, placeholder, maxLength, error, hint, inputMode }) {
  return (
    <div style={{ marginBottom:16 }}>
      <label style={{ display:'block', fontSize:13, fontWeight:500, color:'#374151', marginBottom:6 }}>
        {label}
      </label>
      <input
        type={type} value={value} onChange={onChange}
        placeholder={placeholder} maxLength={maxLength} inputMode={inputMode}
        style={{
          width:'100%', padding:'10px 14px',
          border: error ? '1.5px solid #dc2626' : '1px solid #d1d5db',
          borderRadius:8, fontSize:14, outline:'none',
        }}
        onFocus={e=>{ if(!error) e.target.style.borderColor='#2563eb'; }}
        onBlur={e =>{ if(!error) e.target.style.borderColor='#d1d5db'; }}
      />
      {hint  && <div style={{ fontSize:11, color:'#6b7280', marginTop:4 }}>{hint}</div>}
      {error && <div style={{ fontSize:11, color:'#dc2626', marginTop:4 }}>{error}</div>}
    </div>
  );
}

export default function Signup() {
  const navigate        = useNavigate();
  const { signupFamily } = useAuth();

  const [form, setForm]   = useState({ vpjId:'', mobile:'', email:'', password:'', confirmPassword:'' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [apiError, setApiError] = useState('');

  function setF(k, v) { setForm(p=>({...p, [k]:v})); setErrors(e=>({...e,[k]:''})); setApiError(''); }

  function validate() {
    const e = {};
    if (!form.vpjId)   e.vpjId   = 'VPJ ID is required (e.g. VPJ/0001/00)';
    if (!form.mobile || form.mobile.length !== 10) e.mobile = 'Enter your 10-digit registered mobile';
    if (!form.email)   e.email   = 'Email is required';
    if (!form.password || form.password.length < 6) e.password = 'Password must be at least 6 characters';
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    const result = await signupFamily(form);
    setLoading(false);
    if (!result.success) { setApiError(result.error); return; }
    setSuccess(result.message);
  }

  if (success) {
    return (
      <div style={{ minHeight:'100vh', background:'#f5f4f0', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
        <div style={{ background:'#fff', borderRadius:16, padding:40, maxWidth:440, width:'100%', textAlign:'center', border:'1px solid #e5e7eb' }}>
          <div style={{ fontSize:48, marginBottom:16 }}>🙏</div>
          <div style={{ fontSize:20, fontWeight:700, color:'#1e1b4b', marginBottom:12 }}>Registration Submitted!</div>
          <div style={{ fontSize:14, color:'#6b7280', lineHeight:1.7, marginBottom:24 }}>{success}</div>
          <div style={{ background:'#fef9c3', border:'1px solid #fde047', borderRadius:8, padding:'12px 16px', fontSize:13, color:'#713f12', marginBottom:24 }}>
            The Admin will review and approve your account. You will be able to login once approved.
          </div>
          <button onClick={()=>navigate('/login')} style={{ padding:'10px 28px', background:'#2563eb', color:'#fff', border:'none', borderRadius:8, fontWeight:600, fontSize:14, cursor:'pointer' }}>
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight:'100vh', background:'#f5f4f0', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ width:'100%', maxWidth:480 }}>

        {/* Brand */}
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ width:56, height:56, borderRadius:14, background:'#1e1b4b', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, fontWeight:800, margin:'0 auto 12px' }}>J</div>
          <div style={{ fontSize:20, fontWeight:700, color:'#1e1b4b' }}>VPJ Jain Sangh</div>
          <div style={{ fontSize:13, color:'#6b7280', marginTop:3 }}>Family Head — Create Account</div>
        </div>

        <div style={{ background:'#fff', borderRadius:16, border:'1px solid #e5e7eb', padding:'28px 28px 20px' }}>

          <div style={{ background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:8, padding:'10px 14px', fontSize:12, color:'#1e40af', marginBottom:20, lineHeight:1.6 }}>
            To register, you need your <strong>VPJ ID</strong> (e.g. VPJ/0001/00) and <strong>registered mobile number</strong>. These are assigned by the Admin. Contact the Admin if you do not have them.
          </div>

          <form onSubmit={handleSubmit}>
            <InputField
              label="Your VPJ ID"
              value={form.vpjId}
              onChange={e=>setF('vpjId', e.target.value.toUpperCase())}
              placeholder="e.g. VPJ/0001/00"
              error={errors.vpjId}
              hint="Your unique ID assigned by Admin — only /00 (Head) IDs can signup"
            />
            <InputField
              label="Registered Mobile Number"
              value={form.mobile}
              onChange={e=>setF('mobile', e.target.value.replace(/\D/g,'').slice(0,10))}
              placeholder="10-digit mobile"
              maxLength={10}
              inputMode="numeric"
              error={errors.mobile}
              hint="Must match the mobile number registered with Admin"
            />
            <InputField
              label="Email Address (for login)"
              type="email"
              value={form.email}
              onChange={e=>setF('email', e.target.value)}
              placeholder="your@email.com"
              error={errors.email}
            />
            <InputField
              label="Create Password"
              type="password"
              value={form.password}
              onChange={e=>setF('password', e.target.value)}
              placeholder="Minimum 6 characters"
              error={errors.password}
            />
            <InputField
              label="Confirm Password"
              type="password"
              value={form.confirmPassword}
              onChange={e=>setF('confirmPassword', e.target.value)}
              placeholder="Repeat password"
              error={errors.confirmPassword}
            />

            {apiError && (
              <div style={{ background:'#fee2e2', color:'#991b1b', borderRadius:8, padding:'10px 14px', fontSize:13, marginBottom:16, border:'1px solid #fca5a5' }}>
                {apiError}
              </div>
            )}

            <button type="submit" disabled={loading} style={{ width:'100%', padding:12, background: loading?'#9ca3af':'#2563eb', color:'#fff', border:'none', borderRadius:8, fontSize:15, fontWeight:600, cursor: loading?'not-allowed':'pointer', marginBottom:12 }}>
              {loading ? 'Submitting...' : 'Create Account'}
            </button>

            <div style={{ textAlign:'center', fontSize:13, color:'#6b7280' }}>
              Already have an account?{' '}
              <span onClick={()=>navigate('/login')} style={{ color:'#2563eb', cursor:'pointer', textDecoration:'underline' }}>Sign in</span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
