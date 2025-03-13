import { Router } from "express";
import multer from "multer";
import { handleFileUpload } from "@src/services/FileService";

const fileRouter = Router();

const upload = multer({
  limits: { fileSize: 30 * 1024 * 1024 }, // 30MB
});

fileRouter.post("/upload", upload.single("file"), handleFileUpload);

export default fileRouter;
