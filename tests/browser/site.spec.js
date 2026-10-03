const { test, expect } = require("@playwright/test");

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
  await page.locator(".site-footer a").scrollIntoViewIfNeeded();
  const previousY = await page.evaluate(() => window.scrollY);
  expect(previousY).toBeGreaterThan(0);

  await page.locator(".site-footer a").click();
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
