import { LogMT } from "../model/LogMT.js";

async function getAll(query) {
  try {
    // console.log(query);

    const { id_device } = query;

    const options = {};
    options.order = [["createdAt", "DESC"]];

    if (id_device) {
      options.where = { id_device };
    }

    const allLog = await LogMT.findAll(options);

    return {
      status: 200,
      message: "get log data successful",
      data: allLog,
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

async function add(body) {
  try {
    const newLog = await LogMT.create(body);

    return {
      status: 201,
      message: "Successfull create log",
      data: newLog,
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
    const newLog = await LogMT.update(body, {
      where: {
        id,
      },
    });

    return {
      status: 200,
      message: "Successfull update log",
      data: newLog,
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
    if (!id) {
      return {
        status: 400,
        message: "ID cannot be empty",
      };
    }

    await LogMT.destroy({
      where: {
        id,
      },
    });

    return {
      status: 200,
      message: "Delete log success",
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
  update,
  getAll,
  destroy,
};
