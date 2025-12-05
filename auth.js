// auth.js - simple y claro
function baseUrl() {
  // ajusta si tu API está en otro origen
  return "http://127.0.0.1:5000";
}

async function postJson(path, body) {
  try {
    const res = await fetch(baseUrl() + path, {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify(body)
    });
    const data = await res.json().catch(()=>null);
    return {status: res.status, data};
  } catch(e) {
    return {status:0, data:null};
  }
}

/* --- Tabs --- */
document.getElementById('tab-login').addEventListener('click', ()=>{
  document.getElementById('panel-login').style.display = '';
  document.getElementById('panel-register').style.display = 'none';
  document.getElementById('tab-login').classList.add('active');
  document.getElementById('tab-register').classList.remove('active');
});
document.getElementById('tab-register').addEventListener('click', ()=>{
  document.getElementById('panel-login').style.display = 'none';
  document.getElementById('panel-register').style.display = '';
  document.getElementById('tab-login').classList.remove('active');
  document.getElementById('tab-register').classList.add('active');
});

/* --- Login --- */
document.getElementById('btnLogin').addEventListener('click', async ()=>{
  const email = document.getElementById('loginEmail').value.trim();
  const pass  = document.getElementById('loginPass').value;
  const msg = document.getElementById('loginMsg');
  msg.style.color = '#333'; msg.textContent = 'Iniciando...';
  const r = await postJson('/auth/login', {email, password: pass});
  if (r.status === 200 && r.data && r.data.ok) {
    // guardar token y redirect
    sessionStorage.setItem('municipal_token', r.data.token);
    sessionStorage.setItem('municipal_name', r.data.name || '');
    sessionStorage.setItem('municipal_role', r.data.role || '');
    location.href = 'home.html'; // abrir interfaz principal
  } else {
    msg.style.color = '#c53030';
    msg.textContent = r.data?.error || 'Credenciales inválidas';
  }
});

/* --- Register --- */
document.getElementById('btnRegister').addEventListener('click', async ()=>{
  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const pass = document.getElementById('regPass').value;
  const msg = document.getElementById('regMsg');

  if (!name || !email || !pass) { msg.style.color='red'; msg.textContent='Completa todos los campos.'; return; }
  msg.style.color='#333'; msg.textContent='Registrando...';

  const r = await postJson('/auth/register', {name, email, password: pass});
  if (r.status === 200 && r.data && r.data.ok) {
    msg.style.color='green';
    msg.textContent='Registro exitoso. Ahora inicia sesión.';
    // opcional: auto-switch a login tab
    document.getElementById('tab-login').click();
    document.getElementById('loginEmail').value = email;
  } else {
    msg.style.color='red';
    msg.textContent = r.data?.error || 'Error al registrar';
  }
});

