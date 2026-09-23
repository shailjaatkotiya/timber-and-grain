import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import AddressForm, { AddressText } from '../components/AddressForm';
import ConfigSummary from '../components/ConfigSummary';
import { inr } from '../api';
import { fetchAddresses, placeOrder } from '../store/accountSlice';
import { fetchCart } from '../store/cartSlice';

export default function Checkout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((s) => s.auth.user);
  const cart = useSelector((s) => s.cart);
  const { addresses, saving, error } = useSelector((s) => s.account);
  const [selected, setSelected] = useState(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => { if (user?.mobile) dispatch(fetchAddresses()); }, [dispatch, user?.mobile]);
  useEffect(() => {
    if (!selected && addresses.length) setSelected((addresses.find((a) => a.is_default) || addresses[0]).id);
  }, [addresses, selected]);

  if (!user?.mobile) return <Navigate to="/login?next=/checkout" replace />;
  if (!cart.items.length) return <Navigate to="/cart" replace />;

  const showForm = adding || !addresses.length;

  const submit = async () => {
    const r = await dispatch(placeOrder({ address_id: selected, payment_method: 'cod' }));
    if (!r.error) { dispatch(fetchCart()); navigate(`/orders/${r.payload.id}?placed=1`); }
  };

  return (
    <div className="container page">
      <h1>Checkout</h1>
      <div className="cart-layout">
        <div>
          <section className="card">
            <h3>1. Delivery address</h3>
            {!showForm && (
              <>
                <div className="address-list">
                  {addresses.map((a) => (
                    <label key={a.id} className={`address-option ${selected === a.id ? 'selected' : ''}`}>
                      <input type="radio" name="addr" checked={selected === a.id} onChange={() => setSelected(a.id)} />
                      <AddressText a={a} />
                    </label>
                  ))}
                </div>
                <button className="btn-link" onClick={() => setAdding(true)}>+ Add a new address</button>
              </>
            )}
            {showForm && (
              <AddressForm onDone={(a) => { setSelected(a.id); setAdding(false); }}
                onCancel={addresses.length ? () => setAdding(false) : undefined} />
            )}
          </section>
          <section className="card">
            <h3>2. Payment</h3>
            <label className="address-option selected"><input type="radio" checked readOnly /> Cash / UPI on delivery</label>
            <p className="muted small">Online payments can be added by plugging a gateway (Razorpay, Stripe) into the orders API.</p>
          </section>
        </div>
        <aside className="summary card">
          <h3>Your order</h3>
          <ul className="mini-items">
            {cart.items.map((it) => (
              <li key={it.id}>
                {it.preview_image && <img src={it.preview_image} alt="" />}
                <div>
                  <strong>{it.product.name}</strong> × {it.quantity}
                  <ConfigSummary labels={it.configuration_labels} colors={it.configuration_colors} />
                </div>
                <span>{inr(it.line_total)}</span>
              </li>
            ))}
          </ul>
          <div className="sum-row"><span>Subtotal</span><span>{inr(cart.subtotal)}</span></div>
          <div className="sum-row"><span>Shipping</span><span>{Number(cart.shipping) ? inr(cart.shipping) : 'Free'}</span></div>
          <div className="sum-row total"><span>Total</span><span>{inr(cart.total)}</span></div>
          {error && <p className="error">{error}</p>}
          <button className="btn block" disabled={!selected || showForm || saving} onClick={submit}>
            {saving ? 'Placing order…' : 'Place order'}
          </button>
          <p className="muted small">{user.is_guest ? `Guest checkout · +91 ${user.mobile}` : `Signed in as +91 ${user.mobile}`} · <Link to="/cart">Edit cart</Link></p>
        </aside>
      </div>
    </div>
  );
}
