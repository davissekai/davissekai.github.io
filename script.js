/**
 * Portfolio site interactivity.
 * Handles navigation, scroll reveals, and scroll state.
 */

(function () {
    'use strict';

    const nav = document.getElementById('nav');
    const navToggle = document.getElementById('nav-toggle');
    const navLinks = document.getElementById('nav-links');
    const yearSpan = document.getElementById('year');

    /**
     * Update footer year dynamically.
     */
    function updateYear() {
        if (yearSpan) {
            yearSpan.textContent = String(new Date().getFullYear());
        }
    }

    /**
     * Toggle mobile navigation open/closed state.
     */
    function toggleNav() {
        const isOpen = navLinks ? navLinks.classList.contains('is-open') : false;
        if (navLinks) {
            navLinks.classList.toggle('is-open');
        }
        if (navToggle) {
            navToggle.classList.toggle('is-open');
            navToggle.setAttribute('aria-expanded', String(!isOpen));
        }
        document.body.style.overflow = isOpen ? '' : 'hidden';
    }

    /**
     * Close mobile navigation when a link is clicked.
     */
    function closeNavOnClick() {
        if (!navLinks) return;
        navLinks.querySelectorAll('a').forEach(function (link) {
            link.addEventListener('click', function () {
                if (navLinks.classList.contains('is-open')) {
                    toggleNav();
                }
            });
        });
    }

    /**
     * Add background to nav after scrolling past hero.
     */
    function handleNavScroll() {
        var scrollThreshold = 80;
        var isScrolled = window.scrollY > scrollThreshold;
        if (nav) {
            nav.classList.toggle('is-scrolled', isScrolled);
        }
    }

    /**
     * IntersectionObserver to reveal sections on scroll.
     */
    function initScrollReveals() {
        var observer = new IntersectionObserver(
            function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('is-visible');
                        observer.unobserve(entry.target);
                    }
                });
            },
            {
                root: null,
                rootMargin: '0px 0px -80px 0px',
                threshold: 0.1,
            }
        );

        document.querySelectorAll('.section-reveal').forEach(function (el) {
            observer.observe(el);
        });
    }

    /**
     * Initialize all interactive behaviors.
     */
    function init() {
        updateYear();
        closeNavOnClick();
        initScrollReveals();
        handleNavScroll();

        if (navToggle) {
            navToggle.addEventListener('click', toggleNav);
        }
        window.addEventListener('scroll', handleNavScroll, { passive: true });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
