import { useContext } from "react";
import { DialogContext, type DialogContextValue } from "@shared/ui/dialogContext";

export function useDialog(): DialogContextValue {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error("useDialog must be used within a DialogProvider");
  }
  return context;
}
