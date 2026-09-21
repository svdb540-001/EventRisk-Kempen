import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { config } from './config.mjs';

let containerClientPromise = null;

async function azureContainer() {
  if (!containerClientPromise) {
    containerClientPromise = (async () => {
      const { BlobServiceClient } = await import('@azure/storage-blob');
      let serviceClient;
      if (config.storage.connectionString) {
        serviceClient = BlobServiceClient.fromConnectionString(config.storage.connectionString);
      } else {
        const { DefaultAzureCredential } = await import('@azure/identity');
        const endpoint = config.storage.accountUrl || `https://${config.storage.accountName}.blob.core.windows.net`;
        serviceClient = new BlobServiceClient(endpoint, new DefaultAzureCredential());
      }
      const client = serviceClient.getContainerClient(config.storage.containerName);
      await client.createIfNotExists({ access: undefined });
      return client;
    })();
  }
  return containerClientPromise;
}

export async function initializeStorage() {
  if (config.storage.provider === 'azure') await azureContainer();
  else fs.mkdirSync(config.uploadDir, { recursive: true });
}

export async function storeDocument({ storageKey, buffer, contentType, metadata = {} }) {
  if (config.storage.provider === 'azure') {
    const container = await azureContainer();
    const blob = container.getBlockBlobClient(storageKey);
    await blob.uploadData(buffer, {
      blobHTTPHeaders: { blobContentType: contentType || 'application/octet-stream' },
      metadata: Object.fromEntries(Object.entries(metadata).filter(([, value]) => value !== null && value !== undefined).map(([key, value]) => [key, String(value)]))
    });
    return { provider: 'azure', storageKey };
  }
  fs.mkdirSync(config.uploadDir, { recursive: true });
  const filePath = path.join(config.uploadDir, path.basename(storageKey));
  fs.writeFileSync(filePath, buffer, { flag: 'wx' });
  return { provider: 'local', storageKey };
}

export async function openDocument(storageKey) {
  if (config.storage.provider === 'azure') {
    const container = await azureContainer();
    const download = await container.getBlobClient(storageKey).download();
    if (!download.readableStreamBody) throw new Error('Het document kon niet uit Blob Storage worden gelezen.');
    return {
      stream: download.readableStreamBody,
      contentLength: download.contentLength,
      contentType: download.contentType || 'application/octet-stream'
    };
  }
  const filePath = path.join(config.uploadDir, path.basename(storageKey));
  if (!fs.existsSync(filePath)) return null;
  return {
    stream: fs.createReadStream(filePath),
    contentLength: fs.statSync(filePath).size,
    contentType: 'application/octet-stream'
  };
}

export async function deleteDocument(storageKey) {
  if (config.storage.provider === 'azure') {
    const container = await azureContainer();
    await container.deleteBlob(storageKey, { deleteSnapshots: 'include' });
    return;
  }
  const filePath = path.join(config.uploadDir, path.basename(storageKey));
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

export function bufferToStream(buffer) {
  return Readable.from(buffer);
}
