import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { api } from '../api';
import { guestLogin, requestOtp, resetOtp, verifyOtp } from '../store/authSlice';

export default function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next') || '/account';
  const { otpSentTo, devOtp, error, loading } = useSelector((s) => s.auth);
  const [tab, setTab] = useState(params.get('next') === '/checkout' ? 'guest' : 'otp');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');

  const [otpEnabled, setOtpEnabled] = useState(true);

  useEffect(() => () => { dispatch(resetOtp()); }, [dispatch]);
  // OTP login is switched off on the server until an SMS provider is connected; guest checkout always works.
  useEffect(() => {
    api('/auth/config').then((c) => {
      setOtpEnabled(c.otp_login);
      if (!c.otp_login) setTab('guest');
    }).catch(() => {});
  }, []);

  const send = async (e) => {
    e.preventDefault();
    await dispatch(requestOtp(mobile));
  };
  const verify = async (e) => {
    e.preventDefault();
    const r = await dispatch(verifyOtp({ mobile: otpSentTo, otp, name: name || undefined }));
    if (!r.error) navigate(next);
  };
  const guest = async (e) => {
    e.preventDefault();
    const r = await dispatch(guestLogin(mobile));
    if (!r.error) navigate(next);
  };

  return (
    <div className="container page narrow">
      <div className="card auth-card">
        {otpEnabled ? (
          <div className="tabs full">
            <button className={tab === 'otp' ? 'active' : ''} onClick={() => { setTab('otp'); dispatch(resetOtp()); }}>Log in with OTP</button>
            <button className={tab === 'guest' ? 'active' : ''} onClick={() => setTab('guest')}>Guest checkout</button>
          </div>
        ) : <h2>Continue with your mobile number</h2>}

        {tab === 'otp' && !otpSentTo && (
          <form onSubmit={send}>
            <p className="muted">We'll text a 6-digit code to your mobile. Your cart comes with you.</p>
            <label>Mobile number
              <div className="prefix-input"><span>+91</span>
                <input autoFocus required inputMode="numeric" maxLength={10} value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))} placeholder="98765 43210" />
              </div>
            </label>
            {error && <p className="error">{error}</p>}
            <button className="btn block" disabled={loading || mobile.length !== 10}>{loading ? 'Sending…' : 'Send OTP'}</button>
          </form>
        )}

        {tab === 'otp' && otpSentTo && (
          <form onSubmit={verify}>
            <p className="muted">Enter the code sent to +91 {otpSentTo}.
              <button type="button" className="btn-link small" onClick={() => dispatch(resetOtp())}>Change</button></p>
            {devOtp && <p className="dev-note">Dev mode — your OTP is <strong>{devOtp}</strong></p>}
            <label>OTP<input autoFocus required inputMode="numeric" maxLength={6} value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} className="otp-input" /></label>
            <label>Your name (optional)<input value={name} onChange={(e) => setName(e.target.value)} /></label>
            {error && <p className="error">{error}</p>}
            <button className="btn block" disabled={loading || otp.length !== 6}>{loading ? 'Verifying…' : 'Verify & continue'}</button>
            <button type="button" className="btn-link small" onClick={() => dispatch(requestOtp(otpSentTo))}>Resend OTP</button>
          </form>
        )}

        {tab === 'guest' && (
          <form onSubmit={guest}>
            <p className="muted">No account needed — we'll use this number for delivery updates.</p>
            <label>Mobile number
              <div className="prefix-input"><span>+91</span>
                <input autoFocus required inputMode="numeric" maxLength={10} value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))} placeholder="98765 43210" />
              </div>
            </label>
            {error && <p className="error">{error}</p>}
            <button className="btn block" disabled={loading || mobile.length !== 10}>Continue as guest</button>
          </form>
        )}
      </div>
    </div>
  );
}
