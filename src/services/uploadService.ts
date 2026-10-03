import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { config } from '@/config/unifiedConfig';

export const uploadService = {
  async generatePresignedUrl(fileName: string, contentType: string, folder: string) {
    const ext = fileName.split('.').pop();
    const key = `${folder}/${randomUUID()}.${ext}`;

    if (!config.cloudflare.enabled) {
      const localUrl = `/api/v1/uploads/local?key=${encodeURIComponent(key)}`;
      return {
        uploadUrl: localUrl,
        url: localUrl,
        key,
        publicUrl: `/uploads/${key}`,
      };
    }

    const r2 = new S3Client({
      region: 'auto',
      endpoint: `https://${config.cloudflare.r2AccountId || ''}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.cloudflare.r2AccessKeyId || '',
        secretAccessKey: config.cloudflare.r2SecretAccessKey || '',
      },
    });

    const signedUrl = await getSignedUrl(
      r2,
      new PutObjectCommand({
        Bucket: config.cloudflare.r2BucketName,
        Key: key,
        ContentType: contentType,
      }),
      { expiresIn: 300 }, // 5 minutes
    );

    return {
      uploadUrl: signedUrl,
      url: signedUrl,
      key,
      publicUrl: `${config.cloudflare.r2PublicUrl}/${key}`,
    };
  }
};
