import { useState } from 'react';

interface RegisterFormProps {
  onSubmit: (name: string, email: string, password: string) => Promise<void>;
  onShowLogin: () => void;
}

export function RegisterForm({ onSubmit, onShowLogin }: RegisterFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
          await onSubmit(name, email, password);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Registration failed');
        } finally {
          setLoading(false);
        }
      }}
    >
      <div>
        <div className="eyebrow">Organizer Signup</div>
        <h2>Create an account</h2>
        <p className="muted">Register as an event organizer to submit events for review.</p>
      </div>
      <label>
        Name
        <input value={name} onChange={(e) => setName(e.target.value)} required />
      </label>
      <label>
        Email
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
      </label>
      <label>
        Password
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" minLength={8} required />
      </label>
      {error ? <div className="notice error">{error}</div> : null}
      <button className="btn btn-solid" disabled={loading} type="submit">
        {loading ? 'Creating account...' : 'Create account'}
      </button>
      <p className="muted">
        Already have an account?{' '}
        <button type="button" className="btn" onClick={onShowLogin}>
          Sign in
        </button>
      </p>
    </form>
  );
}
