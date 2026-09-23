import { Link } from 'react-router-dom';
import { STORE, addressText, mailHref, mapHref, telHref, waHref } from '../siteConfig';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-grid">
        <div>
          <strong className="footer-brand">{STORE.name}</strong>
          <p>{STORE.tagline}</p>
        </div>
        <div>
          <h4>Shop</h4>
          <Link to="/shop?category=table">Tables</Link>
          <Link to="/shop?category=chair">Chairs</Link>
          <Link to="/cart">Cart</Link>
          <Link to="/account">My orders</Link>
        </div>
        <div>
          <h4>Contact</h4>
          <a href={telHref}>{STORE.phone}</a>
          <a href={waHref} target="_blank" rel="noreferrer">WhatsApp us</a>
          <a href={mailHref}>{STORE.email}</a>
        </div>
        <div>
          <h4>Showroom</h4>
          <a href={mapHref} target="_blank" rel="noreferrer">{addressText}</a>
          {STORE.hours.map((h) => <span key={h.days}>{h.days}: {h.time}</span>)}
        </div>
      </div>
      <div className="footer-bottom">
        <span>Handmade to order in India · <Link to="/contact">Contact us</Link></span>
        <span>© {new Date().getFullYear()} {STORE.name}</span>
      </div>
    </footer>
  );
}
