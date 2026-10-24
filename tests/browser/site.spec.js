const { test, expect, devices } = require("@playwright/test");
const { readFileSync } = require("node:fs");
const path = require("node:path");

test("light-theme links stay dark on hover and follow system or explicit themes", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  const link = page.locator('main p a[href="/arc-hub-for-ict/"]');
  const color = () => link.evaluate((element) => getComputedStyle(element).color);
  const light = await color();
  await link.hover();
  const lightHover = await color();
  const contrastOnLightBackground = (value) => {
    const luminance = (rgb) => rgb.map((channel) => channel / 255)
      .map((channel) => channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4)
      .reduce((sum, channel, i) => sum + channel * [.2126, .7152, .0722][i], 0);
    return (luminance([250, 252, 255]) + .05) / (luminance(value.match(/[\d.]+/g).map(Number)) + .05);
  };
  expect(contrastOnLightBackground(light)).toBeGreaterThan(4.5);
  expect(contrastOnLightBackground(lightHover)).toBeGreaterThan(4.5);

  await page.mouse.move(0, 0);
  await page.emulateMedia({ colorScheme: "dark" });
  const dark = await color();
  expect(dark).not.toBe(light);
  await page.locator(".header .theme-toggle__option--system").click();
  expect(await color()).toBe(dark);
  await page.locator(".header .theme-toggle__option--dark").click();
  expect(await color()).toBe(light);
  await link.hover();
  expect(await color()).toBe(lightHover);
});

test("contact page links to the ResearchGate profile", async ({ page }) => {
  await page.goto("/contact/");
  const profile = page.getByRole("link", { name: /ResearchGate Matthew Nicholson/ });
  await expect(profile).toHaveAttribute("href", "https://www.researchgate.net/profile/Matthew-Nicholson-8");
  await expect(profile).toHaveAttribute("rel", "noopener");
  await expect.poll(() => profile.locator("img").evaluate((image) => image.naturalWidth)).toBeGreaterThan(0);
  const data = await page.locator('script[type="application/ld+json"]').evaluate((element) => JSON.parse(element.textContent));
  expect(data.mainEntity.sameAs).toContain("https://www.researchgate.net/profile/Matthew-Nicholson-8");
});

test("homepage logo has an accessible name, including after JavaScript navigation", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("main").getByRole("img", { name: "Matthew Nicholson logo", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "ADAPT", exact: true }).first().click();
  await expect(page.getByRole("heading", { name: "ADAPT", exact: true })).toBeVisible();
  await page.locator('.header a[href="/"]').click();
  await expect(page.locator("main").getByRole("img", { name: "Matthew Nicholson logo", exact: true })).toBeVisible();
});

test("Open Graph previews use the contact portrait and update during navigation", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", "https://mtthw.xyz/images/Matthew_Nicholson.jpg");
  await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute("content", "Matthew Nicholson");

  await page.getByRole("link", { name: "ADAPT", exact: true }).first().click();
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", "ADAPT · Matthew Nicholson · mtthw.xyz");
  await expect(page.locator('meta[property="og:description"]')).toHaveAttribute("content", /Collaborative projects/);
});

test("style guide and tags retain noindex during JavaScript navigation", async ({ page }) => {
  await page.goto("/");
  for (const href of ["/styleguide/", "/tags/"]) {
    await page.locator(".sidebar__toggle").click();
    await page.locator(`.sidebar__nav a[href="${href}"]`).click();
    await expect(page).toHaveURL(`http://127.0.0.1:1314${href}`);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex");
  }
  await page.locator('.header a[href="/"]').click();
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
});

test("missing pages render JSON 404s without reloading, including Back and Forward", async ({ page }) => {
  await page.route("**/missing/nested/page/index.json", (route) => route.fulfill({
    status: 404,
    contentType: "application/json",
    body: readFileSync(path.join(__dirname, "../../public/404.json"), "utf8"),
  }));
  await page.goto("/adapt/");
  await page.evaluate(() => {
    window.navigationMarker = "same document";
    const link = document.createElement("a");
    link.href = "/missing/nested/page/";
    link.textContent = "Missing page";
    document.querySelector(".page-content").append(link);
  });
  await page.getByRole("link", { name: "Missing page", exact: true }).click();
  await expect(page).toHaveURL(/\/missing\/nested\/page\/$/);
  await expect(page.locator("main")).toHaveClass("content not-found");
  await expect(page.getByRole("heading", { name: "Page not found", exact: true })).toBeVisible();
  await expect(page.locator(".not-found__code")).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://mtthw.xyz/404.html");
  await expect(page.locator("main")).toBeFocused();
  await expect(page.locator('.header a[aria-current="page"]')).toHaveCount(0);
  await expect(page.locator(".toc__links")).toBeHidden();

  await page.getByRole("link", { name: "Back to home" }).click();
  await expect(page).toHaveURL("http://127.0.0.1:1314/");
  await expect(page.locator("main")).not.toHaveClass(/not-found/);
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
  await expect(page).toHaveTitle("Matthew Nicholson · mtthw.xyz");

  await page.goBack();
  await expect(page.getByRole("heading", { name: "Page not found", exact: true })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex");
  await page.goBack();
  await expect(page.getByRole("heading", { name: "ADAPT", exact: true })).toBeVisible();
  await expect(page.locator("main")).not.toHaveClass(/not-found/);
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
  await page.goForward();
  await expect(page.getByRole("heading", { name: "Page not found", exact: true })).toBeVisible();
  expect(await page.evaluate(() => window.navigationMarker)).toBe("same document");
});

for (const body of ["<html>Not found</html>", '{"status":404}']) {
  test(`invalid 404 JSON falls back to HTML: ${body}`, async ({ page }) => {
    await page.route("**/adapt/index.json", (route) => route.fulfill({ status: 404, body }));
    await page.goto("/");
    await page.evaluate(() => { window.navigationMarker = true; });
    await page.getByRole("link", { name: "ADAPT", exact: true }).first().click();
    await expect(page.getByRole("heading", { name: "ADAPT", exact: true })).toBeVisible();
    expect(await page.evaluate(() => window.navigationMarker)).toBeUndefined();
  });
}

test("main page headings use DT Getai Grotesk while smaller headings retain Inter", async ({ page }) => {
  await page.goto("/adapt/");
  await expect(page.locator("main h1")).toHaveCSS("font-family", /^"DT Getai Grotesk", Inter, sans-serif$/i);
  await expect(page.locator("main h1")).toHaveCSS("font-weight", "900");
  await expect(page.locator("main h2").first()).toHaveCSS("font-family", /^Inter, sans-serif$/i);
});

test("404 graphic fills the content width and sits above the footer", async ({ page }) => {
  for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await page.goto("/404.html");
    expect(await page.evaluate(async () => {
      const fonts = await document.fonts.load('900 100px "DT Getai Grotesk"', "404");
      return fonts.length > 0 && fonts.every((font) => font.status === "loaded");
    })).toBe(true);
    await expect(page.locator(".not-found__code")).toHaveCSS("font-family", /^"DT Getai Grotesk", Inter, sans-serif$/i);
    const graphic = await page.locator(".not-found__code").boundingBox();
    const footer = await page.locator(".site-footer__frame").boundingBox();
    expect(Math.abs(graphic.width - footer.width)).toBeLessThan(1);
    expect(footer.y - (graphic.y + graphic.height)).toBeCloseTo(32, 0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(viewport.width);
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(viewport.height);
  }
});

for (const javaScriptEnabled of [true, false]) {
  test.describe(`404 recovery with JavaScript ${javaScriptEnabled ? "enabled" : "disabled"}`, () => {
    test.use({ javaScriptEnabled });

    test("a missing URL shows the error page and links back home", async ({ page }) => {
      // Emulate nginx's error_page mapping; Python's test server has its own 404 page.
      await page.route("**/missing/nested/page/", (route) => route.fulfill({
        status: 404,
        contentType: "text/html",
        body: readFileSync(path.join(__dirname, "../../public/404.html"), "utf8"),
      }));
      const response = await page.goto("/missing/nested/page/");
      expect(response.status()).toBe(404);
      await expect(page.getByRole("heading", { name: "Page not found", exact: true })).toBeVisible();
      await expect(page.locator(".not-found__code")).toBeVisible();
      await expect(page).toHaveTitle(/^404 — Page not found/);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex");
      if (javaScriptEnabled) await page.evaluate(() => { window.navigationMarker = true; });

      await page.getByRole("link", { name: "Back to home" }).click();
      await expect(page).toHaveURL("http://127.0.0.1:1314/");
      await expect(page).toHaveTitle("Matthew Nicholson · mtthw.xyz");
      await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
      if (javaScriptEnabled) expect(await page.evaluate(() => window.navigationMarker)).toBe(true);
    });
  });
}

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

test("changing theme preserves the reading position", async ({ page }) => {
  await page.goto("/adapt/");
  await page.evaluate(() => window.scrollTo(0, 1200));
  await page.locator(".sidebar__toggle").click();
  const readingPosition = await page.evaluate(() => window.scrollY);

  for (const [current, next] of [["system", "dark"], ["dark", "light"], ["light", "system"]]) {
    await page.locator(`.sidebar .theme-toggle__option--${current}`).click();
    await expect(page.locator(`#theme-${next}`)).toBeChecked();
    expect(await page.evaluate(() => window.scrollY)).toBe(readingPosition);
  }
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

test("both logos respect reduced motion", async ({ browser }) => {
  const context = await browser.newContext({ ...devices["Pixel 7"], reducedMotion: "reduce" });
  try {
    const page = await context.newPage();
    await page.goto("/adapt/");
    await expect(page.locator(".logo__adapt-shapes path").first()).toHaveCSS("animation-name", "none");
    await expect(page.locator(".logo__adapt-guides").first()).toHaveCSS("opacity", "0");

    await page.locator('a[href="/"]').first().click();
    await expect(page).toHaveURL("http://127.0.0.1:1314/");
    await expect(page.locator(".logo__header .logo__nm")).toHaveCSS("animation-name", "none");
    await expect(page.locator(".logo__header .logo__a")).toHaveCSS("animation-name", "none");
    await expect.poll(() => page.locator("svg.logo__header").evaluate((logo) => logo.animationsPaused())).toBe(true);

    await page.emulateMedia({ reducedMotion: "no-preference" });
    await expect.poll(() => page.locator("svg.logo__header").evaluate((logo) => logo.animationsPaused())).toBe(false);
  } finally {
    await context.close();
  }
});
