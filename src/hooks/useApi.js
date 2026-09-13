import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";

export function useApi(path, intervalMs = 1500) {
  const [state, setState] = useState({ data: null, error: "", loading: true, path: null });
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision(r => r + 1), []);
  useEffect(() => {
    let active = true, timer;
    const controller = new AbortController();
    async function load() {
      try {
        const data = await api(path, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(4000)]) });
        if (active) setState({ data, error: "", loading: false, path });
      } catch (error) {
        if (active) setState(previous => ({ data: previous.path === path ? previous.data : null, error: error.message, loading: false, path }));
      } finally {
        if (active && intervalMs > 0) timer = setTimeout(load, intervalMs);
      }
    }
    load();
    return () => { active = false; controller.abort(); clearTimeout(timer); };
  }, [path, intervalMs, revision]);
  return { ...state, data: state.path === path ? state.data : null, loading: state.path !== path || state.loading, refresh };
}
