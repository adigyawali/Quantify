import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, User, Lock, ArrowRight, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AuthLayout from './AuthLayout';
import Input, { Field } from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import { useAuth } from '../../lib/auth';
import './Auth.css';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  const submit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please enter your username and password.');
      return;
    }
    setError('');
    setBusy(true);
    try {
      await login(username.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.status === 401
        ? 'Invalid username or password.'
        : err.response?.data?.Message || err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      sub="Sign in to your terminal and pick up where you left off."
    >
      <form onSubmit={submit} className="auth-form">
        <AnimatePresence>
          {error && (
            <motion.div
              className="auth-error"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <AlertCircle size={16} /> {error}
            </motion.div>
          )}
        </AnimatePresence>

        <Field label="Username">
          <Input
            leading={<User size={16} />}
            placeholder="your_username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            autoFocus
          />
        </Field>

        <Field label="Password">
          <Input
            type={showPw ? 'text' : 'password'}
            leading={<Lock size={16} />}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            trailing={
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                style={{ display: 'flex', color: 'var(--text-tertiary)' }}
                aria-label={showPw ? 'Hide password' : 'Show password'}
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            }
          />
        </Field>

        <Button
          type="submit"
          size="lg"
          block
          disabled={busy}
          trailing={busy ? <Spinner size="sm" /> : <ArrowRight size={16} />}
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      <div className="auth-divider">or</div>

      <Button
        as={Link}
        to="/signup"
        variant="secondary"
        size="lg"
        block
      >
        Create an account
      </Button>

      <div className="auth-foot">
        By signing in you agree to our <span style={{ color: 'var(--brand-300)', fontWeight: 600 }}>Terms</span> and <span style={{ color: 'var(--brand-300)', fontWeight: 600 }}>Privacy Policy</span>.
      </div>
    </AuthLayout>
  );
}
