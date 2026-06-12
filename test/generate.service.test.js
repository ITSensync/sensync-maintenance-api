import { describe, expect, it } from "vitest";

import generateService from "../src/services/generate.service.js";

describe("generateService.normalizeKalibrasiData", () => {
  it("computes persamaan, r2, and sensitivitas from regression data rows", () => {
    const raw = {
      COD: [
        { larutan: 1, nilai: 2 },
        { larutan: 2, nilai: 4 },
        { larutan: 3, nilai: 6 },
        { persamaan: "y = 9.99x + 9.99", r2: 0.50, sensitivitas: 0.10 },
      ],
    };

    const normalized = generateService.normalizeKalibrasiData(raw);

    expect(normalized.cod.persamaan).toBe("y = 2.00x + 0.00");
    expect(normalized.cod.r2).toBe("1.00");
    expect(normalized.cod.sensitivitas).toBe("2.00");
  });

  it("normalizes uppercase sheet keys and array-based calibration output", () => {
    const raw = {
      COD: [
        { Akurasi: 30.7, Bias: -29.7, Akurasi_1: 36.9, Bias_1: -35.9 },
      ],
      pH: [
        { Akurasi: 1.04, Bias: -0.04, Akurasi_1: 1.01, Bias_1: -0.01 },
      ],
    };

    const normalized = generateService.normalizeKalibrasiData(raw);

    expect(normalized.cod.rows).toEqual(raw.COD);
    expect(normalized.cod.akurasi).toBe(30.7);
    expect(normalized.cod.biasSebelum).toBe(-29.7);
    expect(normalized.cod.biasSesudah).toBe(-35.9);
    expect(normalized.ph.rows).toEqual(raw.pH);
  });
});
