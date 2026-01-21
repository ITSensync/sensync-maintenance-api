/* eslint-disable unicorn/filename-case */
import { DataTypes } from "sequelize";
import { db } from "../config/db.config.js";

export const User = db.define("user_tbl", {
  id: {
    allowNull: false,
    primaryKey: true,
    autoIncrement: true,
    type: DataTypes.INTEGER,
  },
  username: {
    allowNull: true,
    type: DataTypes.CHAR(100),
  },
  password: {
    allowNull: true,
    type: DataTypes.CHAR(255),
  },
  passdecrypt: {
    allowNull: true,
    type: DataTypes.CHAR(255),
  },
  accessToken: {
    allowNull: true,
    type: DataTypes.CHAR(255),
  },
}, {
  timestamps: false,
  freezeTableName: true,
});
