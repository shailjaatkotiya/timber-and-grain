import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { api } from '../api';

export const fetchAddresses = createAsyncThunk('account/addresses', () => api('/addresses'));
export const saveAddress = createAsyncThunk('account/saveAddress', ({ id, ...body }) =>
  id ? api(`/addresses/${id}`, { method: 'PUT', body }) : api('/addresses', { method: 'POST', body }));
export const deleteAddress = createAsyncThunk('account/deleteAddress', async (id) => {
  await api(`/addresses/${id}`, { method: 'DELETE' });
  return id;
});
export const fetchOrders = createAsyncThunk('account/orders', () => api('/orders'));
export const placeOrder = createAsyncThunk('account/placeOrder', (body) => api('/orders', { method: 'POST', body }));

const slice = createSlice({
  name: 'account',
  initialState: { addresses: [], orders: [], error: null, saving: false },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchAddresses.fulfilled, (s, a) => { s.addresses = a.payload; })
      .addCase(saveAddress.pending, (s) => { s.saving = true; s.error = null; })
      .addCase(saveAddress.rejected, (s, a) => { s.saving = false; s.error = a.error.message; })
      .addCase(saveAddress.fulfilled, (s, a) => {
        s.saving = false;
        if (a.payload.is_default) s.addresses.forEach((x) => { x.is_default = false; });
        const i = s.addresses.findIndex((x) => x.id === a.payload.id);
        if (i >= 0) s.addresses[i] = a.payload; else s.addresses.unshift(a.payload);
      })
      .addCase(deleteAddress.fulfilled, (s, a) => { s.addresses = s.addresses.filter((x) => x.id !== a.payload); })
      .addCase(fetchOrders.fulfilled, (s, a) => { s.orders = a.payload; })
      .addCase(placeOrder.pending, (s) => { s.saving = true; s.error = null; })
      .addCase(placeOrder.rejected, (s, a) => { s.saving = false; s.error = a.error.message; })
      .addCase(placeOrder.fulfilled, (s, a) => { s.saving = false; s.orders.unshift(a.payload); });
  },
});

export default slice.reducer;
