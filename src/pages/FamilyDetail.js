import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_KEY
);

// ── Helpers ───────────────────────────────────────────────────
function fullName(r) {
  return [r.first_name, r.middle_name, r.last_name].filter(Boolean).join(' ');
}

function formatDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function initials(r) {
  return [(r.first_name||'').charAt(0), (r.last_name||'').charAt(0)].join('').toUpperCase();
}

// ── VPJ ID Badge ──────────────────────────────────────────────
function VpjBadge({ id, large }) {
  if (!id) return null;
  const parts  = id.split('/');
  const isHead = parts[2] === '00';
  const sz     = large ? 14 : 12;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      fontFamily: 'monospace', fontSize: sz, fontWeight: 700,
      borderRadius: 6, overflow: 'hidden', verticalAlign: 'middle',
      border: isHead ? '1.5px solid #7c3aed' : '1.5px solid #0369a1',
    }}>
      <span style={{ background: isHead ? '#7c3aed' : '#0369a1', color: '#fff', padding: large ? '4px 8px' : '2px 6px' }}>VPJ</span>
      <span style={{ background: isHead ? '#ede9fe' : '#e0f2fe', color: isHead ? '#5b21b6' : '#0c4a6e', padding: large ? '4px 8px' : '2px 6px' }}>
        {parts[1]}/{parts[2]}
      </span>
    </span>
  );
}

// ── Info Row ──────────────────────────────────────────────────
function InfoRow({ label, value, highlight }) {
  if (!value && value !== 0) return null;
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      padding: '9px 0', borderBottom: '0.5px solid #f3f4f6', gap: 12,
    }}>
      <span style={{ fontSize: 12, color: '#9ca3af', fontWeight: 500, minWidth: 120, flexShrink: 0 }}>
        {label}
      </span>
      <span style={{ fontSize: 13, color: highlight ? '#7c3aed' : '#1a1a1a', fontWeight: highlight ? 600 : 400, textAlign: 'right' }}>
        {value}
      </span>
    </div>
  );
}

// ── Blood group badge ─────────────────────────────────────────
function BloodBadge({ group }) {
  if (!group || group === 'Unknown') return null;
  const colours = {
    'A+':'#dc2626','A-':'#b91c1c',
    'B+':'#d97706','B-':'#b45309',
    'AB+':'#7c3aed','AB-':'#6d28d9',
    'O+':'#059669','O-':'#047857',
  };
  const bg = colours[group] || '#6b7280';
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px', borderRadius: 20,
      background: bg, color: '#fff', fontWeight: 700,
      fontSize: 12, letterSpacing: '0.5px',
    }}>{group}</span>
  );
}

// ── Relation badge ────────────────────────────────────────────
function RelBadge({ relation }) {
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px', borderRadius: 20,
      background: '#f3f4f6', color: '#374151', fontSize: 12, fontWeight: 500,
    }}>{relation}</span>
  );
}

// ── Member Card ───────────────────────────────────────────────
function MemberCard({ member, isHead, index }) {
  const [open, setOpen] = useState(false);
  const bgColour  = isHead ? '#1e1b4b' : '#ffffff';
  const textColor = isHead ? '#ffffff' : '#1a1a1a';
  const subColor  = isHead ? '#a5b4fc' : '#6b7280';

  return (
    <div style={{
      border: isHead ? '2px solid #7c3aed' : '1px solid #e5e7eb',
      borderRadius: 14, overflow: 'hidden', marginBottom: 14,
      background: '#fff',
    }}>
      {/* Card Header — always visible, click to expand */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '16px 20px', cursor: 'pointer',
          background: bgColour,
          userSelect: 'none',
        }}
      >
        {/* Avatar */}
        <div style={{
          width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
          background: isHead ? '#7c3aed' : '#ede9fe',
          color: isHead ? '#fff' : '#7c3aed',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: 18, border: isHead ? '2px solid #a5b4fc' : 'none',
        }}>
          {initials(member)}
        </div>

        {/* Name + badges */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: 16, color: textColor }}>{fullName(member)}</span>
            <VpjBadge id={member.vpj_id} />
            {isHead
              ? <span style={{ background: '#7c3aed', color: '#fff', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600 }}>Head of Family</span>
              : <RelBadge relation={member.relation} />
            }
            {member.blood_group && member.blood_group !== 'Unknown' && <BloodBadge group={member.blood_group} />}
          </div>
          <div style={{ fontSize: 12, color: subColor, marginTop: 4, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            {member.age     && <span>Age {member.age}</span>}
            {member.mobile  && <span>{member.mobile}</span>}
            {member.profession && <span>{member.profession}</span>}
          </div>
        </div>

        {/* Expand chevron */}
        <div style={{ color: isHead ? '#a5b4fc' : '#9ca3af', fontSize: 18, transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          ▾
        </div>
      </div>

      {/* Expanded detail panel */}
      {open && (
        <div style={{ padding: '16px 20px', background: '#fafafa', borderTop: '1px solid #f3f4f6' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 32px' }}>

            {/* Left column */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.8px', marginBottom: 8 }}>PERSONAL DETAILS</div>
              <InfoRow label="VPJ ID"        value={member.vpj_id}               highlight />
              <InfoRow label="Full Name"     value={fullName(member)} />
              {!isHead && <InfoRow label="Relation"   value={member.relation} />}
              <InfoRow label="Date of Birth" value={formatDate(member.date_of_birth)} />
              <InfoRow label="Age"           value={member.age ? `${member.age} years` : null} />
              <InfoRow label="Blood Group"   value={member.blood_group} />
              <InfoRow label="Aadhar No."    value={member.aadhar_number
                ? member.aadhar_number.replace(/(\d{4})(\d{4})(\d{4})/, '$1-$2-$3')
                : null} />
            </div>

            {/* Right column */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.8px', marginBottom: 8 }}>CONTACT & EDUCATION</div>
              <InfoRow label="Mobile"        value={member.mobile} />
              <InfoRow label="Email"         value={member.email} />
              <InfoRow label="Profession"    value={member.profession} />
              <InfoRow label="Education"     value={member.education} />
              {isHead && <InfoRow label="Address" value={member.address} />}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function FamilyDetail() {
  const { id }     = useParams();
  const navigate   = useNavigate();
  const [family,   setFamily]   = useState(null);
  const [members,  setMembers]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: fam, error } = await supabase
      .from('families')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !fam) { setNotFound(true); setLoading(false); return; }
    setFamily(fam);

    const { data: mems } = await supabase
      .from('members')
      .select('*')
      .eq('family_id', id)
      .eq('is_active', true)
      .order('member_seq');

    setMembers(mems || []);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  function printProfile() {
    window.print();
  }

  if (loading)  return <div className="loading">Loading family profile...</div>;
  if (notFound) return (
    <div className="empty-state">
      <div className="empty-state-title">Family not found</div>
      <button className="btn btn-outline" style={{ marginTop: 16 }} onClick={() => navigate('/families')}>← Back to Families</button>
    </div>
  );

  const totalMembers = members.length; // excludes head
  const allPeople    = [{ ...family, isHead: true }, ...members.map(m => ({ ...m, isHead: false }))];

  return (
    <div>
      {/* ── Top bar ── */}
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => navigate('/families')}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            ← Back
          </button>
          <div>
            <div className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {fullName(family)}
              <VpjBadge id={family.vpj_id} large />
            </div>
            <div className="page-sub">
              Family profile · {totalMembers + 1} member{totalMembers !== 0 ? 's' : ''} (including Head)
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-outline" onClick={printProfile}>
            Print Profile
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/families')}>
            Edit Members
          </button>
        </div>
      </div>

      {/* ── Family Summary Card ── */}
      <div style={{
        background: 'linear-gradient(135deg, #1e1b4b 0%, #3730a3 100%)',
        borderRadius: 16, padding: '24px 28px', marginBottom: 28, color: '#fff',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' }}>
          {/* Big avatar */}
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: '#7c3aed', border: '3px solid #a5b4fc',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: 26, color: '#fff', flexShrink: 0,
          }}>
            {initials(family)}
          </div>

          {/* Info */}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
              <span style={{ fontSize: 22, fontWeight: 700 }}>{fullName(family)}</span>
              <VpjBadge id={family.vpj_id} large />
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 24px', fontSize: 13, color: '#c7d2fe' }}>
              {family.mobile     && <span>📱 {family.mobile}</span>}
              {family.email      && <span>✉ {family.email}</span>}
              {family.profession && <span>💼 {family.profession}</span>}
              {family.education  && <span>🎓 {family.education}</span>}
            </div>
            {family.address && (
              <div style={{ fontSize: 12, color: '#a5b4fc', marginTop: 6 }}>📍 {family.address}</div>
            )}
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 16, flexShrink: 0 }}>
            {[
              { label: 'Family ID',    value: family.vpj_id },
              { label: 'Members',      value: totalMembers + 1 },
              { label: 'Head Age',     value: family.age ? `${family.age} yrs` : '—' },
              { label: 'Blood Group',  value: family.blood_group || '—' },
            ].map(s => (
              <div key={s.label} style={{
                background: 'rgba(255,255,255,0.1)', borderRadius: 10,
                padding: '10px 14px', textAlign: 'center', minWidth: 80,
              }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', fontFamily: 'monospace' }}>{s.value}</div>
                <div style={{ fontSize: 10, color: '#a5b4fc', marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Member count pills ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ background: '#ede9fe', color: '#6d28d9', borderRadius: 20, padding: '6px 16px', fontSize: 13, fontWeight: 600 }}>
          1 Head of Family
        </div>
        <div style={{ background: '#e0f2fe', color: '#0369a1', borderRadius: 20, padding: '6px 16px', fontSize: 13, fontWeight: 600 }}>
          {totalMembers} Sub-Member{totalMembers !== 1 ? 's' : ''}
        </div>
        <div style={{ background: '#f0fdf4', color: '#166534', borderRadius: 20, padding: '6px 16px', fontSize: 13, fontWeight: 600 }}>
          {totalMembers + 1} Total Members
        </div>
      </div>

      {/* ── Section title ── */}
      <div style={{ fontSize: 13, fontWeight: 700, color: '#6b7280', letterSpacing: '0.8px', marginBottom: 14, textTransform: 'uppercase' }}>
        All Members — Click any card to expand details
      </div>

      {/* ── Member Cards ── */}
      {allPeople.map((person, i) => (
        <MemberCard
          key={person.id}
          member={person}
          isHead={person.isHead}
          index={i}
        />
      ))}

      {totalMembers === 0 && (
        <div style={{
          textAlign: 'center', padding: '32px 20px',
          background: '#fff', borderRadius: 12, border: '1px dashed #e5e7eb',
          color: '#9ca3af', fontSize: 14,
        }}>
          No sub-members added yet. Go to Families and click "+ Add Member" to add family members.
        </div>
      )}

      {/* ── Print styles ── */}
      <style>{`
        @media print {
          .sidebar, .page-header button, .btn { display: none !important; }
          .main-content { margin-left: 0 !important; }
          body { background: white !important; }
        }
      `}</style>
    </div>
  );
}
