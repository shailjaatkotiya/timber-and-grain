import { useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Shop from './pages/Shop';
import Product from './pages/Product';
import Cart from './pages/Cart';
import Login from './pages/Login';
import Checkout from './pages/Checkout';
import Account from './pages/Account';
import OrderDetail from './pages/OrderDetail';
import Contact from './pages/Contact';
import { bootstrap } from './store/authSlice';

export default function App() {
  const dispatch = useDispatch();
  const ready = useSelector((s) => s.auth.ready);
  const { pathname } = useLocation();

  useEffect(() => { dispatch(bootstrap()); }, [dispatch]);
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);

  return (
    <>
      <Header transparent={pathname === '/'} />
      <main>
        {!ready ? <div className="container page"><div className="skeleton tall" /></div> : (
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/product/:slug" element={<Product />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/login" element={<Login />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/account" element={<Account />} />
            <Route path="/orders/:id" element={<OrderDetail />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="*" element={<div className="container page"><h1>Page not found</h1></div>} />
          </Routes>
        )}
      </main>
      <Footer />
    </>
  );
}
