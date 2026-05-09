import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { apiRequest } from "../lib/api/client";

const BrandContext = createContext();

export const BrandProvider = ({ children }) => {
  const { user, token, login: updateToken } = useAuth();
  const [brands, setBrands] = useState([]);
  const [activeBrand, setActiveBrand] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token) {
      fetchBrands();
    } else {
      setBrands([]);
      setActiveBrand(null);
    }
  }, [token]);

  const fetchBrands = async () => {
    setLoading(true);
    try {
      const data = await apiRequest("/api/customer/brands");
      if (data.brands && data.brands.length > 0) {
        setBrands(data.brands);
        const jwtBrandId = user?.activeBrandId;
        const current = data.brands.find(b => b.id === jwtBrandId);
        
        if (!current) {
          // Force a backend context switch to the first brand if JWT is out of sync
          switchBrand(data.brands[0].id);
        } else {
          setActiveBrand(current);
        }
      } else if (user?.activeBrandId) {
        // Fallback: If list is empty but JWT has a brand_id, set a placeholder with that ID
        setActiveBrand({ id: user.activeBrandId, name: "Active Brand" });
      }
    } catch (e) {
      console.error("Failed to fetch brands", e);
    }
    setLoading(false);
  };

  const switchBrand = async (brandId) => {
    setLoading(true);
    try {
      const data = await apiRequest("/api/customer/brands/switch", {
        method: "POST",
        body: JSON.stringify({ brand_id: brandId })
      });
      if (data.success && data.token) {
        updateToken(data.token);
        // Synchronously update activeBrand to avoid race condition with AuthContext state updates
        const nextBrand = brands.find(b => b.id === brandId);
        if (nextBrand) setActiveBrand(nextBrand);
      }
    } catch (e) {
      console.error("Failed to switch brand", e);
    }
    setLoading(false);
  };

  const createBrand = async (brandData) => {
    setLoading(true);
    try {
      const data = await apiRequest("/api/customer/brands/create", {
        method: "POST",
        body: JSON.stringify(brandData)
      });
      if (data.id) {
        if (data.token) {
          updateToken(data.token);
        }
        await fetchBrands();
        return { success: true, brand_id: data.id };
      }
      return { success: false, error: data.error };
    } catch (e) {
      console.error("Failed to create brand", e);
      return { success: false, error: e.error || "Network error" };
    } finally {
      setLoading(false);
    }
  };

  return (
    <BrandContext.Provider value={{ brands, activeBrand, loading, fetchBrands, switchBrand, createBrand }}>
      {children}
    </BrandContext.Provider>
  );
};

export const useBrand = () => useContext(BrandContext);
