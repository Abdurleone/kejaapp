import path from "node:path";
import env from "../config/env.js";
import httpStatus from "../constants/httpStatus.js";
import { getDriver } from "./storageDrivers/index.js";
import { scanBuffer } from "./malwareScanService.js";
import ApiError from "../utils/apiError.js";
import { logWarn } from "../utils/logger.js";

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

// Fails closed when scanning is configured but unreachable/erroring: silently
// letting an unscanned file through would defeat the point of opting into
// this control. Fails open (skips entirely) only when CLAMAV_HOST isn't set
// at all - an explicit "not enabled" state, not a runtime failure.
const scanForMalware = async (buffer) => {
  let result;

  try {
    result = await scanBuffer(buffer);
  } catch (error) {
    logWarn(`Malware scan unavailable, rejecting upload: ${error.message}`);
    throw new ApiError(httpStatus.SERVICE_UNAVAILABLE, "Image scanning is temporarily unavailable, try again shortly");
  }

  if (!result.clean) {
    throw new ApiError(httpStatus.BAD_REQUEST, "This file was flagged by malware scanning and cannot be uploaded");
  }
};

const storePropertyImage = async ({ propertyId, imageId, fileName, mimeType, data }) => {
  const buffer = decodeImagePayload({ data, mimeType });
  await scanForMalware(buffer);
  const extension = allowedImageMimeTypes[mimeType];
  const safeName = sanitizeFileName(fileName || `image.${extension}`);
  const finalName = `${imageId}-${safeName.endsWith(`.${extension}`) ? safeName : `${safeName}.${extension}`}`;
  const relativePath = path.posix.join("properties", propertyId.toString(), finalName);

  const { url, storagePath } = await getDriver().write(relativePath, buffer, mimeType);

  return {
    url,
    storagePath,
    fileName: finalName,
    mimeType,
    size: buffer.length,
    perceptualHash: createBytePerceptualHash(buffer),
  };
};

const deletePropertyImage = async ({ storagePath }) => {
  if (!storagePath) {
    return;
  }

  await getDriver().remove(storagePath);
};

export {
  createBytePerceptualHash,
  decodeImagePayload,
  deletePropertyImage,
  sanitizeFileName,
  scanForMalware,
  storePropertyImage,
};
