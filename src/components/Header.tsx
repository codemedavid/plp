import React, { useEffect, useRef, useState } from 'react';
import { ShoppingCart, Menu, X, User, LogOut, Gift, Settings, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useReferral } from '../hooks/useReferral';
import { useIsAdmin } from '../hooks/useIsAdmin';
import AuthModal from './AuthModal';

interface HeaderProps {
  cartItemsCount: number;
  onCartClick: () => void;
  onMenuClick: () => void;
  onAccountClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ cartItemsCount, onCartClick, onMenuClick, onAccountClick }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { profile } = useReferral();
  const { isAdmin } = useIsAdmin();
  const drawerRef = useRef<HTMLDivElement | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const displayName = profile?.nickname || profile?.full_name || user?.email || '';
  const avatarFallback = (displayName || '?').charAt(0).toUpperCase();

  const openAuth = () => {
    if (onAccountClick) onAccountClick();
    else setAuthOpen(true);
  };

  const goToCatalog = () => {
    onMenuClick();
    if (window.location.pathname !== '/') {
      window.location.href = '/#all-products';
      return;
    }
    setTimeout(() => {
      const el = document.getElementById('all-products');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const navLinks = [
    { label: 'PRODUCTS', href: '/#all-products', onClick: goToCatalog },
    { label: 'PROTOCOLS', href: '/protocols' },
    { label: 'ASSESSMENT', href: '/assessment' },
    { label: 'RESEARCH', href: '/research' },
    { label: 'TRACK ORDER', href: '/track-order' },
    ...(isAdmin ? [{ label: 'ADMIN', href: '/admin' } as { label: string; href: string; onClick?: () => void }] : []),
  ];

  // Mobile drawer accessibility: Escape closes, focus management
  useEffect(() => {
    if (!mobileMenuOpen) return;
    openerRef.current = (document.activeElement as HTMLElement) ?? null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
      if (e.key === 'Tab' && drawerRef.current) {
        const focusables = drawerRef.current.querySelectorAll<HTMLElement>(
          'a, button, input, textarea, select, [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    // Focus the first focusable element in the drawer
    setTimeout(() => {
      const first = drawerRef.current?.querySelector<HTMLElement>(
        'a, button, input, textarea, select, [tabindex]:not([tabindex="-1"])'
      );
      first?.focus();
    }, 0);
    return () => {
      document.removeEventListener('keydown', onKey);
      openerRef.current?.focus?.();
    };
  }, [mobileMenuOpen]);

  return (
    <>
      <header className="sticky top-0 z-50 bg-white border-b border-charcoal-100">
        <div className="container mx-auto px-4 md:px-8 py-5">
          <div className="flex items-center justify-between gap-4">
            {/* Logo */}
            <Link
              to="/"
              onClick={() => { onMenuClick(); setMobileMenuOpen(false); }}
              className="flex items-center gap-2.5 hover:opacity-90 transition-opacity"
              aria-label="Go to homepage"
            >
              <span className="flex flex-col leading-tight items-start">
                <span className="font-heading text-base sm:text-lg font-normal tracking-[0.18em] text-gold-600 uppercase">
                  Peptide
                </span>
                <span className="text-[0.55rem] sm:text-[0.6rem] tracking-[0.28em] uppercase text-gold-600 -mt-0.5 font-medium">
                  Lifestyle Program
                </span>
              </span>
            </Link>

            {/* Center Navigation */}
            <nav className="hidden md:flex items-center gap-6 lg:gap-8 absolute left-1/2 -translate-x-1/2">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={link.onClick ? (e) => { e.preventDefault(); link.onClick?.(); } : undefined}
                  className="text-[11px] font-medium tracking-[0.22em] text-navy-900 hover:text-gold-600 transition-colors flex items-center gap-1"
                >
                  {link.label}
                </a>
              ))}
            </nav>

            {/* Right icons */}
            <div className="flex items-center gap-3 ml-auto lg:ml-0">
              <div className="relative hidden sm:flex">
                <button
                  aria-label="Account"
                  onClick={() => {
                    if (user) {
                      setAccountMenuOpen((v) => !v);
                    } else {
                      openAuth();
                    }
                  }}
                  className="p-2 text-navy-900 hover:text-gold-600 transition-colors flex items-center gap-1"
                >
                  <User className="w-5 h-5" strokeWidth={1.5} />
                </button>
                {user && accountMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-charcoal-100 rounded shadow-lg z-50">
                    <div className="px-4 py-3 border-b border-charcoal-100">
                      <div className="text-[10px] tracking-[0.18em] uppercase text-charcoal-500">Signed in as</div>
                      <div className="text-sm text-navy-900 truncate">{user.email}</div>
                    </div>
                    <Link
                      to="/user/profile"
                      onClick={() => setAccountMenuOpen(false)}
                      className="w-full flex items-center gap-2 px-4 py-3 text-xs tracking-[0.18em] uppercase text-navy-900 hover:bg-cream-light hover:text-gold-600 transition-colors border-b border-charcoal-100"
                    >
                      <Settings className="w-4 h-4" strokeWidth={1.5} />
                      Profile Settings
                    </Link>
                    <Link
                      to="/user/profile"
                      onClick={() => setAccountMenuOpen(false)}
                      className="w-full flex items-center gap-2 px-4 py-3 text-xs tracking-[0.18em] uppercase text-navy-900 hover:bg-cream-light hover:text-gold-600 transition-colors border-b border-charcoal-100"
                    >
                      <Gift className="w-4 h-4" strokeWidth={1.5} />
                      My Rewards
                    </Link>
                    {isAdmin && (
                      <Link
                        to="/admin"
                        onClick={() => setAccountMenuOpen(false)}
                        className="w-full flex items-center gap-2 px-4 py-3 text-xs tracking-[0.18em] uppercase text-navy-900 hover:bg-cream-light hover:text-gold-600 transition-colors border-b border-charcoal-100"
                      >
                        <Shield className="w-4 h-4" strokeWidth={1.5} />
                        Admin
                      </Link>
                    )}
                    <button
                      onClick={async () => {
                        setAccountMenuOpen(false);
                        await signOut();
                      }}
                      className="w-full flex items-center gap-2 px-4 py-3 text-xs tracking-[0.18em] uppercase text-navy-900 hover:bg-cream-light hover:text-gold-600 transition-colors"
                    >
                      <LogOut className="w-4 h-4" strokeWidth={1.5} />
                      Sign out
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={onCartClick}
                className="relative p-2 text-navy-900 hover:text-gold-600 transition-colors"
                aria-label="Cart"
              >
                <ShoppingCart className="w-5 h-5" strokeWidth={1.5} />
                {cartItemsCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-navy-900 text-white text-[10px] font-semibold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                    {cartItemsCount > 99 ? '99+' : cartItemsCount}
                  </span>
                )}
              </button>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-navy-900 hover:text-gold-600 transition-colors"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" strokeWidth={1.5} /> : <Menu className="w-6 h-6" strokeWidth={1.5} />}
              </button>
            </div>
          </div>
        </div>
      </header>

      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 z-[60]"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation"
        >
          <div
            className="absolute inset-0 bg-navy-900/40 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div
            ref={drawerRef}
            className="absolute top-0 right-0 bottom-0 w-[300px] bg-white shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-charcoal-100">
              <div className="flex items-center gap-2">
                <span className="flex flex-col leading-tight">
                  <span className="font-heading text-sm tracking-[0.18em] text-gold-600 uppercase">Peptide</span>
                  <span className="text-[0.55rem] tracking-[0.28em] uppercase text-gold-600 -mt-0.5">Lifestyle Program</span>
                </span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 text-navy-900 hover:text-gold-600 transition-colors"
              >
                <X className="w-5 h-5" strokeWidth={1.5} />
              </button>
            </div>

            {user && (
              <Link
                to="/user/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 p-5 border-b border-charcoal-100 bg-cream-light hover:bg-gold-50 transition-colors"
              >
                <div className="w-14 h-14 rounded-full bg-gold-100 border border-gold-200 overflow-hidden flex items-center justify-center text-xl font-heading text-navy-900 flex-shrink-0">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span>{avatarFallback}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] uppercase tracking-[0.22em] text-gold-600">Signed in</div>
                  <div className="font-heading text-navy-900 truncate text-sm">{displayName}</div>
                  <div className="text-[11px] text-charcoal-500 truncate">{user.email}</div>
                </div>
                <Settings className="w-4 h-4 text-charcoal-500 flex-shrink-0" strokeWidth={1.5} />
              </Link>
            )}

            <nav className="flex-1 overflow-y-auto p-4">
              <div className="flex flex-col">
                {user && (
                  <>
                    <Link
                      to="/user/profile"
                      onClick={() => setMobileMenuOpen(false)}
                      className="px-4 py-4 text-xs font-medium tracking-[0.22em] text-navy-900 hover:text-gold-600 hover:bg-cream-light transition-colors border-b border-charcoal-100 flex items-center gap-2"
                    >
                      <Settings className="w-4 h-4" strokeWidth={1.5} /> PROFILE SETTINGS
                    </Link>
                    <Link
                      to="/user/profile"
                      onClick={() => setMobileMenuOpen(false)}
                      className="px-4 py-4 text-xs font-medium tracking-[0.22em] text-navy-900 hover:text-gold-600 hover:bg-cream-light transition-colors border-b border-charcoal-100 flex items-center gap-2"
                    >
                      <Gift className="w-4 h-4" strokeWidth={1.5} /> MY REWARDS
                    </Link>
                  </>
                )}
                {navLinks.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    onClick={(e) => {
                      if (link.onClick) { e.preventDefault(); link.onClick(); }
                      setMobileMenuOpen(false);
                    }}
                    className="px-4 py-4 text-xs font-medium tracking-[0.22em] text-navy-900 hover:text-gold-600 hover:bg-cream-light transition-colors border-b border-charcoal-100"
                  >
                    {link.label}
                  </a>
                ))}
                {user ? (
                  <button
                    onClick={async () => { setMobileMenuOpen(false); await signOut(); }}
                    className="px-4 py-4 text-xs font-medium tracking-[0.22em] text-navy-900 hover:text-gold-600 hover:bg-cream-light transition-colors border-b border-charcoal-100 text-left flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" strokeWidth={1.5} /> SIGN OUT
                  </button>
                ) : (
                  <button
                    onClick={() => { setMobileMenuOpen(false); openAuth(); }}
                    className="px-4 py-4 text-xs font-medium tracking-[0.22em] text-navy-900 hover:text-gold-600 hover:bg-cream-light transition-colors border-b border-charcoal-100 text-left flex items-center gap-2"
                  >
                    <User className="w-4 h-4" strokeWidth={1.5} /> SIGN IN
                  </button>
                )}
              </div>
            </nav>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
