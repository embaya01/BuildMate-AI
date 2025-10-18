import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export const RegisterPage = () => {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await signUp(email.trim(), password, fullName.trim());
      navigate('/dashboard', { replace: true });
    } catch (registrationError) {
      setError('We could not create your account. Please try again.');
      console.error(registrationError);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-panel auth-panel--welcome">
        <div className="auth-panel__badge">ScopeSmart</div>
        <h1>Join ScopeSmart</h1>
        <p>Spin up your account and start crafting accurate bids with AI-powered confidence.</p>
        <ul className="auth-panel__list">
          <li>Predictive cost intelligence on every proposal</li>
          <li>Real-time collaboration with estimators & finance</li>
          <li>Library of customizable bid-ready templates</li>
        </ul>
      </div>

      <div className="auth-panel auth-panel--form">
        <div className="auth-panel__head">
          <h2>Create account</h2>
          <p>Get full access in minutes—no credit card required.</p>
        </div>

        {error ? (
          <p className="auth-error" role="alert">
            {error}
          </p>
        ) : null}

        <form className="auth-form auth-form--stacked" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>Full name</span>
            <input
              type="text"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              required
              autoComplete="name"
            />
          </label>
          <label className="auth-field">
            <span>Work email</span>
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
              minLength={8}
              autoComplete="new-password"
            />
          </label>
          <button className="button button--glow auth-submit" type="submit" disabled={submitting}>
            {submitting ? 'Creating account…' : 'Start building bids'}
          </button>
        </form>

        <p className="auth-footer">
          Already part of ScopeSmart? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
};
