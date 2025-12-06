// === app.js (reemplazar todo el archivo con este) ===

// ----------------------- Utilidades robustas -----------------------
function baseUrl() {
  // 1) input #apiBase si existe
  const el = document.getElementById('apiBase');
  if (el && el.value && el.value.trim()) return el.value.trim().replace(/\/+$/, '');
  // 2) sessionStorage
  const saved = sessionStorage.getItem('api_base');
  if (saved && saved.trim()) return saved.trim().replace(/\/+$/, '');
  // 3) global override
  if (window.__API_URL__) return String(window.__API_URL__).replace(/\/+$/, '');
  // 4) fallback local
  return "http://127.0.0.1:5000";
}

function getHeaders() {
  const headers = {'Content-Type': 'application/json'};
  // token from input or sessionStorage
  const tokenInput = document.getElementById('token');
  let token = tokenInput && tokenInput.value ? tokenInput.value.trim() : null;
  if (!token) token = sessionStorage.getItem('municipal_token') || null;
  if (token) {
    const normalized = token.startsWith('Bearer ') ? token : ('Bearer ' + token);
    headers['Authorization'] = normalized;
  }
  return headers;
}

async function safeFetch(url, opts = {}) {
  try {
    const res = await fetch(url, opts);
    const text = await res.text();
    // intentar parsear JSON, si no devolver texto
    try { return {status: res.status, ok: res.ok, data: JSON.parse(text)}; }
    catch(e) { return {status: res.status, ok: res.ok, data: text}; }
  } catch (err) {
    console.error("safeFetch error:", err);
    return {status: 0, ok: false, data: null, error: err.message || String(err)};
  }
}

// wrappers
async function callGetRaw(path) {
  const url = baseUrl() + path;
  return await safeFetch(url, {method:'GET', headers: getHeaders()});
}
async function callPost(path, body) {
  const url = baseUrl() + path;
  return await safeFetch(url, {method:'POST', headers: getHeaders(), body: JSON.stringify(body)});
}
async function callDelete(path) {
  const url = baseUrl() + path;
  return await safeFetch(url, {method:'DELETE', headers: getHeaders()});
}

// ----------------------- Auth / token helpers -----------------------
function applyToken(token) {
  const tkField = document.getElementById('token');
  if (tkField) tkField.value = token || '';
  if (token) sessionStorage.setItem('municipal_token', token);
  else sessionStorage.removeItem('municipal_token');
}

function showUserInfo(name, role) {
  const infoDiv = document.getElementById('userInfo') || (() => {
    // intentar crear uno en el primer panel
    const cfg = document.querySelector('.panel');
    if (!cfg) return null;
    const d = document.createElement('div'); d.id = 'userInfo'; d.style.marginTop = '8px';
    cfg.prepend(d);
    return d;
  })();
  if (!infoDiv) return;
  infoDiv.innerHTML = `<small>Usuario: <strong>${name || '-'}</strong> &nbsp;|&nbsp; Rol: <strong>${role || '-'}</strong></small>`;
}

// ----------------------- Auth endpoints (register/login) -----------------------
async function registerUser(name, email, password) {
  const url = baseUrl() + "/auth/register";
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({name, email, password})
    });
    const data = await res.json().catch(()=>null);
    return {status: res.status, data};
  } catch (err) {
    return {status:0, data:null};
  }
}

async function loginRequest(email, password) {
  const url = baseUrl() + "/auth/login";
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({email, password})
    });
    const data = await res.json().catch(()=>null);
    return {status: res.status, data};
  } catch(e) {
    return {status:0, data:null};
  }
}

// ----------------------- Render tabla y modal -----------------------
function renderRequestsJSON(data, outId) {
  const container = document.getElementById(outId);
  if (!container) return;
  if (!data || !data.ok) {
    container.innerHTML = `<div class="error">Error: ${data && data.error ? data.error : 'respuesta inválida'}</div>`;
    return;
  }
  const requests = data.requests || [];
  if (requests.length === 0) {
    container.innerHTML = "<div>No hay solicitudes para mostrar.</div>";
    return;
  }

  let html = `<table class="req-table">
    <thead>
      <tr>
        <th>ID</th><th>Tipo</th><th>Descripción</th><th>Ciudadano ID</th><th>Fecha</th><th>Acciones</th>
      </tr>
    </thead><tbody>`;

  requests.forEach(r => {
    const fecha = r.created_at ? r.created_at : '';
    html += `<tr>
      <td>${r._id}</td>
      <td>${r.type || ''}</td>
      <td>${r.description || ''}</td>
      <td>${r.citizen_id ?? ''}</td>
      <td>${fecha}</td>
      <td>
        <button class="btn-view" data-id="${r._id}">Ver</button>
        <button class="btn-del" data-id="${r._id}">Eliminar</button>
      </td>
    </tr>`;
  });

  html += `</tbody></table>`;
  container.innerHTML = html;

  // attach listeners (defensivamente)
  container.querySelectorAll(".btn-view").forEach(btn => {
    btn.removeEventListener('click', viewBtnHandler); // inofensivo si no existe
    btn.addEventListener("click", viewBtnHandler);
  });
  container.querySelectorAll(".btn-del").forEach(btn => {
    btn.removeEventListener('click', delBtnHandler);
    btn.addEventListener("click", delBtnHandler);
  });
}

function viewBtnHandler(e) {
  const id = e.currentTarget.getAttribute("data-id");
  openModalWithId(id);
}

async function delBtnHandler(e) {
  const id = e.currentTarget.getAttribute("data-id");
  if (!confirm("¿Eliminar solicitud " + id + " ?")) return;
  const res = await callDelete('/requests/' + id);
  if (res && res.data && res.data.ok) {
    alert('Eliminado correctamente');
    const btn = document.getElementById('btnListMyReqs'); if (btn) btn.click();
  } else {
    alert('Error al eliminar: ' + (res.data && res.data.error ? res.data.error : 'unknown'));
  }
}

// ----------------------- Modal logic -----------------------
const modal = document.getElementById('modal');
const modalBody = document.getElementById('modal-body');
const modalClose = document.getElementById('modal-close');
const modalDeleteBtn = document.getElementById('modal-delete');
let modalCurrentId = null;

function setModalVisible(flag) {
  if (!modal) return;
  modal.className = flag ? 'modal-visible' : 'modal-hidden';
}

if (modalClose) modalClose.addEventListener('click', ()=> setModalVisible(false));
if (modal) modal.addEventListener('click', (e)=> { if (e.target === modal) setModalVisible(false); });

async function openModalWithId(id) {
  modalCurrentId = id;
  const r = await callGetRaw('/requests');
  if (!r.data || !r.data.ok) {
    if (modalBody) modalBody.innerText = 'No se pudo obtener detalle.';
  } else {
    const item = (r.data.requests || []).find(x => x._id === id);
    if (!item) {
      if (modalBody) modalBody.innerText = 'Solicitud no encontrada.';
    } else {
      if (modalBody) modalBody.innerHTML = `<pre>${JSON.stringify(item, null, 2)}</pre>`;
    }
  }
  setModalVisible(true);
}

if (modalDeleteBtn) modalDeleteBtn.addEventListener('click', async ()=> {
  if (!modalCurrentId) return;
  if (!confirm('Eliminar solicitud ' + modalCurrentId + ' ?')) return;
  const res = await callDelete('/requests/' + modalCurrentId);
  if (res && res.data && res.data.ok) {
    alert('Eliminada');
    setModalVisible(false);
    const btn = document.getElementById('btnListMyReqs'); if (btn) btn.click();
  } else {
    alert('Error al eliminar');
  }
});

// ----------------------- DOMContentLoaded: registrar listeners con seguridad -----------------------
document.addEventListener('DOMContentLoaded', ()=> {
  // Restaurar token y mostrar info
  const tk = sessionStorage.getItem('municipal_token');
  if (tk) {
    applyToken(tk);
    const savedName = sessionStorage.getItem('municipal_name');
    const savedRole = sessionStorage.getItem('municipal_role');
    if (savedName || savedRole) showUserInfo(savedName, savedRole);
    const btnLogout = document.getElementById('btnLogout'); if (btnLogout) btnLogout.style.display = 'inline-block';
  }

  // --- Register ---
  const btnRegister = document.getElementById("btnRegister");
  if (btnRegister) {
    btnRegister.addEventListener("click", async () => {
      const name = (document.getElementById("regName") || {}).value || '';
      const email = (document.getElementById("regEmail") || {}).value || '';
      const pass = (document.getElementById("regPass") || {}).value || '';
      const msg = document.getElementById("regMsg");
      if (!name || !email || !pass) {
        if (msg) { msg.style.color="red"; msg.textContent="Completa todos los campos."; }
        return;
      }
      if (msg) { msg.style.color="#333"; msg.textContent="Registrando..."; }
      const r = await registerUser(name.trim(), email.trim(), pass);
      if (r.status === 200 && r.data && r.data.ok) {
        if (msg) { msg.style.color="green"; msg.textContent="Registro exitoso. Ahora puedes iniciar sesión."; }
      } else {
        if (msg) { msg.style.color="red"; msg.textContent = r.data?.error || "Error al registrar."; }
      }
    });
  }

  // --- Login ---
  const btnLogin = document.getElementById('btnLogin');
  if (btnLogin) {
    btnLogin.addEventListener('click', async ()=> {
      const email = (document.getElementById('loginEmail') || {}).value || '';
      const password = (document.getElementById('loginPass') || {}).value || '';
      const msg = document.getElementById('loginMsg');
      if (!email || !password) {
        if (msg) { msg.style.color='#c53030'; msg.textContent='Completa email y contraseña.'; }
        return;
      }
      if (msg) { msg.style.color='#333'; msg.textContent='Iniciando...'; }
      const res = await loginRequest(email.trim(), password);
      if (res && res.status === 200 && res.data && res.data.ok) {
        const token = res.data.token;
        applyToken(token);
        sessionStorage.setItem('municipal_name', res.data.name || '');
        sessionStorage.setItem('municipal_role', res.data.role || '');
        showUserInfo(res.data.name || '', res.data.role || '');
        const btnLogout = document.getElementById('btnLogout'); if (btnLogout) btnLogout.style.display = 'inline-block';
        if (msg) { msg.style.color='green'; msg.textContent = `Bienvenido ${res.data.name || ''} (rol: ${res.data.role || ''})`; }
        // redirigir a home si vienes desde auth page
        if (location.pathname.endsWith('auth.html')) location.href = 'home.html';
      } else {
        if (msg) { msg.style.color='#c53030'; msg.textContent = (res && res.data && res.data.error) ? res.data.error : 'Error al iniciar sesión'; }
      }
    });
  }

  // --- Logout ---
  const btnLogout = document.getElementById('btnLogout');
  if (btnLogout) {
    btnLogout.addEventListener('click', ()=> {
      applyToken(null);
      sessionStorage.removeItem('municipal_name');
      sessionStorage.removeItem('municipal_role');
      location.href = 'auth.html';
    });
  }

  // --- Public info ---
  const btnPublic = document.getElementById('btnPublic');
  if (btnPublic) {
    btnPublic.addEventListener('click', async ()=> {
      const r = await callGetRaw('/public/info');
      const out = document.getElementById('outPublic');
      if (out) out.textContent = JSON.stringify(r.data, null, 2);
    });
  }

  // --- Submit request ---
  const btnSubmitReq = document.getElementById('btnSubmitReq');
  if (btnSubmitReq) {
    btnSubmitReq.addEventListener('click', async ()=> {
      const type = (document.getElementById('reqType') || {}).value || '';
      const desc = (document.getElementById('reqDesc') || {}).value || '';
      const out = document.getElementById('outReq');
      if (!type || !desc) {
        if (out) out.textContent = 'Completa tipo y descripción.';
        return;
      }
      const r = await callPost('/requests', {type, description: desc});
      if (out) out.textContent = JSON.stringify(r.data, null, 2);
    });
  }

  // --- Make payment ---
  const btnPay = document.getElementById('btnPay');
  if (btnPay) {
    btnPay.addEventListener('click', async ()=> {
      const amount = Number((document.getElementById('payAmount') || {}).value || 0);
      const method = (document.getElementById('payMethod') || {}).value || '';
      const out = document.getElementById('outPay');
      if (!amount || !method) {
        if (out) out.textContent = 'Completa monto y método.';
        return;
      }
      const r = await callPost('/payments', {amount, method});
      if (out) out.textContent = JSON.stringify(r.data, null, 2);
    });
  }

  // --- List my requests ---
  const btnListMyReqs = document.getElementById('btnListMyReqs');
  if (btnListMyReqs) {
    btnListMyReqs.addEventListener('click', async ()=> {
      const r = await callGetRaw('/requests');
      renderRequestsJSON(r.data, 'outListReqs');
    });
  }

  // --- Consult citizen record (staff) ---
  const btnGetCit = document.getElementById('btnGetCit');
  if (btnGetCit) {
    btnGetCit.addEventListener('click', async ()=> {
      const id = (document.getElementById('citId') || {}).value || '';
      const out = document.getElementById('outCit');
      if (!id) {
        if (out) out.textContent = 'Ingrese id ciudadano';
        return;
      }
      const r = await callGetRaw('/citizen/record/' + encodeURIComponent(id));
      if (out) out.textContent = JSON.stringify(r.data, null, 2);
    });
  }

  // activar botones del modal si existen (ya registrados arriba)
  // (los handlers del modal fueron añadidos en la parte superior)
});

// end of file


