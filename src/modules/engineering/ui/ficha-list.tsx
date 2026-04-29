import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";

interface FichaListProps {
  items: Array<{
    id: string;
    itemName: string;
    itemType: string;
    version: number;
    status: string;
    totalCost: string;
    updatedAt: string;
    componentCount: number;
  }>;
}

export function FichaList({ items }: FichaListProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Ficha</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Componentes</TableHead>
          <TableHead>Custo total</TableHead>
          <TableHead>Atualizacao</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableCell className="min-w-[220px]">
              <Link
                href={`/fichas/${item.id}` as never}
                className="font-medium text-foreground underline-offset-4 hover:text-accent hover:underline"
              >
                {item.itemName}
              </Link>
              <p className="mt-1 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                {item.itemType.replaceAll("_", " ")} - v{item.version}
              </p>
            </TableCell>
            <TableCell>
              <Badge className="border-emerald-200 bg-emerald-100 text-emerald-900 hover:bg-emerald-100">
                {item.status}
              </Badge>
            </TableCell>
            <TableCell className="text-muted-foreground">{item.componentCount}</TableCell>
            <TableCell className="font-medium">R$ {item.totalCost}</TableCell>
            <TableCell className="text-muted-foreground">{new Date(item.updatedAt).toLocaleString("pt-BR")}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
