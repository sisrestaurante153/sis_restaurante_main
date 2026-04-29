import Link from "next/link";
import { Card } from "@/components/ui/card";

interface AssemblyWorkbenchProps {
  scenarios: Array<{
    id: string;
    label: string;
    category: string;
    includedItems: string[];
    totalCost: string;
    packagingCost: string;
    finalOutput: string;
  }>;
}

export function AssemblyWorkbench({ scenarios }: AssemblyWorkbenchProps) {
  return (
    <div className="grid gap-4 xl:grid-cols-3">
      {scenarios.map((scenario) => (
        <Card key={scenario.id}>
          <p className="app-muted-label text-accent">
            {scenario.category}
          </p>
          <h3 className="mt-4 text-xl font-semibold text-foreground">{scenario.label}</h3>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{scenario.includedItems.join(" - ")}</p>
          <div className="mt-6 grid gap-3 rounded-[1rem] border border-border/80 bg-muted/35 p-4 text-sm text-muted-foreground">
            <p><strong className="text-foreground">Custo total:</strong> R$ {scenario.totalCost}</p>
            <p><strong className="text-foreground">Embalagem:</strong> R$ {scenario.packagingCost}</p>
            <p><strong className="text-foreground">Saida final:</strong> {scenario.finalOutput}</p>
            <Link
              href={`/fichas/${scenario.id}` as never}
              className="text-sm font-medium text-accent underline-offset-4 hover:underline"
            >
              Abrir ficha da montagem
            </Link>
          </div>
        </Card>
      ))}
    </div>
  );
}
