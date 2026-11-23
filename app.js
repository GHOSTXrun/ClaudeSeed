const tiers=[['COMMON','60%','5–55','15%'],['UNCOMMON','25%','15–65','35%'],['RARE','10%','25–75','60%'],['EPIC','4%','35–85','85%'],['LEGENDARY','1%','50–100','100%']];
function buildRarity(){document.querySelectorAll('.rarity-strip').forEach(el=>el.innerHTML=tiers.map(t=>`<div class="rarity">◆ ${t[0]}<b><span class="rar-odds">${t[1]}</span> · stats ${t[2]}</b>hat ${t[3]}</div>`).join(''))}
buildRarity();
const pages=[...document.querySelectorAll('.page')];const navLinks=[...document.querySelectorAll('#nav a')];function route(){let id=location.hash.slice(1)||'home';const sub=id.startsWith('d-')&&document.getElementById(id);if(!document.getElementById(id)?.classList.contains('page')&&!sub)id='home';const pageId=sub?'docs':id;pages.forEach(p=>p.classList.toggle('active',p.id===pageId));navLinks.forEach(a=>a.classList.toggle('active',a.hash==='#'+pageId));document.getElementById('routeStatus').textContent=pageId.toUpperCase();if(sub){requestAnimationFrame(()=>sub.scrollIntoView({behavior:'smooth',block:'start'}))}else{window.scrollTo({top:0,behavior:'smooth'})}}window.addEventListener('hashchange',route);route();
const toast=document.getElementById('toast');let toastTimer;function notify(message){toast.textContent=message;toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('show'),2800)}document.querySelectorAll('[data-action="mint"]').forEach(b=>b.addEventListener('click',()=>notify('Live wallet signing and mint services are not included in this offline frontend demo.')));
function tick(){const d=new Date();document.getElementById('clock').textContent=d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',hour12:false})}tick();setInterval(tick,30000);


const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
if (!reduceMotion.matches && 'IntersectionObserver' in window) {
  const headings = document.querySelectorAll('.slice-head h2, .page-title h1, .manual h2');
  const scan = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('scan-visible');
      scan.unobserve(entry.target);
    }
  }, {rootMargin: '0px 0px -6% 0px'});
  for (const heading of headings) {
    const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    let index = 0;
    for (const node of nodes) {
      const fragment = document.createDocumentFragment();
      for (const character of node.textContent) {
        if (/\s/u.test(character)) {
          fragment.append(character);
          continue;
        }
        const glyph = document.createElement('span');
        glyph.className = 'scan-glyph';
        glyph.style.setProperty('--scan-delay', Math.min(index++, 48) * 20 + 'ms');
        glyph.textContent = character;
        fragment.append(glyph);
      }
      node.replaceWith(fragment);
    }
    heading.classList.add('scan-heading');
    scan.observe(heading);
  }
}

const finePointer = matchMedia('(pointer: fine)');
if (!reduceMotion.matches && finePointer.matches) {
  const trail = document.createElement('canvas');
  trail.className = 'terminal-trail';
  trail.setAttribute('aria-hidden', 'true');
  const ctx = trail.getContext('2d');
  if (ctx) {
    document.body.append(trail);
    const marks = [];
    const glyphs = ['>', '_', '·', '0', '1'];
    const cellSize = 16;
    const lifespan = 380;
    let frame = 0;
    let lastX;
    let lastY;
    let index = 0;

    function fitTrail() {
      const scale = Math.min(devicePixelRatio || 1, 2);
      trail.width = Math.round(innerWidth * scale);
      trail.height = Math.round(innerHeight * scale);
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.font = '12px monospace';
    }

    function paintTrail(now) {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      while (marks.length && now - marks[0].time >= lifespan) marks.shift();
      if (reduceMotion.matches || !finePointer.matches) marks.length = 0;
      for (const mark of marks) {
        const opacity = .42 * (1 - Math.max(0, now - mark.time) / lifespan);
        ctx.fillStyle = mark.warm ? 'rgba(255,156,77,' + opacity + ')' : 'rgba(56,217,239,' + opacity + ')';
        ctx.fillText(mark.glyph, mark.x + 3, mark.y + 12);
      }
      frame = marks.length ? requestAnimationFrame(paintTrail) : 0;
    }

    fitTrail();
    window.addEventListener('resize', fitTrail, {passive: true});
    window.addEventListener('pointermove', event => {
      if (event.pointerType !== 'mouse' || reduceMotion.matches || !finePointer.matches) return;
      const x = Math.floor(event.clientX / cellSize) * cellSize;
      const y = Math.floor(event.clientY / cellSize) * cellSize;
      if (x === lastX && y === lastY) return;
      lastX = x;
      lastY = y;
      marks.push({x, y, time: performance.now(), glyph: glyphs[index % glyphs.length], warm: index % 4 === 0});
      index++;
      if (marks.length > 32) marks.shift();
      if (!frame) frame = requestAnimationFrame(paintTrail);
    }, {passive: true});
  }
}
