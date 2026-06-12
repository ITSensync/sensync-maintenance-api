import { Buffer } from "node:buffer";
import { beforeEach, describe, expect, it, vi } from "vitest";

import generateController from "../src/controller/generate.controller.js";
import generateService from "../src/services/generate.service.js";

vi.mock("../src/services/generate.service.js", () => ({
  default: {
    generateReportKalibrasi: vi.fn(),
  },
}));

describe("generateController.generateReportKalibrasi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes the uploaded file and form fields to the report generator", async () => {
    const file = { buffer: Buffer.from("test") };
    const req = {
      body: {
        site: "Sinar Pangjaya",
        tanggal: "14 April 2026",
      },
      file,
    };
    const res = { json: vi.fn() };

    generateService.generateReportKalibrasi.mockResolvedValue({ ok: true });

    await generateController.generateReportKalibrasi(req, res);

    expect(generateService.generateReportKalibrasi).toHaveBeenCalledWith(
      file,
      "Sinar Pangjaya",
      "14 April 2026",
    );
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });
});
