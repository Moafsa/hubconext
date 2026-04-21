"use server";

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Para demonstração local via Docker
const s3 = new S3Client({
  region: process.env.MINIO_REGION || "us-east-1",
  endpoint: process.env.MINIO_ENDPOINT || "http://localhost:9000",
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY || "minioadmin",
    secretAccessKey: process.env.MINIO_SECRET_KEY || "minioadminpassword",
  },
  forcePathStyle: true, // Importante para MinIO
});

export async function getPresignedUrl(fileName: string, contentType: string, projectPath: string) {
  // TODO: Adicionar verificação de autenticação ou token white-label aqui

  const ext = fileName.split('.').pop() || '';
  const secureKey = `${projectPath}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

  const command = new PutObjectCommand({
    Bucket: process.env.MINIO_BUCKET_NAME || "bucket-conext",
    Key: secureKey,
    ContentType: contentType,
  });

  // URL expira em 5 minutos
  const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 300 });

  return { presignedUrl, secureKey };
}

export async function deleteObjectByKey(key: string) {
  try {
    const command = new DeleteObjectCommand({
      Bucket: process.env.MINIO_BUCKET_NAME || "bucket-conext",
      Key: key,
    });
    await s3.send(command);
    return { success: true };
  } catch (error: any) {
    console.error("[MINIO] Falha ao deletar objeto:", error);
    return { success: false, error: error?.message || "Falha ao deletar objeto" };
  }
}
