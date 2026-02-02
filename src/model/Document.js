/* eslint-disable unicorn/filename-case */
import { DataTypes } from "sequelize";
import { db } from "../config/db.config.js";

export const Document = db.define("document", {
  id: {
    allowNull: false,
    autoIncrement: true,
    type: DataTypes.BIGINT,
    primaryKey: true,
  },
  no_ba: {
    allowNull: false,
    type: DataTypes.INTEGER,
  },
  link: {
    allowNull: false,
    type: DataTypes.STRING,
  },
  catatan: {
    allowNull: false,
    type: DataTypes.TEXT,
  },
}, {
  freezeTableName: true,
  timestamps: true,
});
