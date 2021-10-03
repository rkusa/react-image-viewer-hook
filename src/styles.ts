import { CSSProperties } from "react";

// Default style for close, prev and next buttons.
export const BUTTON_STYLE: CSSProperties = {
  position: "fixed",
  backgroundColor: "rgba(0, 0, 0, 0.3)",
  border: "none",
  color: "white",
  borderRadius: 4,
  display: "flex",
  height: 40,
  justifyContent: "center",
  alignItems: "center",
  padding: 0,
};

// Default style of the image viewer dialog.
export const DIALOG_STYLE: CSSProperties = {
  position: "fixed",
  width: "100vw",
  height: "100vh",
  top: 0,
  left: 0,
  display: "flex",
  overflow: "hidden",
  marginRight: 32,
  zIndex: 9999,
};

// Default style of the slides (image containers).
export const SLIDE_STYLE: CSSProperties = {
  width: "100vw",
  height: "100vh",
  overflow: "hidden",
  flexShrink: 0,
  position: "absolute",
  justifyContent: "center",
  alignItems: "center",
  touchAction: "none",
};

// Default style of the images in the viewer.
export const IMAGE_STYLE: CSSProperties = {
  touchAction: "none",
  userSelect: "none",
  maxWidth: "100vw",
  maxHeight: "100vh",
};
