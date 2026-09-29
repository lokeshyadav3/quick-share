import { configureStore } from '@reduxjs/toolkit';
import shareReducer from './slices/shareSlice';
import receiverReducer from './slices/receiverSlice';

export const store = configureStore({
  reducer: {
    share: shareReducer,
    receiver: receiverReducer,
  },
});
