import { useEffect, useState } from 'react';
import { Menu, Bell } from 'lucide-react';
import Badge from '../ui/Badge';
import TickerSearch from '../ui/TickerSearch';
import CommandPalette from './CommandPalette';

export default function TopBar({ onMobileMenuToggle }) {
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <header className="topbar">
        <button className="topbar-menu-btn" onClick={onMobileMenuToggle} aria-label="Open menu">
          <Menu size={18} />
        </button>

        <div className="topbar-search">
          <TickerSearch hideFooter />
        </div>

        <div className="topbar-right">
          <div className="topbar-ticker">
            <Badge variant="bull" live>LIVE</Badge>
            <span>S&amp;P <strong>+0.42%</strong></span>
          </div>
          <button className="ui-btn ui-btn--ghost ui-btn--icon" aria-label="Notifications">
            <Bell size={16} />
          </button>
        </div>
      </header>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </>
  );
}
