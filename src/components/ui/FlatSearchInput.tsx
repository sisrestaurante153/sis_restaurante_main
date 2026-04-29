"use client";

import type { ChangeEventHandler, InputHTMLAttributes } from "react";

/**
 * Flat search input aligned to the HTML reference contract
 * (update/tela-fichas-grade-v1.html linhas 42-45 .search-wrap).
 *
 * Renders a native <input type="text"> wrapped by a positioned SVG magnifier.
 * Intentionally avoids MUI TextField (floating label + OutlinedInput notch)
 * because those add visual noise (border thickness, radius, label animation)
 * that make the app diverge from the pixel-perfect HTML.
 *
 * Accessibility: inputs without a visible label use the placeholder text via
 * aria-label to keep testability (getByRole("searchbox", { name })).
 */
export interface FlatSearchInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "size"> {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  name?: string;
}

export function FlatSearchInput({
  value,
  onChange,
  placeholder = "Buscar...",
  ariaLabel,
  name,
  ...rest
}: FlatSearchInputProps) {
  const handleChange: ChangeEventHandler<HTMLInputElement> = (event) => {
    onChange(event.target.value);
  };

  const effectiveLabel = ariaLabel ?? placeholder;

  return (
    <div
      className="flat-search-wrap"
      style={{
        flex: 1,
        position: "relative",
        minWidth: 0
      }}
    >
      <svg
        aria-hidden="true"
        focusable="false"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        style={{
          position: "absolute",
          left: 10,
          top: "50%",
          transform: "translateY(-50%)",
          width: 14,
          height: 14,
          color: "#888780",
          pointerEvents: "none"
        }}
      >
        <circle cx="6.5" cy="6.5" r="4.5" />
        <line x1="10" y1="10" x2="13.5" y2="13.5" />
      </svg>
      <input
        type="text"
        name={name}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        aria-label={effectiveLabel}
        {...rest}
        style={{
          width: "100%",
          padding: "8px 10px 8px 32px",
          fontSize: 13,
          border: "0.5px solid #D3D1C7",
          borderRadius: 6,
          background: "#fff",
          color: "#2C2C2A",
          fontFamily: "inherit",
          outline: "none",
          boxSizing: "border-box",
          transition: "border-color .15s, box-shadow .15s",
          ...rest.style
        }}
        onFocus={(event) => {
          event.currentTarget.style.borderColor = "#185FA5";
          event.currentTarget.style.boxShadow = "0 0 0 3px rgba(24,95,165,.08)";
          rest.onFocus?.(event);
        }}
        onBlur={(event) => {
          event.currentTarget.style.borderColor = "#D3D1C7";
          event.currentTarget.style.boxShadow = "none";
          rest.onBlur?.(event);
        }}
      />
    </div>
  );
}
