import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Briefcase,
  Star,
  Search,
  User,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cx } from '../../lib/format';
import { useAuth } from '../../lib/auth';
import { BrandMark } from '../ui/BrandMark';

const NAV_PRIMARY = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/search',    label: 'Discover',  icon: Search },
  { to: '/portfolio', label: 'Portfolio', icon: Briefcase },
  { to: '/watchlist', label: 'Watchlist', icon: Star },
];

const NAV_SECONDARY = [
  { to: '/profile', label: 'Settings', icon: User },
];

export default function Sidebar({ collapsed, onToggleCollapse, mobileOpen, onMobileClose }) {
  const { user } = useAuth();
  const displayName =
    user?.displayName ||
    [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim() ||
    user?.username ||
    '';
  const initial = (() => {
    const parts = displayName.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (user?.username || '?').slice(0, 1).toUpperCase();
  })();

  return (
    <>
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="sidebar-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onMobileClose}
          />
        )}
      </AnimatePresence>

      <aside className={cx('sidebar', collapsed && 'sidebar--collapsed', mobileOpen && 'sidebar--open')}>
        <NavLink to={user ? '/dashboard' : '/'} className="sidebar-brand" onClick={onMobileClose}>
          <BrandMark size={34} />
          <span className="sidebar-wordmark">Tickr</span>
        </NavLink>

        <nav className="sidebar-section">
          {!collapsed && <div className="sidebar-section-title">Workspace</div>}
          <div className="sidebar-nav">
            {NAV_PRIMARY.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onMobileClose}
                className={({ isActive }) => cx('sidebar-item', isActive && 'sidebar-item--active')}
              >
                <span className="sidebar-item-icon"><item.icon size={18} /></span>
                <span className="sidebar-item-label">{item.label}</span>
              </NavLink>
            ))}
          </div>
        </nav>

        <nav className="sidebar-section">
          {!collapsed && <div className="sidebar-section-title">Account</div>}
          <div className="sidebar-nav">
            {NAV_SECONDARY.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onMobileClose}
                className={({ isActive }) => cx('sidebar-item', isActive && 'sidebar-item--active')}
              >
                <span className="sidebar-item-icon"><item.icon size={18} /></span>
                <span className="sidebar-item-label">{item.label}</span>
              </NavLink>
            ))}
          </div>
        </nav>

        <div style={{ marginTop: 'auto', padding: '0 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {user && (
            <NavLink to="/profile" className="sidebar-user" onClick={onMobileClose}>
              <div className="sidebar-user-avatar">{initial}</div>
              <div className="sidebar-user-meta">
                <span className="sidebar-user-name" title={displayName}>{displayName}</span>
                <span className="sidebar-user-role">@{user.username}</span>
              </div>
            </NavLink>
          )}
          <button className="sidebar-collapse-btn" onClick={onToggleCollapse} aria-label="Collapse sidebar">
            <span className="sidebar-item-icon">
              {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </span>
            {!collapsed && <span className="sidebar-item-label">Collapse</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
