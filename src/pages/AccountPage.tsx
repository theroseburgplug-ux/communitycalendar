import { useState } from 'react';
import { LoginForm } from '../components/LoginForm';
import { RegisterForm } from '../components/RegisterForm';

interface AccountPageProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (email: string, name: string, password: string) => Promise<void>;
}

export function AccountPage({ onLogin, onRegister }: AccountPageProps) {
  const [tab, setTab] = useState<'signin' | 'signup'>('signin');

  return (
    <main className="shell narrow">
      <div className="stack">
        <nav className="row gap-sm">
          <button
            type="button"
            className={tab === 'signin' ? 'btn btn-solid' : 'btn'}
            onClick={() => setTab('signin')}
          >
            Sign in
          </button>
          <button
            type="button"
            className={tab === 'signup' ? 'btn btn-solid' : 'btn'}
            onClick={() => setTab('signup')}
          >
            Sign up
          </button>
        </nav>
        {tab === 'signin' ? (
          <LoginForm onSubmit={onLogin} />
        ) : (
          <RegisterForm onSubmit={onRegister} />
        )}
      </div>
    </main>
  );
}
