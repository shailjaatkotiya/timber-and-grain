import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { api } from '../api';

export const fetchCart = createAsyncThunk('cart/fetch', () => api('/cart'));

/** payload: { product_id, quantity, configuration, preview_image } — configuration travels with the item. */
export const addToCart = createAsyncThunk('cart/add', (item) => api('/cart/items', { method: 'POST', body: item }));

export const updateQuantity = createAsyncThunk('cart/update', ({ id, quantity }) =>
  api(`/cart/items/${id}`, { method: 'PATCH', body: { quantity } }));

export const removeItem = createAsyncThunk('cart/remove', (id) => api(`/cart/items/${id}`, { method: 'DELETE' }));

const empty = { items: [], item_count: 0, subtotal: 0, shipping: 0, total: 0 };

const slice = createSlice({
  name: 'cart',
  initialState: { ...empty, loading: false, adding: false, error: null, lastAdded: null },
  reducers: {
    clearCart: (s) => Object.assign(s, empty),
    dismissAdded: (s) => { s.lastAdded = null; },
  },
  extraReducers: (b) => {
    const set = (s, a) => { Object.assign(s, a.payload); s.loading = false; s.adding = false; s.error = null; };
    b.addCase(fetchCart.fulfilled, set)
      .addCase(updateQuantity.fulfilled, set)
      .addCase(removeItem.fulfilled, set)
      .addCase(addToCart.pending, (s) => { s.adding = true; s.error = null; })
      .addCase(addToCart.fulfilled, (s, a) => { set(s, a); s.lastAdded = a.meta.arg.product_id; })
      .addCase(addToCart.rejected, (s, a) => { s.adding = false; s.error = a.error.message; })
      .addCase(fetchCart.pending, (s) => { s.loading = true; });
  },
});

export const { clearCart, dismissAdded } = slice.actions;
export default slice.reducer;
