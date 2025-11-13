import { useState } from 'react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useAdminAccess } from '../context/AdminAccessContext';
import useTranslate from '../hooks/useTranslate';

interface AdminGateProps {
  children: ReactNode;
}

const DEFAULT_PASSCODE = 'admin123';

const AdminGate = ({ children }: AdminGateProps) => {
  const { isAdmin, authorize } = useAdminAccess();
  const { t } = useTranslate();
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
      setError(t('Incorrect passcode. Please try again.', 'رمز المرور غير صحيح. حاول مرة أخرى.', 'Contraseña incorrecta. Inténtalo de nuevo.'));
    }
  };

  return (
    <div className="panel admin-gate">
      <div className="card">
        <h1>{t('Admin Access', 'وصول الإدارة', 'Acceso de Administrador')}</h1>
        <p>
          {t(
            'This area is restricted. Enter the admin passcode to continue.',
            'هذا القسم مخصص للإدارة. أدخل رمز المرور للمتابعة.',
            'Esta área es restringida. Introduce la contraseña de administrador para continuar.',
          )}
          {configuredPasscode === DEFAULT_PASSCODE && (
            <em className="admin-gate__hint">
              {t(
                'You can change the passcode by setting',
                'يمكنك تغيير رمز المرور من خلال ضبط',
                'Puedes cambiar la contraseña configurando',
              )}
              {' '}
              <code>VITE_ADMIN_PASSCODE</code>
              {' '}
              {t('in your environment.', 'في ملف بيئة التشغيل.', 'en tu entorno.')}
            </em>
          )}
        </p>
        <form className="form" onSubmit={handleSubmit}>
          <label>
            {t('Passcode', 'رمز المرور', 'Contraseña')}
            <input
              type="password"
              value={passcode}
              onChange={(event) => setPasscode(event.target.value)}
              autoComplete="current-password"
            />
          </label>
          <button type="submit">
            {t('Unlock Admin', 'فتح لوحة الإدارة', 'Desbloquear Admin')}
          </button>
          {error && <div className="alert alert--error">{error}</div>}
        </form>
        <p className="admin-gate__meta">
          {t('Requested URL:', 'الرابط المطلوب:', 'URL solicitada:')}
          {' '}
          <code>{location.pathname}</code>
        </p>
      </div>
    </div>
  );
};

export default AdminGate;

