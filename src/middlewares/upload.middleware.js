import multer from "multer";

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // max 10MB (opsional)
  },
});

// khusus dokumentasi multiple
export const uploadDokumentasi = upload.array("dokumentasi");

// kalau nanti ada field lain:
// export const uploadSingle = upload.single("file");
// export const uploadFields = upload.fields([...]);
