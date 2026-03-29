import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from './SupabaseProvider';
import { Menu, X, LogIn, LogOut, LayoutDashboard, Search, Moon, Sun } from 'lucide-react';
import { cn } from '../lib/utils';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAdmin, signOut } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-bg flex flex-col font-sans">
      <nav className="bg-surface border-b border-border sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-8">
              <Link to="/" className="text-2xl font-black font-serif text-text tracking-tight">
                The <span className="text-accent">Chronicle</span>
              </Link>
              <nav className="hidden md:flex items-center gap-2">
                <NavLink to="/" className={({ isActive }) => cn("px-4 py-2 rounded text-sm font-medium transition-all hover:text-accent hover:bg-accent-light", isActive ? "text-accent bg-accent-light" : "text-text2")}>Home</NavLink>
                <NavLink to="/about" className={({ isActive }) => cn("px-4 py-2 rounded text-sm font-medium transition-all hover:text-accent hover:bg-accent-light", isActive ? "text-accent bg-accent-light" : "text-text2")}>About</NavLink>
                <NavLink to="/contact" className={({ isActive }) => cn("px-4 py-2 rounded text-sm font-medium transition-all hover:text-accent hover:bg-accent-light", isActive ? "text-accent bg-accent-light" : "text-text2")}>Contact</NavLink>
              </nav>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center bg-bg2 border border-border rounded px-3 py-1.5 focus-within:bg-surface focus-within:border-accent transition-all group">
                <input type="text" placeholder="Search posts..." className="bg-transparent border-none outline-none text-sm text-text w-40 focus:w-56 transition-all" />
                <Search className="w-4 h-4 text-text3 group-focus-within:text-accent" />
              </div>
              
              {user && isAdmin && (
                <Link to="/admin" className="hidden md:flex items-center gap-2 text-sm font-bold text-accent hover:text-accent/80 transition-colors">
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </Link>
              )}

              <button className="md:hidden p-2 text-text2 hover:text-text transition-colors" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-surface border-b border-border py-4 px-4 space-y-2">
            <NavLink to="/" className="block px-4 py-2 rounded text-base font-medium text-text2" onClick={() => setIsMenuOpen(false)}>Home</NavLink>
            <NavLink to="/about" className="block px-4 py-2 rounded text-base font-medium text-text2" onClick={() => setIsMenuOpen(false)}>About</NavLink>
            <NavLink to="/contact" className="block px-4 py-2 rounded text-base font-medium text-text2" onClick={() => setIsMenuOpen(false)}>Contact</NavLink>
            {isAdmin && (
              <Link to="/admin" className="block px-4 py-2 rounded text-base font-bold text-accent" onClick={() => setIsMenuOpen(false)}>Admin Dashboard</Link>
            )}
          </div>
        )}
      </nav>

      <main className="flex-grow w-full">
        {children}
      </main>

      <footer className="bg-text text-bg border-t border-border py-16 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            <div className="col-span-1 md:col-span-2">
              <Link to="/" className="text-2xl font-black font-serif text-bg">
                The <span className="text-accent">Chronicle</span>
              </Link>
              <p className="mt-4 text-bg/60 text-sm max-w-xs leading-relaxed">
                Thoughtful articles on technology, culture, design, and everything in between.
              </p>
            </div>
            <div>
              <h3 className="text-xs font-bold text-bg/50 uppercase tracking-widest">Navigation</h3>
              <ul className="mt-6 space-y-3">
                <li><Link to="/" className="text-sm text-bg/70 hover:text-accent transition-colors">Home</Link></li>
                <li><Link to="/about" className="text-sm text-bg/70 hover:text-accent transition-colors">About Us</Link></li>
                <li><Link to="/contact" className="text-sm text-bg/70 hover:text-accent transition-colors">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-bold text-bg/50 uppercase tracking-widest">Admin</h3>
              <ul className="mt-6 space-y-3">
                {isAdmin && (
                  <li><Link to="/admin" className="text-sm text-bg/70 hover:text-accent transition-colors">Dashboard</Link></li>
                )}
                <li>
                  {user ? (
                    <button 
                      onClick={signOut} 
                      className="text-sm text-bg/70 hover:text-accent transition-colors"
                    >
                      Sign Out
                    </button>
                  ) : (
                    <Link 
                      to="/login" 
                      className="text-sm text-bg/70 hover:text-accent transition-colors"
                    >
                      Admin Login
                    </Link>
                  )}
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-16 border-t border-bg/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-bg/40">
              &copy; {new Date().getFullYear()} The Chronicle. All rights reserved.
            </p>
            <p className="text-sm text-bg/40">Built with ❤️</p>
          </div>
        </div>
      </footer>
    </div>
  );
};
