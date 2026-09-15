import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const $ = s => document.querySelector(s);
const esc = v => String(v ?? "").replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m]));
const money = n => `${Number(n || 0).toLocaleString("ar-EG")} ج.م`;
const statusNames = { new: "جديد", processing: "جاري التجهيز", ready: "جاهز", completed: "تم التسليم", cancelled: "ملغي" };

async function isAdmin() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return false;
    const { data } = await supabase.from("profiles").select("role").eq("id", session.user.id).single();
    return data?.role === "admin";
}

async function loadOrders() {
    if (!(await isAdmin())) return;
    const { data: orders, error } = await supabase.from("orders").select("id,order_number,customer_name,customer_phone,customer_address,customer_notes,total,status,created_at").order("created_at", { ascending: false });
    if (error) { $("#adminOrders").innerHTML = `<p class="message">${esc(error.message)}</p>`; return; }
    const { data: items, error: itemsError } = await supabase.from("order_items").select("order_id,product_name,product_id,quantity,unit_price");
    if (itemsError) { $("#adminOrders").innerHTML = `<p class="message">${esc(itemsError.message)}</p>`; return; }
    const byOrder = {};
    (items || []).forEach(i => (byOrder[i.order_id] ||= []).push(i));
    renderStats(orders || []);
    $("#adminOrders").innerHTML = (orders || []).map(o => {
        const phone = (o.customer_phone || "").replace(/[^0-9+]/g, "");
        const waPhone = phone.startsWith("+") ? phone.slice(1) : phone.startsWith("0") ? "20" + phone.slice(1) : phone;
        const message = encodeURIComponent(`أهلاً ${o.customer_name || ""}، معاك مكتبة بصمة بخصوص طلبك ${o.order_number || o.id}.`);
        const list = (byOrder[o.id] || []).map(i => `<li>${esc(i.product_name || "منتج")} × ${i.quantity} — ${money(i.unit_price * i.quantity)}</li>`).join("");
        return `<article class="order-card">
      <div class="order-head"><div><span class="eyebrow">${esc(o.order_number || o.id)}</span><h3>${esc(o.customer_name || "بدون اسم")}</h3><small>${new Date(o.created_at).toLocaleString("ar-EG")}</small></div><strong>${money(o.total)}</strong></div>
      <div class="order-meta"><div><b>الهاتف:</b> ${esc(o.customer_phone || "-")}</div><div><b>العنوان:</b> ${esc(o.customer_address || "-")}</div>${o.customer_notes ? `<div><b>ملاحظات:</b> ${esc(o.customer_notes)}</div>` : ""}</div>
      <details><summary>تفاصيل المنتجات</summary><ul>${list || "<li>لا توجد تفاصيل</li>"}</ul></details>
      <div class="order-actions"><select data-status="${o.id}">${Object.entries(statusNames).map(([k, v]) => `<option value="${k}" ${o.status === k ? "selected" : ""}>${v}</option>`).join("")}</select>${waPhone ? `<a class="secondary-btn" target="_blank" rel="noopener" href="https://wa.me/${waPhone}?text=${message}">واتساب</a>` : ""}</div>
    </article>`;
    }).join("") || `<p class="message">لا توجد طلبات حتى الآن.</p>`;
    document.querySelectorAll("[data-status]").forEach(s => s.onchange = () => updateStatus(s.dataset.status, s.value));
}

function renderStats(orders) {
    const counts = { new: 0, processing: 0, ready: 0, completed: 0, cancelled: 0 };
    orders.forEach(o => counts[o.status] = (counts[o.status] || 0) + 1);
    $("#ordersStats").innerHTML = Object.entries(statusNames).map(([k, v]) => `<div class="order-stat"><strong>${counts[k] || 0}</strong><span>${v}</span></div>`).join("");
}

async function updateStatus(id, status) {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) alert(error.message); else await loadOrders();
}

$("#refreshOrdersBtn")?.addEventListener("click", loadOrders);

supabase.auth.onAuthStateChange(() => setTimeout(loadOrders, 0));
loadOrders();

// تحديث فوري عند وصول طلب جديد أو تغيير حالته
supabase.channel("admin-orders-live")
    .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => loadOrders())
    .subscribe();
