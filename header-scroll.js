const header = document.querySelector(".site-header");

const updateHeaderSize = () => {
  if (!header) return;
  header.classList.toggle("is-compact", window.scrollY > 80);
};

updateHeaderSize();
window.addEventListener("scroll", updateHeaderSize, { passive: true });
