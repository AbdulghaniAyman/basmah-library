import {
    createClient
} from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

import {
    SUPABASE_URL,
    SUPABASE_ANON_KEY
} from "./config.js";


const supabase =
    createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY
    );


const $ =
    selector =>
        document.querySelector(selector);


const esc =
    value =>
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


const money =
    value =>
        Number(value).toLocaleString(
            "ar-EG",
            {
                maximumFractionDigits: 2
            }
        );


let categories = [];
let products = [];

let editingCategoryId = null;
let editingProductId = null;

let selectedFile = null;


/* =====================================================
   MESSAGE
===================================================== */

function msg(
    selector,
    text,
    error = true
) {

    const element =
        $(selector);

    if (!element) return;

    element.textContent =
        text || "";

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
    } =
        await supabase.auth.getSession();


    if (!session) {

        showLogin();

        return;

    }


    const {
        data: profile,
        error
    } =
        await supabase
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
   LOAD
===================================================== */

async function loadAll() {

    const [
        categoryResult,
        productResult
    ] =
        await Promise.all([

            supabase
                .from("categories")
                .select("*")
                .order(
                    "sort_order",
                    {
                        ascending: true
                    }
                ),

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
                )

        ]);


    categories =
        categoryResult.data || [];

    products =
        productResult.data || [];


    renderStats();
    fillCategorySelects();
    renderCategories();
    renderProducts();
}


/* =====================================================
   STATS
===================================================== */

function renderStats() {

    $("#statCategories")
        .textContent =
        categories.filter(
            c => c.active
        ).length;


    $("#statProducts")
        .textContent =
        products.length;


    $("#statActive")
        .textContent =
        products.filter(
            p => p.active
        ).length;
}


/* =====================================================
   SELECTS
===================================================== */

function fillCategorySelects() {

    const options =
        categories
            .map(
                c => `

                    <option value="${c.id}">

                        ${esc(c.name)}

                        ${c.active
                        ? ""
                        : " — مخفي"
                    }

                    </option>
                `
            )
            .join("");


    $("#productCategory").innerHTML =
        `
            <option value="">
                اختر القسم
            </option>

            ${options}
        `;


    const oldValue =
        $("#productCategoryFilter")
            .value;


    $("#productCategoryFilter")
        .innerHTML =
        `
            <option value="">
                كل الأقسام
            </option>

            ${options}
        `;


    $("#productCategoryFilter")
        .value =
        oldValue;
}


/* =====================================================
   CATEGORIES
===================================================== */

function renderCategories() {

    const search =
        $("#categorySearch")
            .value
            .trim()
            .toLowerCase();


    const list =
        categories.filter(
            c =>
                !search ||
                c.name
                    .toLowerCase()
                    .includes(search)
        );


    $("#adminCategories")
        .innerHTML =
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
                    c.description ||
                    ""
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
                                data-edit-cat="${c.id}"
                            >
                                تعديل
                            </button>


                            <button
                                type="button"
                                data-toggle-cat="${c.id}"
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
            .value
            .trim()
            .toLowerCase();


    const categoryId =
        $("#productCategoryFilter")
            .value;


    const list =
        products.filter(
            product => {

                const categoryMatch =
                    !categoryId ||
                    product.category_id ===
                    categoryId;


                const searchMatch =
                    !search ||
                    `${product.name} ${product.description || ""
                        }`
                        .toLowerCase()
                        .includes(search);


                return (
                    categoryMatch &&
                    searchMatch
                );
            }
        );


    $("#adminProducts")
        .innerHTML =
        list
            .map(
                productCard
            )
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
                c.id ===
                product.category_id
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

            ? `
                ${money(product.price)} ج.م
              `

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
                        data-edit-product="${product.id}"
                    >
                        تعديل
                    </button>


                    <button
                        type="button"
                        data-toggle-product="${product.id}"
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
   CATEGORY EDIT
===================================================== */

function openCategory(id = null) {

    editingCategoryId =
        id;


    const category =
        categories.find(
            c => c.id === id
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


    $("#categoryModal")
        .classList
        .remove("hidden");
}


/* =====================================================
   SAVE CATEGORY
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


    const slug =
        `${baseSlug}-${(
            editingCategoryId ||
            crypto
                .randomUUID()
                .slice(0, 8)
        )}`;


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
            new Date()
                .toISOString()

    };


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
        .classList
        .add("hidden");


    await loadAll();
}


/* =====================================================
   TOGGLE CATEGORY
===================================================== */

async function toggleCategory(id) {

    const category =
        categories.find(
            c => c.id === id
        );


    if (!category) return;


    const {
        error
    } =
        await supabase
            .from("categories")
            .update({
                active:
                    !category.active,

                updated_at:
                    new Date()
                        .toISOString()
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
   PRODUCT EDIT
===================================================== */

function openProduct(id = null) {

    editingProductId =
        id;

    selectedFile =
        null;


    const product =
        products.find(
            p => p.id === id
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
            .innerHTML =
            `
                <img
                    src="${esc(product.image_url)}"
                    alt=""
                >
            `;

    }
    else {

        $("#imagePreview")
            .innerHTML =
            "";

    }


    $("#productModal")
        .classList
        .remove("hidden");
}


/* =====================================================
   IMAGE
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

                selectedFile =
                    null;

                event.target.value =
                    "";

                return msg(
                    "#productMessage",
                    "الصورة أكبر من 5MB."
                );

            }


            const url =
                URL.createObjectURL(
                    selectedFile
                );


            $("#imagePreview")
                .innerHTML =
                `
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
                c.id ===
                categoryId
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
                p.id ===
                editingProductId
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
            new Date()
                .toISOString()

    };


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
        .classList
        .add("hidden");


    await loadAll();
}


/* =====================================================
   TOGGLE PRODUCT
===================================================== */

async function toggleProduct(id) {

    const product =
        products.find(
            p => p.id === id
        );


    if (!product) return;


    const {
        error
    } =
        await supabase
            .from("products")
            .update({
                active:
                    !product.active,

                updated_at:
                    new Date()
                        .toISOString()
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

$("#adminLoginBtn")
    ?.addEventListener(
        "click",
        login
    );


$("#logoutBtn")
    ?.addEventListener(
        "click",
        async () => {

            await supabase.auth.signOut();

            showLogin();

        }
    );


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