import React from 'react';
import { useBrand } from '../../contexts/BrandContext';
import { ChevronDown, Plus, Globe, Check } from 'lucide-react';

const BrandDropdown = ({ onAddNew }) => {
  const { brands, activeBrand, switchBrand } = useBrand();

  return (
    <div className="dropdown brand-dropdown">
      <button 
        className="btn btn-brand-selector d-flex align-items-center gap-2 px-3 py-2" 
        type="button" 
        data-bs-toggle="dropdown" 
        aria-expanded="false"
      >
        <div 
          className="brand-avatar-sm d-flex align-items-center justify-content-center"
          style={{ 
            width: '28px', 
            height: '28px', 
            borderRadius: '8px',
            background: 'var(--pilot-blue-light)',
            color: 'var(--pilot-blue)',
            fontWeight: 'bold',
            fontSize: '12px'
          }}
        >
          {activeBrand?.name?.substring(0, 1) || 'B'}
        </div>
        <div className="text-start d-none d-md-block">
          <div className="fw-bold text-dark" style={{ fontSize: '0.85rem', lineHeight: '1.2' }}>
            {activeBrand?.name || 'Select Brand'}
          </div>
          <div className="text-muted" style={{ fontSize: '0.7rem' }}>
            {activeBrand?.industry || 'Active Brand'}
          </div>
        </div>
        <ChevronDown size={16} className="text-muted ms-1" />
      </button>

      <ul className="dropdown-menu dropdown-menu-end shadow-lg border-0 mt-2 p-2" style={{ minWidth: '240px', borderRadius: '16px' }}>
        <li className="dropdown-header text-uppercase fw-bold pb-2" style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
          Switch Brand
        </li>
        
        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
          {brands.map((brand) => (
            <li key={brand.id}>
              <button 
                className={`dropdown-item d-flex align-items-center gap-3 py-2 px-3 rounded-3 mb-1 ${activeBrand?.id === brand.id ? 'active' : ''}`}
                onClick={() => switchBrand(brand.id)}
                style={{ 
                  background: activeBrand?.id === brand.id ? 'var(--pilot-blue-light)' : 'transparent',
                  color: activeBrand?.id === brand.id ? 'var(--pilot-blue)' : 'inherit'
                }}
              >
                <div 
                  className="d-flex align-items-center justify-content-center rounded-2"
                  style={{ 
                    width: '32px', 
                    height: '32px', 
                    background: activeBrand?.id === brand.id ? '#fff' : '#f1f5f9',
                    fontSize: '11px',
                    fontWeight: 'bold'
                  }}
                >
                  {brand.name.substring(0, 1)}
                </div>
                <div className="flex-grow-1 overflow-hidden">
                  <div className="fw-semibold text-truncate" style={{ fontSize: '0.85rem' }}>{brand.name}</div>
                  <div className="text-muted text-truncate" style={{ fontSize: '0.7rem' }}>{brand.industry}</div>
                </div>
                {activeBrand?.id === brand.id && <Check size={14} className="text-primary" />}
              </button>
            </li>
          ))}
        </div>

        <li><hr className="dropdown-divider my-2" /></li>
        
        <li>
          <button 
            className="dropdown-item d-flex align-items-center gap-2 py-2 px-3 rounded-3 text-primary fw-semibold"
            onClick={onAddNew}
            style={{ fontSize: '0.85rem' }}
          >
            <div className="bg-primary-light rounded-circle p-1">
              <Plus size={14} />
            </div>
            Add New Brand
          </button>
        </li>
      </ul>

      <style>{`
        .btn-brand-selector {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          transition: all 0.2s;
        }
        .btn-brand-selector:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
        }
        .dropdown-item.active {
          color: var(--pilot-blue) !important;
        }
        .dropdown-item:hover {
          background-color: #f1f5f9 !important;
        }
        .dropdown-item:active {
          background-color: #e2e8f0 !important;
        }
        .bg-primary-light {
          background: rgba(37, 99, 235, 0.1);
        }
      `}</style>
    </div>
  );
};

export default BrandDropdown;
