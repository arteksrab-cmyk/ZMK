import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const appUrl =
  process.env.RESPONSIVE_TEST_URL ??
  `http://127.0.0.1:${process.env.PORT ?? "19551"}/`;
const chromiumPath = process.env.CHROMIUM_BIN ?? "chromium";
const viewports = [
  { width: 402, height: 1000, expected: { stats: 2, glazing: 1, workflow: 1 } },
  { width: 980, height: 1400, expected: { stats: 2, glazing: 2, workflow: 2 } },
  { width: 1440, height: 1400, expected: { stats: 4, glazing: 4, workflow: 5 } },
];

const response = await fetch(appUrl).catch(() => null);
if (!response?.ok) {
  throw new Error(
    `Website is not reachable at ${appUrl}. Start the web workflow or set RESPONSIVE_TEST_URL.`,
  );
}

const userDataDir = await mkdtemp(join(tmpdir(), "zmk-responsive-"));
const browser = spawn(
  chromiumPath,
  [
    "--headless=new",
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "--hide-scrollbars",
    "--remote-debugging-port=0",
    `--user-data-dir=${userDataDir}`,
    "about:blank",
  ],
  { stdio: ["ignore", "ignore", "pipe"] },
);

let browserOutput = "";
browser.stderr.on("data", (chunk) => {
  browserOutput += chunk.toString();
});

function waitForDebuggerEndpoint() {
  return new Promise((resolve, reject) => {
    const deadline = setTimeout(
      () => reject(new Error(`Chromium did not start: ${browserOutput}`)),
      15_000,
    );
    const inspect = () => {
      const endpoint = browserOutput.match(/DevTools listening on (ws:\/\/\S+)/)?.[1];
      if (endpoint) {
        clearTimeout(deadline);
        resolve(endpoint);
      } else if (browser.exitCode !== null) {
        clearTimeout(deadline);
        reject(new Error(`Chromium exited early: ${browserOutput}`));
      } else {
        setTimeout(inspect, 50);
      }
    };
    inspect();
  });
}

let socket;

try {
  const browserEndpoint = await waitForDebuggerEndpoint();
  const debuggerUrl = new URL(browserEndpoint);
  const targetsResponse = await fetch(
    `http://${debuggerUrl.host}/json/list`,
  );
  const targets = await targetsResponse.json();
  const pageTarget = targets.find((target) => target.type === "page");
  if (!pageTarget?.webSocketDebuggerUrl) {
    throw new Error("Could not connect to the Chromium page target.");
  }

  socket = new WebSocket(pageTarget.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener(
      "error",
      () => reject(new Error("Could not open the Chromium debugging socket.")),
      { once: true },
    );
  });

  let nextCommandId = 0;
  const pendingCommands = new Map();
  const eventListeners = new Map();

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const pending = pendingCommands.get(message.id);
      if (!pending) return;
      pendingCommands.delete(message.id);
      if (message.error) pending.reject(new Error(message.error.message));
      else pending.resolve(message.result);
    }
    if (message.method) {
      const listeners = eventListeners.get(message.method) ?? [];
      for (const listener of listeners) listener(message.params);
    }
  });

  function send(method, params = {}) {
    const id = ++nextCommandId;
    socket.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      pendingCommands.set(id, { resolve, reject });
    });
  }

  function onceEvent(method, timeoutMs = 20_000) {
    return new Promise((resolve, reject) => {
      const listeners = eventListeners.get(method) ?? [];
      const timeout = setTimeout(
        () => reject(new Error(`Timed out waiting for ${method}.`)),
        timeoutMs,
      );
      const listener = (params) => {
        clearTimeout(timeout);
        eventListeners.set(
          method,
          (eventListeners.get(method) ?? []).filter((entry) => entry !== listener),
        );
        resolve(params);
      };
      listeners.push(listener);
      eventListeners.set(method, listeners);
    });
  }

  await Promise.all([send("Page.enable"), send("Runtime.enable")]);
  await send("Emulation.setDeviceMetricsOverride", {
    width: viewports[0].width,
    height: viewports[0].height,
    deviceScaleFactor: 1,
    mobile: true,
  });
  const loadEvent = onceEvent("Page.loadEventFired");
  await send("Page.navigate", { url: appUrl });
  await loadEvent;

  async function evaluate(expression) {
    const result = await send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.text ?? "Browser evaluation failed.");
    }
    return result.result.value;
  }

  for (const viewport of viewports) {
    await send("Emulation.setDeviceMetricsOverride", {
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: 1,
      mobile: viewport.width <= 700,
    });

    const report = await evaluate(`(async () => {
      await document.fonts.ready;
      const deadline = Date.now() + 8000;
      while (
        (!document.querySelector('.stats-strip') ||
         !document.querySelector('.glazing-card') ||
         !document.querySelector('.workflow-step')) &&
        Date.now() < deadline
      ) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      const failures = [];
      const require = (condition, message) => {
        if (!condition) failures.push(message);
      };
      const columnCount = (element) =>
        getComputedStyle(element).gridTemplateColumns.trim().split(/\\s+/).length;
      const checkText = (element, container, label) => {
        const text = element.getBoundingClientRect();
        const bounds = container.getBoundingClientRect();
        require(element.scrollWidth <= element.clientWidth + 1,
          label + ' has clipped or overflowing text');
        require(text.left >= bounds.left - 1 && text.right <= bounds.right + 1,
          label + ' extends beyond its card');
      };
      const noCollision = (heading, text, label) => {
        if (!heading || !text) return;
        require(heading.getBoundingClientRect().bottom <= text.getBoundingClientRect().top + 1,
          label + ' heading overlaps its description');
      };
      const checkSiblingOverlaps = (elements, label) => {
        const boxes = [...elements].map((element) => element.getBoundingClientRect());
        for (let first = 0; first < boxes.length; first += 1) {
          for (let second = first + 1; second < boxes.length; second += 1) {
            const overlapX = Math.min(boxes[first].right, boxes[second].right) -
              Math.max(boxes[first].left, boxes[second].left);
            const overlapY = Math.min(boxes[first].bottom, boxes[second].bottom) -
              Math.max(boxes[first].top, boxes[second].top);
            require(overlapX <= 1 || overlapY <= 1,
              label + ' cards overlap each other');
          }
        }
      };

      const stats = document.querySelector('.stats-strip');
      const glazing = document.querySelector('.glazing-grid');
      const workflow = document.querySelector('.workflow-line');
      require(Boolean(stats && glazing && workflow), 'A target section did not render');

      if (stats && glazing && workflow) {
        require(columnCount(stats) === ${viewport.expected.stats},
          'Statistics grid should have ${viewport.expected.stats} columns');
        require(columnCount(glazing) === ${viewport.expected.glazing},
          'Glazing grid should have ${viewport.expected.glazing} columns');
        require(columnCount(workflow) === ${viewport.expected.workflow},
          'Workflow grid should have ${viewport.expected.workflow} columns');

        for (const value of stats.querySelectorAll('.stat-value')) {
          checkText(value, value.closest('.stat-cell'), 'Statistics value "' + value.textContent.trim() + '"');
          const lineHeight = parseFloat(getComputedStyle(value).lineHeight);
          require(value.getBoundingClientRect().height <= lineHeight * 1.5 + 1,
            'Statistics value "' + value.textContent.trim() + '" wraps onto multiple lines');
          noCollision(value, value.closest('.stat-cell').querySelector('.stat-label'), 'Statistics cell');
        }
        checkSiblingOverlaps(stats.querySelectorAll('.stat-cell'), 'Statistics');
        for (const card of glazing.querySelectorAll('.glazing-card')) {
          const heading = card.querySelector('h3');
          const description = card.querySelector('p');
          checkText(heading, card, 'Glazing heading "' + heading.textContent.trim() + '"');
          checkText(description, card, 'Glazing description');
          noCollision(heading, description, 'Glazing card');
        }
        checkSiblingOverlaps(glazing.querySelectorAll('.glazing-card'), 'Glazing');
        for (const step of workflow.querySelectorAll('.workflow-step')) {
          const heading = step.querySelector('h3');
          const description = step.querySelector('p');
          checkText(heading, step, 'Workflow heading "' + heading.textContent.trim() + '"');
          checkText(description, step, 'Workflow description');
          noCollision(heading, description, 'Workflow step');
        }
        checkSiblingOverlaps(workflow.querySelectorAll('.workflow-step'), 'Workflow');
      }

      require(document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
        'The page has horizontal overflow');
      return { width: window.innerWidth, failures };
    })()`);

    console.log(`Viewport ${report.width}px: ${report.failures.length ? "FAIL" : "PASS"}`);
    for (const failure of report.failures) console.error(`  - ${failure}`);
    if (report.failures.length) process.exitCode = 1;
  }
} finally {
  socket?.close();
  if (browser.exitCode === null) {
    const browserExited = new Promise((resolve) => browser.once("exit", resolve));
    browser.kill("SIGTERM");
    await Promise.race([
      browserExited,
      new Promise((resolve) => setTimeout(resolve, 2000)),
    ]);
    if (browser.exitCode === null) browser.kill("SIGKILL");
  }
  await rm(userDataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}