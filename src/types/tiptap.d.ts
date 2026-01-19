import "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    callout: {
      setCallout: () => ReturnType;
      toggleCallout: () => ReturnType;
    };
    toggle: {
      insertToggle: () => ReturnType;
    };
  }
}
