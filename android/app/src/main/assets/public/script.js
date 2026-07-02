// ===== Navbar Scroll Effect =====
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 50);
});

// ===== Mobile Menu Toggle =====
const mobileToggle = document.getElementById('mobileToggle');
const navLinks = document.getElementById('navLinks');
mobileToggle.addEventListener('click', () => {
    navLinks.classList.toggle('active');
});

// Close menu on link click
navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
        navLinks.classList.remove('active');
    });
});

// ===== Counter Animation =====
function animateCounters() {
    const counters = document.querySelectorAll('.stat-number[data-target]');
    counters.forEach(counter => {
        const target = parseInt(counter.dataset.target);
        const duration = 2000;
        const start = performance.now();

        function update(now) {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            counter.textContent = Math.round(target * eased);
            if (progress < 1) requestAnimationFrame(update);
        }
        requestAnimationFrame(update);
    });
}

// ===== Intersection Observer for Animations =====
const observerOptions = {
    threshold: 0.2,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            if (entry.target.classList.contains('stats-bar')) {
                animateCounters();
            }
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

// Add fade-up class and observe
document.querySelectorAll('.step-card, .feature-list li, .board-card, .testimonial-card, .stat-item, .features-content, .features-visual').forEach(el => {
    el.classList.add('fade-up');
    observer.observe(el);
});

// Observe stats bar for counter animation
const statsBar = document.querySelector('.stats-bar');
if (statsBar) observer.observe(statsBar);

// Stagger animations for grid items
document.querySelectorAll('.boards-grid .board-card').forEach((card, i) => {
    card.style.transitionDelay = `${i * 0.08}s`;
});

document.querySelectorAll('.testimonials-grid .testimonial-card').forEach((card, i) => {
    card.style.transitionDelay = `${i * 0.1}s`;
});

document.querySelectorAll('.feature-list li').forEach((item, i) => {
    item.style.transitionDelay = `${i * 0.1}s`;
});

// ===== Smooth scroll for anchor links =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});
