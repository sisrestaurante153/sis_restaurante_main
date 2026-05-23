"use client";

import { useEffect, useRef, useState } from "react";
import TextField, { type TextFieldProps } from "@mui/material/TextField";

export function parseDecimalValue(value: string): number | null {
  const normalized = value.replace(",", ".").trim();
  if (!normalized) return null;
  const num = parseFloat(normalized);
  return Number.isFinite(num) ? num : null;
}

export function formatDecimalDisplay(value: string, decimals = 3): string {
  const num = parseDecimalValue(value);
  if (num === null) return "";
  return num.toFixed(decimals).replace(".", ",");
}

/**
 * Campo numérico decimal com:
 * - vírgula como separador decimal (padrão pt-BR)
 * - 3 casas decimais na exibição (após perder o foco)
 * - aceita vírgula e ponto na digitação
 * - armazena internamente com ponto (compatível com os cálculos existentes)
 */
export function DecimalTextField({
  value,
  onChange,
  inputStyle,
  textAlign = "right",
  ...rest
}: Omit<TextFieldProps, "value" | "onChange" | "type"> & {
  value: string;
  onChange: (normalizedValue: string) => void;
  inputStyle?: React.CSSProperties;
  textAlign?: "left" | "right" | "center";
}) {
  const [localValue, setLocalValue] = useState(() => formatDecimalDisplay(value));
  const focused = useRef(false);

  // Sincroniza quando o pai muda o valor (ex: conversão de unidade), mas não interrompe a digitação
  useEffect(() => {
    if (!focused.current) {
      setLocalValue(formatDecimalDisplay(value));
    }
  }, [value]);

  return (
    <TextField
      {...rest}
      type="text"
      value={localValue}
      slotProps={{
        htmlInput: {
          inputMode: "decimal" as const,
          style: { textAlign, ...inputStyle }
        }
      }}
      onChange={(event) => {
        const raw = event.target.value;
        setLocalValue(raw);
        // Atualiza o pai com ponto decimal para cálculos
        onChange(raw.replace(",", "."));
      }}
      onFocus={(event) => {
        focused.current = true;
        // Remove zeros à direita para facilitar a edição: "1,200" → "1,2"
        const num = parseDecimalValue(value);
        if (num !== null) {
          setLocalValue(String(num).replace(".", ","));
        }
        event.target.select();
        rest.onFocus?.(event);
      }}
      onBlur={(event) => {
        focused.current = false;
        const num = parseDecimalValue(localValue);
        if (num !== null) {
          const formatted = num.toFixed(3).replace(".", ",");
          setLocalValue(formatted);
          // Mantém 4 decimais internamente para precisão nos cálculos
          onChange(num.toFixed(4));
        } else if (!localValue.trim()) {
          setLocalValue("");
          onChange("");
        } else {
          // Entrada inválida: reverte para o valor do pai
          setLocalValue(formatDecimalDisplay(value));
        }
        rest.onBlur?.(event);
      }}
    />
  );
}
