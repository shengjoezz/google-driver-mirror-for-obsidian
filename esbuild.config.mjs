import * as esbuild from "esbuild";

const production = process.argv[2] === "production";
const context = await esbuild.context({
  entryPoints: ["src/main.js"],
  bundle: true,
  external: [
    "obsidian",
    "electron",
    "http",
    "node:http",
    "@codemirror/state",
    "@codemirror/view"
  ],
  format: "cjs",
  outfile: "main.js",
  logLevel: "info",
  platform: "browser",
  sourcemap: production ? false : "inline",
  target: "es2020",
});

if (production) {
  await context.rebuild();
  await context.dispose();
} else {
  await context.watch();
}
