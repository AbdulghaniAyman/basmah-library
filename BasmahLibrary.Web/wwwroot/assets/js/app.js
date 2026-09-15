import {
    createClient
} from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

import {
    SUPABASE_URL,
    SUPABASE_ANON_KEY
} from "./config.js";


const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);

const WHATSAPP = "201020867958";

const $ = selector =>
    document.querySelector(selector);

const esc = value =>
    String(value ?? "").replace(
        /[&<>"']/g,
        char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        }[char])
    );

const money = value =>
    Number(value).toLocaleString(
        "ar-EG",
        {
            maximumFractionDigits: 2
        }
    );


let categories = [];
let products = [];
let selectedCategory = null;


/* =====================================================
   WHATSAPP
===================================================== */

function whatsappUrl(product) {

    let text =
        `مرحباً مكتبة بصمة، أريد طلب المنتج: ${product.name}`;

    if (
        product.price !== null &&
        product.price !== undefined &&
        Number(product.price) > 0
    ) {
        text +=
            ` — ${money(product.price)} ج.م`;
    }

    return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`;
}


/* =====================================================
   ICONS
===================================================== */

function categoryIcon(slug) {

    const icons = {
        printing: "▣",
        "stickers-paper": "◇",
        "paper-innovations": "✦",
        awards: "★",
        "metal-medals": "◈",
        mugs: "☕",
        vinyl: "✎",
        "flowers-accessories": "❖",
        clothing: "▱",
        graduation: "⌑",
        baby: "♡",
        weddings: "♢"
    };

    return icons[slug] || "✦";
}


/* =====================================================
   LOAD
===================================================== */

async function loadData() {

    const [
        categoryResult,
        productResult
    ] = await Promise.all([

        supabase
            .from("categories")
            .select(
                "id,name,slug,description,sort_order"
            )
            .eq("active", true)
            .order(
                "sort_order",
                {
                    ascending: true
                }
            ),

        supabase
            .from("products")
            .select(
                "id,name,description,category,category_id,price,price_note,image_url,sort_order"
            )
            .eq("active", true)
            .order(
                "sort_order",
                {
                    ascending: true
                }
            )
            .order(
                "created_at",
                {
                    ascending: true
                }
            )
    ]);


    if (categoryResult.error) {
        console.error(
            "Categories:",
            categoryResult.error
        );
    }

    if (productResult.error) {
        console.error(
            "Products:",
            productResult.error
        );
    }


    categories =
        categoryResult.data || [];

    products =
        productResult.data || [];


    renderCategories();
    renderProducts();
}


/* =====================================================
   CATEGORY IMAGE
===================================================== */

function categoryImage(category) {

    const slug =
        category.slug || "";


    if (!slug) {

        return `
            <div class="category-placeholder">

                <span>
                    ${categoryIcon(slug)}
                </span>

                <small>
                    صورة القسم
                </small>

            </div>
        `;

    }


    const path =
        `assets/images/categories/${slug}.jpg`;


    return `

        <img
            src="${path}"
            alt="${esc(category.name)}"
            loading="lazy"
            onerror="
                this.style.display='none';
                this.nextElementSibling.style.display='block';
            "
        >

        <div
            class="category-placeholder"
            style="display:none;"
        >

            <span>
                ${categoryIcon(slug)}
            </span>

            <small>
                صورة القسم
            </small>

        </div>
    `;
}


/* =====================================================
   CATEGORIES
===================================================== */

function renderCategories() {

    const grid =
        $("#categoryGrid");

    if (!grid) return;


    grid.innerHTML =
        categories
            .map(
                (category, index) => `

                    <button
                        type="button"
                        class="category-card ${selectedCategory === category.id
                        ? "active"
                        : ""
                    }"
                        data-category="${category.id}"
                    >

                        <div class="category-image">

                            ${categoryImage(category)}

                        </div>


                        <div class="category-content">

                            <span class="category-icon">
                                ${categoryIcon(category.slug)}
                            </span>


                            <strong>
                                ${esc(category.name)}
                            </strong>


                            <small>
                                ${esc(
                        category.description ||
                        "منتجات وتفاصيل القسم"
                    )}
                            </small>

                        </div>


                        <span class="category-arrow">
                            ←
                        </span>

                    </button>
                `
            )
            .join("");


    grid
        .querySelectorAll(
            "[data-category]"
        )
        .forEach(button => {

            button.onclick = () => {

                selectedCategory =
                    button.dataset.category;

                renderCategories();
                renderProducts();


                $("#catalog")
                    ?.scrollIntoView({
                        behavior: "smooth"
                    });
            };

        });
}


/* =====================================================
   PRODUCTS
===================================================== */

function renderProducts() {

    const search =
        $("#searchInput")
            ?.value
            .trim()
            .toLowerCase() || "";


    const visibleCategories =
        selectedCategory
            ? categories.filter(
                c =>
                    c.id ===
                    selectedCategory
            )
            : categories;


    const container =
        $("#productSections");

    if (!container) return;


    let html = "";


    for (
        const category of visibleCategories
    ) {


        const list =
            products.filter(product => {

                /*
                   دعم البيانات الجديدة
                   والمنتجات القديمة.
                */

                const belongs =
                    product.category_id ===
                    category.id

                    ||

                    (
                        !product.category_id &&
                        product.category ===
                        category.name
                    );


                const matchesSearch =
                    !search ||

                    `${product.name} ${product.description || ""
                        }`
                        .toLowerCase()
                        .includes(search);


                return (
                    belongs &&
                    matchesSearch
                );

            });


        if (!list.length) {
            continue;
        }


        html += `

            <section
                class="catalog-category"
                id="cat-${esc(category.slug)}"
            >

                <div class="catalog-category-head">

                    <div>

                        <span class="eyebrow">
                            ${esc(
            category.slug
                .replaceAll("-", " ")
                .toUpperCase()
        )}
                        </span>

                        <h3>
                            ${esc(category.name)}
                        </h3>

                    </div>


                    <span>
                        ${list.length} منتج
                    </span>

                </div>


                <div class="product-grid">

                    ${list
                .map(productCard)
                .join("")}

                </div>

            </section>

        `;
    }


    if (!html) {

        html = `

            <div class="empty-state">

                لا توجد منتجات مطابقة للبحث حاليًا.

            </div>

        `;

    }


    container.innerHTML =
        html;
}


/* =====================================================
   PRODUCT CARD
===================================================== */

function productCard(product) {

    const image =
        product.image_url

            ? `

                <img
                    src="${esc(product.image_url)}"
                    alt="${esc(product.name)}"
                    loading="lazy"
                >

              `

            : `

                <div class="product-placeholder">

                    <span>
                        ✦
                    </span>

                    <strong>
                        الصورة تضاف من لوحة الإدارة
                    </strong>

                </div>

              `;


    let price;


    if (
        product.price !== null &&
        product.price !== undefined &&
        Number(product.price) > 0
    ) {

        price = `

            <div class="product-price">

                ${money(product.price)} ج.م

                ${product.price_note
                ? `
                            <small>
                                ${esc(product.price_note)}
                            </small>
                          `
                : ""
            }

            </div>

        `;

    }
    else {

        price = `

            <div class="product-price">

                حسب الطلب

                ${product.price_note
                ? `
                            <small>
                                ${esc(product.price_note)}
                            </small>
                          `
                : ""
            }

            </div>

        `;

    }


    return `

        <article class="product-card">

            <div class="product-image">

                ${image}

            </div>


            <div class="product-body">

                <h4>
                    ${esc(product.name)}
                </h4>


                ${product.description
            ? `
                            <p>
                                ${esc(product.description)}
                            </p>
                          `
            : ""
        }


                ${price}


                <a
                    class="order-btn"
                    href="${whatsappUrl(product)}"
                    target="_blank"
                    rel="noopener"
                >
                    اطلب
                </a>

            </div>

        </article>

    `;
}


/* =====================================================
   SEARCH
===================================================== */

$("#searchInput")
    ?.addEventListener(
        "input",
        renderProducts
    );


/* =====================================================
   CLEAR
===================================================== */

$("#clearFilter")
    ?.addEventListener(
        "click",
        () => {

            selectedCategory = null;

            if ($("#searchInput")) {
                $("#searchInput").value = "";
            }

            renderCategories();
            renderProducts();

        }
    );


/* =====================================================
   START
===================================================== */

loadData();