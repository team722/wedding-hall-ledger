import React, { useState } from 'react';
import { useAuth } from '../auth';
import { LogOut, LayoutDashboard, History, Users, PlusCircle, Home, Calendar, ShieldCheck, Eye, MessageSquare, Menu, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const { logout, profile, isAdmin } = useAuth();
  const location = useLocation();
  const [isViewerMenuOpen, setIsViewerMenuOpen] = useState(false);
  const [isAdminSidebarOpen, setIsAdminSidebarOpen] = useState(false);

  const isViewerPortal = location.pathname.startsWith('/viewer');

  const navItems = [
    ...(isViewerPortal ? [{ label: 'Home', icon: Home, path: '/viewer' }] : []),
    { label: 'Event Hub', icon: MessageSquare, path: isViewerPortal ? '/viewer/hub' : '/admin/hub' },

    { label: 'Bookings Ledger', icon: LayoutDashboard, path: isViewerPortal ? '/viewer/ledger' : '/admin' },
    ...(!isViewerPortal && isAdmin ? [
      { label: 'Member Management', icon: Users, path: '/admin/members' },
      { label: 'Audit Logs', icon: History, path: '/admin/logs' },
      { label: 'Switch to Viewer', icon: Eye, path: '/viewer' }
    ] : []),
  ];

  if (isViewerPortal) {
    // Viewer Top Navigation Layout
    return (
      <div className="min-h-screen bg-stone-50 font-sans text-stone-900">
        <header className="bg-white border-b border-stone-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-20">
              <div className="flex items-center">
                <button
                  className="mr-2 md:hidden p-2 text-stone-500 hover:text-stone-900"
                  onClick={() => setIsViewerMenuOpen(!isViewerMenuOpen)}
                >
                  {isViewerMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
                <div className="flex-shrink-0 flex flex-col">
                  <h1 className="text-xl font-serif italic tracking-tight text-stone-900">Wedding Hall Hub</h1>
                  <p className="text-[10px] text-stone-400 uppercase tracking-widest font-bold">Public Viewer Portal</p>
                </div>
                <nav className="hidden md:ml-12 md:flex md:space-x-8">
                  {navItems.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={cn(
                        "inline-flex items-center px-1 pt-1 text-sm font-medium border-b-2 transition-all",
                        location.pathname === item.path
                          ? "border-stone-900 text-stone-900"
                          : "border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300"
                      )}
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>
              </div>
              <div className="flex items-center gap-4">
                {profile ? (
                  <>
                    {isAdmin && (
                      <Link
                        to="/admin"
                        className="hidden md:flex items-center px-3 lg:px-4 py-2 text-[10px] lg:text-xs font-bold uppercase tracking-widest text-stone-900 border border-stone-900 rounded-lg hover:bg-stone-900 hover:text-white transition-all"
                      >
                        <ShieldCheck className="w-3 h-3 mr-2" />
                        Switch to Admin
                      </Link>
                    )}
                    <div className="hidden md:flex flex-col items-end mr-2">
                      <p className="text-sm font-medium text-stone-900">{profile?.displayName}</p>
                      <p className="text-[10px] text-stone-400 uppercase tracking-tighter">{isAdmin ? 'Administrator' : 'Guest Viewer'}</p>
                    </div>
                    <button
                      onClick={logout}
                      className="p-2 text-stone-400 hover:text-stone-900 transition-colors bg-stone-100 rounded-full"
                      title="Logout"
                    >
                      <LogOut className="w-5 h-5" />
                    </button>
                  </>
                ) : (
                  <Link
                    to="/login"
                    className="px-6 py-2 bg-stone-900 text-white rounded-xl text-sm font-medium hover:bg-stone-800 transition-all"
                  >
                    Admin Sign In
                  </Link>
                )}
              </div>
            </div>
          </div>
          {/* Mobile Navigation Menu */}
          {isViewerMenuOpen && (
            <div className="md:hidden bg-white border-t border-stone-100 py-2">
              <div className="flex flex-col space-y-1 px-4">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsViewerMenuOpen(false)}
                    className={cn(
                      "block px-3 py-2 rounded-md text-base font-medium",
                      location.pathname === item.path
                        ? "bg-stone-100 text-stone-900"
                        : "text-stone-500 hover:bg-stone-50 hover:text-stone-900"
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
                {isAdmin && profile && (
                  <Link
                    to="/admin"
                    onClick={() => setIsViewerMenuOpen(false)}
                    className="mt-4 flex items-center px-4 py-3 text-sm font-bold uppercase tracking-widest text-white bg-stone-900 rounded-xl border border-stone-900 shadow-sm"
                  >
                    <ShieldCheck className="w-4 h-4 mr-2" />
                    Switch to Admin Mode
                  </Link>
                )}
              </div>
            </div>
          )}
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
          {children}
        </main>

        <footer style={{ display: "none" }} className="bg-white border-t border-stone-200 py-12 mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <p className="text-stone-400 text-sm font-serif italic">Wedding Hall Ledger & Hub • Public Access Portal</p>
          </div>
        </footer>
      </div>
    );
  }

  // Admin Sidebar Layout
  return (
    <div className="flex flex-col md:flex-row h-screen bg-stone-100 font-sans text-stone-900 overflow-hidden">
      {/* Mobile Top bar */}
      <div className="md:hidden flex items-center justify-between bg-stone-900 text-white px-4 py-4 z-40 relative">
        <div className="flex flex-col">
          <h1 className="text-xl font-serif italic tracking-tight">Super Admin</h1>
          <p className="text-[10px] text-stone-400 uppercase tracking-widest">Management Console</p>
        </div>
        <button onClick={() => setIsAdminSidebarOpen(true)} className="p-2 hover:bg-stone-800 rounded-lg">
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Overlay */}
      {isAdminSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsAdminSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-stone-900 text-stone-100 flex flex-col border-r border-stone-800 transition-transform duration-300 md:relative md:translate-x-0 h-full",
        isAdminSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 hidden md:block">
          <h1 className="text-xl font-serif italic tracking-tight">Super Admin</h1>
          <p className="text-xs text-stone-400 mt-1 uppercase tracking-widest">Management Console</p>
        </div>
        <div className="p-6 md:hidden flex justify-between items-center border-b border-stone-800">
          <h2 className="text-lg font-serif italic">Navigation</h2>
          <button onClick={() => setIsAdminSidebarOpen(false)} className="p-1 hover:bg-stone-800 rounded">
            <X className="w-5 h-5 text-stone-400" />
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-1 mt-4 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors",
                location.pathname === item.path
                  ? "bg-stone-800 text-white"
                  : "text-stone-400 hover:bg-stone-800 hover:text-white"
              )}
            >
              <item.icon className="w-5 h-5 mr-3" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-stone-800">
          <div className="flex items-center px-4 py-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{profile?.displayName}</p>
              <p className="text-xs text-stone-500 truncate uppercase tracking-tighter">Administrator</p>
            </div>
            <button
              onClick={logout}
              className="p-2 text-stone-400 hover:text-white transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-7xl mx-auto pb-20 md:pb-0">
          {children}
        </div>
      </main>
    </div>
  );
}
