import { useState } from 'react';

interface LoginFormProps {
  onSubmit: (email: string, password: string) => Promise<void>;
}

export function LoginForm({ onSubmit }: LoginFormProps) {
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('ChangeMe123!');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <form
      className="card stack"
      onSubmit={async (event) => {
        event.preventDefault();
        setLoading(true);
        setError(null);
        try {
          await onSubmit(email, password);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Login failed');
        } finally {
          setLoading(false);
        }
      }}
    >
      <div>
        <div className="eyebrow">Admin Access</div>
        <h2>Sign in</h2>
      </div>
      <label>
        Email
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
      </label>
      <label>
        Password
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
      </label>
      {error ? <div className="notice error">{error}</div> : null}
      <button className="btn btn-solid" disabled={loading} type="submit">
        {loading ? 'Signing in...' : 'Sign in'}
      </button>
      <p className="muted">Seeded admin credentials are defined in the README and migration notes.</p>
    </form>
  );
}
