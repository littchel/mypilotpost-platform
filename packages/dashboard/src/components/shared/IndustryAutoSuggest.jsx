import React, { useState, useEffect, useRef } from "react";
import { INDUSTRY_LIST } from "../../lib/industries.js";

export default function IndustryAutoSuggest({
  value,
  onChange,
  className = "",
  style = {},
  placeholder = "Search or select industry...",
  required = false,
  disabled = false
}) {
  const [query, setQuery] = useState(value || "");
  const [open, setOpen] = useState(false);
  const [filtered, setFiltered] = useState([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapRef = useRef(null);
  const listRef = useRef(null);

  // Sync state if prop changes
  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  useEffect(() => {
    const q = query.toLowerCase().trim();
    if (!open) {
      setFiltered([]);
      return;
    }
    // Filter the industries
    const matches = INDUSTRY_LIST.filter(ind =>
      ind.toLowerCase().includes(q)
    );
    setFiltered(matches);
    setActiveIndex(prev => {
      if (prev >= matches.length) return -1;
      return prev;
    });
  }, [query, open]);

  // Click outside to close
  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectItem = (item) => {
    setQuery(item);
    onChange(item);
    setOpen(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (e) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setOpen(true);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex(prev => (prev + 1 < filtered.length ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex(prev => (prev - 1 >= 0 ? prev - 1 : filtered.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < filtered.length) {
        selectItem(filtered[activeIndex]);
      } else if (query.trim()) {
        selectItem(query);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const activeEl = listRef.current.childNodes[activeIndex];
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [activeIndex]);

  return (
    <div ref={wrapRef} style={{ position: "relative", width: "100%" }}>
      <input
        type="text"
        className={className}
        style={style}
        placeholder={placeholder}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        required={required}
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <div
          ref={listRef}
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            maxHeight: "220px",
            overflowY: "auto",
            background: "var(--surface-primary, #fff)",
            border: "1px solid var(--border-subtle, #cbd5e1)",
            borderRadius: "var(--radius-md, 8px)",
            boxShadow: "0 10px 25px rgba(15, 23, 42, 0.08)",
            zIndex: 9999,
            marginTop: "4px"
          }}
        >
          {filtered.map((item, idx) => {
            const isActive = idx === activeIndex;
            return (
              <div
                key={item}
                onMouseDown={() => selectItem(item)}
                onMouseEnter={() => setActiveIndex(idx)}
                style={{
                  padding: "8px 12px",
                  fontSize: "13px",
                  cursor: "pointer",
                  color: isActive ? "#fff" : "var(--text-main, #0f172a)",
                  background: isActive
                    ? "var(--pilot-blue, #2563eb)"
                    : "transparent",
                  transition: "background 0.15s, color 0.15s"
                }}
              >
                {item}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
