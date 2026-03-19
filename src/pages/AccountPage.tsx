import { useState } from 'react';
import { LoginForm } from '../components/LoginForm';
import { RegisterForm } from '../components/RegisterForm';

interface AccountPageProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (email: string, name: string, password: string) => Promise<void>;
}

export function AccountPage({ onLogin, onRegister }: AccountPageProps) {
  const [tab, setTab] = useState<'login' | 'register'>('login');

  return (
    <main className="shell narrow">
      <div className="stack-lg" style={{ paddingTop: '1.5rem' }}>
        <div className="card">
          <div className="row gap-sm">
            <button
              type="button"
              className={tab === 'login' ? 'btn btn-solid' : 'btn'}
              onClick={() => setTab('login')}
            >
              Sign in
            </button>
            <button
              type="button"
              className={tab === 'register' ? 'btn btn-solid' : 'btn'}
              onClick={() => setTab('register')}
            >
              Create account
            </button>
          </div>
        </div>
        {tab === 'login' ? (
          <LoginForm onSubmit={onLogin} />
        ) : (
          <RegisterForm onSubmit={onRegister} />
        )}
      </div>
    </main>
  );
}
