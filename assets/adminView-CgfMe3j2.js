const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/categoriasAdmin-D4K2RjeG.js","assets/index-5bXzwouq.js","assets/index-CcWN9cuG.css","assets/himnosAdmin-D7nqz8oU.js"])))=>i.map(i=>d[i]);
import{s as d,_ as T}from"./index-5bXzwouq.js";let w=[];async function S(){const{data:r,error:a}=await d.from("profiles").select("*").order("email");return a?(console.error("Error cargando perfiles:",a),[]):r||[]}async function k(r,a,o,t){t.disabled=!0;try{const{error:e}=await d.from("profiles").update({role:a}).eq("id",r);if(e)throw e;const n=w.find(i=>i.id===r);n&&(n.role=a),t.style.borderColor="var(--success-color, #10b981)",setTimeout(()=>t.style.borderColor="",2e3)}catch(e){console.error("Error actualizando rol:",e),alert("Error al actualizar el rol: "+e.message),t.value=o}finally{t.disabled=!1}}function $(r){const a=document.getElementById("admin-users-tbody");if(!a)return;if(r.length===0){a.innerHTML='<tr><td colspan="4" style="text-align:center;">No se encontraron usuarios.</td></tr>';return}const o=r.map(e=>`
    <tr>
      <td style="font-weight: 500;">${e.email||"Sin correo"}</td>
      <td style="font-family: monospace; font-size: 0.8rem; color: #64748b;">${e.id.split("-")[0]}...</td>
      <td>
        <span class="badge ${e.role==="admin"?"badge-role":e.role==="special"?"badge-category":"badge-voice"}" style="color: initial;">
          ${e.role}
        </span>
      </td>
      <td style="text-align: right;">
        <select class="select-input role-select" data-id="${e.id}" data-original="${e.role}" style="padding: 0.3rem; width: auto; font-size: 0.8rem;">
          <option value="member" ${e.role==="member"?"selected":""}>Miembro</option>
          <option value="special" ${e.role==="special"?"selected":""}>Especial</option>
          <option value="admin" ${e.role==="admin"?"selected":""}>Administrador</option>
        </select>
      </td>
    </tr>
  `).join("");a.innerHTML=o,a.querySelectorAll(".role-select").forEach(e=>{e.addEventListener("change",n=>{const i=n.target.value,s=n.target.getAttribute("data-original"),c=n.target.getAttribute("data-id");i!==s&&(confirm(`¿Estás seguro de cambiar el rol a ${i}?`)?k(c,i,s,n.target):n.target.value=s)})})}async function x(r,a){if(a!=="admin"){const t=document.getElementById("admin-users-tbody");t&&(t.innerHTML='<tr><td colspan="4" style="color: red;">Acceso denegado.</td></tr>');return}w=await S(),$(w);const o=document.getElementById("admin-user-search");o&&o.addEventListener("input",t=>{const e=t.target.value.toLowerCase(),n=w.filter(i=>i.email&&i.email.toLowerCase().includes(e));$(n)})}function u(r,a="info",o=null,t=4e3){let e=document.getElementById("toast-container");e||(e=document.createElement("div"),e.id="toast-container",e.className="toast-container",document.body.appendChild(e));const n=document.createElement("div");n.className=`toast-item toast-${a}`;const i={success:"✅",error:"❌",warning:"⚠️",info:"ℹ️"},s={success:"Éxito",error:"Error",warning:"Atención",info:"Información"},c=i[a]||i.info,g=o!==null?o:s[a]||"";n.innerHTML=`
    <div class="toast-icon">${c}</div>
    <div class="toast-content">
      ${g?`<div class="toast-title">${g}</div>`:""}
      <div class="toast-message">${r}</div>
    </div>
    <button class="toast-close" aria-label="Cerrar">&times;</button>
  `,n.querySelector(".toast-close").addEventListener("click",()=>{A(n)}),e.appendChild(n),t>0&&setTimeout(()=>{A(n)},t)}function A(r){!r||r.classList.contains("toast-leaving")||(r.classList.add("toast-leaving"),r.addEventListener("animationend",()=>{r.parentNode&&r.parentNode.removeChild(r)}))}let f=null,I=null;function H(r){if(!r)return{message:"Ocurrió un error inesperado.",type:"error",title:"Error"};const a=r.message||r.toString()||"";return(r.code||"")==="23505"||a.includes("group_members_pkey")||a.includes("duplicate key")||a.includes("unique constraint")?{message:"Este usuario ya pertenece a este grupo coral.",type:"warning",title:"Integrante ya en el grupo"}:{message:`Error al añadir miembro: ${a}`,type:"error",title:"Error al añadir"}}async function B(r){const a=document.getElementById("registered-emails-list");if(!a)return;if(r!=="admin"){a.innerHTML="";return}const{data:o,error:t}=await d.from("profiles").select("id, email");!t&&o&&(a.innerHTML=o.map(e=>`<option value="${e.email}">`).join(""))}async function z(r,a,o){let t=document.getElementById("members-modal-overlay");t&&t.remove(),t=document.createElement("div"),t.id="members-modal-overlay",t.className="members-modal-overlay fade-in",t.innerHTML=`
    <div class="members-modal-card">
      <div class="members-modal-header">
        <h3 class="members-modal-title">👥 Integrantes de ${a}</h3>
        <button class="members-modal-close" aria-label="Cerrar">&times;</button>
      </div>
      <div class="members-modal-body">
        <input type="text" class="members-search-input" placeholder="🔍 Buscar integrante por correo..." style="display: none;">
        <div class="members-modal-list">
          <p class="loading-message" style="font-size: 0.85rem; color: #64748b; text-align: center; margin: 1rem 0;">Cargando miembros...</p>
        </div>
      </div>
      <div class="members-modal-footer">
        <button class="btn btn-ghost btn-close-modal-footer" style="padding: 0.4rem 1rem;">Cerrar</button>
      </div>
    </div>
  `,document.body.appendChild(t);const e=()=>{t.remove()};t.querySelector(".members-modal-close").addEventListener("click",e),t.querySelector(".btn-close-modal-footer").addEventListener("click",e),t.addEventListener("click",n=>{n.target===t&&e()}),await M(r,a,o,t)}async function M(r,a,o,t){const e=t.querySelector(".members-modal-list"),n=t.querySelector(".members-search-input");if(!e)return;const{data:i,error:s}=await d.from("group_members").select("user_id, added_at").eq("group_id",r);if(s){e.innerHTML=`<p style="color: red; font-size: 0.85rem; text-align: center;">Error al obtener miembros: ${s.message}</p>`;return}const c=i||[];if(c.length===0){e.innerHTML='<p style="font-size: 0.85rem; color: #64748b; text-align: center; margin: 1rem 0;">No hay integrantes registrados en este grupo.</p>',n&&(n.style.display="none");return}const g=[];for(const m of c){let p="Usuario oculto";try{const{data:l}=await d.rpc("get_email_by_profile_id",{user_id_param:m.user_id});l&&(p=l)}catch{}g.push({userId:m.user_id,email:p,addedAt:m.added_at})}g.sort((m,p)=>m.email.localeCompare(p.email,"es",{sensitivity:"base"})),g.length>5&&n&&(n.style.display="block");const y=(m="")=>{const p=g.filter(l=>l.email.toLowerCase().includes(m.toLowerCase()));if(p.length===0){e.innerHTML='<p style="font-size: 0.85rem; color: #64748b; text-align: center; margin: 1rem 0;">No se encontraron coincidencias.</p>';return}e.innerHTML=p.map(l=>`
      <div class="members-modal-item">
        <span>✉️ ${l.email}</span>
        ${o?`<button class="btn-icon btn-remove-modal-member" data-group="${r}" data-user="${l.userId}" data-email="${l.email}" title="Eliminar miembro">🗑️</button>`:""}
      </div>
    `).join(""),e.querySelectorAll(".btn-remove-modal-member").forEach(l=>{l.addEventListener("click",async v=>{const q=v.currentTarget.getAttribute("data-user"),C=v.currentTarget.getAttribute("data-group"),L=v.currentTarget.getAttribute("data-email");if(confirm(`¿Deseas eliminar a ${L} de este grupo?`)){v.currentTarget.disabled=!0;try{const{error:h}=await d.from("group_members").delete().eq("group_id",C).eq("user_id",q);if(h)throw h;u(`Se eliminó a ${L} del grupo.`,"info","Miembro Eliminado"),await M(r,a,o,t),await b()}catch(h){u("Error al eliminar miembro: "+h.message,"error","Error"),v.currentTarget.disabled=!1}}})})};y(),n&&(n.oninput=m=>{y(m.target.value.trim())})}async function b(){const r=document.getElementById("groups-list");if(!r)return;r.innerHTML='<p class="loading-message">Cargando grupos...</p>';const{data:a,error:o}=await d.from("groups").select("*").order("group_name",{ascending:!0});if(o){r.innerHTML=`<p style="color:red;">Error cargando grupos: ${o.message}</p>`;return}if(!a||a.length===0){r.innerHTML="<p>No tienes ningún grupo creado aún.</p>";return}let t="";for(const e of a){const s=f&&f.user&&e.created_by===f.user.id||I==="admin";let c="Desconocido";try{const{data:l}=await d.rpc("get_email_by_profile_id",{user_id_param:e.created_by});l&&(c=l)}catch{}const{data:g}=await d.from("group_members").select("user_id").eq("group_id",e.id),y=(g||[]).length,m=s?`
      <div class="group-header-actions">
        <button class="btn-icon btn-edit-group" data-group="${e.id}" data-name="${e.group_name}" title="Renombrar grupo">✏️</button>
        <button class="btn-icon btn-delete-group" data-group="${e.id}" title="Eliminar grupo">🗑️</button>
      </div>
    `:`
      <div class="group-header-actions">
        <span class="badge" style="background-color: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; font-size: 0.7rem; font-weight: 500; white-space: nowrap;">Integrante</span>
      </div>
    `,p=s?`
      <form class="add-member-form form-compact" data-group="${e.id}">
        <input type="email" class="search-input member-email-input" list="registered-emails-list" placeholder="Añadir miembro por correo exacto..." required style="margin-bottom: 0.5rem; width: 100%;">
        <button type="submit" class="btn btn-secondary btn-sm w-full">Añadir Integrante</button>
      </form>
    `:`
      <p style="font-size: 0.75rem; color: #64748b; text-align: center; margin: 0.5rem 0 0; font-style: italic;">Perteneces a este grupo (Solo lectura).</p>
    `;t+=`
      <div class="group-card">
        <div class="group-header">
          <div class="group-header-info">
            <h4 class="group-title">${e.group_name}</h4>
            <p style="font-size: 0.75rem; color: #64748b; margin: 0.2rem 0 0; word-break: break-all;">Creado por: ${c}</p>
          </div>
          ${m}
        </div>

        <div style="display: flex; flex-direction: column; gap: 0.75rem; margin-top: 0.25rem;">
          <button type="button" class="btn btn-ghost btn-sm btn-open-members-modal w-full" data-group="${e.id}" data-name="${e.group_name}" data-can-manage="${s}">
            👥 Ver Integrantes (${y})
          </button>

          ${p}
        </div>
      </div>
    `}r.innerHTML=t,document.querySelectorAll(".btn-open-members-modal").forEach(e=>{e.addEventListener("click",n=>{const i=n.currentTarget.getAttribute("data-group"),s=n.currentTarget.getAttribute("data-name"),c=n.currentTarget.getAttribute("data-can-manage")==="true";z(i,s,c)})}),document.querySelectorAll(".add-member-form").forEach(e=>{e.addEventListener("submit",G)}),document.querySelectorAll(".btn-edit-group").forEach(e=>{e.addEventListener("click",N)}),document.querySelectorAll(".btn-delete-group").forEach(e=>{e.addEventListener("click",V)})}async function D(r){r.preventDefault();const a=document.getElementById("group-name"),o=a.value.trim(),t=r.target.querySelector("button");if(o){t.disabled=!0,t.textContent="Creando...";try{const{error:e}=await d.from("groups").insert([{group_name:o,created_by:f.user.id}]);if(e)throw e;u(`Grupo "${o}" creado exitosamente.`,"success","Grupo Creado"),a.value="",await b()}catch(e){u("Error al crear grupo: "+e.message,"error","Error al Crear Grupo")}finally{t.disabled=!1,t.textContent="Crear Grupo"}}}async function G(r){r.preventDefault();const a=r.target.getAttribute("data-group"),o=r.target.querySelector(".member-email-input"),t=o.value.trim(),e=r.target.querySelector("button");if(t){e.disabled=!0;try{const{data:n,error:i}=await d.rpc("get_profile_id_by_email",{email_param:t});if(i||!n){u("No se encontró ningún usuario con ese correo exacto registrado en la plataforma.","warning","Usuario no encontrado"),e.disabled=!1;return}const{error:s}=await d.from("group_members").insert([{group_id:a,user_id:n,added_by:f.user.id}]);if(s)throw s;u(`Integrante ${t} añadido al grupo.`,"success","Miembro Añadido"),o.value="",await b()}catch(n){const i=H(n);u(i.message,i.type,i.title)}finally{e.disabled=!1}}}async function N(r){const a=r.currentTarget.getAttribute("data-group"),o=r.currentTarget.getAttribute("data-name"),t=prompt("Introduce el nuevo nombre para el grupo:",o);if(!(!t||t.trim()===""||t===o)){r.currentTarget.disabled=!0;try{const{error:e}=await d.from("groups").update({group_name:t.trim()}).eq("id",a);if(e)throw e;u(`El grupo fue renombrado a "${t.trim()}".`,"success","Grupo Actualizado"),await b()}catch(e){u("Error al renombrar el grupo: "+e.message,"error","Error"),r.currentTarget.disabled=!1}}}async function V(r){const a=r.currentTarget.getAttribute("data-group");if(confirm("¿Estás seguro de que deseas eliminar este grupo? Todos sus miembros serán eliminados de la lista.")){r.currentTarget.disabled=!0;try{await d.from("group_members").delete().eq("group_id",a);const{error:o}=await d.from("groups").delete().eq("id",a);if(o)throw o;u("Grupo eliminado correctamente.","info","Grupo Eliminado"),await b()}catch(o){u("Error al eliminar el grupo: "+o.message,"error","Error"),r.currentTarget.disabled=!1}}}async function O(r,a){if(a!=="admin"&&a!=="special"){const t=document.getElementById("groups-list");t&&(t.innerHTML='<p style="color: red;">Acceso denegado.</p>');return}f=r,I=a;const o=document.getElementById("create-group-form");o&&o.addEventListener("submit",D),await B(a),await b()}const _={};async function E(r){const a=document.querySelector(".admin-main-panel");if(!a)return!1;if(!_[r])try{const o=await fetch(`views/admin/${r}.html`);if(!o.ok)throw new Error("No se pudo cargar la vista "+r);const t=await o.text();_[r]=t}catch(o){return console.error(o),a.innerHTML='<p style="color: var(--error-color);">Error cargando módulo.</p>',!1}return a.innerHTML=_[r],!0}function R(r){document.querySelectorAll(".admin-nav-link").forEach(o=>{o.classList.remove("active"),o.getAttribute("href")===`#/admin/${r}`&&o.classList.add("active")})}async function j(r,a,o){const t=document.querySelector('a[href="#/admin/usuarios"]');t&&(t.style.display=o==="admin"?"block":"none");const e=document.querySelector('a[href="#/admin/himnos"]');e&&(e.style.display=o==="admin"?"block":"none"),o!=="admin"&&(!r||r==="usuarios"||r==="himnos")&&(r="grupos",window.location.hash="#/admin/grupos"),(!r||r==="")&&(r=o==="admin"?"usuarios":"grupos"),R(r);let n=!1;switch(r){case"usuarios":n=await E("usuarios"),n&&x(a,o);break;case"grupos":n=await E("grupos"),n&&O(a,o);break;case"categorias":n=await E("categorias"),n&&T(()=>import("./categoriasAdmin-D4K2RjeG.js"),__vite__mapDeps([0,1,2])).then(i=>{i.initCategoriasAdmin(a,o)});break;case"himnos":n=await E("himnos"),n&&T(()=>import("./himnosAdmin-D7nqz8oU.js"),__vite__mapDeps([3,1,2])).then(i=>{i.initHimnosAdmin(a,o)});break;default:window.location.hash="#/admin/usuarios";break}}const F=Object.freeze(Object.defineProperty({__proto__:null,initAdminView:j},Symbol.toStringTag,{value:"Module"}));export{F as a,u as s};
