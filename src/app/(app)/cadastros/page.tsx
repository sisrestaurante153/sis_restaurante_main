import Link from "next/link";
import BusinessRoundedIcon from "@mui/icons-material/BusinessRounded";
import ScaleRoundedIcon from "@mui/icons-material/ScaleRounded";
import CategoryRoundedIcon from "@mui/icons-material/CategoryRounded";
import FastfoodRoundedIcon from "@mui/icons-material/FastfoodRounded";
import LabelRoundedIcon from "@mui/icons-material/LabelRounded";
import LinearScaleRoundedIcon from "@mui/icons-material/LinearScaleRounded";

export default function CadastrosHubPage() {
  const menus = [
    {
      title: "Fornecedores",
      description: "Gerencie os parceiros e empresas fornecedoras.",
      href: "/cadastros/fornecedores",
      icon: <BusinessRoundedIcon fontSize="large" />,
      color: "text-blue-600",
      bg: "bg-blue-50",
      border: "hover:border-blue-600"
    },
    {
      title: "Unidades",
      description: "Unidades de compra, estoque e uso (ex: kg, L, un).",
      href: "/cadastros/unidades",
      icon: <ScaleRoundedIcon fontSize="large" />,
      color: "text-orange-600",
      bg: "bg-orange-50",
      border: "hover:border-orange-500"
    },
    {
      title: "Grupos Operacionais",
      description: "Grupos usados no agrupamento de insumos e fichas.",
      href: "/cadastros/grupos",
      icon: <CategoryRoundedIcon fontSize="large" />,
      color: "text-blue-700",
      bg: "bg-blue-100",
      border: "hover:border-blue-700"
    },
    {
      title: "Modalidades",
      description: "Modalidades selecionadas diretamente na ficha técnica.",
      href: "/cadastros/modalidades",
      icon: <FastfoodRoundedIcon fontSize="large" />,
      color: "text-orange-700",
      bg: "bg-orange-100",
      border: "hover:border-orange-600"
    },
    {
      title: "Tipos de Item",
      description: "Nomenclatura dos tipos canônicos (insumo, preparo...).",
      href: "/cadastros/tipos-item",
      icon: <LabelRoundedIcon fontSize="large" />,
      color: "text-ink-600",
      bg: "bg-ink-100",
      border: "hover:border-ink-600"
    },
    {
      title: "Tipos de Etapa",
      description: "Etapas que governam FC, IC e fluxo de montagem.",
      href: "/cadastros/tipos-etapa",
      icon: <LinearScaleRoundedIcon fontSize="large" />,
      color: "text-blue-900",
      bg: "bg-blue-100",
      border: "hover:border-blue-900"
    }
  ] as const;

  return (
    <div className="flex flex-col gap-8 pb-8">
      <div>
        <span className="text-[10px] font-bold tracking-widest text-orange-600 uppercase mb-2 block">
          CONFIGURAÇÕES BASE
        </span>
        <h1 className="text-3xl font-display font-bold text-blue-900 mb-2">
          Cadastros Mestres
        </h1>
        <p className="text-ink-500 font-body text-sm max-w-2xl">
          Selecione a categoria de dados mestres que deseja visualizar ou editar. Estas configurações afetam todo o comportamento de cálculos e agrupamentos do sistema.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {menus.map((menu) => (
          <Link 
            key={menu.href} 
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            href={menu.href as any}
            className={`group flex flex-col bg-white p-6 rounded-2xl border border-ink-200 shadow-sm transition-all hover:shadow-md ${menu.border}`}
          >
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-6 transition-colors ${menu.bg} ${menu.color} group-hover:scale-110 duration-300`}>
              {menu.icon}
            </div>
            <h3 className="font-display font-bold text-xl text-blue-900 mb-2 group-hover:text-orange-600 transition-colors">
              {menu.title}
            </h3>
            <p className="text-ink-500 text-sm font-body">
              {menu.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
