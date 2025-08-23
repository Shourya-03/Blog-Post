// Enhanced main.js - Modern JavaScript for The Unconventional Life website
// ============================================================================

// Performance and Web Vitals Monitoring
class PerformanceMonitor {
    constructor() {
        this.metrics = {};
        this.observer = null;
        this.initializeMonitoring();
    }

    initializeMonitoring() {
        // Core Web Vitals
        this.measureCLS();
        this.measureFID();
        this.measureLCP();
        this.measureFCP();

        // Custom metrics
        this.measureDOMContentLoaded();
        this.measurePageLoad();
    }

    measureCLS() {
        if ('PerformanceObserver' in window) {
            const observer = new PerformanceObserver((list) => {
                let cls = 0;
                list.getEntries().forEach((entry) => {
                    if (!entry.hadRecentInput) {
                        cls += entry.value;
                    }
                });
                this.metrics.cls = cls;
                this.updateDisplay();
            });
            observer.observe({ entryTypes: ['layout-shift'] });
        }
    }

    measureFID() {
        if ('PerformanceObserver' in window) {
            const observer = new PerformanceObserver((list) => {
                list.getEntries().forEach((entry) => {
                    this.metrics.fid = entry.processingStart - entry.startTime;
                    this.updateDisplay();
                });
            });
            observer.observe({ entryTypes: ['first-input'] });
        }
    }

    measureLCP() {
        if ('PerformanceObserver' in window) {
            const observer = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                const lastEntry = entries[entries.length - 1];
                this.metrics.lcp = lastEntry.startTime;
                this.updateDisplay();
            });
            observer.observe({ entryTypes: ['largest-contentful-paint'] });
        }
    }

    measureFCP() {
        if ('PerformanceObserver' in window) {
            const observer = new PerformanceObserver((list) => {
                list.getEntries().forEach((entry) => {
                    if (entry.name === 'first-contentful-paint') {
                        this.metrics.fcp = entry.startTime;
                        this.updateDisplay();
                    }
                });
            });
            observer.observe({ entryTypes: ['paint'] });
        }
    }

    measureDOMContentLoaded() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.metrics.domContentLoaded = performance.now();
                this.updateDisplay();
            });
        } else {
            this.metrics.domContentLoaded = performance.now();
        }
    }

    measurePageLoad() {
        window.addEventListener('load', () => {
            this.metrics.pageLoad = performance.now();
            this.updateDisplay();
        });
    }

    updateDisplay() {
        const monitor = document.getElementById('performance-monitor');
        if (monitor && !monitor.classList.contains('hidden')) {
            monitor.innerHTML = `
                <div>FCP: ${(this.metrics.fcp || 0).toFixed(0)}ms</div>
                <div>LCP: ${(this.metrics.lcp || 0).toFixed(0)}ms</div>
                <div>FID: ${(this.metrics.fid || 0).toFixed(0)}ms</div>
                <div>CLS: ${(this.metrics.cls || 0).toFixed(3)}</div>
                <div>Load: ${(this.metrics.pageLoad || 0).toFixed(0)}ms</div>
            `;
        }
    }

    getMetrics() {
        return this.metrics;
    }
}

// Utility Functions
const Utils = {
    // Debounce function for performance optimization
    debounce(func, wait, immediate = false) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                timeout = null;
                if (!immediate) func.apply(this, args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func.apply(this, args);
        };
    },

    // Throttle function for scroll events
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    // Check if element is in viewport
    isInViewport(element) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    },

    // Smooth scroll with fallback
    smoothScrollTo(target, duration = 800) {
        const targetElement = typeof target === 'string' ? document.querySelector(target) : target;
        if (!targetElement) return;

        if ('scrollBehavior' in document.documentElement.style) {
            targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
            // Fallback for older browsers
            const start = window.pageYOffset;
            const targetPosition = targetElement.getBoundingClientRect().top + start;
            const distance = targetPosition - start;
            let currentTime = 0;

            const animateScroll = () => {
                currentTime += 16;
                const progress = Math.min(currentTime / duration, 1);
                const ease = 0.5 * (1 - Math.cos(progress * Math.PI));
                window.scrollTo(0, start + distance * ease);

                if (progress < 1) {
                    requestAnimationFrame(animateScroll);
                }
            };

            animateScroll();
        }
    },

    // Local storage with error handling
    storage: {
        set(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (e) {
                console.warn('LocalStorage not available:', e);
                return false;
            }
        },

        get(key) {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : null;
            } catch (e) {
                console.warn('Error reading from localStorage:', e);
                return null;
            }
        },

        remove(key) {
            try {
                localStorage.removeItem(key);
                return true;
            } catch (e) {
                console.warn('Error removing from localStorage:', e);
                return false;
            }
        }
    },

    // Generate unique ID
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    // Format date
    formatDate(date) {
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }).format(new Date(date));
    }
};

// Modern Navigation Manager
class NavigationManager {
    constructor() {
        this.navToggle = document.getElementById('navToggle');
        this.navMenu = document.getElementById('navMenu');
        this.isOpen = false;

        this.init();
    }

    init() {
        this.bindEvents();
        this.handleKeyboardNavigation();
        this.setupFocusTrap();
    }

    bindEvents() {
        if (this.navToggle && this.navMenu) {
            this.navToggle.addEventListener('click', this.toggleMenu.bind(this));

            // Close menu when clicking outside
            document.addEventListener('click', (e) => {
                if (this.isOpen && !this.navMenu.contains(e.target) && !this.navToggle.contains(e.target)) {
                    this.closeMenu();
                }
            });

            // Close menu on escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.isOpen) {
                    this.closeMenu();
                    this.navToggle.focus();
                }
            });

            // Handle menu link clicks
            this.navMenu.querySelectorAll('.nav-link').forEach(link => {
                link.addEventListener('click', () => {
                    this.closeMenu();
                });
            });
        }
    }

    toggleMenu() {
        this.isOpen ? this.closeMenu() : this.openMenu();
    }

    openMenu() {
        this.isOpen = true;
        this.navMenu.classList.add('open');
        this.navToggle.setAttribute('aria-expanded', 'true');

        // Focus first menu item
        const firstLink = this.navMenu.querySelector('.nav-link');
        if (firstLink) {
            setTimeout(() => firstLink.focus(), 100);
        }
    }

    closeMenu() {
        this.isOpen = false;
        this.navMenu.classList.remove('open');
        this.navToggle.setAttribute('aria-expanded', 'false');
    }

    handleKeyboardNavigation() {
        if (!this.navMenu) return;

        this.navMenu.addEventListener('keydown', (e) => {
            const links = Array.from(this.navMenu.querySelectorAll('.nav-link:not([disabled])'));
            const currentIndex = links.indexOf(e.target);

            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    const nextIndex = (currentIndex + 1) % links.length;
                    links[nextIndex].focus();
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    const prevIndex = currentIndex === 0 ? links.length - 1 : currentIndex - 1;
                    links[prevIndex].focus();
                    break;
                case 'Home':
                    e.preventDefault();
                    links[0].focus();
                    break;
                case 'End':
                    e.preventDefault();
                    links[links.length - 1].focus();
                    break;
            }
        });
    }

    setupFocusTrap() {
        // Focus trap implementation for mobile menu
        const focusableElements = this.navMenu.querySelectorAll(
            'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select, [tabindex]:not([tabindex="-1"])'
        );

        const firstFocusableElement = focusableElements[0];
        const lastFocusableElement = focusableElements[focusableElements.length - 1];

        this.navMenu.addEventListener('keydown', (e) => {
            if (!this.isOpen) return;

            if (e.key === 'Tab') {
                if (e.shiftKey) {
                    if (document.activeElement === firstFocusableElement) {
                        lastFocusableElement.focus();
                        e.preventDefault();
                    }
                } else {
                    if (document.activeElement === lastFocusableElement) {
                        firstFocusableElement.focus();
                        e.preventDefault();
                    }
                }
            }
        });
    }
}

// Enhanced Slider/Carousel with Modern APIs
class EnhancedSlider {
    constructor(containerSelector) {
        this.container = document.querySelector(containerSelector);
        this.slides = Array.from(this.container?.children || []);
        this.currentSlide = 0;
        this.isAutoPlaying = true;
        this.autoPlayInterval = null;
        this.touchStartX = 0;
        this.touchEndX = 0;

        this.prevButton = document.getElementById('sliderPrev');
        this.nextButton = document.getElementById('sliderNext');
        this.dots = Array.from(document.getElementById('sliderDots')?.children || []);

        this.init();
    }

    init() {
        if (!this.container) return;

        this.setupEventListeners();
        this.setupIntersectionObserver();
        this.setupKeyboardNavigation();
        this.setupTouchNavigation();
        this.updateSlider(0);
        this.startAutoPlay();
    }

    setupEventListeners() {
        if (this.prevButton) {
            this.prevButton.addEventListener('click', () => this.previousSlide());
        }

        if (this.nextButton) {
            this.nextButton.addEventListener('click', () => this.nextSlide());
        }

        this.dots.forEach((dot, index) => {
            dot.addEventListener('click', () => this.goToSlide(index));
        });

        // Pause auto-play on hover
        this.container.addEventListener('mouseenter', () => this.pauseAutoPlay());
        this.container.addEventListener('mouseleave', () => this.resumeAutoPlay());

        // Pause auto-play when focused
        this.container.addEventListener('focusin', () => this.pauseAutoPlay());
        this.container.addEventListener('focusout', () => this.resumeAutoPlay());
    }

    setupIntersectionObserver() {
        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this.resumeAutoPlay();
                    } else {
                        this.pauseAutoPlay();
                    }
                });
            }, { threshold: 0.5 });

            observer.observe(this.container);
        }
    }

    setupKeyboardNavigation() {
        this.container.addEventListener('keydown', (e) => {
            switch (e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    this.previousSlide();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.nextSlide();
                    break;
                case 'Home':
                    e.preventDefault();
                    this.goToSlide(0);
                    break;
                case 'End':
                    e.preventDefault();
                    this.goToSlide(this.slides.length - 1);
                    break;
            }
        });
    }

    setupTouchNavigation() {
        this.container.addEventListener('touchstart', (e) => {
            this.touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        this.container.addEventListener('touchend', (e) => {
            this.touchEndX = e.changedTouches[0].screenX;
            this.handleTouchGesture();
        }, { passive: true });
    }

    handleTouchGesture() {
        const threshold = 50; // minimum swipe distance
        const swipeDistance = Math.abs(this.touchEndX - this.touchStartX);

        if (swipeDistance > threshold) {
            if (this.touchEndX < this.touchStartX) {
                this.nextSlide();
            } else {
                this.previousSlide();
            }
        }
    }

    updateSlider(position) {
        this.currentSlide = position;

        // Update slider position
        const slideWidth = this.container.clientWidth;
        this.container.scrollTo({ 
            left: position * slideWidth, 
            behavior: 'smooth' 
        });

        // Update dots
        this.dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === position);
            dot.setAttribute('aria-selected', index === position ? 'true' : 'false');
        });

        // Update ARIA attributes
        this.slides.forEach((slide, index) => {
            slide.setAttribute('aria-hidden', index !== position ? 'true' : 'false');
        });

        // Announce to screen readers
        const announcement = `Slide ${position + 1} of ${this.slides.length}`;
        this.announceToScreenReader(announcement);
    }

    nextSlide() {
        const next = (this.currentSlide + 1) % this.slides.length;
        this.updateSlider(next);
    }

    previousSlide() {
        const prev = this.currentSlide === 0 ? this.slides.length - 1 : this.currentSlide - 1;
        this.updateSlider(prev);
    }

    goToSlide(index) {
        if (index >= 0 && index < this.slides.length) {
            this.updateSlider(index);
        }
    }

    startAutoPlay() {
        if (this.slides.length > 1) {
            this.autoPlayInterval = setInterval(() => {
                if (this.isAutoPlaying) {
                    this.nextSlide();
                }
            }, 5000);
        }
    }

    pauseAutoPlay() {
        this.isAutoPlaying = false;
    }

    resumeAutoPlay() {
        this.isAutoPlaying = true;
    }

    announceToScreenReader(message) {
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.className = 'sr-only';
        announcement.textContent = message;

        document.body.appendChild(announcement);
        setTimeout(() => document.body.removeChild(announcement), 1000);
    }
}

// Enhanced Form Manager
class FormManager {
    constructor() {
        this.forms = document.querySelectorAll('form');
        this.init();
    }

    init() {
        this.forms.forEach(form => this.enhanceForm(form));
    }

    enhanceForm(form) {
        const inputs = form.querySelectorAll('input, textarea, select');

        inputs.forEach(input => {
            this.addValidation(input);
            this.addAccessibilityFeatures(input);
        });

        form.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    addValidation(input) {
        const showError = (message) => {
            const errorElement = input.parentNode.querySelector('.error-message') || 
                                this.createErrorElement(input);
            errorElement.textContent = message;
            errorElement.classList.add('show');
            input.setAttribute('aria-invalid', 'true');
            input.setAttribute('aria-describedby', errorElement.id);
        };

        const hideError = () => {
            const errorElement = input.parentNode.querySelector('.error-message');
            if (errorElement) {
                errorElement.classList.remove('show');
                input.setAttribute('aria-invalid', 'false');
                input.removeAttribute('aria-describedby');
            }
        };

        const validateInput = () => {
            if (input.hasAttribute('required') && !input.value.trim()) {
                showError('This field is required');
                return false;
            }

            if (input.type === 'email' && input.value) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(input.value)) {
                    showError('Please enter a valid email address');
                    return false;
                }
            }

            hideError();
            return true;
        };

        input.addEventListener('blur', validateInput);
        input.addEventListener('input', Utils.debounce(validateInput, 300));
    }

    createErrorElement(input) {
        const errorElement = document.createElement('div');
        errorElement.className = 'error-message';
        errorElement.id = `${input.id || input.name}-error`;
        errorElement.setAttribute('role', 'alert');
        input.parentNode.appendChild(errorElement);
        return errorElement;
    }

    addAccessibilityFeatures(input) {
        // Add ARIA labels for better screen reader support
        if (!input.getAttribute('aria-label') && !input.getAttribute('aria-labelledby')) {
            const label = input.parentNode.querySelector('label');
            if (label) {
                const labelId = label.id || `label-${Utils.generateId()}`;
                label.id = labelId;
                input.setAttribute('aria-labelledby', labelId);
            }
        }
    }

    handleSubmit(e) {
        const form = e.target;
        const inputs = form.querySelectorAll('input[required], textarea[required], select[required]');
        let isValid = true;

        inputs.forEach(input => {
            if (!this.validateField(input)) {
                isValid = false;
            }
        });

        if (!isValid) {
            e.preventDefault();
            const firstInvalidField = form.querySelector('[aria-invalid="true"]');
            if (firstInvalidField) {
                firstInvalidField.focus();
            }
        } else {
            this.handleFormSuccess(form);
        }
    }

    validateField(input) {
        // Custom validation logic here
        return input.checkValidity();
    }

    handleFormSuccess(form) {
        if (form.id === 'newsletterForm') {
            this.handleNewsletterSuccess();
        }
    }

    handleNewsletterSuccess() {
        const form = document.getElementById('newsletterForm');
        const successMessage = document.getElementById('newsletter-success');

        if (form && successMessage) {
            form.style.display = 'none';
            successMessage.classList.remove('hidden');

            // Save subscription status
            Utils.storage.set('newsletter-subscribed', {
                subscribed: true,
                date: new Date().toISOString()
            });
        }
    }
}

// Animation and Intersection Observer Manager
class AnimationManager {
    constructor() {
        this.animatedElements = document.querySelectorAll('[data-animate]');
        this.init();
    }

    init() {
        this.setupIntersectionObserver();
        this.setupScrollAnimations();
    }

    setupIntersectionObserver() {
        if ('IntersectionObserver' in window) {
            const observerOptions = {
                threshold: 0.1,
                rootMargin: '0px 0px -50px 0px'
            };

            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this.animateElement(entry.target);
                        observer.unobserve(entry.target);
                    }
                });
            }, observerOptions);

            // Observe elements for animation
            document.querySelectorAll('.post-card, .testimonial-card, .slide, .faq-item, .section-title').forEach(el => {
                observer.observe(el);
            });
        } else {
            // Fallback for browsers without IntersectionObserver
            this.fallbackAnimations();
        }
    }

    animateElement(element) {
        const animationType = element.dataset.animate || 'slideInUp';
        element.classList.add('animate-in');

        // Add specific animation class based on position
        if (element.getBoundingClientRect().left < window.innerWidth / 2) {
            element.classList.add('animate-left');
        }
    }

    setupScrollAnimations() {
        const throttledScrollHandler = Utils.throttle(() => {
            this.updateScrollProgress();
        }, 16);

        window.addEventListener('scroll', throttledScrollHandler, { passive: true });
    }

    updateScrollProgress() {
        const scrolled = window.pageYOffset;
        const maxHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollProgress = (scrolled / maxHeight) * 100;

        // Update any progress indicators
        document.documentElement.style.setProperty('--scroll-progress', `${scrollProgress}%`);
    }

    fallbackAnimations() {
        // Simple fallback animations for older browsers
        setTimeout(() => {
            document.querySelectorAll('.post-card, .testimonial-card, .slide').forEach((el, index) => {
                setTimeout(() => {
                    el.classList.add('animate-in');
                }, index * 100);
            });
        }, 500);
    }
}

// PWA Manager
class PWAManager {
    constructor() {
        this.deferredPrompt = null;
        this.installButton = document.getElementById('pwa-install-btn');
        this.dismissButton = document.getElementById('pwa-dismiss-btn');
        this.banner = document.getElementById('pwa-install-banner');

        this.init();
    }

    init() {
        this.setupInstallPrompt();
        this.setupEventListeners();
        this.checkInstallStatus();
    }

    setupInstallPrompt() {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            this.showInstallBanner();
        });

        window.addEventListener('appinstalled', () => {
            this.hideInstallBanner();
            this.deferredPrompt = null;

            // Track installation
            if ('gtag' in window) {
                gtag('event', 'pwa_install', {
                    event_category: 'engagement',
                    event_label: 'PWA Installation'
                });
            }
        });
    }

    setupEventListeners() {
        if (this.installButton) {
            this.installButton.addEventListener('click', () => {
                this.promptInstall();
            });
        }

        if (this.dismissButton) {
            this.dismissButton.addEventListener('click', () => {
                this.dismissInstallBanner();
            });
        }
    }

    showInstallBanner() {
        if (this.banner && !this.isInstallDismissed()) {
            this.banner.classList.remove('hidden');
        }
    }

    hideInstallBanner() {
        if (this.banner) {
            this.banner.classList.add('hidden');
        }
    }

    async promptInstall() {
        if (this.deferredPrompt) {
            this.deferredPrompt.prompt();
            const { outcome } = await this.deferredPrompt.userChoice;

            if (outcome === 'accepted') {
                console.log('User accepted the install prompt');
            } else {
                console.log('User dismissed the install prompt');
            }

            this.deferredPrompt = null;
            this.hideInstallBanner();
        }
    }

    dismissInstallBanner() {
        this.hideInstallBanner();
        Utils.storage.set('pwa-install-dismissed', {
            dismissed: true,
            date: new Date().toISOString()
        });
    }

    isInstallDismissed() {
        const dismissData = Utils.storage.get('pwa-install-dismissed');
        if (!dismissData) return false;

        const dismissDate = new Date(dismissData.date);
        const now = new Date();
        const daysSinceDismiss = (now - dismissDate) / (1000 * 60 * 60 * 24);

        return daysSinceDismiss < 30; // Show again after 30 days
    }

    checkInstallStatus() {
        if (window.matchMedia('(display-mode: standalone)').matches) {
            // App is installed and running in standalone mode
            this.hideInstallBanner();
        }
    }
}

// Enhanced Theme Manager
class ThemeManager {
    constructor() {
        this.themeToggle = document.getElementById('toggleTheme');
        this.currentTheme = this.getStoredTheme() || this.getSystemTheme();

        this.init();
    }

    init() {
        this.applyTheme(this.currentTheme);
        this.setupEventListeners();
        this.watchSystemTheme();
    }

    setupEventListeners() {
        if (this.themeToggle) {
            this.themeToggle.addEventListener('change', () => {
                const newTheme = this.themeToggle.checked ? 'dark' : 'light';
                this.applyTheme(newTheme);
            });
        }
    }

    applyTheme(theme) {
        this.currentTheme = theme;
        document.documentElement.setAttribute('data-color-scheme', theme);

        if (this.themeToggle) {
            this.themeToggle.checked = theme === 'dark';
        }

        Utils.storage.set('theme', theme);

        // Update meta theme-color
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            metaThemeColor.content = theme === 'dark' ? '#1f2121' : '#fcfcf9';
        }
    }

    getStoredTheme() {
        return Utils.storage.get('theme');
    }

    getSystemTheme() {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    watchSystemTheme() {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQuery.addEventListener('change', (e) => {
            if (!Utils.storage.get('theme')) {
                this.applyTheme(e.matches ? 'dark' : 'light');
            }
        });
    }
}

// Search and Filter Manager
class SearchFilterManager {
    constructor() {
        this.searchInput = document.getElementById('blog-search');
        this.categoryFilter = document.getElementById('category-filter');
        this.posts = document.querySelectorAll('.post-card');
        this.categories = document.querySelectorAll('.blog-category');

        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        if (this.searchInput) {
            this.searchInput.addEventListener('input', 
                Utils.debounce(() => this.filterPosts(), 300)
            );
        }

        if (this.categoryFilter) {
            this.categoryFilter.addEventListener('change', () => this.filterPosts());
        }
    }

    filterPosts() {
        const searchTerm = this.searchInput?.value.toLowerCase() || '';
        const selectedCategory = this.categoryFilter?.value || 'all';

        this.posts.forEach(post => {
            const title = post.querySelector('.post-title')?.textContent.toLowerCase() || '';
            const excerpt = post.querySelector('.post-excerpt')?.textContent.toLowerCase() || '';
            const category = post.dataset.category || '';

            const matchesSearch = title.includes(searchTerm) || excerpt.includes(searchTerm);
            const matchesCategory = selectedCategory === 'all' || category === selectedCategory;

            post.style.display = matchesSearch && matchesCategory ? 'block' : 'none';
        });

        // Show/hide category sections
        this.categories.forEach(categorySection => {
            const categoryName = categorySection.dataset.category;
            const hasVisiblePosts = categorySection.querySelectorAll('.post-card:not([style*="display: none"])').length > 0;

            if (selectedCategory === 'all') {
                categorySection.style.display = hasVisiblePosts ? 'block' : 'none';
            } else {
                categorySection.style.display = categoryName === selectedCategory ? 'block' : 'none';
            }
        });

        this.updateSearchResults();
    }

    updateSearchResults() {
        const visiblePosts = document.querySelectorAll('.post-card:not([style*="display: none"])').length;

        // Could add a results counter or empty state here
        if (visiblePosts === 0 && (this.searchInput?.value || this.categoryFilter?.value !== 'all')) {
            this.showNoResults();
        } else {
            this.hideNoResults();
        }
    }

    showNoResults() {
        let noResults = document.getElementById('no-results');
        if (!noResults) {
            noResults = document.createElement('div');
            noResults.id = 'no-results';
            noResults.className = 'empty-state';
            noResults.innerHTML = `
                <h4>No posts found</h4>
                <p>Try adjusting your search terms or filter criteria.</p>
            `;
            document.querySelector('.blog-section .container').appendChild(noResults);
        }
        noResults.style.display = 'block';
    }

    hideNoResults() {
        const noResults = document.getElementById('no-results');
        if (noResults) {
            noResults.style.display = 'none';
        }
    }
}

// Back to Top Enhanced Manager
class BackToTopManager {
    constructor() {
        this.button = document.getElementById('backToTop');
        this.showOffset = 300;
        this.isVisible = false;

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupIntersectionObserver();
    }

    setupEventListeners() {
        if (this.button) {
            this.button.addEventListener('click', () => {
                Utils.smoothScrollTo(document.body);

                // Track interaction
                if ('gtag' in window) {
                    gtag('event', 'scroll_to_top', {
                        event_category: 'engagement'
                    });
                }
            });
        }

        const throttledScrollHandler = Utils.throttle(() => {
            this.handleScroll();
        }, 100);

        window.addEventListener('scroll', throttledScrollHandler, { passive: true });
    }

    setupIntersectionObserver() {
        if ('IntersectionObserver' in window) {
            const footer = document.querySelector('.footer');
            if (footer) {
                const observer = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting && this.button) {
                            this.button.style.bottom = `${entry.intersectionRect.height + 20}px`;
                        } else if (this.button) {
                            this.button.style.bottom = '24px';
                        }
                    });
                });
                observer.observe(footer);
            }
        }
    }

    handleScroll() {
        const shouldShow = window.pageYOffset > this.showOffset;

        if (shouldShow && !this.isVisible) {
            this.show();
        } else if (!shouldShow && this.isVisible) {
            this.hide();
        }
    }

    show() {
        this.isVisible = true;
        if (this.button) {
            this.button.classList.add('show');
        }
    }

    hide() {
        this.isVisible = false;
        if (this.button) {
            this.button.classList.remove('show');
        }
    }
}

// FAQ Manager with Enhanced Accessibility
class FAQManager {
    constructor() {
        this.faqItems = document.querySelectorAll('.faq-item');
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupKeyboardNavigation();
    }

    setupEventListeners() {
        this.faqItems.forEach(item => {
            const question = item.querySelector('.faq-question');
            if (question) {
                question.addEventListener('click', () => this.toggleFAQ(item));
            }
        });
    }

    setupKeyboardNavigation() {
        this.faqItems.forEach((item, index) => {
            const question = item.querySelector('.faq-question');
            if (question) {
                question.addEventListener('keydown', (e) => {
                    switch (e.key) {
                        case 'ArrowDown':
                            e.preventDefault();
                            this.focusNextFAQ(index);
                            break;
                        case 'ArrowUp':
                            e.preventDefault();
                            this.focusPreviousFAQ(index);
                            break;
                        case 'Home':
                            e.preventDefault();
                            this.focusFirstFAQ();
                            break;
                        case 'End':
                            e.preventDefault();
                            this.focusLastFAQ();
                            break;
                    }
                });
            }
        });
    }

    toggleFAQ(item) {
        const isOpen = item.classList.contains('open');
        const question = item.querySelector('.faq-question');

        item.classList.toggle('open');

        if (question) {
            question.setAttribute('aria-expanded', !isOpen);
        }

        // Smooth scroll to bring the opened FAQ into view
        if (!isOpen) {
            setTimeout(() => {
                item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 100);
        }
    }

    focusNextFAQ(currentIndex) {
        const nextIndex = (currentIndex + 1) % this.faqItems.length;
        const nextQuestion = this.faqItems[nextIndex].querySelector('.faq-question');
        if (nextQuestion) nextQuestion.focus();
    }

    focusPreviousFAQ(currentIndex) {
        const prevIndex = currentIndex === 0 ? this.faqItems.length - 1 : currentIndex - 1;
        const prevQuestion = this.faqItems[prevIndex].querySelector('.faq-question');
        if (prevQuestion) prevQuestion.focus();
    }

    focusFirstFAQ() {
        const firstQuestion = this.faqItems[0]?.querySelector('.faq-question');
        if (firstQuestion) firstQuestion.focus();
    }

    focusLastFAQ() {
        const lastQuestion = this.faqItems[this.faqItems.length - 1]?.querySelector('.faq-question');
        if (lastQuestion) lastQuestion.focus();
    }
}

// Global functions for backward compatibility and additional features
function subscribeToUpdates() {
    Utils.smoothScrollTo('#newsletter');

    setTimeout(() => {
        const emailInput = document.getElementById('email');
        if (emailInput) emailInput.focus();
    }, 800);
}

// Initialize everything when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Set current year
    const currentYearElements = document.querySelectorAll('#currentYear');
    currentYearElements.forEach(element => {
        element.textContent = new Date().getFullYear();
    });

    // Initialize all managers
    new PerformanceMonitor();
    new NavigationManager();
    new EnhancedSlider('#sliderContainer');
    new FormManager();
    new AnimationManager();
    new PWAManager();
    new ThemeManager();
    new SearchFilterManager();
    new BackToTopManager();
    new FAQManager();

    // Service Worker registration
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', async () => {
            try {
                const registration = await navigator.serviceWorker.register('/service-worker.js');
                console.log('SW registered: ', registration);

                // Handle updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // New update available
                            if (confirm('A new version is available. Reload to update?')) {
                                window.location.reload();
                            }
                        }
                    });
                });
            } catch (registrationError) {
                console.log('SW registration failed: ', registrationError);
            }
        });
    }

    // Initialize performance monitoring display (development only)
    const isLocalhost = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    if (isLocalhost) {
        const monitor = document.getElementById('performance-monitor');
        if (monitor) {
            monitor.classList.remove('hidden');
        }
    }

    // Add loading complete class for CSS transitions
    setTimeout(() => {
        document.body.classList.add('loaded');
    }, 100);
});

// Error handling and reporting
window.addEventListener('error', (e) => {
    console.error('JavaScript Error:', e.error);

    // Could send to error reporting service
    if ('gtag' in window) {
        gtag('event', 'exception', {
            description: e.error.toString(),
            fatal: false
        });
    }
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('Unhandled Promise Rejection:', e.reason);

    if ('gtag' in window) {
        gtag('event', 'exception', {
            description: e.reason.toString(),
            fatal: false
        });
    }
});

// Export for testing or external use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        Utils,
        NavigationManager,
        EnhancedSlider,
        FormManager,
        AnimationManager,
        PWAManager,
        ThemeManager,
        SearchFilterManager,
        BackToTopManager,
        FAQManager,
        PerformanceMonitor
    };
}