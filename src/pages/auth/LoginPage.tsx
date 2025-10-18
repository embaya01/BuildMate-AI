import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface LocationState {
  from?: {
    pathname?: string;
  };
}

export const LoginPage = () => {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | undefined;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
      const redirect = state?.from?.pathname ?? '/dashboard';
      navigate(redirect, { replace: true });
    } catch (signInError) {
      setError('Unable to sign in. Please verify your credentials and try again.');
      console.error(signInError);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-panel auth-panel--welcome">
        <div className="auth-panel__badge">ScopeSmart</div>
        <h1>Welcome back</h1>
        <p>Enter your credentials to access your estimating control center.</p>
        <div className="auth-panel__testimonial">
          <blockquote>
            “ScopeSmart saves us hours on every bid. The login is where predictability begins.”
          </blockquote>
          <cite>— HartBuild Pre-Con Team</cite>
        </div>
      </div>
      <div className="auth-panel auth-panel--form">
        <div className="auth-panel__head">
          <h2>Log in</h2>
          <p>Use your email and password to continue.</p>
        </div>

        {error ? (
          <p className="auth-error" role="alert">
            {error}
          </p>
        ) : null}

        <form className="auth-form auth-form--stacked" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
            />
          </label>
          <label className="auth-field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              autoComplete="current-password"
            />
          </label>
          <button className="button button--glow auth-submit" type="submit" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Access workspace'}
          </button>
        </form>

        <p className="auth-footer">
          New to ScopeSmart? <Link to="/register">Create an account</Link>
        </p>
      </div>
    </div>
  );
};
