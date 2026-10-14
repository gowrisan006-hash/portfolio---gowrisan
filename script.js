// Background particles
const cv = document.getElementById('bg');
const cx = cv.getContext('2d');

let W;
let H;
let pts = [];
let running = true;

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const dpr = Math.min(devicePixelRatio || 1, 2); // sharp on Windows high-DPI, capped for speed

function resize() {
  W = innerWidth;
  H = innerHeight;

  cv.width = W * dpr;
  cv.height = H * dpr;
  cv.style.width = W + 'px';
  cv.style.height = H + 'px';
  cx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const count = W < 700 ? 28 : W < 1100 ? 55 : 90; // fewer particles on mobile
  pts = Array.from({ length: count }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    vx: (Math.random() - 0.5) * 0.4,
    vy: (Math.random() - 0.5) * 0.4,
  }));
}

let resizeTimer;
addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(resize, 150);
});

resize();

document.addEventListener('visibilitychange', () => {
  running = !document.hidden;
  document.body.classList.toggle('paused', document.hidden);

  if (running) {
    draw();
  }
});

function draw() {
  if (!running || reduce) return;

  cx.clearRect(0, 0, W, H);

  pts.forEach((p, i) => {
    p.x += p.vx;
    p.y += p.vy;

    if (p.x < 0 || p.x > W) p.vx *= -1;
    if (p.y < 0 || p.y > H) p.vy *= -1;

    cx.fillStyle = 'rgba(126,217,87,.6)';
    cx.beginPath();
    cx.arc(p.x, p.y, 1.6, 0, Math.PI * 2);
    cx.fill();

    for (let j = i + 1; j < pts.length; j += 1) {
      const q = pts[j];
      const distance = Math.hypot(p.x - q.x, p.y - q.y);

      if (distance < 120) {
        cx.strokeStyle = `rgba(126,217,87,${0.15 * (1 - distance / 120)})`;
        cx.beginPath();
        cx.moveTo(p.x, p.y);
        cx.lineTo(q.x, q.y);
        cx.stroke();
      }
    }
  });

  requestAnimationFrame(draw);
}

draw();

// Cursor glow
const glow = document.getElementById('glow');

if (matchMedia('(hover:hover)').matches) {
  addEventListener('mousemove', (event) => {
    glow.style.left = event.clientX + 'px';
    glow.style.top = event.clientY + 'px';
  });
}

// Typing effect
const words = ['responsive websites', 'scalable APIs', 'React applications', 'real-world products'];
let wordIndex = 0;
let charIndex = 0;
let deleting = false;

const typed = document.getElementById('typed');

(function type() {
  const word = words[wordIndex];
  typed.textContent = word.slice(0, charIndex);

  if (!deleting && charIndex === word.length) {
    deleting = true;
    return setTimeout(type, 1400);
  }

  if (deleting && charIndex === 0) {
    deleting = false;
    wordIndex = (wordIndex + 1) % words.length;
  }

  charIndex += deleting ? -1 : 1;
  setTimeout(type, deleting ? 40 : 90);
})();

// "Full Stack Developer" popup text cycles with pop animation
const roles = ['FULL STACK DEVELOPER', 'REACT DEVELOPER', 'NODE.JS DEVELOPER', 'UI ENGINEER'];
let roleIndex = 0;
const pop = document.getElementById('rolePop');
const roleText = document.getElementById('roleText');

setInterval(() => {
  pop.style.animation = 'none';
  pop.offsetHeight;

  roleIndex = (roleIndex + 1) % roles.length;
  roleText.textContent = roles[roleIndex];
  pop.style.opacity = 1;
  pop.style.transform = 'scale(1)';

  pop.animate(
    [
      { transform: 'scale(.4)', opacity: 0 },
      { transform: 'scale(1.15)', opacity: 1 },
      { transform: 'scale(1)' },
    ],
    { duration: 600, easing: 'ease-out' }
  );
}, 3500);

// Scroll reveal + skill bars + counters
const io = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;

      entry.target.classList.add('show');
      entry.target.querySelectorAll('.bar').forEach((bar) => {
        bar.style.setProperty('--v', bar.dataset.v);
        bar.classList.add('on');
      });

      io.unobserve(entry.target);
    });
  },
  { threshold: 0.2 }
);

document.querySelectorAll('.reveal').forEach((element) => io.observe(element));

document.querySelectorAll('[data-count]').forEach((element) => {
  const total = Number(element.dataset.count);
  let current = 0;

  setTimeout(() => {
    const timer = setInterval(() => {
      current += 1;
      element.textContent = current;

      if (current >= total) {
        clearInterval(timer);
      }
    }, 1200 / total);
  }, 2400);
});

// Tilt on cards
if (matchMedia('(hover:hover)').matches) {
  document.querySelectorAll('.card').forEach((card) => {
    card.addEventListener('mousemove', (event) => {
      const bounds = card.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width - 0.5;
      const y = (event.clientY - bounds.top) / bounds.height - 0.5;

      card.style.transform = `perspective(800px) rotateY(${x * 6}deg) rotateX(${ -y * 6}deg) translateY(-6px)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
}

// Contact form (demo)
document.getElementById("form").addEventListener("submit", async (event) => {
  event.preventDefault();

  const form = event.target;
  const msg = document.getElementById("msg");

  const formData = {
    name: form.name.value,
    email: form.email.value,
    subject: form.subject.value,
    message: form.message.value,
  };

  msg.textContent = "Sending...";

  try {
    const response = await fetch("https://portfolio-gowrisan-backend.onrender.com/send-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    });

    const data = await response.json();

    if (response.ok) {
      msg.textContent = "✅ Message sent successfully!";
      form.reset();
    } else {
      msg.textContent = "❌ " + data.message + " - " + (data.error || "Unknown error");
    }
  } catch (error) {
    console.error(error);
    msg.textContent = "❌ Unable to connect to server.";
  }
});
// Mobile menu
const burger = document.getElementById('burger');
const links = document.getElementById('links');

function toggleMenu(open) {
  burger.classList.toggle('open', open);
  links.classList.toggle('open', open);
  document.body.classList.toggle('menu', open);
  burger.setAttribute('aria-expanded', open);
}

burger.addEventListener('click', () => toggleMenu(!links.classList.contains('open')));
links.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => toggleMenu(false));
});

addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    toggleMenu(false);
  }
});

addEventListener('resize', () => {
  if (innerWidth > 900) {
    toggleMenu(false);
  }
});

// ---------- Project filter ----------
document.querySelectorAll('.f').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.f').forEach((item) => item.classList.remove('on'));
    button.classList.add('on');

    const filter = button.dataset.f;

    document.querySelectorAll('.pj').forEach((card) => {
      const show = filter === 'all' || card.dataset.c === filter;

      if (show) {
        card.style.display = '';
        requestAnimationFrame(() => card.classList.remove('hide'));
      } else {
        card.classList.add('hide');
        setTimeout(() => {
          if (card.classList.contains('hide')) {
            card.style.display = 'none';
          }
        }, 400);
      }
    });
  });
});

// ---------- FAQ accordion ----------
document.querySelectorAll('.q button').forEach((button) => {
  button.addEventListener('click', () => {
    const question = button.parentElement;
    const wasOpen = question.classList.contains('open');

    document.querySelectorAll('.q').forEach((item) => item.classList.remove('open'));

    if (!wasOpen) {
      question.classList.add('open');
    }
  });
});

// ---------- Journey timeline fill ----------
(function timeline() {
  const timelineEl = document.getElementById('tl');
  const fill = document.getElementById('tlFill');
  const items = [...timelineEl.querySelectorAll('.tl-item')];

  function updateTimeline() {
    const rect = timelineEl.getBoundingClientRect();
    const midpoint = innerHeight * 0.6;

    fill.style.height = `${Math.min(100, Math.max(0, ((midpoint - rect.top) / rect.height) * 100))}%`;
    items.forEach((item) => {
      item.classList.toggle('on', item.getBoundingClientRect().top < midpoint);
    });
  }

  addEventListener('scroll', updateTimeline, { passive: true });
  updateTimeline();
})();

