import {
    createClient
} from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

import {
    SUPABASE_URL,
    SUPABASE_ANON_KEY
} from "./config.js";


/* =====================================================
   SUPABASE
===================================================== */

const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);


/* =====================================================
   HELPERS
===================================================== */

const $ = (selector) =>
    document.querySelector(selector);


const esc = (value) =>
    String(value ?? "").replace(
        /[&<>"']/g,
        (char) => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        }[char])
    );


const money = (value) =>
    Number(value || 0).toLocaleString(
        "ar-EG",
        {
            maximumFractionDigits: 2
        }
    );


const now = () =>
    new Date().toISOString();


/* =====================================================
   GLOBAL DATA
===================================================== */

let categories = [];
let products = [];

let newsItems = [];
let editingNewsId = null;

let editingCategoryId = null;
let editingProductId = null;

let selectedFile = null;


/* =====================================================
   BOOK LIBRARY DATA
===================================================== */

let bookCategories = [];
let books = [];

let editingBookCategoryId = null;
let editingBookId = null;

let selectedBookCover = null;
let selectedBookPdf = null;


/* =====================================================
   MESSAGE
===================================================== */

function msg(selector, text, error = true) {

    const element = $(selector);

    if (!element) {
        return;
    }

    element.textContent = text || "";

    element.style.color =
        error
            ? "#a33"
            : "#177440";
}


/* =====================================================
   LOGIN SCREEN
===================================================== */

function showLogin(text = "") {

    $("#adminLogin")
        ?.classList
        .remove("hidden");

    $("#adminPanel")
        ?.classList
        .add("hidden");

    $("#logoutBtn")
        ?.classList
        .add("hidden");

    msg(
        "#adminLoginMessage",
        text
    );
}


/* =====================================================
   ADMIN SCREEN
===================================================== */

function showAdmin() {

    $("#adminLogin")
        ?.classList
        .add("hidden");

    $("#adminPanel")
        ?.classList
        .remove("hidden");

    $("#logoutBtn")
        ?.classList
        .remove("hidden");
}


/* =====================================================
   CHECK ADMIN
===================================================== */

async function checkAdmin() {

    const {
        data: {
            session
        }
    } = await supabase.auth.getSession();


    if (!session) {

        showLogin();

        return;
    }


    const {
        data: profile,
        error
    } = await supabase
        .from("profiles")
        .select("role")
        .eq(
            "id",
            session.user.id
        )
        .maybeSingle();


    if (
        error ||
        profile?.role !== "admin"
    ) {

        await supabase.auth.signOut();

        showLogin(
            "هذا الحساب غير مصرح له بدخول لوحة الإدارة."
        );

        return;
    }


    showAdmin();

    await loadAll();
}


/* =====================================================
   LOAD ALL
===================================================== */

async function loadAll() {

    const [
        categoryResult,
        productResult,
        newsResult,
        bookCategoryResult,
        bookResult
    ] = await Promise.all([

        /* PRODUCT CATEGORIES */

        supabase
            .from("categories")
            .select("*")
            .order(
                "sort_order",
                {
                    ascending: true
                }
            ),


        /* PRODUCTS */

        supabase
            .from("products")
            .select("*")
            .order(
                "sort_order",
                {
                    ascending: true
                }
            )
            .order(
                "created_at",
                {
                    ascending: false
                }
            ),


        /* NEWS */

        supabase
            .from("news_ticker")
            .select("*")
            .order(
                "sort_order",
                {
                    ascending: true
                }
            )
            .order(
                "created_at",
                {
                    ascending: false
                }
            ),


        /* BOOK CATEGORIES */

        supabase
            .from("book_categories")
            .select("*")
            .order(
                "sort_order",
                {
                    ascending: true
                }
            ),


        /* BOOKS */

        supabase
            .from("books")
            .select("*")
            .order(
                "sort_order",
                {
                    ascending: true
                }
            )
            .order(
                "created_at",
                {
                    ascending: false
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


    if (newsResult.error) {

        console.error(
            "News:",
            newsResult.error
        );

        msg(
            "#newsMessage",
            "تعذر تحميل الأخبار: " +
            newsResult.error.message
        );

    }


    if (bookCategoryResult.error) {

        console.error(
            "Book Categories:",
            bookCategoryResult.error
        );

        msg(
            "#bookLibraryMessage",
            "تعذر تحميل أقسام الكتب: " +
            bookCategoryResult.error.message
        );

    }


    if (bookResult.error) {

        console.error(
            "Books:",
            bookResult.error
        );

        msg(
            "#bookLibraryMessage",
            "تعذر تحميل الكتب: " +
            bookResult.error.message
        );

    }


    categories =
        categoryResult.data || [];


    products =
        productResult.data || [];


    newsItems =
        newsResult.data || [];


    bookCategories =
        bookCategoryResult.data || [];


    books =
        bookResult.data || [];


    renderStats();

    fillCategorySelects();

    renderCategories();

    renderProducts();

    renderNews();

    renderBookStats();

    renderBookCategories();

    fillBookCategorySelect();

    renderBooks();
}


/* =====================================================
   PRODUCT STATS
===================================================== */

function renderStats() {

    if ($("#statCategories")) {

        $("#statCategories")
            .textContent =
            categories.filter(
                c => c.active
            ).length;

    }


    if ($("#statProducts")) {

        $("#statProducts")
            .textContent =
            products.length;

    }


    if ($("#statActive")) {

        $("#statActive")
            .textContent =
            products.filter(
                p => p.active
            ).length;

    }
}


/* =====================================================
   BOOK STATS
===================================================== */

function renderBookStats() {

    const statCategories =
        $("#statBookCategories");

    const statBooks =
        $("#statBooks");

    const statActiveBooks =
        $("#statActiveBooks");


    if (statCategories) {

        statCategories.textContent =
            bookCategories.filter(
                category =>
                    category.active
            ).length;

    }


    if (statBooks) {

        statBooks.textContent =
            books.length;

    }


    if (statActiveBooks) {

        statActiveBooks.textContent =
            books.filter(
                book =>
                    book.active
            ).length;

    }
}


/* =====================================================
   PRODUCT CATEGORY SELECTS
===================================================== */

function fillCategorySelects() {

    const options =
        categories
            .map(
                c => `
                    <option value="${esc(c.id)}">
                        ${esc(c.name)}
                        ${c.active ? "" : " — مخفي"}
                    </option>
                `
            )
            .join("");


    if ($("#productCategory")) {

        $("#productCategory").innerHTML = `
            <option value="">
                اختر القسم
            </option>

            ${options}
        `;

    }


    const oldValue =
        $("#productCategoryFilter")
            ?.value || "";


    if ($("#productCategoryFilter")) {

        $("#productCategoryFilter")
            .innerHTML = `
                <option value="">
                    كل الأقسام
                </option>

                ${options}
            `;


        $("#productCategoryFilter")
            .value =
            oldValue;

    }
}


/* =====================================================
   PRODUCT CATEGORIES
===================================================== */

function renderCategories() {

    const search =
        $("#categorySearch")
            ?.value
            .trim()
            .toLowerCase() || "";


    const list =
        categories.filter(
            c =>
                !search ||
                String(c.name)
                    .toLowerCase()
                    .includes(search)
        );


    const container =
        $("#adminCategories");


    if (!container) {
        return;
    }


    container.innerHTML =
        list
            .map(
                c => `
                    <article
                        class="category-admin-card"
                    >

                        <div class="category-admin-top">

                            <div class="category-admin-icon">
                                ✦
                            </div>

                            <div>

                                <strong>
                                    ${esc(c.name)}
                                </strong>

                                <p>
                                    ${esc(
                    c.description || ""
                )}
                                </p>

                                <small>
                                    الترتيب:
                                    ${c.sort_order}
                                    •
                                    ${c.active
                        ? "ظاهر"
                        : "مخفي"
                    }
                                </small>

                            </div>

                        </div>


                        <div class="row-actions">

                            <button
                                type="button"
                                data-edit-cat="${esc(c.id)}"
                            >
                                تعديل
                            </button>

                            <button
                                type="button"
                                data-toggle-cat="${esc(c.id)}"
                            >
                                ${c.active
                        ? "إخفاء"
                        : "إظهار"
                    }
                            </button>

                        </div>

                    </article>
                `
            )
            .join("")
        ||
        `
            <div class="empty-state">
                لا توجد أقسام.
            </div>
        `;


    document
        .querySelectorAll(
            "[data-edit-cat]"
        )
        .forEach(
            button => {

                button.onclick =
                    () =>
                        openCategory(
                            button.dataset.editCat
                        );

            }
        );


    document
        .querySelectorAll(
            "[data-toggle-cat]"
        )
        .forEach(
            button => {

                button.onclick =
                    () =>
                        toggleCategory(
                            button.dataset.toggleCat
                        );

            }
        );
}


/* =====================================================
   PRODUCTS
===================================================== */

function renderProducts() {

    const search =
        $("#productSearch")
            ?.value
            .trim()
            .toLowerCase() || "";


    const categoryId =
        $("#productCategoryFilter")
            ?.value || "";


    const list =
        products.filter(
            product => {

                const categoryMatch =
                    !categoryId ||
                    String(product.category_id) ===
                    String(categoryId);


                const searchText =
                    [
                        product.name,
                        product.description,
                        product.price_note
                    ]
                        .filter(Boolean)
                        .join(" ")
                        .toLowerCase();


                const searchMatch =
                    !search ||
                    searchText.includes(search);


                return (
                    categoryMatch &&
                    searchMatch
                );
            }
        );


    const container =
        $("#adminProducts");


    if (!container) {
        return;
    }


    container.innerHTML =
        list
            .map(productCard)
            .join("")
        ||
        `
            <div class="empty-state">
                لا توجد منتجات مطابقة.
            </div>
        `;


    document
        .querySelectorAll(
            "[data-edit-product]"
        )
        .forEach(
            button => {

                button.onclick =
                    () =>
                        openProduct(
                            button.dataset.editProduct
                        );

            }
        );


    document
        .querySelectorAll(
            "[data-toggle-product]"
        )
        .forEach(
            button => {

                button.onclick =
                    () =>
                        toggleProduct(
                            button.dataset.toggleProduct
                        );

            }
        );
}


/* =====================================================
   PRODUCT CARD
===================================================== */

function productCard(product) {

    const category =
        categories.find(
            c =>
                String(c.id) ===
                String(product.category_id)
        );


    const image =
        product.image_url
            ? `
                <img
                    src="${esc(product.image_url)}"
                    alt="${esc(product.name)}"
                >
            `
            : `
                <div class="admin-placeholder">
                    بدون صورة
                </div>
            `;


    const price =
        product.price !== null &&
            product.price !== undefined &&
            Number(product.price) > 0

            ? `${money(product.price)} ج.م`

            : "حسب الطلب";


    return `
        <article
            class="admin-product-card"
        >

            <div class="admin-product-image">
                ${image}
            </div>


            <div class="admin-product-main">

                <span class="eyebrow">
                    ${esc(
        category?.name ||
        product.category ||
        "بدون قسم"
    )}
                </span>


                <h3>
                    ${esc(product.name)}
                </h3>


                <div class="admin-price">

                    ${price}

                    ${product.price_note
            ? `
                                <small>
                                    ${esc(
                product.price_note
            )}
                                </small>
                            `
            : ""
        }

                </div>


                <span
                    class="status ${product.active
            ? "on"
            : "off"
        }"
                >
                    ${product.active
            ? "ظاهر"
            : "مخفي"
        }
                </span>


                <div class="row-actions">

                    <button
                        type="button"
                        data-edit-product="${esc(product.id)}"
                    >
                        تعديل
                    </button>


                    <button
                        type="button"
                        data-toggle-product="${esc(product.id)}"
                    >
                        ${product.active
            ? "إخفاء"
            : "إظهار"
        }
                    </button>

                </div>

            </div>

        </article>
    `;
}


/* =====================================================
   NEWS
===================================================== */

function renderNews() {

    const container =
        $("#adminNews");


    if (!container) {
        return;
    }


    if (!newsItems.length) {

        container.innerHTML = `
            <div class="empty-state">
                لا توجد أخبار حاليًا.
                اضغط على "إضافة خبر" لإنشاء أول خبر.
            </div>
        `;

        return;
    }


    container.innerHTML =
        newsItems
            .map(
                news => `
                    <article
                        class="admin-news-card"
                    >

                        <div class="admin-news-main">

                            <div class="admin-news-status">

                                <span
                                    class="status ${news.active
                        ? "on"
                        : "off"
                    }"
                                >
                                    ${news.active
                        ? "ظاهر"
                        : "مخفي"
                    }
                                </span>

                                <small>
                                    الترتيب:
                                    ${news.sort_order}
                                </small>

                            </div>


                            <p class="admin-news-text">
                                ${esc(news.text)}
                            </p>

                        </div>


                        <div class="row-actions">

                            <button
                                type="button"
                                data-edit-news="${esc(news.id)}"
                            >
                                تعديل
                            </button>


                            <button
                                type="button"
                                data-toggle-news="${esc(news.id)}"
                            >
                                ${news.active
                        ? "إخفاء"
                        : "إظهار"
                    }
                            </button>


                            <button
                                type="button"
                                data-delete-news="${esc(news.id)}"
                                class="danger-btn"
                            >
                                حذف
                            </button>

                        </div>

                    </article>
                `
            )
            .join("");


    document
        .querySelectorAll(
            "[data-edit-news]"
        )
        .forEach(
            button => {

                button.onclick =
                    () =>
                        openNews(
                            button.dataset.editNews
                        );

            }
        );


    document
        .querySelectorAll(
            "[data-toggle-news]"
        )
        .forEach(
            button => {

                button.onclick =
                    () =>
                        toggleNews(
                            button.dataset.toggleNews
                        );

            }
        );


    document
        .querySelectorAll(
            "[data-delete-news]"
        )
        .forEach(
            button => {

                button.onclick =
                    () =>
                        deleteNews(
                            button.dataset.deleteNews
                        );

            }
        );
}


/* =====================================================
   OPEN NEWS
===================================================== */

function openNews(id = null) {

    editingNewsId = id;


    const news =
        newsItems.find(
            item =>
                String(item.id) ===
                String(id)
        );


    $("#newsModalTitle")
        .textContent =
        id
            ? "تعديل الخبر"
            : "إضافة خبر";


    $("#newsId")
        .value =
        id || "";


    $("#newsText")
        .value =
        news?.text || "";


    $("#newsOrder")
        .value =
        news?.sort_order ??
        newsItems.length;


    $("#newsActive")
        .checked =
        news?.active ??
        true;


    msg(
        "#newsFormMessage",
        ""
    );


    $("#newsModal")
        ?.classList
        .remove("hidden");
}


/* =====================================================
   SAVE NEWS
===================================================== */

async function saveNews() {

    const text =
        $("#newsText")
            ?.value
            .trim() || "";


    const sortOrder =
        Number(
            $("#newsOrder")
                ?.value
        ) || 0;


    const active =
        $("#newsActive")
            ?.checked ??
        true;


    if (!text) {

        return msg(
            "#newsFormMessage",
            "اكتب نص الخبر."
        );

    }


    if (text.length > 250) {

        return msg(
            "#newsFormMessage",
            "نص الخبر يجب ألا يتجاوز 250 حرفًا."
        );

    }


    const payload = {

        text,

        active,

        sort_order:
            sortOrder,

        updated_at:
            now()

    };


    msg(
        "#newsFormMessage",
        "جاري الحفظ...",
        false
    );


    const result =
        editingNewsId

            ? await supabase
                .from("news_ticker")
                .update(payload)
                .eq(
                    "id",
                    editingNewsId
                )

            : await supabase
                .from("news_ticker")
                .insert(payload);


    if (result.error) {

        return msg(
            "#newsFormMessage",
            "تعذر حفظ الخبر: " +
            result.error.message
        );

    }


    $("#newsModal")
        ?.classList
        .add("hidden");


    editingNewsId = null;


    await loadAll();
}


/* =====================================================
   TOGGLE NEWS
===================================================== */

async function toggleNews(id) {

    const news =
        newsItems.find(
            item =>
                String(item.id) ===
                String(id)
        );


    if (!news) {
        return;
    }


    const {
        error
    } =
        await supabase
            .from("news_ticker")
            .update({

                active:
                    !news.active,

                updated_at:
                    now()

            })
            .eq(
                "id",
                id
            );


    if (error) {

        alert(
            "تعذر تغيير حالة الخبر:\n" +
            error.message
        );

        return;
    }


    await loadAll();
}


/* =====================================================
   DELETE NEWS
===================================================== */

async function deleteNews(id) {

    const news =
        newsItems.find(
            item =>
                String(item.id) ===
                String(id)
        );


    if (!news) {
        return;
    }


    const confirmed =
        confirm(
            "هل أنت متأكد من حذف هذا الخبر؟\n\n" +
            news.text
        );


    if (!confirmed) {
        return;
    }


    const {
        error
    } =
        await supabase
            .from("news_ticker")
            .delete()
            .eq(
                "id",
                id
            );


    if (error) {

        alert(
            "تعذر حذف الخبر:\n" +
            error.message
        );

        return;
    }


    await loadAll();
}


/* =====================================================
   OPEN PRODUCT CATEGORY
===================================================== */

function openCategory(id = null) {

    editingCategoryId = id;


    const category =
        categories.find(
            c =>
                String(c.id) ===
                String(id)
        );


    $("#categoryModalTitle")
        .textContent =
        id
            ? "تعديل القسم"
            : "إضافة قسم";


    $("#categoryId")
        .value =
        id || "";


    $("#categoryName")
        .value =
        category?.name || "";


    $("#categoryDescription")
        .value =
        category?.description || "";


    $("#categoryOrder")
        .value =
        category?.sort_order ??
        categories.length + 1;


    $("#categoryActive")
        .checked =
        category?.active ??
        true;


    msg(
        "#categoryMessage",
        ""
    );


    $("#categoryModal")
        ?.classList
        .remove("hidden");
}


/* =====================================================
   SAVE PRODUCT CATEGORY
===================================================== */

async function saveCategory() {

    const name =
        $("#categoryName")
            .value
            .trim();


    if (!name) {

        return msg(
            "#categoryMessage",
            "اكتب اسم القسم."
        );

    }


    let slug;


    if (editingCategoryId) {

        slug =
            categories.find(
                c =>
                    String(c.id) ===
                    String(editingCategoryId)
            )?.slug ||
            `category-${editingCategoryId}`;

    } else {

        const baseSlug =
            name
                .toLowerCase()
                .replace(
                    /[^\p{L}\p{N}]+/gu,
                    "-"
                )
                .replace(
                    /^-|-$/g,
                    ""
                );


        slug =
            `${baseSlug}-${crypto
                .randomUUID()
                .slice(0, 8)}`;

    }


    const payload = {

        name,

        slug,

        description:
            $("#categoryDescription")
                .value
                .trim(),

        sort_order:
            Number(
                $("#categoryOrder")
                    .value
            ) || 0,

        active:
            $("#categoryActive")
                .checked,

        updated_at:
            now()

    };


    msg(
        "#categoryMessage",
        "جاري الحفظ...",
        false
    );


    const result =
        editingCategoryId

            ? await supabase
                .from("categories")
                .update(payload)
                .eq(
                    "id",
                    editingCategoryId
                )

            : await supabase
                .from("categories")
                .insert(payload);


    if (result.error) {

        return msg(
            "#categoryMessage",
            result.error.message
        );

    }


    $("#categoryModal")
        ?.classList
        .add("hidden");


    await loadAll();
}


/* =====================================================
   TOGGLE PRODUCT CATEGORY
===================================================== */

async function toggleCategory(id) {

    const category =
        categories.find(
            c =>
                String(c.id) ===
                String(id)
        );


    if (!category) {
        return;
    }


    const {
        error
    } =
        await supabase
            .from("categories")
            .update({

                active:
                    !category.active,

                updated_at:
                    now()

            })
            .eq(
                "id",
                id
            );


    if (error) {

        alert(error.message);

        return;
    }


    await loadAll();
}


/* =====================================================
   OPEN PRODUCT
===================================================== */

function openProduct(id = null) {

    editingProductId = id;

    selectedFile = null;


    const product =
        products.find(
            p =>
                String(p.id) ===
                String(id)
        );


    $("#productModalTitle")
        .textContent =
        id
            ? "تعديل المنتج"
            : "إضافة منتج";


    $("#productId")
        .value =
        id || "";


    $("#productName")
        .value =
        product?.name || "";


    $("#productCategory")
        .value =
        product?.category_id || "";


    $("#productPrice")
        .value =
        product?.price ?? "";


    $("#productPriceNote")
        .value =
        product?.price_note || "";


    $("#productDescription")
        .value =
        product?.description || "";


    $("#productActive")
        .checked =
        product?.active ??
        true;


    $("#productOrder")
        .value =
        product?.sort_order ??
        0;


    $("#productImageFile")
        .value =
        "";


    if (product?.image_url) {

        $("#imagePreview")
            .innerHTML = `
                <img
                    src="${esc(product.image_url)}"
                    alt=""
                >
            `;

    } else {

        $("#imagePreview")
            .innerHTML =
            "";

    }


    msg(
        "#productMessage",
        ""
    );


    $("#productModal")
        ?.classList
        .remove("hidden");
}


/* =====================================================
   PRODUCT IMAGE
===================================================== */

$("#productImageFile")
    ?.addEventListener(
        "change",
        event => {

            selectedFile =
                event.target.files[0] ||
                null;


            if (!selectedFile) {
                return;
            }


            if (
                selectedFile.size >
                5 * 1024 * 1024
            ) {

                selectedFile = null;

                event.target.value = "";

                return msg(
                    "#productMessage",
                    "الصورة أكبر من 5MB."
                );

            }


            const allowedTypes = [
                "image/jpeg",
                "image/png",
                "image/webp"
            ];


            if (
                !allowedTypes.includes(
                    selectedFile.type
                )
            ) {

                selectedFile = null;

                event.target.value = "";

                return msg(
                    "#productMessage",
                    "نوع الصورة غير مدعوم."
                );

            }


            const url =
                URL.createObjectURL(
                    selectedFile
                );


            $("#imagePreview")
                .innerHTML = `
                    <img
                        src="${url}"
                        alt="معاينة"
                    >
                `;
        }
    );


/* =====================================================
   SAVE PRODUCT
===================================================== */

async function saveProduct() {

    const name =
        $("#productName")
            .value
            .trim();


    const categoryId =
        $("#productCategory")
            .value;


    const priceText =
        $("#productPrice")
            .value
            .trim();


    const price =
        priceText === ""
            ? null
            : Number(priceText);


    const category =
        categories.find(
            c =>
                String(c.id) ===
                String(categoryId)
        );


    if (!name) {

        return msg(
            "#productMessage",
            "اكتب اسم المنتج."
        );

    }


    if (!categoryId) {

        return msg(
            "#productMessage",
            "اختر القسم."
        );

    }


    if (
        price !== null &&
        (
            !Number.isFinite(price) ||
            price < 0
        )
    ) {

        return msg(
            "#productMessage",
            "اكتب سعرًا صحيحًا."
        );

    }


    let imageUrl =
        products.find(
            p =>
                String(p.id) ===
                String(editingProductId)
        )?.image_url ||
        null;


    if (selectedFile) {

        const extension =
            selectedFile.name
                .split(".")
                .pop()
                .toLowerCase();


        const path =
            `products/${crypto.randomUUID()}.${extension}`;


        msg(
            "#productMessage",
            "جاري رفع الصورة...",
            false
        );


        const upload =
            await supabase
                .storage
                .from("product-images")
                .upload(
                    path,
                    selectedFile,
                    {
                        upsert: false,
                        contentType:
                            selectedFile.type
                    }
                );


        if (upload.error) {

            return msg(
                "#productMessage",
                "تعذر رفع الصورة: " +
                upload.error.message
            );

        }


        imageUrl =
            supabase
                .storage
                .from("product-images")
                .getPublicUrl(path)
                .data
                .publicUrl;

    }


    const payload = {

        name,

        category_id:
            categoryId,

        category:
            category?.name ||
            "",

        price,

        price_note:
            $("#productPriceNote")
                .value
                .trim(),

        description:
            $("#productDescription")
                .value
                .trim(),

        image_url:
            imageUrl,

        active:
            $("#productActive")
                .checked,

        sort_order:
            Number(
                $("#productOrder")
                    .value
            ) || 0,

        updated_at:
            now()

    };


    msg(
        "#productMessage",
        "جاري حفظ المنتج...",
        false
    );


    const result =
        editingProductId

            ? await supabase
                .from("products")
                .update(payload)
                .eq(
                    "id",
                    editingProductId
                )

            : await supabase
                .from("products")
                .insert(payload);


    if (result.error) {

        return msg(
            "#productMessage",
            result.error.message
        );

    }


    $("#productModal")
        ?.classList
        .add("hidden");


    await loadAll();
}


/* =====================================================
   TOGGLE PRODUCT
===================================================== */

async function toggleProduct(id) {

    const product =
        products.find(
            p =>
                String(p.id) ===
                String(id)
        );


    if (!product) {
        return;
    }


    const {
        error
    } =
        await supabase
            .from("products")
            .update({

                active:
                    !product.active,

                updated_at:
                    now()

            })
            .eq(
                "id",
                id
            );


    if (error) {

        alert(error.message);

        return;
    }


    await loadAll();
}


/* =====================================================
   =====================================================
   BOOK LIBRARY
   =====================================================
   ===================================================== */


/* =====================================================
   BOOK CATEGORY SELECT
===================================================== */

function fillBookCategorySelect() {

    const select =
        $("#bookCategory");


    if (!select) {
        return;
    }


    select.innerHTML = `
        <option value="">
            اختر قسم الكتاب
        </option>

        ${bookCategories
            .map(
                category => `
                        <option
                            value="${esc(category.id)}"
                        >
                            ${esc(category.name)}
                            ${category.active
                        ? ""
                        : " — مخفي"
                    }
                        </option>
                    `
            )
            .join("")
        }
    `;
}


/* =====================================================
   BOOK CATEGORY ICON
===================================================== */

function bookCategoryIcon(slug) {

    const icons = {

        law: "⚖",

        legal: "⚖",

        literature: "✒",

        novels: "▤",

        religion: "☾",

        education: "▣",

        children: "♡",

        history: "⌛",

        science: "✦",

        technology: "⌘",

        medicine: "✚",

        business: "◈"

    };


    return icons[slug] || "▤";
}


/* =====================================================
   RENDER BOOK CATEGORIES
===================================================== */

function renderBookCategories() {

    const container =
        $("#adminBookCategories");


    if (!container) {
        return;
    }


    if (!bookCategories.length) {

        container.innerHTML = `
            <div class="empty-state">
                لا توجد أقسام كتب حتى الآن.
                اضغط على "قسم كتب جديد".
            </div>
        `;

        return;
    }


    container.innerHTML =
        bookCategories
            .map(
                category => {

                    const count =
                        books.filter(
                            book =>
                                String(book.category_id) ===
                                String(category.id)
                        ).length;


                    return `
                        <article
                            class="category-admin-card"
                        >

                            <div class="category-admin-top">

                                <div class="category-admin-icon">
                                    ${bookCategoryIcon(
                        category.slug
                    )}
                                </div>


                                <div>

                                    <strong>
                                        ${esc(category.name)}
                                    </strong>


                                    ${category.description
                            ? `
                                                <p>
                                                    ${esc(
                                category.description
                            )}
                                                </p>
                                            `
                            : ""
                        }


                                    <small>
                                        ${count}
                                        ${count === 1
                            ? " كتاب"
                            : " كتب"
                        }

                                        •

                                        الترتيب:
                                        ${category.sort_order}

                                        •

                                        ${category.active
                            ? "ظاهر"
                            : "مخفي"
                        }

                                    </small>

                                </div>

                            </div>


                            <div class="row-actions">

                                <button
                                    type="button"
                                    data-edit-book-category="${esc(
                            category.id
                        )}"
                                >
                                    تعديل
                                </button>


                                <button
                                    type="button"
                                    data-toggle-book-category="${esc(
                            category.id
                        )}"
                                >
                                    ${category.active
                            ? "إخفاء"
                            : "إظهار"
                        }
                                </button>

                            </div>

                        </article>
                    `;
                }
            )
            .join("");


    document
        .querySelectorAll(
            "[data-edit-book-category]"
        )
        .forEach(
            button => {

                button.onclick =
                    () =>
                        openBookCategory(
                            button.dataset
                                .editBookCategory
                        );

            }
        );


    document
        .querySelectorAll(
            "[data-toggle-book-category]"
        )
        .forEach(
            button => {

                button.onclick =
                    () =>
                        toggleBookCategory(
                            button.dataset
                                .toggleBookCategory
                        );

            }
        );
}


/* =====================================================
   OPEN BOOK CATEGORY
===================================================== */

function openBookCategory(id = null) {

    editingBookCategoryId =
        id;


    const category =
        bookCategories.find(
            item =>
                String(item.id) ===
                String(id)
        );


    $("#bookCategoryModalTitle")
        .textContent =
        id
            ? "تعديل قسم الكتب"
            : "إضافة قسم كتب";


    $("#bookCategoryId")
        .value =
        id || "";


    $("#bookCategoryName")
        .value =
        category?.name || "";


    $("#bookCategoryDescription")
        .value =
        category?.description || "";


    $("#bookCategoryOrder")
        .value =
        category?.sort_order ??
        bookCategories.length;


    $("#bookCategoryActive")
        .checked =
        category?.active ??
        true;


    msg(
        "#bookCategoryMessage",
        ""
    );


    $("#bookCategoryModal")
        ?.classList
        .remove("hidden");
}


/* =====================================================
   SAVE BOOK CATEGORY
===================================================== */

async function saveBookCategory() {

    const name =
        $("#bookCategoryName")
            ?.value
            .trim() || "";


    if (!name) {

        return msg(
            "#bookCategoryMessage",
            "اكتب اسم قسم الكتب."
        );

    }


    let slug;


    if (editingBookCategoryId) {

        const oldCategory =
            bookCategories.find(
                category =>
                    String(category.id) ===
                    String(editingBookCategoryId)
            );


        slug =
            oldCategory?.slug ||
            `book-category-${editingBookCategoryId}`;

    } else {

        const baseSlug =
            name
                .toLowerCase()
                .replace(
                    /[^\p{L}\p{N}]+/gu,
                    "-"
                )
                .replace(
                    /^-|-$/g,
                    ""
                );


        slug =
            `${baseSlug}-${crypto
                .randomUUID()
                .slice(0, 8)}`;
    }


    const payload = {

        name,

        slug,

        description:
            $("#bookCategoryDescription")
                ?.value
                .trim() || "",

        sort_order:
            Number(
                $("#bookCategoryOrder")
                    ?.value
            ) || 0,

        active:
            $("#bookCategoryActive")
                ?.checked ??
            true,

        updated_at:
            now()

    };


    msg(
        "#bookCategoryMessage",
        "جاري الحفظ...",
        false
    );


    const result =
        editingBookCategoryId

            ? await supabase
                .from("book_categories")
                .update(payload)
                .eq(
                    "id",
                    editingBookCategoryId
                )

            : await supabase
                .from("book_categories")
                .insert(payload);


    if (result.error) {

        return msg(
            "#bookCategoryMessage",
            "تعذر حفظ قسم الكتب: " +
            result.error.message
        );

    }


    $("#bookCategoryModal")
        ?.classList
        .add("hidden");


    editingBookCategoryId =
        null;


    await loadAll();
}


/* =====================================================
   TOGGLE BOOK CATEGORY
===================================================== */

async function toggleBookCategory(id) {

    const category =
        bookCategories.find(
            item =>
                String(item.id) ===
                String(id)
        );


    if (!category) {
        return;
    }


    const {
        error
    } =
        await supabase
            .from("book_categories")
            .update({

                active:
                    !category.active,

                updated_at:
                    now()

            })
            .eq(
                "id",
                id
            );


    if (error) {

        alert(
            "تعذر تغيير حالة قسم الكتب:\n" +
            error.message
        );

        return;
    }


    await loadAll();
}


/* =====================================================
   RENDER BOOKS
===================================================== */

function renderBooks() {

    const container =
        $("#adminBooks");


    if (!container) {
        return;
    }


    if (!books.length) {

        container.innerHTML = `
            <div class="empty-state">
                لا توجد كتب حتى الآن.
                اضغط على "كتاب جديد" لإضافة أول كتاب.
            </div>
        `;

        return;
    }


    container.innerHTML =
        books
            .map(
                book => {

                    const category =
                        bookCategories.find(
                            item =>
                                String(item.id) ===
                                String(book.category_id)
                        );


                    const cover =
                        book.cover_url
                            ? `
                                <img
                                    src="${esc(book.cover_url)}"
                                    alt="${esc(book.title)}"
                                    loading="lazy"
                                >
                            `
                            : `
                                <div class="admin-placeholder">
                                    بدون غلاف
                                </div>
                            `;


                    return `
                        <article
                            class="admin-book-card"
                        >

                            <div class="admin-book-cover">
                                ${cover}
                            </div>


                            <div class="admin-book-main">

                                <span class="eyebrow">
                                    ${esc(
                        category?.name ||
                        "بدون قسم"
                    )
                        }
                                </span>


                                <h3>
                                    ${esc(book.title)}
                                </h3>


                                ${book.author
                            ? `
                                            <p>
                                                المؤلف:
                                                ${esc(book.author)}
                                            </p>
                                        `
                            : ""
                        }


                                ${Number(book.pages) > 0
                            ? `
                                            <small>
                                                ${money(book.pages)}
                                                صفحة
                                            </small>
                                        `
                            : ""
                        }


                                <div class="admin-book-status">

                                    <span
                                        class="status ${book.active
                            ? "on"
                            : "off"
                        }"
                                    >
                                        ${book.active
                            ? "ظاهر"
                            : "مخفي"
                        }
                                    </span>


                                    <span>
                                        ${book.pdf_url
                            ? "PDF متاح"
                            : "بدون PDF"
                        }
                                    </span>

                                </div>


                                <div class="row-actions">

                                    <button
                                        type="button"
                                        data-edit-book="${esc(book.id)}"
                                    >
                                        تعديل
                                    </button>


                                    <button
                                        type="button"
                                        data-toggle-book="${esc(book.id)}"
                                    >
                                        ${book.active
                            ? "إخفاء"
                            : "إظهار"
                        }
                                    </button>


                                    <button
                                        type="button"
                                        data-delete-book="${esc(book.id)}"
                                        class="danger-btn"
                                    >
                                        حذف
                                    </button>

                                </div>

                            </div>

                        </article>
                    `;
                }
            )
            .join("");


    document
        .querySelectorAll(
            "[data-edit-book]"
        )
        .forEach(
            button => {

                button.onclick =
                    () =>
                        openBook(
                            button.dataset.editBook
                        );

            }
        );


    document
        .querySelectorAll(
            "[data-toggle-book]"
        )
        .forEach(
            button => {

                button.onclick =
                    () =>
                        toggleBook(
                            button.dataset.toggleBook
                        );

            }
        );


    document
        .querySelectorAll(
            "[data-delete-book]"
        )
        .forEach(
            button => {

                button.onclick =
                    () =>
                        deleteBook(
                            button.dataset.deleteBook
                        );

            }
        );
}


/* =====================================================
   OPEN BOOK
===================================================== */

function openBook(id = null) {

    editingBookId =
        id;


    selectedBookCover = null;

    selectedBookPdf = null;


    const book =
        books.find(
            item =>
                String(item.id) ===
                String(id)
        );


    $("#bookModalTitle")
        .textContent =
        id
            ? "تعديل الكتاب"
            : "إضافة كتاب";


    $("#bookId")
        .value =
        id || "";


    $("#bookTitle")
        .value =
        book?.title || "";


    $("#bookCategory")
        .value =
        book?.category_id || "";


    $("#bookAuthor")
        .value =
        book?.author || "";


    $("#bookDescription")
        .value =
        book?.description || "";


    $("#bookPages")
        .value =
        book?.pages ?? "";


    $("#bookOrder")
        .value =
        book?.sort_order ??
        books.length;


    $("#bookActive")
        .checked =
        book?.active ??
        true;


    $("#bookCoverFile")
        .value =
        "";


    $("#bookPdfFile")
        .value =
        "";


    const coverPreview =
        $("#bookCoverPreview");


    if (coverPreview) {

        if (book?.cover_url) {

            coverPreview.innerHTML = `
                <img
                    src="${esc(book.cover_url)}"
                    alt=""
                >
            `;

        } else {

            coverPreview.innerHTML = `
                <div class="admin-placeholder">
                    لا يوجد غلاف
                </div>
            `;

        }

    }


    const pdfStatus =
        $("#bookPdfStatus");


    if (pdfStatus) {

        pdfStatus.innerHTML =
            book?.pdf_url
                ? `
                    <span class="status on">
                        ملف PDF موجود
                    </span>
                `
                : `
                    <span class="status off">
                        لا يوجد ملف PDF
                    </span>
                `;

    }


    msg(
        "#bookMessage",
        ""
    );


    $("#bookModal")
        ?.classList
        .remove("hidden");
}


/* =====================================================
   BOOK COVER FILE
===================================================== */

$("#bookCoverFile")
    ?.addEventListener(
        "change",
        event => {

            selectedBookCover =
                event.target.files[0] ||
                null;


            if (!selectedBookCover) {
                return;
            }


            const allowedTypes = [
                "image/jpeg",
                "image/png",
                "image/webp"
            ];


            if (
                !allowedTypes.includes(
                    selectedBookCover.type
                )
            ) {

                selectedBookCover = null;

                event.target.value = "";

                return msg(
                    "#bookMessage",
                    "غلاف الكتاب يجب أن يكون JPG أو PNG أو WEBP."
                );

            }


            if (
                selectedBookCover.size >
                5 * 1024 * 1024
            ) {

                selectedBookCover = null;

                event.target.value = "";

                return msg(
                    "#bookMessage",
                    "حجم غلاف الكتاب يجب ألا يتجاوز 5MB."
                );

            }


            const url =
                URL.createObjectURL(
                    selectedBookCover
                );


            $("#bookCoverPreview")
                .innerHTML = `
                    <img
                        src="${url}"
                        alt="معاينة الغلاف"
                    >
                `;
        }
    );


/* =====================================================
   BOOK PDF FILE
===================================================== */

$("#bookPdfFile")
    ?.addEventListener(
        "change",
        event => {

            selectedBookPdf =
                event.target.files[0] ||
                null;


            if (!selectedBookPdf) {
                return;
            }


            if (
                selectedBookPdf.type !==
                "application/pdf"
            ) {

                selectedBookPdf = null;

                event.target.value = "";

                return msg(
                    "#bookMessage",
                    "الملف يجب أن يكون بصيغة PDF فقط."
                );

            }


            $("#bookPdfStatus")
                .innerHTML = `
                    <span class="status on">
                        تم اختيار:
                        ${esc(selectedBookPdf.name)}
                    </span>
                `;
        }
    );


/* =====================================================
   UPLOAD BOOK FILE
===================================================== */

async function uploadBookFile(
    file,
    folder
) {

    if (!file) {
        return null;
    }


    const extension =
        file.name
            .split(".")
            .pop()
            .toLowerCase();


    const path =
        `${folder}/${crypto.randomUUID()}.${extension}`;


    const upload =
        await supabase
            .storage
            .from("book-library")
            .upload(
                path,
                file,
                {
                    upsert: false,
                    contentType:
                        file.type
                }
            );


    if (upload.error) {

        throw new Error(
            upload.error.message
        );

    }


    const publicUrl =
        supabase
            .storage
            .from("book-library")
            .getPublicUrl(path)
            .data
            .publicUrl;


    return publicUrl;
}


/* =====================================================
   SAVE BOOK
===================================================== */

async function saveBook() {

    const title =
        $("#bookTitle")
            ?.value
            .trim() || "";


    const categoryId =
        $("#bookCategory")
            ?.value || "";


    const author =
        $("#bookAuthor")
            ?.value
            .trim() || "";


    const description =
        $("#bookDescription")
            ?.value
            .trim() || "";


    const pagesText =
        $("#bookPages")
            ?.value
            .trim() || "";


    const pages =
        pagesText === ""
            ? null
            : Number(pagesText);


    const sortOrder =
        Number(
            $("#bookOrder")
                ?.value
        ) || 0;


    const active =
        $("#bookActive")
            ?.checked ??
        true;


    if (!title) {

        return msg(
            "#bookMessage",
            "اكتب اسم الكتاب."
        );

    }


    if (!categoryId) {

        return msg(
            "#bookMessage",
            "اختر قسم الكتاب."
        );

    }


    if (
        pages !== null &&
        (
            !Number.isInteger(pages) ||
            pages < 0
        )
    ) {

        return msg(
            "#bookMessage",
            "عدد الصفحات يجب أن يكون رقمًا صحيحًا."
        );

    }


    const oldBook =
        books.find(
            item =>
                String(item.id) ===
                String(editingBookId)
        );


    let coverUrl =
        oldBook?.cover_url ||
        null;


    let pdfUrl =
        oldBook?.pdf_url ||
        null;


    try {

        /* ---------------------------------------------
           COVER
        --------------------------------------------- */

        if (selectedBookCover) {

            msg(
                "#bookMessage",
                "جاري رفع غلاف الكتاب...",
                false
            );


            coverUrl =
                await uploadBookFile(
                    selectedBookCover,
                    "covers"
                );
        }


        /* ---------------------------------------------
           PDF
        --------------------------------------------- */

        if (selectedBookPdf) {

            msg(
                "#bookMessage",
                "جاري رفع ملف PDF...",
                false
            );


            pdfUrl =
                await uploadBookFile(
                    selectedBookPdf,
                    "pdfs"
                );
        }


    } catch (error) {

        return msg(
            "#bookMessage",
            "تعذر رفع الملف: " +
            error.message
        );

    }


    if (!pdfUrl) {

        return msg(
            "#bookMessage",
            "يجب رفع ملف PDF للكتاب."
        );

    }


    const payload = {

        category_id:
            categoryId,

        title,

        author,

        description,

        cover_url:
            coverUrl,

        pdf_url:
            pdfUrl,

        pages,

        active,

        sort_order:
            sortOrder,

        updated_at:
            now()

    };


    msg(
        "#bookMessage",
        "جاري حفظ الكتاب...",
        false
    );


    const result =
        editingBookId

            ? await supabase
                .from("books")
                .update(payload)
                .eq(
                    "id",
                    editingBookId
                )

            : await supabase
                .from("books")
                .insert(payload);


    if (result.error) {

        return msg(
            "#bookMessage",
            "تعذر حفظ الكتاب: " +
            result.error.message
        );

    }


    $("#bookModal")
        ?.classList
        .add("hidden");


    editingBookId = null;

    selectedBookCover = null;

    selectedBookPdf = null;


    await loadAll();
}


/* =====================================================
   TOGGLE BOOK
===================================================== */

async function toggleBook(id) {

    const book =
        books.find(
            item =>
                String(item.id) ===
                String(id)
        );


    if (!book) {
        return;
    }


    const {
        error
    } =
        await supabase
            .from("books")
            .update({

                active:
                    !book.active,

                updated_at:
                    now()

            })
            .eq(
                "id",
                id
            );


    if (error) {

        alert(
            "تعذر تغيير حالة الكتاب:\n" +
            error.message
        );

        return;
    }


    await loadAll();
}


/* =====================================================
   DELETE BOOK
===================================================== */

async function deleteBook(id) {

    const book =
        books.find(
            item =>
                String(item.id) ===
                String(id)
        );


    if (!book) {
        return;
    }


    const confirmed =
        confirm(
            `هل أنت متأكد من حذف الكتاب؟\n\n${book.title}`
        );


    if (!confirmed) {
        return;
    }


    const {
        error
    } =
        await supabase
            .from("books")
            .delete()
            .eq(
                "id",
                id
            );


    if (error) {

        alert(
            "تعذر حذف الكتاب:\n" +
            error.message
        );

        return;
    }


    await loadAll();
}


/* =====================================================
   LOGIN
===================================================== */

async function login() {

    const email =
        $("#adminEmail")
            .value
            .trim();


    const password =
        $("#adminPassword")
            .value;


    if (!email || !password) {

        return msg(
            "#adminLoginMessage",
            "اكتب البريد الإلكتروني وكلمة المرور."
        );

    }


    msg(
        "#adminLoginMessage",
        "جاري تسجيل الدخول...",
        false
    );


    const {
        error
    } =
        await supabase.auth
            .signInWithPassword({
                email,
                password
            });


    if (error) {

        return msg(
            "#adminLoginMessage",
            "البريد الإلكتروني أو كلمة المرور غير صحيحة."
        );

    }


    await checkAdmin();
}


/* =====================================================
   EVENTS
===================================================== */


/* LOGIN */

$("#adminLoginBtn")
    ?.addEventListener(
        "click",
        login
    );


/* LOGOUT */

$("#logoutBtn")
    ?.addEventListener(
        "click",
        async () => {

            await supabase.auth.signOut();

            showLogin();

        }
    );


/* PRODUCT CATEGORY */

$("#addCategoryBtn")
    ?.addEventListener(
        "click",
        () =>
            openCategory()
    );


$("#saveCategoryBtn")
    ?.addEventListener(
        "click",
        saveCategory
    );


/* PRODUCT */

$("#addProductBtn")
    ?.addEventListener(
        "click",
        () =>
            openProduct()
    );


$("#saveProductBtn")
    ?.addEventListener(
        "click",
        saveProduct
    );


/* NEWS */

$("#addNewsBtn")
    ?.addEventListener(
        "click",
        () =>
            openNews()
    );


$("#saveNewsBtn")
    ?.addEventListener(
        "click",
        saveNews
    );


/* PRODUCT SEARCH */

$("#categorySearch")
    ?.addEventListener(
        "input",
        renderCategories
    );


$("#productSearch")
    ?.addEventListener(
        "input",
        renderProducts
    );


$("#productCategoryFilter")
    ?.addEventListener(
        "change",
        renderProducts
    );


/* BOOK CATEGORY */

$("#addBookCategoryBtn")
    ?.addEventListener(
        "click",
        () =>
            openBookCategory()
    );


$("#saveBookCategoryBtn")
    ?.addEventListener(
        "click",
        saveBookCategory
    );


/* BOOK */

$("#addBookBtn")
    ?.addEventListener(
        "click",
        () =>
            openBook()
    );


$("#saveBookBtn")
    ?.addEventListener(
        "click",
        saveBook
    );


/* BOOK SEARCH */

$("#bookSearch")
    ?.addEventListener(
        "input",
        renderBooks
    );


$("#bookCategoryFilter")
    ?.addEventListener(
        "change",
        renderBooks
    );


/* CLOSE MODALS */

document
    .querySelectorAll(
        "[data-close]"
    )
    .forEach(
        button => {

            button.onclick =
                () => {

                    $(
                        "#" +
                        button.dataset.close
                    )
                        ?.classList
                        .add("hidden");

                };

        }
    );


/* ENTER LOGIN */

$("#adminPassword")
    ?.addEventListener(
        "keydown",
        event => {

            if (
                event.key ===
                "Enter"
            ) {

                login();

            }

        }
    );


/* =====================================================
   AUTH
===================================================== */

supabase.auth.onAuthStateChange(
    () => {

        setTimeout(
            checkAdmin,
            0
        );

    }
);


/* =====================================================
   START
===================================================== */

showLogin();

checkAdmin();