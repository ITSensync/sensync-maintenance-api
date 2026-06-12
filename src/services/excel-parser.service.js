import { Buffer } from "node:buffer";
import XLSX from "xlsx";

export async function parseKalibrasiExcel(
  file,
) {
  const inputBuffer = Buffer.isBuffer(file)
    ? file
    : file?.buffer;

  if (!inputBuffer) {
    throw new Error("File kalibrasi tidak ditemukan atau format file tidak valid.");
  }

  const workbook =
    XLSX.read(inputBuffer, {
      type: "buffer",
    });

  const sheetNames =
    workbook.SheetNames;

  const result = {};

  for (const sheet of sheetNames) {
    result[sheet] =
      XLSX.utils.sheet_to_json(
        workbook.Sheets[sheet],
        {
          defval: "",
        },
      );
  }

  return result;
}

export default {
  parseKalibrasiExcel,
};
