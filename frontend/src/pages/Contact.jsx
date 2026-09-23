import { STORE, addressText, mailHref, mapHref, telHref, waHref } from '../siteConfig';

export default function Contact() {
  return (
    <div className="container page">
      <h1>Contact us</h1>
      <p className="lead">Questions about sizes, woods or delivery? We usually reply within a few hours.</p>
      <div className="contact-cards">
        <div className="contact-card">
          <h4>Call or WhatsApp</h4>
          <p><a href={telHref}>{STORE.phone}</a></p>
          <a className="link-arrow" href={waHref} target="_blank" rel="noreferrer">Chat on WhatsApp →</a>
        </div>
        <div className="contact-card">
          <h4>Email</h4>
          <p><a href={mailHref}>{STORE.email}</a></p>
          <p className="muted small">For orders, include your order number.</p>
        </div>
        <div className="contact-card">
          <h4>Showroom</h4>
          <p>{addressText}</p>
          <a className="link-arrow" href={mapHref} target="_blank" rel="noreferrer">Get directions →</a>
        </div>
        <div className="contact-card">
          <h4>Opening hours</h4>
          {STORE.hours.map((h) => <p key={h.days}><span className="muted">{h.days}</span> · {h.time}</p>)}
        </div>
      </div>
    </div>
  );
}
