import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import Configurator, { ARIcon } from '../components/Configurator';
import ARViewer from '../components/ARViewer';
import { inr } from '../api';
import { addToCart, dismissAdded } from '../store/cartSlice';
import { fetchProduct } from '../store/catalogSlice';
import { initSelection, resetSelection, setOption } from '../store/configuratorSlice';
import { indexOptions } from '../three/materials';
import { STORE, telHref, waHref } from '../siteConfig';

const GROUP_TITLE = { wood: 'Wood species', finish: 'Finish', frame: 'Frame colour' };

function Swatch({ opt, group, selected, onSelect, woodColor }) {
  let bg = opt.color;
  if (group === 'finish') bg = woodColor;          // show the finish on the chosen wood
  const cls = `swatch tex-${opt.texture} ${group === 'finish' ? `finish-${opt.code}` : ''}`;
  return (
    <button type="button" className={`swatch-btn ${selected ? 'selected' : ''}`} onClick={onSelect}
      aria-pressed={selected} title={opt.label}>
      <span className={cls} style={{ background: bg }} />
      <span className="swatch-label">{opt.label}</span>
      {Number(opt.price_delta) > 0 && <span className="swatch-price">+{inr(opt.price_delta)}</span>}
    </button>
  );
}

export default function Product() {
  const { slug } = useParams();
  const dispatch = useDispatch();
  const product = useSelector((s) => s.catalog.details[slug]);
  const selection = useSelector((s) => s.configurator.selections[slug]);
  const { adding, error, lastAdded } = useSelector((s) => s.cart);
  const [qty, setQty] = useState(1);
  const [params, setParams] = useSearchParams();
  const [arOpen, setArOpen] = useState(false);
  const [arCamera, setArCamera] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const viewerRef = useRef(null);

  useEffect(() => { dispatch(fetchProduct(slug)); dispatch(dismissAdded()); }, [dispatch, slug]);
  useEffect(() => {
    if (!product?.default_config) return;
    // A shared link / AR QR code carries the configuration: /product/x?wood=walnut&finish=gloss&ar=1
    const fromUrl = {};
    for (const g of product.config_groups) {
      const code = params.get(g);
      if (code && product.options?.[g]?.some((o) => o.code === code)) fromUrl[g] = code;
    }
    if (Object.keys(fromUrl).length) dispatch(resetSelection({ slug, defaults: { ...product.default_config, ...fromUrl } }));
    else dispatch(initSelection({ slug, defaults: product.default_config }));
  }, [dispatch, slug, product]); // eslint-disable-line react-hooks/exhaustive-deps

  // ?ar=1 → open the AR dialog as soon as the model is ready
  useEffect(() => {
    const ar = params.get('ar');
    if (modelReady && (ar === '1' || ar === 'camera')) {
      setArCamera(ar === 'camera'); // Android fallback from Scene Viewer lands here
      setArOpen(true);
      const next = new URLSearchParams(params); next.delete('ar'); setParams(next, { replace: true });
    }
  }, [modelReady]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setModelReady(false); }, [slug]);

  const viewerApi = useMemo(() => ({
    snapshot: () => viewerRef.current.snapshot(),
    exportGLB: () => viewerRef.current.exportGLB(),
    exportUSDZ: () => viewerRef.current.exportUSDZ(),
  }), []);

  const optionIndex = useMemo(() => (product?.options ? indexOptions(product.options) : null), [product]);

  const price = useMemo(() => {
    if (!product?.options || !selection) return 0;
    return product.config_groups.reduce((sum, g) => {
      const o = product.options[g].find((x) => x.code === selection[g]);
      return sum + Number(o?.price_delta || 0);
    }, Number(product.base_price));
  }, [product, selection]);

  if (product?.error) return <div className="container page"><p className="error">{product.error}</p><Link to="/shop">Back to shop</Link></div>;
  if (!product?.options || !selection) return <div className="container page"><div className="skeleton tall" /></div>;

  const woodColor = optionIndex.wood?.[selection.wood]?.color;

  const configLabel = product.config_groups
    .map((g) => product.options[g].find((o) => o.code === selection[g])?.label).filter(Boolean).join(', ');
  const shareUrl = `${window.location.origin}/product/${slug}?${new URLSearchParams({ ...selection, ar: '1' })}`;

  const onAdd = () => {
    const preview_image = viewerRef.current?.snapshot();
    dispatch(addToCart({ product_id: product.id, quantity: qty, configuration: selection, preview_image }));
  };

  return (
    <div className="product-page">
      <div className="product-stage">
        <Configurator ref={viewerRef} product={product} config={selection} optionIndex={optionIndex}
          onViewAR={() => { setArCamera(false); setArOpen(true); }} onReady={() => setModelReady(true)} />
      </div>
      <aside className="product-panel">
        <Link to={`/shop?category=${product.category}`} className="muted small">← {product.category === 'table' ? 'Tables' : 'Chairs'}</Link>
        <h1>{product.name}</h1>
        <p className="lead">{product.tagline}</p>
        <p className="price big">{inr(price)}</p>
        <p className="muted small">
          {product.dimensions.w} × {product.dimensions.d} × {product.dimensions.h} cm (W × D × H) · Ships in ~3 weeks
        </p>

        {product.config_groups.map((group) => (
          <fieldset key={group} className="option-group">
            <legend>
              {GROUP_TITLE[group] || group}
              <span className="muted"> — {product.options[group].find((o) => o.code === selection[group])?.label}</span>
            </legend>
            <div className="swatches">
              {product.options[group].map((opt) => (
                <Swatch key={opt.code} opt={opt} group={group} woodColor={woodColor}
                  selected={selection[group] === opt.code}
                  onSelect={() => dispatch(setOption({ slug, group, code: opt.code }))} />
              ))}
            </div>
          </fieldset>
        ))}

        <div className="buy-row">
          <div className="qty">
            <button type="button" onClick={() => setQty(Math.max(1, qty - 1))} aria-label="Decrease">−</button>
            <span>{qty}</span>
            <button type="button" onClick={() => setQty(Math.min(20, qty + 1))} aria-label="Increase">+</button>
          </div>
          <button className="btn grow" onClick={onAdd} disabled={adding}>
            {adding ? 'Adding…' : `Add to cart · ${inr(price * qty)}`}
          </button>
        </div>
        <button type="button" className="btn-ghost block ar-btn" onClick={() => { setArCamera(false); setArOpen(true); }} disabled={!modelReady}>
          <ARIcon /> View in AR, in your room
        </button>
        <button type="button" className="btn-link small"
          onClick={() => dispatch(resetSelection({ slug, defaults: product.default_config }))}>Reset to default</button>
        {error && <p className="error">{error}</p>}
        {lastAdded === product.id && (
          <div className="toast">
            Added to cart with your configuration. <Link to="/cart">View cart →</Link>
          </div>
        )}

        <div className="description">
          <h3>About this piece</h3>
          <p>{product.description}</p>
        </div>
        {arOpen && (
          <ARViewer product={product} viewerApi={viewerApi} shareUrl={shareUrl} configLabel={configLabel}
            config={selection} optionIndex={optionIndex} startInCamera={arCamera}
            onClose={() => { setArOpen(false); setArCamera(false); }} />
        )}
        <p className="help-line">
          Questions about this piece? Call <a href={telHref}>{STORE.phone}</a> or{' '}
          <a href={waHref} target="_blank" rel="noreferrer">WhatsApp us</a>.
        </p>
      </aside>
    </div>
  );
}
