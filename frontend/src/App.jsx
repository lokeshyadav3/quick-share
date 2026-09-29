import { useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import api from './services/api';
import {
  clearShare,
  removeSelectedFile,
  setExpiration,
  setPasskey,
  setSelectedFiles,
  setShareError,
  setShareStatus,
  setUploadProgress,
  setExpiresAt,
} from './store/slices/shareSlice';
import {
  clearReceiver,
  setDownloadProgress,
  setReceiverError,
  setReceiverExpiresAt,
  setReceiverFiles,
  setReceiverPasskey,
  setReceiverStatus,
} from './store/slices/receiverSlice';

const expirationOptions = [
  { value: 15 * 60 * 1000, label: '15 minutes' },
  { value: 30 * 60 * 1000, label: '30 minutes' },
  { value: 60 * 60 * 1000, label: '1 hour' },
  { value: 6 * 60 * 60 * 1000, label: '6 hours' },
  { value: 12 * 60 * 60 * 1000, label: '12 hours' },
  { value: 24 * 60 * 60 * 1000, label: '24 hours' },
  { value: 3 * 24 * 60 * 60 * 1000, label: '3 days' },
  { value: 7 * 24 * 60 * 60 * 1000, label: '7 days' },
];

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

function timeRemainingLabel(isoDate) {
  if (!isoDate) return '';
  const diff = new Date(isoDate).getTime() - Date.now();
  if (diff <= 0) return 'Expired';
  const totalMinutes = Math.floor(diff / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${minutes}m remaining`;
  return `${minutes} minutes remaining`;
}

export default function App() {
  const dispatch = useDispatch();
  const fileInputRef = useRef(null);
  const sender = useSelector((state) => state.share);
  const receiver = useSelector((state) => state.receiver);

  const handleFilesSelected = (event) => {
    const incoming = Array.from(event.target.files || []);
    dispatch(setSelectedFiles([...sender.selectedFiles, ...incoming]));
    event.target.value = '';
  };

  const handleUpload = async () => {
    if (!sender.selectedFiles.length) {
      dispatch(setShareError('Add at least one file before creating a share.'));
      return;
    }

    dispatch(setShareStatus('uploading'));
    dispatch(setShareError(null));

    const formData = new FormData();
    sender.selectedFiles.forEach((file) => formData.append('files', file));
    formData.append('expiration', String(sender.expiration));

    try {
      const response = await api.post('/shares', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
          dispatch(setUploadProgress(percent));
        },
      });

      dispatch(setPasskey(response.data.data.passkey));
      dispatch(setExpiresAt(response.data.data.expiresAt));
      dispatch(setShareStatus('success'));
      dispatch(setUploadProgress(100));
    } catch (error) {
      const backendMessage = error.response?.data?.error?.message || 'Upload failed.';
      dispatch(setShareError(backendMessage));
      dispatch(setShareStatus('error'));
    }
  };

  const handleAccess = async () => {
    const passkey = receiver.passkey.trim();
    if (!/^[A-Za-z0-9]{6}$/.test(passkey)) {
      dispatch(setReceiverError('The Passkey must be exactly six alphanumeric characters.'));
      return;
    }

    dispatch(setReceiverStatus('loading'));
    dispatch(setReceiverError(null));

    try {
      const response = await api.post('/shares/access', { passkey });
      dispatch(setReceiverExpiresAt(response.data.data.expiresAt));
      dispatch(setReceiverStatus('success'));
      await fetchFiles();
    } catch (error) {
      const message = error.response?.data?.error?.message || 'Failed to access share.';
      dispatch(setReceiverError(message));
      dispatch(setReceiverStatus('error'));
    }
  };

  const fetchFiles = async () => {
    try {
      const response = await api.get('/shares/files');
      dispatch(setReceiverFiles(response.data.data.files));
      dispatch(setReceiverExpiresAt(response.data.data.expiresAt));
      dispatch(setReceiverStatus('success'));
    } catch (error) {
      const message = error.response?.data?.error?.message || 'Unable to fetch files.';
      dispatch(setReceiverError(message));
      dispatch(setReceiverStatus('error'));
    }
  };

  const handleDownload = async (fileId, fileName) => {
    try {
      const response = await api.get(`/shares/files/${fileId}/download`, {
        responseType: 'blob',
        onDownloadProgress: (progressEvent) => {
          const total = progressEvent.total || 1;
          const percent = Math.round((progressEvent.loaded * 100) / total);
          dispatch(setDownloadProgress(percent));
        },
      });

      const blob = new Blob([response.data], { type: response.headers['content-type'] || 'application/octet-stream' });
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(downloadUrl);
      dispatch(setDownloadProgress(100));
    } catch (error) {
      dispatch(setReceiverError(error.response?.data?.error?.message || 'Download failed.'));
    }
  };

  const handleCopyPasskey = async () => {
    if (!sender.passkey) return;
    await navigator.clipboard.writeText(sender.passkey);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <header className="mb-10 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-violet-200">
            QuickShare
          </div>
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">Temporary File Transfer</h1>
        </header>

        <div className="grid gap-8 lg:grid-cols-2">
          <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-glow backdrop-blur-sm">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-semibold">Sender</h2>
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-200">Secure</span>
            </div>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="mb-6 flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-violet-500/60 bg-slate-800/70 p-8 text-center transition hover:border-violet-400 hover:bg-slate-800"
            >
              <div className="mb-3 text-4xl">📤</div>
              <p className="text-lg font-medium">Drop files here</p>
              <p className="mt-2 text-sm text-slate-300">or Browse Files</p>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                multiple
                onChange={handleFilesSelected}
              />
            </div>

            {sender.selectedFiles.length > 0 && (
              <div className="mb-6">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">Selected Files</h3>
                  <span className="text-xs text-slate-400">{sender.selectedFiles.length} file(s)</span>
                </div>
                <ul className="space-y-2">
                  {sender.selectedFiles.map((file, index) => (
                    <li key={`${file.name}-${index}`} className="flex items-center justify-between rounded-xl border border-white/5 bg-slate-800/70 px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{file.name}</p>
                        <p className="text-xs text-slate-400">{formatBytes(file.size)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => dispatch(removeSelectedFile(index))}
                        className="rounded-lg border border-white/10 px-2 py-1 text-xs text-slate-200 hover:border-red-400 hover:text-red-300"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mb-6">
              <label className="mb-2 block text-sm font-medium text-slate-300">Expiration</label>
              <select
                value={sender.expiration}
                onChange={(event) => dispatch(setExpiration(Number(event.target.value)))}
                className="w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-3 text-white outline-none ring-0 transition focus:border-violet-500"
              >
                {expirationOptions.map((option) => (
                  <option key={option.label} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {sender.shareStatus === 'uploading' && (
              <div className="mb-6 rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4">
                <div className="mb-3 flex items-center justify-between text-sm">
                  <span>Uploading...</span>
                  <span>{sender.uploadProgress}%</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-700">
                  <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400" style={{ width: `${sender.uploadProgress}%` }} />
                </div>
              </div>
            )}

            {sender.errors && (
              <div className="mb-6 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {sender.errors}
              </div>
            )}

            <button
              type="button"
              onClick={handleUpload}
              className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-3 font-semibold text-white shadow-lg shadow-violet-900/40 transition hover:brightness-110"
            >
              Create Share
            </button>

            {sender.passkey && sender.shareStatus === 'success' && (
              <div className="mt-8 rounded-2xl border border-emerald-500/35 bg-emerald-500/10 p-5">
                <p className="text-sm uppercase tracking-[0.2em] text-emerald-200">Share Created</p>
                <h3 className="mt-3 text-xl font-semibold">Your Passkey</h3>
                <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-2xl font-mono tracking-[0.3em]">
                  <span>{sender.passkey}</span>
                  <button type="button" onClick={handleCopyPasskey} className="rounded-lg border border-white/10 px-3 py-1 text-sm text-slate-200 hover:border-violet-400">
                    Copy
                  </button>
                </div>
                <p className="mt-3 text-sm text-emerald-100">{timeRemainingLabel(sender.expiresAt)}</p>
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-glow backdrop-blur-sm">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-semibold">Receiver</h2>
              <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-xs text-cyan-200">Access</span>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-medium text-slate-300">Enter the 6-character Passkey</label>
              <input
                type="text"
                value={receiver.passkey}
                maxLength={6}
                onChange={(event) => dispatch(setReceiverPasskey(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)))}
                className="w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-3 text-center text-xl font-mono tracking-[0.5em] text-white outline-none focus:border-cyan-500"
                placeholder="A7kP2x"
              />
              <button
                type="button"
                onClick={handleAccess}
                className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 font-semibold text-white shadow-lg shadow-cyan-900/30 transition hover:brightness-110"
              >
                Access Files
              </button>
            </div>

            {receiver.errors && (
              <div className="mt-5 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {receiver.errors}
              </div>
            )}

            {receiver.receiverStatus === 'success' && receiver.files.length > 0 && (
              <div className="mt-8">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-xl font-semibold">Files</h3>
                  <span className="text-sm text-slate-300">{timeRemainingLabel(receiver.expiresAt)}</span>
                </div>
                <ul className="space-y-3">
                  {receiver.files.map((file) => (
                    <li key={file.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-800/70 p-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{file.name}</p>
                        <p className="text-xs text-slate-400">{formatBytes(file.size)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDownload(file.id, file.name)}
                        className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-sm font-medium text-cyan-100 hover:border-cyan-400"
                      >
                        Download
                      </button>
                    </li>
                  ))}
                </ul>
                {receiver.downloadProgress > 0 && receiver.downloadProgress < 100 && (
                  <div className="mt-6 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-4">
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span>Downloading...</span>
                      <span>{receiver.downloadProgress}%</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-700">
                      <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500" style={{ width: `${receiver.downloadProgress}%` }} />
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
