"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeEventHandler, InputHTMLAttributes, KeyboardEventHandler } from "react";

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
 *
 * Extended with real-time Google-style suggestions.
 */
export interface FlatSearchInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "size"> {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  name?: string;
  fetchSuggestions?: (query: string) => Promise<Array<{ label: string, sublabel: string, value: string }>>;
  onSuggestionSelect?: (value: string) => void;
}

export function FlatSearchInput({
  value,
  onChange,
  placeholder = "Buscar...",
  ariaLabel,
  name,
  fetchSuggestions,
  onSuggestionSelect,
  ...rest
}: FlatSearchInputProps) {
  const [suggestions, setSuggestions] = useState<Array<{ label: string, sublabel: string, value: string }>>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange: ChangeEventHandler<HTMLInputElement> = (event) => {
    const nextValue = event.target.value;
    onChange(nextValue);

    if (!fetchSuggestions) return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!nextValue.trim()) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const list = await fetchSuggestions(nextValue);
        setSuggestions(list);
        setIsOpen(list.length > 0);
        setHighlightedIndex(-1);
      } catch (err) {
        console.error("Erro ao carregar sugestões:", err);
      }
    }, 300);
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSuggestionClick = (val: string) => {
    onChange(val);
    setIsOpen(false);
    if (onSuggestionSelect) {
      onSuggestionSelect(val);
    }
  };

  const handleKeyDown: KeyboardEventHandler<HTMLInputElement> = (event) => {
    if (!isOpen || suggestions.length === 0) {
      if (event.key === "Enter" && rest.onKeyDown) {
        rest.onKeyDown(event);
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightedIndex((prev) => (prev + 1 < suggestions.length ? prev + 1 : 0));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : suggestions.length - 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        const selected = suggestions[highlightedIndex];
        handleSuggestionClick(selected.value);
      } else {
        setIsOpen(false);
        if (rest.onKeyDown) {
          rest.onKeyDown(event);
        }
      }
    } else if (event.key === "Escape") {
      event.preventDefault();
      setIsOpen(false);
    }
  };

  const isActive = value.trim() !== "";
  const activeBorderColor = "#185FA5";
  const defaultBorderColor = "#D3D1C7";
  const effectiveLabel = ariaLabel ?? placeholder;

  return (
    <div
      ref={containerRef}
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
          color: isActive ? "#185FA5" : "#888780",
          pointerEvents: "none",
          zIndex: 2
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
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        aria-label={effectiveLabel}
        autoComplete="off"
        {...rest}
        style={{
          width: "100%",
          padding: "8px 10px 8px 32px",
          fontSize: 13,
          border: isActive ? `1px solid ${activeBorderColor}` : `0.5px solid ${defaultBorderColor}`,
          borderRadius: 6,
          background: isActive ? "#F4F8FC" : "#fff",
          color: isActive ? activeBorderColor : "#2C2C2A",
          fontWeight: isActive ? "600" : "inherit",
          fontFamily: "inherit",
          outline: "none",
          boxSizing: "border-box",
          transition: "border-color .15s, box-shadow .15s",
          ...rest.style
        }}
        onFocus={(event) => {
          event.currentTarget.style.borderColor = activeBorderColor;
          event.currentTarget.style.boxShadow = "0 0 0 3px rgba(24,95,165,.08)";
          if (suggestions.length > 0 && value.trim()) {
            setIsOpen(true);
          }
          rest.onFocus?.(event);
        }}
        onBlur={(event) => {
          event.currentTarget.style.borderColor = isActive ? activeBorderColor : defaultBorderColor;
          event.currentTarget.style.boxShadow = "none";
          rest.onBlur?.(event);
        }}
      />

      {/* Google Style Suggestions Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            marginTop: 4,
            background: "#fff",
            border: "1px solid #D3D1C7",
            borderRadius: 8,
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
            zIndex: 1000,
            overflow: "hidden",
            maxHeight: 250,
            overflowY: "auto"
          }}
        >
          {suggestions.map((suggestion, index) => {
            const isHighlighted = index === highlightedIndex;
            return (
              <div
                key={`${suggestion.value}-${index}`}
                onClick={() => handleSuggestionClick(suggestion.value)}
                onMouseEnter={() => setHighlightedIndex(index)}
                style={{
                  padding: "8px 12px",
                  cursor: "pointer",
                  background: isHighlighted ? "#F4F8FC" : "#fff",
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                  borderBottom: index < suggestions.length - 1 ? "0.5px solid #F0EFEA" : "none",
                  transition: "background 0.1s"
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 500, color: "#2C2C2A" }}>
                  {suggestion.label}
                </span>
                <span style={{ fontSize: 10, color: "#888780" }}>
                  {suggestion.sublabel}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
