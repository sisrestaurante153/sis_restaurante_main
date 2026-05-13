import Image from "next/image";
import { redirectIfAuthenticated } from "@/modules/access/server/auth-actions";
import { LoginForm } from "@/modules/access/ui/login-form";

export default async function LoginPage() {
  await redirectIfAuthenticated();

  return (
    <div className="min-h-screen flex w-full bg-brand-bg">
      {/* Left side: branding/image */}
      <div className="hidden lg:flex flex-1 flex-col justify-between bg-gradient-to-br from-brand-primary-dark to-brand-primary p-12 text-white relative overflow-hidden">
        {/* Abstract shapes or patterns could go here */}
        <div className="absolute inset-0 bg-black/10 z-0"></div>
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 -left-20 w-80 h-80 bg-brand-orange/20 rounded-full blur-3xl"></div>

        <div className="relative z-10">
          <Image src="/logo.jpg" alt="Logo" width={120} height={40} className="h-10 w-auto" priority />
        </div>

        <div className="relative z-10 max-w-xl">
          <h1 className="text-5xl font-bold font-serif leading-[1.1] mb-6">
            Gestão inteligente de fichas técnicas
          </h1>
          <p className="text-lg text-white/80 leading-relaxed font-sans">
            Substitua suas planilhas por um sistema centralizado de cálculo de custos, 
            rendimentos e composição recursiva de ponta a ponta.
          </p>
        </div>

        <div className="relative z-10">
          <p className="text-sm text-white/60 font-sans">
            &copy; {new Date().getFullYear()} SIS Restaurante. Todos os direitos reservados.
          </p>
        </div>
      </div>

      {/* Right side: login form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-[420px] space-y-8 animate-in fade-in zoom-in-95 duration-500">
          <div className="flex flex-col space-y-2 text-center lg:text-left">
            <div className="lg:hidden flex items-center justify-center mb-6">
              <Image src="/logo.jpg" alt="Logo" width={120} height={40} className="h-10 w-auto" priority />
            </div>
            
            <h2 className="text-3xl font-bold tracking-tight text-brand-dark">
              Acesse o painel
            </h2>
            <p className="text-muted-foreground text-[15px]">
              Insira suas credenciais para entrar no ambiente operacional.
            </p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-sm">
            <LoginForm />
          </div>
          
          <div className="text-center text-sm text-muted-foreground">
            Sessão segura com cookie HttpOnly.
          </div>
        </div>
      </div>
    </div>
  );
}
