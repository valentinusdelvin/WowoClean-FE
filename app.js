// ==========================================
// AXIOS INSTANCE CONFIGURATION
// ==========================================
const api = axios.create({
    baseURL: "http://127.0.0.1:8000/api/v1/gateway",
    headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
});

// Request Interceptor: Attach JWT Token dynamically
api.interceptors.request.use(config => {
    const token = localStorage.getItem("token");
    if (token) {
        config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
}, error => {
    return Promise.reject(error);
});

// Response Interceptor: Handle auth errors (401 & 403)
api.interceptors.response.use(
    response => response,
    error => {
        if (error.response) {
            const status = error.response.status;
            if (status === 401) {
                // Unauthorized (Token expired/invalid)
                alert("Sesi Anda telah berakhir atau token tidak valid. Silakan login kembali.");
                handleLogoutLocal();
            } else if (status === 403) {
                // Forbidden (Insufficient permissions)
                alert("Akses ditolak: Anda tidak memiliki wewenang untuk tindakan ini.");
            }
        }
        return Promise.reject(error);
    }
);

// ==========================================
// DOM ELEMENTS
// ==========================================
const loginView = document.getElementById("loginView");
const dashboardView = document.getElementById("dashboardView");
const loginForm = document.getElementById("loginForm");
const loginEmailInput = document.getElementById("loginEmail");
const loginPasswordInput = document.getElementById("loginPassword");
const loginAlert = document.getElementById("loginAlert");

// Dashboard DOM Elements
const profileName = document.getElementById("profileName");
const profileRole = document.getElementById("profileRole");
const btnLogout = document.getElementById("btnLogout");
const totalWeightEl = document.getElementById("totalWeight");
const containerList = document.getElementById("containerList");
const containerForm = document.getElementById("containerForm");
const operatorNotice = document.getElementById("operatorNotice");
const adminFormSection = document.getElementById("adminFormSection");

// Demo Buttons
const btnDemoAdmin = document.getElementById("btnDemoAdmin");
const btnDemoOperator = document.getElementById("btnDemoOperator");

// ==========================================
// VIEW CONTROLLER & STATE
// ==========================================
function showView(viewName) {
    if (viewName === "login") {
        loginView.classList.remove("hidden");
        dashboardView.classList.add("hidden");
    } else if (viewName === "dashboard") {
        loginView.classList.add("hidden");
        dashboardView.classList.remove("hidden");
    }
}

function updateProfileUI() {
    const name = localStorage.getItem("user_name") || "User";
    const role = localStorage.getItem("user_role") || "operator";

    profileName.innerText = name;
    profileRole.innerText = role;

    // Reset classes
    profileRole.className = "user-role-badge";
    if (role.toLowerCase() === "admin") {
        profileRole.classList.add("role-admin");
        adminFormSection.classList.remove("hidden");
        operatorNotice.classList.add("hidden");
    } else {
        profileRole.classList.add("role-operator");
        adminFormSection.classList.add("hidden");
        operatorNotice.classList.remove("hidden");
    }
}

// ==========================================
// LOGIN & LOGOUT LOGIC
// ==========================================
loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearLoginErrors();
    loginAlert.classList.add("hidden");
    loginAlert.innerText = "";

    const email = loginEmailInput.value;
    const password = loginPasswordInput.value;

    try {
        const res = await api.post("/login", { email, password });
        const data = res.data;

        // Save token and user details to localStorage
        localStorage.setItem("token", data.token);
        localStorage.setItem("user_name", data.user.name);
        localStorage.setItem("user_role", data.user.role);
        localStorage.setItem("user_email", data.user.email);

        // Transition to dashboard
        updateProfileUI();
        showView("dashboard");
        fetchContainers();

        // Reset form
        loginForm.reset();
    } catch (err) {
        if (err.response) {
            if (err.response.status === 422) {
                showLoginErrors(err.response.data.errors);
            } else if (err.response.status === 401) {
                loginAlert.innerText = err.response.data.message || "Email atau password salah.";
                loginAlert.classList.remove("hidden");
            } else {
                loginAlert.innerText = "Terjadi kesalahan sistem. Silakan coba lagi.";
                loginAlert.classList.remove("hidden");
            }
        } else {
            loginAlert.innerText = "Gagal terhubung ke server.";
            loginAlert.classList.remove("hidden");
        }
    }
});

// Demo login triggers
btnDemoAdmin.addEventListener("click", () => {
    loginEmailInput.value = "admin@wowoclean.com";
    loginPasswordInput.value = "password";
    loginForm.dispatchEvent(new Event("submit"));
});

btnDemoOperator.addEventListener("click", () => {
    loginEmailInput.value = "operator@wowoclean.com";
    loginPasswordInput.value = "password";
    loginForm.dispatchEvent(new Event("submit"));
});

// Logout handler
btnLogout.addEventListener("click", async () => {
    try {
        await api.post("/logout");
    } catch (err) {
        console.warn("Logout request failed, clearing local session anyway.", err);
    } finally {
        handleLogoutLocal();
    }
});

function handleLogoutLocal() {
    localStorage.removeItem("token");
    localStorage.removeItem("user_name");
    localStorage.removeItem("user_role");
    localStorage.removeItem("user_email");
    showView("login");
}

function showLoginErrors(errors) {
    for (let field in errors) {
        const errEl = document.getElementById(`error_login${field.charAt(0).toUpperCase() + field.slice(1)}`);
        if (errEl) {
            errEl.innerText = errors[field][0];
        }
    }
}

function clearLoginErrors() {
    ["Email", "Password"].forEach(f => {
        const errEl = document.getElementById(`error_login${f}`);
        if (errEl) errEl.innerText = "";
    });
}

// ==========================================
// CONTAINER OPERATIONS
// ==========================================
async function fetchContainers() {
    try {
        const res = await api.get("/containers");
        const data = res.data;

        containerList.innerHTML = "";
        let total = 0;
        const role = localStorage.getItem("user_role") || "operator";
        const isAdmin = role.toLowerCase() === "admin";

        data.forEach(c => {
            let weight = Number(c.weight_kg);
            total += weight;

            // Render status tag
            const statusClass = c.status === "Active" ? "status-active" : "status-archived";

            // Build action buttons (only visible to admin)
            let actionButtons = "";
            if (isAdmin) {
                actionButtons = `
                    <div class="container-actions">
                        ${c.status !== "Archived" ? `<button class="btn-action btn-archive" onclick="archive('${c.container_id}')">Archive</button>` : ""}
                        <button class="btn-action btn-delete" onclick="deleteContainer('${c.container_id}')">Delete</button>
                    </div>
                `;
            }

            containerList.innerHTML += `
                <div class="container-card">
                    <div class="container-details">
                        <div class="container-id-row">
                            <span class="container-id">${c.container_id}</span>
                            <span class="badge-status ${statusClass}">${c.status}</span>
                        </div>
                        <span class="container-meta">Tipe: <strong>${c.waste_type}</strong></span>
                        <span class="container-meta">Berat: <strong>${c.weight_kg} kg</strong></span>
                    </div>
                    ${actionButtons}
                </div>
            `;
        });

        totalWeightEl.innerText = total.toLocaleString('id-ID');
    } catch (err) {
        console.error("Gagal mengambil data kontainer.", err);
    }
}

containerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearContainerErrors();

    const container_id = document.getElementById("container_id").value;
    const waste_type = document.getElementById("waste_type").value;
    const weight_kg = document.getElementById("weight_kg").value;

    try {
        await api.post("/containers", { container_id, waste_type, weight_kg });
        containerForm.reset();
        fetchContainers();
    } catch (err) {
        if (err.response && err.response.status === 422) {
            showContainerErrors(err.response.data.errors);
        }
    }
});

async function archive(id) {
    try {
        await api.patch(`/containers/${id}`, { status: "Archived" });
        fetchContainers();
    } catch (err) {
        console.error("Gagal mengarsipkan kontainer.", err);
    }
}

async function deleteContainer(id) {
    if (confirm(`Apakah Anda yakin ingin menghapus kontainer ${id}?`)) {
        try {
            await api.delete(`/containers/${id}`);
            fetchContainers();
        } catch (err) {
            console.error("Gagal menghapus kontainer.", err);
        }
    }
}

// Validation helper for container form
function showContainerErrors(errors) {
    for (let field in errors) {
        const errEl = document.getElementById(`error_${field}`);
        if (errEl) {
            errEl.innerText = errors[field][0];
        }
    }
}

function clearContainerErrors() {
    ["container_id", "waste_type", "weight_kg"].forEach(f => {
        const errEl = document.getElementById(`error_${f}`);
        if (errEl) errEl.innerText = "";
    });
}

// Make action functions globally accessible for inline onclick handlers
window.archive = archive;
window.deleteContainer = deleteContainer;

// ==========================================
// INITIALIZATION
// ==========================================
function init() {
    const token = localStorage.getItem("token");
    if (token) {
        updateProfileUI();
        showView("dashboard");
        fetchContainers();
    } else {
        showView("login");
    }
}

init();