import odooService from "./odoo.service.js";

function normalizeFolderPath(folderPath, idDevice) {
  const input = folderPath ?? idDevice;
  const path = Array.isArray(input) ? input : [input];

  return path
    .filter(name => typeof name === "string")
    .flatMap(name => name.split("/").map(part => part.trim()))
    .filter(Boolean);
}

async function getAll(body = {}) {
  try {
    const idDevice = body.id_device ?? body.idDevice;

    if (typeof idDevice !== "string" || !idDevice.trim()) {
      return {
        status: 400,
        message: "id_device wajib diisi",
        data: [],
      };
    }

    const folderPath = normalizeFolderPath(
      body.folder_path ?? body.folderPath ?? body.folder,
      idDevice,
    );
    const photos = await odooService.getFolderPhotos(folderPath);

    return {
      status: 200,
      message: "get photo data successful",
      data: photos,
    };
  }
  catch (error) {
    console.error(error);
    return {
      status: error.status || 500,
      message: error.message,
      data: [],
    };
  }
}

export default {
  getAll,
};
