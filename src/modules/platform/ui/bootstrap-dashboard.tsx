import { Card } from "@/components/ui/card";

const highlights = [
  "Monólito modular com Next.js 15 e React 19",
  "PostgreSQL + Prisma preparados para domínio recursivo",
  "Healthcheck HTTP, logging básico e testes automatizados"
];

export function BootstrapDashboard() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center gap-8 px-6 py-16">
      <div className="space-y-4">
        <p className="text-sm font-medium uppercase tracking-[0.3em] text-emerald-800/70">
          Engenharia de produtos
        </p>
        <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-stone-900 sm:text-6xl">
          Fundação técnica pronta para evoluir o sistema de ficha técnica do restaurante.
        </h1>
        <p className="max-w-3xl text-lg leading-8 text-stone-700">
          Este bootstrap estabelece o deploy único, o banco relacional, a base de domínio e o
          pipeline mínimo de qualidade sem reproduzir o Excel como arquitetura.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        {highlights.map((item) => (
          <Card key={item} className="min-h-40">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-stone-500">
              Bootstrap
            </p>
            <p className="mt-6 text-xl font-medium leading-8 text-stone-900">{item}</p>
          </Card>
        ))}
      </section>

      <Card className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-stone-500">
            Operação local
          </p>
          <p className="mt-2 text-lg text-stone-800">
            Use <code>npm run dev</code> para a aplicação e <code>npm run db:up</code> para o banco
            quando Docker estiver disponível.
          </p>
        </div>
        <a
          className="inline-flex items-center justify-center rounded-full bg-stone-900 px-5 py-3 text-sm font-medium text-stone-50 transition hover:bg-stone-700"
          href="/api/health"
        >
          Ver healthcheck
        </a>
      </Card>
    </main>
  );
}
