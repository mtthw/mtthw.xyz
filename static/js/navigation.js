import { shiftBackground } from "./background.js";

let activeRequest = 0;
let activeController;
let renderedPath = window.location.pathname;
const sidebarToggle = document.getElementById("sidebar__checkbox");
const main = document.querySelector("main");
const heroElement = main?.querySelector(":scope > .page-hero");
const contentElement = main?.querySelector(":scope > .page-content");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

function syncLogoMotion() {
  for (const logo of document.querySelectorAll("svg.logo__header")) {
    if (reducedMotion.matches) logo.pauseAnimations?.();
    else logo.unpauseAnimations?.();
  }
}

reducedMotion.addEventListener("change", syncLogoMotion);
syncLogoMotion();

function isPlainClick(event, link) {
  return link && !event.defaultPrevented && event.button === 0 &&
    !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey &&
    !link.hasAttribute("download") && (!link.target || link.target === "_self");
}

function isPageUrl(url) {
  return url.origin === window.location.origin &&
    url.pathname.endsWith("/") && !url.search;
}

function shouldHandleClick(event, link, url) {
  return isPlainClick(event, link) && isPageUrl(url) &&
    url.pathname !== window.location.pathname;
}

async function fetchPage(url, signal) {
  const jsonUrl = new URL("index.json", url);
  const response = await fetch(jsonUrl, { signal, headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`Page request failed: ${response.status}`);

  const page = await response.json();
  if (typeof page.title !== "string" ||
      typeof page.description !== "string" || typeof page.canonical !== "string" ||
      typeof page.hero?.key !== "string" || typeof page.hero?.html !== "string" ||
      typeof page.content !== "string" || typeof page.toc !== "string") {
    throw new Error("Invalid page data");
  }
  return page;
}

function updateTableOfContents(markup) {
  const current = document.querySelector(".sidebar__content .toc");
  if (!markup) {
    current?.remove();
    return;
  }

  const next = document.createElement("div");
  next.className = "toc";
  next.innerHTML = markup;
  if (current) current.replaceWith(next);
  else document.querySelector(".sidebar__nav").before(next);
}

function updateCurrentLinks(url) {
  for (const link of document.querySelectorAll(".header .nav a, .sidebar__nav a")) {
    if (new URL(link.href).pathname === url.pathname) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  }
}

function scrollToDestination(url, savedScrollY) {
  if (typeof savedScrollY === "number") {
    window.scrollTo(0, savedScrollY);
    return;
  }
  const id = decodeURIComponent(url.hash.slice(1));
  const target = id && document.getElementById(id);
  if (target) target.scrollIntoView();
  else window.scrollTo(0, 0);
}

function closeSidebar() {
  if (!sidebarToggle) return;
  sidebarToggle.checked = false;
  sidebarToggle.setAttribute("aria-expanded", "false");
}

function updateHero(hero) {
  if (heroElement.dataset.heroKey === hero.key) return;
  heroElement.innerHTML = hero.html;
  heroElement.dataset.heroKey = hero.key;
  syncLogoMotion();
}

function updateBackground(url) {
  if (renderedPath === url.pathname) return;
  renderedPath = url.pathname;
  shiftBackground();
}

function updateMetadata(page) {
  document.querySelector('meta[name="description"]').content = page.description;
  document.querySelector('link[rel="canonical"]').href = page.canonical;
  document.querySelector('meta[property="og:title"]').content = page.title;
  document.querySelector('meta[property="og:description"]').content = page.description;
  document.querySelector('meta[property="og:url"]').content = page.canonical;
}

function renderPage(page, url, savedScrollY) {
  updateHero(page.hero);
  contentElement.innerHTML = page.content;
  document.title = page.title;
  updateMetadata(page);
  updateTableOfContents(page.toc);
  updateCurrentLinks(url);
  closeSidebar();
  main.focus({ preventScroll: true });
  scrollToDestination(url, savedScrollY);
  updateBackground(url);
}

function loadNormally(url, isNewVisit) {
  if (isNewVisit) window.location.assign(url.href);
  else window.location.reload();
}

async function navigate(url, isNewVisit) {
  const request = ++activeRequest;
  activeController?.abort();
  activeController = new AbortController();

  try {
    const page = await fetchPage(url, activeController.signal);
    if (request !== activeRequest) return;
    if (isNewVisit) {
      history.replaceState({ ...history.state, scrollY: window.scrollY }, "", window.location.href);
      history.pushState({ scrollY: 0 }, "", url.href);
    }
    renderPage(page, url, isNewVisit ? undefined : history.state?.scrollY);
  } catch (error) {
    if (request === activeRequest && error.name !== "AbortError") {
      loadNormally(url, isNewVisit);
    }
  }
}

function handleClick(event) {
  const link = event.target instanceof Element && event.target.closest("a[href]");
  if (!link) return;
  if (link.closest(".sidebar__content")) closeSidebar();
  const url = new URL(link.href);
  if (!shouldHandleClick(event, link, url)) {
    if (url.origin === window.location.origin && url.pathname === window.location.pathname) {
      activeController?.abort();
    }
    return;
  }
  event.preventDefault();
  void navigate(url, true);
}

function handlePopState() {
  const url = new URL(window.location.href);
  if (isPageUrl(url)) void navigate(url, false);
  else window.location.reload();
}

if (main && heroElement && contentElement && typeof window.fetch === "function" &&
    typeof window.AbortController === "function" &&
    typeof history.pushState === "function") {
  document.addEventListener("click", handleClick);
  window.addEventListener("popstate", handlePopState);
  history.scrollRestoration = "manual";
  if (!history.state || typeof history.state.scrollY !== "number") {
    history.replaceState({ ...history.state, scrollY: window.scrollY }, "", window.location.href);
  }
  if (window.location.hash) {
    requestAnimationFrame(() => scrollToDestination(new URL(window.location.href)));
  }
}

if (sidebarToggle) {
  sidebarToggle.setAttribute("aria-expanded", String(sidebarToggle.checked));
  sidebarToggle.addEventListener("change", () => {
    sidebarToggle.setAttribute("aria-expanded", String(sidebarToggle.checked));
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && sidebarToggle.checked) {
      closeSidebar();
      sidebarToggle.focus();
    }
  });
}
