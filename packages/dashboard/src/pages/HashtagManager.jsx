import React, { useState, useCallback } from "react";
import {
  Plus, Search, Star, Trash2, Copy, Tag, Hash,
  Edit2, Check, X, ChevronRight, Pin
} from "lucide-react";

const STORAGE_KEY = "mpp_hashtag_collections";
const CATEGORIES  = ["General", "Business", "Marketing", "Lifestyle", "Campaign", "Seasonal", "Product", "Events"];
const PLATFORMS   = ["All Platforms", "Instagram", "TikTok", "LinkedIn", "Facebook", "X", "Pinterest", "YouTube"];

function uid() {
  return `hc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function loadCollections() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveCollections(collections) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(collections));
}

/* ── Collection Card ── */
const CollectionCard = ({ collection, onEdit, onDelete, onPin, onCopy, onSelect, isSelected }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e) => {
    e.stopPropagation();
    const text = collection.tags.join(" ");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
    onCopy?.(collection);
  };

  return (
    <div
      className={`hashtag-card${isSelected ? " hashtag-card--selected" : ""}`}
      onClick={() => onSelect(collection)}
    >
      <div className="hashtag-card-header">
        <div className="hashtag-card-title">
          <div className="hashtag-card-icon">
            <Hash size={14} />
          </div>
          <div>
            <div className="hashtag-card-name">{collection.name}</div>
            <div className="hashtag-card-meta">
              <span className="hashtag-category-badge">{collection.category}</span>
              {collection.platform !== "All Platforms" && (
                <span className="hashtag-platform-badge">{collection.platform}</span>
              )}
            </div>
          </div>
        </div>
        <div className="hashtag-card-actions">
          <button
            className={`hashtag-action-btn${collection.pinned ? " hashtag-action-btn--active" : ""}`}
            onClick={e => { e.stopPropagation(); onPin(collection.id); }}
            title={collection.pinned ? "Unpin" : "Pin"}
          >
            <Pin size={13} />
          </button>
          <button
            className={`hashtag-action-btn${copied ? " hashtag-action-btn--active" : ""}`}
            onClick={handleCopy}
            title="Copy all tags"
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
          </button>
          <button className="hashtag-action-btn" onClick={e => { e.stopPropagation(); onEdit(collection); }} title="Edit">
            <Edit2 size={13} />
          </button>
          <button className="hashtag-action-btn hashtag-action-btn--danger" onClick={e => { e.stopPropagation(); onDelete(collection.id); }} title="Delete">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <div className="hashtag-tags-preview">
        {collection.tags.slice(0, 12).map(tag => (
          <span key={tag} className="hashtag-tag">{tag}</span>
        ))}
        {collection.tags.length > 12 && (
          <span className="hashtag-tag hashtag-tag--more">+{collection.tags.length - 12} more</span>
        )}
      </div>

      <div className="hashtag-card-footer">
        <span className="hashtag-count-label">{collection.tags.length} tag{collection.tags.length !== 1 ? "s" : ""}</span>
        {collection.campaign && (
          <span className="hashtag-campaign-badge">
            <ChevronRight size={10} /> {collection.campaign}
          </span>
        )}
      </div>
    </div>
  );
};

/* ── Editor Modal ── */
const CollectionEditor = ({ collection, onSave, onClose }) => {
  const [name, setName]         = useState(collection?.name || "");
  const [category, setCategory] = useState(collection?.category || "General");
  const [platform, setPlatform] = useState(collection?.platform || "All Platforms");
  const [campaign, setCampaign] = useState(collection?.campaign || "");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags]         = useState(collection?.tags || []);
  const [error, setError]       = useState("");

  const addTag = (raw) => {
    const cleaned = (raw.startsWith("#") ? raw : `#${raw}`)
      .replace(/[^\w#]/g, "")
      .toLowerCase();
    if (!cleaned || cleaned === "#") return;
    if (!tags.includes(cleaned)) {
      setTags(prev => [...prev, cleaned]);
    }
    setTagInput("");
  };

  const handleTagKeyDown = (e) => {
    if (["Enter", ",", " ", "Tab"].includes(e.key)) {
      e.preventDefault();
      addTag(tagInput.trim());
    }
    if (e.key === "Backspace" && !tagInput && tags.length) {
      setTags(prev => prev.slice(0, -1));
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text");
    const pasted = text.split(/[\s,]+/).filter(Boolean);
    const newTags = pasted
      .map(t => (t.startsWith("#") ? t : `#${t}`).replace(/[^\w#]/g, "").toLowerCase())
      .filter(t => t.length > 1 && !tags.includes(t));
    setTags(prev => [...prev, ...newTags]);
  };

  const handleSave = () => {
    if (!name.trim()) { setError("Collection name is required."); return; }
    if (tags.length === 0) { setError("Add at least one hashtag."); return; }
    onSave({
      ...(collection || {}),
      id: collection?.id || uid(),
      name: name.trim(),
      category,
      platform,
      campaign: campaign.trim(),
      tags,
      pinned: collection?.pinned || false,
      createdAt: collection?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <div className="hashtag-modal-overlay" onClick={onClose}>
      <div className="hashtag-modal" onClick={e => e.stopPropagation()}>
        <div className="hashtag-modal-header">
          <h2 className="hashtag-modal-title">
            {collection?.id ? "Edit Collection" : "New Hashtag Collection"}
          </h2>
          <button className="hashtag-modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        {error && (
          <div className="hashtag-error-banner">{error}</div>
        )}

        <div className="hashtag-modal-body">
          <div className="hashtag-form-group">
            <label className="hashtag-form-label">Collection Name *</label>
            <input
              className="hashtag-input"
              placeholder="e.g. Summer Campaign 2025"
              value={name}
              onChange={e => { setName(e.target.value); setError(""); }}
              autoFocus
            />
          </div>

          <div className="hashtag-form-row">
            <div className="hashtag-form-group">
              <label className="hashtag-form-label">Category</label>
              <select className="hashtag-input" value={category} onChange={e => setCategory(e.target.value)}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="hashtag-form-group">
              <label className="hashtag-form-label">Platform</label>
              <select className="hashtag-input" value={platform} onChange={e => setPlatform(e.target.value)}>
                {PLATFORMS.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <div className="hashtag-form-group">
            <label className="hashtag-form-label">Campaign (optional)</label>
            <input
              className="hashtag-input"
              placeholder="e.g. Product Launch Q3"
              value={campaign}
              onChange={e => setCampaign(e.target.value)}
            />
          </div>

          <div className="hashtag-form-group">
            <label className="hashtag-form-label">
              Hashtags ({tags.length}) *
              <span className="hashtag-form-hint">Press Enter, comma, or space to add</span>
            </label>
            <div className="hashtag-tags-input-wrapper" onClick={() => document.getElementById("hashtag-tag-input")?.focus()}>
              {tags.map(tag => (
                <span key={tag} className="hashtag-input-tag">
                  {tag}
                  <button className="hashtag-input-tag-remove" onClick={() => setTags(prev => prev.filter(t => t !== tag))}>
                    <X size={10} />
                  </button>
                </span>
              ))}
              <input
                id="hashtag-tag-input"
                className="hashtag-inline-input"
                placeholder={tags.length === 0 ? "#yourtag #brand #content" : "Add tag…"}
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                onBlur={() => { if (tagInput.trim()) addTag(tagInput.trim()); }}
                onPaste={handlePaste}
              />
            </div>
            <p className="hashtag-form-note">Paste multiple hashtags at once or type them one by one.</p>
          </div>
        </div>

        <div className="hashtag-modal-footer">
          <button className="hashtag-btn hashtag-btn--secondary" onClick={onClose}>Cancel</button>
          <button className="hashtag-btn hashtag-btn--primary" onClick={handleSave}>
            {collection?.id ? "Save Changes" : "Create Collection"}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── Main Component ── */
export default function HashtagManager({ onInsertTags }) {
  const [collections, setCollections]   = useState(loadCollections);
  const [search, setSearch]             = useState("");
  const [filterCat, setFilterCat]       = useState("All");
  const [filterPlatform, setFilterPlatform] = useState("All Platforms");
  const [showEditor, setShowEditor]     = useState(false);
  const [editingCollection, setEditingCollection] = useState(null);
  const [selectedId, setSelectedId]     = useState(null);
  const [insertMsg, setInsertMsg]       = useState("");

  const persist = useCallback((updated) => {
    setCollections(updated);
    saveCollections(updated);
  }, []);

  const handleSave = (col) => {
    setCollections(prev => {
      const existing = prev.find(c => c.id === col.id);
      const updated = existing
        ? prev.map(c => c.id === col.id ? col : c)
        : [col, ...prev];
      saveCollections(updated);
      return updated;
    });
    setShowEditor(false);
    setEditingCollection(null);
  };

  const handleDelete = (id) => {
    if (!window.confirm("Delete this hashtag collection?")) return;
    persist(collections.filter(c => c.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const handlePin = (id) => {
    persist(collections.map(c => c.id === id ? { ...c, pinned: !c.pinned } : c));
  };

  const handleCopy = (collection) => {
    setInsertMsg(`Copied ${collection.tags.length} tags from "${collection.name}"`);
    setTimeout(() => setInsertMsg(""), 2500);
  };

  const handleInsert = (collection) => {
    if (onInsertTags) {
      onInsertTags(collection.tags);
      setInsertMsg(`${collection.tags.length} tags inserted into composer`);
    } else {
      const text = collection.tags.join(" ");
      navigator.clipboard.writeText(text);
      setInsertMsg(`Copied ${collection.tags.length} tags to clipboard`);
    }
    setTimeout(() => setInsertMsg(""), 2500);
  };

  const openEditor = (collection = null) => {
    setEditingCollection(collection);
    setShowEditor(true);
  };

  const filtered = collections
    .filter(c => {
      const matchSearch   = search === "" || c.name.toLowerCase().includes(search.toLowerCase()) || c.tags.some(t => t.includes(search.toLowerCase()));
      const matchCat      = filterCat === "All" || c.category === filterCat;
      const matchPlatform = filterPlatform === "All Platforms" || c.platform === filterPlatform || c.platform === "All Platforms";
      return matchSearch && matchCat && matchPlatform;
    })
    .sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

  const selected = selectedId ? collections.find(c => c.id === selectedId) : null;

  return (
    <div id="tab-hashtags" className="animate__animated animate__fadeIn">

      {/* Header */}
      <div className="d-flex justify-content-between align-items-start mb-4 flex-wrap gap-3">
        <div>
          <h5 className="fw-bold mb-1">Hashtag Manager</h5>
          <p className="extra-small text-muted mb-0">
            Build reusable hashtag collections organized by campaign, platform, and category.
          </p>
        </div>
        <button className="btn-pilot btn-sm d-flex align-items-center gap-2" onClick={() => openEditor()}>
          <Plus size={14} /> New Collection
        </button>
      </div>

      {insertMsg && (
        <div className="hashtag-insert-toast">
          <Check size={14} /> {insertMsg}
        </div>
      )}

      {/* Filters */}
      <div className="card-workspace p-3 mb-3">
        <div className="d-flex flex-wrap gap-3 align-items-center">
          <div className="d-flex align-items-center gap-2 bg-light px-3 rounded-pill" style={{ flex: "1 1 200px" }}>
            <Search size={13} className="text-muted" />
            <input
              className="form-control form-control-sm border-0 bg-transparent py-1 px-0"
              placeholder="Search collections or tags…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="d-flex gap-2 flex-wrap">
            <select className="form-select form-select-sm" style={{ width: "auto" }} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
              <option value="All">All Categories</option>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
            <select className="form-select form-select-sm" style={{ width: "auto" }} value={filterPlatform} onChange={e => setFilterPlatform(e.target.value)}>
              {PLATFORMS.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <span className="extra-small text-muted">
            {filtered.length} collection{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Empty State */}
      {collections.length === 0 && (
        <div className="card-workspace p-5 text-center">
          <div className="mb-3" style={{ fontSize: 48 }}>🏷️</div>
          <h6 className="fw-bold">No hashtag collections yet</h6>
          <p className="text-muted small mb-4" style={{ maxWidth: 360, margin: "0 auto 20px" }}>
            Create your first collection to organize hashtags by campaign, platform, or content type.
            Reuse them across posts without retyping.
          </p>
          <button className="btn-pilot btn-sm d-flex align-items-center gap-2 mx-auto" onClick={() => openEditor()}>
            <Plus size={14} /> Create First Collection
          </button>
        </div>
      )}

      {/* Collections Grid */}
      {collections.length > 0 && filtered.length === 0 && (
        <div className="card-workspace p-4 text-center text-muted small">
          No collections match your search or filters.
        </div>
      )}

      {filtered.length > 0 && (
        <div className="hashtag-grid">
          {filtered.map(col => (
            <CollectionCard
              key={col.id}
              collection={col}
              onEdit={openEditor}
              onDelete={handleDelete}
              onPin={handlePin}
              onCopy={handleCopy}
              onSelect={c => setSelectedId(selectedId === c.id ? null : c.id)}
              isSelected={selectedId === col.id}
            />
          ))}
        </div>
      )}

      {/* Selected collection detail / insert panel */}
      {selected && (
        <div className="hashtag-detail-panel card-workspace p-4 mt-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h6 className="fw-bold mb-0">{selected.name}</h6>
              <span className="extra-small text-muted">{selected.tags.length} tags · {selected.category} · {selected.platform}</span>
            </div>
            <div className="d-flex gap-2">
              <button
                className="btn btn-sm btn-outline-primary fw-bold rounded-pill px-3"
                onClick={() => handleInsert(selected)}
              >
                <Tag size={12} className="me-1" />
                {onInsertTags ? "Insert into Post" : "Copy All Tags"}
              </button>
              <button className="btn btn-sm btn-light rounded-pill px-3 fw-bold" onClick={() => setSelectedId(null)}>
                <X size={12} />
              </button>
            </div>
          </div>
          <div className="hashtag-tags-preview">
            {selected.tags.map(tag => (
              <span key={tag} className="hashtag-tag hashtag-tag--lg">{tag}</span>
            ))}
          </div>
        </div>
      )}

      {/* Editor Modal */}
      {showEditor && (
        <CollectionEditor
          collection={editingCollection}
          onSave={handleSave}
          onClose={() => { setShowEditor(false); setEditingCollection(null); }}
        />
      )}

      <style>{`
        .hashtag-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 16px;
        }
        .hashtag-card {
          background: #fff;
          border: 1px solid var(--border-subtle, #e2e8f0);
          border-radius: 14px;
          padding: 18px 20px;
          cursor: pointer;
          transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s;
        }
        .hashtag-card:hover { border-color: #bfdbfe; box-shadow: 0 4px 16px rgba(37,99,235,0.08); transform: translateY(-1px); }
        .hashtag-card--selected { border-color: #2563EB !important; box-shadow: 0 0 0 3px rgba(37,99,235,0.12) !important; }
        .hashtag-card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; }
        .hashtag-card-title { display: flex; align-items: flex-start; gap: 10px; }
        .hashtag-card-icon { width: 34px; height: 34px; border-radius: 8px; background: #eff6ff; display: flex; align-items: center; justify-content: center; color: #2563EB; flex-shrink: 0; }
        .hashtag-card-name { font-size: 0.875rem; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
        .hashtag-card-meta { display: flex; gap: 6px; flex-wrap: wrap; }
        .hashtag-category-badge { font-size: 0.65rem; font-weight: 700; padding: 2px 7px; border-radius: 99px; background: #f1f5f9; color: #475569; }
        .hashtag-platform-badge { font-size: 0.65rem; font-weight: 700; padding: 2px 7px; border-radius: 99px; background: #eff6ff; color: #2563EB; }
        .hashtag-card-actions { display: flex; gap: 4px; }
        .hashtag-action-btn { width: 28px; height: 28px; border-radius: 8px; border: 1px solid #e2e8f0; background: #f8fafc; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #64748b; transition: background 0.12s, color 0.12s; }
        .hashtag-action-btn:hover { background: #e2e8f0; color: #0f172a; }
        .hashtag-action-btn--active { background: #dbeafe !important; color: #2563EB !important; border-color: #bfdbfe !important; }
        .hashtag-action-btn--danger:hover { background: #fee2e2 !important; color: #dc2626 !important; border-color: #fecaca !important; }
        .hashtag-tags-preview { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
        .hashtag-tag { font-size: 0.72rem; font-weight: 600; padding: 3px 8px; border-radius: 99px; background: #f0f9ff; color: #0369a1; border: 1px solid #bae6fd; }
        .hashtag-tag--more { background: #f1f5f9; color: #64748b; border-color: #e2e8f0; }
        .hashtag-tag--lg { font-size: 0.82rem; padding: 4px 10px; }
        .hashtag-card-footer { display: flex; justify-content: space-between; align-items: center; }
        .hashtag-count-label { font-size: 0.7rem; color: #94a3b8; font-weight: 600; }
        .hashtag-campaign-badge { font-size: 0.7rem; color: #7c3aed; font-weight: 600; display: flex; align-items: center; gap: 3px; background: #f5f3ff; padding: 2px 7px; border-radius: 99px; }
        .hashtag-detail-panel { border-top: 3px solid #2563EB; }
        .hashtag-insert-toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); background: #0f172a; color: white; padding: 10px 20px; border-radius: 99px; font-size: 0.82rem; font-weight: 600; display: flex; align-items: center; gap: 8px; z-index: 9999; box-shadow: 0 8px 24px rgba(0,0,0,0.2); animation: toastIn 0.3s ease; }
        @keyframes toastIn { from { opacity: 0; transform: translateX(-50%) translateY(10px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
        /* Modal */
        .hashtag-modal-overlay { position: fixed; inset: 0; background: rgba(15,23,42,0.6); backdrop-filter: blur(4px); z-index: 1050; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .hashtag-modal { background: #fff; border-radius: 20px; width: 100%; max-width: 580px; max-height: 90vh; display: flex; flex-direction: column; box-shadow: 0 25px 60px rgba(0,0,0,0.2); }
        .hashtag-modal-header { display: flex; justify-content: space-between; align-items: center; padding: 24px 28px 16px; border-bottom: 1px solid #e2e8f0; }
        .hashtag-modal-title { font-size: 1.1rem; font-weight: 800; color: #0f172a; margin: 0; }
        .hashtag-modal-close { width: 32px; height: 32px; border-radius: 8px; border: 1px solid #e2e8f0; background: #f8fafc; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #64748b; }
        .hashtag-error-banner { background: #fee2e2; color: #991b1b; padding: 10px 28px; font-size: 0.82rem; font-weight: 500; }
        .hashtag-modal-body { padding: 24px 28px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 20px; }
        .hashtag-modal-footer { padding: 16px 28px 24px; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 10px; }
        .hashtag-form-group { display: flex; flex-direction: column; gap: 6px; }
        .hashtag-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .hashtag-form-label { font-size: 0.82rem; font-weight: 700; color: #334155; display: flex; justify-content: space-between; align-items: center; }
        .hashtag-form-hint { font-size: 0.72rem; color: #94a3b8; font-weight: 400; }
        .hashtag-form-note { font-size: 0.72rem; color: #94a3b8; margin: 4px 0 0; }
        .hashtag-input { width: 100%; padding: 9px 12px; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 0.875rem; color: #0f172a; outline: none; transition: border-color 0.15s; background: #fff; }
        .hashtag-input:focus { border-color: #2563EB; box-shadow: 0 0 0 3px rgba(37,99,235,0.1); }
        .hashtag-tags-input-wrapper { display: flex; flex-wrap: wrap; gap: 6px; padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 10px; cursor: text; min-height: 80px; align-content: flex-start; transition: border-color 0.15s; }
        .hashtag-tags-input-wrapper:focus-within { border-color: #2563EB; box-shadow: 0 0 0 3px rgba(37,99,235,0.1); }
        .hashtag-input-tag { display: inline-flex; align-items: center; gap: 5px; font-size: 0.75rem; font-weight: 600; padding: 3px 8px; border-radius: 99px; background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
        .hashtag-input-tag-remove { background: none; border: none; cursor: pointer; color: #64748b; display: flex; align-items: center; padding: 0; }
        .hashtag-inline-input { border: none; outline: none; font-size: 0.82rem; color: #0f172a; min-width: 140px; flex: 1; background: transparent; }
        .hashtag-btn { padding: 10px 20px; border-radius: 10px; font-size: 0.875rem; font-weight: 600; cursor: pointer; border: none; transition: background 0.15s; }
        .hashtag-btn--primary { background: #2563EB; color: white; }
        .hashtag-btn--primary:hover { background: #1d4ed8; }
        .hashtag-btn--secondary { background: #f1f5f9; color: #475569; }
        .hashtag-btn--secondary:hover { background: #e2e8f0; }
      `}</style>
    </div>
  );
}
