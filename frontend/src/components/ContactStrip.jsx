import { Link } from 'react-router-dom';
import { STORE, addressText, mailHref, mapHref, telHref, waHref } from '../siteConfig';

/** Compact contact + showroom block for the landing page. */
export default function ContactStrip() {
  return (
    <section className="contact-strip">
      <div className="container">
        <ul className="perks">{STORE.perks.map((p) => <li key={p}>{p}</li>)}</ul>
        <div className="contact-cards">
          <div className="contact-card">
            <h4>Visit the showroom</h4>
            <p>{addressText}</p>
            <p className="muted small">{STORE.hours.map((h) => `${h.days} ${h.time}`).join(' · ')}</p>
            <a className="link-arrow" href={mapHref} target="_blank" rel="noreferrer">Get directions →</a>
          </div>
          <div className="contact-card">
            <h4>Talk to us</h4>
            <p><a href={telHref}>{STORE.phone}</a></p>
            <p><a href={mailHref}>{STORE.email}</a></p>
            <a className="link-arrow" href={waHref} target="_blank" rel="noreferrer">Chat on WhatsApp →</a>
          </div>
          <div className="contact-card">
            <h4>Need help choosing?</h4>
            <p>Send us a photo of your room and we'll suggest woods and finishes that fit it.</p>
            <Link className="link-arrow" to="/contact">Contact details →</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
