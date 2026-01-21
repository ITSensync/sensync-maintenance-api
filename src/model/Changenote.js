/* eslint-disable unicorn/filename-case */
import { DataTypes } from "sequelize";
import { db } from "../config/db.config.js";

export const Changenote = db.define("changenote", {
  id: {
    allowNull: false,
    autoIncrement: true,
    type: DataTypes.BIGINT,
    primaryKey: true,
  },
  id_device: {
    allowNull: false,
    type: DataTypes.STRING,
  },
  teknisi: {
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
