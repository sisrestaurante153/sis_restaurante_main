"use client";

import { useState } from "react";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";

/**
 * Flat dropdown aligned to the HTML reference contract
 * (update/tela-fichas-grade-v1.html linhas 46-47 .filter-sel).
 *
 * Implementado com Menu do MUI (renderizado em Portal, controlado por JS) em
 * vez de um <select> nativo. Controles <select> nativos ficam sujeitos a
 * temas do sistema operacional/navegador (modo alto contraste, extensoes de
 * dark mode, etc.) que sobrescrevem o background customizado via CSS mesmo
 * com background-repeat:no-repeat explicito — o SVG do chevron acabava sendo
 * repetido (tiled) pelo tema forcado em vez de respeitar o CSS da aplicacao.
 * Um botao + Menu nao depende de nenhum controle nativo do navegador.
 *
 * A11y: como nao ha label visivel, quem usar este componente DEVE informar
 * `ariaLabel`.
 */
export interface FlatSelectOption {
  value: string;
  label: string;
}

export interface FlatSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: FlatSelectOption[];
  ariaLabel: string;
  minWidth?: number;
  name?: string;
}

export function FlatSelect({ value, onChange, options, ariaLabel, minWidth = 148, name }: FlatSelectProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [focused, setFocused] = useState(false);
  const open = Boolean(anchorEl);

  const isActive = value !== "all" && value !== "";
  const activeBorderColor = "#185FA5";
  const defaultBorderColor = "#D3D1C7";
  const selectedOption = options.find((option) => option.value === value);

  return (
    <>
      {name ? <input type="hidden" name={name} value={value} /> : null}
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={(event) => setAnchorEl(event.currentTarget)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          padding: "8px 10px",
          fontSize: 13,
          border: isActive || focused ? `1px solid ${activeBorderColor}` : `0.5px solid ${defaultBorderColor}`,
          borderRadius: 6,
          background: isActive ? "#F4F8FC" : "#fff",
          color: isActive ? activeBorderColor : "#2C2C2A",
          fontWeight: isActive ? 600 : 400,
          fontFamily: "inherit",
          cursor: "pointer",
          minWidth,
          outline: "none",
          transition: "border-color .15s"
        }}
      >
        <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {selectedOption?.label ?? ariaLabel}
        </span>
        <svg width="10" height="6" viewBox="0 0 10 6" aria-hidden="true" focusable="false">
          <path d="M0 0l5 6 5-6z" fill={isActive ? activeBorderColor : "#888"} />
        </svg>
      </button>
      <Menu anchorEl={anchorEl} open={open} onClose={() => setAnchorEl(null)}>
        {options.map((option) => (
          <MenuItem
            key={option.value}
            selected={option.value === value}
            onClick={() => {
              onChange(option.value);
              setAnchorEl(null);
            }}
          >
            {option.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
