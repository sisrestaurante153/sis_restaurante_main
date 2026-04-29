"use client";

import type { ChangeEventHandler, SelectHTMLAttributes } from "react";

/**
 * Flat native <select> aligned to the HTML reference contract
 * (update/tela-fichas-grade-v1.html linhas 46-47 .filter-sel).
 *
 * Intentionally avoids MUI TextField-select / MUI Select — both impose a
 * floating label + rounded OutlinedInput notch that breaks visual parity with
 * the approved HTML. Native <select> also gives us the custom dropdown arrow
 * via background-image exactly like the HTML.
 *
 * A11y: since there is no visible label, callers MUST provide `ariaLabel`.
 * The current selected option text is used as the accessible name fallback
 * (mirrors native browser behavior for labelled combobox).
 */
export interface FlatSelectOption {
  value: string;
  label: string;
}

export interface FlatSelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "onChange" | "value" | "size"> {
  value: string;
  onChange: (value: string) => void;
  options: FlatSelectOption[];
  ariaLabel: string;
  minWidth?: number;
  name?: string;
}

export function FlatSelect({
  value,
  onChange,
  options,
  ariaLabel,
  minWidth = 148,
  name,
  ...rest
}: FlatSelectProps) {
  const handleChange: ChangeEventHandler<HTMLSelectElement> = (event) => {
    onChange(event.target.value);
  };

  return (
    <select
      name={name}
      value={value}
      onChange={handleChange}
      aria-label={ariaLabel}
      {...rest}
      style={{
        padding: "8px 28px 8px 10px",
        fontSize: 13,
        border: "0.5px solid #D3D1C7",
        borderRadius: 6,
        background: "#fff",
        color: "#2C2C2A",
        fontFamily: "inherit",
        appearance: "none",
        WebkitAppearance: "none",
        MozAppearance: "none",
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23888'/%3E%3C/svg%3E\")",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 8px center",
        cursor: "pointer",
        minWidth,
        outline: "none",
        transition: "border-color .15s",
        ...rest.style
      }}
      onFocus={(event) => {
        event.currentTarget.style.borderColor = "#185FA5";
        rest.onFocus?.(event);
      }}
      onBlur={(event) => {
        event.currentTarget.style.borderColor = "#D3D1C7";
        rest.onBlur?.(event);
      }}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
