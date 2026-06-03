function openModal() {
    document.getElementById("modal").style.display = "block";
}

function closeModal() {
    document.getElementById("modal").style.display = "none";
}

document.getElementById("hymnForm").addEventListener("submit", function(e) {
    e.preventDefault();
    const form = document.getElementById('hymnForm');
    const editingId = document.getElementById('hymn_id').value;

    const payload = {
        id: editingId ? Number(editingId) : null,
        titulo: document.getElementById("title").value,
        tono: document.getElementById("hymn_key").value,
        fecha_registro: document.getElementById("register").value,
        version_name: document.getElementById("version_name").value,
        access_level: document.getElementById("access_level").value
    };

    if (editingId) {
        // Actualizar en memoria y re-render
        const idx = (window.hymnsData || []).findIndex(x => x.id === Number(editingId));
        if (idx > -1) {
            window.hymnsData[idx] = Object.assign({}, window.hymnsData[idx], payload);
            renderTable();
            alert('Registro actualizado');
        }
    } else {
        // Nuevo registro (se añade en memoria)
        const dataArr = window.hymnsData || [];
        const newId = dataArr.reduce((m, r) => Math.max(m, r.id || 0), 0) + 1;
        payload.id = newId;
        dataArr.push(payload);
        window.hymnsData = dataArr;
        renderTable();
        alert('Registro añadido');
    }

    // reset form
    form.reset();
    document.getElementById('hymn_id').value = '';
    const _mt = document.getElementById('modal-title');
    if (_mt) _mt.innerText = 'Agregar nuevo himno';
    document.getElementById('save-btn').innerText = 'Guardar Himno';
    closeModal();
});

// Cargar himnos desde el archivo JSON y poblar la tabla
async function loadHymns() {
    const tbody = document.querySelector('#hymns-table tbody');
    try {
        const res = await fetch('../data/data.json');
        if (!res.ok) throw new Error('No se pudo cargar data.json');
        const data = await res.json();
        window.hymnsData = data;
        renderTable();
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="9" class="loading">Error al cargar datos: ${err.message}</td></tr>`;
        console.error(err);
    }
}

function renderTable() {
    const tbody = document.querySelector('#hymns-table tbody');
    const data = window.hymnsData || [];
    tbody.innerHTML = '';
    if (!data.length) {
        tbody.innerHTML = `<tr><td colspan="9" class="loading">No hay registros.</td></tr>`;
        return;
    }

    data.forEach(item => {
        const versiones = (item.versiones || []).map(v => v.voz).join(', ');
        const voces = versiones || '-';
        const categorias = (item.categorias || []).join(', ') || '-';
        const access = item.access_level || 'N/A';

        const tr = document.createElement('tr');
        tr.dataset.id = item.id;
        tr.innerHTML = `
            <td>${item.id ?? ''}</td>
            <td>${item.titulo ?? ''}</td>
            <td>${item.tono ?? ''}</td>
            <td>${item.fecha_registro ?? ''}</td>
            <td>${versiones || '-'}</td>
            <td>${access}</td>
            <td>${voces}</td>
            <td>${categorias}</td>
            <td class="action-cell">
                <div class="action-btns">
                    <button class="action-btn edit" data-id="${item.id}">✏️</button>
                    <button class="action-btn delete" data-id="${item.id}">🗑️</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Añadir listeners a botones
    document.querySelectorAll('.action-btn.edit').forEach(b => b.addEventListener('click', onEdit));
    document.querySelectorAll('.action-btn.delete').forEach(b => b.addEventListener('click', onDelete));
}

function onEdit(e) {
    const id = Number(e.currentTarget.dataset.id);
    const item = (window.hymnsData || []).find(x => x.id === id);
    if (!item) return alert('Registro no encontrado');

    // Prefill form
    document.getElementById('hymn_id').value = item.id;
    document.getElementById('title').value = item.titulo || '';
    document.getElementById('hymn_key').value = item.tono || '';
    document.getElementById('register').value = item.fecha_registro || '';
    document.getElementById('version_name').value = (item.version_name) ? item.version_name : '';
    document.getElementById('access_level').value = item.access_level || 'public';

    const _mt2 = document.getElementById('modal-title');
    if (_mt2) _mt2.innerText = 'Editar himno';
    document.getElementById('save-btn').innerText = 'Guardar cambios';
    openModal();
}

function onDelete(e) {
    const id = Number(e.currentTarget.dataset.id);
    const confirmDel = confirm('¿Seguro que deseas eliminar el registro #' + id + '? Esta acción no se puede deshacer.');
    if (!confirmDel) return;

    window.hymnsData = (window.hymnsData || []).filter(x => x.id !== id);
    renderTable();
}

// Búsqueda local simple
document.addEventListener('DOMContentLoaded', () => {
    loadHymns();

    const search = document.getElementById('table-search');
    if (search) {
        search.addEventListener('input', (e) => {
            const q = e.target.value.toLowerCase().trim();
            const rows = document.querySelectorAll('#hymns-table tbody tr');
            rows.forEach(r => {
                const text = r.textContent.toLowerCase();
                r.style.display = text.includes(q) ? '' : 'none';
            });
        });
    }
});
