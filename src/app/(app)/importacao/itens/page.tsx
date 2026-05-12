import { ConfigurableItemImport } from "@/modules/import/ui/ConfigurableItemImport";
import { requirePermission } from "@/modules/access/server/authorization";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export default async function ConfigurableImportPage() {
  await requirePermission("import.run");

  return (
    <div className="flex flex-col gap-8 p-6 pb-12">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-xs font-medium text-ink-400">
        <Link href="/dashboard" className="hover:text-blue-600 transition-colors">Home</Link>
        <ChevronRight className="w-3 h-3" />
        <Link href="/importacao" className="hover:text-blue-600 transition-colors">Importação</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-ink-600">Importação de Itens</span>
      </nav>

      {/* Header Section */}
      <div>
        <span className="text-[10px] font-bold tracking-widest text-orange-600 uppercase mb-2 block font-display">
          FERRAMENTAS DE DADOS
        </span>
        <h1 className="text-3xl font-display font-bold text-blue-900 mb-2">
          Importar Itens (Configurável)
        </h1>
        <p className="text-ink-500 font-body text-sm max-w-2xl">
          Envie sua planilha de itens e mapeie as colunas de acordo com o sistema. Suporta XLSX e CSV.
        </p>
      </div>

      <div className="max-w-6xl w-full">
        <ConfigurableItemImport />
      </div>
    </div>
  );
}
