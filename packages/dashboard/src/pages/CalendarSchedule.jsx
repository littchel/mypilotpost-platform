import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  ChevronLeft, ChevronRight, RefreshCw, Plus,
  Calendar, List, Clock, Zap, TrendingUp,
  X, ArrowRight, BarChart2,
  Send, FileText, Layers, LayoutGrid
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { apiRequest } from "../lib/api/client";

// ─── Holidays & Marketing Events ─────────────────────────────────────────────

const HOLIDAYS = [
  // US National
  { md: "01-01", name: "New Year's Day",           type: "national",   color: "#6366f1", score: 82, reach: "Very High", competition: "High",   formats: ["photo","video","story"], platforms: ["instagram","facebook","twitter"] },
  { md: "01-15", name: "MLK Day",                  type: "national",   color: "#0ea5e9", score: 60, reach: "Medium",    competition: "Medium", formats: ["quote","photo"],         platforms: ["instagram","linkedin","twitter"] },
  { md: "02-02", name: "Groundhog Day",             type: "fun",        color: "#f59e0b", score: 45, reach: "Low",       competition: "Low",    formats: ["meme","story"],           platforms: ["instagram","twitter"] },
  { md: "02-14", name: "Valentine's Day",           type: "marketing",  color: "#ec4899", score: 95, reach: "Very High", competition: "Very High", formats: ["photo","video","reel"], platforms: ["instagram","facebook","tiktok"] },
  { md: "03-08", name: "International Women's Day", type: "global",     color: "#8b5cf6", score: 88, reach: "Very High", competition: "High",   formats: ["photo","story","video"], platforms: ["instagram","linkedin","twitter"] },
  { md: "03-17", name: "St. Patrick's Day",         type: "marketing",  color: "#22c55e", score: 72, reach: "High",      competition: "High",   formats: ["photo","story","reel"],  platforms: ["instagram","facebook","tiktok"] },
  { md: "03-20", name: "First Day of Spring",       type: "seasonal",   color: "#84cc16", score: 68, reach: "High",      competition: "Medium", formats: ["photo","video","blog"],   platforms: ["instagram","facebook","pinterest"] },
  { md: "04-01", name: "April Fools' Day",          type: "fun",        color: "#f59e0b", score: 65, reach: "High",      competition: "Medium", formats: ["video","meme","story"],   platforms: ["twitter","tiktok","instagram"] },
  { md: "04-22", name: "Earth Day",                 type: "global",     color: "#16a34a", score: 80, reach: "High",      competition: "Medium", formats: ["photo","blog","story"],   platforms: ["instagram","linkedin","facebook"] },
  { md: "05-04", name: "Star Wars Day",             type: "fun",        color: "#1e293b", score: 55, reach: "Medium",    competition: "Medium", formats: ["meme","video","photo"],   platforms: ["twitter","instagram","tiktok"] },
  { md: "05-05", name: "Cinco de Mayo",             type: "marketing",  color: "#ef4444", score: 75, reach: "High",      competition: "High",   formats: ["photo","video","story"],  platforms: ["instagram","facebook","tiktok"] },
  { md: "05-12", name: "Mother's Day",              type: "national",   color: "#f472b6", score: 93, reach: "Very High", competition: "Very High", formats: ["photo","video","reel"], platforms: ["instagram","facebook","tiktok"] },
  { md: "05-27", name: "Memorial Day",              type: "national",   color: "#ef4444", score: 70, reach: "High",      competition: "High",   formats: ["photo","story"],          platforms: ["facebook","instagram","twitter"] },
  { md: "06-01", name: "Pride Month Begins",        type: "global",     color: "#a855f7", score: 85, reach: "Very High", competition: "High",   formats: ["photo","video","story"],  platforms: ["instagram","twitter","linkedin"] },
  { md: "06-19", name: "Juneteenth",                type: "national",   color: "#dc2626", score: 72, reach: "High",      competition: "Medium", formats: ["photo","blog","story"],   platforms: ["instagram","facebook","twitter"] },
  { md: "06-21", name: "Father's Day",              type: "national",   color: "#3b82f6", score: 88, reach: "Very High", competition: "High",   formats: ["photo","video","reel"],   platforms: ["instagram","facebook","tiktok"] },
  { md: "07-04", name: "Independence Day",          type: "national",   color: "#ef4444", score: 85, reach: "Very High", competition: "High",   formats: ["photo","story","video"],  platforms: ["instagram","facebook","twitter"] },
  { md: "08-26", name: "Women's Equality Day",      type: "global",     color: "#8b5cf6", score: 68, reach: "High",      competition: "Medium", formats: ["quote","photo","blog"],   platforms: ["linkedin","instagram","twitter"] },
  { md: "09-02", name: "Labor Day",                 type: "national",   color: "#0ea5e9", score: 72, reach: "High",      competition: "Medium", formats: ["photo","story"],          platforms: ["facebook","instagram","twitter"] },
  { md: "09-22", name: "First Day of Fall",         type: "seasonal",   color: "#f97316", score: 70, reach: "High",      competition: "Medium", formats: ["photo","blog","reel"],    platforms: ["instagram","pinterest","tiktok"] },
  { md: "10-10", name: "World Mental Health Day",   type: "global",     color: "#06b6d4", score: 75, reach: "High",      competition: "Medium", formats: ["quote","blog","story"],   platforms: ["instagram","linkedin","facebook"] },
  { md: "10-31", name: "Halloween",                 type: "marketing",  color: "#f97316", score: 90, reach: "Very High", competition: "Very High", formats: ["photo","video","reel"], platforms: ["instagram","tiktok","facebook"] },
  { md: "11-11", name: "Veterans Day",              type: "national",   color: "#1e293b", score: 65, reach: "High",      competition: "Medium", formats: ["photo","story"],          platforms: ["facebook","instagram","twitter"] },
  { md: "11-28", name: "Thanksgiving",              type: "national",   color: "#b45309", score: 88, reach: "Very High", competition: "High",   formats: ["photo","video","story"],  platforms: ["instagram","facebook","tiktok"] },
  { md: "11-29", name: "Black Friday",              type: "ecommerce",  color: "#1e293b", score: 98, reach: "Very High", competition: "Very High", formats: ["photo","video","reel"], platforms: ["instagram","facebook","tiktok"] },
  { md: "12-02", name: "Cyber Monday",              type: "ecommerce",  color: "#7c3aed", score: 96, reach: "Very High", competition: "Very High", formats: ["photo","video","story"], platforms: ["instagram","facebook","twitter"] },
  { md: "12-21", name: "First Day of Winter",       type: "seasonal",   color: "#0ea5e9", score: 65, reach: "High",      competition: "Medium", formats: ["photo","blog","story"],   platforms: ["instagram","facebook","pinterest"] },
  { md: "12-24", name: "Christmas Eve",             type: "national",   color: "#dc2626", score: 88, reach: "Very High", competition: "High",   formats: ["photo","story","video"],  platforms: ["instagram","facebook","tiktok"] },
  { md: "12-25", name: "Christmas Day",             type: "national",   color: "#dc2626", score: 92, reach: "Very High", competition: "Very High", formats: ["photo","video","story"], platforms: ["instagram","facebook","tiktok"] },
  { md: "12-31", name: "New Year's Eve",            type: "marketing",  color: "#6366f1", score: 85, reach: "Very High", competition: "High",   formats: ["video","story","reel"],   platforms: ["instagram","tiktok","facebook"] },
  // Global / Marketing
  { md: "01-27", name: "International Holocaust Remembrance Day", type: "global", color: "#64748b", score: 40, reach: "Medium", competition: "Low", formats: ["quote","blog"], platforms: ["linkedin","twitter"] },
  { md: "02-04", name: "World Cancer Day",          type: "global",     color: "#f43f5e", score: 60, reach: "Medium",    competition: "Low",    formats: ["quote","blog","photo"],   platforms: ["instagram","linkedin","facebook"] },
  { md: "03-22", name: "World Water Day",           type: "global",     color: "#0ea5e9", score: 62, reach: "Medium",    competition: "Low",    formats: ["photo","blog","story"],   platforms: ["instagram","linkedin","twitter"] },
  { md: "04-07", name: "World Health Day",          type: "global",     color: "#22c55e", score: 65, reach: "High",      competition: "Low",    formats: ["photo","blog","story"],   platforms: ["instagram","linkedin","facebook"] },
  { md: "05-25", name: "Africa Day",                type: "global",     color: "#f59e0b", score: 55, reach: "Medium",    competition: "Low",    formats: ["photo","blog"],           platforms: ["instagram","twitter","facebook"] },
  { md: "11-13", name: "World Kindness Day",        type: "global",     color: "#f472b6", score: 65, reach: "High",      competition: "Low",    formats: ["quote","photo","story"],  platforms: ["instagram","facebook","twitter"] },
  { md: "12-10", name: "Human Rights Day",          type: "global",     color: "#8b5cf6", score: 58, reach: "Medium",    competition: "Low",    formats: ["quote","blog","photo"],   platforms: ["linkedin","twitter","instagram"] },
];

function getHolidaysForRange(from, to) {
  const start = new Date(from);
  const end = new Date(to);
  const result = [];

  for (let y = start.getFullYear(); y <= end.getFullYear(); y++) {
    for (const h of HOLIDAYS) {
      const [mm, dd] = h.md.split("-");
      const d = new Date(y, parseInt(mm) - 1, parseInt(dd));
      if (d >= start && d <= end) {
        result.push({ ...h, date: d.toISOString().slice(0, 10), year: y });
      }
    }
  }
  return result;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const KIND_COLORS = {
  scheduled: "#8b5cf6",
  published: "#22c55e",
  approval:  "#f59e0b",
  approved:  "#3b82f6",
  content:   "#94a3b8",
};

const KIND_LABELS = {
  scheduled: "Scheduled",
  published: "Published",
  approval:  "In Review",
  approved:  "Approved",
  content:   "Content",
};

const PLATFORM_ICONS = {
  facebook: "📘", instagram: "📸", linkedin: "💼",
  twitter: "🐦", x: "✖", youtube: "▶", tiktok: "🎵",
};

const TYPE_ICONS = {
  social: "📲", blog: "📝", article: "📄", campaign: "🎯",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isoDate(d) {
  return new Date(d).toISOString().slice(0, 10);
}

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

function formatDateLabel(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function addDays(d, n) {
  const r = new Date(d); r.setDate(r.getDate() + n); return r;
}

function startOfWeek(d) {
  const r = new Date(d);
  const day = r.getDay();
  r.setDate(r.getDate() - (day === 0 ? 6 : day - 1));
  r.setHours(0, 0, 0, 0);
  return r;
}

function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function getRangeForView(view, pivot) {
  if (view === "month") {
    const first = startOfMonth(pivot);
    const last = new Date(pivot.getFullYear(), pivot.getMonth() + 1, 0);
    const from = addDays(first, -7);
    const to = addDays(last, 7);
    return { from, to };
  }
  if (view === "week") {
    const from = startOfWeek(pivot);
    const to = addDays(from, 6);
    return { from, to };
  }
  if (view === "day") {
    return { from: pivot, to: pivot };
  }
  // agenda: 60 days forward
  return { from: addDays(pivot, -3), to: addDays(pivot, 60) };
}

// ─── Content Opportunity Panel ───────────────────────────────────────────────

function OpportunityPanel({ holiday, onClose, onCreatePost, onCreateArticle, onBuildCampaign }) {
  const daysUntil = Math.ceil((new Date(holiday.date) - new Date()) / 86400000);
  const urgency = daysUntil <= 3 ? "red" : daysUntil <= 7 ? "orange" : daysUntil <= 14 ? "amber" : "green";
  const urgencyLabel = daysUntil <= 0 ? "Today!" : daysUntil === 1 ? "Tomorrow" : `${daysUntil} days away`;

  return (
    <div style={{
      position: "fixed", right: 0, top: 0, bottom: 0, width: "360px",
      background: "var(--surface-primary)", borderLeft: "1px solid var(--border-subtle)",
      boxShadow: "-8px 0 32px rgba(0,0,0,0.08)", zIndex: 200, overflowY: "auto",
      display: "flex", flexDirection: "column"
    }}>
      {/* Header */}
      <div style={{ padding: "24px 24px 0", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
            <span style={{ width: "12px", height: "12px", borderRadius: "50%", background: holiday.color, display: "inline-block", flexShrink: 0 }} />
            <span style={{ fontSize: "0.65rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)" }}>
              {holiday.type}
            </span>
          </div>
          <h3 style={{ fontWeight: 900, fontSize: "1.1rem", margin: 0, color: "var(--text-main)" }}>{holiday.name}</h3>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "4px" }}>
            {new Date(holiday.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </div>
        </div>
        <button onClick={onClose} style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--text-muted)", padding: "4px" }}>
          <X size={18} />
        </button>
      </div>

      <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "20px", flex: 1 }}>

        {/* Urgency */}
        <div style={{
          background: urgency === "red" ? "#fef2f2" : urgency === "orange" ? "#fff7ed" : urgency === "amber" ? "#fffbeb" : "#f0fdf4",
          borderRadius: "12px", padding: "12px 16px",
          border: `1px solid ${urgency === "red" ? "#fecaca" : urgency === "orange" ? "#fed7aa" : urgency === "amber" ? "#fde68a" : "#bbf7d0"}`,
          display: "flex", alignItems: "center", gap: "10px"
        }}>
          <Clock size={16} style={{ color: urgency === "red" ? "#ef4444" : urgency === "orange" ? "#f97316" : urgency === "amber" ? "#f59e0b" : "#22c55e", flexShrink: 0 }} />
          <span style={{ fontWeight: 800, fontSize: "0.85rem", color: urgency === "red" ? "#b91c1c" : urgency === "orange" ? "#c2410c" : urgency === "amber" ? "#92400e" : "#15803d" }}>
            {urgencyLabel}
          </span>
        </div>

        {/* Opportunity Score */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontWeight: 800, fontSize: "0.8rem", color: "var(--text-main)" }}>Opportunity Score</span>
            <span style={{ fontWeight: 900, fontSize: "1.1rem", color: holiday.score >= 80 ? "#22c55e" : holiday.score >= 60 ? "#f59e0b" : "#94a3b8" }}>
              {holiday.score}/100
            </span>
          </div>
          <div style={{ height: "8px", background: "var(--surface-secondary)", borderRadius: "4px", overflow: "hidden" }}>
            <div style={{ width: `${holiday.score}%`, height: "100%", background: holiday.score >= 80 ? "#22c55e" : holiday.score >= 60 ? "#f59e0b" : "#94a3b8", borderRadius: "4px", transition: "width 0.6s ease" }} />
          </div>
        </div>

        {/* Metrics Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          {[
            { label: "Expected Reach", value: holiday.reach, icon: <TrendingUp size={14} /> },
            { label: "Competition", value: holiday.competition, icon: <BarChart2 size={14} /> },
          ].map(m => (
            <div key={m.label} style={{ background: "var(--surface-secondary)", borderRadius: "10px", padding: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text-muted)", marginBottom: "6px" }}>
                {m.icon}
                <span style={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>{m.label}</span>
              </div>
              <div style={{ fontWeight: 900, fontSize: "0.9rem", color: "var(--text-main)" }}>{m.value}</div>
            </div>
          ))}
        </div>

        {/* Suggested Formats */}
        <div>
          <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "10px" }}>Best Formats</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {holiday.formats.map(f => (
              <span key={f} style={{ background: holiday.color + "18", color: holiday.color, border: `1px solid ${holiday.color}35`, borderRadius: "6px", padding: "3px 10px", fontSize: "0.75rem", fontWeight: 700, textTransform: "capitalize" }}>
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* Best Platforms */}
        <div>
          <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "10px" }}>Best Platforms</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {holiday.platforms.map(p => (
              <span key={p} style={{ background: "var(--surface-secondary)", borderRadius: "6px", padding: "4px 10px", fontSize: "0.75rem", fontWeight: 700, color: "var(--text-main)", textTransform: "capitalize" }}>
                {PLATFORM_ICONS[p] || "📌"} {p}
              </span>
            ))}
          </div>
        </div>

        {/* CTAs */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "4px" }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "2px" }}>Create Content</div>
          {[
            { label: "Generate Social Post", icon: <Send size={14} />, color: "#6366f1", action: onCreatePost },
            { label: "Write Article / Blog", icon: <FileText size={14} />, color: "#0ea5e9", action: onCreateArticle },
            { label: "Build Campaign",        icon: <Layers size={14} />, color: "#22c55e", action: onBuildCampaign },
          ].map(btn => (
            <button key={btn.label} onClick={btn.action} style={{
              display: "flex", alignItems: "center", gap: "10px", padding: "12px 16px",
              borderRadius: "10px", border: `1px solid ${btn.color}40`,
              background: btn.color + "10", color: btn.color,
              fontWeight: 800, fontSize: "0.85rem", cursor: "pointer", textAlign: "left",
              transition: "all 0.15s ease"
            }}
              onMouseEnter={e => { e.currentTarget.style.background = btn.color + "20"; e.currentTarget.style.transform = "translateX(2px)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = btn.color + "10"; e.currentTarget.style.transform = "none"; }}
            >
              {btn.icon}
              {btn.label}
              <ArrowRight size={12} style={{ marginLeft: "auto" }} />
            </button>
          ))}
        </div>

        {/* Advance Planning Tips */}
        {daysUntil > 0 && (
          <div style={{ background: "var(--surface-secondary)", borderRadius: "12px", padding: "14px 16px" }}>
            <div style={{ fontWeight: 800, fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "10px" }}>Content Timeline</div>
            {[30, 14, 7, 3, 1].filter(d => d <= daysUntil + 1).map(d => (
              <div key={d} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", opacity: daysUntil <= d ? 1 : 0.4 }}>
                <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: daysUntil <= d ? "#22c55e" : "var(--text-muted)", flexShrink: 0 }} />
                <span style={{ fontSize: "0.75rem", color: "var(--text-main)", fontWeight: 600 }}>
                  {d === 30 ? "30 days out — Brand awareness + teaser" :
                   d === 14 ? "2 weeks out — Campaign + media" :
                   d === 7  ? "1 week out — Engagement + contest" :
                   d === 3  ? "3 days out — Final push + stories" :
                              "Day before — Countdown content"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Calendar Item Chip ───────────────────────────────────────────────────────

function ItemChip({ item, compact = false, onClick }) {
  const color = KIND_COLORS[item.kind] || "#94a3b8";
  return (
    <div
      onClick={() => onClick?.(item)}
      title={item.title}
      style={{
        background: color + "18",
        borderLeft: `3px solid ${color}`,
        borderRadius: compact ? "4px" : "6px",
        padding: compact ? "2px 6px" : "4px 8px",
        marginBottom: "3px",
        cursor: "pointer",
        fontSize: compact ? "0.65rem" : "0.72rem",
        fontWeight: 700,
        color: "var(--text-main)",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        transition: "opacity 0.15s",
        maxWidth: "100%",
      }}
      onMouseEnter={e => e.currentTarget.style.opacity = "0.75"}
      onMouseLeave={e => e.currentTarget.style.opacity = "1"}
    >
      {TYPE_ICONS[item.content_type] || "📌"} {item.title}
    </div>
  );
}

function HolidayChip({ holiday, compact = false, onClick }) {
  return (
    <div
      onClick={() => onClick?.(holiday)}
      title={holiday.name}
      style={{
        background: holiday.color + "18",
        border: `1px solid ${holiday.color}40`,
        borderRadius: compact ? "4px" : "6px",
        padding: compact ? "2px 6px" : "3px 8px",
        marginBottom: "3px",
        cursor: "pointer",
        fontSize: compact ? "0.6rem" : "0.68rem",
        fontWeight: 800,
        color: holiday.color,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        maxWidth: "100%",
      }}
    >
      🎉 {holiday.name}
    </div>
  );
}

// ─── Month View ───────────────────────────────────────────────────────────────

function MonthView({ pivot, items, holidays, activeFilters, onItemClick, onHolidayClick }) {
  const year = pivot.getFullYear();
  const month = pivot.getMonth();

  const days = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const start = addDays(firstDay, -startOffset);
    const endOffset = (7 - lastDay.getDay()) % 7;
    const end = addDays(lastDay, endOffset === 7 ? 0 : endOffset);
    const result = [];
    let cur = new Date(start);
    while (cur <= end) { result.push(new Date(cur)); cur = addDays(cur, 1); }
    return result;
  }, [year, month]);

  const today = new Date(); today.setHours(0, 0, 0, 0);

  const itemsByDate = useMemo(() => {
    const map = {};
    for (const item of items) {
      if (activeFilters.length > 0 && !activeFilters.includes(item.kind) && !activeFilters.includes(item.content_type)) continue;
      const key = isoDate(item.date);
      if (!map[key]) map[key] = [];
      map[key].push(item);
    }
    return map;
  }, [items, activeFilters]);

  const holidaysByDate = useMemo(() => {
    const map = {};
    for (const h of holidays) {
      if (!map[h.date]) map[h.date] = [];
      map[h.date].push(h);
    }
    return map;
  }, [holidays]);

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "1px", background: "var(--border-subtle)" }}>
        {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => (
          <div key={d} style={{ background: "var(--surface-secondary)", padding: "10px", textAlign: "center", fontSize: "0.65rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            {d}
          </div>
        ))}
        {days.map((date, idx) => {
          const key = isoDate(date);
          const dayItems = itemsByDate[key] || [];
          const dayHolidays = holidaysByDate[key] || [];
          const isCurrentMonth = date.getMonth() === month;
          const isToday = date.getTime() === today.getTime();
          return (
            <div key={idx} style={{
              background: isToday ? "#eff6ff" : "var(--surface-primary)",
              minHeight: "120px", padding: "8px",
              opacity: isCurrentMonth ? 1 : 0.35,
              border: isToday ? "1px solid #bfdbfe" : "none",
              display: "flex", flexDirection: "column"
            }}>
              <div style={{ fontSize: "0.8rem", fontWeight: isToday ? 900 : 700, color: isToday ? "#2563eb" : "var(--text-main)", textAlign: "right", marginBottom: "6px" }}>
                {date.getDate()}
              </div>
              <div style={{ flex: 1, overflowY: "auto" }}>
                {dayHolidays.map(h => (
                  <HolidayChip key={h.date + h.name} holiday={h} compact onClick={onHolidayClick} />
                ))}
                {dayItems.slice(0, 3).map(item => (
                  <ItemChip key={item.id} item={item} compact onClick={onItemClick} />
                ))}
                {dayItems.length > 3 && (
                  <div style={{ fontSize: "0.6rem", fontWeight: 700, color: "var(--text-muted)", textAlign: "center", paddingTop: "2px" }}>
                    +{dayItems.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Week View ────────────────────────────────────────────────────────────────

function WeekView({ pivot, items, holidays, activeFilters, onItemClick, onHolidayClick, onSlotClick }) {
  const weekStart = useMemo(() => startOfWeek(pivot), [pivot]);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const today = new Date(); today.setHours(0, 0, 0, 0);

  const itemsByDate = useMemo(() => {
    const map = {};
    for (const item of items) {
      if (activeFilters.length > 0 && !activeFilters.includes(item.kind) && !activeFilters.includes(item.content_type)) continue;
      const key = isoDate(item.date);
      if (!map[key]) map[key] = [];
      map[key].push(item);
    }
    return map;
  }, [items, activeFilters]);

  const holidaysByDate = useMemo(() => {
    const map = {};
    for (const h of holidays) {
      if (!map[h.date]) map[h.date] = [];
      map[h.date].push(h);
    }
    return map;
  }, [holidays]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "1px", background: "var(--border-subtle)", minHeight: "500px" }}>
      {days.map((date, idx) => {
        const key = isoDate(date);
        const dayItems = itemsByDate[key] || [];
        const dayHolidays = holidaysByDate[key] || [];
        const isToday = date.getTime() === today.getTime();
        return (
          <div key={idx}
            onClick={(e) => { if (e.target === e.currentTarget) onSlotClick?.(date); }}
            style={{ background: isToday ? "#eff6ff" : "var(--surface-primary)", padding: "12px", display: "flex", flexDirection: "column", gap: "4px", border: isToday ? "1px solid #bfdbfe" : "none" }}>
            <div style={{ marginBottom: "8px" }}>
              <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                {date.toLocaleDateString("en-US", { weekday: "short" })}
              </div>
              <div style={{ fontSize: "1.1rem", fontWeight: 900, color: isToday ? "#2563eb" : "var(--text-main)" }}>
                {date.getDate()}
              </div>
            </div>
            {dayHolidays.map(h => (
              <HolidayChip key={h.date + h.name} holiday={h} onClick={onHolidayClick} />
            ))}
            {dayItems.map(item => (
              <ItemChip key={item.id} item={item} onClick={onItemClick} />
            ))}
            {dayItems.length === 0 && dayHolidays.length === 0 && (
              <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", textAlign: "center", marginTop: "20px", opacity: 0.5 }}>
                Empty
              </div>
            )}
            <button onClick={() => onSlotClick?.(date)} style={{
              marginTop: "auto", border: "1px dashed var(--border-subtle)", background: "transparent",
              borderRadius: "6px", padding: "6px", color: "var(--text-muted)", cursor: "pointer",
              fontSize: "0.7rem", fontWeight: 700, transition: "all 0.15s"
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#6366f1"; e.currentTarget.style.color = "#6366f1"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border-subtle)"; e.currentTarget.style.color = "var(--text-muted)"; }}
            >+ Add</button>
          </div>
        );
      })}
    </div>
  );
}

// ─── Day View ────────────────────────────────────────────────────────────────

function DayView({ pivot, items, holidays, activeFilters, onItemClick, onHolidayClick }) {
  const key = isoDate(pivot);

  const dayItems = useMemo(() => items.filter(item => {
    if (activeFilters.length > 0 && !activeFilters.includes(item.kind) && !activeFilters.includes(item.content_type)) return false;
    return isoDate(item.date) === key;
  }).sort((a, b) => new Date(a.date) - new Date(b.date)), [items, activeFilters, key]);

  const dayHolidays = holidays.filter(h => h.date === key);

  return (
    <div style={{ maxWidth: "700px", margin: "0 auto" }}>
      <div style={{ marginBottom: "20px", padding: "16px 20px", background: "var(--surface-secondary)", borderRadius: "12px" }}>
        <div style={{ fontWeight: 900, fontSize: "1.2rem", color: "var(--text-main)" }}>
          {pivot.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
        </div>
        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "4px" }}>
          {dayItems.length} item{dayItems.length !== 1 ? "s" : ""} · {dayHolidays.length} event{dayHolidays.length !== 1 ? "s" : ""}
        </div>
      </div>

      {dayHolidays.map(h => (
        <div key={h.name} onClick={() => onHolidayClick?.(h)} style={{
          background: h.color + "12", border: `1px solid ${h.color}40`,
          borderRadius: "12px", padding: "16px 20px", marginBottom: "12px", cursor: "pointer",
          display: "flex", alignItems: "center", gap: "14px"
        }}>
          <span style={{ fontSize: "1.4rem" }}>🎉</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 900, color: h.color }}>{h.name}</div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Opportunity Score: {h.score}/100 · {h.reach} reach</div>
          </div>
          <ArrowRight size={16} style={{ color: h.color }} />
        </div>
      ))}

      {dayItems.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-muted)" }}>
          <Calendar size={40} style={{ opacity: 0.3, marginBottom: "12px" }} />
          <div style={{ fontWeight: 700 }}>Nothing scheduled for this day</div>
        </div>
      )}

      {dayItems.map(item => (
        <div key={item.id} onClick={() => onItemClick?.(item)} style={{
          background: "var(--surface-primary)", borderRadius: "12px", padding: "16px 20px",
          border: "1px solid var(--border-subtle)", marginBottom: "12px",
          borderLeft: `4px solid ${KIND_COLORS[item.kind] || "#94a3b8"}`,
          cursor: "pointer", transition: "all 0.15s",
          display: "flex", alignItems: "center", gap: "16px"
        }}
          onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.06)"}
          onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}
        >
          <div style={{ fontSize: "1.2rem" }}>{TYPE_ICONS[item.content_type] || "📌"}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, color: "var(--text-main)", marginBottom: "4px" }}>{item.title}</div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <span style={{ fontSize: "0.65rem", fontWeight: 800, textTransform: "uppercase", background: (KIND_COLORS[item.kind] || "#94a3b8") + "18", color: KIND_COLORS[item.kind] || "#94a3b8", padding: "2px 8px", borderRadius: "4px" }}>
                {KIND_LABELS[item.kind] || item.kind}
              </span>
              {item.platform && (
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  {PLATFORM_ICONS[item.platform] || "📌"} {item.platform}
                </span>
              )}
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{formatTime(item.date)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Agenda View ─────────────────────────────────────────────────────────────

function AgendaView({ items, holidays, activeFilters, onItemClick, onHolidayClick }) {
  const grouped = useMemo(() => {
    const map = {};

    // Merge items + holidays into date groups
    for (const item of items) {
      if (activeFilters.length > 0 && !activeFilters.includes(item.kind) && !activeFilters.includes(item.content_type)) continue;
      const key = isoDate(item.date);
      if (!map[key]) map[key] = { items: [], holidays: [] };
      map[key].items.push(item);
    }
    for (const h of holidays) {
      if (!map[h.date]) map[h.date] = { items: [], holidays: [] };
      map[h.date].holidays.push(h);
    }

    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [items, holidays, activeFilters]);

  if (grouped.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "80px 0", color: "var(--text-muted)" }}>
        <List size={40} style={{ opacity: 0.3, marginBottom: "12px" }} />
        <div style={{ fontWeight: 700 }}>No content in this date range</div>
      </div>
    );
  }

  const today = isoDate(new Date());
  return (
    <div style={{ maxWidth: "720px", margin: "0 auto" }}>
      {grouped.map(([date, group]) => {
        const isPast = date < today;
        const isToday = date === today;
        return (
          <div key={date} style={{ marginBottom: "24px", opacity: isPast ? 0.65 : 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px" }}>
              <div style={{
                fontWeight: 900, fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.06em",
                color: isToday ? "#2563eb" : "var(--text-muted)",
                background: isToday ? "#eff6ff" : "var(--surface-secondary)",
                padding: "4px 12px", borderRadius: "6px",
                border: isToday ? "1px solid #bfdbfe" : "none"
              }}>
                {isToday ? "Today — " : ""}{formatDateLabel(date + "T12:00:00")}
              </div>
              <div style={{ flex: 1, height: "1px", background: "var(--border-subtle)" }} />
            </div>
            {group.holidays.map(h => (
              <div key={h.name} onClick={() => onHolidayClick?.(h)} style={{
                background: h.color + "12", border: `1px solid ${h.color}30`,
                borderRadius: "10px", padding: "10px 16px", marginBottom: "8px", cursor: "pointer",
                display: "flex", alignItems: "center", gap: "12px"
              }}>
                <span>🎉</span>
                <span style={{ fontWeight: 800, color: h.color, fontSize: "0.85rem" }}>{h.name}</span>
                <span style={{ marginLeft: "auto", fontSize: "0.7rem", color: "var(--text-muted)" }}>Score {h.score}/100</span>
                <Zap size={12} style={{ color: h.color }} />
              </div>
            ))}
            {group.items.sort((a, b) => new Date(a.date) - new Date(b.date)).map(item => (
              <div key={item.id} onClick={() => onItemClick?.(item)} style={{
                background: "var(--surface-primary)", borderRadius: "10px", padding: "12px 16px",
                border: "1px solid var(--border-subtle)", marginBottom: "8px",
                borderLeft: `3px solid ${KIND_COLORS[item.kind] || "#94a3b8"}`,
                cursor: "pointer", display: "flex", alignItems: "center", gap: "12px",
                transition: "all 0.15s"
              }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.05)"}
                onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}
              >
                <span style={{ fontSize: "1rem" }}>{TYPE_ICONS[item.content_type] || "📌"}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--text-main)" }}>{item.title}</div>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "2px" }}>
                    {formatTime(item.date)}
                    {item.platform ? ` · ${PLATFORM_ICONS[item.platform] || ""} ${item.platform}` : ""}
                  </div>
                </div>
                <span style={{ fontSize: "0.65rem", fontWeight: 800, textTransform: "uppercase", background: (KIND_COLORS[item.kind] || "#94a3b8") + "18", color: KIND_COLORS[item.kind] || "#94a3b8", padding: "2px 8px", borderRadius: "4px", flexShrink: 0 }}>
                  {KIND_LABELS[item.kind] || item.kind}
                </span>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const VIEWS = [
  { id: "month",  label: "Month",  icon: <Calendar size={14} /> },
  { id: "week",   label: "Week",   icon: <LayoutGrid size={14} /> },
  { id: "day",    label: "Day",    icon: <Clock size={14} /> },
  { id: "agenda", label: "Agenda", icon: <List size={14} /> },
];

const FILTER_OPTIONS = [
  { id: "scheduled", label: "Scheduled", color: KIND_COLORS.scheduled },
  { id: "published",  label: "Published",  color: KIND_COLORS.published },
  { id: "approval",   label: "In Review",  color: KIND_COLORS.approval },
  { id: "blog",       label: "Blogs",      color: "#0ea5e9" },
  { id: "social",     label: "Social",     color: "#6366f1" },
];

const CalendarSchedule = ({ activeBrand, onScheduleNew }) => {
  const { token } = useAuth();
  const [view, setView] = useState("week");
  const [pivot, setPivot] = useState(() => { const d = new Date(); d.setHours(0,0,0,0); return d; });
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeFilters, setActiveFilters] = useState([]);
  const [selectedHoliday, setSelectedHoliday] = useState(null);

  const range = useMemo(() => getRangeForView(view, pivot), [view, pivot]);

  const holidays = useMemo(() => getHolidaysForRange(range.from, range.to), [range.from, range.to]);

  const fetchItems = useCallback(async () => {
    if (!token || !activeBrand?.id) return;
    setLoading(true);
    try {
      const from = range.from.toISOString();
      const to = range.to.toISOString();
      const data = await apiRequest(`/api/customer/calendar?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
      setItems(data.items || []);
    } catch (err) {
      console.error("Calendar fetch failed", err);
    } finally {
      setLoading(false);
    }
  }, [token, activeBrand?.id, range.from, range.to]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const navigate = (dir) => {
    setPivot(prev => {
      if (view === "month") return new Date(prev.getFullYear(), prev.getMonth() + dir, 1);
      if (view === "week")  return addDays(prev, dir * 7);
      return addDays(prev, dir);
    });
  };

  const goToday = () => { const d = new Date(); d.setHours(0,0,0,0); setPivot(d); };

  const pivotLabel = useMemo(() => {
    if (view === "month") return pivot.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    if (view === "week") {
      const ws = startOfWeek(pivot);
      const we = addDays(ws, 6);
      return `${ws.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${we.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
    }
    return pivot.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  }, [view, pivot]);

  const toggleFilter = (id) => {
    setActiveFilters(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  };

  const upcomingHolidays = useMemo(() => {
    const today = isoDate(new Date());
    return getHolidaysForRange(new Date(), addDays(new Date(), 30))
      .filter(h => h.date > today)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 3);
  }, []);

  const handleCreatePost = () => {
    setSelectedHoliday(null);
    onScheduleNew?.();
  };

  const handleCreateArticle = () => {
    setSelectedHoliday(null);
    window.dispatchEvent(new CustomEvent("switch-tab", { detail: "article" }));
  };

  const handleBuildCampaign = () => {
    setSelectedHoliday(null);
    window.dispatchEvent(new CustomEvent("switch-tab", { detail: "campaigns" }));
  };

  const statCounts = useMemo(() => ({
    scheduled: items.filter(i => i.kind === "scheduled").length,
    published:  items.filter(i => i.kind === "published").length,
    approval:   items.filter(i => i.kind === "approval").length,
  }), [items]);

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: "0" }}>

        {/* ── Page Header ── */}
        <div style={{ padding: "0 0 20px 0", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h2 style={{ fontWeight: 900, fontSize: "1.4rem", margin: 0, color: "var(--text-main)" }}>Content Command Center</h2>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "3px" }}>
              {statCounts.scheduled} scheduled · {statCounts.published} published · {statCounts.approval} in review
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button onClick={fetchItems} style={{ padding: "8px", border: "1px solid var(--border-subtle)", borderRadius: "8px", background: "var(--surface-secondary)", cursor: "pointer", color: "var(--text-muted)" }}>
              <RefreshCw size={15} style={{ display: "block" }} className={loading ? "spin" : ""} />
            </button>
            <button onClick={handleCreatePost} style={{
              display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px",
              borderRadius: "8px", background: "#6366f1", color: "#fff",
              fontWeight: 800, fontSize: "0.85rem", border: "none", cursor: "pointer",
              transition: "all 0.15s"
            }}
              onMouseEnter={e => e.currentTarget.style.background = "#5457e5"}
              onMouseLeave={e => e.currentTarget.style.background = "#6366f1"}
            >
              <Plus size={15} /> Schedule
            </button>
          </div>
        </div>

        {/* ── Controls Bar ── */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px", flexWrap: "wrap" }}>

          {/* Nav */}
          <div style={{ display: "flex", alignItems: "center", gap: "4px", background: "var(--surface-secondary)", border: "1px solid var(--border-subtle)", borderRadius: "8px", padding: "2px" }}>
            <button onClick={() => navigate(-1)} style={{ border: "none", background: "transparent", cursor: "pointer", padding: "6px 8px", borderRadius: "6px", color: "var(--text-muted)", display: "flex" }}>
              <ChevronLeft size={15} />
            </button>
            <button onClick={goToday} style={{ border: "none", background: "transparent", cursor: "pointer", padding: "4px 10px", borderRadius: "6px", fontSize: "0.72rem", fontWeight: 800, color: "var(--text-main)", whiteSpace: "nowrap", minWidth: "140px", textAlign: "center" }}>
              {pivotLabel}
            </button>
            <button onClick={() => navigate(1)} style={{ border: "none", background: "transparent", cursor: "pointer", padding: "6px 8px", borderRadius: "6px", color: "var(--text-muted)", display: "flex" }}>
              <ChevronRight size={15} />
            </button>
          </div>

          {/* Today */}
          <button onClick={goToday} style={{ padding: "6px 12px", border: "1px solid var(--border-subtle)", borderRadius: "8px", background: "var(--surface-secondary)", fontSize: "0.75rem", fontWeight: 800, color: "var(--text-muted)", cursor: "pointer" }}>
            Today
          </button>

          {/* View switcher */}
          <div style={{ display: "flex", background: "var(--surface-secondary)", border: "1px solid var(--border-subtle)", borderRadius: "8px", padding: "2px", gap: "2px", marginLeft: "auto" }}>
            {VIEWS.map(v => (
              <button key={v.id} onClick={() => setView(v.id)} style={{
                display: "flex", alignItems: "center", gap: "5px", padding: "5px 12px",
                borderRadius: "6px", border: "none",
                background: view === v.id ? "var(--surface-primary)" : "transparent",
                color: view === v.id ? "var(--text-main)" : "var(--text-muted)",
                fontWeight: 700, fontSize: "0.75rem", cursor: "pointer",
                boxShadow: view === v.id ? "0 1px 4px rgba(0,0,0,0.06)" : "none",
                transition: "all 0.15s"
              }}>
                {v.icon} {v.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Filter Chips ── */}
        <div style={{ display: "flex", gap: "6px", marginBottom: "16px", flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: "0.65rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginRight: "2px" }}>Filter:</span>
          <button onClick={() => setActiveFilters([])} style={{
            padding: "4px 10px", borderRadius: "6px", border: `1px solid ${activeFilters.length === 0 ? "#6366f1" : "var(--border-subtle)"}`,
            background: activeFilters.length === 0 ? "#6366f1" : "transparent",
            color: activeFilters.length === 0 ? "#fff" : "var(--text-muted)",
            fontSize: "0.72rem", fontWeight: 800, cursor: "pointer"
          }}>All</button>
          {FILTER_OPTIONS.map(f => (
            <button key={f.id} onClick={() => toggleFilter(f.id)} style={{
              padding: "4px 10px", borderRadius: "6px",
              border: `1px solid ${activeFilters.includes(f.id) ? f.color : "var(--border-subtle)"}`,
              background: activeFilters.includes(f.id) ? f.color + "18" : "transparent",
              color: activeFilters.includes(f.id) ? f.color : "var(--text-muted)",
              fontSize: "0.72rem", fontWeight: 800, cursor: "pointer", transition: "all 0.15s"
            }}>
              {f.label}
            </button>
          ))}
        </div>

        {/* ── Upcoming Events Banner ── */}
        {upcomingHolidays.length > 0 && (
          <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
            {upcomingHolidays.map(h => {
              const days = Math.ceil((new Date(h.date) - new Date()) / 86400000);
              return (
                <button key={h.date + h.name} onClick={() => setSelectedHoliday(h)} style={{
                  display: "flex", alignItems: "center", gap: "8px", padding: "6px 12px",
                  borderRadius: "8px", background: h.color + "12", border: `1px solid ${h.color}30`,
                  color: h.color, fontWeight: 700, fontSize: "0.72rem", cursor: "pointer",
                  transition: "all 0.15s"
                }}
                  onMouseEnter={e => e.currentTarget.style.background = h.color + "22"}
                  onMouseLeave={e => e.currentTarget.style.background = h.color + "12"}
                >
                  <Zap size={11} />
                  {h.name} — in {days}d
                  <span style={{ background: h.color + "25", padding: "1px 6px", borderRadius: "4px", fontSize: "0.65rem" }}>Score {h.score}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* ── Calendar Body ── */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: "var(--text-muted)" }}>
            <RefreshCw size={24} style={{ opacity: 0.4 }} className="spin" />
            <div style={{ marginTop: "12px", fontSize: "0.85rem", fontWeight: 700 }}>Loading calendar...</div>
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: "auto" }}>
            {view === "month" && (
              <MonthView pivot={pivot} items={items} holidays={holidays} activeFilters={activeFilters}
                onItemClick={() => {}} onHolidayClick={setSelectedHoliday} />
            )}
            {view === "week" && (
              <WeekView pivot={pivot} items={items} holidays={holidays} activeFilters={activeFilters}
                onItemClick={() => {}} onHolidayClick={setSelectedHoliday} onSlotClick={d => { setPivot(d); setView("day"); }} />
            )}
            {view === "day" && (
              <DayView pivot={pivot} items={items} holidays={holidays} activeFilters={activeFilters}
                onItemClick={() => {}} onHolidayClick={setSelectedHoliday} />
            )}
            {view === "agenda" && (
              <AgendaView items={items} holidays={holidays} activeFilters={activeFilters}
                onItemClick={() => {}} onHolidayClick={setSelectedHoliday} />
            )}
          </div>
        )}
      </div>

      {/* ── Opportunity Panel ── */}
      {selectedHoliday && (
        <>
          <div onClick={() => setSelectedHoliday(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.15)", zIndex: 199 }} />
          <OpportunityPanel
            holiday={selectedHoliday}
            onClose={() => setSelectedHoliday(null)}
            onCreatePost={handleCreatePost}
            onCreateArticle={handleCreateArticle}
            onBuildCampaign={handleBuildCampaign}
          />
        </>
      )}

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
};

export default CalendarSchedule;
