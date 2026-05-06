"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { item_type as ItemType, unidade_tipo as UnidadeTipo } from "@/generated/prisma/client";
import { requirePermission } from "@/modules/access/server/authorization";
import { getMasterDataRepository } from "@/modules/master-data/server/master-data-repository";

async function resolveMasterDataActor() {
  try {
    return await requirePermission("item.write");
  } catch (error) {
    if (error instanceof Error && error.message.includes("outside a request scope")) {
      return {
        userId: null,
        name: "Sistema",
        email: "system@sis-restaurante.local",
        roleCodes: ["admin"]
      };
    }

    throw error;
  }
}

function getKind(formData: FormData) {
  return formData.get("kind")?.toString() ?? "";
}

export async function saveMasterDataAction(formData: FormData) {
  await resolveMasterDataActor();

  const repository = getMasterDataRepository();
  const kind = getKind(formData);

  const paths: Record<string, string> = {
    "supplier": "/cadastros/fornecedores",
    "unit": "/cadastros/unidades",
    "operational-category": "/cadastros/categorias",
    "modality": "/cadastros/modalidades",
    "item-type": "/cadastros/tipos-item",
    "stage-type": "/cadastros/tipos-etapa"
  };

  try {
    switch (kind) {
      case "supplier":
        await repository.saveSupplier({
          id: formData.get("id")?.toString() || undefined,
          name: formData.get("name")?.toString() ?? "",
          active: formData.get("active")?.toString() === "true"
        });
        break;
      case "unit":
        await repository.saveUnit({
          id: formData.get("id")?.toString() || undefined,
          code: formData.get("code")?.toString() ?? "",
          name: formData.get("name")?.toString() ?? "",
          measureType: (formData.get("measureType")?.toString() ?? "massa") as UnidadeTipo,
          active: formData.get("active")?.toString() === "true"
        });
        break;
      case "operational-category":
        await repository.saveOperationalCategory({
          id: formData.get("id")?.toString() || undefined,
          name: formData.get("name")?.toString() ?? "",
          active: formData.get("active")?.toString() === "true"
        });
        break;
      case "modality":
        await repository.saveModality({
          id: formData.get("id")?.toString() || undefined,
          code: formData.get("code")?.toString() ?? "",
          name: formData.get("name")?.toString() ?? "",
          active: formData.get("active")?.toString() === "true"
        });
        break;
      case "item-type":
        await repository.saveItemType({
          id: formData.get("id")?.toString() || undefined,
          code: (formData.get("code")?.toString() ?? "insumo") as ItemType,
          name: formData.get("name")?.toString() ?? "",
          active: formData.get("active")?.toString() === "true"
        });
        break;
      case "stage-type":
        await repository.saveStageType({
          id: formData.get("id")?.toString() || undefined,
          code:
            (formData.get("code")?.toString() as "limpeza_pre_preparo" | "coccao_preparo" | "montagem") ??
            "limpeza_pre_preparo",
          name: formData.get("name")?.toString() ?? "",
          active: formData.get("active")?.toString() === "true"
        });
        break;
      default:
        redirect("/cadastros?error=invalid_kind");
    }
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
      throw error;
    }
    const message = error instanceof Error ? encodeURIComponent(error.message) : "save_failed";
    const redirectPath = paths[kind] || "/cadastros";
    redirect(`${redirectPath}?error=${message}`);
  }

  const redirectPath = paths[kind] || "/cadastros";
  revalidatePath(redirectPath);
  redirect(`${redirectPath}?saved=${kind}`);
}

export async function deleteMasterDataAction(formData: FormData) {
  await resolveMasterDataActor();

  const repository = getMasterDataRepository();
  const kind = getKind(formData);
  const id = formData.get("id")?.toString() ?? "";

  const paths: Record<string, string> = {
    "supplier": "/cadastros/fornecedores",
    "unit": "/cadastros/unidades",
    "operational-category": "/cadastros/categorias",
    "modality": "/cadastros/modalidades",
    "item-type": "/cadastros/tipos-item",
    "stage-type": "/cadastros/tipos-etapa"
  };

  const result =
    kind === "supplier"
      ? await repository.deleteSupplier(id)
      : kind === "unit"
        ? await repository.deleteUnit(id)
        : kind === "operational-category"
          ? await repository.deleteOperationalCategory(id)
          : kind === "modality"
            ? await repository.deleteModality(id)
            : kind === "item-type"
              ? await repository.deleteItemType(id)
              : kind === "stage-type"
                ? await repository.deleteStageType(id)
              : { success: false as const, reason: "Tipo de cadastro invalido." };

  const redirectPath = paths[kind] || "/cadastros";

  if (!result.success) {
    redirect(`${redirectPath}?error=${encodeURIComponent(result.reason)}`);
  }

  revalidatePath(redirectPath);
  redirect(`${redirectPath}?deleted=${kind}`);
}
