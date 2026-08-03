// Smoke-test each ZUMIQ page render in Node with a stubbed DOM.
global.window = {};

const elStub = () => ({
  innerHTML: "", value: "", textContent: "", style: {},
  appendChild() {}, insertAdjacentHTML() {}, setAttribute() {},
  querySelector() { return elStub(); }
});

global.document = {
  _listeners: {},
  getElementById() { return elStub(); },
  querySelector() { return elStub(); },
  addEventListener(ev, fn) { this._listeners[ev] = fn; },
  createElementNS() { return elStub(); },
  createElement() { return elStub(); }
};

require("../js/data.js");
require("../js/common.js");

const pages = ["executive", "business", "quality", "cost", "scenarios", "architecture"];
let fail = 0;
for (const p of pages) {
  try {
    delete require.cache[require.resolve("../js/pages/" + p + ".js")];
    require("../js/pages/" + p + ".js");
    document._listeners["DOMContentLoaded"]();
    console.log("OK   " + p);
  } catch (e) {
    fail++;
    console.log("FAIL " + p + " - " + e.stack.split("\n")[0]);
  }
}

// playground: init + run a query through the UI path
try {
  delete require.cache[require.resolve("../js/pages/playground.js")];
  require("../js/pages/playground.js");
  document._listeners["DOMContentLoaded"]();
  window.ZQ_PAGE_loadSample();
  window.ZQ_PAGE_run();
  console.log("OK   playground (init + run sample)");
} catch (e) {
  fail++;
  console.log("FAIL playground - " + e.stack.split("\n")[0]);
}

process.exit(fail ? 1 : 0);
