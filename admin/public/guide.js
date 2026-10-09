
(() => {
  const toc = document.querySelector('nav.toc details');
  const wide = matchMedia('(min-width: 901px)');
  const fit = () => { toc.open = wide.matches; };
  fit(); wide.addEventListener('change', fit);
  // On phones, picking a section folds the contents away.
  toc.addEventListener('click', (e) => { if (e.target.closest('a') && !wide.matches) toc.open = false; });
  // In-page links scroll here themselves. Inside the admin this page is a frame with no address of its own, where a plain "#section" link would try to open the admin's own page in it.
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    e.preventDefault();
    document.getElementById(decodeURIComponent(a.getAttribute('href').slice(1)))?.scrollIntoView();
  });

  // Highlight the section being read: the last one whose top has passed a third of the screen.
  const links = [...document.querySelectorAll('nav.toc a')];
  const targets = links.map((a) => document.getElementById(a.getAttribute('href').slice(1)));
  let current = null;
  const spy = () => {
    let index = 0;
    targets.forEach((t, i) => { if (t && t.getBoundingClientRect().top <= innerHeight / 3) index = i; });
    if (current === index) return;
    current = index;
    links.forEach((a, i) => a.classList.toggle('active', i === index));
    // Keep it visible inside the rail only - never move the page itself.
    const nav = document.querySelector('nav.toc'); const link = links[index];
    if (wide.matches && (link.offsetTop < nav.scrollTop || link.offsetTop > nav.scrollTop + nav.clientHeight - link.offsetHeight)) nav.scrollTop = link.offsetTop - nav.clientHeight / 2;
  };
  // Reading progress and back-to-top.
  const bar = document.querySelector('.progress');
  const up = document.querySelector('.to-top');
  const onScroll = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = 'scaleX(' + (max > 0 ? scrollY / max : 0) + ')';
    up.classList.toggle('show', scrollY > 900);
  };
  addEventListener('scroll', () => { onScroll(); spy(); }, { passive: true }); onScroll(); spy();
  up.addEventListener('click', () => scrollTo({ top: 0 }));

  // Screenshots open full size, with their numbered marks.
  const box = document.querySelector('.lightbox');
  const stage = box.querySelector('.lightbox-stage');
  const title = box.querySelector('.lightbox-bar p');
  let opener = null;
  const close = () => { box.hidden = true; stage.textContent = ''; document.body.classList.remove('locked'); opener?.focus(); };
  document.querySelectorAll('button.pic').forEach((pic) => pic.addEventListener('click', () => {
    if (pic.closest('.lightbox')) return;
    opener = pic;
    const copy = pic.cloneNode(true);
    copy.setAttribute('tabindex', '-1');
    copy.querySelector('.zoom-hint')?.remove();
    stage.replaceChildren(copy);
    title.textContent = pic.querySelector('img').alt;
    box.hidden = false; document.body.classList.add('locked');
    box.querySelector('.lightbox-bar button').focus();
  }));
  box.querySelector('.lightbox-bar button').addEventListener('click', close);
  box.addEventListener('click', (e) => { if (e.target === box || e.target === stage) close(); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !box.hidden) close(); });
})();
