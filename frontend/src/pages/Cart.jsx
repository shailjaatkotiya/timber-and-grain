import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import ConfigSummary from '../components/ConfigSummary';
import { inr } from '../api';
import { removeItem, updateQuantity } from '../store/cartSlice';

export default function Cart() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const cart = useSelector((s) => s.cart);
  const user = useSelector((s) => s.auth.user);

  if (!cart.items.length) {
    return (
      <div className="container page empty-state">
        <h1>Your cart is empty</h1>
        <p className="muted">Configure a table or chair and it will show up here with your choices.</p>
        <Link className="btn" to="/shop">Browse furniture</Link>
      </div>
    );
  }

  const checkout = () => navigate(user?.mobile ? '/checkout' : '/login?next=/checkout');

  return (
    <div className="container page">
      <h1>Cart <span className="muted">({cart.item_count})</span></h1>
      <div className="cart-layout">
        <ul className="cart-items">
          {cart.items.map((it) => (
            <li key={it.id} className="cart-item">
              <Link to={`/product/${it.product.slug}`} className="cart-thumb">
                {it.preview_image ? <img src={it.preview_image} alt={`${it.product.name}, as configured`} /> : <div className="skeleton" />}
              </Link>
              <div className="cart-info">
                <Link to={`/product/${it.product.slug}`}><h3>{it.product.name}</h3></Link>
                <ConfigSummary labels={it.configuration_labels} colors={it.configuration_colors} />
                <div className="row gap center">
                  <div className="qty small">
                    <button onClick={() => dispatch(updateQuantity({ id: it.id, quantity: it.quantity - 1 }))}
                      disabled={it.quantity <= 1} aria-label="Decrease">−</button>
                    <span>{it.quantity}</span>
                    <button onClick={() => dispatch(updateQuantity({ id: it.id, quantity: it.quantity + 1 }))}
                      disabled={it.quantity >= 20} aria-label="Increase">+</button>
                  </div>
                  <button className="btn-link small" onClick={() => dispatch(removeItem(it.id))}>Remove</button>
                </div>
              </div>
              <div className="cart-price">
                <strong>{inr(it.line_total)}</strong>
                {it.quantity > 1 && <span className="muted small">{inr(it.unit_price)} each</span>}
              </div>
            </li>
          ))}
        </ul>
        <aside className="summary card">
          <h3>Order summary</h3>
          <div className="sum-row"><span>Subtotal</span><span>{inr(cart.subtotal)}</span></div>
          <div className="sum-row"><span>Shipping</span><span>{Number(cart.shipping) ? inr(cart.shipping) : 'Free'}</span></div>
          <div className="sum-row total"><span>Total</span><span>{inr(cart.total)}</span></div>
          {Number(cart.shipping) > 0 && <p className="muted small">Add {inr(25000 - cart.subtotal)} more for free shipping.</p>}
          <button className="btn block" onClick={checkout}>Checkout</button>
        </aside>
      </div>
    </div>
  );
}
