import { useEffect, useState } from "react";
import { apiRequest } from "./client";

/**
 * useApi hook for declarative data fetching
 * (V1.1.1 Contract Aligned)
 */
export function useApi(endpoint, dependencies = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!endpoint) {
      setLoading(false);
      return;
    }

    let mounted = true;
    setLoading(true);

    apiRequest(endpoint)
      .then((res) => {
        if (mounted) {
          setData(res);
          setError(null);
        }
      })
      .catch((err) => {
        if (mounted) setError(err);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [endpoint, ...dependencies]);

  return { data, setData, loading, error };
}
