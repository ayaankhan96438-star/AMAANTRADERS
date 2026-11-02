"use strict";
(() => {
  const menuButton = document.querySelector("[data-page-menu-toggle]");
  const mobileMenu = document.querySelector("[data-page-mobile-nav]");
  if (menuButton && mobileMenu) {
    const close = () => {
      mobileMenu.classList.remove("is-open");
      mobileMenu.inert = true;
      mobileMenu.setAttribute("aria-hidden", "true");
      menuButton.setAttribute("aria-expanded", "false");
      document.body.classList.remove("no-scroll");
    };
    menuButton.addEventListener("click", () => {
      const open = !mobileMenu.classList.contains("is-open");
      mobileMenu.classList.toggle("is-open", open);
      mobileMenu.inert = !open;
      mobileMenu.setAttribute("aria-hidden", String(!open));
      menuButton.setAttribute("aria-expanded", String(open));
      document.body.classList.toggle("no-scroll", open);
    });
    mobileMenu.addEventListener("click", event => { if (event.target.closest("a")) close(); });
    document.addEventListener("keydown", event => { if (event.key === "Escape") close(); });
    window.addEventListener("resize", () => { if (window.innerWidth > 850) close(); });
  }
  document.querySelectorAll("[data-year]").forEach(node => node.textContent = String(new Date().getFullYear()));
  const config = window.AMAANTRADER_CONFIG || {};
  const wa = String(config.whatsappNumber || "").replace(/\D/g, "");
  document.querySelectorAll("[data-whatsapp-link]").forEach(link => {
    if (wa) { link.href = `https://wa.me/${wa}?text=${encodeURIComponent("Hello AmaanTrader, I need help with your outerwear collection.")}`; link.target = "_blank"; link.rel = "noopener noreferrer"; }
    else { link.href = "../policies.html#contact"; link.addEventListener("click", event => { event.preventDefault(); alert("The store owner needs to add the verified WhatsApp number in site-config.js first."); }); }
  });
  document.querySelectorAll("[data-support-email]").forEach(node => {
    if (config.supportEmail) { node.href = `mailto:${config.supportEmail}`; node.textContent = config.supportEmail; }
    else { node.href = "../policies.html#contact"; node.textContent = "Add verified support email"; }
  });
})();
