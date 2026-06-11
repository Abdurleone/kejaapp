import fs from "node:fs/promises";
import path from "node:path";
import env from "../config/env.js";
import httpStatus from "../constants/httpStatus.js";
import ApiError from "../utils/apiError.js";

const allowedImageMimeTypes = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const sanitizeFileName = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120) || "property-image";

const parseBase64Data = (data) => {
  const match = /^data:([^;]+);base64,(.+)$/i.exec(data);
  return match ? match[2] : data;
};

const decodeImagePayload = ({ data, mimeType }) => {
  if (!allowedImageMimeTypes[mimeType]) {
    throw new ApiError(httpStatus.BAD_REQUEST, "mimeType must be one of: image/jpeg, image/png, image/webp");
  }

  const buffer = Buffer.from(parseBase64Data(data), "base64");

  if (!buffer.length) {
    throw new ApiError(httpStatus.BAD_REQUEST, "image data is required");
  }

  if (buffer.length > env.maxUploadBytes) {
    throw new ApiError(httpStatus.BAD_REQUEST, `image must be ${env.maxUploadBytes} bytes or smaller`);
  }

  return buffer;
};

const createBytePerceptualHash = (buffer) => {
  const buckets = 64;
  const bucketSize = Math.max(Math.ceil(buffer.length / buckets), 1);
  const averages = [];

  for (let index = 0; index < buckets; index += 1) {
    const start = index * bucketSize;
    const chunk = buffer.subarray(start, start + bucketSize);
    const sum = chunk.reduce((total, byte) => total + byte, 0);
    averages.push(chunk.length ? sum / chunk.length : 0);
  }

  const globalAverage = averages.reduce((total, value) => total + value, 0) / averages.length;
  const bits = averages.map((value) => (value >= globalAverage ? "1" : "0")).join("");

  return BigInt(`0b${bits}`).toString(16).padStart(16, "0");
};

const storePropertyImage = async ({ propertyId, imageId, fileName, mimeType, data }) => {
  const buffer = decodeImagePayload({ data, mimeType });
  const extension = allowedImageMimeTypes[mimeType];
  const safeName = sanitizeFileName(fileName || `image.${extension}`);
  const finalName = `${imageId}-${safeName.endsWith(`.${extension}`) ? safeName : `${safeName}.${extension}`}`;
  const relativePath = path.posix.join("properties", propertyId.toString(), finalName);
  const absolutePath = path.join(env.uploadDir, relativePath);

  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, buffer);

  const publicPath = `/uploads/${relativePath}`;

  return {
    url: env.uploadPublicBaseUrl ? `${env.uploadPublicBaseUrl}${publicPath}` : publicPath,
    storagePath: absolutePath,
    fileName: finalName,
    mimeType,
    size: buffer.length,
    perceptualHash: createBytePerceptualHash(buffer),
  };
};

export {
  allowedImageMimeTypes,
  createBytePerceptualHash,
  decodeImagePayload,
  sanitizeFileName,
  storePropertyImage,
};
