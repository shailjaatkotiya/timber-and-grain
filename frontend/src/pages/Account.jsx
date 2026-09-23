import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import AddressForm, { AddressText } from '../components/AddressForm';
import { inr } from '../api';
import { deleteAddress, fetchAddresses, fetchOrders, saveAddress } from '../store/accountSlice';
import { logout, updateProfile } from '../store/authSlice';

export default function Account() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((s) => s.auth.user);
  const { addresses, orders } = useSelector((s) => s.account);
  const [editing, setEditing] = useState(null); // null | 'new' | address
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');

  useEffect(() => {
    if (user?.mobile) { dispatch(fetchAddresses()); dispatch(fetchOrders()); }
  }, [dispatch, user?.mobile]);
  useEffect(() => { setName(user?.name || ''); setEmail(user?.email || ''); }, [user]);

  if (!user?.mobile) return <Navigate to="/login" replace />;

  return (
    <div className="container page">
      <div className="section-head">
        <h1>{user.is_guest ? 'Guest account' : `Hi${user.name ? `, ${user.name.split(' ')[0]}` : ''}`}</h1>
        <button className="btn-ghost" onClick={async () => { await dispatch(logout()); navigate('/'); }}>Log out</button>
      </div>
      {user.is_guest && (
        <p className="dev-note">You're checking out as a guest with +91 {user.mobile}. <Link to="/login">Verify with OTP</Link> to keep your orders across devices.</p>
      )}
      <div className="account-grid">
        <section className="card">
          <h3>Profile</h3>
          <form className="stack" onSubmit={(e) => { e.preventDefault(); dispatch(updateProfile({ name, email: email || null })); }}>
            <label>Mobile<input value={`+91 ${user.mobile}`} disabled /></label>
            <label>Name<input value={name} onChange={(e) => setName(e.target.value)} /></label>
            <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
            <button className="btn">Save profile</button>
          </form>
        </section>

        <section className="card">
          <div className="section-head"><h3>Addresses</h3>
            {!editing && <button className="btn-link" onClick={() => setEditing('new')}>+ Add</button>}</div>
          {editing ? (
            <AddressForm initial={editing === 'new' ? undefined : editing}
              onDone={() => setEditing(null)} onCancel={() => setEditing(null)} />
          ) : (
            <ul className="address-list">
              {!addresses.length && <p className="muted">No saved addresses yet.</p>}
              {addresses.map((a) => (
                <li key={a.id} className="address-option">
                  <AddressText a={a} />
                  <div className="row gap small">
                    {a.is_default ? <span className="chip">Default</span> :
                      <button className="btn-link" onClick={() => dispatch(saveAddress({ ...a, is_default: true }))}>Make default</button>}
                    <button className="btn-link" onClick={() => setEditing(a)}>Edit</button>
                    <button className="btn-link danger" onClick={() => dispatch(deleteAddress(a.id))}>Delete</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card span-2">
          <h3>Orders</h3>
          {!orders.length && <p className="muted">No orders yet. <Link to="/shop">Start configuring →</Link></p>}
          <ul className="order-list">
            {orders.map((o) => (
              <li key={o.id}>
                <Link to={`/orders/${o.id}`} className="order-row">
                  <div className="order-thumbs">{o.items.slice(0, 3).map((i) => i.preview_image && <img key={i.id} src={i.preview_image} alt="" />)}</div>
                  <div><strong>Order #{o.id}</strong><div className="muted small">{new Date(o.created_at).toLocaleDateString('en-IN', { dateStyle: 'medium' })} · {o.items.length} item(s)</div></div>
                  <span className="chip">{o.status}</span>
                  <strong>{inr(o.total)}</strong>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
