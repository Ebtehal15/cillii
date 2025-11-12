import { NavLink } from 'react-router-dom';
import logoUrl from '../assets/ajlogo.png';
import { useAdminAccess } from '../context/AdminAccessContext';

const NavBar = () => {
  const { isAdmin } = useAdminAccess();

  return (
    <header className="nav">
      <div className="nav__brand">
        <img src={logoUrl} alt="Product Manager logo" />
        <span>Product Catalog</span>
      </div>
      <nav className="nav__links">
        <NavLink
          to="/catalog"
          className={({ isActive }: { isActive: boolean }) => (isActive ? 'nav__link nav__link--active' : 'nav__link')}
        >
          Catalog
        </NavLink>
        {isAdmin && (
          <NavLink
            to="/admin"
            className={({ isActive }: { isActive: boolean }) => (isActive ? 'nav__link nav__link--active' : 'nav__link')}
          >
            Admin
          </NavLink>
        )}
      </nav>
    </header>
  );
};

export default NavBar;

