import { createContext, useContext } from "react";
import type { SeatColor } from "./types.js";

/** Switches to the PCs tab with that seat's sheet showing; provided by `App`. */
export const OpenPcSheetContext = createContext<((color: SeatColor) => void) | null>(null);

export const useOpenPcSheet = (): ((color: SeatColor) => void) | null => useContext(OpenPcSheetContext);
