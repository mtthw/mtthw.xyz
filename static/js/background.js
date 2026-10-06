const glowCenters = {
  pink: [90, 5],
  blue: [80, 15],
  cyan: [10, 85],
};

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function percentNear(center, previous) {
  const value = Math.round(randomBetween(center - 20, center + 20));
  if (!Number.isFinite(previous) || Math.abs(value - previous) >= 12) return `${value}%`;
  return `${center + (previous < center ? 14 : -14)}%`;
}

function setCoordinate(element, property, center) {
  const previous = Number.parseFloat(element.style.getPropertyValue(property));
  element.style.setProperty(property, percentNear(center, previous));
}

function setVariation(element, property, min, max) {
  const previous = Number.parseFloat(element.style.getPropertyValue(property));
  let value = randomBetween(min, max);
  if (Number.isFinite(previous) && Math.abs(value - previous) < 0.12) {
    value = previous > (min + max) / 2 ? min : max;
  }
  element.style.setProperty(property, value.toFixed(2));
}

function setGlows(element) {
  for (const [name, [x, y]] of Object.entries(glowCenters)) {
    setCoordinate(element, `--${name}-x`, x);
    setCoordinate(element, `--${name}-y`, y);
    setVariation(element, `--${name}-intensity`, 0.7, 1.3);
    setVariation(element, `--${name}-size`, 0.8, 1.25);
  }
}

function initializeBackground() {
  const element = document.querySelector(".body");
  if (!element) return;

  element.classList.add("body--animated");
  // Start at the default scene, then ease into a new one on load.
  getComputedStyle(element).getPropertyValue("--pink-x");
  shiftBackground();
}

export function shiftBackground() {
  const element = document.querySelector(".body");
  if (element) setGlows(element);
}

initializeBackground();
