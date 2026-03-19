import { useState } from 'react';

interface RegisterFormProps {
  onSubmit: (email: string, name: string, password: string) => Promise<void>;
}

export function RegisterForm({ onSubmit }: RegisterFormProps) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
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
          await onSubmit(email, name, password);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Registration failed');
        } finally {
          setLoading(false);
        }
      }}
    >
      <div>
        <div className="eyebrow">Organizer Sign Up</div>
        <h2>Create account</h2>
      </div>
      <label>
        Name
        <input value={name} onChange={(e) => setName(e.target.value)} type="text" required />
      </label>
      <label>
        Email
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
      </label>
      <label>
        Password
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required minLength={8} />
      </label>
      {error ? <div className="notice error">{error}</div> : null}
      <button className="btn btn-solid" disabled={loading} type="submit">
        {loading ? 'Creating account...' : 'Create account'}
      </button>
      <p className="muted">New accounts are created as organizers and can submit events for review.</p>
    </form>
  );
}
