import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { api } from '../api';

export const fetchProducts = createAsyncThunk('catalog/products', () => api('/products'));
export const fetchOptions = createAsyncThunk('catalog/options', () => api('/config-options'));
export const fetchProduct = createAsyncThunk('catalog/product', (slug) => api(`/products/${slug}`));

const slice = createSlice({
  name: 'catalog',
  initialState: { products: [], options: [], details: {}, status: 'idle', error: null },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchProducts.pending, (s) => { s.status = 'loading'; })
      .addCase(fetchProducts.fulfilled, (s, a) => { s.products = a.payload; s.status = 'ready'; })
      .addCase(fetchProducts.rejected, (s, a) => { s.status = 'error'; s.error = a.error.message; })
      .addCase(fetchOptions.fulfilled, (s, a) => { s.options = a.payload; })
      .addCase(fetchProduct.fulfilled, (s, a) => { s.details[a.payload.slug] = a.payload; })
      .addCase(fetchProduct.rejected, (s, a) => { s.details[a.meta.arg] = { error: a.error.message }; });
  },
});

export default slice.reducer;
