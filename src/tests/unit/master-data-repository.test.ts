import { beforeEach, describe, expect, it } from "vitest";
import {
  getMasterDataRepository,
  resetMasterDataRepositoryForTests
} from "@/modules/master-data/server/master-data-repository";

describe("master data repository", () => {
  beforeEach(() => {
    resetMasterDataRepositoryForTests();
  });

  it("creates and lists operational categories in demo mode", async () => {
    const repository = getMasterDataRepository();

    await repository.saveOperationalCategory({
      name: "Empanados"
    });

    const categories = await repository.listOperationalCategories();

    expect(categories.some((entry) => entry.name === "Empanados")).toBe(true);
  });

  it("blocks deleting a supplier linked to item purchases", async () => {
    const repository = getMasterDataRepository();
    const suppliers = await repository.listSuppliers();
    const linkedSupplier = suppliers.find((entry) => entry.name === "VMarket");

    expect(linkedSupplier).toBeDefined();

    const result = await repository.deleteSupplier(linkedSupplier!.id);

    expect(result.success).toBe(false);
    expect(result.reason).toMatch(/vinculo/i);
  });

  it("stores canonical item type records and allows activating labels", async () => {
    const repository = getMasterDataRepository();

    const itemTypes = await repository.listItemTypes();
    const prato = itemTypes.find((entry) => entry.code === "prato");

    expect(prato).toBeDefined();

    await repository.saveItemType({
      id: prato!.id,
      code: "prato",
      name: "Prato final",
      active: true
    });

    const refreshed = await repository.listItemTypes();
    expect(refreshed.find((entry) => entry.code === "prato")?.name).toBe("Prato final");
  });
});
