"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { withBasePath } from "@/modules/platform/lib/base-path";
import { Eye, EyeOff, Loader2, Mail } from "lucide-react";
import { useState } from "react";

export function LoginForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setMessage(null);

    let response: Response;
    try {
      response = await fetch(withBasePath("/api/auth/login"), {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          email: formData.get("email")?.toString() ?? "",
          password: formData.get("password")?.toString() ?? ""
        })
      });
    } catch {
      setMessage("Falha de conexão. Verifique sua internet e tente novamente.");
      setPending(false);
      return;
    }

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setMessage(payload?.message ?? "Não foi possível autenticar.");
      setPending(false);
      return;
    }

    window.location.assign(withBasePath("/dashboard"));
  }

  return (
    <form
      action={async (formData) => {
        await handleSubmit(formData);
      }}
      className="space-y-5"
    >
      {message && (
        <Alert variant="destructive">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="login-email" className="text-sm font-medium text-foreground">Email</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
              <Mail className="h-4 w-4" />
            </div>
            <Input
              id="login-email"
              name="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="admin@sis-restaurante.local"
              className="pl-10"
              required
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="login-password" className="text-sm font-medium text-foreground">Senha</label>
          <div className="relative">
            <Input
              id="login-password"
              name="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="admin123"
              className="pr-10"
              required
            />
            <div className="absolute inset-y-0 right-0 pr-1 flex items-center">
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="p-2 text-muted-foreground hover:text-foreground transition-colors focus:outline-none rounded-full"
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="bg-brand-primary w-full h-12 mt-2 flex justify-center items-center rounded-full font-semibold text-base shadow-sm disabled:opacity-70 text-white"
      >
        {pending ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Entrando...
          </>
        ) : (
          "Entrar no painel"
        )}
      </button>
    </form>
  );
}
