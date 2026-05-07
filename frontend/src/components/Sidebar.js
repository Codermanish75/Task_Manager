import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const Icon = ({ d, size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const icons = {
  dashboard: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10",
  projects: "M3 3h7v7H3z M14 3h7v7h-7z M14 14h7v7h-7z M3 14h7v7H3z",
  tasks: "M9 11l3 3L22 4 M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11",
  logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9",
  menu: "M3 12h18 M3 6h18 M3 18h18",
  close: "M18 6L6 18 M6 6l12 12",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
};

export default function Sidebar() {
  const { user, logout, isSystemAdmin } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const initials = user
    ? ((user.first_name?.[0] || '') + (user.last_name?.[0] || '') || user.username?.[0] || '?').toUpperCase()
    : '?';

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: icons.dashboard },
    { to: '/projects', label: 'Projects', icon: icons.projects },
    { to: '/tasks', label: 'My Tasks', icon: icons.tasks },
  ];

  const SidebarContent = () => (
    <>
      <div className="sidebar-logo">
        <h1>Task<span>Manager</span></h1>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, fontFamily: 'var(--font-body)' }}>
          Professional Task Manager
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-label">Navigation</div>
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            onClick={() => setMobileOpen(false)}
          >
            <Icon d={item.icon} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-bottom">
        {isSystemAdmin && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 12px', marginBottom: 8,
            background: 'rgba(108,99,255,0.12)',
            borderRadius: 8, fontSize: 11, color: 'var(--accent)',
            fontWeight: 600,
          }}>
            <Icon d={icons.shield} size={14} />
            System Administrator
          </div>
        )}
        <div className="user-card">
          <div className="user-avatar">{initials}</div>
          <div className="user-info">
            <div className="user-name">{user?.first_name ? `${user.first_name} ${user.last_name}` : user?.username}</div>
            <div className="user-email">{user?.email}</div>
          </div>
        </div>
        <button className="nav-item" onClick={handleLogout} style={{ marginTop: 4, color: 'var(--danger)', width: '100%' }}>
          <Icon d={icons.logout} />
          Sign Out
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="sidebar" style={{ display: 'flex' }}>
        <SidebarContent />
      </aside>

      {/* Mobile Toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        style={{
          display: 'none',
          position: 'fixed', bottom: 16, right: 16,
          width: 52, height: 52, borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--accent), #8b84ff)',
          border: 'none', cursor: 'pointer', color: 'white',
          zIndex: 200, alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(108,99,255,0.4)',
        }}
        className="mobile-fab"
      >
        <Icon d={mobileOpen ? icons.close : icons.menu} size={22} />
      </button>

      {mobileOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 150 }}>
          <div onClick={() => setMobileOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(7,7,17,0.8)', backdropFilter: 'blur(4px)' }} />
          <aside className="sidebar" style={{ position: 'absolute', left: 0, top: 0, bottom: 0, display: 'flex', zIndex: 1 }}>
            <SidebarContent />
          </aside>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .sidebar { display: none !important; }
          .mobile-fab { display: flex !important; }
        }
      `}</style>
    </>
  );
}
