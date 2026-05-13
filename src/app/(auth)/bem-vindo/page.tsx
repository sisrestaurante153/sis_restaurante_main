import Image from "next/image";
import Link from "next/link";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import RestaurantMenuRoundedIcon from "@mui/icons-material/RestaurantMenuRounded";
import PaymentRoundedIcon from "@mui/icons-material/PaymentRounded";
import LoginRoundedIcon from "@mui/icons-material/LoginRounded";

export default function BemVindoPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-bg p-6">
      <div className="w-full max-w-md space-y-8 animate-in fade-in zoom-in-95 duration-500">

        {/* Logo */}
        <div className="flex items-center justify-center">
          <Image src="/logo.jpg" alt="Logo" width={120} height={40} className="h-10 w-auto" priority />
        </div>

        {/* Card principal */}
        <div className="bg-card border border-border rounded-2xl p-8 shadow-sm text-center space-y-4">
          <CheckCircleRoundedIcon sx={{ fontSize: 56, color: "success.main" }} />
          <h1 className="text-2xl font-bold font-serif text-brand-dark">
            Email confirmado!
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Sua conta foi verificada com sucesso. Agora você já pode acessar o sistema e começar o seu período de avaliação gratuita de 14 dias.
          </p>

          <Link
            href="/login"
            className="mt-2 inline-flex items-center justify-center gap-2 w-full px-5 py-3 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-semibold text-sm transition-colors"
          >
            <LoginRoundedIcon fontSize="small" />
            Fazer login agora
          </Link>
        </div>

        {/* Próximos passos */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="font-semibold text-brand-dark text-sm">O que vem a seguir:</h2>
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <LoginRoundedIcon sx={{ fontSize: 16, color: "#1d4ed8" }} />
              </div>
              <div>
                <p className="text-sm font-medium text-brand-dark">Faça seu primeiro login</p>
                <p className="text-xs text-muted-foreground mt-0.5">Use o email e senha que você cadastrou.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                <RestaurantMenuRoundedIcon sx={{ fontSize: 16, color: "#ea580c" }} />
              </div>
              <div>
                <p className="text-sm font-medium text-brand-dark">Configure seu cardápio</p>
                <p className="text-xs text-muted-foreground mt-0.5">Cadastre seus itens, fichas técnicas e insumos.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                <PaymentRoundedIcon sx={{ fontSize: 16, color: "#16a34a" }} />
              </div>
              <div>
                <p className="text-sm font-medium text-brand-dark">Ative sua assinatura antes do trial acabar</p>
                <p className="text-xs text-muted-foreground mt-0.5">14 dias gratuitos. Sem cobrança agora.</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
