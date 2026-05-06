import Link from "next/link";
import { notFound } from "next/navigation";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ErrorRoundedIcon from "@mui/icons-material/ErrorRounded";
import { getMasterDataRepository } from "@/modules/master-data/server/master-data-repository";
import { saveMasterDataAction, deleteMasterDataAction } from "@/modules/master-data/server/master-data-actions";

type SearchParams = Promise<{
  saved?: string;
  deleted?: string;
  error?: string;
}>;

const KIND_MAPPING: Record<string, { title: string, dbKind: string, desc: string }> = {
  "fornecedores": { title: "Fornecedores", dbKind: "supplier", desc: "Fornecedores usados nas referências de compra." },
  "unidades": { title: "Unidades", dbKind: "unit", desc: "Unidades de compra, estoque e uso." },
  "categorias": { title: "Categorias Operacionais", dbKind: "operational-category", desc: "Categorias de agrupamento de insumos." },
  "modalidades": { title: "Modalidades", dbKind: "modality", desc: "Modalidades de fichas técnicas." },
  "tipos-item": { title: "Tipos de Item", dbKind: "item-type", desc: "Nomenclatura dos tipos canônicos." },
  "tipos-etapa": { title: "Tipos de Etapa", dbKind: "stage-type", desc: "Tipos de etapas de preparação e cálculo." }
};

export default async function MasterDataScreen({ 
  params,
  searchParams
}: { 
  params: Promise<{ kind: string }>;
  searchParams?: SearchParams;
}) {
  const p = await params;
  const kindInfo = KIND_MAPPING[p.kind];
  if (!kindInfo) {
    notFound();
  }

  const sParams = await searchParams;
  const repository = getMasterDataRepository();

  // Fetch only what we need based on kind
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let data: any[] = [];
  if (p.kind === "fornecedores") data = await repository.listSuppliers();
  if (p.kind === "unidades") data = await repository.listUnits();
  if (p.kind === "categorias") data = await repository.listOperationalCategories();
  if (p.kind === "modalidades") data = await repository.listModalities();
  if (p.kind === "tipos-item") data = await repository.listItemTypes();
  if (p.kind === "tipos-etapa") data = await repository.listStageTypes();

  return (
    <div className="flex flex-col gap-6 pb-8">
      {/* Header */}
      <div>
        <Link 
          href="/cadastros" 
          className="inline-flex items-center gap-2 text-ink-500 hover:text-orange-600 transition-colors text-sm font-semibold mb-4"
        >
          <ArrowBackRoundedIcon fontSize="small" />
          Voltar para Cadastros
        </Link>
        <span className="text-[10px] font-bold tracking-widest text-orange-600 uppercase mb-2 block">
          CADASTROS MESTRES
        </span>
        <h1 className="text-3xl font-display font-bold text-blue-900 mb-2">
          {kindInfo.title}
        </h1>
        <p className="text-ink-500 font-body text-sm max-w-2xl">
          {kindInfo.desc}
        </p>
      </div>

      {/* Alerts */}
      {sParams?.saved && (
        <div className="bg-success-bg border border-success/30 text-success px-4 py-3 rounded-xl flex items-center gap-3">
          <CheckCircleRoundedIcon fontSize="small" />
          <span className="text-sm font-semibold">Registro salvo com sucesso!</span>
        </div>
      )}
      {sParams?.deleted && (
        <div className="bg-success-bg border border-success/30 text-success px-4 py-3 rounded-xl flex items-center gap-3">
          <CheckCircleRoundedIcon fontSize="small" />
          <span className="text-sm font-semibold">Registro removido com sucesso!</span>
        </div>
      )}
      {sParams?.error && (
        <div className="bg-error/10 border border-error/30 text-error px-4 py-3 rounded-xl flex items-center gap-3">
          <ErrorRoundedIcon fontSize="small" />
          <span className="text-sm font-semibold">{decodeURIComponent(sParams.error)}</span>
        </div>
      )}

      {/* Creation Form */}
      <div className="bg-white p-6 rounded-2xl border border-ink-200 shadow-sm">
        <h3 className="font-display font-semibold text-lg text-blue-900 mb-4">Novo Registro</h3>
        <form action={saveMasterDataAction} className="flex flex-col md:flex-row gap-4 items-start md:items-center">
          <input type="hidden" name="kind" value={kindInfo.dbKind} />
          <input type="hidden" name="active" value="true" />
          
          {(p.kind === "unidades" || p.kind === "modalidades" || p.kind === "tipos-item" || p.kind === "tipos-etapa") && (
            <div className="w-full md:w-1/4">
              <label className="text-[11px] font-bold text-ink-500 uppercase tracking-wider mb-1 block">Código</label>
              {p.kind === "tipos-item" ? (
                <select name="code" className="w-full h-11 px-4 rounded-xl border border-ink-200 bg-paper focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all text-sm font-medium text-ink-900">
                  {["insumo", "pre_preparo", "intermediario", "produto_pronto", "prato", "porcao", "marmita", "combo", "embalagem", "apoio"].map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : p.kind === "tipos-etapa" ? (
                <select name="code" className="w-full h-11 px-4 rounded-xl border border-ink-200 bg-paper focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all text-sm font-medium text-ink-900">
                  <option value="limpeza_pre_preparo">Limpeza / Pré-Preparo</option>
                  <option value="coccao_preparo">Cocção / Preparo</option>
                  <option value="montagem">Montagem</option>
                </select>
              ) : (
                <input type="text" name="code" className="w-full h-11 px-4 rounded-xl border border-ink-200 bg-paper focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all text-sm font-medium text-ink-900" placeholder="ex: un" required />
              )}
            </div>
          )}

          <div className="w-full flex-1">
            <label className="text-[11px] font-bold text-ink-500 uppercase tracking-wider mb-1 block">Nome / Descrição</label>
            <input type="text" name="name" className="w-full h-11 px-4 rounded-xl border border-ink-200 bg-paper focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all text-sm font-medium text-ink-900" placeholder="Digite o nome..." required />
          </div>

          {p.kind === "unidades" && (
            <div className="w-full md:w-1/4">
              <label className="text-[11px] font-bold text-ink-500 uppercase tracking-wider mb-1 block">Tipo</label>
              <select name="measureType" className="w-full h-11 px-4 rounded-xl border border-ink-200 bg-paper focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all text-sm font-medium text-ink-900">
                <option value="massa">Massa</option>
                <option value="volume">Volume</option>
                <option value="contagem">Contagem</option>
              </select>
            </div>
          )}

          <div className="w-full md:w-auto mt-5 md:mt-0 pt-0.5">
            <button type="submit" className="h-11 w-full md:w-auto px-6 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-xl transition-colors shadow-sm text-sm">
              Adicionar
            </button>
          </div>
        </form>
      </div>

      {/* List */}
      <div className="flex flex-col gap-3">
        {data.map((item) => (
          <div key={item.id} className="bg-white p-5 rounded-2xl border border-ink-200 shadow-sm flex flex-col lg:flex-row gap-4 justify-between items-center group hover:border-blue-300 transition-colors">
            <form action={saveMasterDataAction} className="flex-1 w-full flex flex-col md:flex-row gap-4 items-center">
              <input type="hidden" name="kind" value={kindInfo.dbKind} />
              <input type="hidden" name="id" value={item.id} />
              
              {item.code !== undefined && (
                <div className="w-full md:w-1/4">
                  {p.kind === "tipos-item" ? (
                    <select name="code" defaultValue={item.code} className="w-full h-11 px-4 rounded-xl border border-ink-200 bg-paper focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all text-sm font-medium text-ink-900">
                      {["insumo", "pre_preparo", "intermediario", "produto_pronto", "prato", "porcao", "marmita", "combo", "embalagem", "apoio"].map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : p.kind === "tipos-etapa" ? (
                    <select name="code" defaultValue={item.code} className="w-full h-11 px-4 rounded-xl border border-ink-200 bg-paper focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all text-sm font-medium text-ink-900">
                      <option value="limpeza_pre_preparo">Limpeza / Pré-Preparo</option>
                      <option value="coccao_preparo">Cocção / Preparo</option>
                      <option value="montagem">Montagem</option>
                    </select>
                  ) : (
                    <input type="text" name="code" defaultValue={item.code} readOnly={p.kind === "categorias"} className="w-full h-11 px-4 rounded-xl border border-ink-200 bg-paper focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all text-sm font-medium text-ink-900 read-only:bg-ink-50 read-only:text-ink-500 read-only:focus:border-ink-200" />
                  )}
                </div>
              )}

              <div className="w-full flex-1">
                <input type="text" name="name" defaultValue={item.name} className="w-full h-11 px-4 rounded-xl border border-ink-200 bg-paper focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all text-sm font-medium text-ink-900" />
              </div>

              {p.kind === "unidades" && (
                <div className="w-full md:w-1/4">
                  <select name="measureType" defaultValue={item.measureType} className="w-full h-11 px-4 rounded-xl border border-ink-200 bg-paper focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all text-sm font-medium text-ink-900">
                    <option value="massa">Massa</option>
                    <option value="volume">Volume</option>
                    <option value="contagem">Contagem</option>
                  </select>
                </div>
              )}

              <div className="flex items-center gap-3 min-w-[120px]">
                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-ink-600">
                  <input type="checkbox" name="active" value="true" defaultChecked={item.active} className="w-4 h-4 rounded text-blue-600 focus:ring-blue-600 cursor-pointer accent-blue-600" />
                  Ativo
                </label>
              </div>

              <button type="submit" className="h-10 px-5 border border-blue-600 text-blue-600 hover:bg-blue-50 font-semibold rounded-lg transition-colors text-sm whitespace-nowrap">
                Atualizar
              </button>
            </form>

            <form action={deleteMasterDataAction} className="w-full lg:w-auto">
              <input type="hidden" name="kind" value={kindInfo.dbKind} />
              <input type="hidden" name="id" value={item.id} />
              <button type="submit" className="w-full h-10 px-4 text-ink-400 hover:text-error hover:bg-error/10 font-semibold rounded-lg transition-colors flex items-center justify-center">
                <DeleteOutlineRoundedIcon fontSize="small" />
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
