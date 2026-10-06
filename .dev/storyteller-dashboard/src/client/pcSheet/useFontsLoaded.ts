import { useEffect, useState } from "react";

/** Counter that ticks whenever web fonts finish loading; put it in layout-effect deps to re-measure text. */
export const useFontsLoaded = (): number => {
  const [loads, setLoads] = useState(0);
  useEffect(() => {
    const tick = (): void => setLoads((n) => n + 1);
    document.fonts.addEventListener("loadingdone", tick);
    return () => document.fonts.removeEventListener("loadingdone", tick);
  }, []);
  return loads;
};
