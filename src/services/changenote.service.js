import { Changenote } from "../model/Changenote.js";

async function getAll(query) {
  try {
    // console.log(query);

    const { id_device } = query;

    const options = {};

    if (id_device) {
      options.where = { id_device };
    }

    const allChangenote = await Changenote.findAll(options);

    return {
      status: 200,
      message: "get changenote data successful",
      data: allChangenote,
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
    const newChangenote = await Changenote.create(body);

    return {
      status: 201,
      message: "Successfull create changenote",
      data: newChangenote,
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
    const newChangenote = await Changenote.update(body, {
      where: {
        id,
      },
    });

    return {
      status: 200,
      message: "Successfull update changenote",
      data: newChangenote,
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

    await Changenote.destroy({
      where: {
        id,
      },
    });

    return {
      status: 200,
      message: "Delete changenote success",
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
