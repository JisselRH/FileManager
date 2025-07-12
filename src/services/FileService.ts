import * as fs from 'fs';
import * as path from 'path';
import { Request, Response } from 'express';
import mime from 'mime-types';
import sharp from 'sharp';

interface SaveFileParams {
  courseId: string;
  fileType: string;
  fileName: string;
  file: Buffer;
}

const validExtensions = [
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.mkv', '.json',
  '.mp3', '.pdf', '.doc', '.docx', '.zip', '.rar', '.7z', '.csv',
];

const allowedTypes = [
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
  'video/mp4', 'video/mkv', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska',
  'audio/mpeg', 'audio/wav',
  'application/pdf', 'text/csv',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed',
  'application/json',
];

const maxSize = {
  image: 5 * 1024 * 1024, // 5MB
  video: 30 * 1024 * 1024, // 30MB
  other: 30 * 1024 * 1024, // 30MB
};

const resizeImage = async (buffer: Buffer): Promise<Buffer> => {
  try {
    const metadata = await sharp(buffer).metadata();
    if (metadata.width && metadata.height && (metadata.width > 1980 || metadata.height > 1980)) {
     
      return await sharp(buffer).resize({ width: 1980, height: 1980, fit: 'inside' }).toBuffer();
    }
    return buffer;
  } catch (error) {
    throw new Error('Failed to process image: ' + (error instanceof Error ? error.message : String(error)));
  }
};

const saveFile = async (params: SaveFileParams, mimeType: string): Promise<string> => {
  const { courseId, fileType, fileName, file } = params;

  const fileExtension = path.extname(fileName).toLowerCase();

  if (!validExtensions.includes(fileExtension)) {
    throw new Error(`File extension not allowed: ${fileExtension}`);
  }

  if (!allowedTypes.includes(mimeType)) {
    throw new Error(`File type not allowed: ${mimeType}`);
  }

  const expectedMimeType = mime.lookup(fileExtension);
  if (mimeType !== expectedMimeType) {
    throw new Error(`MIME type mismatch. Expected ${expectedMimeType}, received ${mimeType}`);
  }

  if (mimeType.startsWith('image/') && file.length > maxSize.image) {
    throw new Error('Image file exceeds 5MB limit');
  } else if (mimeType.startsWith('video/') && file.length > maxSize.video) {
    throw new Error('Video file exceeds 30MB limit');
  } else if (file.length > maxSize.other) {
    throw new Error('File exceeds 30MB limit');
  }

  const baseDir = path.resolve('/assets/courses');
  const cursoDir = path.join(baseDir, courseId);

  if (!fs.existsSync(cursoDir)) {
    fs.mkdirSync(cursoDir, { recursive: true });
  }

  const tipoDir = path.join(cursoDir, fileType);
  if (!fs.existsSync(tipoDir)) {
    fs.mkdirSync(tipoDir, { recursive: true });
  }

  const safeFileName = path.basename(fileName);
  const filePath = path.join(tipoDir, safeFileName);

  if (fs.existsSync(filePath)) {
    throw new Error('File already exists. Please rename the file or delete the existing one.');
  }

  let finalFile = file;
  if (mimeType.startsWith('image/')) {
    finalFile = await resizeImage(file);
  }

  await fs.promises.writeFile(filePath, finalFile);

  return filePath;
};

export const handleFileUpload = async (req: Request, res: Response) => {
  const body = req.body as SaveFileParams;
  const file = req.file;

  if (!body || !file?.buffer) {
    res.status(400).send('Missing required file or parameters');
    return;
  }

  const { courseId, fileType, fileName } = body;

  if (!courseId || !fileType || !fileName) {
    res.status(400).send('Missing required body parameters');
    return ;
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(courseId)) {
    res.status(400).send('Invalid courseId format');
    return;
  }

  const mimeType = file.mimetype || 'application/octet-stream';

  try {
    const filePath = await saveFile({
      courseId,
      fileType,
      fileName,
      file: file.buffer,
    }, mimeType);

    const base = 'https://sophia-assets.wiloxagency.com/';
    const dir = filePath.split('/assets/');
    const urlFinal = base + dir[1];

    res.status(200).send('urlFinal ' + urlFinal);

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (
      message.includes('not allowed') ||
      message.includes('exceeds') ||
      message.includes('mismatch') ||
      message.includes('Invalid') ||
      message.includes('already exists')
    ) {
      res.status(400).send('Validation error: ' + message);
      return ;
    }
    // eslint-disable-next-line no-console
    console.error(`[${new Date().toISOString()}] Error saving file:`, error);
    res.status(500).send('Unexpected error saving file');
  }
};