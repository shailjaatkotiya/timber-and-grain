import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import ConfigSummary from '../components/ConfigSummary';
import { AddressText } from '../components/AddressForm';
import { api, inr } from '../api';

export default function OrderDetail() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => { api(`/orders/${id}`).then(setOrder).catch((e) => setError(e.message)); }, [id]);

  if (error) return <div className="container page"><p className="error">{error}</p></div>;
  if (!order) return <div className="container page"><div className="skeleton tall" /></div>;

  return (
    <div className="container page">
      {params.get('placed') && (
        <div className="success-banner">
          <h2>Thank you! Your order is placed.</h2>
          <p>We'll start building your pieces and send delivery updates to +91 {order.shipping_address.phone}.</p>
        </div>
      )}
      <div className="section-head">
        <h1>Order #{order.id}</h1>
        <span className="chip">{order.status}</span>
      </div>
      <div className="cart-layout">
        <ul className="cart-items">
          {order.items.map((it) => (
            <li key={it.id} className="cart-item">
              <div className="cart-thumb">{it.preview_image && <img src={it.preview_image} alt={it.product_name} />}</div>
              <div className="cart-info">
                <h3>{it.product_name}</h3>
                <ConfigSummary labels={it.configuration_labels} />
                <span className="muted small">Qty {it.quantity} × {inr(it.unit_price)}</span>
              </div>
              <div className="cart-price"><strong>{inr(it.unit_price * it.quantity)}</strong></div>
            </li>
          ))}
        </ul>
        <aside className="summary card">
          <h3>Delivering to</h3>
          <AddressText a={order.shipping_address} />
          <hr />
          <div className="sum-row"><span>Subtotal</span><span>{inr(order.subtotal)}</span></div>
          <div className="sum-row"><span>Shipping</span><span>{Number(order.shipping) ? inr(order.shipping) : 'Free'}</span></div>
          <div className="sum-row total"><span>Total</span><span>{inr(order.total)}</span></div>
          <p className="muted small">Payment: cash / UPI on delivery</p>
          <Link to="/account" className="btn-ghost block">All orders</Link>
        </aside>
      </div>
    </div>
  );
}
