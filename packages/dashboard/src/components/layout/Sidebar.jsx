import React from "react";

const NavLink = ({ tab, activeTab, switchTab, icon, label }) => (
  <button
    type="button"
    className={`nav-link${activeTab === tab ? ' active' : ''}`}
    onClick={() => switchTab(tab)}
    aria-current={activeTab === tab ? 'page' : undefined}
  >
    <i className={`${icon} icon-svg`} aria-hidden="true"></i>
    {label}
  </button>
);

const Sidebar = ({ activeTab, switchTab, brands, activeBrand, onSwitchBrand }) => {
  return (
    <aside className="sidebar" role="navigation" aria-label="Main navigation">
      <span className="nav-brand">
        <i className="fas fa-paper-plane icon-brand" aria-hidden="true"></i>
        myPilotPost
      </span>

      {/* Brand Switcher */}
      <div className="nav-group-title" id="brand-switcher-label">Brands</div>
      <div className="mb-3 px-2">
        <select
          className="input-pill bg-light border-subtle"
          value={activeBrand?.id || ''}
          onChange={(e) => onSwitchBrand(e.target.value)}
          aria-labelledby="brand-switcher-label"
        >
          <option value="" disabled>Select Brand</option>
          {brands && brands.map(brand => (
            <option key={brand.id} value={brand.id}>{brand.name}</option>
          ))}
          <option value="new">+ Create New Brand</option>
        </select>
      </div>

      {/* ── WORKSPACE ── */}
      <div className="nav-group-title">Workspace</div>
      <nav aria-label="Workspace">
        <NavLink tab="dashboard"             activeTab={activeTab} switchTab={switchTab} icon="fas fa-tachometer-alt" label="Dashboard" />
        <NavLink tab="insights"              activeTab={activeTab} switchTab={switchTab} icon="fas fa-lightbulb"      label="Insights" />
        <NavLink tab="content-opportunities" activeTab={activeTab} switchTab={switchTab} icon="fas fa-crosshairs"     label="Content Opportunities" />
        <NavLink tab="brand-dna"             activeTab={activeTab} switchTab={switchTab} icon="fas fa-dna"            label="Brand DNA" />
      </nav>

      {/* ── CREATE ── */}
      <div className="nav-group-title">Create</div>
      <nav aria-label="Create">
        <NavLink tab="social"   activeTab={activeTab} switchTab={switchTab} icon="fas fa-edit"     label="Create Social Post" />
        <NavLink tab="blog"     activeTab={activeTab} switchTab={switchTab} icon="fas fa-file-alt" label="Create Article" />
        <NavLink tab="campaign" activeTab={activeTab} switchTab={switchTab} icon="fas fa-bullhorn" label="Campaigns" />
      </nav>

      {/* ── PUBLISHING ── */}
      <div className="nav-group-title">Publishing</div>
      <nav aria-label="Publishing">
        <NavLink tab="schedule" activeTab={activeTab} switchTab={switchTab} icon="fas fa-calendar-alt" label="Schedule" />
        <NavLink tab="content"  activeTab={activeTab} switchTab={switchTab} icon="fas fa-copy"         label="Content Management" />
        <NavLink tab="media"    activeTab={activeTab} switchTab={switchTab} icon="fas fa-photo-video"  label="Media Library" />
      </nav>

      {/* ── ANALYTICS ── */}
      <div className="nav-group-title">Analytics</div>
      <nav aria-label="Analytics">
        <NavLink tab="analytics" activeTab={activeTab} switchTab={switchTab} icon="fas fa-chart-pie"    label="Analytics" />
        <NavLink tab="reporting" activeTab={activeTab} switchTab={switchTab} icon="fas fa-file-contract" label="Reporting" />
        <NavLink tab="seo"       activeTab={activeTab} switchTab={switchTab} icon="fas fa-search"        label="SEO" />
      </nav>

      {/* ── SYSTEM ── */}
      <div className="nav-group-title">System</div>
      <nav aria-label="System">
        <NavLink tab="integrations" activeTab={activeTab} switchTab={switchTab} icon="fas fa-plug"        label="Integrations" />
        <NavLink tab="teams"        activeTab={activeTab} switchTab={switchTab} icon="fas fa-users"       label="Team & Clients" />
        <NavLink tab="growth"       activeTab={activeTab} switchTab={switchTab} icon="fas fa-trophy"      label="Rewards" />
        <NavLink tab="billing"      activeTab={activeTab} switchTab={switchTab} icon="fas fa-credit-card" label="Billing" />
        <NavLink tab="settings"     activeTab={activeTab} switchTab={switchTab} icon="fas fa-cog"         label="Settings" />
      </nav>
    </aside>
  );
};

export default Sidebar;
