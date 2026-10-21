const feedbackIds = ["form-success", "form-error", "form-rate-limited", "form-network-error"];
const pendingForms = new WeakSet();

function showFeedback(form, id) {
  const feedback = form.querySelector(`#${id}`);
  if (!feedback) return;
  feedback.classList.add("is-visible");
  feedback.focus({ preventScroll: true });
  feedback.scrollIntoView({ block: "nearest" });
}

document.addEventListener("submit", async (event) => {
  const form = event.target;
  if (event.defaultPrevented || !(form instanceof HTMLFormElement) || !form.matches(".contact-form") ||
      typeof fetch !== "function" || typeof FormData !== "function") return;

  event.preventDefault();
  if (pendingForms.has(form)) return;
  pendingForms.add(form);

  form.classList.add("contact-form--enhanced");
  for (const id of feedbackIds) form.querySelector(`#${id}`)?.classList.remove("is-visible");
  if (feedbackIds.includes(window.location.hash.slice(1))) {
    try {
      history.replaceState(history.state, "", window.location.pathname + window.location.search);
    } catch {
      // The enhanced class still hides the old fragment message.
    }
  }

  const button = form.querySelector('button[type="submit"]');
  const buttonText = button.textContent;
  button.disabled = true;
  button.textContent = "Sending…";
  form.setAttribute("aria-busy", "true");

  let feedbackId = "form-network-error";
  try {
    const response = await fetch(form.action, {
      method: "POST",
      headers: { Accept: "application/json" },
      body: new FormData(form),
      redirect: "error",
    });
    if (response.status === 429) {
      feedbackId = "form-rate-limited";
    } else if (!response.ok) {
      feedbackId = "form-error";
    } else {
      const result = await response.json();
      if (result?.status === "message sent") feedbackId = "form-success";
    }
  } catch {
    // The request may have reached FormFling, so avoid claiming it was not sent.
  } finally {
    button.disabled = false;
    button.textContent = buttonText;
    form.removeAttribute("aria-busy");
    pendingForms.delete(form);
  }

  showFeedback(form, feedbackId);
});
