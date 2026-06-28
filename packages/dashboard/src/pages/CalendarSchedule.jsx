/**
 * Scheduler — Calendar-First Scheduling UI
 * Fixed grid · Click-to-expand · No drafts · Drag to reschedule
 */
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  ChevronLeft, ChevronRight, Plus, RefreshCw,
  Calendar, List, Clock, LayoutGrid, ChevronDown,
  X, Edit2, Copy, AlertCircle, Check, Image as ImageIcon,
  Globe, Zap, Send, FileText, Layers, MoreHorizontal
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { apiRequest } from "../lib/api/client";
import { COUNTRY_NAMES, ADDITIONAL_COUNTRY_HOLIDAYS } from "../data/countriesHolidays";

// ─── Analytics ───────────────────────────────────────────────────────────────
function track(event, props = {}) {
  try { window.dispatchEvent(new CustomEvent("scheduler_track", { detail: { event, ...props } })); }
  catch (_) {}
}

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_COLOR = {
  scheduled:       "#3b82f6",
  published:       "#22c55e",
  failed:          "#94a3b8",
  partial_failure: "#f59e0b",
};

const PLATFORM_ICON = {
  instagram: "📸", facebook: "📘", linkedin: "💼",
  twitter: "🐦", x: "✖", youtube: "▶", tiktok: "🎵",
};

const PLATFORM_COLOR = {
  instagram: "#e1306c", facebook: "#1877f2", linkedin: "#0a66c2",
  twitter: "#000", x: "#000", youtube: "#ff0000", tiktok: "#010101",
};

// ─── Holidays ─────────────────────────────────────────────────────────────────
const INTL_HOLIDAYS = [
  { md:"01-01", name:"New Year's Day",            color:"#6366f1", score:82 },
  { md:"02-14", name:"Valentine's Day",            color:"#ec4899", score:95 },
  { md:"03-08", name:"International Women's Day",  color:"#8b5cf6", score:88 },
  { md:"03-17", name:"St. Patrick's Day",          color:"#22c55e", score:72 },
  { md:"03-20", name:"First Day of Spring",        color:"#84cc16", score:68 },
  { md:"04-01", name:"April Fools' Day",           color:"#f59e0b", score:65 },
  { md:"04-22", name:"Earth Day",                  color:"#16a34a", score:80 },
  { md:"05-12", name:"Mother's Day",               color:"#f472b6", score:93 },
  { md:"06-01", name:"Pride Month Begins",         color:"#a855f7", score:85 },
  { md:"06-21", name:"Father's Day",               color:"#3b82f6", score:88 },
  { md:"07-04", name:"US Independence Day",        color:"#ef4444", score:85, countries:["US","ZW"] },
  { md:"07-07", name:"World Chocolate Day",        color:"#b45309", score:90 },
  { md:"09-22", name:"First Day of Fall",          color:"#f97316", score:70 },
  { md:"10-01", name:"World Coffee Day",           color:"#8b5cf6", score:87 },
  { md:"10-10", name:"World Mental Health Day",    color:"#06b6d4", score:75 },
  { md:"10-31", name:"Halloween",                  color:"#f97316", score:90 },
  { md:"11-28", name:"Thanksgiving",               color:"#b45309", score:88, countries:["US"] },
  { md:"11-29", name:"Black Friday",               color:"#1e293b", score:98 },
  { md:"12-02", name:"Cyber Monday",               color:"#7c3aed", score:96 },
  { md:"12-25", name:"Christmas Day",              color:"#dc2626", score:92 },
  { md:"12-31", name:"New Year's Eve",             color:"#6366f1", score:85 },
  { md:"03-20", name:"International Day of Happiness", color:"#e1306c", score:84 },
  { md:"04-07", name:"World Health Day",           color:"#10b981", score:78 },
  { md:"06-05", name:"World Environment Day",      color:"#16a34a", score:81 },
  { md:"06-30", name:"World Social Media Day",     color:"#2563eb", score:93 },
  { md:"07-01", name:"International Joke Day",     color:"#ec4899", score:70 },
  { md:"08-19", name:"World Photography Day",      color:"#0ea5e9", score:77 },
  { md:"09-05", name:"International Day of Charity", color:"#a855f7", score:74 },
  { md:"10-16", name:"World Food Day",             color:"#f59e0b", score:80 },
];

const HOLIDAY_IDEAS = {
  "New Year's Day": [
    "Share your brand's key strategic resolutions for the coming year.",
    "Show gratitude to your clients and community for their trust last year.",
    "Offer a New Year kick-off promo code or incentive."
  ],
  "Valentine's Day": [
    "Run a 'Share the Love' customer appreciation story spotlight.",
    "Offer a limited-time BOGO or partner-themed discount code.",
    "Share a behind-the-scenes video showing what your team loves about their work."
  ],
  "International Women's Day": [
    "Profile and celebrate female leaders or team members within your organization.",
    "Highlight female-founded businesses or clients you support.",
    "Share a quote or story of an influential woman who shaped your industry."
  ],
  "St. Patrick's Day": [
    "Share a post about 'lucky breaks' or milestones your brand has had.",
    "Run a themed discount code using 'LUCKY' or 'GREEN'.",
    "Post a green-themed photo of your team or office workspace."
  ],
  "First Day of Spring": [
    "Share tips on 'spring cleaning' processes relevant to your business.",
    "Announce fresh updates, feature additions, or service packages.",
    "Post about renewal, growth, and team energy matching the new season."
  ],
  "April Fools' Day": [
    "Share a lighthearted joke or a humorous product concept (keep it safe!).",
    "Post a list of funny customer/client myths vs. realities in your industry.",
    "Run a 'no joke, just deals' flash discount campaign."
  ],
  "Earth Day": [
    "Share your brand's green practices, recycling efforts, or sustainability targets.",
    "Highlight tips on how your audience can reduce waste or energy in their daily lives.",
    "Commit to planting a tree or donating a portion of today's sales to green charities."
  ],
  "Mother's Day": [
    "Wish all the moms in your community and team a wonderful day.",
    "Offer a special Mother's Day gift-guide or discount options.",
    "Share stories of working moms balancing careers and family."
  ],
  "Pride Month Begins": [
    "Express your brand's commitment to diversity, equity, and inclusion.",
    "Highlight LGBTQ+ creators, businesses, or partners you support.",
    "Share educational resources or support messages for pride initiatives."
  ],
  "Father's Day": [
    "Wish all the dads on your team and in your audience a Happy Father's Day.",
    "Share dad jokes related to your business or industry.",
    "Offer a Father's Day discount or special bundle."
  ],
  "US Independence Day": [
    "Wish your audience a happy 4th of July.",
    "Announce holiday hours or special sales events.",
    "Share photos of community celebrations or team gatherings."
  ],
  "World Chocolate Day": [
    "Do a chocolate tasting or share a recipe relevant to your team.",
    "Give away a premium box of local chocolates to a lucky follower.",
    "Post about how small sweet treats help boost team morale."
  ],
  "First Day of Fall": [
    "Share fall preparation checklists for your industry.",
    "Announce autumn seasonal discounts or bundle offers.",
    "Post cozy fall-themed design concepts or product mockups."
  ],
  "World Coffee Day": [
    "Share a photo or reel of the team's morning coffee setup.",
    "Ask a fun poll: 'Espresso or Filter coffee? Let us know in the comments!'",
    "Partner with a local coffee shop to give away coffee vouchers."
  ],
  "World Mental Health Day": [
    "Share steps your brand takes to prevent employee burnout.",
    "Provide self-care tips or stress-management resources for your audience.",
    "Normalize wellness discussions and post mental health support contacts."
  ],
  "Halloween": [
    "Post photos of your team members in their Halloween costumes.",
    "Share industry-themed 'horror stories' or mistakes to avoid.",
    "Offer a spooky discount code like 'TREAT' for a limited time."
  ],
  "Thanksgiving": [
    "Post a heartfelt thank-you letter to your audience, clients, and partners.",
    "Highlight team members sharing what they are most grateful for this year.",
    "Announce holiday hours and family time closures."
  ],
  "Black Friday": [
    "Launch your biggest sale of the year with clear time-limits.",
    "Highlight top products or packages that are heavily discounted.",
    "Post real-time stock/availability count warnings."
  ],
  "Cyber Monday": [
    "Highlight digital product or service packages with special rates.",
    "Run a flash discount extending from Black Friday weekend.",
    "Offer free setup, onboarding, or bonus content with purchase."
  ],
  "Christmas Day": [
    "Wish your entire community, customers, and partners a Merry Christmas.",
    "Post a warm, festive greeting photo from your team/family.",
    "Highlight charitable giving or community support during the holidays."
  ],
  "New Year's Eve": [
    "Share a countdown checklist or top achievements list from the past year.",
    "Tease new designs, projects, or launches coming up in the next year.",
    "Wish everyone a safe and exciting celebration night."
  ],
  "International Day of Happiness": [
    "Ask your audience: 'What made you smile today?' and offer a freebie to the best answer.",
    "Share a checklist of simple habits that boost workplace happiness.",
    "Share positive feedback or wins from happy clients."
  ],
  "World Health Day": [
    "Share healthy workspace tips (ergonomics, walking breaks, hydration).",
    "Highlight health and safety standards in your operations.",
    "Share links to reliable wellness check resources."
  ],
  "World Environment Day": [
    "Share how your brand is working to reduce carbon footprint.",
    "Highlight simple tips for paperless workflows or energy savings.",
    "Encourage followers to do a community cleanup."
  ],
  "World Social Media Day": [
    "Ask followers to share their favorite social media memory with your brand.",
    "Share a checklist of social media best practices or tips.",
    "Run a live Q&A session answering audience questions."
  ],
  "International Joke Day": [
    "Share a clean, industry-relevant joke or funny meme.",
    "Run a contest: 'Best business joke wins a custom audit report!'",
    "Post a lighthearted blooper reel or funny behind-the-scenes moments."
  ],
  "World Photography Day": [
    "Post a beautiful, high-quality photograph of your product or workspace.",
    "Run a photo contest for your users, featuring prizes for the best shot.",
    "Highlight the photographers, designers, or creators behind your brand visuals."
  ],
  "International Day of Charity": [
    "Highlight a local charity or cause your team recently volunteered for.",
    "Announce a profit-sharing campaign where 10% of today's sales go to charity.",
    "Encourage community support and raise awareness for a social cause."
  ],
  "World Food Day": [
    "Share the team's favorite lunch spots or recipes.",
    "Raise awareness or support for local food banks or community gardens.",
    "Offer a themed food-industry promotion or highlight local eateries."
  ]
};

const COUNTRY_HOLIDAYS = ADDITIONAL_COUNTRY_HOLIDAYS;

function getHolidaysInRange(from, to, countryCode = null) {
  const start = new Date(from); start.setHours(0,0,0,0);
  const end   = new Date(to);   end.setHours(23,59,59,999);
  const country = (countryCode || "").toUpperCase();

  const base = [
    ...INTL_HOLIDAYS.filter(h => !h.countries || h.countries.includes(country) || !countryCode),
    ...(COUNTRY_HOLIDAYS[country] || []),
  ];

  const result = [];
  for (let y = start.getFullYear(); y <= end.getFullYear(); y++) {
    for (const h of base) {
      const [mm, dd] = h.md.split("-");
      const d = new Date(y, +mm - 1, +dd);
      if (d >= start && d <= end) result.push({ ...h, date: d.toISOString().slice(0,10) });
    }
  }
  return result;
}

// ─── Date helpers ─────────────────────────────────────────────────────────────
const isoDate  = d => new Date(d).toISOString().slice(0,10);
const addDays  = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
const fmtTime  = d => new Date(d).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit", hour12:false });
const fmtDay   = d => new Date(d).toLocaleDateString("en-US", { weekday:"short", month:"short", day:"numeric" });

function weekStart(d) {
  const r = new Date(d); r.setHours(0,0,0,0);
  const day = r.getDay();
  r.setDate(r.getDate() - (day === 0 ? 6 : day - 1));
  return r;
}

function monthDays(pivot) {
  const y = pivot.getFullYear(), m = pivot.getMonth();
  const first = new Date(y, m, 1), last = new Date(y, m+1, 0);
  const startOff = (first.getDay() + 6) % 7;
  const start = addDays(first, -startOff);
  const endOff = (7 - last.getDay()) % 7;
  const end = addDays(last, endOff === 7 ? 0 : endOff);
  const days = [];
  let cur = new Date(start);
  while (cur <= end) { days.push(new Date(cur)); cur = addDays(cur, 1); }
  return days;
}

function rangeForView(view, pivot) {
  if (view === "month") {
    const y = pivot.getFullYear(), m = pivot.getMonth();
    return { from: new Date(y, m, 1), to: new Date(y, m+1, 0) };
  }
  if (view === "week") {
    const ws = weekStart(pivot);
    return { from: ws, to: addDays(ws, 6) };
  }
  if (view === "day") return { from: pivot, to: pivot };
  return { from: addDays(pivot, -1), to: addDays(pivot, 90) };
}

// ─── Platform Preview ─────────────────────────────────────────────────────────
function PlatformPreview({ platform, caption, brandName, hasMedia }) {
  const p = (platform || "").toLowerCase();
  const text = caption || "No caption";
  const name = brandName || "Your Brand";

  const mediaPlaceholder = hasMedia ? (
    <div style={{ width:"100%", height:"220px", background:"linear-gradient(135deg,#e2e8f0,#cbd5e1)", borderRadius:"4px", display:"flex", alignItems:"center", justifyContent:"center", color:"#94a3b8" }}>
      <ImageIcon size={32} />
    </div>
  ) : null;

  if (p === "instagram") return (
    <div style={{ fontFamily:"-apple-system,sans-serif", border:"1px solid #dbdbdb", borderRadius:"8px", overflow:"hidden", background:"#fff", maxWidth:"400px" }}>
      <div style={{ padding:"12px 14px", display:"flex", alignItems:"center", gap:"10px", borderBottom:"1px solid #dbdbdb" }}>
        <div style={{ width:"32px", height:"32px", borderRadius:"50%", background:"linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:"0.7rem", fontWeight:900 }}>{name[0]}</div>
        <span style={{ fontWeight:700, fontSize:"0.85rem" }}>{name.toLowerCase().replace(/\s/g,"_")}</span>
        <span style={{ marginLeft:"auto", color:"#8e8e8e" }}>•••</span>
      </div>
      {mediaPlaceholder && <div style={{ padding:"0" }}>{mediaPlaceholder}</div>}
      <div style={{ padding:"10px 14px" }}>
        <div style={{ display:"flex", gap:"16px", marginBottom:"8px", fontSize:"1.1rem" }}>❤️ 💬 📤 <span style={{ marginLeft:"auto" }}>🔖</span></div>
        <div style={{ fontSize:"0.82rem", marginBottom:"4px" }}><strong>{name.toLowerCase().replace(/\s/g,"_")}</strong> {text}</div>
        <div style={{ fontSize:"0.75rem", color:"#8e8e8e" }}>Scheduled · View insights</div>
      </div>
    </div>
  );

  if (p === "linkedin") return (
    <div style={{ fontFamily:"-apple-system,sans-serif", border:"1px solid #e5e7eb", borderRadius:"8px", overflow:"hidden", background:"#fff", maxWidth:"400px" }}>
      <div style={{ padding:"12px 14px", display:"flex", alignItems:"flex-start", gap:"10px" }}>
        <div style={{ width:"40px", height:"40px", borderRadius:"4px", background:"#0a66c2", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:900, fontSize:"1rem", flexShrink:0 }}>{name[0]}</div>
        <div>
          <div style={{ fontWeight:700, fontSize:"0.85rem" }}>{name}</div>
          <div style={{ fontSize:"0.72rem", color:"#666" }}>Company · Scheduled</div>
          <div style={{ fontSize:"0.72rem", color:"#666" }}>🌐 Anyone</div>
        </div>
      </div>
      <div style={{ padding:"0 14px 12px", fontSize:"0.85rem", lineHeight:"1.5", color:"#000", whiteSpace:"pre-line" }}>{text}</div>
      {mediaPlaceholder && <div style={{ padding:"0 14px 12px" }}>{mediaPlaceholder}</div>}
      <div style={{ padding:"8px 14px", borderTop:"1px solid #e5e7eb", display:"flex", gap:"4px" }}>
        {["👍 Like","💬 Comment","🔁 Repost","📤 Send"].map(a => (
          <span key={a} style={{ fontSize:"0.72rem", fontWeight:700, color:"#666", padding:"6px 8px", borderRadius:"4px", cursor:"pointer" }}>{a}</span>
        ))}
      </div>
    </div>
  );

  if (p === "facebook") return (
    <div style={{ fontFamily:"-apple-system,sans-serif", border:"1px solid #e5e7eb", borderRadius:"8px", overflow:"hidden", background:"#fff", maxWidth:"400px" }}>
      <div style={{ padding:"12px 14px", display:"flex", alignItems:"center", gap:"10px" }}>
        <div style={{ width:"36px", height:"36px", borderRadius:"50%", background:"#1877f2", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:900 }}>{name[0]}</div>
        <div>
          <div style={{ fontWeight:700, fontSize:"0.85rem" }}>{name}</div>
          <div style={{ fontSize:"0.72rem", color:"#8e8e8e" }}>Scheduled · 🌐</div>
        </div>
        <span style={{ marginLeft:"auto", color:"#8e8e8e" }}>•••</span>
      </div>
      <div style={{ padding:"0 14px 12px", fontSize:"0.85rem", lineHeight:"1.6", whiteSpace:"pre-line" }}>{text}</div>
      {mediaPlaceholder && <div>{mediaPlaceholder}</div>}
      <div style={{ padding:"8px 14px", borderTop:"1px solid #e5e7eb", display:"flex", justifyContent:"space-around" }}>
        {["👍 Like","💬 Comment","🔁 Share"].map(a => (
          <span key={a} style={{ fontSize:"0.78rem", fontWeight:700, color:"#65676b", padding:"6px", cursor:"pointer" }}>{a}</span>
        ))}
      </div>
    </div>
  );

  // Twitter / X / default
  return (
    <div style={{ fontFamily:"-apple-system,sans-serif", border:"1px solid #e5e7eb", borderRadius:"12px", overflow:"hidden", background:"#fff", maxWidth:"400px", padding:"12px 14px" }}>
      <div style={{ display:"flex", gap:"10px" }}>
        <div style={{ width:"40px", height:"40px", borderRadius:"50%", background:"#000", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:900, flexShrink:0 }}>{name[0]}</div>
        <div style={{ flex:1 }}>
          <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
            <span style={{ fontWeight:700, fontSize:"0.85rem" }}>{name}</span>
            <span style={{ fontSize:"0.75rem", color:"#536471" }}>@{name.toLowerCase().replace(/\s/g,"_")}</span>
          </div>
          <div style={{ fontSize:"0.9rem", marginTop:"4px", lineHeight:"1.5", whiteSpace:"pre-line" }}>{text}</div>
          {mediaPlaceholder && <div style={{ marginTop:"8px", borderRadius:"12px", overflow:"hidden" }}>{mediaPlaceholder}</div>}
          <div style={{ display:"flex", gap:"20px", marginTop:"10px", color:"#536471", fontSize:"0.8rem" }}>
            <span>💬 0</span><span>🔁 0</span><span>❤️ 0</span><span>📊</span><span>📤</span>
          </div>
        </div>
      </div>
    </div>
  );
}
function PostChip({ item, onSelect, isDragging, onDragStart, onDragEnd }) {
  const color = STATUS_COLOR[item.status] || "#94a3b8";
  const canDrag = item.status === "scheduled";
  const displayLabel = (item.content_type === 'blog' || item.content_type === 'article')
    ? (item.title || "Untitled Article")
    : (item.caption || item.title || "Untitled Post");

  return (
    <div
      draggable={canDrag}
      onDragStart={canDrag ? (e) => { e.dataTransfer.setData("scheduler_item", JSON.stringify(item)); onDragStart?.(item); } : undefined}
      onDragEnd={onDragEnd}
      onClick={() => onSelect(item)}
      title={item.caption || item.title || "Untitled"}
      style={{
        height: "26px", display: "flex", alignItems: "center", gap: "5px",
        padding: "0 6px", borderRadius: "5px", marginBottom: "3px",
        background: color + "14", borderLeft: `3px solid ${color}`,
        cursor: canDrag ? "grab" : "pointer",
        opacity: isDragging ? 0.4 : 1,
        transition: "opacity 0.15s",
        overflow: "hidden",
        userSelect: "none",
      }}
    >
      {item.has_media ? (
        <span style={{ width: "14px", height: "14px", borderRadius: "2px", background: color + "40", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <ImageIcon size={8} style={{ color }} />
        </span>
      ) : (
        <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: color, flexShrink: 0 }} />
      )}
      <span style={{ flex: 1, fontSize: "0.7rem", fontWeight: 600, color: "var(--text-main)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {displayLabel}
      </span>
      <span style={{ fontSize: "0.6rem", flexShrink: 0 }}>{PLATFORM_ICON[item.platform] || "📌"}</span>
      <span style={{ fontSize: "0.6rem", color: "#94a3b8", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>{fmtTime(item.date)}</span>
    </div>
  );
}

// ─── Month Grid ───────────────────────────────────────────────────────────────
const CELL_H = 160;
const MAX_PER_CELL = 3;

function MonthGrid({ pivot, items, holidays, onSelect, onDayStack, dragItem, onDropCell, onDragStart, onDragEnd, setSelectedHoliday }) {
  const days = useMemo(() => monthDays(pivot), [pivot]);
  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);
  const curMonth = pivot.getMonth();
  const [dropTarget, setDropTarget] = useState(null);

  const byDate = useMemo(() => {
    const m = {};
    for (const i of items) {
      const k = isoDate(i.date);
      if (!m[k]) m[k] = [];
      m[k].push(i);
    }
    return m;
  }, [items]);

  const holidaysByDate = useMemo(() => {
    const m = {};
    for (const h of holidays) {
      if (!m[h.date]) m[h.date] = [];
      m[h.date].push(h);
    }
    return m;
  }, [holidays]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", border: "1px solid var(--border-subtle)", borderRadius: "8px", overflow: "hidden" }}>
      {/* Day headers */}
      {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => (
        <div key={d} style={{ background: "var(--surface-secondary)", padding: "8px 10px", fontSize: "0.65rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "center", borderBottom: "1px solid var(--border-subtle)" }}>
          {d}
        </div>
      ))}

      {/* Cells */}
      {days.map((date, idx) => {
        const key = isoDate(date);
        const isCurrentMonth = date.getMonth() === curMonth;
        const isToday = date.getTime() === today.getTime();
        const dayItems = byDate[key] || [];
        const dayHolidays = holidaysByDate[key] || [];
        const overflow = dayItems.length - MAX_PER_CELL;
        const isDropTarget = dropTarget === key;

        return (
          <div
            key={idx}
            onDragOver={dragItem ? (e) => { e.preventDefault(); setDropTarget(key); } : undefined}
            onDragLeave={dragItem ? () => setDropTarget(null) : undefined}
            onDrop={dragItem ? (e) => {
              e.preventDefault();
              setDropTarget(null);
              const raw = e.dataTransfer.getData("scheduler_item");
              if (raw) onDropCell?.(JSON.parse(raw), date);
            } : undefined}
            style={{
              height: `${CELL_H}px`,
              background: isDropTarget ? "#eff6ff" : isToday ? "#f8faff" : "var(--surface-primary)",
              padding: "8px 8px 6px",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              opacity: isCurrentMonth ? 1 : 0.3,
              borderBottom: "1px solid var(--border-subtle)",
              borderRight: "1px solid var(--border-subtle)",
              boxSizing: "border-box",
              outline: isDropTarget ? "2px solid #3b82f6" : isToday ? "1.5px solid #bfdbfe" : "none",
              outlineOffset: "-1px",
              cursor: dragItem ? "copy" : "default",
              transition: "background 0.1s, outline 0.1s",
            }}
          >
            {/* Day number */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "5px" }}>
              <div
                onClick={() => dayItems.length > 0 && onDayStack(date, dayItems, dayHolidays)}
                style={{
                  width: "22px", height: "22px", display: "flex", alignItems: "center", justifyContent: "center",
                  borderRadius: "50%", fontSize: "0.78rem", fontWeight: isToday ? 900 : 700,
                  color: isToday ? "#fff" : "var(--text-main)",
                  background: isToday ? "#3b82f6" : "transparent",
                  cursor: dayItems.length > 0 ? "pointer" : "default",
                }}
              >
                {date.getDate()}
              </div>
              {dayHolidays.length > 0 && (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedHoliday?.(dayHolidays[0]);
                  }}
                  style={{ fontSize: "0.55rem", fontWeight: 800, color: dayHolidays[0].color, background: dayHolidays[0].color + "18", padding: "1px 5px", borderRadius: "4px", maxWidth: "80px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "pointer", border: `1px solid ${dayHolidays[0].color}30` }}
                  title={`Click to view ideas for ${dayHolidays[0].name}`}
                >
                  🎉 {dayHolidays[0].name}
                </div>
              )}
            </div>

            {/* Post chips */}
            <div style={{ flex: 1, overflow: "hidden" }}>
              {dayItems.slice(0, MAX_PER_CELL).map(item => (
                <PostChip
                  key={item.id}
                  item={item}
                  onSelect={onSelect}
                  isDragging={dragItem?.id === item.id}
                  onDragStart={onDragStart}
                  onDragEnd={onDragEnd}
                />
              ))}
            </div>

            {/* Overflow */}
            {overflow > 0 && (
              <button
                onClick={() => onDayStack(date, dayItems, dayHolidays)}
                style={{ border: "none", background: "transparent", padding: "0", fontSize: "0.65rem", fontWeight: 800, color: "#3b82f6", cursor: "pointer", textAlign: "left", marginTop: "2px" }}
              >
                +{overflow} more
              </button>
            )}

          </div>
        );
      })}
    </div>
  );
}

// ─── Week Grid ────────────────────────────────────────────────────────────────
function WeekGrid({ pivot, items, holidays, onSelect, onSlotClick, dragItem, onDropCell, onDragStart, onDragEnd, setSelectedHoliday }) {
  const ws = useMemo(() => weekStart(pivot), [pivot]);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(ws, i)), [ws]);
  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);
  const [dropTarget, setDropTarget] = useState(null);

  const byDate = useMemo(() => {
    const m = {};
    for (const i of items) {
      const k = isoDate(i.date);
      if (!m[k]) m[k] = [];
      m[k].push(i);
    }
    return m;
  }, [items]);

  const holidaysByDate = useMemo(() => {
    const m = {};
    for (const h of holidays) {
      if (!m[h.date]) m[h.date] = [];
      m[h.date].push(h);
    }
    return m;
  }, [holidays]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "1px", background: "var(--border-subtle)", borderRadius: "8px", overflow: "hidden", minHeight: "480px" }}>
      {days.map((date, idx) => {
        const key = isoDate(date);
        const dayItems = byDate[key] || [];
        const dayHolidays = holidaysByDate[key] || [];
        const isToday = date.getTime() === today.getTime();
        const isDropTarget = dropTarget === key;
        return (
          <div
            key={idx}
            onDragOver={dragItem ? (e) => { e.preventDefault(); setDropTarget(key); } : undefined}
            onDragLeave={dragItem ? () => setDropTarget(null) : undefined}
            onDrop={dragItem ? (e) => {
              e.preventDefault();
              setDropTarget(null);
              const raw = e.dataTransfer.getData("scheduler_item");
              if (raw) onDropCell?.(JSON.parse(raw), date);
            } : undefined}
            style={{
              background: isDropTarget ? "#eff6ff" : isToday ? "#f8faff" : "var(--surface-primary)",
              padding: "10px 8px", display: "flex", flexDirection: "column", gap: "4px",
              outline: isDropTarget ? "2px inset #3b82f6" : isToday ? "1.5px inset #bfdbfe" : "none",
              transition: "background 0.1s",
            }}
          >
            <div style={{ marginBottom: "6px" }}>
              <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                {date.toLocaleDateString("en-US", { weekday: "short" })}
              </div>
              <div style={{
                width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center",
                borderRadius: "50%", fontSize: "0.95rem", fontWeight: 900,
                color: isToday ? "#fff" : "var(--text-main)",
                background: isToday ? "#3b82f6" : "transparent",
              }}>
                {date.getDate()}
              </div>
            </div>
            {dayHolidays.map(h => (
              <div
                key={h.name}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedHoliday?.(h);
                }}
                style={{ fontSize: "0.65rem", fontWeight: 800, color: h.color, background: h.color + "15", padding: "2px 6px", borderRadius: "4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "pointer", border: `1px solid ${h.color}30` }}
                title={`Click to view ideas for ${h.name}`}
              >
                🎉 {h.name}
              </div>
            ))}
            {dayItems.map(item => (
              <PostChip
                key={item.id}
                item={item}
                onSelect={onSelect}
                isDragging={dragItem?.id === item.id}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
              />
            ))}
            {dayItems.length === 0 && dayHolidays.length === 0 && (
              <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", textAlign: "center", marginTop: "16px", opacity: 0.5 }}>
                Empty
              </div>
            )}
            <button
              onClick={() => onSlotClick?.(date)}
              style={{ marginTop: "auto", padding: "6px", border: "1px dashed var(--border-subtle)", borderRadius: "6px", background: "transparent", color: "var(--text-muted)", fontSize: "0.7rem", fontWeight: 700, cursor: "pointer" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#3b82f6"; e.currentTarget.style.color = "#3b82f6"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border-subtle)"; e.currentTarget.style.color = "var(--text-muted)"; }}
            >
              + Schedule
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ─── Day View ─────────────────────────────────────────────────────────────────
function DayView({ pivot, items, holidays, onSelect }) {
  const key = isoDate(pivot);
  const dayItems = items.filter(i => isoDate(i.date) === key).sort((a,b) => new Date(a.date) - new Date(b.date));
  const dayHolidays = holidays.filter(h => h.date === key);

  return (
    <div style={{ maxWidth: "640px", margin: "0 auto" }}>
      <div style={{ padding: "16px 20px", background: "var(--surface-secondary)", borderRadius: "10px", marginBottom: "20px" }}>
        <div style={{ fontWeight: 900, fontSize: "1.1rem" }}>{pivot.toLocaleDateString("en-US", { weekday:"long", month:"long", day:"numeric", year:"numeric" })}</div>
        <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "3px" }}>
          {dayItems.length} post{dayItems.length !== 1 ? "s" : ""} scheduled
        </div>
      </div>
      {dayHolidays.map(h => (
        <div key={h.name} style={{ background: h.color + "12", border: `1px solid ${h.color}30`, borderRadius: "10px", padding: "12px 16px", marginBottom: "12px", display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "1.2rem" }}>🎉</span>
          <div><div style={{ fontWeight: 800, color: h.color }}>{h.name}</div><div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Opportunity Score: {h.score}/100</div></div>
        </div>
      ))}
      {dayItems.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-muted)" }}>
          <Calendar size={36} style={{ opacity: 0.3, marginBottom: "10px" }} />
          <div style={{ fontWeight: 700 }}>Nothing scheduled for this day.</div>
        </div>
      )}
      {dayItems.map(item => {
        const color = STATUS_COLOR[item.status] || "#94a3b8";
        return (
          <div key={item.id} onClick={() => onSelect(item)} style={{ background: "var(--surface-primary)", borderRadius: "10px", padding: "14px 18px", border: "1px solid var(--border-subtle)", borderLeft: `4px solid ${color}`, marginBottom: "10px", cursor: "pointer", display: "flex", alignItems: "center", gap: "14px", transition: "all 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.06)"}
            onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}
          >
            <span style={{ fontSize: "1.1rem" }}>{PLATFORM_ICON[item.platform] || "📌"}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>{item.title || "Untitled"}</div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "2px" }}>{fmtTime(item.date)} · {item.platform}</div>
            </div>
            <span style={{ fontSize: "0.65rem", fontWeight: 800, textTransform: "uppercase", background: color + "18", color, padding: "2px 8px", borderRadius: "4px" }}>{item.status}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Agenda View ──────────────────────────────────────────────────────────────
function AgendaView({ items, holidays, onSelect }) {
  const todayKey = isoDate(new Date());
  const grouped = useMemo(() => {
    const m = {};
    for (const i of items) {
      const k = isoDate(i.date);
      if (!m[k]) m[k] = { items: [], holidays: [] };
      m[k].items.push(i);
    }
    for (const h of holidays) {
      if (!m[h.date]) m[h.date] = { items: [], holidays: [] };
      m[h.date].holidays.push(h);
    }
    return Object.entries(m).sort(([a],[b]) => a.localeCompare(b));
  }, [items, holidays]);

  if (!grouped.length) return (
    <div style={{ textAlign: "center", padding: "80px 0", color: "var(--text-muted)" }}>
      <List size={36} style={{ opacity: 0.3, marginBottom: "12px" }} />
      <div style={{ fontWeight: 700 }}>Nothing scheduled yet.</div>
    </div>
  );

  return (
    <div style={{ maxWidth: "680px", margin: "0 auto" }}>
      {grouped.map(([date, group]) => {
        const isPast = date < todayKey;
        const isToday = date === todayKey;
        return (
          <div key={date} style={{ marginBottom: "28px", opacity: isPast ? 0.55 : 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px" }}>
              <div style={{
                fontSize: "0.75rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.06em",
                color: isToday ? "#3b82f6" : "var(--text-muted)",
                background: isToday ? "#eff6ff" : "var(--surface-secondary)",
                padding: "4px 12px", borderRadius: "6px",
                border: isToday ? "1px solid #bfdbfe" : "none",
              }}>
                {isToday ? "Today — " : ""}{fmtDay(date + "T12:00:00")}
              </div>
              <div style={{ flex: 1, height: "1px", background: "var(--border-subtle)" }} />
            </div>
            {group.holidays.map(h => (
              <div key={h.name} style={{ background: h.color + "12", border: `1px solid ${h.color}25`, borderRadius: "8px", padding: "8px 14px", marginBottom: "8px", display: "flex", alignItems: "center", gap: "10px" }}>
                <span>🎉</span>
                <span style={{ fontWeight: 800, color: h.color, fontSize: "0.82rem" }}>{h.name}</span>
                <span style={{ marginLeft: "auto", fontSize: "0.65rem", color: "var(--text-muted)" }}>Score {h.score}/100</span>
              </div>
            ))}
            {group.items.sort((a,b) => new Date(a.date) - new Date(b.date)).map(item => {
              const color = STATUS_COLOR[item.status] || "#94a3b8";
              return (
                <div key={item.id} onClick={() => onSelect(item)} style={{ background: "var(--surface-primary)", borderRadius: "8px", padding: "10px 14px", border: "1px solid var(--border-subtle)", borderLeft: `3px solid ${color}`, marginBottom: "8px", cursor: "pointer", display: "flex", alignItems: "center", gap: "12px", transition: "all 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--surface-secondary)"}
                  onMouseLeave={e => e.currentTarget.style.background = "var(--surface-primary)"}
                >
                  <span style={{ fontSize: "0.9rem" }}>{PLATFORM_ICON[item.platform] || "📌"}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: "0.85rem" }}>{item.title || "Untitled"}</div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "2px" }}>{fmtTime(item.date)}{item.platform ? ` · ${item.platform}` : ""}</div>
                  </div>
                  <span style={{ fontSize: "0.6rem", fontWeight: 800, textTransform: "uppercase", background: color + "18", color, padding: "2px 7px", borderRadius: "4px" }}>{item.status}</span>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ─── Scheduler Drawer ─────────────────────────────────────────────────────────
function SchedulerDrawer({ item, detail, loading, onClose, onEdit, onReschedule, onDuplicate, brandName }) {
  const [rescheduleMode, setRescheduleMode] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [rescheduling, setRescheduling] = useState(false);
  const [rescheduled, setRescheduled] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (item?.date) {
      const d = new Date(item.date);
      setNewDate(d.toISOString().slice(0, 10));
      setNewTime(d.toTimeString().slice(0, 5));
    }
    setRescheduleMode(false);
    setRescheduled(false);
    setError(null);
  }, [item?.id]);

  const handleReschedule = async () => {
    if (!newDate || !newTime) return;
    setRescheduling(true);
    setError(null);
    try {
      const dt = new Date(`${newDate}T${newTime}`);
      await onReschedule(item.id, dt.toISOString());
      setRescheduled(true);
      setRescheduleMode(false);
      track("scheduler_rescheduled", { item_id: item.id, platform: item.platform });
    } catch (e) {
      setError(e.message || "Reschedule failed");
    } finally {
      setRescheduling(false);
    }
  };

  if (!item) return null;

  const color = STATUS_COLOR[item.status] || "#94a3b8";
  const caption = detail?.data?.body || item.caption || "";
  const hasMedia = !!(detail?.data?.media_ids && detail.data.media_ids !== "[]");

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.18)", zIndex: 300 }} />
      <div style={{
        position: "fixed", right: 0, top: 0, bottom: 0, width: "560px", maxWidth: "100vw",
        background: "var(--surface-primary)", borderLeft: "1px solid var(--border-subtle)",
        boxShadow: "-12px 0 40px rgba(0,0,0,0.1)", zIndex: 301,
        display: "flex", flexDirection: "column",
        animation: "drawerIn 0.2s ease-out",
      }}>
        {/* Header */}
        <div style={{ padding: "18px 22px 0", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "1rem" }}>{PLATFORM_ICON[item.platform] || "📌"}</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: "0.9rem", color: "var(--text-main)" }}>{item.title || "Untitled"}</div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{item.platform} · {fmtTime(item.date)} · {new Date(item.date).toLocaleDateString()}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <span style={{ fontSize: "0.65rem", fontWeight: 800, textTransform: "uppercase", background: color + "18", color, padding: "3px 8px", borderRadius: "4px" }}>{item.status}</span>
            <button onClick={onClose} style={{ border: "none", background: "transparent", cursor: "pointer", padding: "4px", color: "var(--text-muted)", display: "flex" }}><X size={18} /></button>
          </div>
        </div>

        {/* Scroll body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 22px" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-muted)" }}>
              <RefreshCw size={20} className="spin" style={{ opacity: 0.4 }} />
            </div>
          ) : (
            <>
              {/* Platform Preview */}
              <div style={{ marginBottom: "22px" }}>
                <div style={{ fontSize: "0.65rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "12px" }}>
                  Preview — {(item.platform || "post").charAt(0).toUpperCase() + (item.platform || "post").slice(1)}
                </div>
                <PlatformPreview
                  platform={item.platform}
                  caption={caption}
                  brandName={brandName}
                  hasMedia={hasMedia || item.has_media}
                />
              </div>

              {/* Reschedule */}
              {item.status === "scheduled" && (
                <div style={{ marginBottom: "20px", background: "var(--surface-secondary)", borderRadius: "10px", padding: "14px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: rescheduleMode ? "12px" : 0 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "0.8rem" }}>Scheduled for</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                        {new Date(item.date).toLocaleDateString("en-US", { weekday:"long", month:"long", day:"numeric" })} at {fmtTime(item.date)}
                      </div>
                    </div>
                    <button onClick={() => setRescheduleMode(m => !m)} style={{ padding: "6px 12px", border: "1px solid var(--border-subtle)", borderRadius: "6px", background: "var(--surface-primary)", fontSize: "0.75rem", fontWeight: 800, cursor: "pointer", color: "var(--text-main)" }}>
                      {rescheduleMode ? "Cancel" : "Reschedule"}
                    </button>
                  </div>
                  {rescheduleMode && (
                    <div>
                      <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
                        <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} style={{ flex: 1, padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--border-subtle)", background: "var(--surface-primary)", fontSize: "0.82rem", color: "var(--text-main)" }} />
                        <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} style={{ width: "100px", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--border-subtle)", background: "var(--surface-primary)", fontSize: "0.82rem", color: "var(--text-main)" }} />
                      </div>
                      {error && <div style={{ fontSize: "0.75rem", color: "#ef4444", marginBottom: "8px" }}>{error}</div>}
                      {rescheduled && <div style={{ fontSize: "0.75rem", color: "#22c55e", marginBottom: "8px", display: "flex", alignItems: "center", gap: "4px" }}><Check size={12} /> Rescheduled successfully</div>}
                      <button onClick={handleReschedule} disabled={rescheduling} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "none", background: "#3b82f6", color: "#fff", fontWeight: 800, fontSize: "0.82rem", cursor: "pointer" }}>
                        {rescheduling ? "Rescheduling…" : "Confirm Reschedule"}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Caption */}
              {caption && (
                <div style={{ marginBottom: "20px" }}>
                  <div style={{ fontSize: "0.65rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>Caption</div>
                  <div style={{ fontSize: "0.85rem", lineHeight: "1.6", color: "var(--text-main)", background: "var(--surface-secondary)", padding: "12px 14px", borderRadius: "8px", whiteSpace: "pre-wrap" }}>
                    {caption}
                  </div>
                </div>
              )}

              {/* Delivery jobs */}
              {detail?.data?.delivery_jobs?.length > 0 && (
                <div style={{ marginBottom: "20px" }}>
                  <div style={{ fontSize: "0.65rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>Publish History</div>
                  {detail.data.delivery_jobs.map((job, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "var(--surface-secondary)", borderRadius: "6px", marginBottom: "6px", fontSize: "0.78rem" }}>
                      <span style={{ fontWeight: 700 }}>{PLATFORM_ICON[job.platform]} {job.platform}</span>
                      <span style={{ color: "var(--text-muted)" }}>{job.scheduled_at ? new Date(job.scheduled_at).toLocaleDateString() : "—"}</span>
                      <span style={{ color: STATUS_COLOR[job.status] || "#94a3b8", fontWeight: 700, textTransform: "uppercase", fontSize: "0.65rem" }}>{job.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer actions */}
        <div style={{ padding: "14px 22px", borderTop: "1px solid var(--border-subtle)", display: "flex", gap: "8px" }}>
          <button onClick={() => onEdit?.(item)} style={{ flex: 1, padding: "10px", border: "1px solid var(--border-subtle)", borderRadius: "8px", background: "var(--surface-secondary)", fontSize: "0.8rem", fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", color: "var(--text-main)" }}>
            <Edit2 size={13} /> Edit
          </button>
          <button onClick={() => onDuplicate?.(item)} style={{ flex: 1, padding: "10px", border: "1px solid var(--border-subtle)", borderRadius: "8px", background: "var(--surface-secondary)", fontSize: "0.8rem", fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", color: "var(--text-main)" }}>
            <Copy size={13} /> Duplicate
          </button>
        </div>
      </div>

      <style>{`
        @keyframes drawerIn { from { transform: translateX(40px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}

// ─── Day Stack Modal ───────────────────────────────────────────────────────────
function DayStackModal({ date, items, holidays, onSelect, onClose }) {
  const [selectedItem, setSelectedItem] = useState(items[0] || null);
  if (!date) return null;

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.25)", zIndex: 400 }} />
      <div style={{
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
        width: "800px", maxWidth: "95vw", maxHeight: "80vh",
        background: "var(--surface-primary)", borderRadius: "16px", boxShadow: "0 24px 60px rgba(0,0,0,0.15)",
        zIndex: 401, display: "flex", flexDirection: "column", overflow: "hidden",
        animation: "fadeUp 0.2s ease-out",
      }}>
        {/* Header */}
        <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: "1rem" }}>{date.toLocaleDateString("en-US", { weekday:"long", month:"long", day:"numeric" })}</div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>{items.length} posts</div>
          </div>
          <button onClick={onClose} style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--text-muted)", display: "flex" }}><X size={18} /></button>
        </div>

        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {/* Left: post list */}
          <div style={{ width: "280px", borderRight: "1px solid var(--border-subtle)", overflowY: "auto", padding: "12px" }}>
            {holidays.map(h => (
              <div key={h.name} style={{ background: h.color + "12", border: `1px solid ${h.color}25`, borderRadius: "8px", padding: "8px 12px", marginBottom: "8px" }}>
                <div style={{ fontWeight: 800, color: h.color, fontSize: "0.8rem" }}>🎉 {h.name}</div>
              </div>
            ))}
            {items.map(item => {
              const color = STATUS_COLOR[item.status] || "#94a3b8";
              const isSelected = selectedItem?.id === item.id;
              return (
                <div key={item.id} onClick={() => setSelectedItem(item)} style={{
                  padding: "10px 12px", borderRadius: "8px", marginBottom: "6px", cursor: "pointer",
                  background: isSelected ? "#eff6ff" : "var(--surface-secondary)",
                  border: isSelected ? "1px solid #bfdbfe" : "1px solid transparent",
                  transition: "all 0.15s",
                }}>
                  <div style={{ fontWeight: 700, fontSize: "0.82rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title || "Untitled"}</div>
                  <div style={{ display: "flex", gap: "6px", alignItems: "center", marginTop: "4px" }}>
                    <span style={{ fontSize: "0.65rem", fontWeight: 800, background: color + "18", color, padding: "1px 6px", borderRadius: "3px" }}>{item.status}</span>
                    <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>{PLATFORM_ICON[item.platform]} {fmtTime(item.date)}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right: preview */}
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 22px" }}>
            {selectedItem ? (
              <>
                <PlatformPreview
                  platform={selectedItem.platform}
                  caption={selectedItem.caption || selectedItem.title || ""}
                  brandName=""
                  hasMedia={selectedItem.has_media}
                />
                <div style={{ marginTop: "16px", display: "flex", gap: "8px" }}>
                  <button onClick={() => { onSelect(selectedItem); onClose(); }} style={{ flex: 1, padding: "10px", border: "none", borderRadius: "8px", background: "#3b82f6", color: "#fff", fontWeight: 800, fontSize: "0.82rem", cursor: "pointer" }}>
                    Open in Drawer
                  </button>
                </div>
              </>
            ) : (
              <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)" }}>Select a post to preview</div>
            )}
          </div>
        </div>
      </div>
      <style>{`@keyframes fadeUp { from { transform: translate(-50%,-48%); opacity: 0; } to { transform: translate(-50%,-50%); opacity: 1; } }`}</style>
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
const VIEWS = [
  { id: "month",  label: "Month",  icon: <LayoutGrid size={13} /> },
  { id: "week",   label: "Week",   icon: <Calendar size={13} /> },
  { id: "day",    label: "Day",    icon: <Clock size={13} /> },
  { id: "agenda", label: "Agenda", icon: <List size={13} /> },
];

const CalendarSchedule = ({ activeBrand, onScheduleNew }) => {
  const { token } = useAuth();
  const [view, setView]             = useState("month");
  const [pivot, setPivot]           = useState(() => { const d = new Date(); d.setHours(0,0,0,0); return d; });
  const [items, setItems]           = useState([]);
  const [loading, setLoading]       = useState(false);
  const [drawerItem, setDrawerItem] = useState(null);
  const [drawerDetail, setDrawerDetail] = useState(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [stackDay, setStackDay]     = useState(null);
  const [stackItems, setStackItems] = useState([]);
  const [stackHolidays, setStackHolidays] = useState([]);
  const [dragItem, setDragItem]     = useState(null);
  const [conflictMsg, setConflictMsg] = useState(null);
  const [selectedHoliday, setSelectedHoliday] = useState(null);
  const [bestTimeData, setBestTimeData] = useState(null);
  const [clashData, setClashData] = useState(null);

  useEffect(() => {
    if (activeBrand?.id) {
      apiRequest("/api/customer/best-time")
        .then(res => setBestTimeData(res))
        .catch(() => {});
    }
  }, [activeBrand?.id]);

  const [selectedCountry, setSelectedCountry] = useState(activeBrand?.country || activeBrand?.country_code || "US");

  useEffect(() => {
    if (activeBrand) {
      setSelectedCountry(activeBrand.country || activeBrand.country_code || "US");
    }
  }, [activeBrand]);

  const brandName   = activeBrand?.name || "Your Brand";

  const range = useMemo(() => rangeForView(view, pivot), [view, pivot]);

  const fetchFrom = useMemo(() => {
    if (view === "month") {
      const y = pivot.getFullYear(), m = pivot.getMonth();
      return { from: new Date(y, m-1, 1), to: new Date(y, m+2, 0) };
    }
    return range;
  }, [view, pivot, range]);

  const holidays = useMemo(() => getHolidaysInRange(fetchFrom.from, fetchFrom.to, selectedCountry), [fetchFrom.from, fetchFrom.to, selectedCountry]);

  const fetchItems = useCallback(async () => {
    if (!token || !activeBrand?.id) return;
    setLoading(true);
    try {
      const from = encodeURIComponent(fetchFrom.from.toISOString());
      const to   = encodeURIComponent(fetchFrom.to.toISOString());
      const data = await apiRequest(`/api/customer/calendar?from=${from}&to=${to}`);
      setItems(data.items || []);
    } catch (e) {
      console.error("Scheduler fetch failed", e);
    } finally {
      setLoading(false);
    }
  }, [token, activeBrand?.id, fetchFrom.from, fetchFrom.to]);

  useEffect(() => {
    fetchItems();
    track("scheduler_opened", { view });
  }, [fetchItems]);

  // Open drawer + lazy-load detail
  const openDrawer = useCallback(async (item) => {
    setDrawerItem(item);
    setDrawerDetail(null);
    setDrawerLoading(true);
    track("scheduler_post_opened", { item_id: item.id, platform: item.platform });
    try {
      const detail = await apiRequest(`/api/customer/vault/${item.content_id}`);
      setDrawerDetail(detail);
    } catch (_) {}
    finally { setDrawerLoading(false); }
  }, []);

  // Drag & drop reschedule
  const handleDropCell = useCallback(async (droppedItem, targetDate) => {
    if (droppedItem.status !== "scheduled") return;
    setDragItem(null);
    const orig = new Date(droppedItem.date);
    const newDt = new Date(targetDate);
    newDt.setHours(orig.getHours(), orig.getMinutes(), 0, 0);

    // Check for clash
    const clash = items.find(item => {
      if (item.id === droppedItem.id) return false;
      const itemDt = new Date(item.date);
      return itemDt.toDateString() === newDt.toDateString() &&
             itemDt.getHours() === newDt.getHours() &&
             itemDt.getMinutes() === newDt.getMinutes();
    });

    if (clash) {
      const hours = String(orig.getHours()).padStart(2, '0');
      const minutes = String(orig.getMinutes()).padStart(2, '0');
      setClashData({
        item: droppedItem,
        targetDate,
        proposedTime: `${hours}:${minutes}`
      });
      return;
    }

    try {
      await apiRequest(`/api/customer/schedule/${droppedItem.id}`, {
        method: "PUT",
        body: JSON.stringify({ scheduled_at: newDt.toISOString() }),
      });
      await fetchItems();
      track("scheduler_rescheduled", { item_id: droppedItem.id, drag: true });
    } catch (e) {
      const msg = e.message || "Failed to reschedule";
      setConflictMsg(msg.includes("409") || msg.toLowerCase().includes("conflict")
        ? "This time is already occupied by another post."
        : msg
      );
      setTimeout(() => setConflictMsg(null), 4000);
    }
  }, [items, fetchItems]);

  const handleReschedule = useCallback(async (jobId, newIso) => {
    await apiRequest(`/api/customer/schedule/${jobId}`, {
      method: "PUT",
      body: JSON.stringify({ scheduled_at: newIso }),
    });
    await fetchItems();
  }, [fetchItems]);

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
      const ws = weekStart(pivot), we = addDays(ws, 6);
      return `${ws.toLocaleDateString("en-US", { month:"short", day:"numeric" })} – ${we.toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" })}`;
    }
    return pivot.toLocaleDateString("en-US", { weekday:"long", month:"long", day:"numeric", year:"numeric" });
  }, [view, pivot]);

  const counts = useMemo(() => ({
    scheduled: items.filter(i => i.status === "scheduled").length,
    published:  items.filter(i => i.status === "published").length,
  }), [items]);

  const upcomingHolidays = useMemo(() => getHolidaysInRange(new Date(), addDays(new Date(), 14), selectedCountry).slice(0, 4), [selectedCountry]);

  return (
    <>
      {/* ── Header ── */}
      <div style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
          <div>
            <h2 style={{ fontWeight: 900, fontSize: "1.5rem", margin: 0, color: "var(--text-main)", letterSpacing: "-0.02em" }}>Scheduler</h2>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "3px", fontWeight: 600 }}>
              {counts.scheduled} scheduled · {counts.published} published
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button onClick={fetchItems} style={{ padding: "8px", border: "1px solid var(--border-subtle)", borderRadius: "8px", background: "var(--surface-secondary)", cursor: "pointer", color: "var(--text-muted)", display: "flex" }}>
              <RefreshCw size={14} className={loading ? "spin" : ""} />
            </button>
            <button onClick={() => onScheduleNew?.()} style={{
              display: "flex", alignItems: "center", gap: "6px", padding: "9px 18px",
              borderRadius: "8px", background: "#3b82f6", color: "#fff",
              fontWeight: 800, fontSize: "0.82rem", border: "none", cursor: "pointer",
            }}
              onMouseEnter={e => e.currentTarget.style.background = "#2563eb"}
              onMouseLeave={e => e.currentTarget.style.background = "#3b82f6"}
            >
              <Plus size={14} /> Schedule
            </button>
          </div>
        </div>

        {/* Nav bar */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "16px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", background: "var(--surface-secondary)", border: "1px solid var(--border-subtle)", borderRadius: "8px", padding: "2px" }}>
            <button onClick={() => navigate(-1)} style={{ border: "none", background: "transparent", cursor: "pointer", padding: "6px 8px", borderRadius: "6px", color: "var(--text-muted)", display: "flex" }}>
              <ChevronLeft size={15} />
            </button>
            <span style={{ padding: "4px 10px", fontSize: "0.78rem", fontWeight: 800, color: "var(--text-main)", minWidth: "150px", textAlign: "center" }}>{pivotLabel}</span>
            <button onClick={() => navigate(1)} style={{ border: "none", background: "transparent", cursor: "pointer", padding: "6px 8px", borderRadius: "6px", color: "var(--text-muted)", display: "flex" }}>
              <ChevronRight size={15} />
            </button>
          </div>
          <button onClick={goToday} style={{ padding: "7px 14px", border: "1px solid var(--border-subtle)", borderRadius: "8px", background: "var(--surface-secondary)", fontSize: "0.75rem", fontWeight: 800, color: "var(--text-muted)", cursor: "pointer" }}>
            Today
          </button>
          <select 
            value={selectedCountry} 
            onChange={(e) => setSelectedCountry(e.target.value)}
            style={{
              padding: "7px 14px",
              border: "1px solid var(--border-subtle)",
              borderRadius: "8px",
              background: "var(--surface-secondary)",
              fontSize: "0.75rem",
              fontWeight: 800,
              color: "var(--text-muted)",
              cursor: "pointer",
              outline: "none"
            }}
          >
            {Object.entries(COUNTRY_NAMES)
              .filter(([code]) => COUNTRY_HOLIDAYS[code] && COUNTRY_HOLIDAYS[code].length > 0)
              .map(([code, info]) => (
                <option key={code} value={code}>
                  {info.flag} {info.name}
                </option>
              ))
            }
          </select>
          <div style={{ marginLeft: "auto", display: "flex", background: "var(--surface-secondary)", border: "1px solid var(--border-subtle)", borderRadius: "8px", padding: "2px", gap: "2px" }}>
            {VIEWS.map(v => (
              <button key={v.id} onClick={() => setView(v.id)} style={{
                display: "flex", alignItems: "center", gap: "5px", padding: "5px 12px",
                borderRadius: "6px", border: "none",
                background: view === v.id ? "var(--surface-primary)" : "transparent",
                color: view === v.id ? "var(--text-main)" : "var(--text-muted)",
                fontWeight: 700, fontSize: "0.75rem", cursor: "pointer",
                boxShadow: view === v.id ? "0 1px 4px rgba(0,0,0,0.06)" : "none",
              }}>
                {v.icon} {v.label}
              </button>
            ))}
          </div>
        </div>

        {/* Upcoming holidays strip */}
        {upcomingHolidays.length > 0 && (
          <div style={{ display: "flex", gap: "6px", marginTop: "12px", flexWrap: "wrap" }}>
            {upcomingHolidays.map(h => {
              const days = Math.ceil((new Date(h.date) - new Date()) / 86400000);
              return (
                <div
                  key={h.date + h.name}
                  onClick={() => setSelectedHoliday?.(h)}
                  style={{
                    display: "flex", alignItems: "center", gap: "5px", padding: "4px 10px",
                    background: h.color + "12", border: `1px solid ${h.color}30`,
                    borderRadius: "6px", fontSize: "0.7rem", fontWeight: 700, color: h.color,
                    cursor: "pointer"
                  }}
                  title={`Click to view ideas for ${h.name}`}
                >
                  <Zap size={10} /> {h.name} <span style={{ opacity: 0.7 }}>· {days}d ↗</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Best time advisory banner */}
        {bestTimeData && (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            background: "linear-gradient(135deg, #eff6ff, #f0fdf4)",
            border: "1px solid #dbeafe",
            borderRadius: "10px",
            padding: "10px 14px",
            marginTop: "12px",
            fontSize: "0.8rem",
            color: "#1e3a8a",
            fontWeight: 500,
            boxShadow: "0 1px 2px rgba(0,0,0,0.02)"
          }}>
            <span style={{ fontSize: "1.1rem" }}>💡</span>
            <div>
              <strong>Best Time to Post:</strong> {bestTimeData.proposedTime} on {bestTimeData.bestDays.slice(0, 2).join(" & ")}. {bestTimeData.explanation}
            </div>
          </div>
        )}
      </div>

      {/* ── Legend ── */}
      <div style={{ display: "flex", gap: "16px", marginBottom: "14px" }}>
        {[["#3b82f6","Scheduled"],["#22c55e","Published"],["#94a3b8","Failed"]].map(([c,l]) => (
          <div key={l} style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "0.65rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: c }} /> {l}
          </div>
        ))}
        {dragItem && (
          <div style={{ marginLeft: "auto", fontSize: "0.72rem", fontWeight: 700, color: "#3b82f6" }}>
            Drop on a day to reschedule
          </div>
        )}
      </div>

      {/* ── Conflict Toast ── */}
      {conflictMsg && (
        <div style={{ marginBottom: "12px", padding: "10px 16px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", display: "flex", alignItems: "center", gap: "8px", fontSize: "0.8rem", fontWeight: 700, color: "#b91c1c" }}>
          <AlertCircle size={14} /> {conflictMsg}
        </div>
      )}

      {/* ── Calendar Body ── */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "100px 0", color: "var(--text-muted)" }}>
          <RefreshCw size={24} style={{ opacity: 0.3 }} className="spin" />
          <div style={{ marginTop: "12px", fontSize: "0.85rem", fontWeight: 700 }}>Loading…</div>
        </div>
      ) : (
        <>
          {view === "month" && (
            <MonthGrid
              pivot={pivot} items={items} holidays={holidays}
              onSelect={openDrawer}
              onDayStack={(date, dayItems, dayHolidays) => {
                setStackDay(date); setStackItems(dayItems); setStackHolidays(dayHolidays || []);
                track("scheduler_day_expanded");
              }}
              dragItem={dragItem}
              onDropCell={handleDropCell}
              onDragStart={setDragItem}
              onDragEnd={() => setDragItem(null)}
              setSelectedHoliday={setSelectedHoliday}
            />
          )}
          {view === "week" && (
            <WeekGrid
              pivot={pivot} items={items} holidays={holidays}
              onSelect={openDrawer}
              onSlotClick={onScheduleNew}
              dragItem={dragItem}
              onDropCell={handleDropCell}
              onDragStart={setDragItem}
              onDragEnd={() => setDragItem(null)}
              setSelectedHoliday={setSelectedHoliday}
            />
          )}
          {view === "day" && (
            <DayView pivot={pivot} items={items} holidays={holidays} onSelect={openDrawer} />
          )}
          {view === "agenda" && (
            <AgendaView items={items} holidays={holidays} onSelect={openDrawer} />
          )}

          {/* Month empty state */}
          {!loading && items.length === 0 && (
            <div style={{ textAlign: "center", padding: "80px 0" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>📅</div>
              <div style={{ fontWeight: 800, fontSize: "1rem", color: "var(--text-main)", marginBottom: "6px" }}>Nothing scheduled yet.</div>
              <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "20px" }}>Schedule approved content to see it here.</div>
              <button onClick={() => onScheduleNew?.()} style={{ padding: "10px 22px", borderRadius: "8px", background: "#3b82f6", color: "#fff", fontWeight: 800, fontSize: "0.85rem", border: "none", cursor: "pointer" }}>
                Schedule your first post
              </button>
            </div>
          )}
        </>
      )}

      {/* ── Drawer ── */}
      {drawerItem && (
        <SchedulerDrawer
          item={drawerItem}
          detail={drawerDetail}
          loading={drawerLoading}
          brandName={brandName}
          onClose={() => setDrawerItem(null)}
          onReschedule={handleReschedule}
          onEdit={(item) => { setDrawerItem(null); onScheduleNew?.(item); }}
          onDuplicate={() => setDrawerItem(null)}
        />
      )}

      {/* ── Day Stack Modal ── */}
      {stackDay && (
        <DayStackModal
          date={stackDay}
          items={stackItems}
          holidays={stackHolidays}
          onSelect={openDrawer}
          onClose={() => { setStackDay(null); setStackItems([]); setStackHolidays([]); }}
        />
      )}

      {/* ── Holiday Ideas Modal ── */}
      {selectedHoliday && (
        <HolidayIdeasModal
          holiday={selectedHoliday}
          onClose={() => setSelectedHoliday(null)}
          onScheduleNew={onScheduleNew}
        />
      )}

      {/* ── Reschedule Conflict Modal ── */}
      {clashData && (
        <ScheduleConflictModal
          clashData={clashData}
          onClose={() => setClashData(null)}
          onReschedule={handleReschedule}
          bestTime={bestTimeData?.proposedTime}
        />
      )}

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
};

// ─── Holiday Content Ideas Modal ──────────────────────────────────────────────
function HolidayIdeasModal({ holiday, onClose, onScheduleNew }) {
  const ideas = HOLIDAY_IDEAS[holiday.name] || [
    `Share how your brand connects with ${holiday.name}.`,
    `Provide tips or special content for ${holiday.name}.`,
    `Engage your community with a thematic poll or contest.`
  ];

  const handleCreatePost = () => {
    onClose();
    window.dispatchEvent(new CustomEvent('open-assistant', {
      detail: {
        additionalContext: `Write a social post celebrating ${holiday.name} on ${new Date(holiday.date).toLocaleDateString("en-US", { month: "long", day: "numeric" })} and sharing how our brand connects to this day.`
      }
    }));
  };

  return (
    <div className="modal fade show d-block" role="dialog" aria-modal="true" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1100 }}>
      <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '480px' }}>
        <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '16px', overflow: 'hidden' }}>
          
          <div className="modal-header border-bottom px-4 py-3" style={{ borderLeft: `5px solid ${holiday.color}` }}>
            <h5 className="modal-title fw-bold" style={{ color: 'var(--text-main)' }}>
              🎉 {holiday.name} Content Ideas
            </h5>
            <button type="button" className="btn-close" onClick={onClose} aria-label="Close"></button>
          </div>

          <div className="modal-body p-4">
            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: 16, fontWeight: 700 }}>
              DATE: {new Date(holiday.date).toLocaleDateString("en-US", { month: "long", day: "numeric", weekday: "long" })}
            </div>

            <div style={{ background: holiday.color + "08", border: `1px dashed ${holiday.color}40`, borderRadius: 12, padding: 16, marginBottom: 20 }}>
              <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-main)", display: "block", marginBottom: 10 }}>
                💡 Brand Content Ideas:
              </span>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: "0.82rem", color: "var(--text-main)", lineHeight: 1.6 }}>
                {ideas.map((idea, idx) => (
                  <li key={idx} style={{ marginBottom: 8 }}>{idea}</li>
                ))}
              </ul>
            </div>

            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", lineHeight: 1.4 }}>
              Clicking "Create Post with AI" will launch the myPilotPost Assistant pre-filled with this holiday prompt to build your content instantly.
            </div>
          </div>

          <div className="modal-footer border-top px-4 py-3 d-flex gap-2 justify-content-end bg-light">
            <button className="btn btn-secondary px-3 py-2" onClick={onClose} style={{ fontSize: '0.85rem', fontWeight: 600 }}>
              Close
            </button>
            <button
              className="btn btn-primary px-4 py-2"
              onClick={handleCreatePost}
              style={{ fontSize: '0.85rem', fontWeight: 700, background: holiday.color, borderColor: holiday.color }}
            >
              Create Post with AI →
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

// ─── Reschedule Conflict Modal ────────────────────────────────────────────────
function ScheduleConflictModal({ clashData, onClose, onReschedule, bestTime }) {
  const { item, targetDate, proposedTime } = clashData;
  const [selectedTime, setSelectedTime] = useState(proposedTime);

  const handleSave = () => {
    const [h, m] = selectedTime.split(":");
    const finalDt = new Date(targetDate);
    finalDt.setHours(parseInt(h), parseInt(m), 0, 0);
    onReschedule(item.id, finalDt.toISOString());
    onClose();
  };

  return (
    <div className="modal fade show d-block" role="dialog" aria-modal="true" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1100 }}>
      <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '420px' }}>
        <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '16px', overflow: 'hidden' }}>
          
          <div className="modal-header border-bottom px-4 py-3">
            <h5 className="modal-title fw-bold text-warning">
              ⚠️ Scheduling Conflict
            </h5>
            <button type="button" className="btn-close" onClick={onClose} aria-label="Close"></button>
          </div>

          <div className="modal-body p-4">
            <div style={{ fontSize: "0.85rem", color: "var(--text-main)", marginBottom: 16, lineHeight: 1.5 }}>
              There is already a post scheduled at <strong>{proposedTime}</strong> on <strong>{targetDate.toLocaleDateString("en-GB", { day: 'numeric', month: 'short' })}</strong>.
            </div>

            <div style={{ background: "var(--bg-body)", border: "1px solid var(--border-subtle)", borderRadius: 12, padding: 16, marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: 10 }}>
                CHOOSE A NEW SLOT:
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input
                  type="time"
                  className="form-control form-control-sm border-subtle"
                  style={{ fontSize: 13, padding: "6px 10px", borderRadius: 8, width: 120, background: "#fff", border: '1px solid var(--border-subtle)' }}
                  value={selectedTime}
                  onChange={e => setSelectedTime(e.target.value)}
                />
                {bestTime && (
                  <button
                    onClick={() => setSelectedTime(bestTime)}
                    style={{
                      background: "linear-gradient(135deg, #eff6ff, #f0fdf4)",
                      border: "1px solid #bfdbfe", borderRadius: 8, padding: "6px 12px",
                      fontSize: "0.75rem", fontWeight: 700, color: "#1e3a8a", cursor: "pointer", transition: 'all 0.15s'
                    }}
                  >
                    💡 Use Best Time ({bestTime})
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="modal-footer border-top px-4 py-3 d-flex gap-2 justify-content-end bg-light">
            <button className="btn btn-secondary px-3 py-2" onClick={onClose} style={{ fontSize: '0.85rem', fontWeight: 600 }}>
              Cancel
            </button>
            <button
              className="btn btn-primary px-4 py-2"
              onClick={handleSave}
              style={{ fontSize: '0.85rem', fontWeight: 700 }}
            >
              Reschedule
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

export default CalendarSchedule;
