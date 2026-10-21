/* TOTO - Solid basta si Toto!  |  Shared script for all pages */

// ====== EDITABLE SETTINGS ======
const DELIVERY_FEE = 49;   // change the delivery fee here (pesos)
const MAX_QTY = 20;        // highest quantity allowed per product
// Product prices are edited in menu.html (data-price on each product card).

// ====== HELPERS ======
const peso = n => "₱" + Number(n).toFixed(2);
const $ = id => document.getElementById(id);
const PHONE_RE = /^(09\d{9}|\+639\d{9})$/;               // 09171234567 or +639171234567
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function loadCart() {
  try { return JSON.parse(localStorage.getItem("totoCart")) || {}; } catch (e) { return {}; }
}
function saveCart(cart) {
  try { localStorage.setItem("totoCart", JSON.stringify(cart)); } catch (e) {}
}
function setError(input, errorEl, message) {
  errorEl.textContent = message;
  input.classList.toggle("bad", message !== "");
  return message === "";
}

// ====== FEATURE 4: MOBILE NAVIGATION + cart badge (every page) ======
const toggle = $("navToggle"), nav = $("mainNav");
if (toggle && nav) {
  toggle.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", open);
    toggle.textContent = open ? "✕" : "☰";
  });
}
function updateBadge() {
  const badge = $("cartBadge");
  if (!badge) return;
  const count = Object.values(loadCart()).reduce((a, b) => a + b, 0);
  badge.textContent = count;
}
updateBadge();

// ====== MENU PAGE: CART, SEARCH, CHECKOUT ======
if ($("productGrid")) {
  const products = {};   // read product info from the HTML cards
  document.querySelectorAll(".card[data-id]").forEach(card => {
    products[card.dataset.id] = { name: card.dataset.name, price: Number(card.dataset.price) };
  });
  let cart = loadCart();
  for (const id in cart) if (!products[id]) delete cart[id];   // drop unknown items

  const totals = () => {
    let sub = 0;
    for (const id in cart) sub += products[id].price * cart[id];
    const fee = sub > 0 ? DELIVERY_FEE : 0;
    return { sub, fee, total: sub + fee };
  };

  // FEATURE 1: Interactive shopping cart
  function renderCart() {
    const box = $("cartItems");
    box.innerHTML = "";
    const ids = Object.keys(cart);
    $("cartEmpty").classList.toggle("hidden", ids.length > 0);
    ids.forEach(id => {
      const p = products[id];
      const row = document.createElement("div");
      row.className = "cart-item";
      row.innerHTML =
        `<div><strong>${p.name}</strong><br>${peso(p.price)} each</div>
         <div class="qty">
           <button type="button" data-act="dec" data-id="${id}" aria-label="Decrease quantity of ${p.name}">−</button>
           <span aria-live="polite">${cart[id]}</span>
           <button type="button" data-act="inc" data-id="${id}" aria-label="Increase quantity of ${p.name}">+</button>
         </div>
         <div><strong>${peso(p.price * cart[id])}</strong>
           <button type="button" class="link-btn" data-act="rm" data-id="${id}">Remove</button></div>`;
      box.appendChild(row);
    });
    const t = totals();
    $("subtotal").textContent = peso(t.sub);
    $("delivery").textContent = peso(t.fee);
    $("total").textContent = peso(t.total);
    saveCart(cart);
    updateBadge();
    if (!$("checkoutSection").classList.contains("hidden")) renderSummary();
  }
  function addToCart(id) {
    cart[id] = Math.min((cart[id] || 0) + 1, MAX_QTY);   // never above MAX_QTY
    renderCart();
  }
  $("cartItems").addEventListener("click", e => {
    const b = e.target.closest("button[data-act]");
    if (!b) return;
    const id = b.dataset.id;
    if (b.dataset.act === "inc") cart[id] = Math.min(cart[id] + 1, MAX_QTY);
    if (b.dataset.act === "dec") cart[id] = Math.max(cart[id] - 1, 1);   // never below 1
    if (b.dataset.act === "rm") delete cart[id];
    renderCart();
    if (!Object.keys(cart).length) $("checkoutSection").classList.add("hidden");
  });
  document.querySelectorAll(".add-btn").forEach(btn =>
    btn.addEventListener("click", () => {
      addToCart(btn.closest(".card").dataset.id);
      $("cartNote").textContent = "Added to cart!";
    }));

  // FEATURE 2: Search / filter
  $("searchInput").addEventListener("input", () => {
    const q = $("searchInput").value.trim().toLowerCase();
    let shown = 0;
    document.querySelectorAll(".card[data-id]").forEach(card => {
      const match = card.dataset.name.toLowerCase().includes(q);
      card.classList.toggle("hidden", !match);
      if (match) shown++;
    });
    $("noResults").classList.toggle("hidden", shown > 0);
  });

  // Checkout
  function renderSummary() {
    const t = totals();
    let html = "";
    for (const id in cart)
      html += `<div class="row"><span>${cart[id]} × ${products[id].name}</span><span>${peso(products[id].price * cart[id])}</span></div>`;
    html += `<div class="row"><span>Subtotal</span><span>${peso(t.sub)}</span></div>
             <div class="row"><span>Delivery fee</span><span>${peso(t.fee)}</span></div>
             <div class="row total"><span>Order total</span><span>${peso(t.total)}</span></div>`;
    $("orderSummary").innerHTML = html;
  }
  $("checkoutBtn").addEventListener("click", () => {
    if (!Object.keys(cart).length) {
      $("cartNote").textContent = "Your cart is empty. Please add a food item first.";
      return;
    }
    $("cartNote").textContent = "";
    $("confirmation").classList.add("hidden");
    $("checkoutSection").classList.remove("hidden");
    renderSummary();
    $("checkoutSection").scrollIntoView({ behavior: "smooth" });
  });

  // FEATURE 3: Checkout form validation + confirmation
  const f = { name: $("coName"), phone: $("coPhone"), address: $("coAddress") };
  const e = { name: $("coNameErr"), phone: $("coPhoneErr"), address: $("coAddressErr") };
  const checks = {
    name: () => setError(f.name, e.name, f.name.value.trim().length < 2 ? "Please enter your full name." : ""),
    phone: () => setError(f.phone, e.phone,
      f.phone.value.trim() === "" ? "Phone number is required." :
      !PHONE_RE.test(f.phone.value.replace(/[\s-]/g, "")) ? "Enter a valid PH mobile number, e.g. 09171234567." : ""),
    address: () => setError(f.address, e.address, f.address.value.trim().length < 10 ? "Please enter your complete delivery address (house no., street, barangay, city)." : "")
  };
  $("checkoutForm").addEventListener("submit", ev => {
    ev.preventDefault();
    const ok = [checks.name(), checks.phone(), checks.address()].every(Boolean);
    if (!ok || !Object.keys(cart).length) return;
    const t = totals();
    let items = "";
    for (const id in cart) items += `<li>${cart[id]} × ${products[id].name} — ${peso(products[id].price * cart[id])}</li>`;
    const notes = $("coNotes").value.trim() || "None";
    const esc = s => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    $("confirmation").innerHTML =
      `<h3>Order Confirmation (Demo)</h3>
       <p>Thank you, <strong>${esc(f.name.value.trim())}</strong>! Here is your order summary:</p>
       <ul>${items}</ul>
       <p>Subtotal: ${peso(t.sub)} | Delivery fee: ${peso(t.fee)}<br><strong>Total: ${peso(t.total)}</strong></p>
       <p><strong>Phone:</strong> ${esc(f.phone.value.trim())}<br><strong>Deliver to:</strong> ${esc(f.address.value.trim())}<br><strong>Notes:</strong> ${esc(notes)}</p>
       <p><em>Important: this is a school-project demo. Your order was NOT sent to any restaurant. A real website needs a backend or messaging integration (for example a database, email, or SMS) to process orders.</em></p>`;
    $("confirmation").classList.remove("hidden");
    $("checkoutSection").classList.add("hidden");
    cart = {};
    renderCart();
    $("checkoutForm").reset();
    $("confirmation").scrollIntoView({ behavior: "smooth" });
  });
  Object.keys(f).forEach(k => f[k].addEventListener("blur", checks[k]));

  renderCart();
}

// ====== CONTACT PAGE: FORM VALIDATION ======
if ($("contactForm")) {
  const n = $("cName"), m = $("cEmail"), p = $("cPhone"), g = $("cMessage");
  const checks = [
    () => setError(n, $("cNameErr"), n.value.trim().length < 2 ? "Full name is required." : ""),
    () => setError(m, $("cEmailErr"), m.value.trim() === "" ? "Email address is required." :
      !EMAIL_RE.test(m.value.trim()) ? "Enter a valid email, e.g. juan@email.com." : ""),
    () => setError(p, $("cPhoneErr"), p.value.trim() === "" ? "Phone number is required." :
      !PHONE_RE.test(p.value.replace(/[\s-]/g, "")) ? "Enter a valid PH mobile number, e.g. 09171234567." : ""),
    () => setError(g, $("cMessageErr"), g.value.trim().length < 10 ? "Please write a message of at least 10 characters." : "")
  ];
  [n, m, p, g].forEach((el, i) => el.addEventListener("blur", checks[i]));
  $("contactForm").addEventListener("submit", ev => {
    ev.preventDefault();
    const ok = checks.map(c => c()).every(Boolean);   // run every check so all errors show
    $("contactSuccess").classList.toggle("hidden", !ok);
    if (ok) {
      $("contactSuccess").textContent = "Salamat, " + n.value.trim() + "! Your message passed validation. (Demo only: it was not actually sent.)";
      $("contactForm").reset();
    }
  });
}

// ====== SIGN IN PAGE: buyer / rider role toggle + sign-in ======
if ($("signinForm")) {
  const roleBtns = document.querySelectorAll(".role-btn");
  const roleInput = $("role");
  const riderNote = $("riderNote");

  roleBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      roleBtns.forEach(b => {
        b.classList.remove("active");
        b.setAttribute("aria-pressed", "false");
      });
      btn.classList.add("active");
      btn.setAttribute("aria-pressed", "true");
      roleInput.value = btn.dataset.role;
      riderNote.classList.toggle("hidden", btn.dataset.role !== "rider");
    });
  });

  const siEmail = $("siEmail"), siPassword = $("siPassword");
  const siEmailErr = $("siEmailErr"), siPasswordErr = $("siPasswordErr"), siFormErr = $("siFormErr");

  const setFieldError = (input, errEl, message) => {
    errEl.textContent = message;
    input.classList.toggle("bad", message !== "");
    return message === "";
  };

  $("signinForm").addEventListener("submit", ev => {
    ev.preventDefault();
    let ok = true;
    ok = setFieldError(siEmail, siEmailErr,
      siEmail.value.trim() === "" ? "Email address is required." : "") && ok;
    ok = setFieldError(siPassword, siPasswordErr,
      siPassword.value.trim() === "" ? "Password is required." :
      siPassword.value.length < 6 ? "Password must be at least 6 characters." : "") && ok;

    siFormErr.textContent = "";
    if (!ok) return;

    const role = roleInput.value;
    const user = { email: siEmail.value.trim(), role, signedIn: true, at: Date.now() };
    try { localStorage.setItem("totoUser", JSON.stringify(user)); } catch (e) {}

    siFormErr.className = "error ok";
    siFormErr.textContent = "Signed in as " + (role === "rider" ? "Rider" : "Account") + ". Redirecting...";
    setTimeout(() => { location.href = "menu.html"; }, 800);
  });
}

// ====== SIGN UP PAGE: registration ======
if ($("signupForm")) {
  const roleBtns = document.querySelectorAll(".role-btn");
  const roleInput = $("suRole");

  roleBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      roleBtns.forEach(b => {
        b.classList.remove("active");
        b.setAttribute("aria-pressed", "false");
      });
      btn.classList.add("active");
      btn.setAttribute("aria-pressed", "true");
      roleInput.value = btn.dataset.role;
    });
  });

  const suName = $("suName"), suEmail = $("suEmail"), suPhone = $("suPhone");
  const suAddress = $("suAddress"), suPassword = $("suPassword"), suConfirm = $("suConfirmPassword");
  const suNameErr = $("suNameErr"), suEmailErr = $("suEmailErr"), suPhoneErr = $("suPhoneErr");
  const suAddressErr = $("suAddressErr"), suPasswordErr = $("suPasswordErr"), suConfirmErr = $("suConfirmPasswordErr");
  const suFormErr = $("suFormErr");

  const setFieldError = (input, errEl, message) => {
    errEl.textContent = message;
    input.classList.toggle("bad", message !== "");
    return message === "";
  };

  function loadUsers() {
    try { return JSON.parse(localStorage.getItem("totoUsers")) || []; } catch (e) { return []; }
  }
  function saveUsers(users) {
    try { localStorage.setItem("totoUsers", JSON.stringify(users)); } catch (e) {}
  }

  $("signupForm").addEventListener("submit", ev => {
    ev.preventDefault();
    let ok = true;
    ok = setFieldError(suName, suNameErr, suName.value.trim().length < 2 ? "Full name is required." : "") && ok;
    ok = setFieldError(suEmail, suEmailErr,
      suEmail.value.trim() === "" ? "Email address is required." :
      !EMAIL_RE.test(suEmail.value.trim()) ? "Enter a valid email address." : "") && ok;
    ok = setFieldError(suPhone, suPhoneErr,
      suPhone.value.trim() === "" ? "Phone number is required." :
      !PHONE_RE.test(suPhone.value.replace(/[\s-]/g, "")) ? "Enter a valid PH mobile number, e.g. 09751234567." : "") && ok;
    ok = setFieldError(suAddress, suAddressErr, suAddress.value.trim().length < 10 ? "Please enter your complete delivery address." : "") && ok;
    ok = setFieldError(suPassword, suPasswordErr,
      suPassword.value.trim() === "" ? "Password is required." :
      suPassword.value.length < 6 ? "Password must be at least 6 characters." : "") && ok;
    ok = setFieldError(suConfirm, suConfirmErr,
      suConfirm.value !== suPassword.value ? "Passwords do not match." : "") && ok;

    suFormErr.textContent = "";
    if (!ok) return;

    const email = suEmail.value.trim();
    const users = loadUsers();
    if (users.some(u => u.email === email)) {
      suFormErr.textContent = "An account with this email already exists. Please sign in instead.";
      return;
    }

    const newUser = {
      name: suName.value.trim(),
      email,
      phone: suPhone.value.replace(/[\s-]/g, ""),
      address: suAddress.value.trim(),
      role: roleInput.value,
      password: suPassword.value,
      createdAt: Date.now()
    };
    users.push(newUser);
    saveUsers(users);

    const currentUser = { email, name: newUser.name, role: newUser.role, signedIn: true, at: Date.now() };
    try { localStorage.setItem("totoUser", JSON.stringify(currentUser)); } catch (e) {}

    suFormErr.className = "error ok";
    suFormErr.textContent = "Account created! Redirecting...";
    setTimeout(() => { location.href = "menu.html"; }, 800);
  });
}
