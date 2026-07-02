// Product data
const products = [
    {
        name: "Rsplus-toothpowder",
        image: "/images/Rsplus-toothpowder.png",
        description: "Natural toothpowder for whitening and oral health.",
        price: "₦5,000",
        gtin: "6156000513164",
        paystack_url: "https://paystack.shop/pay/tixh3lt344",
        whatsapp_text: "I will like to get RSPLUS-TOOTHPOWDER",
        problem: "Are you tired of hiding your smile because of stubborn coffee, tea, or tobacco stains? Do you struggle with chronic gum sensitivity that makes brushing a painful daily chore? Standard commercial toothpastes often contain harsh abrasives and chemicals that provide a temporary fix but weaken your enamel over time.That yellowing and sensitivity isn't just a cosmetic issue—it affects your confidence in business meetings, social gatherings, and personal interactions.",
        solution: "Rsplus Toothpowder uses a proprietary botanical blend designed to gently lift surface stains through natural enzymatic action, not harsh chemical scrubbing. By balancing your mouth's pH levels, we soothe inflamed gums and provide long-term relief from sensitivity. Unlike commercial pastes that focus only on masking the issue, Rsplus reinforces enamel health, leaving your teeth not just brighter, but stronger."
    },
    {
        name: "Turmeric curcumin with bioperine and cinnamon capsules",
        image: "/images/Turmeric-capsules.png",
        description: "Anti-inflammatory and antioxidant capsules.",
        price: "₦15,000",
        gtin: "6156000513171",
        paystack_url: "https://paystack.shop/pay/8bfhj39ze4",
        whatsapp_text: "I will like to get Turmeric Curcumin with bioperine and cinamon",
        problem: "Do you deal with persistent joint stiffness or general aches that slow you down? Many people turn to standard turmeric powders, but they often struggle with low absorption—meaning your body doesn't actually utilize the curcumin it needs. Furthermore, fluctuating energy levels and poor metabolic health are constant battles for the modern professional. You aren’t looking for another 'pill'; you are looking to regain the mobility and energy you had years ago. The frustration of trying health supplements that 'just don't work' stops today.",
        solution: "Our formula is engineered for maximum bioavailability. We combine high-potency Turmeric Curcumin with Bioperine (black pepper extract), which is clinically proven to increase curcumin absorption by up to 2000%. To take it further, we’ve added Cinnamon, a powerful botanical known for supporting healthy blood sugar levels and improving metabolic wellness. While other supplements pass through your system without effect, our targeted blend ensures that the anti-inflammatory and metabolic-boosting properties are fully absorbed and put to work immediately."
    },
    {
        name: "Oxyderm Magnetic Gold",
        image: "/images/Oxyderm-magnetic-gold.png",
        description: "Advanced skincare with magnetic gold technology.",
        price: "₦8,000",
        gtin: "6156000513126",
        paystack_url: "https://paystack.shop/pay/58qqu92eq5",
        whatsapp_text: "i will like to get Oxyderm Magnetic Gold",
        problem: "Do you feel like your skin looks dull, uneven, or tired? Environmental stress, hyperpigmentation, and slow cell turnover can make your complexion lose its natural vibrancy. Many brightening lotions rely on harsh bleaching agents that strip your skin of its health, leaving it dry and irritated. True radiance isn’t about hiding your skin—it’s about revealing the glow that's been buried under stress and uneven tone. You deserve a skincare ritual that feels as luxurious as the results it delivers."
    },
    {
        name: "Oxyderm Olympio",
        image: "/images/Oxyderm-olympio.png",
        description: "Premium skincare for radiant skin.",
        price: "₦8,000",
        gtin: "6156000513133",
        paystack_url: "https://paystack.shop/pay/vj6thcy9t6",
        whatsapp_text: "I will like to get oxyderm Olympio Magnifying Glow",
        problem: "Is your skin constantly struggling with extreme dryness, rough texture, or a lack of resilience? Over-the-counter lotions often sit on the surface, providing temporary moisture that fades within an hour. If you’re battling chronic dryness or skin that feels 'tight' and uncomfortable, you aren’t just dealing with a cosmetic issue—you’re dealing with a compromised skin barrier. Stop settling for lotions that underperform. You need a formula that works as hard as you do to restore, protect, and maintain your skin’s natural, healthy softness."
    },
    {
        name: "Oxyderm Signature",
        image: "/images/Oxyderm-signature.png",
        description: "Signature skincare formula for all skin types.",
        price: "₦8,000",
        gtin: "6158000513157",
        paystack_url: "https://paystack.shop/pay/2p0fviim6f",
        whatsapp_text: "I will like to get Oxyderm Signature",
        problem: "Finding a daily lotion that actually delivers visible results without being too greasy or too mild is a challenge. Many people find their skincare routine lacks consistency because their products don't integrate well into a busy lifestyle. If you’re tired of inconsistent skin tone or lotions that feel heavy and uncomfortable under your clothes, you need an upgrade. Your daily skincare shouldn't be a chore. It should be the foundation of your confidence. You need a signature product that works as a reliable, daily partner in maintaining your skin’s best version."
    },
    {
        name: "Pure Arabian Blue beach",
        image: "/images/Pure-Arabian-blue-beach.png",
        description: "Luxurious body care with blue beach essence.",
        price: "₦8,000",
        gtin: "6156000513188",
        paystack_url: "https://paystack.shop/pay/rl3op8m9yh",
        whatsapp_text: "I will like to get Pure Arabian Blue beach",
        problem: "Oxyderm Signature is our balanced, all-in-one moisturizing complex designed for daily use. It combines essential brightening agents with deep-penetrating hydration to target daily sun-exposure dullness and environmental pollutants. The formula is lightweight, fast-absorbing, and built to promote a uniform, healthy complexion. Signature focuses on Bio-Equilibrium—balancing the skin's moisture levels while gently evening out skin tone over time. It’s the perfect 'maintenance' lotion that keeps your skin looking polished, healthy, and vibrant every single day."
    },
    {
        name: "Pure Arabian Gold",
        image: "/images/Pure-Arabian-gold.png",
        description: "Premium body care with gold extracts.",
        price: "₦8,000",
        gtin: "6156000513119",
        paystack_url: "https://paystack.shop/pay/el1s73kf7s",
        whatsapp_text: "I will like to get Pure Arabian Gold",
        problem: "Are you tired of basic lotions that offer moisture but lack that touch of luxury? Many high-end lotions on the market are either too perfumed or simply don't provide the long-lasting radiance you expect from a premium product. If your skin feels lackluster and you're looking for a product that adds a 'wow' factor to your appearance, you aren't alone. You don't just want to moisturize; you want to shimmer, shine, and stand out. You deserve a skincare experience that makes you feel opulent and confident from the moment you apply it."
    },
    {
        name: "Pure Arabian Vitamin c",
        image: "/images/Pure-Arabian-vitaminc.png",
        description: "Vitamin C-enriched body care.",
        price: "₦8,000",
        gtin: "6`56000513102",
        paystack_url: "https://paystack.shop/pay/ny5wn246fe",
        whatsapp_text: "I will like to get Pure Arabian Vitamin C",
        problem: "Is your skin looking tired, dull, or showing signs of uneven tone? Sun exposure, environmental pollutants, and natural aging can strip your skin of its brightness, leaving it looking lackluster. Standard moisturizers can soften the skin, but they rarely address the deep-seated issue of discoloration or environmental dullness. You shouldn't have to choose between deep hydration and a bright, even complexion. You want skin that looks as awake, fresh, and energetic as you feel."
    }
];

// Function to render product grid
document.addEventListener('DOMContentLoaded', function() {
    const productGrid = document.querySelector('.product-grid');
    if (productGrid) {
        products.forEach(product => {
            const productCard = document.createElement('div');
            productCard.className = 'product-card';
            productCard.innerHTML = `
                <img src="${product.image}" alt="${product.name}">
                <h3>${product.name}</h3>
                <p>${product.description}</p>
                <p>Price: ${product.price}</p>
                <p>GTIN: ${product.gtin}</p>
                <div class="product-actions">
                    <button class="button details-button">Details</button>
                    <a href="${product.paystack_url}" class="button">Pay with Card</a>
                    <a href="https://wa.me/2348037341221?text=${product.whatsapp_text}" class="button">Order on WhatsApp</a>
                </div>
                <div class="problem-solution" style="display: none;">
                    <h4>Problem</h4>
                    <p>${product.problem}</p>
                    <h4>Solution</h4>
                    <p>${product.solution}</p>
                </div>
            `;
            productGrid.appendChild(productCard);

            // Add event listener to details button
            const detailsButton = productCard.querySelector('.details-button');
            if (detailsButton) {
                detailsButton.addEventListener('click', function() {
                    const problemSolution = productCard.querySelector('.problem-solution');
                    if (problemSolution) {
                        problemSolution.style.display = 'block';
                    }
                });
            }
        });
    }
});