import fs from "node:fs/promises";
import path from "node:path";
import env from "../../config/env.js";

const write = async (relativePath, buffer) => {
  const absolutePath = path.join(env.uploadDir, relativePath);

  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, buffer);

  const publicPath = `/uploads/${relativePath}`;

  return {
    url: env.uploadPublicBaseUrl ? `${env.uploadPublicBaseUrl}${publicPath}` : publicPath,
    storagePath: absolutePath,
  };
};

const remove = async (storagePath) => {
  await fs.rm(storagePath, { force: true });
};

export { remove, write };
