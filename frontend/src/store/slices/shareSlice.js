import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  selectedFiles: [],
  expiration: 3600000,
  uploadProgress: 0,
  shareStatus: 'idle',
  passkey: '',
  expiresAt: null,
  errors: null,
};

const shareSlice = createSlice({
  name: 'share',
  initialState,
  reducers: {
    setSelectedFiles: (state, action) => {
      state.selectedFiles = action.payload;
    },
    removeSelectedFile: (state, action) => {
      state.selectedFiles = state.selectedFiles.filter((_, index) => index !== action.payload);
    },
    setExpiration: (state, action) => {
      state.expiration = action.payload;
    },
    setUploadProgress: (state, action) => {
      state.uploadProgress = action.payload;
    },
    setShareStatus: (state, action) => {
      state.shareStatus = action.payload;
    },
    setPasskey: (state, action) => {
      state.passkey = action.payload;
    },
    setExpiresAt: (state, action) => {
      state.expiresAt = action.payload;
    },
    setShareError: (state, action) => {
      state.errors = action.payload;
    },
    clearShare: (state) => {
      state.selectedFiles = [];
      state.uploadProgress = 0;
      state.shareStatus = 'idle';
      state.passkey = '';
      state.expiresAt = null;
      state.errors = null;
    },
  },
});

export const {
  setSelectedFiles,
  removeSelectedFile,
  setExpiration,
  setUploadProgress,
  setShareStatus,
  setPasskey,
  setExpiresAt,
  setShareError,
  clearShare,
} = shareSlice.actions;

export default shareSlice.reducer;
