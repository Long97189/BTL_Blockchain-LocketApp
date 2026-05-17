const multer = require("multer");
const sharp = require("sharp");
const crypto = require("crypto");
const { v2: cloudinary } = require("cloudinary");

// Configure Cloudinary from env vars
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer: keep file in memory (no local disk write)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype?.startsWith("image/")) {
      cb(new Error("Only image uploads are supported."));
      return;
    }
    cb(null, true);
  },
});

/**
 * Resize with sharp then upload buffer to Cloudinary.
 * Returns { publicUrl } — the secure HTTPS URL to store in the DB.
 */
async function saveResizedImage(file, options = {}) {
  if (!file?.buffer) throw new Error("Missing image buffer.");

  const {
    prefix = "image",
    width = 1080,
    height = 1440,
    fit = "cover",
    position = "centre",
    quality = 86,
  } = options;

  // Resize in memory with sharp
  const resizedBuffer = await sharp(file.buffer)
    .rotate()
    .resize(width, height, { fit, position, withoutEnlargement: false })
    .jpeg({ quality, mozjpeg: true })
    .toBuffer();
  const imageHash = `0x${crypto.createHash("sha256").update(resizedBuffer).digest("hex")}`;

  // Upload buffer to Cloudinary
  const publicUrl = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `locket/${prefix}s`,
        resource_type: "image",
        format: "jpg",
        // Cloudinary will generate a unique public_id
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );
    stream.end(resizedBuffer);
  });

  return {
    publicUrl,
    normalizedBuffer: resizedBuffer,
    imageHash,
  };
}

/**
 * Delete an image from Cloudinary by its secure URL.
 * Used when replacing an existing avatar.
 */
async function deleteCloudinaryImage(secureUrl) {
  if (!secureUrl || !secureUrl.includes("cloudinary.com")) return;

  try {
    // Extract public_id from URL:
    // https://res.cloudinary.com/<cloud>/image/upload/v123/locket/avatars/abc123.jpg
    // → locket/avatars/abc123
    const urlParts = secureUrl.split("/upload/");
    if (urlParts.length < 2) return;
    const withVersion = urlParts[1]; // e.g. "v1234567/locket/avatars/abc123.jpg"
    const withoutVersion = withVersion.replace(/^v\d+\//, ""); // "locket/avatars/abc123.jpg"
    const publicId = withoutVersion.replace(/\.[^/.]+$/, "");  // strip extension
    await cloudinary.uploader.destroy(publicId);
  } catch {
    // Non-fatal — don't block the request if delete fails
  }
}

module.exports = { upload, saveResizedImage, deleteCloudinaryImage };
