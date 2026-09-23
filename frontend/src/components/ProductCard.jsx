import { Link } from 'react-router-dom';
import { inr } from '../api';

/** Listing card. The image is pre-rendered from the product's GLB (see scripts/render-product-images.mjs). */
export default function ProductCard({ product }) {
  return (
    <Link to={`/product/${product.slug}`} className="product-card">
      <div className="product-card-img">
        {product.image_url
          ? <img src={product.image_url} alt={product.name} loading="lazy" />
          : <div className="skeleton" />}
        <span className="chip">{product.category}</span>
        <span className="badge-3d">3D</span>
      </div>
      <div className="product-card-body">
        <h3>{product.name}</h3>
        <p className="muted">{product.tagline}</p>
        <div className="product-card-foot">
          <span className="price">from {inr(product.base_price)}</span>
          <span className="link-arrow">Configure →</span>
        </div>
      </div>
    </Link>
  );
}
