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

function resolveImage(src) {
    if (!src) return "";
    return src.startsWith("http") ? src : `${API_BASE}/${src}`;
}

/* --------------- UI helpers --------------- */
function show(el) { if (!el) return; el.classList.remove("hidden"); }
function hide(el) { if (!el) return; el.classList.add("hidden"); }
function toast(msg) { alert(msg); } // you can replace with fancier toast later

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

/* ===== SAFE RESTRICTED TARGETS (FIX) ===== */
const restrictedTargets = [
    "#viewBrokerListings",
    "#searchLocationBtn",
    "#searchTypeBtn"
];

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
              console.error("REGISTER ERROR:", err);
              alert(err.message || "Registration error");
            }

        });
    }

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

async function fetchListings(filters = {}) {
    try {
        const params = new URLSearchParams(filters).toString();
        const res = await fetch(`${API_BASE}/api/listings?${params}`);
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || "Failed to load listings");

        // 🔥 ALWAYS RENDER FRESH DATA
        serverListings = data.listings || [];
        renderListings(serverListings);

    } catch (err) {
        console.error("fetchListings error:", err);
        toast("Unable to load listings. Please try again.");
        renderListings([]);
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
    list.filter(item => item && item._id).forEach(item => {
        const card = document.createElement("div");
        card.className = "property-card fancy-hover";

       if (item.isSold) {
           card.classList.add("sold");
       }

       card.dataset.id = item._id;
       
       const mainPhotoPath = item.photos?.main;
       const imgSrc = item.photos?.main
           ? resolveImage(item.photos.main)
           : "https://via.placeholder.com/600x400";

       const user = getUser();
       
       //const ownerId = item.agentId || item.brokerId;
       
       const canMarkSold =
    user &&
    (
        user.role === "founder" ||
        (
            user.role === "broker" &&
            (
                item.brokerId === user.brokerId ||
                item.agentId === user.id   // keep fallback
            )
        )
    );

        card.innerHTML = `
      ${item.isSold ? `<span class="sold-badge">SOLD</span>` : ""}
      <img src="${imgSrc}" alt="${escapeHtml(item.title || "Property")}">
      <h3>${escapeHtml(item.title || "")}</h3>
      ${canMarkSold && !item.isSold ? `
      <button class="btn danger mark-sold-btn" data-id="${item._id}">
          Mark as Sold
      </button>
      ` : ""}
      <p>${escapeHtml(item.city || "")}, ${escapeHtml(item.state || "")} • ${escapeHtml(item.propertyType || item.type || "")} • ${escapeHtml(item.price || "")}</p>
      <p style="color:#8fa6c8;margin-top:8px">Agent: ${escapeHtml(item.agentName || "Agent")}</p>
    `;
        el.appendChild(card);
    });
}

document.addEventListener("click", (e) => {

    // ✅ MARK AS SOLD
    const soldBtn = e.target.closest(".mark-sold-btn");
    if (soldBtn) {
        e.stopPropagation();
        markSold(soldBtn.dataset.id);
        return;
    }

    // ✅ PROPERTY CARD → DETAILS
    const card = e.target.closest(".property-card");
    if (!card) return;

    if (e.target.closest("button")) return;

    const id = card.dataset.id;
    const listing = serverListings.find(l => l._id === id);
    if (!listing) return;

    openPropertyDetails(listing);
});

async function markSold(id) {
    if (!confirm("Mark this property as SOLD?")) return;

    try {
        await apiFetch(`/api/listings/${id}/sold`, {
            method: "POST"
        });

        toast("Property marked as SOLD");
        fetchListings();

    } catch (err) {
        toast(err.message || "Failed to mark sold");
    }
}

/* Small helper to avoid HTML injection in text nodes */
function escapeHtml(value) {
    if (value === null || value === undefined) return "";

    // convert anything (number, string) safely to string
    const s = String(value);

    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/* ========== ADD PROPERTY (BROKER ONLY) ========== */
function initAddPropertyModal() {
    const modal = $("addPropertyModal");
    const submitBtn = $("submitProperty");
    if (!modal || !submitBtn) return;

    // OPEN MODAL
    document.addEventListener("click", (e) => {
        const btn = e.target.closest("#addPropBtn");
        if (!btn) return;

        const user = getUser();
        if (!user || user.role !== "broker") {
            toast("Only brokers can add property");
            return;
        }

        showModal(modal);
    });

    // SUBMIT PROPERTY
    submitBtn.addEventListener("click", async () => {
        try {
            const user = getUser();
            if (!user || user.role !== "broker") {
                toast("Unauthorized");
                return;
            }

            // ===== GET VALUES =====
            const state = $("ap_state").value.trim();
            const city = $("ap_city").value.trim();
            const area = $("ap_area").value.trim();
            const address = $("ap_address").value.trim();
            const pincode = $("ap_pincode").value.trim();

            const propertyType = $("ap_type").value;
            const mode = $("ap_mode").value;
            const price = $("ap_price").value;
            const sqft = $("ap_sqft").value;
            const carpet = $("ap_carpet").value;
            const floor = $("ap_floor").value;
            const totalFloors = $("ap_total_floors").value;
            const bedrooms = $("ap_bedrooms").value;
            const bathrooms = $("ap_bathrooms").value;
            const description = $("ap_desc").value.trim();
            const ownerName = $("ap_owner_name").value.trim();

            const ownerMobile = $("ap_mobile_number").value.trim();

            // ===== VALIDATION (CRITICAL FIX) =====
            if (!state || !city || !area || !address) {
                toast("Please fill all location details");
                return;
            }

            if (!/^[0-9]{6}$/.test(pincode)) {
                toast("Enter valid 6-digit pincode");
                return;
            }

            if (!propertyType) {
                toast("Select property type");
                return;
            }

            if (!price || Number(price) <= 0) {
                toast("Enter valid price");
                return;
            }

            if (!ownerName) {
                toast("Owner name is required");
                return;
            }

            if (!/^[6-9]\d{9}$/.test(ownerMobile)) {
                toast("Enter valid owner mobile number");
                return;
            }

            const mainPhoto = $("ap_main_photo").files[0];
            if (!mainPhoto) {
                toast("Main photo is required");
                return;
            }

            // ===== BUILD FORM DATA =====
            const fd = new FormData();

            fd.append("state", state);
            fd.append("city", city);
            fd.append("area", area);
            fd.append("address", address);
            fd.append("pincode", pincode);

            fd.append("propertyType", propertyType);
            fd.append("mode", mode);
            fd.append("price", price);
            fd.append("sqft", sqft);
            fd.append("carpet", carpet);
            fd.append("floor", floor);
            fd.append("totalFloors", totalFloors);
            fd.append("bedrooms", bedrooms);
            fd.append("bathrooms", bathrooms);

            fd.append("ownerName", ownerName);
            fd.append("MobileNumber", ownerMobile);
            fd.append("description", description);

            fd.append("mainPhoto", mainPhoto);

            $("ap_hall_photo").files[0] &&
                fd.append("hallPhoto", $("ap_hall_photo").files[0]);

            $("ap_kitchen_photo").files[0] &&
                fd.append("kitchenPhoto", $("ap_kitchen_photo").files[0]);

            [...$("ap_bedroom_photos").files].forEach(f =>
                fd.append("bedroomPhotos", f)
            );

            [...$("ap_bathroom_photos").files].forEach(f =>
                fd.append("bathroomPhotos", f)
            );

            // ===== SUBMIT =====
            submitBtn.disabled = true;
            submitBtn.textContent = "Uploading...";

            const res = await fetch(`${API_BASE}/api/listings`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${getToken()}`
                },
                body: fd
            });

            const data = await res.json();

            submitBtn.disabled = false;
            submitBtn.textContent = "Submit Property";

            if (!res.ok) {
                throw new Error(data.error || "Failed to add property");
            }

            toast("Property added successfully");
            hideModal(modal);
            fetchListings();

        } catch (err) {
            console.error("ADD PROPERTY ERROR:", err);
            submitBtn.disabled = false;
            submitBtn.textContent = "Submit Property";
            toast(err.message || "Upload failed");
        }
    });
}

/* ========== BLOCKER (prevent actions for anon) ========== */
function initBlocker() {
    const blocker = $("blocker");
    const blockerClose = $("blockerClose");
    if (!blocker) return;

    hide(blocker);

    blockerClose?.addEventListener("click", () => hide(blocker));

    document.addEventListener("click", (e) => {

        // ✅ Logged-in users: NEVER block anything
        if (getToken() && getUser()) return;

        // ✅ Always allow auth actions
        if (
            e.target.closest("#loginBtn") ||
            e.target.closest("#registerBtn") ||
            e.target.closest("#openForgot") ||
            e.target.closest(".btn.danger")
        ) return;

        // ❌ Block Add Property for guests
        if (e.target.closest("#addPropBtn")) {
            e.preventDefault();
            show(blocker);
            return;
        }

        // ❌ Block restricted content for guests
        for (const selector of restrictedTargets) {
            if (e.target.closest(selector)) {
                e.preventDefault();
                show(blocker);
                return;
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
    const desktopActions = document.getElementById("desktopActions");
    const mobileActions = document.getElementById("mobileActions");
    const user = getUser();

    if (!desktopActions || !mobileActions) return;

    /* ---------- NOT LOGGED IN ---------- */
    if (!user) {
        desktopActions.innerHTML = `
            <button id="loginBtn" class="btn neon">Login</button>
            <button id="registerBtn" class="btn ghost neon-border">Register</button>
            <span id="openForgot" class="forgot-link">Forgot password?</span>
        `;

        mobileActions.innerHTML = `
            <button id="loginBtn" class="btn neon">Login</button>
            <button id="registerBtn" class="btn ghost neon-border">Register</button>
            <p id="openForgot" class="forgot-link">Forgot password?</p>
        `;
        return;
    }

    /* ---------- LOGGED IN ---------- */
    desktopActions.innerHTML = `
        <div style="display:flex;gap:12px;align-items:center">
            <span style="color:#bcd8ff">Hi, ${escapeHtml(user.username)}</span>
            <button id="logoutBtn" class="btn ghost">Logout</button>
            <button id="openAdminBtn" class="btn neon hidden">Admin Panel</button>
        </div>
    `;

    mobileActions.innerHTML = `
        <span style="color:#bcd8ff;text-align:center">Hi, ${escapeHtml(user.username)}</span>
        <button id="logoutBtnMobile" class="btn ghost">Logout</button>
        <button id="openAdminBtnMobile" class="btn neon hidden">Admin Panel</button>
    `;

    /* ---------- LOGOUT ---------- */
    document.getElementById("logoutBtn")?.addEventListener("click", () => {
        clearAuth();
        location.reload();
    });

    document.getElementById("logoutBtnMobile")?.addEventListener("click", () => {
        clearAuth();
        location.reload();
    });

    /* ---------- ADMIN ACCESS (FOUNDER ONLY) ---------- */
    if (user.role === "founder") {
        document.getElementById("openAdminBtn")?.classList.remove("hidden");
        document.getElementById("openAdminBtnMobile")?.classList.remove("hidden");

        document.getElementById("openAdminBtn")?.addEventListener("click", openAdminDashboard);
        document.getElementById("openAdminBtnMobile")?.addEventListener("click", () => {
            document.getElementById("mobileMenu")?.classList.remove("active");
            openAdminDashboard();
        });
    }
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
    const forgotModal = $("forgotModal");
    const resetModal = $("resetModal");

    // SEND RESET LINK
    $("forgotSubmit")?.addEventListener("click", async () => {
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

            toast("Reset link sent to your email");
            hide(forgotModal);     // ✅ ONLY close forgot modal
            // ❌ DO NOT open reset modal here

        } catch (err) {
            toast(err.message);
        }
    });

    // RESET PASSWORD
    $("resetSubmit")?.addEventListener("click", async () => {
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

            saveToken(data.token);
            saveUser(data.user);

            toast("Password updated & logged in");
            hide(resetModal);
            onLogin();

            // clean URL
            window.history.replaceState({}, document.title, "/");

        } catch (err) {
            toast(err.message);
        }
    });
}

document.addEventListener("DOMContentLoaded", () => {
    const token = getQueryParam("token");

    if (token) {
        const resetModal = $("resetModal");
        const resetTokenInput = $("resetToken");

        if (resetModal && resetTokenInput) {
            resetTokenInput.value = token;
            show(resetModal);
        }
    }
});

/* ========== INIT (boot) ========== */
function init() {
    // placeholders for floating labels
    qsa(".input-box input, .input-box select").forEach(i => { if (!i.hasAttribute("placeholder")) i.setAttribute("placeholder", " "); });

    updateNavOnLogin();
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
    if (!listing) return;

    currentListing = listing;

    hide($("mainContent"));
    show($("propertyDetails"));

    /* =====================
       BASIC INFO
    ===================== */
    $("pd_title").textContent =
        `${listing.propertyType || "Property"} in ${listing.city || ""}`;

    $("pd_location").textContent =
        `${listing.area || ""}, ${listing.city || ""}, ${listing.state || ""}`;

    $("pd_price").innerHTML =
    "₹ " + Number(listing.price || 0).toLocaleString();

    if (listing.isSold) {
        $("pd_price").innerHTML +=
            `<span style="margin-left:12px;color:#ff4d4f;font-weight:bold">
                SOLD
             </span>`;
    }

    /* =====================
       SPECS
    ===================== */

    $("pd_type").textContent = listing.propertyType || "-";
    $("pd_sqft").textContent = listing.sqft || "-";
    $("pd_carpet").textContent = listing.carpet || "-";
    $("pd_floor").textContent = listing.floor || "-";
    $("pd_totalFloors").textContent = listing.totalFloors || "-";
    $("pd_bedrooms").textContent = listing.bedrooms || "-";
    $("pd_bathrooms").textContent = listing.bathrooms || "-";

    /* =====================
       DESCRIPTION
    ===================== */

    $("pd_description").textContent =
        listing.description || "No description provided.";

    /* =====================
       OWNER (FIXED)
    ===================== */

    $("pd_ownerName").textContent =
        listing.ownerName || "-";

    $("pd_MobileNumber").textContent =
        listing.MobileNumber || "-";

    /* =====================
       BROKER
    ===================== */

    $("pd_agentName").textContent =
        listing.agentName || "-";

    $("pd_brokerId").textContent =
        listing.brokerId || "-";

    /* =====================
       IMAGES
    ===================== */

    const photos = listing.photos || {};

    // MAIN IMAGE
    if (photos.main) {
        setMainImage(photos.main);
    }

    // THUMBNAILS
    setThumb("pd_thumb_hall", photos.hall);
    setThumb("pd_thumb_kitchen", photos.kitchen);
    setThumb("pd_thumb_bedroom", photos.bedrooms?.[0]);
    setThumb("pd_thumb_bathroom", photos.bathrooms?.[0]);
}

/* Set main image */
function setMainImage(src) {
    if (!src) return;
    $("pd_mainImage").src = resolveImage(src);
}

function setThumb(id, src) {
    const el = $(id);
    if (!el || !src) {
        el.style.display = "none";
        return;
    }
    el.src = resolveImage(src);
    el.style.display = "block";
    el.onclick = () => setMainImage(src);
}

/* Back button */
$("backToListings").addEventListener("click", () => {
    hide($("propertyDetails"));
    show($("mainContent"));
});

/* Broker listings */
//$("viewBrokerListings").addEventListener("click", async () => {
    //if (!currentListing?.brokerId) return;

    //hide($("propertyDetails"));
    //show($("mainContent"));

    //const res = await fetch(`${API_BASE}/api/listings?brokerId=${currentListing.brokerId}`);
    //const data = await res.json();

    //if (data.listings.length === 0) {
        //$("listings").innerHTML = `
            //<div class="property-card">
                //No listings from this broker.
            //</div>`;
    //} else {
        //renderListings(data.listings);
    //}
//});

/* =====================================================
   CONNECT PROPERTY CARD → DETAILS PAGE
===================================================== */

// Modify renderListings to attach click
//const originalRenderListings = renderListings;
//renderListings = function (listings) {
    //originalRenderListings(listings);

    //document.querySelectorAll(".property-card").forEach(card => {
        //card.addEventListener("click", (e) => {

            // 🚫 DO NOT open details if clicking button
            //if (e.target.closest("button")) {
                //return;
            //}

            //const id = card.dataset.id;
            //const listing = listings.find(l => l._id === id);
            //if (!listing) return;

            //openPropertyDetails(listing);
        //});
    //});

//};

/* =====================================================
   FULLSCREEN GALLERY LOGIC
===================================================== */

let galleryImages = [];
let galleryIndex = 0;

function openGallery(images, startIndex = 0) {
    galleryImages = images;
    galleryIndex = startIndex;

    const overlay = $("galleryOverlay");
    const main = $("galleryMain");
    const thumbs = $("galleryThumbs");

    thumbs.innerHTML = "";

    images.forEach((src, i) => {
        const img = document.createElement("img");
        img.src = resolveImage(src);
        img.onclick = () => showGalleryImage(i);
        thumbs.appendChild(img);
    });

    showGalleryImage(galleryIndex);
    overlay.classList.remove("hidden");
    document.body.style.overflow = "hidden";
}

function showGalleryImage(i) {
    galleryIndex = i;
    $("galleryMain").src = resolveImage(galleryImages[i]);

    qsa("#galleryThumbs img").forEach((img, idx) => {
        img.classList.toggle("active", idx === i);
    });
}

$("galleryClose").onclick = closeGallery;
function closeGallery() {
    $("galleryOverlay").classList.add("hidden");
    document.body.style.overflow = "";
}

$("galleryPrev").onclick = () => {
    galleryIndex =
        (galleryIndex - 1 + galleryImages.length) % galleryImages.length;
    showGalleryImage(galleryIndex);
};

$("galleryNext").onclick = () => {
    galleryIndex = (galleryIndex + 1) % galleryImages.length;
    showGalleryImage(galleryIndex);
};

document.addEventListener("keydown", (e) => {
    if ($("galleryOverlay").classList.contains("hidden")) return;
    if (e.key === "Escape") closeGallery();
    if (e.key === "ArrowLeft") $("galleryPrev").click();
    if (e.key === "ArrowRight") $("galleryNext").click();
});

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
                <div>
                  ${p.propertyType}
                  ${p.isSold ? " 🔴 SOLD" : ""}
                </div>
                <div>${p.city}</div>
                <div>${p.price}</div>
                <div>${p.brokerId}</div>
                <button class="btn danger">Delete</button>
            `;

            row.querySelector("button").onclick = () => deleteListing(p._id);
            box.appendChild(row);
        });

    } catch (err) {
        toast(err.message || "Failed to load listings");
    }
}

async function deleteListing(id) {
    if (!id) {
        toast("Invalid listing ID");
        console.error("Delete failed: missing ID");
        return;
    }

    if (!confirm("Delete this property?")) return;

    try {
        await apiFetch(`/api/admin/listings/${id}`, {
            method: "DELETE"
        });

        toast("Property deleted");

        // 🔥 FORCE UI REFRESH
        document.getElementById("listings").innerHTML = "";
        await fetchListings();
        await loadAdminListings();

    } catch (err) {
        console.error("Delete error:", err);
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
                        <img src="${b.brokerDocs.aadharFront}" alt="Aadhaar Front">
                        <img src="${b.brokerDocs.aadharBack}" alt="Aadhaar Back">
                        <img src="${b.brokerDocs.passportPhoto}" alt="Passport Photo">
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

function getQueryParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
}

/* ---------------------------
   ADMIN ACCESS BUTTON
--------------------------- */
//$("openAdminBtn")?.addEventListener("click", openAdminDashboard);

/* ========== RUN ON DOM READY ========== */
document.addEventListener("DOMContentLoaded", init);
