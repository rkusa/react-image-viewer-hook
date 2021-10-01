const { build } = require("esbuild");
const { dependencies, peerDependencies } = require("./package.json");

const opts = {
  entryPoints: ["src/useImageViewer.tsx"],
  bundle: true,
  sourcemap: true,
  external: Object.keys(dependencies).concat(Object.keys(peerDependencies)),
};

build({
  ...opts,
  format: "cjs",
  outfile: "dist/useImageViewer.cjs.js",
});

build({
  ...opts,
  format: "esm",
  outdir: "dist",
  splitting: true,
});
