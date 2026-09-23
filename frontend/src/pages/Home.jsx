import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import HeroScene from '../components/HeroScene';
import ProductCard from '../components/ProductCard';
import ContactStrip from '../components/ContactStrip';
import { fetchProducts } from '../store/catalogSlice';

// Each story section re-skins the background table as it scrolls into view.
const SECTIONS = [
  {
    id: 'intro', eyebrow: 'Made to order in solid wood',
    title: 'Furniture, finished your way.',
    body: 'Choose the wood and finish in 3D. Handmade and delivered in about 3 weeks.',
    config: { wood: 'teak', finish: 'satin' }, cta: true,
  },
  {
    id: 'wood', eyebrow: '01 — Wood',
    title: 'Seven species, ash to walnut.',
    body: 'Kiln-dried, hand-picked boards. The tone you see is the tone you get.',
    config: { wood: 'walnut', finish: 'satin' },
  },
  {
    id: 'finish', eyebrow: '02 — Finish',
    title: 'Matte, satin or gloss.',
    body: 'Hard-wax oil, a family-proof satin lacquer or a mirror gloss.',
    config: { wood: 'cherry', finish: 'gloss' },
  },
  {
    id: 'craft', eyebrow: '03 — Craft',
    title: 'Joined, not screwed.',
    body: 'Mortise-and-tenon joinery with a 10-year frame warranty. Inspect every joint in 3D before you buy.',
    config: { wood: 'smoked', finish: 'satin' },
  },
];

export default function Home() {
  const dispatch = useDispatch();
  const products = useSelector((s) => s.catalog.products);
  const [active, setActive] = useState(0);
  const refs = useRef([]);

  useEffect(() => {
    if (!products.length) dispatch(fetchProducts());
  }, [dispatch, products.length]);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(Number(e.target.dataset.i))),
      { rootMargin: '-45% 0px -45% 0px' },
    );
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className="home">
      <HeroScene config={SECTIONS[active].config} />
      <div className="story">
        {SECTIONS.map((s, i) => (
          <section key={s.id} ref={(el) => (refs.current[i] = el)} data-i={i}
            className={`story-section ${i === active ? 'active' : ''}`}>
            <div className="story-card">
              <p className="eyebrow">{s.eyebrow}</p>
              {i === 0 ? <h1>{s.title}</h1> : <h2>{s.title}</h2>}
              <p className="lead">{s.body}</p>
              {s.cta && (
                <div className="row gap">
                  <Link className="btn" to="/shop?category=table">Shop tables</Link>
                  <Link className="btn-ghost" to="/shop?category=chair">Shop chairs</Link>
                </div>
              )}
              {i === 0 && <p className="scroll-cue">Scroll to turn the table ↓</p>}
            </div>
          </section>
        ))}
      </div>

      <section className="featured">
        <div className="container">
          <div className="section-head">
            <h2>The collection</h2>
            <Link to="/shop" className="link-arrow">View all →</Link>
          </div>
          <h3 className="sub first">Tables</h3>
          <div className="product-grid">
            {products.filter((p) => p.category === 'table').map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
          <h3 className="sub">Chairs</h3>
          <div className="product-grid">
            {products.filter((p) => p.category === 'chair').map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </section>
      <ContactStrip />
    </div>
  );
}
