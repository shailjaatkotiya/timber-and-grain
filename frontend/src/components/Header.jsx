import { Link, NavLink } from 'react-router-dom';
import { useSelector } from 'react-redux';

export default function Header({ transparent }) {
  const count = useSelector((s) => s.cart.item_count);
  const user = useSelector((s) => s.auth.user);
  const signedIn = user && !user.is_guest;
  return (
    <header className={`site-header ${transparent ? 'transparent' : ''}`}>
      <Link to="/" className="brand"><svg className="brand-mark" width="22" height="22" viewBox="0 0 22 22" aria-hidden="true"><circle cx="11" cy="11" r="9.5" fill="none" stroke="currentColor" strokeWidth="1.6"/><path d="M11 1.5a9.5 9.5 0 0 1 0 19z" fill="currentColor"/></svg> Timber &amp; Grain</Link>
      <nav>
        <NavLink to="/shop?category=table">Tables</NavLink>
        <NavLink to="/shop?category=chair">Chairs</NavLink>
        <NavLink to="/contact" className="nav-contact">Contact</NavLink>
        <NavLink to={signedIn || user?.mobile ? '/account' : '/login'}>
          {signedIn ? (user.name?.split(' ')[0] || 'Account') : user?.mobile ? 'Guest' : 'Log in'}
        </NavLink>
        <NavLink to="/cart" className="cart-link" aria-label={`Cart, ${count} items`}>
          Cart{count > 0 && <span className="badge">{count}</span>}
        </NavLink>
      </nav>
    </header>
  );
}
