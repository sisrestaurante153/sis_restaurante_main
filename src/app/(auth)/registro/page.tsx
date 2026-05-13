import { redirectIfAuthenticated } from "@/modules/access/server/auth-actions";
import { RegistroForm } from "./registro-form";
import { PLAN_LIST } from "@/modules/billing/domain/plans";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";

export default async function RegistroPage() {
  await redirectIfAuthenticated();

  return (
    <div className="min-h-screen flex w-full bg-brand-bg">

      {/* Painel esquerdo — branding + benefícios */}
      <div className="hidden lg:flex flex-1 flex-col justify-between bg-gradient-to-br from-brand-primary-dark to-brand-primary p-12 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10 z-0" />
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 -left-20 w-80 h-80 bg-brand-orange/20 rounded-full blur-3xl" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
            <div className="w-4 h-4 bg-brand-orange rounded-full" />
          </div>
          <span className="text-2xl font-bold font-serif tracking-tight">SIS Restaurante</span>
        </div>

        {/* Copy principal */}
        <div className="relative z-10 max-w-xl">
          <h1 className="text-5xl font-bold font-serif leading-[1.1] mb-6">
            Comece grátis por 14 dias
          </h1>
          <p className="text-lg text-white/80 leading-relaxed font-sans mb-10">
            Cadastro em menos de 1 minuto. Sem cartão de crédito agora.
          </p>

          {/* Planos resumidos */}
          <div className="flex flex-col gap-4">
            {PLAN_LIST.map((plan) => (
              <div key={plan.code} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckRoundedIcon sx={{ fontSize: 14 }} />
                </div>
                <div>
                  <span className="font-semibold">{plan.label}</span>
                  <span className="text-white/70"> · R$ {plan.monthlyValue}/mês · </span>
                  <span className="text-white/60 text-sm">{plan.description}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-sm text-white/60 font-sans">
            &copy; {new Date().getFullYear()} SIS Restaurante. Todos os direitos reservados.
          </p>
        </div>
      </div>

      {/* Painel direito — formulário */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-[440px] space-y-8 animate-in fade-in zoom-in-95 duration-500">

          {/* Header mobile */}
          <div className="flex flex-col space-y-2 text-center lg:text-left">
            <div className="lg:hidden flex items-center justify-center gap-3 mb-4">
              <div className="w-10 h-10 bg-brand-primary rounded-xl flex items-center justify-center">
                <div className="w-4 h-4 bg-brand-orange rounded-full" />
              </div>
              <span className="text-2xl font-bold font-serif tracking-tight text-brand-dark">
                SIS Restaurante
              </span>
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-brand-dark">
              Criar sua conta
            </h2>
            <p className="text-muted-foreground text-[15px]">
              14 dias gratuitos · Sem cartão agora · Cancele quando quiser
            </p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-sm">
            <RegistroForm />
          </div>

          <div className="text-center text-xs text-muted-foreground">
            Ao criar a conta você concorda com os termos de uso e política de privacidade.
          </div>
        </div>
      </div>
    </div>
  );
}
