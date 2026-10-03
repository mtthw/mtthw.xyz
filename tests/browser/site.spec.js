const { test, expect, devices } = require("@playwright/test");

test("closed sidebar stays out of the keyboard path and Escape closes it", async ({ page }) => {
  await page.goto("/adapt/");
  const menu = page.getByRole("checkbox", { name: "Site menu" });
  await menu.focus();
  await page.keyboard.press("Tab");
  const focusState = await page.evaluate(() => ({
    insideSidebar: Boolean(document.activeElement.closest(".sidebar__content")),
    focused: document.activeElement.outerHTML.slice(0, 150),
    visibility: getComputedStyle(document.querySelector(".sidebar__content")).visibility,
    checked: document.querySelector("#sidebar__checkbox").checked,
  }));
  expect(focusState.insideSidebar, JSON.stringify(focusState)).toBe(false);

  await menu.focus();
  await page.keyboard.press("Space");
  await expect(menu).toBeChecked();
  await expect(menu).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(menu).not.toBeChecked();
  await expect(menu).toBeFocused();
});

test("Back restores the previous reading position and metadata", async ({ page }) => {
  await page.goto("/adapt/");
  const privacy = page.locator('.site-footer a[href="/privacy/"]');
  await privacy.scrollIntoViewIfNeeded();
  const previousY = await page.evaluate(() => window.scrollY);
  expect(previousY).toBeGreaterThan(0);

  await privacy.click();
  await expect(page).toHaveURL(/\/privacy\/$/);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", "How this website handles visitor information.");
  await page.goBack();
  await expect(page).toHaveURL(/\/adapt\/$/);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(previousY - 3);
  expect(await page.evaluate(() => window.scrollY)).toBeLessThan(previousY + 3);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://mtthw.xyz/adapt/");
});

test("a direct section link scrolls to its heading", async ({ page }) => {
  await page.goto("/adapt/#voicetune");
  await expect.poll(() => page.locator("#voicetune").evaluate((element) => Math.abs(element.getBoundingClientRect().top))).toBeLessThan(3);
});

test("failed JSON navigation falls back to the HTML page", async ({ page }) => {
  await page.goto("/");
  await page.route("**/adapt/index.json", (route) => route.fulfill({ status: 503, body: "Unavailable" }));
  await page.getByRole("link", { name: "ADAPT", exact: true }).first().click();
  await expect(page).toHaveURL(/\/adapt\/$/);
  await expect(page.getByRole("heading", { name: "ADAPT", exact: true })).toBeVisible();
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /Collaborative projects/);
});

test("ADAPT logo stroke draws on a mobile viewport", async ({ browser }) => {
  const context = await browser.newContext({ ...devices["Pixel 7"], reducedMotion: "no-preference" });
  try {
    const page = await context.newPage();
    await page.goto("/adapt/");
    const stroke = await page.locator(".logo__adapt-shapes path").first().evaluate(async (path) => {
      const animation = path.getAnimations()[0];
      await animation.ready;
      animation.pause();
      animation.currentTime = 0;
      const start = parseFloat(getComputedStyle(path).strokeDashoffset);
      const dash = parseFloat(getComputedStyle(path).strokeDasharray);
      animation.currentTime = 10000;
      const drawing = parseFloat(getComputedStyle(path).strokeDashoffset);
      return { length: path.getTotalLength(), dash, start, drawing };
    });
    expect(stroke.dash).toBeGreaterThan(stroke.length);
    expect(stroke.start).toBe(stroke.dash);
    expect(stroke.drawing).toBeLessThan(stroke.start - 100);
  } finally {
    await context.close();
  }
});
