import React from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth, ROLES } from './context/AuthContext';

// Pages
import Login       from './pages/Login';
import Signup      from './pages/Signup';
import Dashboard   from './pages/Dashboard';
import Families    from './pages/Families';
import FamilyDetail from './pages/FamilyDetail';
import Events      from './pages/Events';
import Invitations from './pages/Invitations';
import Attendance  from './pages/Attendance';
import Scanner     from './pages/Scanner';
import MyFamily    from './pages/MyFamily';
import AdminUsers  from './pages/AdminUsers';
import './App.css';

// ── Admin sidebar nav ─────────────────────────────────────────
const ADMIN_NAV = [
  { path:'/',             label:'Dashboard',         icon:'▦' },
  { path:'/families',     label:'Members & Families', icon:'⊕' },
  { path:'/events',       label:'Events',             icon:'◈' },
  { path:'/invitations',  label:'Invitations & QR',   icon:'▣' },
  { path:'/attendance',   label:'Attendance',         icon:'✓' },
  { path:'/users',        label:'User Management',    icon:'◉' },
];

// ── Protected Route ───────────────────────────────────────────
function ProtectedRoute({ children, allow }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding:40, textAlign:'center', color:'#6b7280' }}>Loading...</div>;
  if (!user)   return <Navigate to="/login" replace />;
  if (allow && !allow.includes(user.role)) return <Navigate to="/login" replace />;
  return children;
}

// ── Admin Layout with sidebar ─────────────────────────────────
function AdminLayout({ children }) {
  const { user, logout }  = useAuth();
  const location          = useLocation();
  const isFamilies        = location.pathname.startsWith('/families');

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-icon">J</div>
          <div>
            <div className="brand-name">VPJ Jain Sangh</div>
            <div className="brand-sub">Admin Panel</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {ADMIN_NAV.map(n => {
            const active = n.path==='/families' ? isFamilies : location.pathname===n.path;
            return (
              <Link key={n.path} to={n.path} className={`nav-item ${active?'active':''}`}>
                <span className="nav-icon">{n.icon}</span>
                {n.label}
              </Link>
            );
          })}
        </nav>

        {/* Admin info + logout */}
        <div style={{ padding:'16px 20px', borderTop:'1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize:13, fontWeight:600, color:'#fff', marginBottom:2 }}>{user?.name}</div>
          <div style={{ fontSize:11, color:'#a5b4fc', marginBottom:10 }}>Super Admin</div>
          <button
            onClick={logout}
            style={{ width:'100%', padding:'7px 0', background:'rgba(255,255,255,0.08)', color:'#c7d2fe', border:'1px solid rgba(255,255,255,0.12)', borderRadius:7, fontSize:12, fontWeight:500, cursor:'pointer' }}
          >
            Sign Out
          </button>
        </div>
      </aside>

      <main className="main-content">{children}</main>
    </div>
  );
}

// ── Root redirect based on role ───────────────────────────────
function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding:40, textAlign:'center' }}>Loading...</div>;
  if (!user)                         return <Navigate to="/login"     replace />;
  if (user.role===ROLES.SUPER_ADMIN) return <Navigate to="/dashboard" replace />;
  if (user.role===ROLES.VOLUNTEER)   return <Navigate to="/scan"      replace />;
  if (user.role===ROLES.FAMILY_HEAD) return <Navigate to="/my-family" replace />;
  return <Navigate to="/login" replace />;
}

// ── App inner (has access to useAuth) ────────────────────────
function AppInner() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login"  element={<Login />}  />
      <Route path="/signup" element={<Signup />} />
      <Route path="/"       element={<RootRedirect />} />

      {/* Super Admin routes — full sidebar layout */}
      <Route path="/dashboard" element={
        <ProtectedRoute allow={[ROLES.SUPER_ADMIN]}>
          <AdminLayout><Dashboard /></AdminLayout>
        </ProtectedRoute>
      }/>
      <Route path="/families" element={
        <ProtectedRoute allow={[ROLES.SUPER_ADMIN]}>
          <AdminLayout><Families /></AdminLayout>
        </ProtectedRoute>
      }/>
      <Route path="/families/:id" element={
        <ProtectedRoute allow={[ROLES.SUPER_ADMIN]}>
          <AdminLayout><FamilyDetail /></AdminLayout>
        </ProtectedRoute>
      }/>
      <Route path="/events" element={
        <ProtectedRoute allow={[ROLES.SUPER_ADMIN]}>
          <AdminLayout><Events /></AdminLayout>
        </ProtectedRoute>
      }/>
      <Route path="/invitations" element={
        <ProtectedRoute allow={[ROLES.SUPER_ADMIN]}>
          <AdminLayout><Invitations /></AdminLayout>
        </ProtectedRoute>
      }/>
      <Route path="/attendance" element={
        <ProtectedRoute allow={[ROLES.SUPER_ADMIN]}>
          <AdminLayout><Attendance /></AdminLayout>
        </ProtectedRoute>
      }/>
      <Route path="/users" element={
        <ProtectedRoute allow={[ROLES.SUPER_ADMIN]}>
          <AdminLayout><AdminUsers /></AdminLayout>
        </ProtectedRoute>
      }/>

      {/* Volunteer route — no sidebar, full screen scanner */}
      <Route path="/scan" element={
        <ProtectedRoute allow={[ROLES.VOLUNTEER]}>
          <Scanner />
        </ProtectedRoute>
      }/>

      {/* Family Head route — own portal */}
      <Route path="/my-family" element={
        <ProtectedRoute allow={[ROLES.FAMILY_HEAD]}>
          <MyFamily />
        </ProtectedRoute>
      }/>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppInner />
      </AuthProvider>
    </BrowserRouter>
  );
}
