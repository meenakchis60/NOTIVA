import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { User as UserIcon } from 'lucide-react';
import useAuth from '../../hooks/useAuth';

export default function AppLayout() {
  const location = useLocation();
  const { user, logout } = useAuth();
  
  const displayName = user?.first_name 
    ? `${user.first_name} ${user.last_name || ''}`.trim() 
    : 'Meenakchi S';

  const navLinks = [
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Notes', path: '/notes' },
    { name: 'Notebooks', path: '/notebooks' },
    { name: 'Search', path: '/search' },
    { name: 'Reminders', path: '/reminders' },
    { name: 'Profile', path: '/profile' }
  ];

  return (
    <div className="flex-col min-h-screen" style={{ background: 'var(--color-bg)' }}>
      {/* Top Header */}
      <header className="bg-surface shadow-sm border-bottom">
        <div className="w-full max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-2xl font-bold text-primary m-0">NOTIVA</h1>
              <p className="text-muted text-sm m-0 mt-1">Organize your notes. Build your future.</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="font-medium flex items-center gap-2">
              <UserIcon size={18} className="text-primary"/> Hello, {displayName}
            </span>
            <button onClick={logout} className="btn-secondary text-sm px-3 py-1">Logout</button>
          </div>
        </div>
        
        {/* Top Navigation Bar */}
        <div className="w-full max-w-7xl mx-auto px-6">
          <nav className="flex gap-6 py-3">
            {navLinks.map((link) => (
              <Link 
                key={link.name} 
                to={link.path}
                className={`font-medium transition-colors ${location.pathname.includes(link.path) ? 'text-primary' : 'text-muted hover:text-primary'}`}
                style={{ paddingBottom: '0.5rem', borderBottom: location.pathname.includes(link.path) ? '2px solid var(--color-primary)' : '2px solid transparent' }}
              >
                {link.name}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-surface border-top mt-auto">
        <div className="w-full max-w-7xl mx-auto px-6 py-4 text-center text-muted text-sm">
          @2026 Notiva
        </div>
      </footer>
    </div>
  );
}