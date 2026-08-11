"use client";

import type { CSSProperties, ReactNode } from "react";

interface UpdateRowFormProps {
  action: (formData: FormData) => void;
  itemName: string;
  inUseCount?: number;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

// Form de atualizacao de uma linha de cadastro mestre. Quando o registro esta
// em uso (inUseCount > 0) e o usuario esta desmarcando "Ativo", confirma antes
// de enviar — evita inativar sem aviso algo que ja esta vinculado a itens
// reais (ex.: unidade "kg" usada em compras).
export function UpdateRowForm({ action, itemName, inUseCount = 0, className, style, children }: UpdateRowFormProps) {
  return (
    <form
      action={action}
      className={className}
      style={style}
      onSubmit={(event) => {
        if (inUseCount <= 0) return;
        const form = event.currentTarget;
        const activeInput = form.elements.namedItem("active") as HTMLInputElement | null;
        if (activeInput && !activeInput.checked) {
          const confirmed = window.confirm(
            `"${itemName}" esta em uso em ${inUseCount} ${inUseCount === 1 ? "registro" : "registros"}. Inativar mesmo assim?`
          );
          if (!confirmed) {
            event.preventDefault();
          }
        }
      }}
    >
      {children}
    </form>
  );
}
