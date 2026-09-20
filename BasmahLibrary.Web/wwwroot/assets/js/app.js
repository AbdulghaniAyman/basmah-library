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

function isFullUrl(value) {
    return /^https?:\/\//i.test(
        String(value || "").trim()
    );
}

function cleanStoragePath(value, bucketName) {
    let path = String(value || "").trim();

    if (!path) {
        return "";
    }

    const publicMarker =
        `/storage/v1/object/public/${bucketName}/`;

    const markerIndex =
        path.indexOf(publicMarker);

    if (markerIndex !== -1) {
        path = path.substring(
            markerIndex + publicMarker.length
        );
    }

    const bucketPrefix =
        `${bucketName}/`;

    if (path.startsWith(bucketPrefix)) {
        path = path.substring(
            bucketPrefix.length
        );
    }

    path = path.replace(/^\/+/, "");

    try {
        path = decodeURIComponent(path);
    } catch {
        // استخدام المسار كما هو
    }

    return path;
}

function getPublicStorageUrl(bucketName, value) {
    const rawValue =
        String(value || "").trim();

    if (!rawValue) {
        return "";
    }

    if (isFullUrl(rawValue)) {
        return rawValue;
    }

    const storagePath =
        cleanStoragePath(
            rawValue,
            bucketName
        );

    if (!storagePath) {
        return "";
    }

    const { data } =
        supabase.storage
            .from(bucketName)
            .getPublicUrl(storagePath);

    return data?.publicUrl || "";
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

    if (product?.price_note) {
        priceText = product.price_note;
    } else if (
        product?.price !== null &&
        product?.price !== undefined &&
        product?.price !== ""
    ) {
        priceText =
            `${money(product.price)} ج.م`;
    }

    const message =
        `مرحبًا، أريد الاستفسار عن المنتج:\n` +
        `الاسم: ${product?.name || ""}\n` +
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
        printing:
            "assets/images/categories/printing.jpg",

        "stickers-paper":
            "assets/images/categories/stickers-paper.jpg",

        "paper-sticker-innovations":
            "assets/images/categories/paper-sticker-innovations.jpg",

        awards:
            "assets/images/categories/awards.jpg",

        "metal-medals":
            "assets/images/categories/metal-medals.jpg",

        "printed-mugs":
            "assets/images/categories/printed-mugs.jpg",

        "vinyl-stickers":
            "assets/images/categories/vinyl-stickers.jpg",

        "flowers-accessories":
            "assets/images/categories/flowers-accessories.jpg",

        clothing:
            "assets/images/categories/clothing.jpg",

        graduation:
            "assets/images/categories/graduation.jpg",

        baby:
            "assets/images/categories/baby.jpg",

        wedding:
            "assets/images/categories/wedding.jpg"
    };

    return images[category?.slug] || "";
}

/* =========================================================
   NEWS TICKER
========================================================= */

function renderNews() {
    const ticker =
        $("#newsTicker");

    const content =
        $("#newsTickerContent");

    if (!ticker || !content) {
        return;
    }

    let items = [];

    if (newsItems.length) {
        items = newsItems
            .map((item) => String(item.text || "").trim())
            .filter(Boolean);
    }

    if (!items.length) {
        items = [
            "أهلاً بكم في مكتبة بصمة",
            "اطبع، صمم، وخلّي فكرتك حقيقة",
            "خدمات الطباعة والهدايا والتصميم متاحة الآن"
        ];
    }

    const newsHtml = items
        .map(
            (text) => `
                <span class="news-item">
                    ${esc(text)}
                </span>

                <span class="news-separator" aria-hidden="true">
                    ◆
                </span>
            `
        )
        .join("");

    /*
     * نكرر المحتوى حتى تستمر الحركة بدون انقطاع.
     */
    content.innerHTML =
        newsHtml + newsHtml;

    /*
     * إظهار الشريط بعد تجهيز المحتوى.
     */
    ticker.hidden = false;

    ticker.removeAttribute("aria-hidden");

    /*
     * إعادة تشغيل الحركة عند إعادة تحميل الأخبار.
     */
    content.style.animation = "none";

    /*
     * إجبار المتصفح على إعادة حساب الحركة.
     */
    void content.offsetWidth;

    content.style.animation =
        "basmahNewsMove 18s linear infinite";
}

/* =========================================================
   CATEGORIES
========================================================= */

function categoryCard(category) {
    const icon =
        categoryIcons[category.slug] ||
        "📦";

    const image =
        categoryImage(category);

    return `
        <button
            class="category-card"
            type="button"
            data-category="${esc(category.id)}"
            aria-label="عرض منتجات ${esc(category.name)}"
        >

            <div class="category-image">

                ${image
            ? `
                            <img
                                src="${esc(image)}"
                                alt="${esc(category.name)}"
                                loading="lazy"
                                decoding="async"
                                data-category-image
                            >
                        `
            : `
                            <div class="category-placeholder">
                                <span>
                                    ${icon}
                                </span>

                                <small>
                                    ${esc(category.name)}
                                </small>
                            </div>
                        `
        }

            </div>

            <div class="category-content">

                <div class="category-icon">
                    ${icon}
                </div>

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
        .querySelectorAll(
            "[data-category-image]"
        )
        .forEach((img) => {
            img.addEventListener(
                "error",
                () => {
                    const wrapper =
                        img.parentElement;

                    if (!wrapper) {
                        return;
                    }

                    const categoryId =
                        img
                            .closest(
                                "[data-category]"
                            )
                            ?.dataset
                            ?.category;

                    const category =
                        categories.find(
                            (item) =>
                                item.id ===
                                categoryId
                        );

                    const icon =
                        category
                            ? categoryIcons[
                            category.slug
                            ] || "📦"
                            : "📦";

                    wrapper.innerHTML = `
                        <div class="category-placeholder">
                            <span>
                                ${icon}
                            </span>

                            <small>
                                ${esc(category?.name || "بصمة")}
                            </small>
                        </div>
                    `;
                },
                { once: true }
            );
        });

    grid
        .querySelectorAll(
            "[data-category]"
        )
        .forEach((button) => {
            button.addEventListener(
                "click",
                () => {
                    selectedCategory =
                        button.dataset.category;

                    updateCategorySelection();

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

    updateCategorySelection();
}

function updateCategorySelection() {
    document
        .querySelectorAll(
            "[data-category]"
        )
        .forEach((button) => {
            button.classList.toggle(
                "is-selected",
                button.dataset.category ===
                selectedCategory
            );
        });
}

/* =========================================================
   PRODUCTS
========================================================= */

function productImage(product) {
    if (!product?.image_url) {
        return "";
    }

    /*
     * لو image_url رابط كامل نستخدمه كما هو.
     * ولو كان مسارًا داخل product-images
     * نحوله إلى Public URL.
     */
    return getPublicStorageUrl(
        "product-images",
        product.image_url
    );
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
                                data-product-image
                            >
                        `
            : `
                            <div class="product-image-fallback">
                                <span>بصمة</span>
                            </div>
                        `
        }

            </div>

            <div class="product-body">

                <h3 class="product-title">
                    ${esc(product.name)}
                </h3>

                ${product.description
            ? `
                            <p class="product-description">
                                ${esc(product.description)}
                            </p>
                        `
            : ""
        }

                <div class="product-footer">

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

            </div>

        </article>
    `;
}

function setupProductImageFallbacks() {
    document
        .querySelectorAll(
            ".product-image img[data-product-image]"
        )
        .forEach((img) => {
            img.addEventListener(
                "error",
                () => {
                    const wrapper =
                        img.parentElement;

                    if (!wrapper) {
                        return;
                    }

                    wrapper.innerHTML = `
                        <div class="product-image-fallback">
                            <span>بصمة</span>
                        </div>
                    `;
                },
                { once: true }
            );
        });
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
                <strong>
                    لا توجد نتائج
                </strong>

                <p>
                    لا توجد منتجات مطابقة للبحث حاليًا.
                </p>
            </div>
        `;

        updateFilterState();
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

                    <div class="catalog-section-heading">

                        <div>

                            <span class="section-label">
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

                <div class="catalog-section-heading">

                    <div>

                        <span class="section-label">
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

    setupProductImageFallbacks();
    updateFilterState();
}

/* =========================================================
   BOOK STORAGE
========================================================= */

function getBookCoverUrl(book) {
    return getPublicStorageUrl(
        BOOK_BUCKET,
        book?.cover_url
    );
}

function getBookPdfUrl(book) {
    return getPublicStorageUrl(
        BOOK_BUCKET,
        book?.pdf_url
    );
}

/* =========================================================
   BOOK CATEGORIES
========================================================= */

function bookCategoryCard(category) {
    const icon =
        bookCategoryIcons[
        category.slug
        ] || "📚";

    return `
        <button
            class="book-category-card"
            type="button"
            data-book-category="${esc(category.id)}"
            aria-label="عرض كتب ${esc(category.name)}"
        >

            <div class="book-category-icon">
                ${icon}
            </div>

            <div class="book-category-content">

                <strong>
                    ${esc(category.name)}
                </strong>

                ${category.description
            ? `
                            <small>
                                ${esc(category.description)}
                            </small>
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
        .forEach((button) => {
            button.addEventListener(
                "click",
                () => {
                    selectedBookCategory =
                        button.dataset.bookCategory;

                    updateBookCategorySelection();
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
        });

    updateBookCategorySelection();
}

function updateBookCategorySelection() {
    document
        .querySelectorAll(
            "[data-book-category]"
        )
        .forEach((button) => {
            button.classList.toggle(
                "is-selected",
                button.dataset.bookCategory ===
                selectedBookCategory
            );
        });
}

/* =========================================================
   BOOK CARD
========================================================= */

function bookCard(book) {
    const coverUrl =
        getBookCoverUrl(book);

    const pdfUrl =
        getBookPdfUrl(book);

    const hasCover =
        Boolean(coverUrl);

    const hasPdf =
        Boolean(pdfUrl);

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

            <div class="book-body">

                <h3 class="book-title">
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
                            <p class="book-description">
                                ${esc(book.description)}
                            </p>
                        `
            : ""
        }

                ${book.pages
            ? `
                            <div class="book-meta">
                                ${money(book.pages)}
                                صفحة
                            </div>
                        `
            : ""
        }

                <div class="book-actions">

                    ${hasPdf
            ? `
                                <button
                                    class="btn btn-primary book-read-btn"
                                    type="button"
                                    data-book-id="${esc(book.id)}"
                                >
                                    قراءة الكتاب
                                </button>

                                <a
                                    class="btn btn-light book-download-btn"
                                    href="${esc(pdfUrl)}"
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
        .forEach((img) => {
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

            if (img.complete) {
                if (
                    img.naturalWidth === 0
                ) {
                    showFallback();
                } else {
                    showImage();
                }
            }
        });
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
                <strong>
                    لا توجد كتب
                </strong>

                <p>
                    لا توجد كتب متاحة حاليًا في هذا القسم.
                </p>
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

                    <div class="book-section-heading">

                        <div>

                            <span class="section-label">
                                BASMAH E-LIBRARY
                            </span>

                            <h3>
                                ${esc(category.name)}
                            </h3>

                        </div>

                    </div>

                    <div class="books-grid">

                        ${categoryBooks
                    .map(bookCard)
                    .join("")}

                    </div>

                </section>
            `);
        }
    );

    const uncategorizedBooks =
        filteredBooks.filter(
            (book) =>
                !book.category_id ||
                !bookCategories.some(
                    (category) =>
                        category.id ===
                        book.category_id
                )
        );

    if (uncategorizedBooks.length) {
        sections.push(`
            <section class="book-section">

                <div class="book-section-heading">

                    <div>

                        <span class="section-label">
                            BASMAH E-LIBRARY
                        </span>

                        <h3>
                            كتب أخرى
                        </h3>

                    </div>

                </div>

                <div class="books-grid">

                    ${uncategorizedBooks
                .map(bookCard)
                .join("")}

                </div>

            </section>
        `);
    }

    container.innerHTML =
        sections.join("");

    setupBookCoverFallbacks();

    container
        .querySelectorAll(
            ".book-read-btn"
        )
        .forEach((button) => {
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
        });
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

    const pdfUrl =
        getBookPdfUrl(book);

    if (
        !modal ||
        !frame ||
        !title ||
        !pdfUrl
    ) {
        return;
    }

    title.textContent =
        book.title ||
        "قراءة الكتاب";

    frame.src = pdfUrl;

    if (downloadTop) {
        downloadTop.href =
            pdfUrl;
    }

    if (downloadBottom) {
        downloadBottom.href =
            pdfUrl;
    }

    modal.hidden = false;

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

    modal.hidden = true;

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

    if (modal) {
        modal.hidden = true;

        modal.classList.add(
            "hidden"
        );

        modal.setAttribute(
            "aria-hidden",
            "true"
        );

        const frame =
            $("#bookViewerFrame");

        if (frame) {
            frame.src = "";
        }
    }

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
            if (
                event.key === "Escape"
            ) {
                closeBookViewer();
            }
        }
    );
}

/* =========================================================
   SEARCH / FILTER
========================================================= */

function updateFilterState() {
    const clearButton =
        $("#clearFilter");

    if (!clearButton) {
        return;
    }

    const searchInput =
        $("#searchInput");

    const hasSearch =
        Boolean(
            searchInput?.value.trim()
        );

    const hasCategory =
        Boolean(selectedCategory);

    clearButton.disabled =
        !hasSearch &&
        !hasCategory;

    clearButton.classList.toggle(
        "is-disabled",
        !hasSearch &&
        !hasCategory
    );
}

function setupSearch() {
    const searchInput =
        $("#searchInput");

    const clearButton =
        $("#clearFilter");

    if (searchInput) {
        searchInput.classList.add(
            "search"
        );

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
                selectedCategory =
                    null;

                if (searchInput) {
                    searchInput.value = "";
                }

                updateCategorySelection();
                renderProducts();
            }
        );
    }

    updateFilterState();
}

/* =========================================================
   MOBILE MENU
========================================================= */

function setupMobileMenu() {
    const menuButton =
        $(".mobile-menu-btn");

    const nav =
        $(".main-nav");

    if (
        !menuButton ||
        !nav
    ) {
        return;
    }

    menuButton.setAttribute(
        "aria-expanded",
        "false"
    );

    menuButton.addEventListener(
        "click",
        () => {
            const isOpen =
                nav.classList.toggle(
                    "is-open"
                );

            menuButton.setAttribute(
                "aria-expanded",
                String(isOpen)
            );

            menuButton.classList.toggle(
                "is-open",
                isOpen
            );
        }
    );

    nav
        .querySelectorAll("a")
        .forEach((link) => {
            link.addEventListener(
                "click",
                () => {
                    nav.classList.remove(
                        "is-open"
                    );

                    menuButton.classList.remove(
                        "is-open"
                    );

                    menuButton.setAttribute(
                        "aria-expanded",
                        "false"
                    );
                }
            );
        });
}

/* =========================================================
   SMOOTH NAVIGATION
========================================================= */

function setupNavigation() {
    document
        .querySelectorAll(
            'a[href^="#"]'
        )
        .forEach((link) => {
            link.addEventListener(
                "click",
                (event) => {
                    const targetId =
                        link
                            .getAttribute(
                                "href"
                            )
                            ?.slice(1);

                    if (!targetId) {
                        return;
                    }

                    const target =
                        document.getElementById(
                            targetId
                        );

                    if (!target) {
                        return;
                    }

                    event.preventDefault();

                    target.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });
                }
            );
        });
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

        setupBookViewer();

        setupSearch();
        setupMobileMenu();
        setupNavigation();

        try {
            await loadData();
        } catch (error) {
            console.error(
                "Basmah Library initialization error:",
                error
            );

            /*
             * في حالة فشل الاتصال بقاعدة البيانات،
             * لا نترك المستخدم أمام صفحة فارغة.
             */
            const newsTicker =
                $("#newsTicker");

            if (newsTicker) {
                renderNews();
            }
        }
    }
);