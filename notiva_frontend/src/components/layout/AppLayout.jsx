import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { LayoutDashboard, Book, BookOpen, Users, Trash2, User, LogOut, Moon, Sun, FileText } from 'lucide-react';

export default function AppLayout() {
  const { logout } = useAuth();
  const [theme, setTheme] = React.useState('light');

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const navItemStyle = ({ isActive }) => ({
    display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', 
    textDecoration: 'none', borderRadius: '8px',
    color: isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)',
    background: isActive ? 'var(--color-primary-light)' : 'transparent',
    fontWeight: isActive ? 600 : 400
  });

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--color-bg)' }}>
      <aside style={{ width: '260px', background: 'var(--color-surface)', borderRight: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', padding: '1rem' }}>
        <h2 style={{ padding: '0 1rem', marginBottom: '2rem', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <BookOpen size={24} /> NOTIVA
        </h2>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <NavLink to="/dashboard" style={navItemStyle}><LayoutDashboard size={20} /> Dashboard</NavLink>
          <NavLink to="/academics" style={navItemStyle}><Book size={20} /> Academics</NavLink>
          <NavLink to="/notes" style={navItemStyle}><FileText size={20} /> Notes</NavLink>
          <NavLink to="/study" style={navItemStyle}><BookOpen size={20} /> Study</NavLink>
          <NavLink to="/groups" style={navItemStyle}><Users size={20} /> Groups</NavLink>
          <NavLink to="/trash" style={navItemStyle}><Trash2 size={20} /> Trash</NavLink>
        </nav>
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button onClick={toggleTheme} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', color: 'var(--color-text-secondary)' }}>
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />} {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
          </button>
          <NavLink to="/profile" style={navItemStyle}><User size={20} /> Profile</NavLink>
          <button onClick={logout} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', color: 'var(--color-danger)' }}>
            <LogOut size={20} /> Logout
          </button>
        </div>
      </aside>
      <main style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}