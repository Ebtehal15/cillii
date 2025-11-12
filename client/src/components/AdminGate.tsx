import { useState } from 'react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useAdminAccess } from '../context/AdminAccessContext';

interface AdminGateProps {
  children: ReactNode;
}

const DEFAULT_PASSCODE = 'admin123';

const AdminGate = ({ children }: AdminGateProps) => {
  const { isAdmin, authorize } = useAdminAccess();
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();

  if (isAdmin) {
    return <>{children}</>;
  }

  const configuredPasscode = import.meta.env.VITE_ADMIN_PASSCODE ?? DEFAULT_PASSCODE;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (passcode.trim() === configuredPasscode) {
      authorize();
      setError(null);
    } else {
      setError('Incorrect passcode. Please try again.');
    }
  };

  return (
    <div className="panel admin-gate">
      <div className="card">
        <h1>Admin Access</h1>
        <p>
          This area is restricted. Enter the admin passcode to continue.
          {configuredPasscode === DEFAULT_PASSCODE && (
            <em className="admin-gate__hint">
              You can change the passcode by setting <code>VITE_ADMIN_PASSCODE</code> in your environment.
            </em>
          )}
        </p>
        <form className="form" onSubmit={handleSubmit}>
          <label>
            Passcode
            <input
              type="password"
              value={passcode}
              onChange={(event) => setPasscode(event.target.value)}
              autoComplete="current-password"
            />
          </label>
          <button type="submit">
            Unlock Admin
          </button>
          {error && <div className="alert alert--error">{error}</div>}
        </form>
        <p className="admin-gate__meta">
          Requested URL: <code>{location.pathname}</code>
        </p>
      </div>
    </div>
  );
};

export default AdminGate;

