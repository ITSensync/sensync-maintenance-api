/* eslint-disable node/no-process-env */
/* eslint-disable no-throw-literal */
/* eslint-disable no-console */
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { User } from "../model/User.js";

async function login(body) {
  try {
    const SECRET_TOKEN = process.env.ACCESS_SECRET_TOKEN;

    const { username, password } = body;

    const existedUser = await User.findOne({
      where: {
        username,
      },
    });

    if (!existedUser) {
      throw {
        status: 400,
        message: "Invalid Credentials",
      };
    }

    const hashedPassword = await crypto.createHash("md5").update(password).digest("hex");
    const comparePass = hashedPassword === existedUser.password;

    if (!comparePass) {
      throw {
        status: 400,
        message: " Invalid crdentials",
      };
    }

    const token = jwt.sign({ id: existedUser.id, username: existedUser.username }, SECRET_TOKEN, { expiresIn: "12h" });

    existedUser.accessToken = token;
    existedUser.save();

    return {
      status: 200,
      access_token: token,
      expires_in: "12h",
    };
  }
  catch (error) {
    console.log(error);
    return {
      status: error.status || 500,
      message: error.message,
    };
  }
}

export default {
  login,
};
