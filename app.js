// Proteger la app: si no hay token, redirige a auth.html
(function(){
  const token = sessionStorage.getItem('municipal_token');
  if (!token) {
    // si ya estás en la página de auth no redirijas (por si pruebas)
    if (!location.pathname.endsWith('auth.html')) {
      location.href = 'auth.html';
    }
  } else {
    // aplicar token al campo si existe (si usas input #token en la UI)
    const tkField = document.getElementById('token');
    if (tkField) tkField.value = token;
    // mostrar info de usuario si la guardaste
    const name = sessionStorage.getItem('municipal_name');
    const role = sessionStorage.getItem('municipal_role');
    if (name || role) {
      const infoDiv = document.getElementById('userInfo');
      if (infoDiv) infoDiv.innerHTML = `<small>Usuario: <strong>${name||'-'}</strong> | Rol: <strong>${role||'-'}</strong></small>`;
    }
  }
})();


// app.js - frontend con tabla, modal y eliminar
function getHeaders() {
  const token = document.getElementById('token').value.trim();
  const headers = {'Content-Type': 'application/json'};
  if (token) headers['Authorization'] = 'Bearer ' + token;
  return headers;
}

function baseUrl() {
  return document.getElementById('apiBase').value.trim().replace(/\/+$/,'');
}

// Registrar ciudadano
async function registerUser(name, email, password) {
  const url = baseUrl() + "/auth/register";
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({name, email, password})
    });
    const data = await res.json().catch(()=>null);
    return {status: res.status, data};
  } catch (err) {
    return {status: 0, data: null};
  }
}

// Listener botón Registrarme
document.getElementById("btnRegister").addEventListener("click", async () => {
  const name = document.getElementById("regName").value.trim();
  const email = document.getElementById("regEmail").value.trim();
  const pass = document.getElementById("regPass").value;
  const msg = document.getElementById("regMsg");

  if (!name || !email || !pass) {
    msg.style.color = "red";
    msg.textContent = "Completa todos los campos.";
    return;
  }

  msg.style.color = "#333";
  msg.textContent = "Registrando...";

  const r = await registerUser(name, email, pass);

  if (r.status === 200 && r.data && r.data.ok) {
    msg.style.color = "green";
    msg.textContent = "Registro exitoso. Ahora puedes iniciar sesión.";
  } else {
    msg.style.color = "red";
    msg.textContent = r.data?.error || "Error al registrar.";
  }
});


// ------------------ LOGIN (frontend) ------------------
// Llamada al endpoint /auth/login
async function loginRequest(email, password) {
  const url = baseUrl() + '/auth/login';
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ email, password })
    });
    const data = await res.json().catch(()=>null);
    return { status: res.status, data };
  } catch (e) {
    return { status: 0, data: null };
  }
}

// Aplica token en el campo token y lo guarda en sessionStorage
function applyToken(token) {
  const tkField = document.getElementById('token');
  if (tkField) tkField.value = token || '';
  if (token) sessionStorage.setItem('municipal_token', token);
  else sessionStorage.removeItem('municipal_token');
}

// Muestra info del usuario en la UI (nombre y rol)
function showUserInfo(name, role) {
  let info = document.getElementById('userInfo');
  if (!info) {
    // crear elemento si no existe
    const cfg = document.querySelector('.panel'); // sección config (ajusta si tu layout difiere)
    info = document.createElement('div');
    info.id = 'userInfo';
    info.style.marginTop = '8px';
    cfg && cfg.appendChild(info);
  }
  info.innerHTML = `<small>Usuario: <strong>${name || '-'}</strong> &nbsp;|&nbsp; Rol: <strong>${role || '-'}</strong></small>`;
}

// Restaurar token al cargar la página
document.addEventListener('DOMContentLoaded', ()=> {
  const tk = sessionStorage.getItem('municipal_token');
  if (tk) {
    applyToken(tk);
    // opcional: intentar decodificar nombre/role desde token (si quieres)
    // mejor: después del login usamos el nombre/rol que devuelve el backend y lo guardamos en sessionStorage:
    const savedName = sessionStorage.getItem('municipal_name');
    const savedRole = sessionStorage.getItem('municipal_role');
    if (savedName || savedRole) showUserInfo(savedName, savedRole);
    document.getElementById('btnLogout') && (document.getElementById('btnLogout').style.display = 'inline-block');
  }
});

// Listener del botón Iniciar sesión
document.getElementById('btnLogin').addEventListener('click', async ()=> {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPass').value;
  const msg = document.getElementById('loginMsg');
  if (!email || !password) {
    msg.style.color = '#c53030';
    msg.textContent = 'Completa email y contraseña.';
    return;
  }
  msg.style.color = '#333'; msg.textContent = 'Iniciando...';

  const res = await loginRequest(email, password);
  if (res && res.status === 200 && res.data && res.data.ok) {
    const token = res.data.token;
    applyToken(token);
    // guardar nombre/rol para mostrar en pantalla
    sessionStorage.setItem('municipal_name', res.data.name || '');
    sessionStorage.setItem('municipal_role', res.data.role || '');
    showUserInfo(res.data.name || '', res.data.role || '');
    document.getElementById('btnLogout').style.display = 'inline-block';
    msg.style.color = 'green';
    msg.textContent = `Bienvenido ${res.data.name || ''} (rol: ${res.data.role || ''})`;
  } else {
    msg.style.color = '#c53030';
    msg.textContent = (res && res.data && res.data.error) ? res.data.error : 'Error al iniciar sesión';
  }
});

// Logout
document.getElementById('btnLogout').addEventListener('click', ()=>{
  // borrar token e info del usuario
  applyToken(null);
  sessionStorage.removeItem('municipal_name');
  sessionStorage.removeItem('municipal_role');

  // redirigir a login/register
  location.href = 'auth.html';
});



// Simple GET wrapper
async function callGetRaw(path) {
  const url = baseUrl() + path;
  const res = await fetch(url, {method:'GET', headers: getHeaders()});
  const data = await res.json().catch(()=>null);
  return {status: res.status, data};
}

// Simple POST wrapper
async function callPost(path, body) {
  const url = baseUrl() + path;
  const res = await fetch(url, {method:'POST', headers: getHeaders(), body: JSON.stringify(body)});
  const data = await res.json().catch(()=>null);
  return {status: res.status, data};
}

// Simple DELETE wrapper
async function callDelete(path) {
  const url = baseUrl() + path;
  const res = await fetch(url, {method:'DELETE', headers: getHeaders()});
  const data = await res.json().catch(()=>null);
  return {status: res.status, data};
}

// Public info
document.getElementById('btnPublic').addEventListener('click', async ()=> {
  const r = await callGetRaw('/public/info');
  document.getElementById('outPublic').textContent = JSON.stringify(r.data, null, 2);
});

// Submit request
document.getElementById('btnSubmitReq').addEventListener('click', async ()=> {
  const body = {type: document.getElementById('reqType').value, description: document.getElementById('reqDesc').value};
  const r = await callPost('/requests', body);
  document.getElementById('outReq').textContent = JSON.stringify(r.data, null, 2);
});

// Make payment
document.getElementById('btnPay').addEventListener('click', async ()=> {
  const body = {amount: Number(document.getElementById('payAmount').value), method: document.getElementById('payMethod').value};
  const r = await callPost('/payments', body);
  document.getElementById('outPay').textContent = JSON.stringify(r.data, null, 2);
});

// Render requests as table
function renderRequestsJSON(data, outId) {
  const container = document.getElementById(outId);
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
        <th>ID</th>
        <th>Tipo</th>
        <th>Descripción</th>
        <th>Ciudadano ID</th>
        <th>Fecha</th>
        <th>Acciones</th>
      </tr>
    </thead>
    <tbody>`;

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

  // Listeners
  container.querySelectorAll(".btn-view").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const id = e.target.getAttribute("data-id");
      openModalWithId(id);
    });
  });
  container.querySelectorAll(".btn-del").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const id = e.target.getAttribute("data-id");
      if (!confirm("¿Eliminar solicitud " + id + " ?")) return;
      const res = await callDelete('/requests/' + id);
      if (res && res.data && res.data.ok) {
        alert('Eliminado correctamente');
        document.getElementById('btnListMyReqs').click(); // refrescar
      } else {
        alert('Error al eliminar: ' + (res.data && res.data.error ? res.data.error : 'unknown'));
      }
    });
  });
}

// Listar mis solicitudes
document.getElementById('btnListMyReqs').addEventListener('click', async ()=> {
  const r = await callGetRaw('/requests');
  renderRequestsJSON(r.data, 'outListReqs');
});

// Consultar registro de ciudadano (staff)
document.getElementById('btnGetCit').addEventListener('click', async ()=> {
  const id = document.getElementById('citId').value;
  const r = await callGetRaw('/citizen/record/' + id);
  document.getElementById('outCit').textContent = JSON.stringify(r.data, null, 2);
});

// ------------------------------------------------------------------
// Modal: abrir con detalles (busca el request por id en la lista vía API si quieres)
const modal = document.getElementById('modal');
const modalBody = document.getElementById('modal-body');
const modalClose = document.getElementById('modal-close');
const modalDeleteBtn = document.getElementById('modal-delete');
let modalCurrentId = null;

modalClose.addEventListener('click', ()=> setModalVisible(false));
modal.addEventListener('click', (e)=> { if (e.target === modal) setModalVisible(false); });

async function openModalWithId(id) {
  modalCurrentId = id;
  // Podemos pedir al backend el documento individual si tenemos endpoint,
  // pero aquí llamamos GET /requests y filtramos para simplicity.
  const r = await callGetRaw('/requests');
  if (!r.data || !r.data.ok) {
    modalBody.innerText = 'No se pudo obtener detalle.';
  } else {
    const item = (r.data.requests || []).find(x => x._id === id);
    if (!item) {
      modalBody.innerText = 'Solicitud no encontrada.';
    } else {
      modalBody.innerHTML = `<pre>${JSON.stringify(item, null, 2)}</pre>`;
    }
  }
  setModalVisible(true);
}

modalDeleteBtn.addEventListener('click', async ()=> {
  if (!modalCurrentId) return;
  if (!confirm('Eliminar solicitud ' + modalCurrentId + ' ?')) return;
  const res = await callDelete('/requests/' + modalCurrentId);
  if (res && res.data && res.data.ok) {
    alert('Eliminada');
    setModalVisible(false);
    document.getElementById('btnListMyReqs').click();
  } else {
    alert('Error al eliminar');
  }
});

function setModalVisible(flag) {
  modal.className = flag ? 'modal-visible' : 'modal-hidden';
}
