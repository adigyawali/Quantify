import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { cx } from '../../lib/format';
import './layout.css';

export default function AppShell() {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sb_collapsed') === '1');
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    localStorage.setItem('sb_collapsed', collapsed ? '1' : '0');
  }, [collapsed]);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  return (
    <div className={cx('app-shell', collapsed && 'app-shell--collapsed')}>
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((c) => !c)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className="app-shell-main">
        <TopBar onMobileMenuToggle={() => setMobileOpen(true)} />
        <main className="app-content">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
