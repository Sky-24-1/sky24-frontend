/* ============================================================
   SKY24 — Production frontend (Fetch API) — app.js
   - Real backend integration (no mocks)
   - Token stored in localStorage (key: sky24_token)
   - Broker register uploads: aadhar + passportPhoto
   - Listing upload: mainPhoto + fields (requires broker token)
   - Uses endpoints matching server.js in your backend
   ============================================================ */

/* ----------------- CONFIG ----------------- */
const API_BASE = "https://api.sky24.in";
const TOKEN_KEY = "sky24_token";
const USER_KEY = "sky24_user";

/* --------------- DOM HELPERS --------------- */
const $ = id => document.getElementById(id);
const qs = sel => document.querySelector(sel);
const qsa = sel => Array.from(document.querySelectorAll(sel));

/* --------------- AUTH HELPERS --------------- */
function saveToken(token) { localStorage.setItem(TOKEN_KEY, token); }
function getToken() { return localStorage.getItem(TOKEN_KEY); }
function saveUser(u) { localStorage.setItem(USER_KEY, JSON.stringify(u)); }
function getUser() { try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; } }
function clearAuth() { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); }

function authHeaders() {
    const t = getToken();
    return t ? { "Authorization": `Bearer ${t}` } : {};
}

/* --------------- UI helpers --------------- */
function show(el) { if (!el) return; el.classList.remove("hidden"); }
function hide(el) { if (!el) return; el.classList.add("hidden"); }
function toast(msg) { alert(msg); } // you can replace with fancier toast later

/* --------------- API calls --------------- */
async function apiFetch(url, options = {}) {
    const token = getToken();

    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {})
    };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}${url}`, {
        ...options,
        headers
    });

    if (res.status === 401) {
        toast("Session expired. Please login again.");
        clearAuth();
        location.reload();
        throw new Error("Unauthorized");
    }

    return res.json();
}

function toggleMobileMenu() {
    document.querySelector(".mobile-menu").classList.toggle("active");
}

document.body.addEventListener("touchstart", () => { }, { passive: true });
/* ========== AUTH (REGISTER / LOGIN) ========== */
function initAuthForms() {
    // open modal triggers
    const loginModal = $("loginModal");
    const registerModal = $("registerModal");

    // show/hide broker docs & address when role changes
    const regRoleEl = $("regRole");
    if (regRoleEl) {
        regRoleEl.addEventListener("change", () => {
            const brokerDocs = $("brokerDocs");
            if (regRoleEl.value === "broker") {
                brokerDocs.style.display = "block";
            } else {
                brokerDocs.style.display = "none";
            }
        });
    }

    // REGISTER handler (multipart)
    const registerBtn = $("registerSubmit");
    if (registerBtn) {
        registerBtn.addEventListener("click", async () => {
            try {
                const username = $("regUser").value.trim();
                const email = $("regEmail").value.trim();
                const mobile = $("regMobile").value.trim();
                const password = $("regPass").value.trim();
                const role = $("regRole").value || "buyer";
                const address = $("regAddress") ? $("regAddress").value.trim() : "";

                // Basic validation
                if (!username || !email || !mobile || !password) {
                    alert("Please fill all required fields.");
                    return;
                }

                if (!/^[6-9]\d{9}$/.test(mobile)) {
                    alert("Enter a valid 10-digit Indian mobile number");
                    return;
                }

                const fd = new FormData();
                fd.append("username", username);
                fd.append("email", email);
                fd.append("mobile", mobile);
                fd.append("password", password);
                fd.append("role", role);

                // Broker-only documents
                if (role === "broker") {
                    const aadharFront = $("aadharFront")?.files?.[0];
                    const aadharBack = $("aadharBack")?.files?.[0];
                    const passportPhoto = $("regPassportPhoto")?.files?.[0];

                    if (!aadharFront || !aadharBack || !passportPhoto || !address) {
                        alert("Brokers must upload Aadhaar front & back, passport photo, and address.");
                        return;
                    }

                    fd.append("address", address);
                    fd.append("aadharFront", aadharFront);
                    fd.append("aadharBack", aadharBack);
                    fd.append("passportPhoto", passportPhoto);
                }

                registerBtn.disabled = true;
                registerBtn.textContent = "Registering...";

                const res = await fetch(`${API_BASE}/api/register`, {
                    method: "POST",
                    body: fd
                });

                const j = await res.json();
                registerBtn.disabled = false;
                registerBtn.textContent = "Register";

                if (!res.ok) throw new Error(j.error || "Registration failed");

                saveToken(j.token);
                saveUser(j.user);
                closeModal($("registerModal"));
                onLogin();
                alert("Registration successful");

            } catch (err) {
                registerBtn.disabled = false;
                registerBtn.textContent = "Register";
                alert(err.message || "Registration error");
            }
        });
    }

    /* ==========================
    GLOBAL AUTH BUTTON HANDLER
 ========================== */
    document.addEventListener("click", (e) => {

        if (e.target.closest("#loginBtn")) {
            openModal($("loginModal"));
        }

        if (e.target.closest("#registerBtn")) {
            openModal($("registerModal"));
        }

        if (e.target.closest("#openForgot")) {
            hide($("loginModal"));
            show($("forgotModal"));
        }

        if (e.target.closest("#openRegister")) {
            closeModal($("loginModal"));
            openModal($("registerModal"));
        }

        if (e.target.closest("#openLogin")) {
            closeModal($("registerModal"));
            openModal($("loginModal"));
        }

    });

    /* ==============================
    GLOBAL MODAL HANDLER
 ============================== */

   /* ========== MODAL HELPERS (SINGLE SOURCE) ========== */
function showModal(el) {
    if (!el) return;
    el.classList.remove("hidden");
    document.body.style.overflow = "hidden";
}

function hideModal(el) {
    if (!el) return;
    el.classList.add("hidden");
    document.body.style.overflow = "";
}

/* ===== BACKWARD COMPATIBILITY (DO NOT REMOVE) ===== */
const openModal = showModal;
const closeModal = hideModal;

   // function openModal(el) {
       // if (!el) return;
       // el.classList.remove("hidden");
      //  document.body.style.overflow = "hidden";
   // }

   // function closeModal(el) {
       // if (!el) return;
      //  el.classList.add("hidden");
     //   document.body.style.overflow = "";
  // }

    // Close modal by ✕ button
    document.addEventListener("click", (e) => {
        const closeBtn = e.target.closest("[data-close]");
        if (!closeBtn) return;

        const id = closeBtn.getAttribute("data-close");
        closeModal(document.getElementById(id));
    });

    function initResetPasswordPage() {
        const btn = document.getElementById("resetBtn");
        if (!btn) return;

        const params = new URLSearchParams(window.location.search);
        const token = params.get("token");

        if (!token) {
            document.getElementById("resetMsg").textContent = "Invalid reset link";
            btn.disabled = true;
            return;
        }

        btn.addEventListener("click", async () => {
            const pw1 = document.getElementById("newPassword").value.trim();
            const pw2 = document.getElementById("confirmPassword").value.trim();

            if (!pw1 || !pw2) {
                alert("Enter both passwords");
                return;
            }

            if (pw1 !== pw2) {
                alert("Passwords do not match");
                return;
            }

            const res = await fetch(`${API_BASE}/api/reset-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    token,
                    newPassword: pw1
                })
            });

            const data = await res.json();

            if (!res.ok) {
                alert(data.error || "Reset failed");
                return;
            }

            alert("Password reset successful. You can now login.");
            window.location.href = "index.html";
        });
    }

    // LOGIN
    const loginBtnSubmit = $("loginSubmit");
    if (loginBtnSubmit) {
        loginBtnSubmit.addEventListener("click", async () => {
            try {
                const loginVal = $("loginUser").value.trim();
                const password = $("loginPass").value.trim();
                if (!loginVal || !password) { toast("Enter username/email and password"); return; }

                loginBtnSubmit.disabled = true;
                loginBtnSubmit.textContent = "Logging in...";

                const res = await fetch(`${API_BASE}/api/login`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ login: loginVal, password })
                });
                const j = await res.json();
                loginBtnSubmit.disabled = false;
                loginBtnSubmit.textContent = "Login";

                if (!res.ok) throw new Error(j.error || "Login failed");

                saveToken(j.token);
                saveUser(j.user);
                closeModal(loginModal);
                onLogin();
                toast("Logged in");
            } catch (err) {
                loginBtnSubmit.disabled = false;
                loginBtnSubmit.textContent = "Login";
                toast(err.message || "Login error");
            }
        });
    }

    // LOGOUT
    qsa(".nav-actions").forEach(() => { }); // no-op if nav actions not present
}

/* ========== FETCH / RENDER LISTINGS ========== */
let serverListings = []; // holds listings from server

async function fetchListings() {
    try {
        const j = await apiFetch("/api/listings", { method: "GET" });
        serverListings = j.listings || [];
        renderListings(serverListings);
    } catch (e) {
        console.error("fetchListings", e);
        renderListings([]); // show empty
    }
}

function renderListings(list = []) {
    const el = $("listings");
    if (!el) return;
    el.innerHTML = "";
    if (!list || list.length === 0) {
        el.innerHTML = `<div class="property-card">No listings yet.</div>`;
        return;
    }
    list.forEach(item => {
        const card = document.createElement("div");
        card.className = "property-card fancy-hover";
        const imgSrc = item.mainPhoto ? `${API_BASE}/${item.mainPhoto.replace(/\\/g, "/")}` : (item.img || "https://via.placeholder.com/600x400?text=Property");
        card.innerHTML = `
      <img src="${imgSrc}" alt="${escapeHtml(item.title || "Property")}">
      <h3>${escapeHtml(item.title || "")}</h3>
      <p>${escapeHtml(item.city || "")}, ${escapeHtml(item.state || "")} • ${escapeHtml(item.propertyType || item.type || "")} • ${escapeHtml(item.price || "")}</p>
      <p style="color:#8fa6c8;margin-top:8px">Agent: ${escapeHtml(item.agentName || "Agent")}</p>
    `;
        el.appendChild(card);
    });
}

/* Small helper to avoid HTML injection in text nodes */
function escapeHtml(s) {
    if (!s) return "";
    return s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

/* ========== ADD PROPERTY (BROKER ONLY) ========== */
function initAddPropertyModal() {
    const modal = document.getElementById("addPropertyModal");
    if (!modal) return;

    document.addEventListener("click", (e) => {
        const btn = e.target.closest("#addPropBtn");
        if (!btn) return;

        const user = getUser();
        if (!user || user.role !== "broker") {
            toast("Only brokers can add property");
            return;
        }
    });

    const submitBtn = document.getElementById("submitProperty");
    if (!submitBtn) return;

    submitBtn.addEventListener("click", async () => {
        try {
            const user = getUser();
            if (!user || user.role !== "broker") {
                toast("Unauthorized");
                return;
            }

            const fd = new FormData();

            fd.append("state", $("ap_state").value.trim());
            fd.append("city", $("ap_city").value.trim());
            fd.append("pincode", $("ap_pincode").value.trim());
            fd.append("area", $("ap_area").value.trim());
            fd.append("address", $("ap_address").value.trim());

            if (!/^[0-9]{6}$/.test($("ap_pincode").value.trim())) {
                toast("Enter valid 6-digit pincode");
                return;
            }

            fd.append("propertyType", $("ap_type").value);
            fd.append("mode", $("ap_mode").value);
            fd.append("price", $("ap_price").value);
            fd.append("sqft", $("ap_sqft").value);
            fd.append("carpet", $("ap_carpet").value);
            fd.append("floor", $("ap_floor").value);
            fd.append("totalFloors", $("ap_total_floors").value);
            fd.append("bedrooms", $("ap_bedrooms").value);
            fd.append("bathrooms", $("ap_bathrooms").value);
            fd.append("MobileNumber", $("ap_mobile_number").value);
            fd.append("description", $("ap_desc").value);
            fd.append("ownerName", $("ap_owner_name").value);

            const mainPhoto = $("ap_main_photo").files[0];
            if (!mainPhoto) {
                toast("Main photo required");
                return;
            }
            fd.append("mainPhoto", mainPhoto);

            if ($("ap_hall_photo").files[0])
                fd.append("hallPhoto", $("ap_hall_photo").files[0]);

            if ($("ap_kitchen_photo").files[0])
                fd.append("kitchenPhoto", $("ap_kitchen_photo").files[0]);

            [...$("ap_bedroom_photos").files].forEach(f => fd.append("bedroomPhotos", f));
            [...$("ap_bathroom_photos").files].forEach(f => fd.append("bathroomPhotos", f));

            submitBtn.disabled = true;
            submitBtn.textContent = "Uploading...";

            const res = await fetch(`${API_BASE}/api/listings`, {
                method: "POST",
                headers: { Authorization: `Bearer ${getToken()}` },
                body: fd
            });

            const data = await res.json();

            submitBtn.disabled = false;
            submitBtn.textContent = "Submit Property";

            if (!res.ok) throw new Error(data.error || "Upload failed");

            toast("Property added successfully");
            hideModal(modal); // ✅ FIXED
            fetchListings();

        } catch (err) {
            submitBtn.disabled = false;
            submitBtn.textContent = "Submit Property";
            toast(err.message || "Upload error");
        }
    });
}

/* ========== BLOCKER (prevent actions for anon) ========== */
function initBlocker() {
    const blocker = $("blocker");
    const blockerClose = $("blockerClose");
    if (!blocker) return;

    hide(blocker);

    if (blockerClose) {
        blockerClose.onclick = () => hide(blocker);
    }

    document.addEventListener("click", function (e) {

        // ✅ ALLOW ADD PROPERTY ALWAYS
        if (e.target.closest("#addPropBtn")) {
            return;
        }

        // ✅ ALLOW AUTH BUTTONS
        if (
            e.target.closest("#loginBtn") ||
            e.target.closest("#registerBtn") ||
            e.target.closest("#openForgot")
        ) {
            return;
        }

        // ❌ BLOCK ONLY WHEN NOT LOGGED IN
        if (!getToken()) {
            if (
                e.target.closest(".property-card") ||
                e.target.closest(".type-box") ||
                e.target.closest(".city-box")
            ) {
                e.preventDefault();
                show(blocker);
            }
        }
    });
}

/* ========== STICKY BAR (as before) ========== */
function initStickyBar() {
    const bar = qs(".actions-bar");
    if (!bar) return;
    const spacer = document.createElement("div");
    spacer.className = "sticky-spacer";
    bar.parentNode.insertBefore(spacer, bar);

    const stickyOffset = bar.offsetTop + 80;
    window.addEventListener("scroll", () => {
        if (window.pageYOffset > stickyOffset) {
            bar.classList.add("sticky");
            spacer.style.height = bar.offsetHeight + 18 + "px";
        } else {
            bar.classList.remove("sticky");
            spacer.style.height = "0px";
        }
    });
}

/* ========== SLIDER (unchanged) ========== */
function initSlider() {
    const slider = qs(".hero-slider");
    if (!slider) return;
    const slides = qsa(".hero-slider .slide");
    const dots = qsa(".hero-slider .dot");
    const prevBtn = qs(".hero-slider .prev-btn");
    const nextBtn = qs(".hero-slider .next-btn");
    if (slides.length === 0) return;

    let index = 0;
    let autoId = null;

    function show(i) {
        slides.forEach((s, idx) => s.classList.toggle("active", idx === i));
        dots.forEach((d, idx) => d.classList.toggle("active-dot", idx === i));
        index = i;
    }
    function next() { show((index + 1) % slides.length); }
    function prev() { show((index - 1 + slides.length) % slides.length); }

    dots.forEach((d, idx) => d.addEventListener("click", () => { show(idx); restartAuto(); }));
    if (nextBtn) nextBtn.addEventListener("click", () => { next(); restartAuto(); });
    if (prevBtn) prevBtn.addEventListener("click", () => { prev(); restartAuto(); });

    function startAuto() { if (autoId) clearInterval(autoId); autoId = setInterval(next, 4000); }
    function stopAuto() { if (autoId) clearInterval(autoId); autoId = null; }
    function restartAuto() { stopAuto(); startAuto(); }

    slider.addEventListener("mouseenter", stopAuto);
    slider.addEventListener("mouseleave", startAuto);

    show(0);
    startAuto();
}

/* ========== ON LOGIN UI STATE ========== */
function updateNavOnLogin() {
    const nav = qs(".nav-actions");
    if (!nav) return;

    const user = getUser();

    if (!user) {
        nav.innerHTML = `
            <button id="loginBtn" class="btn neon">Login</button>
            <button id="registerBtn" class="btn ghost neon-border">Register</button>
            <button id="openAdminBtn" class="btn neon hidden">Admin Panel</button>
        `;
        initAuthForms();
        return;
    }

    nav.innerHTML = `
        <div style="display:flex;gap:12px;align-items:center">
            <div style="color:#bcd8ff">Hi, ${escapeHtml(user.username)}</div>
            <button id="logoutBtn" class="btn ghost">Logout</button>
            <button id="openAdminBtn" class="btn neon hidden">Admin Panel</button>
        </div>
    `;

    $("logoutBtn").onclick = () => {
        clearAuth();
        location.reload();
    };

    // ✅ SHOW ADMIN ONLY FOR FOUNDER
    if (user.role === "founder") {
        $("openAdminBtn").classList.remove("hidden");
    } else {
        $("openAdminBtn").classList.add("hidden");
    }

    // ✅ Attach admin click AFTER button exists
    const adminBtn = $("openAdminBtn");
    if (adminBtn) {
        adminBtn.onclick = openAdminDashboard;
    }

    initAddPropertyModal();
}

/* ========== ON LOGIN HANDLER ========== */
function onLogin() {
    hide($("loginModal"));
    hide($("registerModal"));

    show($("mainContent"));
    updateNavOnLogin();

    const user = getUser();
    console.log("Logged user:", user); // 🔍 DEBUG

    if (user?.role === "broker") {
        $("addPropBtn").classList.remove("hidden");
        console.log("Add Property button shown"); // 🔍
    } else {
        $("addPropBtn").classList.add("hidden");
    }

    fetchListings();
}

const indiaLocations = {
    "Gujarat": {
        "Ahmedabad": ["Navrangpura", "Bapunagar", "Vastral", "SG Highway"],
        "Surat": ["Adajan", "Vesu", "Katargam"],
        "Vadodara": ["Alkapuri", "Gotri", "Manjalpur"],
        "Rajkot": ["Kalawad Road", "150 Feet Ring Road"],
    },
    "Maharashtra": {
        "Mumbai": ["Andheri", "Bandra", "Dadar"],
        "Pune": ["Kothrud", "Wakad", "Hinjewadi"],
    },
    "Rajasthan": {
        "Jaipur": ["Vaishali Nagar", "Malviya Nagar"],
    },
    "Madhya Pradesh": {
        "Indore": ["Vijay Nagar", "Palasia"],
        "Bhopal": ["Arera Colony", "Kolar"],
    }
};

function populateStates() {
    const stateSel = $("stateSelect");
    const citySel = $("citySelect");
    const areaSel = $("areaSelect");

    Object.keys(indiaLocations).forEach(state => {
        const opt = document.createElement("option");
        opt.value = state;
        opt.textContent = state;
        stateSel.appendChild(opt);
    });

    stateSel.addEventListener("change", () => {
        const state = stateSel.value;
        citySel.innerHTML = `<option value="">Select City</option>`;
        areaSel.innerHTML = `<option value="">Select Area</option>`;

        if (!state) return;

        Object.keys(indiaLocations[state]).forEach(city => {
            const opt = document.createElement("option");
            opt.value = city;
            opt.textContent = city;
            citySel.appendChild(opt);
        });
    });

    citySel.addEventListener("change", () => {
        const state = stateSel.value;
        const city = citySel.value;

        areaSel.innerHTML = `<option value="">Select Area</option>`;

        if (!city) return;

        indiaLocations[state][city].forEach(area => {
            const opt = document.createElement("option");
            opt.value = area;
            opt.textContent = area;
            areaSel.appendChild(opt);
        });
    });
}

function setupLocationSearch() {
    $("searchLocationBtn").addEventListener("click", async () => {
        const state = $("stateSelect").value;
        const city = $("citySelect").value;
        const area = $("areaSelect").value;

        if (!state) return alert("Please select a state");

        let url = `/api/listings?state=${state}`;
        if (city) url += `&city=${city}`;
        if (area) url += `&area=${area}`;

        const res = await fetch(`${API_BASE}${url}`);
        const data = await res.json();

        if (data.listings.length === 0) {
            $("listings").innerHTML = `
                <div class='property-card'>
                    No property listings from this location.
                </div>`;
        } else {
            renderListings(data.listings);
        }
    });
}

function setupTypeSearch() {
    $("searchTypeBtn").addEventListener("click", async () => {
        const type = $("propertyTypeSelect").value;

        if (!type) {
            alert("Please select a property type");
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/api/listings?type=${encodeURIComponent(type)}`);
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to fetch listings");
            }

            if (!data.listings || data.listings.length === 0) {
                $("listings").innerHTML = `
                    <div class="property-card">
                        No property listings found for this type.
                    </div>`;
            } else {
                renderListings(data.listings);
            }

        } catch (err) {
            console.error("Type search error:", err);
            alert("Unable to load listings. Please try again.");
        }
    });
}

function initForgotPassword() {
    const openForgot = $("openForgot");
    const forgotModal = $("forgotModal");
    const resetModal = $("resetModal");

    if (!openForgot) return;

    openForgot.addEventListener("click", () => {
        hide($("loginModal"));
        show(forgotModal);
    });

    $("forgotSubmit").addEventListener("click", async () => {
        const email = $("forgotEmail").value.trim();
        if (!email) return toast("Email required");

        try {
            const res = await fetch(`${API_BASE}/api/forgot-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Request failed");

            toast("Reset token sent to email");
            hide(forgotModal);
            show(resetModal);

        } catch (err) {
            toast(err.message);
        }
    });

    $("resetSubmit").addEventListener("click", async () => {
        const token = $("resetToken").value.trim();
        const newPassword = $("resetPassword").value.trim();

        if (!token || !newPassword) {
            return toast("All fields required");
        }

        try {
            const res = await fetch(`${API_BASE}/api/reset-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, newPassword })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Reset failed");

            localStorage.setItem("token", data.token);
            localStorage.setItem("user", JSON.stringify(data.user));

            toast("Password updated & logged in");
            hide(resetModal);
            onLogin();

        } catch (err) {
            toast(err.message);
        }
    });
}

/* ========== INIT (boot) ========== */
function init() {
    // placeholders for floating labels
    qsa(".input-box input, .input-box select").forEach(i => { if (!i.hasAttribute("placeholder")) i.setAttribute("placeholder", " "); });

    initAuthForms();
    initBlocker();
    initSlider();
    initStickyBar();
    initFilters();
    populateStates();
    initAddPropertyModal();
    setupLocationSearch();
    setupTypeSearch();
    initForgotPassword();

    // if logged in, set UI accordingly
    if (getToken() && getUser()) {
        updateNavOnLogin();
        onLogin();
    } else {
        // show hero (not logged)
        hide($("mainContent"));
        qsa(".hero-section").forEach(h => h.classList.remove("hidden"));
        // still fetch public listings to show on homepage
        fetchListings();
    }
}

/* attach filter init separately (categories/city click) */
function initFilters() {
    qsa(".type-box").forEach(tb => tb.addEventListener("click", (ev) => {
        const val = tb.textContent.trim();
        // require login to see full listings by broker etc — but GET /api/listings is public, still search
        $("searchInput").value = val;
        // simple client filter over serverListings
        const filtered = serverListings.filter(l => (l.propertyType || l.type || l.title || "").toLowerCase().includes(val.toLowerCase()));
        renderListings(filtered);
    }));

    qsa(".city-box").forEach(cb => cb.addEventListener("click", () => {
        const city = cb.textContent.trim();
        $("searchInput").value = city;
        const filtered = serverListings.filter(l => (l.city || "").toLowerCase().includes(city.toLowerCase()));
        renderListings(filtered);
    }));

    const s = $("searchInput");
    if (s) s.addEventListener("input", () => {
        const q = s.value.trim().toLowerCase();
        const filtered = serverListings.filter(l => (l.title + l.city + (l.propertyType || "")).toLowerCase().includes(q));
        renderListings(filtered);
    });
}

/* =====================================================
   SINGLE PROPERTY DETAILS – JS
===================================================== */

let currentListing = null;

/* Open property details */
function openPropertyDetails(listing) {
    currentListing = listing;

    // Hide main listings
    hide($("mainContent"));
    show($("propertyDetails"));

    // Title & location
    $("pd_title").textContent = listing.title || "Property";
    $("pd_location").textContent =
        `${listing.area || ""}, ${listing.city}, ${listing.state}`;

    $("pd_price").textContent = "₹ " + listing.price.toLocaleString();

    // Specs
    $("pd_type").textContent = listing.propertyType || "-";
    $("pd_sqft").textContent = listing.sqft || "-";
    $("pd_carpet").textContent = listing.carpet || "-";
    $("pd_floor").textContent = listing.floor || "-";
    $("pd_totalFloors").textContent = listing.totalFloors || "-";
    $("pd_bedrooms").textContent = listing.bedrooms || "-";
    $("pd_bathrooms").textContent = listing.bathrooms || "-";
    $("pd_MobileNumber").textContent = listing.owner?.MobileNumber || "-";

    $("pd_description").textContent = listing.description || "No description provided.";

    // Owner
    $("pd_ownerName").textContent = listing.owner?.name || "-";

    // Broker
    $("pd_agentName").textContent = listing.agentName || "-";
    $("pd_brokerId").textContent = listing.brokerId || "-";

    // Images
    const photos = listing.photos || {};
    setMainImage(photos.main);

    setThumb("pd_thumb_hall", photos.hall);
    setThumb("pd_thumb_kitchen", photos.kitchen);
    setThumb("pd_thumb_bedroom", photos.bedrooms?.[0]);
    setThumb("pd_thumb_bathroom", photos.bathrooms?.[0]);
}

/* Set main image */
function setMainImage(src) {
    if (!src) return;
    $("pd_mainImage").src = `${API_BASE}/${src}`;
}

/* Set thumbnail */
function setThumb(id, src) {
    const el = $(id);
    if (!el || !src) {
        el.style.display = "none";
        return;
    }
    el.src = `${API_BASE}/${src}`;
    el.style.display = "block";
    el.onclick = () => setMainImage(src);
}

/* Back button */
$("backToListings").addEventListener("click", () => {
    hide($("propertyDetails"));
    show($("mainContent"));
});

/* Broker listings */
$("viewBrokerListings").addEventListener("click", async () => {
    if (!currentListing?.brokerId) return;

    hide($("propertyDetails"));
    show($("mainContent"));

    const res = await fetch(`${API_BASE}/api/listings?brokerId=${currentListing.brokerId}`);
    const data = await res.json();

    if (data.listings.length === 0) {
        $("listings").innerHTML = `
            <div class="property-card">
                No listings from this broker.
            </div>`;
    } else {
        renderListings(data.listings);
    }
});

/* =====================================================
   CONNECT PROPERTY CARD → DETAILS PAGE
===================================================== */

// Modify renderListings to attach click
const originalRenderListings = renderListings;
renderListings = function (listings) {
    originalRenderListings(listings);

    document.querySelectorAll(".property-card").forEach((card, i) => {
        card.addEventListener("click", (e) => {
            if (e.target.closest("button")) return;

            if (!getToken()) {
                show($("blocker"));
                return;
            }
            openPropertyDetails(listings[i]);
        });
    });
};

/* =====================================================
   BROKER PROFILE PAGE – JS
===================================================== */

let currentBrokerId = null;

/* Open broker profile by brokerId */
async function openBrokerProfile(brokerId) {
    if (!brokerId) return;

    currentBrokerId = brokerId;

    // Hide other sections
    hide($("mainContent"));
    hide($("propertyDetails"));
    show($("brokerProfile"));

    try {
        // 1) Fetch broker info
        const brokerRes = await fetch(`${API_BASE}/api/broker/${brokerId}`);
        const brokerData = await brokerRes.json();
        if (!brokerRes.ok) throw new Error(brokerData.error || "Broker not found");

        const b = brokerData.broker;

        $("bp_name").textContent = b.username;
        $("bp_id").textContent = b.brokerId;
        $("bp_mobile").textContent = b.mobile;
        $("bp_email").textContent = b.email;
        $("bp_address").textContent = b.address || "-";

        // 2) Fetch broker listings
        const listRes = await fetch(`${API_BASE}/api/listings?brokerId=${brokerId}`);
        const listData = await listRes.json();

        const wrap = $("bp_listings");
        wrap.innerHTML = "";

        if (!listData.listings || listData.listings.length === 0) {
            wrap.innerHTML = `
                <div class="property-card">
                    No properties listed by this broker.
                </div>`;
            return;
        }

        // Render listings
        renderListings(listData.listings);

        // Move rendered cards into broker section
        const cards = document.querySelectorAll("#listings .property-card");
        cards.forEach(c => wrap.appendChild(c));

    } catch (err) {
        toast(err.message || "Failed to load broker profile");
    }
}

/* Back from broker profile */
$("backFromBroker").addEventListener("click", () => {
    hide($("brokerProfile"));
    show($("mainContent"));
});

/* =====================================================
   CONNECT STEP 3 → STEP 4
===================================================== */

// Override "View all listings by broker" button behavior
$("viewBrokerListings").onclick = () => {
    if (!currentListing?.brokerId) return;
    openBrokerProfile(currentListing.brokerId);
};

/* =====================================
   BROKER ID SEARCH (PUBLIC)
===================================== */

$("searchBrokerBtn")?.addEventListener("click", async () => {
    const brokerId = $("brokerIdInput").value.trim();
    if (!brokerId) {
        toast("Enter Broker ID");
        return;
    }

    try {
        // Validate broker exists
        const res = await fetch(`${API_BASE}/api/broker/${brokerId}`);
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || "Broker not found");

        // Open broker profile
        openBrokerProfile(brokerId);

    } catch (e) {
        toast("Broker not found");
    }
});

/* =====================================================
   ADMIN DASHBOARD (FOUNDER ONLY)
===================================================== */

/* Open admin dashboard */
function openAdminDashboard() {
    const user = getUser();

    if (!user || user.role !== "founder") {
        toast("Founder access only");
        return;
    }

    hide($("mainContent"));
    hide($("propertyDetails"));
    hide($("brokerProfile"));
    show($("adminDashboard"));

    loadPendingBrokers();
    loadAdminUsers();
    loadAdminListings();
}

/* Back button */
$("backFromAdmin").addEventListener("click", () => {
    hide($("adminDashboard"));
    show($("mainContent"));
});

async function loadAdminUsers() {
    try {
        const data = await apiFetch("/api/admin/users");

        const box = $("adminUsersList");
        box.innerHTML = "";

        data.users.forEach(u => {
            const row = document.createElement("div");
            row.className = "admin-row";
            row.innerHTML = `
                <div>${u.username}</div>
                <div>${u.email}</div>
                <div>${u.mobile}</div>
                <div>${u.role}</div>
                <div>${u.brokerId || "-"}</div>
                <div>${u.banned ? "❌ Banned" : "✅ Active"}</div>
                <button class="btn small danger">
                    ${u.banned ? "Unban" : "Ban"}
                </button>
            `;

            row.querySelector("button").onclick = () =>
                toggleBanUser(u.id, !u.banned);
            box.appendChild(row);
        });

    } catch (err) {
        toast(err.message || "Failed to load users");
    }
}

async function toggleBanUser(userId, ban) {
    try {
        await apiFetch(`/api/admin/ban/${userId}`, {
            method: "POST",
            body: JSON.stringify({ banned: ban })
        });

        toast(ban ? "User banned" : "User unbanned");
        loadAdminUsers();

    } catch (err) {
        toast(err.message || "Action failed");
    }
}

async function verifyBroker(id) {
    try {
        await apiFetch(`/api/admin/verify-broker/${id}`, {
            method: "POST"
        });

        toast("Broker verified");
        loadPendingBrokers();

    } catch (err) {
        toast(err.message || "Verification failed");
    }
}


async function loadAdminListings() {
    try {
        const data = await apiFetch("/api/admin/listings");

        const box = $("adminListings");
        box.innerHTML = "";

        data.listings.forEach(p => {
            const row = document.createElement("div");
            row.className = "admin-row";
            row.innerHTML = `
                <div>${p.propertyType}</div>
                <div>${p.city}</div>
                <div>${p.price}</div>
                <div>${p.brokerId}</div>
                <button class="btn danger">Delete</button>
            `;

            row.querySelector("button").onclick = () => deleteListing(p.id);
            box.appendChild(row);
        });

    } catch (err) {
        toast(err.message || "Failed to load listings");
    }
}

async function deleteListing(id) {
    if (!confirm("Delete this property?")) return;

    try {
        await apiFetch(`/api/admin/listings/${id}`, {
            method: "DELETE"
        });

        toast("Property deleted");
        loadAdminListings();

    } catch (err) {
        toast(err.message || "Delete failed");
    }
}

/* ---------------------------
   Pending Brokers
--------------------------- */
async function loadPendingBrokers() {
    try {
        const box = $("pendingBrokers");
        box.innerHTML = "Loading...";

        const data = await apiFetch("/api/admin/pending-brokers");

        box.innerHTML = "";

        if (!data.pending || data.pending.length === 0) {
            box.innerHTML = "<p>No pending brokers</p>";
            return;
        }

        data.pending.forEach(b => {
            const row = document.createElement("div");
            row.className = "admin-row";

            row.innerHTML = `
                <div class="admin-row-info">
                    <strong>${b.username}</strong>
                    <span>Email: ${b.email}</span>
                    <span>Mobile: ${b.mobile}</span>
                    <span>Broker ID: ${b.brokerId}</span>

                    <div class="admin-docs">
                        <img src="${API_BASE}/${b.brokerDocs.aadharFront}" alt="Aadhaar Front">
                        <img src="${API_BASE}/${b.brokerDocs.aadharBack}" alt="Aadhaar Back">
                        <img src="${API_BASE}/${b.brokerDocs.passportPhoto}" alt="Passport Photo">
                    </div>
                </div>
                <div class="admin-actions">
                    <button class="btn-approve">Approve</button>
                </div>
            `;

            row.querySelector(".btn-approve").onclick = () => verifyBroker(b.id);
            box.appendChild(row);
        });

    } catch (err) {
        toast(err.message || "Failed to load pending brokers");
    }
}

/* ========== COOKIE CONSENT ========== */
(function initCookies() {
    const banner = document.getElementById("cookieBanner");
    const btn = document.getElementById("acceptCookies");
    if (!banner || !btn) return;

    if (!localStorage.getItem("sky24_cookie_ok")) {
        banner.classList.remove("hidden");
    }

    btn.addEventListener("click", () => {
        localStorage.setItem("sky24_cookie_ok", "1");
        banner.classList.add("hidden");
    });
})();

/* ---------------------------
   ADMIN ACCESS BUTTON
--------------------------- */
//$("openAdminBtn")?.addEventListener("click", openAdminDashboard);

/* ========== RUN ON DOM READY ========== */
document.addEventListener("DOMContentLoaded", init);
