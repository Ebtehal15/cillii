import { NavLink } from 'react-router-dom';
import logoUrl from '../assets/ajlogo.png';
import { useAdminAccess } from '../context/AdminAccessContext';
import useTranslate from '../hooks/useTranslate';

const NavBar = () => {
  const { isAdmin } = useAdminAccess();
  const { language, t, toggleLanguage } = useTranslate();

  const labels = {
    brand: t('Product Catalog', 'كتالوج المنتجات'),
    catalog: t('Catalog', 'الكتالوج'),
    admin: t('Admin', 'الإدارة'),
    toggle: language === 'ar' ? 'English' : 'العربية',
  };

  return (
    <header className="nav">
      <div className="nav__brand">
        <img src={logoUrl} alt="Product Catalog logo" />
        <span>{labels.brand}</span>
      </div>
      <nav className="nav__links">
        <NavLink
          to="/catalog"
          className={({ isActive }: { isActive: boolean }) => (isActive ? 'nav__link nav__link--active' : 'nav__link')}
        >
          {labels.catalog}
        </NavLink>
        {isAdmin && (
          <NavLink
            to="/admin"
            className={({ isActive }: { isActive: boolean }) => (isActive ? 'nav__link nav__link--active' : 'nav__link')}
          >
            {labels.admin}
          </NavLink>
        )}
        <button type="button" className="nav__lang" onClick={toggleLanguage}>
          {labels.toggle}
        </button>
      </nav>
    </header>
  );
};

export default NavBar;
