import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { webkit } from "playwright";

const appUrl =
  process.env.RESPONSIVE_TEST_URL ??
  `http://127.0.0.1:${process.env.PORT ?? "19551"}/`;
const viewports = [
  { width: 402, height: 1000, expected: { stats: 2, glazing: 1, workflow: 1 } },
  { width: 980, height: 1400, expected: { stats: 2, glazing: 2, workflow: 2 } },
];

const response = await fetch(appUrl).catch(() => null);
if (!response?.ok) {
  throw new Error(
    `Website is not reachable at ${appUrl}. Start the web workflow or set RESPONSIVE_TEST_URL.`,
  );
}

function nixLibraryPath(attribute) {
  const result = spawnSync(
    "nix",
    ["eval", "--raw", `nixpkgs#${attribute}.outPath`],
    { encoding: "utf8" },
  );
  if (result.status !== 0) {
    throw new Error(
      `Could not resolve Nix library package "${attribute}": ${result.stderr.trim()}`,
    );
  }
  return join(result.stdout.trim(), "lib");
}

function getBrowserLaunchOptions() {
  const browserWrapper = webkit.executablePath();
  if (!existsSync(browserWrapper)) {
    throw new Error(
      "Playwright WebKit is not installed. Run `pnpm --filter @workspace/zmk-sms-resurs exec playwright install webkit`.",
    );
  }

  const browserRoot = dirname(browserWrapper);
  if (process.platform !== "linux" || !existsSync("/nix/store")) {
    return {};
  }

  // The bundled Playwright wrapper replaces LD_LIBRARY_PATH on Nix systems.
  // Launch WPE MiniBrowser directly so the Nix library paths remain available.
  const wpeDirectory = join(browserRoot, "minibrowser-wpe");
  const runtimeLibraries = [
    "icu74",
    "libjpeg8.out",
    "stdenv.cc.cc.lib",
    "libgbm",
    "libglvnd",
    "harfbuzzFull",
    "gst_all_1.gst-libav",
    "gst_all_1.gst-plugins-base",
    "gst_all_1.gst-plugins-good",
    "gst_all_1.gst-plugins-bad",
    "x264",
  ].map(nixLibraryPath);
  const pathLibraries = (process.env.PATH ?? "")
    .split(":")
    .filter((entry) => entry.endsWith("/bin"))
    .map((entry) => `${entry.slice(0, -4)}/lib`);
  const libraryPath = [
    ...pathLibraries,
    ...runtimeLibraries,
    join(wpeDirectory, "lib"),
    join(wpeDirectory, "sys/lib"),
    process.env.LD_LIBRARY_PATH,
  ]
    .filter(Boolean)
    .join(":");

  return {
    executablePath: join(wpeDirectory, "bin/MiniBrowser"),
    env: {
      ...process.env,
      LD_LIBRARY_PATH: libraryPath,
      WEBKIT_EXEC_PATH: join(wpeDirectory, "bin"),
      WEBKIT_INJECTED_BUNDLE_PATH: join(wpeDirectory, "lib"),
      WEBKIT_INSPECTOR_RESOURCES_PATH: join(wpeDirectory, "share"),
    },
  };
}

const browser = await webkit.launch({
  headless: true,
  ...getBrowserLaunchOptions(),
});

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: 1,
      isMobile: viewport.width <= 700,
      hasTouch: viewport.width <= 700,
    });

    try {
      const page = await context.newPage();
      await page.goto(appUrl, { waitUntil: "load" });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForFunction(
        () =>
          document.querySelector(".stats-strip") &&
          document.querySelector(".glazing-card") &&
          document.querySelector(".workflow-step"),
        undefined,
        { timeout: 10_000 },
      );

      const report = await page.evaluate((expected) => {
        const failures = [];
        const require = (condition, message) => {
          if (!condition) failures.push(message);
        };
        const columnCount = (element) =>
          getComputedStyle(element).gridTemplateColumns.trim().split(/\s+/).length;
        const checkText = (element, container, label) => {
          if (!element || !container) {
            require(false, `${label} is missing`);
            return;
          }
          const text = element.getBoundingClientRect();
          const bounds = container.getBoundingClientRect();
          require(
            element.scrollWidth <= element.clientWidth + 1,
            `${label} has clipped or overflowing text`,
          );
          require(
            text.left >= bounds.left - 1 && text.right <= bounds.right + 1,
            `${label} extends beyond its card`,
          );
        };
        const noCollision = (heading, text, label) => {
          if (!heading || !text) return;
          require(
            heading.getBoundingClientRect().bottom <=
              text.getBoundingClientRect().top + 1,
            `${label} heading overlaps its description`,
          );
        };
        const checkSiblingOverlaps = (elements, label) => {
          const boxes = [...elements].map((element) =>
            element.getBoundingClientRect(),
          );
          for (let first = 0; first < boxes.length; first += 1) {
            for (let second = first + 1; second < boxes.length; second += 1) {
              const overlapX =
                Math.min(boxes[first].right, boxes[second].right) -
                Math.max(boxes[first].left, boxes[second].left);
              const overlapY =
                Math.min(boxes[first].bottom, boxes[second].bottom) -
                Math.max(boxes[first].top, boxes[second].top);
              require(
                overlapX <= 1 || overlapY <= 1,
                `${label} cards overlap each other`,
              );
            }
          }
        };

        const stats = document.querySelector(".stats-strip");
        const glazing = document.querySelector(".glazing-grid");
        const workflow = document.querySelector(".workflow-line");
        require(
          Boolean(stats && glazing && workflow),
          "A target section did not render",
        );

        if (stats && glazing && workflow) {
          require(
            columnCount(stats) === expected.stats,
            `Statistics grid should have ${expected.stats} columns`,
          );
          require(
            columnCount(glazing) === expected.glazing,
            `Glazing grid should have ${expected.glazing} columns`,
          );
          require(
            columnCount(workflow) === expected.workflow,
            `Workflow grid should have ${expected.workflow} columns`,
          );

          for (const value of stats.querySelectorAll(".stat-value")) {
            const cell = value.closest(".stat-cell");
            checkText(
              value,
              cell,
              `Statistics value "${value.textContent.trim()}"`,
            );
            const lineHeight = parseFloat(getComputedStyle(value).lineHeight);
            require(
              value.getBoundingClientRect().height <= lineHeight * 1.5 + 1,
              `Statistics value "${value.textContent.trim()}" wraps onto multiple lines`,
            );
            noCollision(value, cell?.querySelector(".stat-label"), "Statistics cell");
          }
          checkSiblingOverlaps(stats.querySelectorAll(".stat-cell"), "Statistics");

          for (const card of glazing.querySelectorAll(".glazing-card")) {
            const heading = card.querySelector("h3");
            const description = card.querySelector("p");
            checkText(
              heading,
              card,
              `Glazing heading "${heading?.textContent.trim() ?? ""}"`,
            );
            checkText(description, card, "Glazing description");
            noCollision(heading, description, "Glazing card");
          }
          checkSiblingOverlaps(
            glazing.querySelectorAll(".glazing-card"),
            "Glazing",
          );

          for (const step of workflow.querySelectorAll(".workflow-step")) {
            const heading = step.querySelector("h3");
            const description = step.querySelector("p");
            checkText(
              heading,
              step,
              `Workflow heading "${heading?.textContent.trim() ?? ""}"`,
            );
            checkText(description, step, "Workflow description");
            noCollision(heading, description, "Workflow step");
          }
          checkSiblingOverlaps(
            workflow.querySelectorAll(".workflow-step"),
            "Workflow",
          );
        }

        require(
          document.documentElement.scrollWidth <=
            document.documentElement.clientWidth + 1,
          "The page has horizontal overflow",
        );
        return { width: window.innerWidth, failures };
      }, viewport.expected);

      console.log(
        `WebKit viewport ${report.width}px: ${report.failures.length ? "FAIL" : "PASS"}`,
      );
      for (const failure of report.failures) console.error(`  - ${failure}`);
      if (report.failures.length) process.exitCode = 1;
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}