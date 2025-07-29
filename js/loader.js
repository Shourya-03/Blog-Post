window.addEventListener('load', () => {
  const loader = document.getElementById('preloader');
  if (loader) {
    loader.setAttribute('aria-busy', 'false');
    loader.style.display = 'none';
  }
});
