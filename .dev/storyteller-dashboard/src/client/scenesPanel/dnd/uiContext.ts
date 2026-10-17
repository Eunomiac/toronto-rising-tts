import { createContext } from "react";
import type { DndUiHooks } from "./apply";
export const DndUiContext = createContext<DndUiHooks | undefined>(undefined);
