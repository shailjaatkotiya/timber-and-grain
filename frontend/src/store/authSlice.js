import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { api, tokenStore } from '../api';
import { fetchCart } from './cartSlice';

const saveSession = (data) => { tokenStore.set(data.access_token); return data.user; };

/** On app start: reuse the stored token, or open an anonymous guest session. */
export const bootstrap = createAsyncThunk('auth/bootstrap', async (_, { dispatch }) => {
  let user = null;
  if (tokenStore.get()) {
    try { user = await api('/auth/me'); } catch { tokenStore.set(null); }
  }
  if (!user) user = saveSession(await api('/auth/session', { method: 'POST' }));
  dispatch(fetchCart());
  return user;
});

export const requestOtp = createAsyncThunk('auth/requestOtp', (mobile) =>
  api('/auth/otp/request', { method: 'POST', body: { mobile } }));

export const verifyOtp = createAsyncThunk('auth/verifyOtp', async ({ mobile, otp, name }, { dispatch }) => {
  const user = saveSession(await api('/auth/otp/verify', { method: 'POST', body: { mobile, otp, name } }));
  dispatch(fetchCart()); // guest cart was merged server-side
  return user;
});

export const guestLogin = createAsyncThunk('auth/guest', async (mobile, { dispatch }) => {
  const user = saveSession(await api('/auth/guest', { method: 'POST', body: { mobile } }));
  dispatch(fetchCart());
  return user;
});

export const updateProfile = createAsyncThunk('auth/updateProfile', (body) =>
  api('/auth/me', { method: 'PATCH', body }));

export const logout = createAsyncThunk('auth/logout', async (_, { dispatch }) => {
  tokenStore.set(null);
  const user = saveSession(await api('/auth/session', { method: 'POST' }));
  dispatch(fetchCart());
  return user;
});

const slice = createSlice({
  name: 'auth',
  initialState: { user: null, ready: false, otpSentTo: null, devOtp: null, error: null, loading: false },
  reducers: {
    resetOtp: (s) => { s.otpSentTo = null; s.devOtp = null; s.error = null; },
  },
  extraReducers: (b) => {
    const setUser = (s, a) => { s.user = a.payload; s.ready = true; s.loading = false; s.error = null; };
    b.addCase(bootstrap.fulfilled, setUser)
      .addCase(bootstrap.rejected, (s) => { s.ready = true; })
      .addCase(requestOtp.fulfilled, (s, a) => { s.otpSentTo = a.meta.arg; s.devOtp = a.payload.dev_otp; s.loading = false; s.error = null; })
      .addCase(verifyOtp.fulfilled, (s, a) => { setUser(s, a); s.otpSentTo = null; s.devOtp = null; })
      .addCase(guestLogin.fulfilled, setUser)
      .addCase(updateProfile.fulfilled, setUser)
      .addCase(logout.fulfilled, setUser);
    for (const t of [requestOtp, verifyOtp, guestLogin, updateProfile]) {
      b.addCase(t.pending, (s) => { s.loading = true; s.error = null; })
        .addCase(t.rejected, (s, a) => { s.loading = false; s.error = a.error.message; });
    }
  },
});

export const { resetOtp } = slice.actions;
export default slice.reducer;
