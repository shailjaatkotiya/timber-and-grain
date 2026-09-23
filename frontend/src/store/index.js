import { configureStore } from '@reduxjs/toolkit';
import auth from './authSlice';
import cart from './cartSlice';
import catalog from './catalogSlice';
import configurator from './configuratorSlice';
import account from './accountSlice';

export const store = configureStore({
  reducer: { auth, cart, catalog, configurator, account },
});
