import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_KEY
);

export default function Scanner() {
  const { user, logout } = useAuth();
  const videoRef   = useRef(null);
  const canvasRef  = useRef(null);
  const streamRef  = useRef(null);
  const scanningRef = useRef(false);

  const [events,       setEvents]       = useState([]);
  const [selectedEvent,setSelectedEvent]= useState('');
  const [cameraOn,     setCameraOn]     = useState(false);
  const [result,       setResult]       = useState(null);   // last scan result
  const [manualQR,     setManualQR]     = useState('');
  const [scanCount,    setScanCount]    = useState(0);
  const [loading,      setLoading]      = useState(false);
  const [camError,     setCamError]     = useState('');

  useEffect(() => {
    supabase.from('events').select('id,event_name,event_date')
      .eq('is_active',true).order('event_date',{ascending:false})
      .then(({data})=>setEvents(data||[]));
    return () => stopCamera();
  }, []); // eslint-disable-line

  async function startCamera() {
    try {
      setCamError('');
      const stream = await navigator.mediaDevices.getUserMedia({ video:{ facingMode:'environment' } });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject=stream; await videoRef.current.play(); }
      setCameraOn(true);
      scanningRef.current = true;
      requestAnimationFrame(scanFrame);
    } catch (e) {
      setCamError('Camera not available. Use manual entry below.');
    }
  }

  function stopCamera() {
    scanningRef.current = false;
    if (streamRef.current) { streamRef.current.getTracks().forEach(t=>t.stop()); streamRef.current=null; }
    setCameraOn(false);
  }

  async function scanFrame() {
    if (!scanningRef.current || !videoRef.current || !canvasRef.current) return;
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width  = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);
      try {
        // Use BarcodeDetector API (available in Chrome/Edge on Android)
        if ('BarcodeDetector' in window) {
          const detector = new window.BarcodeDetector({ formats:['qr_code'] });
          const codes    = await detector.detect(canvas);
          if (codes.length > 0) {
            const qr = codes[0].rawValue;
            if (qr && qr.startsWith('VPJ-')) {
              scanningRef.current = false;
              await processQR(qr);
              return;
            }
          }
        }
      } catch {}
    }
    if (scanningRef.current) requestAnimationFrame(scanFrame);
  }

  async function processQR(qrCode) {
    if (!selectedEvent) { setResult({ status:'error', message:'Please select an event first.' }); scanningRef.current=true; return; }
    if (loading) return;
    setLoading(true);

    // Find invitation
    const { data:inv } = await supabase
      .from('invitations')
      .select('id,event_id,member_id,family_id,families(first_name,middle_name,last_name),members(first_name,middle_name,last_name,relation)')
      .eq('qr_code', qrCode)
      .eq('event_id', selectedEvent)
      .single();

    if (!inv) {
      setResult({ status:'error', message:'Invalid QR code or not for this event.' });
      setLoading(false); scanningRef.current=true; return;
    }

    // Check already scanned
    const { data:existing } = await supabase
      .from('attendance').select('id,scanned_at').eq('invitation_id',inv.id);

    if (existing && existing.length>0) {
      const name = inv.members
        ? [inv.members.first_name,inv.members.last_name].filter(Boolean).join(' ')
        : [inv.families.first_name,inv.families.last_name].filter(Boolean).join(' ');
      setResult({
        status:'duplicate',
        message:`${name} already checked in at ${new Date(existing[0].scanned_at).toLocaleTimeString('en-IN')}`,
        name, time: new Date(existing[0].scanned_at).toLocaleTimeString('en-IN'),
      });
      setLoading(false); scanningRef.current=true; return;
    }

    // Record attendance
    await supabase.from('attendance').insert({
      invitation_id: inv.id,
      event_id:      selectedEvent,
      member_id:     inv.member_id || null,
      scanned_by:    user.name,
    });

    const name = inv.members
      ? [inv.members.first_name,inv.members.last_name].filter(Boolean).join(' ')
      : [inv.families.first_name,inv.families.last_name].filter(Boolean).join(' ');
    const relation = inv.members?.relation || 'Head of Family';

    setScanCount(c=>c+1);
    setResult({ status:'success', message:`Welcome! ${name} checked in successfully.`, name, relation, qr:qrCode });
    setLoading(false);

    // Auto-resume camera after 2.5s
    setTimeout(() => { scanningRef.current=true; requestAnimationFrame(scanFrame); }, 2500);
  }

  async function submitManual(e) {
    e.preventDefault();
    if (!manualQR.trim()) return;
    stopCamera();
    await processQR(manualQR.trim().toUpperCase());
    setManualQR('');
  }

  const statusColors = {
    success:   { bg:'#d1fae5', border:'#6ee7b7', text:'#065f46', icon:'✓' },
    duplicate: { bg:'#fef9c3', border:'#fde047', text:'#713f12', icon:'⚠' },
    error:     { bg:'#fee2e2', border:'#fca5a5', text:'#991b1b', icon:'✗' },
  };

  return (
    <div style={{ minHeight:'100vh', background:'#0f172a', color:'#fff' }}>

      {/* Top bar */}
      <div style={{ padding:'0 20px', height:56, display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display:'flex',alignItems:'center',gap:10 }}>
          <div style={{ width:32,height:32,borderRadius:8,background:'#7c3aed',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:14 }}>J</div>
          <div>
            <div style={{ fontSize:13,fontWeight:600 }}>VPJ Jain Sangh</div>
            <div style={{ fontSize:10,color:'#94a3b8' }}>Volunteer Scanner</div>
          </div>
        </div>
        <div style={{ display:'flex',alignItems:'center',gap:12 }}>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:12,fontWeight:500 }}>{user.name}</div>
            <div style={{ fontSize:10,color:'#94a3b8' }}>Scanned today: {scanCount}</div>
          </div>
          <button onClick={logout} style={{ background:'rgba(255,255,255,0.1)',color:'#fff',border:'1px solid rgba(255,255,255,0.2)',borderRadius:6,padding:'5px 12px',fontSize:12,cursor:'pointer' }}>
            Sign Out
          </button>
        </div>
      </div>

      <div style={{ maxWidth:500,margin:'0 auto',padding:'20px 16px' }}>

        {/* Event selector */}
        <div style={{ marginBottom:20 }}>
          <label style={{ display:'block',fontSize:12,color:'#94a3b8',marginBottom:8,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.5px' }}>
            Select Event
          </label>
          <select
            value={selectedEvent}
            onChange={e=>{setSelectedEvent(e.target.value);setResult(null);}}
            style={{ width:'100%',padding:'10px 14px',background:'#1e293b',color:'#fff',border:'1px solid #334155',borderRadius:8,fontSize:14,outline:'none' }}
          >
            <option value="">— Choose event —</option>
            {events.map(ev=>(
              <option key={ev.id} value={ev.id}>
                {ev.event_name} ({new Date(ev.event_date).toLocaleDateString('en-IN')})
              </option>
            ))}
          </select>
        </div>

        {/* Camera viewfinder */}
        <div style={{ position:'relative',background:'#1e293b',borderRadius:16,overflow:'hidden',marginBottom:16,aspectRatio:'1',border:'2px solid #334155' }}>
          <video ref={videoRef} style={{ width:'100%',height:'100%',objectFit:'cover',display:cameraOn?'block':'none' }} playsInline muted />
          <canvas ref={canvasRef} style={{ display:'none' }} />

          {/* Scanning overlay */}
          {cameraOn && (
            <div style={{ position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',pointerEvents:'none' }}>
              <div style={{ width:220,height:220,border:'3px solid #7c3aed',borderRadius:16,boxShadow:'0 0 0 9999px rgba(0,0,0,0.5)' }}>
                <div style={{ position:'absolute',top:0,left:0,width:30,height:30,borderTop:'4px solid #7c3aed',borderLeft:'4px solid #7c3aed',borderRadius:'16px 0 0 0' }}/>
                <div style={{ position:'absolute',top:0,right:0,width:30,height:30,borderTop:'4px solid #7c3aed',borderRight:'4px solid #7c3aed',borderRadius:'0 16px 0 0' }}/>
                <div style={{ position:'absolute',bottom:0,left:0,width:30,height:30,borderBottom:'4px solid #7c3aed',borderLeft:'4px solid #7c3aed',borderRadius:'0 0 0 16px' }}/>
                <div style={{ position:'absolute',bottom:0,right:0,width:30,height:30,borderBottom:'4px solid #7c3aed',borderRight:'4px solid #7c3aed',borderRadius:'0 0 16px 0' }}/>
              </div>
              <div style={{ position:'absolute',bottom:20,left:0,right:0,textAlign:'center',fontSize:12,color:'rgba(255,255,255,0.7)' }}>
                Point camera at QR code
              </div>
            </div>
          )}

          {/* Placeholder when camera is off */}
          {!cameraOn && (
            <div style={{ position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:12 }}>
              <div style={{ fontSize:48,opacity:0.3 }}>📷</div>
              <div style={{ fontSize:13,color:'#64748b' }}>Camera is off</div>
            </div>
          )}
        </div>

        {camError && <div style={{ background:'#fef3c7',color:'#92400e',borderRadius:8,padding:'8px 14px',fontSize:12,marginBottom:12,border:'1px solid #fde68a' }}>{camError}</div>}

        {/* Camera controls */}
        <div style={{ display:'flex',gap:10,marginBottom:20 }}>
          {!cameraOn ? (
            <button
              onClick={startCamera}
              disabled={!selectedEvent}
              style={{ flex:1,padding:'12px',background:selectedEvent?'#7c3aed':'#334155',color:'#fff',border:'none',borderRadius:8,fontSize:14,fontWeight:600,cursor:selectedEvent?'pointer':'not-allowed' }}
            >
              Start Camera Scanner
            </button>
          ) : (
            <button onClick={stopCamera} style={{ flex:1,padding:'12px',background:'#dc2626',color:'#fff',border:'none',borderRadius:8,fontSize:14,fontWeight:600,cursor:'pointer' }}>
              Stop Camera
            </button>
          )}
        </div>

        {/* Manual entry */}
        <form onSubmit={submitManual} style={{ marginBottom:20 }}>
          <label style={{ display:'block',fontSize:12,color:'#94a3b8',marginBottom:8,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.5px' }}>
            Manual QR Entry
          </label>
          <div style={{ display:'flex',gap:8 }}>
            <input
              value={manualQR}
              onChange={e=>setManualQR(e.target.value.toUpperCase())}
              placeholder="e.g. VPJ-E1234-M5678-ABCD"
              style={{ flex:1,padding:'10px 14px',background:'#1e293b',color:'#fff',border:'1px solid #334155',borderRadius:8,fontSize:13,outline:'none' }}
            />
            <button type="submit" style={{ padding:'10px 18px',background:'#059669',color:'#fff',border:'none',borderRadius:8,fontWeight:600,cursor:'pointer' }}>
              Check In
            </button>
          </div>
        </form>

        {/* Result display */}
        {result && (() => {
          const c = statusColors[result.status];
          return (
            <div style={{ background:c.bg,border:`2px solid ${c.border}`,borderRadius:12,padding:'20px',textAlign:'center' }}>
              <div style={{ fontSize:40,marginBottom:8 }}>{c.icon==='✓'?'✅':c.icon==='⚠'?'⚠️':'❌'}</div>
              <div style={{ fontSize:16,fontWeight:700,color:c.text,marginBottom:4 }}>{result.name}</div>
              {result.relation && <div style={{ fontSize:13,color:c.text,marginBottom:8,opacity:0.8 }}>{result.relation}</div>}
              <div style={{ fontSize:13,color:c.text }}>{result.message}</div>
            </div>
          );
        })()}

      </div>
    </div>
  );
}
