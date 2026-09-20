import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import {
    SUPABASE_URL,
    SUPABASE_ANON_KEY
} from "./config.js";

const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);

/* =========================================================
   SETTINGS
========================================================= */

const PRODUCT_BUCKET =
    "product-images";

const BOOK_BUCKET =
    "book-library";

/* =========================================================
   STATE
========================================================= */

let currentUser = null;

let categories = [];
let products = [];

let bookCategories = [];
let books = [];

let newsItems = [];

let editingProductId = null;
let editingCategoryId = null;
let editingBookId = null;
let editingBookCategoryId = null;
let editingNewsId = null;

/* =========================================================
   HELPERS
========================================================= */

const $ = (selector) =>
    document.querySelector(selector);

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
        return String(value);
    }

    return new Intl.NumberFormat(
        "ar-EG"
    ).format(number);
}

function slugify(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(
            /[\u0600-\u06FF]/g,
            ""
        )
        .replace(
            /[^a-z0-9]+/g,
            "-"
        )
        .replace(
            /^-+|-+$/g,
            "");
}

function showToast(
    message,
    type = ""
) {
    const container =
        $("#toastContainer");

    if (!container) {
        return;
    }

    const toast =
        document.createElement("div");

    toast.className =
        `toast ${type}`;

    toast.textContent =
        message;

    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3500);
}

function setLoading(
    button,
    loading,
    normalText
) {
    if (!button) {
        return;
    }

    button.disabled =
        loading;

    button.textContent =
        loading
            ? "جاري التنفيذ..."
            : normalText;
}

/* =========================================================
   AUTH
========================================================= */

async function getCurrentUser() {
    const {
        data,
        error
    } = await supabase.auth.getUser();

    if (error) {
        console.error(
            "Auth error:",
            error
        );

        return null;
    }

    return data?.user || null;
}

async function checkAdmin() {
    if (!currentUser) {
        return false;
    }

    const {
        data,
        error
    } = await supabase
        .from("profiles")
        .select("role,full_name")
        .eq(
            "id",
            currentUser.id
        )
        .maybeSingle();

    if (error) {
        console.error(
            "Profile error:",
            error
        );

        return false;
    }

    if (
        data?.role !== "admin"
    ) {
        return false;
    }

    const name =
        data.full_name ||
        currentUser.email ||
        "المدير";

    const userName =
        $("#adminUserName");

    if (userName) {
        userName.textContent =
            name;
    }

    return true;
}

async function showAdminApp() {
    const loginScreen =
        $("#loginScreen");

    const adminApp =
        $("#adminApp");

    if (loginScreen) {
        loginScreen.classList.add(
            "hidden"
        );
    }

    if (adminApp) {
        adminApp.classList.remove(
            "hidden"
        );
    }
}

function showLogin() {
    const loginScreen =
        $("#loginScreen");

    const adminApp =
        $("#adminApp");

    if (loginScreen) {
        loginScreen.classList.remove(
            "hidden"
        );
    }

    if (adminApp) {
        adminApp.classList.add(
            "hidden"
        );
    }
}

/* =========================================================
   NAVIGATION
========================================================= */

const sectionTitles = {
    dashboard:
        "لوحة التحكم",

    products:
        "المنتجات",

    categories:
        "أقسام المنتجات",

    books:
        "المكتبة الإلكترونية",

    bookCategories:
        "أقسام الكتب",

    news:
        "الشريط الإخباري"
};

function switchSection(
    sectionName
) {
    document
        .querySelectorAll(
            ".sidebar-link"
        )
        .forEach((button) => {
            button.classList.toggle(
                "active",
                button.dataset.section ===
                sectionName
            );
        });

    document
        .querySelectorAll(
            ".admin-section"
        )
        .forEach((section) => {
            section.classList.toggle(
                "active",
                section.id ===
                `section-${sectionName}`
            );
        });

    const pageTitle =
        $("#pageTitle");

    if (pageTitle) {
        pageTitle.textContent =
            sectionTitles[
            sectionName
            ] ||
            "لوحة التحكم";
    }

    const sidebar =
        $("#sidebar");

    if (sidebar) {
        sidebar.classList.remove(
            "open"
        );
    }
}

/* =========================================================
   MODAL
========================================================= */

function openModal(
    title,
    content
) {
    const modal =
        $("#modal");

    const modalTitle =
        $("#modalTitle");

    const modalBody =
        $("#modalBody");

    if (
        !modal ||
        !modalTitle ||
        !modalBody
    ) {
        return;
    }

    modalTitle.textContent =
        title;

    modalBody.innerHTML =
        content;

    modal.classList.remove(
        "hidden"
    );
}

function closeModal() {
    const modal =
        $("#modal");

    if (modal) {
        modal.classList.add(
            "hidden"
        );
    }

    editingProductId = null;
    editingCategoryId = null;
    editingBookId = null;
    editingBookCategoryId = null;
    editingNewsId = null;
}

/* =========================================================
   STORAGE
========================================================= */

async function uploadFile(
    bucket,
    file,
    folder
) {
    if (!file) {
        return null;
    }

    const extension =
        file.name.includes(".")
            ? file.name
                .split(".")
                .pop()
                .toLowerCase()
            : "";

    const safeName =
        `${crypto.randomUUID()}${extension
            ? `.${extension}`
            : ""
        }`;

    const path =
        `${folder}/${safeName}`;

    const {
        error
    } = await supabase.storage
        .from(bucket)
        .upload(
            path,
            file,
            {
                cacheControl:
                    "3600",
                upsert: false
            }
        );

    if (error) {
        throw error;
    }

    const {
        data
    } = supabase.storage
        .from(bucket)
        .getPublicUrl(path);

    return {
        path,
        url:
            data?.publicUrl ||
            ""
    };
}

/* =========================================================
   DASHBOARD
========================================================= */

function updateDashboard() {
    const statProducts =
        $("#statProducts");

    const statCategories =
        $("#statCategories");

    const statBooks =
        $("#statBooks");

    const statNews =
        $("#statNews");

    if (statProducts) {
        statProducts.textContent =
            products.filter(
                (item) =>
                    item.active
            ).length;
    }

    if (statCategories) {
        statCategories.textContent =
            categories.filter(
                (item) =>
                    item.active
            ).length;
    }

    if (statBooks) {
        statBooks.textContent =
            books.filter(
                (item) =>
                    item.active
            ).length;
    }

    if (statNews) {
        statNews.textContent =
            newsItems.filter(
                (item) =>
                    item.active
            ).length;
    }
}

/* =========================================================
   CATEGORIES
========================================================= */

async function loadCategories() {
    const {
        data,
        error
    } = await supabase
        .from("categories")
        .select("*")
        .order(
            "sort_order",
            {
                ascending: true
            }
        );

    if (error) {
        console.error(
            "Categories error:",
            error
        );

        showToast(
            "تعذر تحميل الأقسام",
            "error"
        );

        categories = [];

        return;
    }

    categories =
        data || [];

    renderCategoriesTable();
    updateDashboard();
}

function renderCategoriesTable() {
    const tbody =
        $("#categoriesTableBody");

    if (!tbody) {
        return;
    }

    if (!categories.length) {
        tbody.innerHTML = `
            <tr>
                <td
                    colspan="5"
                    class="empty-state"
                >
                    لا توجد أقسام.
                </td>
            </tr>
        `;

        return;
    }

    tbody.innerHTML =
        categories
            .map(
                (category) => `
                    <tr>

                        <td>
                            <strong>
                                ${esc(
                    category.name
                )}
                            </strong>

                            ${category.description
                        ? `
                                        <div
                                            style="
                                                color:#888;
                                                font-size:10px;
                                                margin-top:3px;
                                            "
                                        >
                                            ${esc(
                            category.description
                        )}
                                        </div>
                                    `
                        : ""
                    }
                        </td>

                        <td>
                            <code>
                                ${esc(
                        category.slug
                    )}
                            </code>
                        </td>

                        <td>
                            ${esc(
                        category.sort_order
                    )}
                        </td>

                        <td>
                            <span
                                class="
                                    status
                                    ${category.active
                        ? "active"
                        : "hidden-status"
                    }
                                "
                            >
                                ${category.active
                        ? "ظاهر"
                        : "مخفي"
                    }
                            </span>
                        </td>

                        <td>

                            <div class="actions">

                                <button
                                    class="btn btn-light btn-small"
                                    data-edit-category="${esc(
                        category.id
                    )}"
                                    type="button"
                                >
                                    تعديل
                                </button>

                                <button
                                    class="btn ${category.active
                        ? "btn-danger"
                        : "btn-green"
                    } btn-small"
                                    data-toggle-category="${esc(
                        category.id
                    )}"
                                    type="button"
                                >
                                    ${category.active
                        ? "إخفاء"
                        : "إظهار"
                    }
                                </button>

                            </div>

                        </td>

                    </tr>
                `
            )
            .join("");
}

function openCategoryForm(
    category = null
) {
    editingCategoryId =
        category?.id || null;

    const title =
        category
            ? "تعديل القسم"
            : "إضافة قسم جديد";

    openModal(
        title,
        `
            <form id="categoryForm">

                <div class="form-grid">

                    <div class="form-group">

                        <label>
                            اسم القسم
                        </label>

                        <input
                            id="categoryName"
                            class="form-control"
                            required
                            value="${esc(
            category?.name || ""
        )}"
                            placeholder="مثال: قسم الطباعة"
                        >

                    </div>

                    <div class="form-group">

                        <label>
                            Slug
                        </label>

                        <input
                            id="categorySlug"
                            class="form-control"
                            value="${esc(
            category?.slug || ""
        )}"
                            placeholder="printing"
                            dir="ltr"
                        >

                    </div>

                    <div class="form-group">

                        <label>
                            ترتيب الظهور
                        </label>

                        <input
                            id="categorySort"
                            class="form-control"
                            type="number"
                            value="${esc(
            category?.sort_order ?? 0
        )}"
                        >

                    </div>

                    <div class="form-group">

                        <label>
                            الحالة
                        </label>

                        <select
                            id="categoryActive"
                            class="form-control"
                        >

                            <option
                                value="true"
                                ${category?.active !== false
            ? "selected"
            : ""
        }
                            >
                                ظاهر
                            </option>

                            <option
                                value="false"
                                ${category?.active === false
            ? "selected"
            : ""
        }
                            >
                                مخفي
                            </option>

                        </select>

                    </div>

                    <div class="form-group form-full">

                        <label>
                            الوصف
                        </label>

                        <textarea
                            id="categoryDescription"
                            class="form-control"
                            placeholder="وصف مختصر للقسم"
                        >${esc(
            category?.description || ""
        )}</textarea>

                    </div>

                </div>

                <div class="form-actions">

                    <button
                        class="btn btn-gold"
                        type="submit"
                    >
                        حفظ القسم
                    </button>

                    <button
                        class="btn btn-light"
                        type="button"
                        id="cancelModalButton"
                    >
                        إلغاء
                    </button>

                </div>

            </form>
        `
    );

    $("#categoryName")
        ?.addEventListener(
            "input",
            () => {
                const slug =
                    $("#categorySlug");

                if (
                    slug &&
                    !editingCategoryId
                ) {
                    slug.value =
                        slugify(
                            $("#categoryName")
                                .value
                        );
                }
            }
        );

    $("#categoryForm")
        ?.addEventListener(
            "submit",
            saveCategory
        );

    $("#cancelModalButton")
        ?.addEventListener(
            "click",
            closeModal
        );
}

async function saveCategory(
    event
) {
    event.preventDefault();

    const button =
        event.submitter;

    const payload = {
        name:
            $("#categoryName")
                .value
                .trim(),

        slug:
            $("#categorySlug")
                .value
                .trim(),

        description:
            $("#categoryDescription")
                .value
                .trim() ||
            null,

        sort_order:
            Number(
                $("#categorySort")
                    .value || 0
            ),

        active:
            $("#categoryActive")
                .value === "true"
    };

    if (!payload.name) {
        showToast(
            "اكتب اسم القسم",
            "error"
        );

        return;
    }

    setLoading(
        button,
        true,
        "حفظ القسم"
    );

    try {
        let result;

        if (editingCategoryId) {
            result =
                await supabase
                    .from("categories")
                    .update(payload)
                    .eq(
                        "id",
                        editingCategoryId
                    );
        } else {
            result =
                await supabase
                    .from("categories")
                    .insert(
                        payload
                    );
        }

        if (result.error) {
            throw result.error;
        }

        showToast(
            "تم حفظ القسم بنجاح",
            "success"
        );

        closeModal();

        await loadCategories();

        await loadProducts();

    } catch (error) {
        console.error(error);

        showToast(
            error.message ||
            "تعذر حفظ القسم",
            "error"
        );
    } finally {
        setLoading(
            button,
            false,
            "حفظ القسم"
        );
    }
}

async function toggleCategory(
    id
) {
    const category =
        categories.find(
            (item) =>
                item.id === id
        );

    if (!category) {
        return;
    }

    const {
        error
    } = await supabase
        .from("categories")
        .update({
            active:
                !category.active
        })
        .eq(
            "id",
            id
        );

    if (error) {
        showToast(
            "تعذر تغيير حالة القسم",
            "error"
        );

        return;
    }

    showToast(
        category.active
            ? "تم إخفاء القسم"
            : "تم إظهار القسم",
        "success"
    );

    await loadCategories();
}

/* =========================================================
   PRODUCTS
========================================================= */

async function loadProducts() {
    const {
        data,
        error
    } = await supabase
        .from("products")
        .select("*")
        .order(
            "sort_order",
            {
                ascending: true
            }
        );

    if (error) {
        console.error(
            "Products error:",
            error
        );

        showToast(
            "تعذر تحميل المنتجات",
            "error"
        );

        products = [];

        return;
    }

    products =
        data || [];

    renderProductsTable();
    updateDashboard();
}

function getCategoryName(
    categoryId
) {
    return (
        categories.find(
            (item) =>
                item.id ===
                categoryId
        )?.name ||
        "غير محدد"
    );
}

function renderProductsTable() {
    const tbody =
        $("#productsTableBody");

    if (!tbody) {
        return;
    }

    const search =
        (
            $("#productAdminSearch")
                ?.value || ""
        )
            .trim()
            .toLowerCase();

    let list =
        [...products];

    if (search) {
        list =
            list.filter(
                (product) =>
                    [
                        product.name,
                        product.description,
                        product.category
                    ]
                        .filter(Boolean)
                        .join(" ")
                        .toLowerCase()
                        .includes(search)
            );
    }

    if (!list.length) {
        tbody.innerHTML = `
            <tr>
                <td
                    colspan="6"
                    class="empty-state"
                >
                    لا توجد منتجات.
                </td>
            </tr>
        `;

        return;
    }

    tbody.innerHTML =
        list
            .map(
                (product) => `
                    <tr>

                        <td>

                            ${product.image_url
                        ? `
                                        <img
                                            class="table-image"
                                            src="${esc(
                            product.image_url
                        )}"
                                            alt=""
                                        >
                                    `
                        : `
                                        <div class="table-placeholder">
                                            بصمة
                                        </div>
                                    `
                    }

                        </td>

                        <td>
                            <strong>
                                ${esc(
                        product.name
                    )}
                            </strong>

                            ${product.description
                        ? `
                                        <div
                                            style="
                                                color:#888;
                                                font-size:10px;
                                                margin-top:4px;
                                            "
                                        >
                                            ${esc(
                            product.description
                        )}
                                        </div>
                                    `
                        : ""
                    }
                        </td>

                        <td>
                            ${esc(
                        getCategoryName(
                            product.category_id
                        )
                    )}
                        </td>

                        <td>
                            ${product.price_note
                        ? esc(
                            product.price_note
                        )
                        : product.price !==
                            null &&
                            product.price !==
                            undefined
                            ? `${money(
                                product.price
                            )} ج.م`
                            : "حسب التصميم"
                    }
                        </td>

                        <td>

                            <span
                                class="
                                    status
                                    ${product.active
                        ? "active"
                        : "hidden-status"
                    }
                                "
                            >
                                ${product.active
                        ? "ظاهر"
                        : "مخفي"
                    }
                            </span>

                        </td>

                        <td>

                            <div class="actions">

                                <button
                                    class="btn btn-light btn-small"
                                    type="button"
                                    data-edit-product="${esc(
                        product.id
                    )}"
                                >
                                    تعديل
                                </button>

                                <button
                                    class="btn ${product.active
                        ? "btn-danger"
                        : "btn-green"
                    } btn-small"
                                    type="button"
                                    data-toggle-product="${esc(
                        product.id
                    )}"
                                >
                                    ${product.active
                        ? "إخفاء"
                        : "إظهار"
                    }
                                </button>

                            </div>

                        </td>

                    </tr>
                `
            )
            .join("");
}

function productFormHtml(
    product = null
) {
    const categoryOptions =
        categories
            .map(
                (category) => `
                    <option
                        value="${esc(
                    category.id
                )}"
                        ${product?.category_id ===
                        category.id
                        ? "selected"
                        : ""
                    }
                    >
                        ${esc(
                        category.name
                    )}
                    </option>
                `
            )
            .join("");

    return `
        <form id="productForm">

            <div class="form-grid">

                <div class="form-group">

                    <label>
                        اسم المنتج
                    </label>

                    <input
                        id="productName"
                        class="form-control"
                        required
                        value="${esc(
        product?.name || ""
    )}"
                    >

                </div>


                <div class="form-group">

                    <label>
                        القسم
                    </label>

                    <select
                        id="productCategory"
                        class="form-control"
                    >

                        <option value="">
                            اختر القسم
                        </option>

                        ${categoryOptions}

                    </select>

                </div>


                <div class="form-group">

                    <label>
                        السعر
                    </label>

                    <input
                        id="productPrice"
                        class="form-control"
                        type="number"
                        min="0"
                        step="0.01"
                        value="${esc(
        product?.price ?? ""
    )}"
                        placeholder="مثال: 150"
                    >

                </div>


                <div class="form-group">

                    <label>
                        ملاحظة السعر
                    </label>

                    <input
                        id="productPriceNote"
                        class="form-control"
                        value="${esc(
        product?.price_note || ""
    )}"
                        placeholder="مثال: يبدأ من 100 ج.م"
                    >

                </div>


                <div class="form-group">

                    <label>
                        ترتيب الظهور
                    </label>

                    <input
                        id="productSort"
                        class="form-control"
                        type="number"
                        value="${esc(
        product?.sort_order ?? 0
    )}"
                    >

                </div>


                <div class="form-group">

                    <label>
                        الحالة
                    </label>

                    <select
                        id="productActive"
                        class="form-control"
                    >

                        <option
                            value="true"
                            ${product?.active !== false
            ? "selected"
            : ""
        }
                        >
                            ظاهر
                        </option>

                        <option
                            value="false"
                            ${product?.active === false
            ? "selected"
            : ""
        }
                        >
                            مخفي
                        </option>

                    </select>

                </div>


                <div class="form-group form-full">

                    <label>
                        وصف المنتج
                    </label>

                    <textarea
                        id="productDescription"
                        class="form-control"
                    >${esc(
            product?.description || ""
        )}</textarea>

                </div>


                <div class="form-group form-full">

                    <label>
                        صورة المنتج
                    </label>

                    <div class="file-box">

                        <strong>
                            اختر صورة من الجهاز
                        </strong>

                        <span>
                            JPG / PNG / WEBP
                        </span>

                        <input
                            id="productImage"
                            type="file"
                            accept="image/*"
                        >

                        ${product?.image_url
            ? `
                                    <img
                                        id="productPreview"
                                        class="preview-image"
                                        src="${esc(
                product.image_url
            )}"
                                        alt=""
                                    >
                                `
            : `
                                    <img
                                        id="productPreview"
                                        class="preview-image hidden"
                                        alt=""
                                    >
                                `
        }

                    </div>

                </div>

            </div>


            <div class="form-actions">

                <button
                    class="btn btn-gold"
                    type="submit"
                >
                    حفظ المنتج
                </button>

                <button
                    id="cancelModalButton"
                    class="btn btn-light"
                    type="button"
                >
                    إلغاء
                </button>

            </div>

        </form>
    `;
}

function openProductForm(
    product = null
) {
    editingProductId =
        product?.id || null;

    openModal(
        product
            ? "تعديل المنتج"
            : "إضافة منتج جديد",
        productFormHtml(product)
    );

    $("#productImage")
        ?.addEventListener(
            "change",
            previewProductImage
        );

    $("#productForm")
        ?.addEventListener(
            "submit",
            saveProduct
        );

    $("#cancelModalButton")
        ?.addEventListener(
            "click",
            closeModal
        );
}

function previewProductImage(
    event
) {
    const file =
        event.target.files?.[0];

    const preview =
        $("#productPreview");

    if (
        !file ||
        !preview
    ) {
        return;
    }

    preview.src =
        URL.createObjectURL(
            file
        );

    preview.classList.remove(
        "hidden"
    );
}

async function saveProduct(
    event
) {
    event.preventDefault();

    const button =
        event.submitter;

    setLoading(
        button,
        true,
        "حفظ المنتج"
    );

    try {
        const file =
            $("#productImage")
                ?.files?.[0];

        let imageUrl =
            products.find(
                (item) =>
                    item.id ===
                    editingProductId
            )?.image_url ||
            null;

        if (file) {
            const uploaded =
                await uploadFile(
                    PRODUCT_BUCKET,
                    file,
                    "products"
                );

            imageUrl =
                uploaded?.url ||
                imageUrl;
        }

        const priceValue =
            $("#productPrice")
                .value;

        const payload = {
            name:
                $("#productName")
                    .value
                    .trim(),

            description:
                $("#productDescription")
                    .value
                    .trim() ||
                null,

            category_id:
                $("#productCategory")
                    .value ||
                null,

            price:
                priceValue === ""
                    ? null
                    : Number(
                        priceValue
                    ),

            price_note:
                $("#productPriceNote")
                    .value
                    .trim() ||
                null,

            image_url:
                imageUrl,

            sort_order:
                Number(
                    $("#productSort")
                        .value || 0
                ),

            active:
                $("#productActive")
                    .value === "true"
        };

        if (!payload.name) {
            throw new Error(
                "اسم المنتج مطلوب"
            );
        }

        let result;

        if (editingProductId) {
            result =
                await supabase
                    .from("products")
                    .update(payload)
                    .eq(
                        "id",
                        editingProductId
                    );
        } else {
            result =
                await supabase
                    .from("products")
                    .insert(
                        payload
                    );
        }

        if (result.error) {
            throw result.error;
        }

        showToast(
            "تم حفظ المنتج بنجاح",
            "success"
        );

        closeModal();

        await loadProducts();

    } catch (error) {
        console.error(error);

        showToast(
            error.message ||
            "تعذر حفظ المنتج",
            "error"
        );
    } finally {
        setLoading(
            button,
            false,
            "حفظ المنتج"
        );
    }
}

async function toggleProduct(
    id
) {
    const product =
        products.find(
            (item) =>
                item.id === id
        );

    if (!product) {
        return;
    }

    const {
        error
    } = await supabase
        .from("products")
        .update({
            active:
                !product.active
        })
        .eq(
            "id",
            id
        );

    if (error) {
        showToast(
            "تعذر تغيير حالة المنتج",
            "error"
        );

        return;
    }

    showToast(
        product.active
            ? "تم إخفاء المنتج"
            : "تم إظهار المنتج",
        "success"
    );

    await loadProducts();
}

/* =========================================================
   BOOK CATEGORIES
========================================================= */

async function loadBookCategories() {
    const {
        data,
        error
    } = await supabase
        .from("book_categories")
        .select("*")
        .order(
            "sort_order",
            {
                ascending: true
            }
        );

    if (error) {
        console.error(
            "Book categories error:",
            error
        );

        bookCategories = [];

        showToast(
            "تعذر تحميل أقسام الكتب",
            "error"
        );

        return;
    }

    bookCategories =
        data || [];

    renderBookCategoriesTable();
}

function renderBookCategoriesTable() {
    const tbody =
        $("#bookCategoriesTableBody");

    if (!tbody) {
        return;
    }

    if (!bookCategories.length) {
        tbody.innerHTML = `
            <tr>
                <td
                    colspan="5"
                    class="empty-state"
                >
                    لا توجد أقسام كتب.
                </td>
            </tr>
        `;

        return;
    }

    tbody.innerHTML =
        bookCategories
            .map(
                (category) => `
                    <tr>

                        <td>
                            <strong>
                                ${esc(
                    category.name
                )}
                            </strong>

                            ${category.description
                        ? `
                                        <div
                                            style="
                                                color:#888;
                                                font-size:10px;
                                                margin-top:3px;
                                            "
                                        >
                                            ${esc(
                            category.description
                        )}
                                        </div>
                                    `
                        : ""
                    }
                        </td>

                        <td>
                            ${esc(
                        category.slug
                    )}
                        </td>

                        <td>
                            ${esc(
                        category.sort_order
                    )}
                        </td>

                        <td>

                            <span
                                class="
                                    status
                                    ${category.active
                        ? "active"
                        : "hidden-status"
                    }
                                "
                            >
                                ${category.active
                        ? "ظاهر"
                        : "مخفي"
                    }
                            </span>

                        </td>

                        <td>

                            <div class="actions">

                                <button
                                    class="btn btn-light btn-small"
                                    type="button"
                                    data-edit-book-category="${esc(
                        category.id
                    )}"
                                >
                                    تعديل
                                </button>

                                <button
                                    class="btn ${category.active
                        ? "btn-danger"
                        : "btn-green"
                    } btn-small"
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

                        </td>

                    </tr>
                `
            )
            .join("");
}

function openBookCategoryForm(
    category = null
) {
    editingBookCategoryId =
        category?.id || null;

    openModal(
        category
            ? "تعديل قسم الكتب"
            : "إضافة قسم كتب",
        `
            <form id="bookCategoryForm">

                <div class="form-grid">

                    <div class="form-group">

                        <label>
                            اسم القسم
                        </label>

                        <input
                            id="bookCategoryName"
                            class="form-control"
                            required
                            value="${esc(
            category?.name || ""
        )}"
                        >

                    </div>

                    <div class="form-group">

                        <label>
                            Slug
                        </label>

                        <input
                            id="bookCategorySlug"
                            class="form-control"
                            dir="ltr"
                            value="${esc(
            category?.slug || ""
        )}"
                        >

                    </div>

                    <div class="form-group">

                        <label>
                            ترتيب الظهور
                        </label>

                        <input
                            id="bookCategorySort"
                            class="form-control"
                            type="number"
                            value="${esc(
            category?.sort_order ?? 0
        )}"
                        >

                    </div>

                    <div class="form-group">

                        <label>
                            الحالة
                        </label>

                        <select
                            id="bookCategoryActive"
                            class="form-control"
                        >

                            <option
                                value="true"
                                ${category?.active !== false
            ? "selected"
            : ""
        }
                            >
                                ظاهر
                            </option>

                            <option
                                value="false"
                                ${category?.active === false
            ? "selected"
            : ""
        }
                            >
                                مخفي
                            </option>

                        </select>

                    </div>

                    <div class="form-group form-full">

                        <label>
                            الوصف
                        </label>

                        <textarea
                            id="bookCategoryDescription"
                            class="form-control"
                        >${esc(
            category?.description || ""
        )}</textarea>

                    </div>

                </div>

                <div class="form-actions">

                    <button
                        class="btn btn-gold"
                        type="submit"
                    >
                        حفظ القسم
                    </button>

                    <button
                        id="cancelModalButton"
                        class="btn btn-light"
                        type="button"
                    >
                        إلغاء
                    </button>

                </div>

            </form>
        `
    );

    $("#bookCategoryName")
        ?.addEventListener(
            "input",
            () => {
                if (
                    !editingBookCategoryId
                ) {
                    $("#bookCategorySlug")
                        .value =
                        slugify(
                            $("#bookCategoryName")
                                .value
                        );
                }
            }
        );

    $("#bookCategoryForm")
        ?.addEventListener(
            "submit",
            saveBookCategory
        );

    $("#cancelModalButton")
        ?.addEventListener(
            "click",
            closeModal
        );
}

async function saveBookCategory(
    event
) {
    event.preventDefault();

    const button =
        event.submitter;

    setLoading(
        button,
        true,
        "حفظ القسم"
    );

    try {
        const payload = {
            name:
                $("#bookCategoryName")
                    .value
                    .trim(),

            slug:
                $("#bookCategorySlug")
                    .value
                    .trim(),

            description:
                $("#bookCategoryDescription")
                    .value
                    .trim() ||
                null,

            sort_order:
                Number(
                    $("#bookCategorySort")
                        .value || 0
                ),

            active:
                $("#bookCategoryActive")
                    .value === "true"
        };

        if (!payload.name) {
            throw new Error(
                "اسم القسم مطلوب"
            );
        }

        let result;

        if (editingBookCategoryId) {
            result =
                await supabase
                    .from(
                        "book_categories"
                    )
                    .update(payload)
                    .eq(
                        "id",
                        editingBookCategoryId
                    );
        } else {
            result =
                await supabase
                    .from(
                        "book_categories"
                    )
                    .insert(
                        payload
                    );
        }

        if (result.error) {
            throw result.error;
        }

        showToast(
            "تم حفظ قسم الكتب",
            "success"
        );

        closeModal();

        await loadBookCategories();

    } catch (error) {
        console.error(error);

        showToast(
            error.message ||
            "تعذر حفظ القسم",
            "error"
        );
    } finally {
        setLoading(
            button,
            false,
            "حفظ القسم"
        );
    }
}

async function toggleBookCategory(
    id
) {
    const category =
        bookCategories.find(
            (item) =>
                item.id === id
        );

    if (!category) {
        return;
    }

    const {
        error
    } = await supabase
        .from("book_categories")
        .update({
            active:
                !category.active
        })
        .eq(
            "id",
            id
        );

    if (error) {
        showToast(
            "تعذر تغيير الحالة",
            "error"
        );

        return;
    }

    showToast(
        "تم تحديث الحالة",
        "success"
    );

    await loadBookCategories();
}

/* =========================================================
   BOOKS
========================================================= */

async function loadBooks() {
    const {
        data,
        error
    } = await supabase
        .from("books")
        .select("*")
        .order(
            "sort_order",
            {
                ascending: true
            }
        );

    if (error) {
        console.error(
            "Books error:",
            error
        );

        books = [];

        showToast(
            "تعذر تحميل الكتب",
            "error"
        );

        return;
    }

    books =
        data || [];

    renderBooksTable();
    updateDashboard();
}

function getBookCategoryName(
    id
) {
    return (
        bookCategories.find(
            (item) =>
                item.id === id
        )?.name ||
        "غير محدد"
    );
}

function getStoragePublicUrl(
    bucket,
    path
) {
    if (!path) {
        return "";
    }

    if (
        /^https?:\/\//i.test(
            path
        )
    ) {
        return path;
    }

    const {
        data
    } = supabase.storage
        .from(bucket)
        .getPublicUrl(path);

    return (
        data?.publicUrl ||
        ""
    );
}

function renderBooksTable() {
    const tbody =
        $("#booksTableBody");

    if (!tbody) {
        return;
    }

    const search =
        (
            $("#bookAdminSearch")
                ?.value || ""
        )
            .trim()
            .toLowerCase();

    let list =
        [...books];

    if (search) {
        list =
            list.filter(
                (book) =>
                    [
                        book.title,
                        book.author,
                        book.description
                    ]
                        .filter(Boolean)
                        .join(" ")
                        .toLowerCase()
                        .includes(search)
            );
    }

    if (!list.length) {
        tbody.innerHTML = `
            <tr>
                <td
                    colspan="7"
                    class="empty-state"
                >
                    لا توجد كتب.
                </td>
            </tr>
        `;

        return;
    }

    tbody.innerHTML =
        list
            .map(
                (book) => {
                    const coverUrl =
                        getStoragePublicUrl(
                            BOOK_BUCKET,
                            book.cover_url
                        );

                    return `
                        <tr>

                            <td>

                                ${coverUrl
                            ? `
                                            <img
                                                class="table-image"
                                                src="${esc(
                                coverUrl
                            )}"
                                                alt=""
                                            >
                                        `
                            : `
                                            <div class="table-placeholder">
                                                📖
                                            </div>
                                        `
                        }

                            </td>

                            <td>
                                <strong>
                                    ${esc(
                            book.title
                        )}
                                </strong>
                            </td>

                            <td>
                                ${esc(
                            getBookCategoryName(
                                book.category_id
                            )
                        )}
                            </td>

                            <td>
                                ${esc(
                            book.author ||
                            "—"
                        )}
                            </td>

                            <td>
                                ${book.pages
                            ? money(
                                book.pages
                            )
                            : "—"
                        }
                            </td>

                            <td>

                                <span
                                    class="
                                        status
                                        ${book.active
                            ? "active"
                            : "hidden-status"
                        }
                                    "
                                >
                                    ${book.active
                            ? "ظاهر"
                            : "مخفي"
                        }
                                </span>

                            </td>

                            <td>

                                <div class="actions">

                                    <button
                                        class="btn btn-light btn-small"
                                        type="button"
                                        data-edit-book="${esc(
                            book.id
                        )}"
                                    >
                                        تعديل
                                    </button>

                                    <button
                                        class="btn ${book.active
                            ? "btn-danger"
                            : "btn-green"
                        } btn-small"
                                        type="button"
                                        data-toggle-book="${esc(
                            book.id
                        )}"
                                    >
                                        ${book.active
                            ? "إخفاء"
                            : "إظهار"
                        }
                                    </button>

                                </div>

                            </td>

                        </tr>
                    `;
                }
            )
            .join("");
}

function bookFormHtml(
    book = null
) {
    const categoryOptions =
        bookCategories
            .map(
                (category) => `
                    <option
                        value="${esc(
                    category.id
                )}"
                        ${book?.category_id ===
                        category.id
                        ? "selected"
                        : ""
                    }
                    >
                        ${esc(
                        category.name
                    )}
                    </option>
                `
            )
            .join("");

    const coverUrl =
        getStoragePublicUrl(
            BOOK_BUCKET,
            book?.cover_url
        );

    return `
        <form id="bookForm">

            <div class="form-grid">

                <div class="form-group">

                    <label>
                        اسم الكتاب
                    </label>

                    <input
                        id="bookTitle"
                        class="form-control"
                        required
                        value="${esc(
        book?.title || ""
    )}"
                    >

                </div>


                <div class="form-group">

                    <label>
                        القسم
                    </label>

                    <select
                        id="bookCategory"
                        class="form-control"
                        required
                    >

                        <option value="">
                            اختر القسم
                        </option>

                        ${categoryOptions}

                    </select>

                </div>


                <div class="form-group">

                    <label>
                        المؤلف
                    </label>

                    <input
                        id="bookAuthor"
                        class="form-control"
                        value="${esc(
        book?.author || ""
    )}"
                    >

                </div>


                <div class="form-group">

                    <label>
                        عدد الصفحات
                    </label>

                    <input
                        id="bookPages"
                        class="form-control"
                        type="number"
                        min="1"
                        value="${esc(
        book?.pages || ""
    )}"
                    >

                </div>


                <div class="form-group">

                    <label>
                        ترتيب الظهور
                    </label>

                    <input
                        id="bookSort"
                        class="form-control"
                        type="number"
                        value="${esc(
        book?.sort_order ?? 0
    )}"
                    >

                </div>


                <div class="form-group">

                    <label>
                        الحالة
                    </label>

                    <select
                        id="bookActive"
                        class="form-control"
                    >

                        <option
                            value="true"
                            ${book?.active !== false
            ? "selected"
            : ""
        }
                        >
                            ظاهر
                        </option>

                        <option
                            value="false"
                            ${book?.active === false
            ? "selected"
            : ""
        }
                        >
                            مخفي
                        </option>

                    </select>

                </div>


                <div class="form-group form-full">

                    <label>
                        وصف الكتاب
                    </label>

                    <textarea
                        id="bookDescription"
                        class="form-control"
                    >${esc(
            book?.description || ""
        )}</textarea>

                </div>


                <div class="form-group">

                    <label>
                        غلاف الكتاب
                    </label>

                    <div class="file-box">

                        <strong>
                            رفع صورة الغلاف
                        </strong>

                        <span>
                            JPG / PNG / WEBP
                        </span>

                        <input
                            id="bookCover"
                            type="file"
                            accept="image/*"
                        >

                        ${coverUrl
            ? `
                                    <img
                                        id="bookCoverPreview"
                                        class="preview-image"
                                        src="${esc(
                coverUrl
            )}"
                                        alt=""
                                    >
                                `
            : `
                                    <img
                                        id="bookCoverPreview"
                                        class="preview-image hidden"
                                        alt=""
                                    >
                                `
        }

                    </div>

                </div>


                <div class="form-group">

                    <label>
                        ملف PDF
                    </label>

                    <div class="file-box">

                        <strong>
                            رفع ملف الكتاب
                        </strong>

                        <span>
                            PDF
                        </span>

                        <input
                            id="bookPdf"
                            type="file"
                            accept="application/pdf,.pdf"
                        >

                        ${book?.pdf_url
            ? `
                                    <div
                                        style="
                                            color:#16835b;
                                            font-size:11px;
                                            margin-top:8px;
                                        "
                                    >
                                        يوجد ملف PDF حاليًا
                                    </div>
                                `
            : ""
        }

                    </div>

                </div>

            </div>


            <div class="form-actions">

                <button
                    class="btn btn-gold"
                    type="submit"
                >
                    حفظ الكتاب
                </button>

                <button
                    id="cancelModalButton"
                    class="btn btn-light"
                    type="button"
                >
                    إلغاء
                </button>

            </div>

        </form>
    `;
}

function openBookForm(
    book = null
) {
    editingBookId =
        book?.id || null;

    openModal(
        book
            ? "تعديل الكتاب"
            : "إضافة كتاب جديد",
        bookFormHtml(book)
    );

    $("#bookCover")
        ?.addEventListener(
            "change",
            (event) => {
                const file =
                    event.target.files?.[0];

                const preview =
                    $("#bookCoverPreview");

                if (
                    !file ||
                    !preview
                ) {
                    return;
                }

                preview.src =
                    URL.createObjectURL(
                        file
                    );

                preview.classList.remove(
                    "hidden"
                );
            }
        );

    $("#bookForm")
        ?.addEventListener(
            "submit",
            saveBook
        );

    $("#cancelModalButton")
        ?.addEventListener(
            "click",
            closeModal
        );
}

async function saveBook(
    event
) {
    event.preventDefault();

    const button =
        event.submitter;

    setLoading(
        button,
        true,
        "حفظ الكتاب"
    );

    try {
        const currentBook =
            books.find(
                (item) =>
                    item.id ===
                    editingBookId
            );

        const coverFile =
            $("#bookCover")
                ?.files?.[0];

        const pdfFile =
            $("#bookPdf")
                ?.files?.[0];

        let coverPath =
            currentBook?.cover_url ||
            null;

        let pdfPath =
            currentBook?.pdf_url ||
            null;

        if (coverFile) {
            const uploaded =
                await uploadFile(
                    BOOK_BUCKET,
                    coverFile,
                    "covers"
                );

            coverPath =
                uploaded?.path ||
                coverPath;
        }

        if (pdfFile) {
            const uploaded =
                await uploadFile(
                    BOOK_BUCKET,
                    pdfFile,
                    "pdfs"
                );

            pdfPath =
                uploaded?.path ||
                pdfPath;
        }

        const payload = {
            category_id:
                $("#bookCategory")
                    .value,

            title:
                $("#bookTitle")
                    .value
                    .trim(),

            author:
                $("#bookAuthor")
                    .value
                    .trim() ||
                null,

            description:
                $("#bookDescription")
                    .value
                    .trim() ||
                null,

            cover_url:
                coverPath,

            pdf_url:
                pdfPath,

            pages:
                $("#bookPages")
                    .value
                    ? Number(
                        $("#bookPages")
                            .value
                    )
                    : null,

            sort_order:
                Number(
                    $("#bookSort")
                        .value || 0
                ),

            active:
                $("#bookActive")
                    .value === "true"
        };

        if (
            !payload.title
        ) {
            throw new Error(
                "اسم الكتاب مطلوب"
            );
        }

        if (
            !payload.category_id
        ) {
            throw new Error(
                "اختر قسم الكتاب"
            );
        }

        if (
            !payload.pdf_url
        ) {
            throw new Error(
                "يجب رفع ملف PDF للكتاب"
            );
        }

        let result;

        if (editingBookId) {
            result =
                await supabase
                    .from("books")
                    .update(payload)
                    .eq(
                        "id",
                        editingBookId
                    );
        } else {
            result =
                await supabase
                    .from("books")
                    .insert(
                        payload
                    );
        }

        if (result.error) {
            throw result.error;
        }

        showToast(
            "تم حفظ الكتاب بنجاح",
            "success"
        );

        closeModal();

        await loadBooks();

    } catch (error) {
        console.error(error);

        showToast(
            error.message ||
            "تعذر حفظ الكتاب",
            "error"
        );
    } finally {
        setLoading(
            button,
            false,
            "حفظ الكتاب"
        );
    }
}

async function toggleBook(
    id
) {
    const book =
        books.find(
            (item) =>
                item.id === id
        );

    if (!book) {
        return;
    }

    const {
        error
    } = await supabase
        .from("books")
        .update({
            active:
                !book.active
        })
        .eq(
            "id",
            id
        );

    if (error) {
        showToast(
            "تعذر تغيير حالة الكتاب",
            "error"
        );

        return;
    }

    showToast(
        "تم تحديث حالة الكتاب",
        "success"
    );

    await loadBooks();
}

/* =========================================================
   NEWS
========================================================= */

async function loadNews() {
    const {
        data,
        error
    } = await supabase
        .from("news_ticker")
        .select("*")
        .order(
            "sort_order",
            {
                ascending: true
            }
        );

    if (error) {
        console.error(
            "News error:",
            error
        );

        newsItems = [];

        showToast(
            "تعذر تحميل الأخبار",
            "error"
        );

        return;
    }

    newsItems =
        data || [];

    renderNewsTable();
    updateDashboard();
}

function renderNewsTable() {
    const tbody =
        $("#newsTableBody");

    if (!tbody) {
        return;
    }

    if (!newsItems.length) {
        tbody.innerHTML = `
            <tr>
                <td
                    colspan="4"
                    class="empty-state"
                >
                    لا توجد رسائل.
                </td>
            </tr>
        `;

        return;
    }

    tbody.innerHTML =
        newsItems
            .map(
                (item) => `
                    <tr>

                        <td>
                            <strong>
                                ${esc(
                    item.text
                )}
                            </strong>
                        </td>

                        <td>
                            ${esc(
                    item.sort_order
                )}
                        </td>

                        <td>

                            <span
                                class="
                                    status
                                    ${item.active
                        ? "active"
                        : "hidden-status"
                    }
                                "
                            >
                                ${item.active
                        ? "ظاهر"
                        : "مخفي"
                    }
                            </span>

                        </td>

                        <td>

                            <div class="actions">

                                <button
                                    class="btn btn-light btn-small"
                                    type="button"
                                    data-edit-news="${esc(
                        item.id
                    )}"
                                >
                                    تعديل
                                </button>

                                <button
                                    class="btn ${item.active
                        ? "btn-danger"
                        : "btn-green"
                    } btn-small"
                                    type="button"
                                    data-toggle-news="${esc(
                        item.id
                    )}"
                                >
                                    ${item.active
                        ? "إخفاء"
                        : "إظهار"
                    }
                                </button>

                            </div>

                        </td>

                    </tr>
                `
            )
            .join("");
}

function openNewsForm(
    item = null
) {
    editingNewsId =
        item?.id || null;

    openModal(
        item
            ? "تعديل الرسالة"
            : "إضافة رسالة",
        `
            <form id="newsForm">

                <div class="form-grid">

                    <div class="form-group form-full">

                        <label>
                            نص الرسالة
                        </label>

                        <textarea
                            id="newsText"
                            class="form-control"
                            required
                            placeholder="اكتب الرسالة التي ستظهر في الشريط..."
                        >${esc(
            item?.text || ""
        )}</textarea>

                    </div>

                    <div class="form-group">

                        <label>
                            ترتيب الظهور
                        </label>

                        <input
                            id="newsSort"
                            class="form-control"
                            type="number"
                            value="${esc(
            item?.sort_order ?? 0
        )}"
                        >

                    </div>

                    <div class="form-group">

                        <label>
                            الحالة
                        </label>

                        <select
                            id="newsActive"
                            class="form-control"
                        >

                            <option
                                value="true"
                                ${item?.active !== false
            ? "selected"
            : ""
        }
                            >
                                ظاهر
                            </option>

                            <option
                                value="false"
                                ${item?.active === false
            ? "selected"
            : ""
        }
                            >
                                مخفي
                            </option>

                        </select>

                    </div>

                </div>

                <div class="form-actions">

                    <button
                        class="btn btn-gold"
                        type="submit"
                    >
                        حفظ الرسالة
                    </button>

                    <button
                        id="cancelModalButton"
                        class="btn btn-light"
                        type="button"
                    >
                        إلغاء
                    </button>

                </div>

            </form>
        `
    );

    $("#newsForm")
        ?.addEventListener(
            "submit",
            saveNews
        );

    $("#cancelModalButton")
        ?.addEventListener(
            "click",
            closeModal
        );
}

async function saveNews(
    event
) {
    event.preventDefault();

    const button =
        event.submitter;

    setLoading(
        button,
        true,
        "حفظ الرسالة"
    );

    try {
        const payload = {
            text:
                $("#newsText")
                    .value
                    .trim(),

            sort_order:
                Number(
                    $("#newsSort")
                        .value || 0
                ),

            active:
                $("#newsActive")
                    .value === "true"
        };

        if (!payload.text) {
            throw new Error(
                "نص الرسالة مطلوب"
            );
        }

        let result;

        if (editingNewsId) {
            result =
                await supabase
                    .from("news_ticker")
                    .update(payload)
                    .eq(
                        "id",
                        editingNewsId
                    );
        } else {
            result =
                await supabase
                    .from("news_ticker")
                    .insert(
                        payload
                    );
        }

        if (result.error) {
            throw result.error;
        }

        showToast(
            "تم حفظ الرسالة",
            "success"
        );

        closeModal();

        await loadNews();

    } catch (error) {
        console.error(error);

        showToast(
            error.message ||
            "تعذر حفظ الرسالة",
            "error"
        );
    } finally {
        setLoading(
            button,
            false,
            "حفظ الرسالة"
        );
    }
}

async function toggleNews(
    id
) {
    const item =
        newsItems.find(
            (news) =>
                news.id === id
        );

    if (!item) {
        return;
    }

    const {
        error
    } = await supabase
        .from("news_ticker")
        .update({
            active:
                !item.active
        })
        .eq(
            "id",
            id
        );

    if (error) {
        showToast(
            "تعذر تغيير حالة الرسالة",
            "error"
        );

        return;
    }

    showToast(
        "تم تحديث الرسالة",
        "success"
    );

    await loadNews();
}

/* =========================================================
   EVENTS
========================================================= */

function setupEvents() {

    /* Navigation */

    document
        .querySelectorAll(
            ".sidebar-link"
        )
        .forEach((button) => {
            button.addEventListener(
                "click",
                () => {
                    switchSection(
                        button.dataset.section
                    );
                }
            );
        });


    /* Mobile sidebar */

    $("#mobileSidebarButton")
        ?.addEventListener(
            "click",
            () => {
                $("#sidebar")
                    ?.classList.toggle(
                        "open"
                    );
            }
        );


    /* Modal */

    $("#modalClose")
        ?.addEventListener(
            "click",
            closeModal
        );

    $("#modal")
        ?.addEventListener(
            "click",
            (event) => {
                if (
                    event.target.id ===
                    "modal"
                ) {
                    closeModal();
                }
            }
        );


    /* Logout */

    $("#logoutButton")
        ?.addEventListener(
            "click",
            async () => {
                await supabase.auth.signOut();

                currentUser = null;

                showLogin();

                showToast(
                    "تم تسجيل الخروج",
                    "success"
                );
            }
        );


    /* Add buttons */

    $("#addProductButton")
        ?.addEventListener(
            "click",
            () =>
                openProductForm()
        );

    $("#addCategoryButton")
        ?.addEventListener(
            "click",
            () =>
                openCategoryForm()
        );

    $("#addBookButton")
        ?.addEventListener(
            "click",
            () =>
                openBookForm()
        );

    $("#addBookCategoryButton")
        ?.addEventListener(
            "click",
            () =>
                openBookCategoryForm()
        );

    $("#addNewsButton")
        ?.addEventListener(
            "click",
            () =>
                openNewsForm()
        );


    /* Search */

    $("#productAdminSearch")
        ?.addEventListener(
            "input",
            renderProductsTable
        );

    $("#bookAdminSearch")
        ?.addEventListener(
            "input",
            renderBooksTable
        );


    /* Table actions */

    document.addEventListener(
        "click",
        (event) => {

            const target =
                event.target;


            const editProduct =
                target.closest(
                    "[data-edit-product]"
                );

            if (editProduct) {
                const product =
                    products.find(
                        (item) =>
                            item.id ===
                            editProduct.dataset
                                .editProduct
                    );

                if (product) {
                    openProductForm(
                        product
                    );
                }

                return;
            }


            const toggleProductButton =
                target.closest(
                    "[data-toggle-product]"
                );

            if (toggleProductButton) {
                toggleProduct(
                    toggleProductButton
                        .dataset
                        .toggleProduct
                );

                return;
            }


            const editCategory =
                target.closest(
                    "[data-edit-category]"
                );

            if (editCategory) {
                const category =
                    categories.find(
                        (item) =>
                            item.id ===
                            editCategory.dataset
                                .editCategory
                    );

                if (category) {
                    openCategoryForm(
                        category
                    );
                }

                return;
            }


            const toggleCategoryButton =
                target.closest(
                    "[data-toggle-category]"
                );

            if (
                toggleCategoryButton
            ) {
                toggleCategory(
                    toggleCategoryButton
                        .dataset
                        .toggleCategory
                );

                return;
            }


            const editBook =
                target.closest(
                    "[data-edit-book]"
                );

            if (editBook) {
                const book =
                    books.find(
                        (item) =>
                            item.id ===
                            editBook.dataset
                                .editBook
                    );

                if (book) {
                    openBookForm(
                        book
                    );
                }

                return;
            }


            const toggleBookButton =
                target.closest(
                    "[data-toggle-book]"
                );

            if (
                toggleBookButton
            ) {
                toggleBook(
                    toggleBookButton
                        .dataset
                        .toggleBook
                );

                return;
            }


            const editBookCategory =
                target.closest(
                    "[data-edit-book-category]"
                );

            if (
                editBookCategory
            ) {
                const category =
                    bookCategories.find(
                        (item) =>
                            item.id ===
                            editBookCategory
                                .dataset
                                .editBookCategory
                    );

                if (category) {
                    openBookCategoryForm(
                        category
                    );
                }

                return;
            }


            const toggleBookCategoryButton =
                target.closest(
                    "[data-toggle-book-category]"
                );

            if (
                toggleBookCategoryButton
            ) {
                toggleBookCategory(
                    toggleBookCategoryButton
                        .dataset
                        .toggleBookCategory
                );

                return;
            }


            const editNews =
                target.closest(
                    "[data-edit-news]"
                );

            if (editNews) {
                const item =
                    newsItems.find(
                        (news) =>
                            news.id ===
                            editNews.dataset
                                .editNews
                    );

                if (item) {
                    openNewsForm(
                        item
                    );
                }

                return;
            }


            const toggleNewsButton =
                target.closest(
                    "[data-toggle-news]"
                );

            if (
                toggleNewsButton
            ) {
                toggleNews(
                    toggleNewsButton
                        .dataset
                        .toggleNews
                );
            }

        }
    );
}

/* =========================================================
   LOAD EVERYTHING
========================================================= */

async function loadEverything() {
    await loadCategories();

    await loadProducts();

    await loadBookCategories();

    await loadBooks();

    await loadNews();

    updateDashboard();
}

/* =========================================================
   LOGIN
========================================================= */

async function handleLogin(
    event
) {
    event.preventDefault();

    const email =
        $("#loginEmail")
            ?.value
            .trim();

    const password =
        $("#loginPassword")
            ?.value;

    const button =
        $("#loginButton");

    const errorBox =
        $("#loginError");

    if (errorBox) {
        errorBox.classList.add(
            "hidden"
        );

        errorBox.textContent =
            "";
    }

    setLoading(
        button,
        true,
        "تسجيل الدخول"
    );

    try {
        const {
            data,
            error
        } =
            await supabase.auth
                .signInWithPassword({
                    email,
                    password
                });

        if (error) {
            throw error;
        }

        currentUser =
            data?.user || null;

        const isAdmin =
            await checkAdmin();

        if (!isAdmin) {
            await supabase.auth.signOut();

            throw new Error(
                "هذا الحساب ليس لديه صلاحية مدير."
            );
        }

        await showAdminApp();

        await loadEverything();

        switchSection(
            "dashboard"
        );

    } catch (error) {
        console.error(error);

        if (errorBox) {
            errorBox.textContent =
                error.message ||
                "تعذر تسجيل الدخول";

            errorBox.classList.remove(
                "hidden"
            );
        }

    } finally {
        setLoading(
            button,
            false,
            "تسجيل الدخول"
        );
    }
}

/* =========================================================
   INITIALIZE
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        $("#loginForm")
            ?.addEventListener(
                "submit",
                handleLogin
            );

        setupEvents();

        /*
         * التحقق من الجلسة الحالية.
         */
        currentUser =
            await getCurrentUser();

        if (currentUser) {

            const isAdmin =
                await checkAdmin();

            if (isAdmin) {

                await showAdminApp();

                await loadEverything();

                switchSection(
                    "dashboard"
                );

                return;
            }

            await supabase.auth
                .signOut();
        }

        showLogin();
    }
);