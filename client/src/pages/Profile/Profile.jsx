import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Shield, Bell, Palette, Database, Trash2 } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { useAuth } from '../../lib/auth';
import { cx } from '../../lib/format';
import { setWatchlist } from '../../lib/watchlist';
import './Profile.css';

function Toggle({ on, onChange }) {
  return (
    <button
      className={cx('toggle', on && 'toggle--on')}
      onClick={() => onChange?.(!on)}
      aria-pressed={on}
    />
  );
}

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [notif, setNotif] = useState(true);
  const [animations, setAnimations] = useState(true);
  const [compact, setCompact] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const initial = (user?.username || '?').slice(0, 1).toUpperCase();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const resetLocal = () => {
    setWatchlist([]);
    localStorage.removeItem('sb_collapsed');
    setConfirmReset(false);
  };

  return (
    <div className="profile">
      {/* Hero */}
      <div className="profile-hero">
        <div className="profile-avatar">{initial}</div>
        <div className="profile-greet">
          <div className="profile-name">{user?.username || 'You'}</div>
          <div className="profile-handle">@{user?.username || 'guest'}</div>
          <div className="profile-tags">
            <Badge variant="brand">Pro trader</Badge>
            <Badge variant="bull" live>Active</Badge>
          </div>
        </div>
        <Button variant="bear" leading={<LogOut size={14} />} onClick={() => setConfirmLogout(true)}>
          Sign out
        </Button>
      </div>

      {/* Account */}
      <Card className="settings-section">
        <h3><Shield size={16} style={{ display: 'inline', marginRight: 8, verticalAlign: -2 }} /> Account</h3>
        <div className="settings-row">
          <div className="settings-row-meta">
            <span className="settings-row-label">Username</span>
            <span className="settings-row-desc">Your unique handle — used to sign in.</span>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
            {user?.username || '—'}
          </div>
        </div>
        <div className="settings-row">
          <div className="settings-row-meta">
            <span className="settings-row-label">Session</span>
            <span className="settings-row-desc">JWT, valid for 2 hours after sign-in.</span>
          </div>
          <Badge variant="bull">Authenticated</Badge>
        </div>
        <div className="settings-row">
          <div className="settings-row-meta">
            <span className="settings-row-label">Password</span>
            <span className="settings-row-desc">Password change is coming soon.</span>
          </div>
          <Button variant="secondary" size="sm" disabled>Change</Button>
        </div>
      </Card>

      {/* Preferences */}
      <Card className="settings-section">
        <h3><Palette size={16} style={{ display: 'inline', marginRight: 8, verticalAlign: -2 }} /> Preferences</h3>
        <div className="settings-row">
          <div className="settings-row-meta">
            <span className="settings-row-label">
              <Bell size={12} style={{ display: 'inline', marginRight: 6, verticalAlign: -1, color: 'var(--text-tertiary)' }} />
              Push notifications
            </span>
            <span className="settings-row-desc">Get pinged when sentiment shifts on watched tickers.</span>
          </div>
          <Toggle on={notif} onChange={setNotif} />
        </div>
        <div className="settings-row">
          <div className="settings-row-meta">
            <span className="settings-row-label">Animations</span>
            <span className="settings-row-desc">Spring-physics interactions and chart draw-ins.</span>
          </div>
          <Toggle on={animations} onChange={setAnimations} />
        </div>
        <div className="settings-row">
          <div className="settings-row-meta">
            <span className="settings-row-label">Compact density</span>
            <span className="settings-row-desc">Tighter spacing for power users.</span>
          </div>
          <Toggle on={compact} onChange={setCompact} />
        </div>
      </Card>

      {/* Data */}
      <Card className="settings-section">
        <h3><Database size={16} style={{ display: 'inline', marginRight: 8, verticalAlign: -2 }} /> Data</h3>
        <div className="settings-row">
          <div className="settings-row-meta">
            <span className="settings-row-label">Reset local preferences</span>
            <span className="settings-row-desc">Clears your watchlist and UI preferences from this device. Portfolio is not affected.</span>
          </div>
          <Button variant="bear" size="sm" leading={<Trash2 size={14} />} onClick={() => setConfirmReset(true)}>
            Reset
          </Button>
        </div>
      </Card>

      <Modal open={confirmLogout} onClose={() => setConfirmLogout(false)} title="Sign out?" subtitle="You'll need your password to come back.">
        <div className="ui-modal-actions">
          <Button variant="ghost" onClick={() => setConfirmLogout(false)}>Cancel</Button>
          <Button variant="bear" leading={<LogOut size={14} />} onClick={handleLogout}>Sign out</Button>
        </div>
      </Modal>

      <Modal open={confirmReset} onClose={() => setConfirmReset(false)} title="Reset local data?" subtitle="Watchlist and layout preferences will be cleared on this device.">
        <div className="ui-modal-actions">
          <Button variant="ghost" onClick={() => setConfirmReset(false)}>Cancel</Button>
          <Button variant="bear" leading={<Trash2 size={14} />} onClick={resetLocal}>Reset</Button>
        </div>
      </Modal>
    </div>
  );
}
