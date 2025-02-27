import * as fs from 'fs';
import * as path from 'path';
import { Request, Response } from 'express';
import mime from 'mime-types';

interface SaveFileParams {
  courseId: string;
  fileType: string;
  fileName: string;
  file: Buffer;
}

const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.mp4', '.mp3', '.pdf', '.doc', '.docx', '.zip', '.rar', '.7z'];

const allowedTypes = [
  "image/jpeg", "image/jpg", "image/png", "image/gif",
  "video/mp4", "video/quicktime", "video/x-msvideo",
  "audio/mpeg", "audio/wav",
  "application/pdf",
  "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed'
];

const saveFile = async (params: SaveFileParams, mimeType: string): Promise<string> => {

  const { courseId, fileType, fileName, file } = params;

  const fileExtension = path.extname(fileName).toLowerCase();

  if (!validExtensions.includes(fileExtension)) {
    throw new Error(`File extension not allowed: ${fileExtension}`);
  }

  if (!allowedTypes.includes(mimeType)) {
    throw new Error(`File type not allowed: ${mimeType}`);
  }

  //Se verifica que el tipo MIME coincida con la extensión del archivo
  const expectedMimeType = mime.lookup(fileExtension);
  if (mimeType !== expectedMimeType) {
    throw new Error(`The MIME type does not match the file extension. Expected ${expectedMimeType}, but received ${mimeType}`);
  }

  const baseDir = path.resolve(__dirname, '../public/courses');

  const cursoDir = path.join(baseDir, courseId);
  if (!fs.existsSync(cursoDir)) {
    fs.mkdirSync(cursoDir, { recursive: true });
  }

  const tipoDir = path.join(cursoDir, fileType);
  if (!fs.existsSync(tipoDir)) {
    fs.mkdirSync(tipoDir, { recursive: true });
  }

  const filePath = path.join(tipoDir, fileName);

  fs.writeFileSync(filePath, file);

  return filePath;
};

export const handleFileUpload = async (req: Request, res: Response): Promise<void> => {

  const { courseId, fileType, fileName } = req.body;
  const file = req.file?.buffer;

  console.log()

  let mimeType = "application/octet-stream";//se puede mejorar

  if(req.file?.mimetype) mimeType = req.file.mimetype;

  if (!courseId || !fileType || !fileName || !file) {
    res.status(400).send('Missing required parameters');
    return;
  }

  try {
    const filePath = await saveFile({ courseId, fileType, fileName, file }, mimeType);
    res.status(200).send(`File saved at ${filePath}`);
  } catch (error) {
    res.status(500).send('Error saving file ' + (error instanceof Error ? error.message : String(error)));
  }
};
