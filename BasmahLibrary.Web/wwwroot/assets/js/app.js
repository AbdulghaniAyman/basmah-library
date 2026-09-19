import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);

/* =========================================================
   SETTINGS
========================================================= */

const WHATSAPP = "201020867958";
const BOOK_BUCKET = "book-library";

/* =========================================================
   HELPERS
========================================================= */

const $ = (selector) => document.querySelector(selector);

function esc(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function money(value) {
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return "";
    }

    const number = Number(value);

    if (Number.isNaN(number)) {
        return esc(value);
    }

    return new Intl.NumberFormat("ar-EG").format(number);
}

/* =========================================================
   DATA
========================================================= */

let categories = [];
let products = [];
let newsItems = [];

let bookCategories = [];
let books = [];

let selectedCategory = null;
let selectedBookCategory = null;

/* =========================================================
   WHATSAPP
========================================================= */

function whatsappUrl(product) {
    let priceText = "السعر حسب التصميم";

    if (product.price_note) {
        priceText = product.price_note;
    } else if (
        product.price !== null &&
        product.price !== undefined &&
        product.price !== ""
    ) {
        priceText = `${money(product.price)} ج.م`;
    }

    const message =
        `مرحبًا، أريد الاستفسار عن المنتج:\n` +
        `الاسم: ${product.name}\n` +
        `السعر: ${priceText}`;

    return (
        `https://wa.me/${WHATSAPP}?text=` +
        encodeURIComponent(message)
    );
}

/* =========================================================
   CATEGORY ICONS
========================================================= */

const categoryIcons = {
    "printing": "🖨️",
    "stickers-paper": "🏷️",
    "paper-sticker-innovations": "📄",
    "awards": "🏆",
    "metal-medals": "🥇",
    "printed-mugs": "☕",
    "vinyl-stickers": "✨",
    "flowers-accessories": "🌸",
    "clothing": "👕",
    "graduation": "🎓",
    "baby": "👶",
    "wedding": "💍"
};

const bookCategoryIcons = {
    "law": "⚖️",
    "literature": "📚",
    "education": "🎓",
    "children": "🧒",
    "religion": "📖",
    "general": "📘"
};

/* =========================================================
   CATEGORY IMAGES
========================================================= */

function categoryImage(category) {
    const images = {
        "printing": "assets/images/categories/printing.jpg",
        "stickers-paper": "assets/images/categories/stickers-paper.jpg",
        "paper-sticker-innovations": "assets/images/categories/paper-sticker-innovations.jpg",
        "awards": "assets/images/categories/awards.jpg",
        "metal-medals": "assets/images/categories/metal-medals.jpg",
        "printed-mugs": "assets/images/categories/printed-mugs.jpg",
        "vinyl-stickers": "assets/images/categories/vinyl-stickers.jpg",
        "flowers-accessories": "assets/images/categories/flowers-accessories.jpg",
        "clothing": "assets/images/categories/clothing.jpg",
        "graduation": "assets/images/categories/graduation.jpg",
        "baby": "assets/images/categories/baby.jpg",
        "wedding": "assets/images/categories/wedding.jpg"
    };

    return images[category.slug] || "";
}

/* =========================================================
   NEWS TICKER
========================================================= */

function renderNews() {
    const ticker = $("#newsTicker");

    if (!ticker) {
        return;
    }

    if (!newsItems.length) {
        ticker.innerHTML = `
            <span class="ticker-item">
                أهلاً بكم في مكتبة بصمة
            </span>

            <span class="ticker-item">
                اطبع، صمم، وخلّي فكرتك حقيقة
            </span>

            <span class="ticker-item">
                خدمات الطباعة والهدايا والتصميم متاحة الآن
            </span>
        `;

        prepareNewsTicker();
        return;
    }

    const newsHtml = newsItems
        .map(
            (item) => `
                <span class="ticker-item">
                    ${esc(item.text)}
                </span>
            `
        )
        .join("");

    /*
     * نكرر الأخبار حتى تستمر الحركة بدون فراغ.
     */
    ticker.innerHTML = newsHtml + newsHtml;

    prepareNewsTicker();
}

function prepareNewsTicker() {
    const ticker = $("#newsTicker");

    if (!ticker) {
        return;
    }

    /*
     * نجعل عرض المحتوى مناسبًا للحركة.
     */
    ticker.style.width = "max-content";

    /*
     * سرعة الشريط:
     * 12 ثانية = سرعة 2× تقريبًا.
     */
    ticker.style.animationDuration = "12s";
}

/* =========================================================
   CATEGORIES
========================================================= */

function categoryCard(category) {
    const icon =
        categoryIcons[category.slug] || "📦";

    const image =
        categoryImage(category);

    return `
        <button
            class="category-card"
            type="button"
            data-category="${esc(category.id)}"
        >

            <div class="category-card-image">

                ${image
            ? `
                            <img
                                src="${esc(image)}"
                                alt="${esc(category.name)}"
                                loading="lazy"
                                decoding="async"
                            >
                        `
            : `
                            <div class="category-card-icon">
                                ${icon}
                            </div>
                        `
        }

            </div>

            <div class="category-card-content">

                <h3>
                    ${esc(category.name)}
                </h3>

                ${category.description
            ? `
                            <p>
                                ${esc(category.description)}
                            </p>
                        `
            : ""
        }

            </div>

        </button>
    `;
}

function renderCategories() {
    const grid =
        $("#categoryGrid");

    if (!grid) {
        return;
    }

    if (!categories.length) {
        grid.innerHTML = `
            <div class="empty-state">
                لا توجد أقسام متاحة حاليًا.
            </div>
        `;

        return;
    }

    grid.innerHTML =
        categories
            .map(categoryCard)
            .join("");

    grid
        .querySelectorAll("[data-category]")
        .forEach((button) => {

            button.addEventListener(
                "click",
                () => {

                    selectedCategory =
                        button.dataset.category;

                    const catalog =
                        $("#catalog");

                    if (catalog) {
                        catalog.scrollIntoView({
                            behavior: "smooth",
                            block: "start"
                        });
                    }

                    renderProducts();
                }
            );
        });
}

/* =========================================================
   PRODUCTS
========================================================= */

function productImage(product) {
    if (product.image_url) {
        return product.image_url;
    }

    return "";
}

function productCard(product) {
    const image =
        productImage(product);

    let priceHtml = "";

    if (product.price_note) {

        priceHtml = `
            <div class="product-price">
                ${esc(product.price_note)}
            </div>
        `;

    } else if (
        product.price !== null &&
        product.price !== undefined &&
        product.price !== ""
    ) {

        priceHtml = `
            <div class="product-price">
                ${money(product.price)} ج.م
            </div>
        `;

    } else {

        priceHtml = `
            <div class="product-price">
                حسب التصميم
            </div>
        `;
    }

    return `
        <article class="product-card">

            <div class="product-image">

                ${image
            ? `
                            <img
                                src="${esc(image)}"
                                alt="${esc(product.name)}"
                                loading="lazy"
                                decoding="async"
                            >
                        `
            : `
                            <div class="product-image-placeholder">
                                <span>بصمة</span>
                            </div>
                        `
        }

            </div>

            <div class="product-content">

                <h3>
                    ${esc(product.name)}
                </h3>

                ${product.description
            ? `
                            <p>
                                ${esc(product.description)}
                            </p>
                        `
            : ""
        }

                ${priceHtml}

                <a
                    class="product-order-btn"
                    href="${whatsappUrl(product)}"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    اطلب عبر واتساب
                </a>

            </div>

        </article>
    `;
}

function renderProducts() {
    const container =
        $("#productSections");

    if (!container) {
        return;
    }

    const searchInput =
        $("#searchInput");

    const searchTerm =
        searchInput
            ? searchInput.value
                .trim()
                .toLowerCase()
            : "";

    let filteredProducts =
        [...products];

    if (selectedCategory) {

        filteredProducts =
            filteredProducts.filter(
                (product) =>
                    product.category_id ===
                    selectedCategory
            );
    }

    if (searchTerm) {

        filteredProducts =
            filteredProducts.filter(
                (product) => {

                    const text = [
                        product.name,
                        product.description,
                        product.category
                    ]
                        .filter(Boolean)
                        .join(" ")
                        .toLowerCase();

                    return text.includes(
                        searchTerm
                    );
                }
            );
    }

    if (!filteredProducts.length) {

        container.innerHTML = `
            <div class="empty-state">
                لا توجد منتجات مطابقة للبحث حاليًا.
            </div>
        `;

        return;
    }

    const sections = [];

    categories.forEach(
        (category) => {

            const categoryProducts =
                filteredProducts.filter(
                    (product) =>
                        product.category_id ===
                        category.id
                );

            if (!categoryProducts.length) {
                return;
            }

            sections.push(`
                <section class="product-section">

                    <div class="section-head">

                        <div>

                            <span class="eyebrow">
                                ${esc(category.name)}
                            </span>

                            <h2>
                                ${esc(category.name)}
                            </h2>

                        </div>

                    </div>

                    <div class="products-grid">

                        ${categoryProducts
                    .map(productCard)
                    .join("")}

                    </div>

                </section>
            `);
        }
    );

    /*
     * المنتجات القديمة التي لا تحتوي
     * على category_id.
     */
    const uncategorizedProducts =
        filteredProducts.filter(
            (product) =>
                !product.category_id ||
                !categories.some(
                    (category) =>
                        category.id ===
                        product.category_id
                )
        );

    if (uncategorizedProducts.length) {

        sections.push(`
            <section class="product-section">

                <div class="section-head">

                    <div>

                        <span class="eyebrow">
                            BASMAH LIBRARY
                        </span>

                        <h2>
                            منتجات أخرى
                        </h2>

                    </div>

                </div>

                <div class="products-grid">

                    ${uncategorizedProducts
                .map(productCard)
                .join("")}

                </div>

            </section>
        `);
    }

    container.innerHTML =
        sections.join("");
}

/* =========================================================
   BOOK COVER URL
========================================================= */

function getBookCoverUrl(book) {

    if (!book || !book.cover_url) {
        return "";
    }

    const rawValue =
        String(book.cover_url).trim();

    if (!rawValue) {
        return "";
    }

    /*
     * إذا كان رابطًا كاملًا:
     * https://...
     */
    if (
        rawValue.startsWith("https://") ||
        rawValue.startsWith("http://")
    ) {
        return rawValue;
    }

    /*
     * إذا كان Storage Path:
     *
     * covers/book.jpg
     */
    let storagePath =
        rawValue;

    if (storagePath.startsWith("/")) {
        storagePath =
            storagePath.substring(1);
    }

    /*
     * إذا كان الموجود في قاعدة البيانات
     * هو رابط Supabase Public كامل.
     */
    const publicMarker =
        `/storage/v1/object/public/${BOOK_BUCKET}/`;

    const markerIndex =
        storagePath.indexOf(
            publicMarker
        );

    if (markerIndex !== -1) {

        storagePath =
            storagePath.substring(
                markerIndex +
                publicMarker.length
            );
    }

    /*
     * فك ترميز المسار.
     */
    try {

        storagePath =
            decodeURIComponent(
                storagePath
            );

    } catch {
        /*
         * نستخدم المسار كما هو.
         */
    }

    const { data } =
        supabase.storage
            .from(BOOK_BUCKET)
            .getPublicUrl(
                storagePath
            );

    return data?.publicUrl || "";
}

/* =========================================================
   BOOK CATEGORIES
========================================================= */

function bookCategoryCard(
    category
) {

    const icon =
        bookCategoryIcons[
        category.slug
        ] || "📚";

    return `
        <button
            class="book-category-card"
            type="button"
            data-book-category="${esc(category.id)}"
        >

            <div class="book-category-icon">
                ${icon}
            </div>

            <div>

                <h3>
                    ${esc(category.name)}
                </h3>

                ${category.description
            ? `
                            <p>
                                ${esc(category.description)}
                            </p>
                        `
            : ""
        }

            </div>

        </button>
    `;
}

function renderBookCategories() {

    const grid =
        $("#bookCategoriesGrid");

    if (!grid) {
        return;
    }

    if (!bookCategories.length) {

        grid.innerHTML = `
            <div class="empty-state">
                لا توجد أقسام كتب متاحة حاليًا.
            </div>
        `;

        return;
    }

    grid.innerHTML =
        bookCategories
            .map(bookCategoryCard)
            .join("");

    grid
        .querySelectorAll(
            "[data-book-category]"
        )
        .forEach(
            (button) => {

                button.addEventListener(
                    "click",
                    () => {

                        selectedBookCategory =
                            button.dataset.bookCategory;

                        renderBooks();

                        const sections =
                            $("#bookSections");

                        if (sections) {

                            sections.scrollIntoView({
                                behavior: "smooth",
                                block: "start"
                            });
                        }
                    }
                );
            }
        );
}

/* =========================================================
   BOOK CARD
========================================================= */

function bookCard(book) {

    const coverUrl =
        getBookCoverUrl(book);

    const hasCover =
        Boolean(coverUrl);

    const hasPdf =
        Boolean(book.pdf_url);

    return `
        <article class="book-card">

            <div class="book-cover">

                ${hasCover
            ? `
                            <img
                                src="${esc(coverUrl)}"
                                alt="غلاف ${esc(book.title)}"
                                loading="lazy"
                                decoding="async"
                            >
                        `
            : ""
        }

                <div
                    class="book-cover-fallback"
                    ${hasCover ? "hidden" : ""}
                >
                    <span>📖</span>
                    <strong>بصمة</strong>
                </div>

            </div>

            <div class="book-content">

                <h3>
                    ${esc(book.title)}
                </h3>

                ${book.author
            ? `
                            <div class="book-author">
                                ${esc(book.author)}
                            </div>
                        `
            : ""
        }

                ${book.description
            ? `
                            <p>
                                ${esc(book.description)}
                            </p>
                        `
            : ""
        }

                ${book.pages
            ? `
                            <div class="book-pages">
                                ${money(book.pages)} صفحة
                            </div>
                        `
            : ""
        }

                <div class="book-actions">

                    ${hasPdf
            ? `
                                <button
                                    class="book-read-btn"
                                    type="button"
                                    data-book-id="${esc(book.id)}"
                                >
                                    قراءة الكتاب
                                </button>

                                <a
                                    class="book-download-btn"
                                    href="${esc(book.pdf_url)}"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    download
                                >
                                    تحميل PDF
                                </a>
                            `
            : `
                                <span class="book-unavailable">
                                    الكتاب غير متاح حاليًا
                                </span>
                            `
        }

                </div>

            </div>

        </article>
    `;
}

/* =========================================================
   BOOK COVER FALLBACK
========================================================= */

function setupBookCoverFallbacks() {

    document
        .querySelectorAll(
            ".book-cover img"
        )
        .forEach(
            (img) => {

                const showFallback =
                    () => {

                        img.hidden = true;

                        const fallback =
                            img.parentElement?.querySelector(
                                ".book-cover-fallback"
                            );

                        if (fallback) {
                            fallback.hidden = false;
                        }

                        console.warn(
                            "Book cover failed to load:",
                            img.src
                        );
                    };

                const showImage =
                    () => {

                        img.hidden = false;

                        const fallback =
                            img.parentElement?.querySelector(
                                ".book-cover-fallback"
                            );

                        if (fallback) {
                            fallback.hidden = true;
                        }
                    };

                img.addEventListener(
                    "error",
                    showFallback,
                    { once: true }
                );

                img.addEventListener(
                    "load",
                    showImage
                );

                /*
                 * لو الصورة موجودة في Cache.
                 */
                if (img.complete) {

                    if (
                        img.naturalWidth === 0
                    ) {
                        showFallback();
                    } else {
                        showImage();
                    }
                }
            }
        );
}

/* =========================================================
   BOOKS
========================================================= */

function renderBooks() {

    const container =
        $("#bookSections");

    if (!container) {
        return;
    }

    let filteredBooks =
        [...books];

    if (selectedBookCategory) {

        filteredBooks =
            filteredBooks.filter(
                (book) =>
                    book.category_id ===
                    selectedBookCategory
            );
    }

    if (!filteredBooks.length) {

        container.innerHTML = `
            <div class="empty-state">
                لا توجد كتب متاحة حاليًا في هذا القسم.
            </div>
        `;

        return;
    }

    const sections = [];

    bookCategories.forEach(
        (category) => {

            const categoryBooks =
                filteredBooks.filter(
                    (book) =>
                        book.category_id ===
                        category.id
                );

            if (!categoryBooks.length) {
                return;
            }

            sections.push(`
                <section class="book-section">

                    <div class="section-head">

                        <div>

                            <span class="eyebrow">
                                BASMAH E-LIBRARY
                            </span>

                            <h2>
                                ${esc(category.name)}
                            </h2>

                        </div>

                    </div>

                    <div class="admin-books-grid">

                        ${categoryBooks
                    .map(bookCard)
                    .join("")}

                    </div>

                </section>
            `);
        }
    );

    container.innerHTML =
        sections.join("");

    setupBookCoverFallbacks();

    container
        .querySelectorAll(
            ".book-read-btn"
        )
        .forEach(
            (button) => {

                button.addEventListener(
                    "click",
                    () => {

                        const book =
                            books.find(
                                (item) =>
                                    item.id ===
                                    button.dataset.bookId
                            );

                        if (book) {
                            openBookViewer(book);
                        }
                    }
                );
            }
        );
}

/* =========================================================
   PDF VIEWER
========================================================= */

function openBookViewer(book) {

    const modal =
        $("#bookViewerModal");

    const frame =
        $("#bookViewerFrame");

    const title =
        $("#bookViewerTitle");

    const downloadTop =
        $("#bookDownloadBtn");

    const downloadBottom =
        $("#bookDownloadBtnBottom");

    if (
        !modal ||
        !frame ||
        !title ||
        !book?.pdf_url
    ) {
        return;
    }

    title.textContent =
        book.title ||
        "قراءة الكتاب";

    frame.src =
        book.pdf_url;

    if (downloadTop) {
        downloadTop.href =
            book.pdf_url;
    }

    if (downloadBottom) {
        downloadBottom.href =
            book.pdf_url;
    }

    modal.classList.remove(
        "hidden"
    );

    modal.setAttribute(
        "aria-hidden",
        "false"
    );

    document.body.classList.add(
        "book-viewer-open"
    );
}

function closeBookViewer() {

    const modal =
        $("#bookViewerModal");

    const frame =
        $("#bookViewerFrame");

    if (!modal) {
        return;
    }

    modal.classList.add(
        "hidden"
    );

    modal.setAttribute(
        "aria-hidden",
        "true"
    );

    if (frame) {
        frame.src = "";
    }

    document.body.classList.remove(
        "book-viewer-open"
    );
}

function setupBookViewer() {

    const closeButton =
        $("#closeBookViewer");

    const closeBottom =
        $("#bookViewerCloseBtn");

    const modal =
        $("#bookViewerModal");

    if (closeButton) {

        closeButton.addEventListener(
            "click",
            closeBookViewer
        );
    }

    if (closeBottom) {

        closeBottom.addEventListener(
            "click",
            closeBookViewer
        );
    }

    if (modal) {

        modal.addEventListener(
            "click",
            (event) => {

                if (
                    event.target === modal
                ) {
                    closeBookViewer();
                }
            }
        );
    }

    document.addEventListener(
        "keydown",
        (event) => {

            if (event.key === "Escape") {
                closeBookViewer();
            }
        }
    );
}

/* =========================================================
   SEARCH
========================================================= */

function setupSearch() {

    const searchInput =
        $("#searchInput");

    const clearButton =
        $("#clearFilter");

    if (searchInput) {

        searchInput.addEventListener(
            "input",
            () => {
                renderProducts();
            }
        );
    }

    if (clearButton) {

        clearButton.addEventListener(
            "click",
            () => {

                selectedCategory = null;

                if (searchInput) {
                    searchInput.value = "";
                }

                renderProducts();
            }
        );
    }
}

/* =========================================================
   LOAD DATA
========================================================= */

async function loadData() {

    const [
        categoriesResult,
        productsResult,
        newsResult,
        bookCategoriesResult,
        booksResult
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
                "id,name,description,category,category_id,price,price_note,image_url,sort_order,created_at"
            )
            .eq("active", true)
            .order(
                "sort_order",
                {
                    ascending: true
                }
            ),

        supabase
            .from("news_ticker")
            .select(
                "id,text,active,sort_order,created_at"
            )
            .eq("active", true)
            .order(
                "sort_order",
                {
                    ascending: true
                }
            ),

        supabase
            .from("book_categories")
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
            .from("books")
            .select(
                "id,category_id,title,author,description,cover_url,pdf_url,pages,sort_order,created_at"
            )
            .eq("active", true)
            .order(
                "sort_order",
                {
                    ascending: true
                }
            )
    ]);

    /* =====================================================
       CATEGORIES
    ===================================================== */

    if (categoriesResult.error) {

        console.error(
            "Categories error:",
            categoriesResult.error
        );

        categories = [];

    } else {

        categories =
            categoriesResult.data || [];
    }

    /* =====================================================
       PRODUCTS
    ===================================================== */

    if (productsResult.error) {

        console.error(
            "Products error:",
            productsResult.error
        );

        products = [];

    } else {

        products =
            productsResult.data || [];
    }

    /* =====================================================
       NEWS
    ===================================================== */

    if (newsResult.error) {

        console.error(
            "News ticker error:",
            newsResult.error
        );

        newsItems = [];

    } else {

        newsItems =
            newsResult.data || [];
    }

    /* =====================================================
       BOOK CATEGORIES
    ===================================================== */

    if (bookCategoriesResult.error) {

        console.error(
            "Book categories error:",
            bookCategoriesResult.error
        );

        bookCategories = [];

    } else {

        bookCategories =
            bookCategoriesResult.data || [];
    }

    /* =====================================================
       BOOKS
    ===================================================== */

    if (booksResult.error) {

        console.error(
            "Books error:",
            booksResult.error
        );

        books = [];

    } else {

        books =
            booksResult.data || [];
    }

    console.log(
        "Basmah data loaded:",
        {
            categories:
                categories.length,

            products:
                products.length,

            news:
                newsItems.length,

            bookCategories:
                bookCategories.length,

            books:
                books.length
        }
    );

    /*
     * Debug خاص بأغلفة الكتب.
     */
    books
        .filter(
            (book) =>
                book.cover_url
        )
        .forEach(
            (book) => {

                console.log(
                    "Book cover:",
                    book.title,
                    "Original:",
                    book.cover_url,
                    "Resolved:",
                    getBookCoverUrl(book)
                );
            }
        );

    renderNews();
    renderCategories();
    renderProducts();
    renderBookCategories();
    renderBooks();
}

/* =========================================================
   INITIALIZE
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        setupSearch();
        setupBookViewer();

        try {

            await loadData();

        } catch (error) {

            console.error(
                "Basmah Library initialization error:",
                error
            );
        }
    }
);