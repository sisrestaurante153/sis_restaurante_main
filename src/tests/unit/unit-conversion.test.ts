import { describe, expect, it } from "vitest";
import {
  calculateCanonicalUnitCost,
  denormalizeQuantityFromCanonical,
  inferUnitTypeFromCode,
  normalizeQuantityToCanonical
} from "@/modules/platform/domain/units";

describe("unit helpers", () => {
  it("normalizes mass quantities to canonical kg", () => {
    expect(normalizeQuantityToCanonical("500", "g").toString()).toBe("0.5");
    expect(normalizeQuantityToCanonical("1", "kg").toString()).toBe("1");
  });

  it("keeps count quantities as-is", () => {
    expect(normalizeQuantityToCanonical("3", "un").toString()).toBe("3");
  });

  it("denormalizes canonical quantities back to the operational unit", () => {
    expect(denormalizeQuantityFromCanonical("0.9", "g").toString()).toBe("900");
    expect(denormalizeQuantityFromCanonical("3", "un").toString()).toBe("3");
  });

  it("calculates canonical unit cost from purchase quantity and unit", () => {
    expect(calculateCanonicalUnitCost("12.5000", "1.0000", "kg").toString()).toBe("12.5");
    expect(calculateCanonicalUnitCost("12.5000", "500.0000", "g").toString()).toBe("25");
  });

  it("infers unit type from code", () => {
    expect(inferUnitTypeFromCode("g")).toBe("massa");
    expect(inferUnitTypeFromCode("ml")).toBe("volume");
    expect(inferUnitTypeFromCode("un")).toBe("contagem");
  });
});
