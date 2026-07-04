// render_smoke.js — executes index.html's real scripts in jsdom with npm React 18.
// Catches runtime crashes that `node --check` cannot. Usage: node render_smoke.js [file]
const fs = require("fs");
const { JSDOM } = require("jsdom");

const file = process.argv[2] || "index.html";
const html = fs.readFileSync(file, "utf8");
const errors = [];

const dom = new JSDOM(html, {
  url: "https://afherkdriver.github.io/firehawk-ops/",
  runScripts: "outside-only",
  pretendToBeVisual: true
});
const w = dom.window;

// Bridge realms so CJS react-dom sees the page globals
global.window = w; global.document = w.document; global.navigator = w.navigator;
global.requestAnimationFrame = w.requestAnimationFrame.bind(w);
global.cancelAnimationFrame = w.cancelAnimationFrame.bind(w);

const React = require("react");
const ReactDOM = { ...require("react-dom"), ...require("react-dom/client") };
w.React = React; w.ReactDOM = ReactDOM;

// Network: everything fails fast — exercises every guard/fallback path
w.fetch = () => Promise.resolve({ ok: false, status: 0, json: async () => ({}), text: async () => "" });
Object.defineProperty(w.navigator, "geolocation", { value: {
  watchPosition: () => 1, clearWatch: () => {},
  getCurrentPosition: (_ok, fail) => { if (fail) fail({ code: 2, message: "stub" }); }
}, configurable: true });
w.matchMedia = w.matchMedia || (() => ({ matches: false, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){} }));
w.scrollTo = () => {};

w.addEventListener("error", e => errors.push({ msg: e.message, stack: e.error && e.error.stack }));
w.addEventListener("unhandledrejection", e => errors.push({ msg: "unhandledrejection: " + (e.reason && e.reason.message || e.reason), stack: e.reason && e.reason.stack }));

// Run every inline <script> in document order inside the page context
const inline = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
for (let i = 0; i < inline.length; i++) {
  try { w.eval(inline[i]); }
  catch (e) { errors.push({ msg: "script[" + i + "] threw: " + e.message, stack: e.stack }); }
}

setTimeout(() => {
  const root = w.document.getElementById("root");
  const len = root ? root.innerHTML.length : -1;
  console.log("root innerHTML length:", len, len > 500 ? "(RENDERED)" : "(EMPTY / WHITE SCREEN)");
  if (errors.length) {
    console.log("\n=== CAPTURED ERRORS (" + errors.length + ") ===");
    errors.slice(0, 4).forEach((e, i) => {
      console.log("\n[" + (i + 1) + "] " + e.msg);
      if (e.stack) console.log(String(e.stack).split("\n").slice(0, 8).join("\n"));
    });
  } else console.log("no runtime errors captured");
  process.exit(errors.length ? 1 : (len > 500 ? 0 : 2));
}, 1500);
