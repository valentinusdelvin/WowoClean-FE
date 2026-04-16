const api = axios.create({
    baseURL: "http://127.0.0.1:8000/api",
    headers: {
        "Content-Type": "application/json"
    }
});

const containerList = document.getElementById("containerList");
const totalWeightEl = document.getElementById("totalWeight");

async function fetchContainers() {
    const res = await api.get("/containers");
    const data = res.data;

    containerList.innerHTML = "";

    let total = 0;

    data.forEach(c => {
        total += c.weight_kg;

        containerList.innerHTML += `
      <div style="border:1px solid #000; padding:10px; margin:10px;">
        <p><b>${c.container_id}</b></p>
        <p>Type: ${c.waste_type}</p>
        <p>Weight: ${c.weight_kg} kg</p>
        <p>Status: ${c.status}</p>

        <button onclick="archive('${c.container_id}')">Archive</button>
        <button onclick="deleteContainer('${c.container_id}')">Delete</button>
      </div>
    `;
    });

    totalWeightEl.innerText = total;
}

document.getElementById("containerForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    clearErrors();

    try {
        await api.post("/containers", {
            container_id: document.getElementById("container_id").value,
            waste_type: document.getElementById("waste_type").value,
            weight_kg: document.getElementById("weight_kg").value
        });

        fetchContainers();
    } catch (err) {
        if (err.response.status === 422) {
            showErrors(err.response.data.errors);
        }
    }
});

async function archive(id) {
    await api.patch(`/containers/${id}`, { status: "Archived" });
    fetchContainers();
}

async function deleteContainer(id) {
    if (confirm("Yakin hapus?")) {
        await api.delete(`/containers/${id}`);
        fetchContainers();
    }
}

function showErrors(errors) {
    for (let field in errors) {
        document.getElementById(`error_${field}`).innerText = errors[field][0];
    }
}

function clearErrors() {
    ["container_id", "waste_type", "weight_kg"].forEach(f => {
        document.getElementById(`error_${f}`).innerText = "";
    });
}

fetchContainers();