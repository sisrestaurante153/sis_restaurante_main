import { requirePermission } from "@/modules/access/server/authorization";
import { CloneManager } from "@/modules/billing/ui/clone-manager";

export default async function ClonarDadosPage() {
  await requirePermission("platform.manage");

  return (
    <div className="flex flex-col gap-6 pb-8">
      <div>
        <span className="text-[10px] font-bold tracking-widest text-orange-600 uppercase mb-2 block">
          ADMINISTRAÇÃO
        </span>
        <h1 className="text-3xl font-display font-bold text-blue-900 mb-2">
          Clonar Dados
        </h1>
        <p className="text-ink-500 font-body text-sm max-w-2xl">
          Copie itens, fichas técnicas e fornecedores entre restaurantes de forma rápida e segura.
        </p>
      </div>

      <CloneManager />
    </div>
  );
}
