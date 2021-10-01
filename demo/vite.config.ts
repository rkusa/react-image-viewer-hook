/// <reference types="node" />

import { defineConfig } from "vite";
import { resolve } from "path";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  root: __dirname,
  plugins: [react()],
});
