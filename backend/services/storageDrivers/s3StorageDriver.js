import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import env from "../../config/env.js";

let s3Client;

const getS3Client = () => {
  if (!s3Client) {
    s3Client = new S3Client({
      region: env.s3Region,
      endpoint: env.s3Endpoint || undefined,
      forcePathStyle: env.s3ForcePathStyle,
      credentials: {
        accessKeyId: env.s3AccessKeyId,
        secretAccessKey: env.s3SecretAccessKey,
      },
    });
  }

  return s3Client;
};

const write = async (relativePath, buffer, mimeType) => {
  await getS3Client().send(
    new PutObjectCommand({
      Bucket: env.s3Bucket,
      Key: relativePath,
      Body: buffer,
      ContentType: mimeType,
      CacheControl: "public, max-age=31536000, immutable",
    })
  );

  return {
    url: `${env.s3PublicBaseUrl}/${relativePath}`,
    storagePath: relativePath,
  };
};

const remove = async (storagePath) => {
  await getS3Client().send(new DeleteObjectCommand({ Bucket: env.s3Bucket, Key: storagePath }));
};

export { remove, write };
