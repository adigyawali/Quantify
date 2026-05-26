import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Eye, EyeOff, User, Lock, Mail, ArrowRight, AlertCircle, CheckCircle2, UserCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AuthLayout from './AuthLayout';
import Input, { Field } from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import { useAuth } from '../../lib/auth';
import { cx } from '../../lib/format';
import './Auth.css';

function scorePassword(pw) {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return Math.min(s, 3);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Signup() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);

  const { signup } = useAuth();
  const navigate = useNavigate();

  const score = useMemo(() => scorePassword(password), [password]);
  const scoreLabel = ['Empty', 'Weak', 'Medium', 'Strong'][score];
  const scoreKey = ['weak', 'weak', 'medium', 'strong'][score];

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!firstName.trim() || !lastName.trim()) return setError('Please enter your full name.');
    if (!EMAIL_RE.test(email.trim())) return setError('Enter a valid email address.');
    if (!username.trim()) return setError('Pick a username.');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (password !== confirm) return setError('Passwords do not match.');
    if (!agreed) return setError('You must agree to the Terms and Privacy Policy to continue.');

    setBusy(true);
    try {
      await signup({
        username: username.trim(),
        password,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim().toLowerCase(),
      });
      setSuccess('Account created. Taking you to your dashboard…');
      setTimeout(() => navigate('/dashboard', { replace: true }), 600);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        (err.response?.status === 409 ? 'That account already exists.' : 'Could not create account. Try again.')
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      sub="Sign up free — your portfolio and watchlists stay private to you."
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
          {success && (
            <motion.div
              className="auth-success"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <CheckCircle2 size={16} /> {success}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="auth-row">
          <Field label="First name">
            <Input
              leading={<UserCircle size={16} />}
              placeholder="Jane"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoComplete="given-name"
              autoFocus
            />
          </Field>
          <Field label="Last name">
            <Input
              leading={<UserCircle size={16} />}
              placeholder="Doe"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              autoComplete="family-name"
            />
          </Field>
        </div>

        <Field label="Email">
          <Input
            type="email"
            leading={<Mail size={16} />}
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            inputMode="email"
          />
        </Field>

        <Field label="Username">
          <Input
            leading={<User size={16} />}
            placeholder="choose_a_handle"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
          />
        </Field>

        <Field label="Password">
          <Input
            type={showPw ? 'text' : 'password'}
            leading={<Lock size={16} />}
            placeholder="at least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
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
          <div className="pw-strength">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={cx('pw-strength-seg', i < score && `on-${scoreKey}`)}
              />
            ))}
          </div>
          <div className="pw-strength-label">{password ? `Strength: ${scoreLabel}` : ' '}</div>
        </Field>

        <Field label="Confirm Password">
          <Input
            type={showPw ? 'text' : 'password'}
            leading={<Lock size={16} />}
            placeholder="re-enter password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            error={confirm && confirm !== password}
          />
        </Field>

        <label className="auth-agree">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            aria-required="true"
          />
          <span>
            I agree to the{' '}
            <Link to="/terms" target="_blank" rel="noopener noreferrer">Terms &amp; Conditions</Link>
            {' '}and{' '}
            <Link to="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</Link>.
          </span>
        </label>

        <Button
          type="submit"
          size="lg"
          block
          disabled={busy || !agreed}
          trailing={busy ? <Spinner size="sm" /> : <ArrowRight size={16} />}
        >
          {busy ? 'Creating…' : 'Create account'}
        </Button>
      </form>

      <div className="auth-divider">or</div>

      <Button as={Link} to="/login" variant="secondary" size="lg" block>
        I already have an account
      </Button>
    </AuthLayout>
  );
}
