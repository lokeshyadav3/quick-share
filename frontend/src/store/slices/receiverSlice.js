import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  passkey: '',
  receiverStatus: 'idle',
  files: [],
  expiresAt: null,
  downloadProgress: 0,
  errors: null,
};

const receiverSlice = createSlice({
  name: 'receiver',
  initialState,
  reducers: {
    setReceiverPasskey: (state, action) => {
      state.passkey = action.payload;
    },
    setReceiverStatus: (state, action) => {
      state.receiverStatus = action.payload;
    },
    setReceiverFiles: (state, action) => {
      state.files = action.payload;
    },
    setReceiverExpiresAt: (state, action) => {
      state.expiresAt = action.payload;
    },
    setDownloadProgress: (state, action) => {
      state.downloadProgress = action.payload;
    },
    setReceiverError: (state, action) => {
      state.errors = action.payload;
    },
    clearReceiver: (state) => {
      state.passkey = '';
      state.receiverStatus = 'idle';
      state.files = [];
      state.expiresAt = null;
      state.downloadProgress = 0;
      state.errors = null;
    },
  },
});

export const {
  setReceiverPasskey,
  setReceiverStatus,
  setReceiverFiles,
  setReceiverExpiresAt,
  setDownloadProgress,
  setReceiverError,
  clearReceiver,
} = receiverSlice.actions;

export default receiverSlice.reducer;
