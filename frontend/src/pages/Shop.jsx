import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import ProductCard from '../components/ProductCard';
import { fetchProducts } from '../store/catalogSlice';

export default function Shop() {
  const dispatch = useDispatch();
  const [params] = useSearchParams();
  const category = params.get('category');
  const { products, status, error } = useSelector((s) => s.catalog);

  useEffect(() => {
    if (!products.length) dispatch(fetchProducts());
  }, [dispatch, products.length]);

  const list = category ? products.filter((p) => p.category === category) : products;

  return (
    <div className="container page">
      <div className="section-head">
        <h1>{category === 'table' ? 'Tables' : category === 'chair' ? 'Chairs' : 'All furniture'}</h1>
        <div className="tabs">
          <Link className={!category ? 'active' : ''} to="/shop">All</Link>
          <Link className={category === 'table' ? 'active' : ''} to="/shop?category=table">Tables</Link>
          <Link className={category === 'chair' ? 'active' : ''} to="/shop?category=chair">Chairs</Link>
        </div>
      </div>
      {status === 'error' && <p className="error">Couldn't load products: {error}. Is the API running?</p>}
      <div className="product-grid">
        {list.map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
    </div>
  );
}
