/* ── CURSOR ── */
const cursor = document.getElementById('cursor');
const ring   = document.getElementById('cursor-ring');
let mx=0,my=0,rx=0,ry=0;
document.addEventListener('mousemove', e => {
  mx = e.clientX; my = e.clientY;
  cursor.style.left = mx+'px'; cursor.style.top = my+'px';
});
(function lerpRing(){
  rx += (mx-rx)*.12; ry += (my-ry)*.12;
  ring.style.left = rx+'px'; ring.style.top = ry+'px';
  requestAnimationFrame(lerpRing);
})();

/* ── SMART EMAIL COMPOSE ── */
// Detects the recipient's webmail provider from their address and opens
// the matching compose UI directly (Gmail, Outlook, Yahoo, etc).
// Falls back to mailto: for unknown providers or if popup is blocked.
window.openSmartMail = function(toAddress, { subject = '', body = '', cc = '', bcc = '' } = {}) {
  const domain = toAddress.split('@')[1]?.toLowerCase() || '';
  const qs = (params) => Object.entries(params)
    .filter(([,v]) => v)
    .map(([k,v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&');

  let composeUrl = null;

  if (/gmail\.com|googlemail\.com/.test(domain)) {
    composeUrl = `https://mail.google.com/mail/?view=cm&fs=1&${qs({ to: toAddress, su: subject, body, cc, bcc })}`;
  } else if (/outlook\.com|hotmail\.com|live\.com|msn\.com/.test(domain)) {
    composeUrl = `https://outlook.live.com/mail/0/deeplink/compose?${qs({ to: toAddress, subject, body })}`;
  } else if (/yahoo\.com|yahoo\.co\.[a-z]+/.test(domain)) {
    composeUrl = `https://compose.mail.yahoo.com/?${qs({ to: toAddress, subject, body })}`;
  } else if (/zoho\.com/.test(domain)) {
    composeUrl = `https://mail.zoho.com/zm/#mail/compose?${qs({ to: toAddress, subject, body })}`;
  } else if (/icloud\.com|me\.com|mac\.com/.test(domain)) {
    // iCloud webmail compose isn't deep-linkable cross-origin; fall through to mailto
    composeUrl = null;
  }

  const mailto = `mailto:${toAddress}?${qs({ subject, body, cc, bcc })}`;

  if (composeUrl) {
    const win = window.open(composeUrl, '_blank', 'noopener');
    // If popup blocked (win is null or immediately closed), fall back to mailto
    if (!win) window.location.href = mailto;
  } else {
    window.location.href = mailto;
  }
};

/* ── SCROLL PROGRESS BAR ── */
const progressBar = document.getElementById('scroll-progress');
if(progressBar){
  window.addEventListener('scroll', () => {
    const h = document.documentElement;
    const scrolled = (h.scrollTop) / (h.scrollHeight - h.clientHeight) * 100;
    progressBar.style.width = scrolled + '%';
  }, { passive: true });
}

/* ── MAGNETIC BUTTONS ── */
document.querySelectorAll('.btn-primary, .btn-secondary, .nav-cta').forEach(btn => {
  btn.addEventListener('mousemove', e => {
    const r = btn.getBoundingClientRect();
    const x = e.clientX - r.left - r.width/2;
    const y = e.clientY - r.top - r.height/2;
    btn.style.transform = `translate(${x*0.18}px, ${y*0.35}px)`;
  });
  btn.addEventListener('mouseleave', () => { btn.style.transform = ''; });
});

/* ── 3D TILT ON CARDS ── */
document.querySelectorAll('.card').forEach(card => {
  card.addEventListener('mousemove', e => {
    const r = card.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    card.style.transform = `perspective(800px) rotateY(${px*4}deg) rotateX(${-py*4}deg) translateY(-4px)`;
  });
  card.addEventListener('mouseleave', () => { card.style.transform = ''; });
});

/* ── PARTICLE CANVAS ── */
const canvas = document.getElementById('bg-canvas');
const ctx    = canvas.getContext('2d');
let W, H, particles = [];
function resize(){ W = canvas.width = innerWidth; H = canvas.height = innerHeight; }
resize(); window.addEventListener('resize', resize);

class Particle {
  constructor(){ this.reset(); }
  reset(){
    this.x = Math.random()*W; this.y = Math.random()*H;
    this.r = Math.random()*1.4+.3;
    this.vx = (Math.random()-.5)*.28; this.vy = (Math.random()-.5)*.28;
    this.alpha = Math.random()*.5+.12;
    this.color = Math.random()<.5 ? '91,127,255' : '167,139,250';
  }
  update(){ this.x+=this.vx; this.y+=this.vy; if(this.x<0||this.x>W||this.y<0||this.y>H) this.reset(); }
  draw(){
    ctx.beginPath(); ctx.arc(this.x,this.y,this.r,0,Math.PI*2);
    ctx.fillStyle=`rgba(${this.color},${this.alpha})`; ctx.fill();
  }
}
for(let i=0;i<110;i++) particles.push(new Particle());

function drawConn(){
  for(let i=0;i<particles.length;i++){
    for(let j=i+1;j<particles.length;j++){
      const dx=particles[i].x-particles[j].x, dy=particles[i].y-particles[j].y;
      const d=Math.sqrt(dx*dx+dy*dy);
      if(d<115){
        ctx.beginPath(); ctx.moveTo(particles[i].x,particles[i].y);
        ctx.lineTo(particles[j].x,particles[j].y);
        ctx.strokeStyle=`rgba(91,127,255,${.09*(1-d/115)})`; ctx.lineWidth=.5; ctx.stroke();
      }
    }
  }
}
(function animCanvas(){
  ctx.clearRect(0,0,W,H); drawConn();
  particles.forEach(p=>{ p.update(); p.draw(); });
  requestAnimationFrame(animCanvas);
})();

/* ── NAV ── */
const navbar = document.getElementById('navbar');

// scrolled glass effect
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', scrollY > 40);
}, { passive: true });

// mark active page
const path = location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('.nav-links a, .nav-mobile-menu a').forEach(a => {
  const href = a.getAttribute('href');
  if(href === path || (path === 'index.html' && href === 'index.html')) {
    a.classList.add('active');
  }
});

// mobile menu
const mobileBtn  = document.getElementById('mobile-btn');
const mobileMenu = document.getElementById('mobile-menu');
if(mobileBtn && mobileMenu){
  mobileBtn.addEventListener('click', () => mobileMenu.classList.toggle('open'));
  mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => mobileMenu.classList.remove('open')));
}

/* ── SCROLL REVEAL ── */
const io = new IntersectionObserver(entries => {
  entries.forEach(e => { if(e.isIntersecting){ e.target.classList.add('visible'); io.unobserve(e.target); }});
}, { threshold: .1 });
document.querySelectorAll('.reveal,.reveal-left,.reveal-scale').forEach(el => io.observe(el));

/* ── CARD SPOTLIGHT ── */
document.querySelectorAll('.card').forEach(card => {
  card.addEventListener('mousemove', e => {
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', (e.clientX-r.left)+'px');
    card.style.setProperty('--my', (e.clientY-r.top)+'px');
  });
});

/* ── MARQUEE (if present) ── */
const track = document.getElementById('marquee');
if(track){
  const skills = ['React Native','Expo','Redux Toolkit','React.js','Vite','TypeScript','Node.js','MongoDB','REST APIs','Flask','Python','NLP','Supabase','PostgreSQL','Git','JMeter','Postman'];
  const doubled = [...skills,...skills].map(s=>`<span class="marquee-item"><span class="dot"></span>${s}</span>`).join('');
  track.innerHTML = doubled;
}

/* ── COUNTER ANIMATION ── */
window.animCounter = function(el, target, suffix='', duration=1200){
  const start = performance.now();
  (function tick(now){
    const p = Math.min((now-start)/duration, 1);
    const ease = 1-Math.pow(1-p, 3);
    el.textContent = Math.round(ease*target) + (p>=1 ? suffix : '');
    if(p<1) requestAnimationFrame(tick);
  })(performance.now());
};
