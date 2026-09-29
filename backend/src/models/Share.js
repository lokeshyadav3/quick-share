import mongoose from 'mongoose';

const fileSchema = new mongoose.Schema(
  {
    originalName: { type: String, required: true },
    telegramFileId: { type: String, required: true },
    telegramFileUniqueId: { type: String, required: true },
    telegramMessageId: { type: Number, required: true },
    telegramChatId: { type: Number, required: true },
    mimeType: { type: String, default: 'application/octet-stream' },
    size: { type: Number, required: true },
    sha256: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const shareSchema = new mongoose.Schema(
  {
    passkeyHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'EXPIRED', 'DELETED'],
      default: 'ACTIVE',
      index: true,
    },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true, index: true },
    downloadCount: { type: Number, default: 0 },
    files: [fileSchema],
  },
  {
    timestamps: true,
  },
);

shareSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('Share', shareSchema);
