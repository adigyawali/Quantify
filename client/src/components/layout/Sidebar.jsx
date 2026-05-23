import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  TrendingUp,
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
  const initial = (user?.username || '?').slice(0, 1).toUpperCase();

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
          <div className="sidebar-mark">
            <TrendingUp size={18} strokeWidth={2.5} />
          </div>
          <span className="sidebar-wordmark">Sentivest</span>
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
                <span className="sidebar-user-name">{user.username}</span>
                <span className="sidebar-user-role">Pro Trader</span>
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
