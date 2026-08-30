import os

base_dir = r"C:\Users\meena\OneDrive\Desktop\New folder (2)\notiva_frontend\src"

files = {
    "styles/themes.css": """
:root, [data-theme="light"] {
  --color-bg: #f8fafc;
  --color-bg-secondary: #f1f5f9;
  --color-surface: #ffffff;
  --color-surface-raised: #f1f5f9;
  --color-text-primary: #0f172a;
  --color-text-secondary: #475569;
  --color-text-muted: #94a3b8;
  --color-primary: #3b82f6;
  --color-primary-hover: #2563eb;
  --color-primary-light: #eff6ff;
  --color-border: #e2e8f0;
  --color-danger: #ef4444;
  --color-success: #22c55e;
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --shadow-md: 0 4px 6px -1px rgba(0,0,0,0.1);
}

[data-theme="dark"] {
  --color-bg: #0f172a;
  --color-bg-secondary: #1e293b;
  --color-surface: #1e293b;
  --color-surface-raised: #334155;
  --color-text-primary: #f8fafc;
  --color-text-secondary: #cbd5e1;
  --color-text-muted: #64748b;
  --color-primary: #3b82f6;
  --color-primary-hover: #60a5fa;
  --color-primary-light: #1e3a8a;
  --color-border: #334155;
  --color-danger: #f87171;
  --color-success: #4ade80;
}
""",
    "styles/globals.css": """
@import './themes.css';

* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: 'Inter', system-ui, sans-serif;
  background-color: var(--color-bg);
  color: var(--color-text-primary);
  line-height: 1.5;
}
a { color: var(--color-primary); text-decoration: none; }
button { cursor: pointer; border: none; background: none; font-family: inherit; }
.btn-primary { background: var(--color-primary); color: #fff; padding: 0.5rem 1rem; border-radius: 6px; font-weight: 500; }
.btn-primary:hover { background: var(--color-primary-hover); }
.btn-danger { background: var(--color-danger); color: #fff; padding: 0.5rem 1rem; border-radius: 6px; font-weight: 500; }
.card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 8px; padding: 1rem; box-shadow: var(--shadow-sm); }
input, select, textarea { padding: 0.5rem; border: 1px solid var(--color-border); border-radius: 6px; background: var(--color-bg); color: var(--color-text-primary); }
""",
    "components/layout/AppLayout.jsx": """
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
""",
}

for path, content in files.items():
    full_path = os.path.join(base_dir, path.replace("/", "\\"))
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(content.strip())
        
print("Scaffolding complete.")
