import { Op } from "sequelize";
import { Document } from "../model/Document.js";

async function add(body) {
  try {
    const latestNoBa = await Document.findOne({
      attributes: ["no_ba"],
      order: [["no_ba", "DESC"]],
    });
    const newDocument = await Document.create({
      no_ba: latestNoBa ? latestNoBa.no_ba + 1 : 1,
      ...body,
    });

    return {
      status: 201,
      message: "Successfull create document",
      data: newDocument,
    };
  }
  catch (error) {
    console.error(error);
    return {
      status: error.status || 500,
      message: error.message,
    };
  }
}

async function getAll() {
  try {
    const allDocument = await Document.findAll();

    return {
      status: 200,
      message: "get document data successful",
      data: allDocument,
    };
  }
  catch (error) {
    console.error(error);
    return {
      status: error.status || 500,
      message: error.message,
    };
  }
}

async function getLatest() {
  try {
    const now = new Date();

    // awal bulan
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // awal bulan berikutnya
    const endMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const latestDocument = await Document.findOne({
      where: {
        createdAt: {
          [Op.gte]: startMonth,
          [Op.lt]: endMonth,
        },
      },
      order: [["no_ba", "DESC"]],
    });

    if (!latestDocument) {
      return {
        status: 200,
        message: "get latest document data successful",
        data: { no_ba: 1 },
      };
    }

    return {
      status: 200,
      message: "get latest document data successful",
      data: { no_ba: latestDocument.no_ba + 1 }, // auto next number
    };
  }
  catch (error) {
    console.error(error);
    return {
      status: error.status || 500,
      message: error.message,
    };
  }
}

async function getOne(id) {
  try {
    const document = await Document.findByPk(id);

    if (!document) {
      return {
        status: 404,
        message: "Document not found",
      };
    }

    return {
      status: 200,
      message: "get document data successful",
      data: document,
    };
  }
  catch (error) {
    console.error(error);
    return {
      status: error.status || 500,
      message: error.message,
    };
  }
}

async function update(body, id) {
  try {
    const [updatedRows] = await Document.update(body, {
      where: { id },
    });

    if (updatedRows === 0) {
      return {
        status: 404,
        message: "Document not found",
      };
    }

    const updatedDocument = await Document.findByPk(id);

    return {
      status: 200,
      message: "Document updated successfully",
      data: updatedDocument,
    };
  }
  catch (error) {
    console.error(error);
    return {
      status: error.status || 500,
      message: error.message,
    };
  }
}

async function destroy(id) {
  try {
    const deletedRows = await Document.destroy({
      where: { id },
    });

    if (deletedRows === 0) {
      return {
        status: 404,
        message: "Document not found",
      };
    }

    return {
      status: 200,
      message: "Document deleted successfully",
    };
  }
  catch (error) {
    console.error(error);
    return {
      status: error.status || 500,
      message: error.message,
    };
  }
}

export default {
  add,
  getAll,
  getOne,
  update,
  destroy,
  getLatest,
};
