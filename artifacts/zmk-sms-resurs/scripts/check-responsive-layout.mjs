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

  for (const [viewportIndex, viewport] of viewports.entries()) {
    await send("Emulation.setDeviceMetricsOverride", {
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: 1,
      mobile: viewport.width <= 700,
    });

    if (viewportIndex > 0) {
      const loadEvent = onceEvent("Page.loadEventFired");
      await send("Page.reload");
      await loadEvent;
    }

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

    if (viewport.width <= 980) {
      const interactionReport = await evaluate(`(async () => {
        const failures = [];
        const require = (condition, message) => {
          if (!condition) failures.push(message);
        };
        const nextFrame = () =>
          new Promise((resolve) => requestAnimationFrame(() =>
            requestAnimationFrame(resolve)));
        const waitFor = async (condition, timeoutMs = 2500) => {
          const deadline = Date.now() + timeoutMs;
          while (!condition() && Date.now() < deadline) {
            await new Promise((resolve) => setTimeout(resolve, 30));
          }
          return condition();
        };

        await document.fonts.ready;
        const menuButton = document.querySelector('[data-testid="button-mobile-menu"]');
        require(Boolean(menuButton), 'Mobile menu button is missing');
        require(Boolean(menuButton && getComputedStyle(menuButton).display !== 'none'),
          'Mobile menu button is hidden at ${viewport.width}px');

        if (menuButton) {
          require(menuButton.getAttribute('aria-expanded') === 'false',
            'Mobile menu should start closed');
          menuButton.click();
          await nextFrame();

          let navigation = document.querySelector('[data-testid="mobile-navigation"]');
          require(menuButton.getAttribute('aria-expanded') === 'true',
            'Mobile menu button did not open the menu');
          require(Boolean(navigation && getComputedStyle(navigation).display !== 'none'),
            'Mobile navigation is not visible after opening');
          require(Boolean(navigation && navigation.scrollWidth <= navigation.clientWidth + 1),
            'Mobile navigation overflows horizontally');
          if (navigation) {
            const navigationBounds = navigation.getBoundingClientRect();
            for (const link of navigation.querySelectorAll('a')) {
              const linkBounds = link.getBoundingClientRect();
              require(linkBounds.left >= navigationBounds.left - 1 &&
                linkBounds.right <= navigationBounds.right + 1,
                'Mobile navigation link extends beyond the menu');
            }
          }

          const links = navigation?.querySelectorAll('a[href^="#"]') ?? [];
          require(links.length >= 6, 'Mobile navigation is missing section links');
          for (const link of links) {
            require(Boolean(document.querySelector(link.getAttribute('href'))),
              'Mobile navigation target "' + link.getAttribute('href') + '" is missing');
          }

          menuButton.click();
          await nextFrame();
          require(menuButton.getAttribute('aria-expanded') === 'false' &&
            !document.querySelector('[data-testid="mobile-navigation"]'),
            'Mobile menu button did not close the menu');

          menuButton.click();
          await nextFrame();
          navigation = document.querySelector('[data-testid="mobile-navigation"]');
          const contactsLink = navigation?.querySelector('[data-testid="mobile-link-contacts"]');
          require(Boolean(contactsLink), 'Mobile menu is missing its estimate link');
          contactsLink?.click();
          const reachedContacts = await waitFor(() =>
            window.location.hash === '#contacts' &&
            !document.querySelector('[data-testid="mobile-navigation"]'));
          require(reachedContacts,
            'Estimate link did not navigate to contacts and close the menu');
        }

        const form = document.querySelector('[data-testid="lead-form"]');
        require(Boolean(form), 'Estimate form is missing');
        if (!form) return { width: window.innerWidth, failures };
        form.scrollIntoView({ block: 'center' });
        await nextFrame();

        const checkFormBounds = (targetForm, label) => {
          if (!targetForm) return;
          const formBounds = targetForm.getBoundingClientRect();
          require(targetForm.scrollWidth <= targetForm.clientWidth + 1,
            label + ' overflows horizontally');
          require(formBounds.left >= -1 && formBounds.right <= window.innerWidth + 1,
            label + ' extends beyond the viewport');
          for (const element of targetForm.querySelectorAll(
            'input, textarea, button, .field-error, .form-agreement, [role="alert"]',
          )) {
            const bounds = element.getBoundingClientRect();
            require(bounds.left >= formBounds.left - 1 && bounds.right <= formBounds.right + 1,
              label + ' field or message extends beyond the form');
          }
        };

        form.requestSubmit();
        await nextFrame();
        const initialErrors = [...form.querySelectorAll('.field-error')]
          .map((error) => error.textContent.trim());
        require(initialErrors.some((message) => message.includes('имя')),
          'Empty form did not show the name validation error');
        require(initialErrors.some((message) => message.includes('телефон или e-mail')),
          'Empty form did not show the contact validation error');
        checkFormBounds(form, 'Form validation state');

        const setFieldValue = (selector, value) => {
          const field = document.querySelector(selector);
          require(Boolean(field), 'Form field "' + selector + '" is missing');
          if (!field) return;
          const prototype = field instanceof HTMLTextAreaElement
            ? HTMLTextAreaElement.prototype
            : HTMLInputElement.prototype;
          const setter = Object.getOwnPropertyDescriptor(prototype, 'value').set;
          setter.call(field, value);
          field.dispatchEvent(new Event('input', { bubbles: true }));
          field.dispatchEvent(new Event('change', { bubbles: true }));
        };

        setFieldValue('[data-testid="input-lead-name"]', 'Тестовая мобильная заявка');
        setFieldValue('[data-testid="input-lead-phone"]', '8 900 000 00 00');
        setFieldValue('[data-testid="input-lead-email"]', 'not-an-email');
        await nextFrame();
        form.requestSubmit();
        await nextFrame();
        require([...form.querySelectorAll('.field-error')]
          .some((error) => error.textContent.includes('формат e-mail')),
          'Invalid e-mail did not show a validation error');

        setFieldValue('[data-testid="input-lead-email"]', 'mobile-test@example.com');
        setFieldValue('[data-testid="input-lead-company"]', 'Тестовая компания');
        setFieldValue('[data-testid="input-lead-details"]', 'Проверка мобильной формы');
        await nextFrame();

        const mock = { mode: 'error', calls: [] };
        window.__leadFormTestMock = mock;
        const originalFetch = window.fetch.bind(window);
        window.fetch = async (input, init = {}) => {
          const requestUrl = typeof input === 'string' ? input : input.url;
          const requestMethod = init.method ?? (typeof input === 'string' ? 'GET' : input.method);
          const pathname = new URL(requestUrl, window.location.href).pathname;
          if (requestMethod.toUpperCase() === 'POST' && pathname.endsWith('/leads')) {
            let body = init.body;
            if (!body && input instanceof Request) body = await input.clone().text();
            try {
              mock.calls.push(JSON.parse(body ?? '{}'));
            } catch {
              mock.calls.push(null);
            }
            if (mock.mode === 'error') {
              return new Response(JSON.stringify({ error: 'Тестовая ошибка сервера' }), {
                status: 503,
                headers: { 'Content-Type': 'application/json' },
              });
            }
            return new Response(JSON.stringify({ status: 'sent' }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            });
          }
          return originalFetch(input, init);
        };

        form.requestSubmit();
        const showedServerError = await waitFor(() =>
          document.querySelector('[data-testid="lead-form"] [role="alert"]')?.textContent
            .includes('Тестовая ошибка сервера'));
        require(showedServerError, 'Form did not display the server error');
        checkFormBounds(document.querySelector('[data-testid="lead-form"]'),
          'Form server-error state');

        mock.mode = 'success';
        const retryForm = document.querySelector('[data-testid="lead-form"]');
        retryForm?.requestSubmit();
        const showedSuccess = await waitFor(() =>
          Boolean(document.querySelector('[data-testid="form-success"]')));
        require(showedSuccess, 'Successful form response did not show the confirmation');
        require(Boolean(document.querySelector('[data-testid="link-mailto-fallback"]')),
          'Successful form response is missing the e-mail fallback link');
        require(mock.calls.length === 2,
          'Form submissions were not both handled by the local test response');
        require(mock.calls[0]?.name === 'Тестовая мобильная заявка' &&
          mock.calls[0]?.phone === '8 900 000 00 00' &&
          mock.calls[0]?.email === 'mobile-test@example.com',
          'Form did not submit the entered contact details');

        const result = document.querySelector('[data-testid="form-success"]');
        require(Boolean(result && result.scrollWidth <= result.clientWidth + 1),
          'Form confirmation overflows its card');
        if (result) {
          const resultBounds = result.getBoundingClientRect();
          require(resultBounds.left >= -1 && resultBounds.right <= window.innerWidth + 1,
            'Form confirmation extends beyond the viewport');
        }
        require(document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
          'The page has horizontal overflow after form validation or submission');
        return { width: window.innerWidth, failures };
      })()`);

      console.log(
        `Mobile menu and form ${interactionReport.width}px: ${interactionReport.failures.length ? "FAIL" : "PASS"}`,
      );
      for (const failure of interactionReport.failures) console.error(`  - ${failure}`);
      if (interactionReport.failures.length) process.exitCode = 1;
    }
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