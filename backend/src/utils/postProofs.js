const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");
const config = require("../config");

function createSha256Hex(input) {
  return `0x${crypto.createHash("sha256").update(input).digest("hex")}`;
}

function toUnixTimestampSeconds(createdAt) {
  return Math.floor(new Date(createdAt).getTime() / 1000);
}

function createContentHash({ imageHash, caption, authorId, createdAt }) {
  const hasher = crypto.createHash("sha256");
  hasher.update(`imageHash:${imageHash}\n`);
  hasher.update(`caption:${caption || ""}\n`);
  hasher.update(`authorId:${String(authorId)}\n`);
  hasher.update(`createdAt:${String(toUnixTimestampSeconds(createdAt))}\n`);
  return `0x${hasher.digest("hex")}`;
}

async function resolveStoredImageBuffer(imageUrl) {
  if (!imageUrl) {
    throw new Error("The post image URL is missing.");
  }

  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    const response = await fetch(imageUrl);

    if (!response.ok) {
      throw new Error("Unable to fetch the stored image for blockchain proof.");
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  if (imageUrl.startsWith("/uploads/")) {
    const fileName = imageUrl.replace("/uploads/", "");
    const absoluteFilePath = path.resolve(config.uploadsDirectory, fileName);
    return fs.readFile(absoluteFilePath);
  }

  throw new Error("The post image URL format is not supported for hashing.");
}

async function buildPostProofHashes({ imageUrl, caption, authorId, createdAt }) {
  const imageBuffer = await resolveStoredImageBuffer(imageUrl);
  const imageHash = createSha256Hex(imageBuffer);
  const contentHash = createContentHash({
    imageHash,
    caption,
    authorId,
    createdAt,
  });

  return {
    imageHash,
    contentHash,
  };
}

module.exports = {
  buildPostProofHashes,
  createContentHash,
  createSha256Hex,
  toUnixTimestampSeconds,
};
