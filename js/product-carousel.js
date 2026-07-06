/* ===== Pharmron — Product Carousel with Framer Motion ===== */

/**
 * Creates an auto-rotating product carousel using framer-motion animations.
 * Each slide shows a product card that links to the product detail page.
 */
(function () {
    'use strict';

    // Wait for framer-motion and DOM to be ready
    function initCarousel(products) {
        const container = document.getElementById('product-carousel');
        if (!container || !products || products.length === 0) return;

        const Motion = window.Motion;
        if (!Motion) {
            console.warn('Framer Motion not loaded — carousel disabled');
            return;
        }

        const { animate, scroll, inView, motionValue, transform, spring, stagger, timeline } = Motion;

        // --- Build carousel HTML ---
        const track = container.querySelector('.carousel-track');
        const dotsContainer = container.querySelector('.carousel-dots');
        const prevBtn = container.querySelector('.carousel-btn-prev');
        const nextBtn = container.querySelector('.carousel-btn-next');
        const progressBar = container.querySelector('.carousel-progress-bar');

        if (!track) return;

        // Clear existing
        track.innerHTML = '';
        if (dotsContainer) dotsContainer.innerHTML = '';

        const slides = [];
        const dots = [];

        products.forEach((product, index) => {
            // Slide
            const slide = document.createElement('div');
            slide.className = 'carousel-slide';
            slide.dataset.index = index;
            slide.innerHTML = `
                <a href="product.html?id=${encodeURIComponent(product.id)}" class="carousel-slide-link">
                    <div class="carousel-slide-image-wrap">
                        <img src="${product.imagePath}" alt="${product.name}" loading="${index === 0 ? 'eager' : 'lazy'}" onerror="this.src='images/placeholder.png'">
                        <span class="carousel-slide-badge ${product.type === 'Signature' ? 'badge-signature' : 'badge-partner'}">${product.type}</span>
                    </div>
                    <div class="carousel-slide-info">
                        <span class="carousel-slide-category">${product.category}</span>
                        <h3 class="carousel-slide-name">${product.name}</h3>
                        <span class="carousel-slide-price">${product.price}</span>
                        <span class="carousel-slide-cta">View Details →</span>
                    </div>
                </a>
            `;
            track.appendChild(slide);
            slides.push(slide);

            // Dot
            if (dotsContainer) {
                const dot = document.createElement('button');
                dot.className = `carousel-dot${index === 0 ? ' active' : ''}`;
                dot.setAttribute('aria-label', `Go to slide ${index + 1}: ${product.name}`);
                dot.dataset.index = index;
                dotsContainer.appendChild(dot);
                dots.push(dot);

                dot.addEventListener('click', () => goToSlide(index));
            }
        });

        // --- State ---
        let currentIndex = 0;
        let isAnimating = false;
        let autoplayTimer = null;
        const AUTOPLAY_DELAY = 4500; // ms
        const ANIMATION_DURATION = 0.5; // seconds

        // --- Navigation ---
        function goToSlide(targetIndex, direction) {
            if (isAnimating || targetIndex === currentIndex) return;
            if (targetIndex < 0 || targetIndex >= slides.length) return;

            isAnimating = true;
            resetAutoplay();

            const currentSlide = slides[currentIndex];
            const targetSlide = slides[targetIndex];
            const goingForward = direction !== undefined ? direction : targetIndex > currentIndex;

            // Set initial positions
            const slideWidth = track.offsetWidth || track.parentElement.offsetWidth || 400;

            // Position target slide off-screen
            targetSlide.style.display = 'flex';
            targetSlide.style.position = 'absolute';
            targetSlide.style.top = '0';
            targetSlide.style.left = '0';
            targetSlide.style.width = '100%';
            targetSlide.style.height = '100%';
            targetSlide.style.transform = `translateX(${goingForward ? slideWidth : -slideWidth}px)`;
            targetSlide.style.opacity = '0';

            // Animate current slide out
            Motion.animate(currentSlide, {
                transform: `translateX(${goingForward ? -slideWidth : slideWidth}px)`,
                opacity: 0
            }, {
                duration: ANIMATION_DURATION,
                ease: [0.4, 0, 0.2, 1]
            });

            // Animate target slide in
            Motion.animate(targetSlide, {
                transform: 'translateX(0px)',
                opacity: 1
            }, {
                duration: ANIMATION_DURATION,
                ease: [0.4, 0, 0.2, 1]
            }).finished.then(() => {
                // Clean up
                currentSlide.style.display = 'none';
                currentSlide.style.position = '';
                currentSlide.style.transform = '';
                currentSlide.style.opacity = '';

                targetSlide.style.position = '';
                targetSlide.style.transform = '';
                targetSlide.style.opacity = '';

                currentIndex = targetIndex;
                updateDots();
                updateProgress();
                isAnimating = false;
                startAutoplay();
            }).catch(() => {
                // If animation was cancelled
                currentSlide.style.display = 'none';
                currentSlide.style.position = '';
                currentSlide.style.transform = '';
                currentSlide.style.opacity = '';

                targetSlide.style.position = '';
                targetSlide.style.transform = '';
                targetSlide.style.opacity = '';

                currentIndex = targetIndex;
                updateDots();
                updateProgress();
                isAnimating = false;
                startAutoplay();
            });
        }

        function nextSlide() {
            const next = (currentIndex + 1) % slides.length;
            goToSlide(next, true);
        }

        function prevSlide() {
            const prev = (currentIndex - 1 + slides.length) % slides.length;
            goToSlide(prev, false);
        }

        function updateDots() {
            dots.forEach((dot, i) => {
                dot.classList.toggle('active', i === currentIndex);
            });
        }

        function updateProgress() {
            if (progressBar) {
                const progress = ((currentIndex + 1) / slides.length) * 100;
                progressBar.style.width = `${progress}%`;
            }
            // Update count display
            const countEl = container.querySelector('.carousel-count');
            if (countEl) {
                countEl.innerHTML = `${currentIndex + 1} / <span class="carousel-total">${slides.length}</span>`;
            }
        }

        // --- Autoplay ---
        function startAutoplay() {
            stopAutoplay();
            autoplayTimer = setInterval(nextSlide, AUTOPLAY_DELAY);
        }

        function stopAutoplay() {
            if (autoplayTimer) {
                clearInterval(autoplayTimer);
                autoplayTimer = null;
            }
        }

        function resetAutoplay() {
            stopAutoplay();
        }

        // --- Event Listeners ---
        if (prevBtn) prevBtn.addEventListener('click', () => { resetAutoplay(); prevSlide(); });
        if (nextBtn) nextBtn.addEventListener('click', () => { resetAutoplay(); nextSlide(); });

        // Pause on hover
        container.addEventListener('mouseenter', stopAutoplay);
        container.addEventListener('mouseleave', startAutoplay);

        // Touch/swipe support
        let touchStartX = 0;
        let touchEndX = 0;

        container.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
            stopAutoplay();
        }, { passive: true });

        container.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            const diff = touchStartX - touchEndX;
            if (Math.abs(diff) > 50) {
                if (diff > 0) nextSlide();
                else prevSlide();
            }
            startAutoplay();
        }, { passive: true });

        // Keyboard navigation
        container.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') { resetAutoplay(); prevSlide(); }
            if (e.key === 'ArrowRight') { resetAutoplay(); nextSlide(); }
        });
        container.setAttribute('tabindex', '0');
        container.setAttribute('role', 'region');
        container.setAttribute('aria-label', 'Product carousel');

        // --- Entrance animation with framer-motion ---
        // Animate the carousel container in when it scrolls into view
        inView(container, () => {
            // Animate slides with stagger
            const slideEls = container.querySelectorAll('.carousel-slide');
            if (slideEls.length > 0) {
                // Only animate the first visible slide
                const firstSlide = slideEls[0];
                Motion.animate(firstSlide, {
                    opacity: [0, 1],
                    transform: ['translateY(30px)', 'translateY(0px)']
                }, {
                    duration: 0.6,
                    ease: [0.4, 0, 0.2, 1]
                });
            }
            return () => {}; // cleanup
        }, { amount: 0.3 });

        // --- Initialize ---
        // Show first slide
        if (slides.length > 0) {
            slides.forEach((slide, i) => {
                if (i === 0) {
                    slide.style.display = 'flex';
                    slide.style.opacity = '1';
                } else {
                    slide.style.display = 'none';
                }
            });
            updateProgress();
            startAutoplay();
        }

        // Expose controls for debugging and re-initialization
        container._carousel = {
            goTo: goToSlide,
            next: nextSlide,
            prev: prevSlide,
            currentIndex: () => currentIndex,
            reinit: (newProducts) => {
                // Stop autoplay and clean up
                stopAutoplay();
                // Re-initialize with new products
                initCarousel(newProducts);
            }
        };
    }

    // --- Hook into main init ---
    // Store original DOMContentLoaded handler reference
    const originalReady = document.addEventListener;

    // Listen for the carousel init event from script.js
    document.addEventListener('pharmron:products-loaded', (e) => {
        const products = e.detail?.products;
        if (products && products.length > 0) {
            initCarousel(products);
        }
    });

    // Also try to init if products are already available
    if (window.__pharmronProducts) {
        initCarousel(window.__pharmronProducts);
    }

    // Expose for manual init
    window.initProductCarousel = initCarousel;

    // Listen for re-initialization events (e.g., when products are added dynamically)
    document.addEventListener('pharmron:carousel-reinit', (e) => {
        const products = e.detail?.products;
        if (products && products.length > 0) {
            const container = document.getElementById('product-carousel');
            if (container && container._carousel && typeof container._carousel.reinit === 'function') {
                container._carousel.reinit(products);
            } else {
                // Fallback: re-init from scratch
                initCarousel(products);
            }
        }
    });

})();
