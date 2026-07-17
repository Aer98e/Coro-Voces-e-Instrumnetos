import supabase, { verificarPassword } from "../config/supabase.js";
import { cargarVoces } from "../services/hymnService.js";
import { setDefaultVoice } from "../main.js";

export async function initProfileView(session, role) {
  if (!session) return;

  // 1. Poblar datos del usuario
  const nameEl = document.getElementById("profile-name");
  const emailEl = document.getElementById("profile-email");
  const roleEl = document.getElementById("profile-role-badge");
  const avatarEl = document.getElementById("profile-avatar-initial");

  // Cargamos el rol en texto legible
  if (roleEl) {
    let roleText = 'Miembro';
    if (role === 'admin') roleText = 'Administrador';
    if (role === 'special') roleText = 'Usuario Especial';
    roleEl.textContent = roleText;
  }

  // Variable local para guardar los datos cargados del perfil
  let profileData = null;

  async function cargarDatosPerfil() {
    try {
      // Obtener datos frescos del usuario de Auth para ver si hay correos pendientes
      const { data: authUserData, error: authUserError } = await supabase.auth.getUser();
      if (!authUserError && authUserData?.user) {
        session.user = authUserData.user;
      }

      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('name, defauld_voice_id')
        .eq('id', session.user.id)
        .single();

      if (profileError) throw profileError;
      profileData = data;

      // Asignar textos
      if (emailEl) {
        let emailText = session.user.email;
        if (session.user.new_email) {
          emailText += ` (Pendiente de confirmar: ${session.user.new_email})`;
        }
        emailEl.textContent = emailText;
      }
      if (nameEl) nameEl.textContent = profileData?.name || "Sin nombre establecido";
      if (avatarEl) {
        avatarEl.textContent = (profileData?.name || session.user.email).charAt(0).toUpperCase();
      }
    } catch (err) {
      console.error("❌ Error cargando datos del perfil:", err);
      if (emailEl) emailEl.textContent = session.user.email;
      if (nameEl) nameEl.textContent = "Error al cargar";
    }
  }

  await cargarDatosPerfil();

  // 2. Lógica del selector de voz por defecto (directo, no requiere contraseña)
  const voiceSelect = document.getElementById("profile-default-voice");
  const voiceSuccess = document.getElementById("voice-update-success");
  const voiceError = document.getElementById("voice-update-error");

  if (voiceSelect) {
    try {
      // Cargar voces del catálogo
      const listaVoces = await cargarVoces();
      
      // Limpiar y poblar selector
      voiceSelect.innerHTML = `<option value="">Ninguna (Primera voz disponible)</option>`;
      listaVoces.forEach(v => {
        const opt = document.createElement("option");
        opt.value = v.id;
        opt.textContent = v.voice_name;
        voiceSelect.appendChild(opt);
      });

      // Seleccionar el valor actual
      if (profileData?.defauld_voice_id) {
        voiceSelect.value = profileData.defauld_voice_id;
      }

      // Guardar cambio de voz inmediatamente
      voiceSelect.addEventListener("change", async () => {
        voiceSuccess.classList.add("hidden");
        voiceError.classList.add("hidden");
        
        const selectedId = voiceSelect.value ? parseInt(voiceSelect.value, 10) : null;
        
        try {
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ defauld_voice_id: selectedId })
            .eq('id', session.user.id);

          if (updateError) throw updateError;

          // Actualizar estado en memoria principal
          const selectedVoiceObj = listaVoces.find(v => v.id === selectedId);
          const voiceName = selectedVoiceObj ? selectedVoiceObj.voice_name : null;
          setDefaultVoice(voiceName);

          voiceSuccess.classList.remove("hidden");
          setTimeout(() => {
            voiceSuccess.classList.add("hidden");
          }, 4000);
        } catch (err) {
          console.error("❌ Error guardando voz por defecto:", err);
          voiceError.textContent = "Error al guardar la preferencia: " + (err.message || err);
          voiceError.classList.remove("hidden");
        }
      });

    } catch (err) {
      console.error("❌ Error al inicializar selector de voces:", err);
      if (voiceSelect) {
        voiceSelect.innerHTML = `<option value="">Error al cargar voces</option>`;
      }
    }
  }

  // 3. Lógica del panel lateral de edición segura
  const lockedStateEl = document.getElementById("edit-state-locked");
  const btnUnlockEdit = document.getElementById("btn-unlock-edit");

  const verificationForm = document.getElementById("verification-form");
  const currentPasswordInput = document.getElementById("current-password");
  const verifyErrorMsg = document.getElementById("verify-error");
  const btnVerifySubmit = document.getElementById("btn-verify-submit");
  const btnVerifyCancel = document.getElementById("btn-verify-cancel");

  const editForm = document.getElementById("profile-edit-form");
  const editNameInput = document.getElementById("edit-name");
  const editEmailInput = document.getElementById("edit-email");
  const editNewPasswordInput = document.getElementById("edit-new-password");
  const editConfirmPasswordInput = document.getElementById("edit-confirm-password");
  const editErrorMsg = document.getElementById("edit-error");
  const editSuccessMsg = document.getElementById("edit-success");
  const btnEditSubmit = document.getElementById("btn-edit-submit");
  const btnEditCancel = document.getElementById("btn-edit-cancel");

  if (!lockedStateEl || !verificationForm || !editForm) return;

  // --- TRANSICIONES DE ESTADO ---
  
  // Abrir verificación
  btnUnlockEdit.addEventListener("click", () => {
    lockedStateEl.classList.add("hidden");
    verificationForm.classList.remove("hidden");
    currentPasswordInput.value = "";
    currentPasswordInput.focus();
    verifyErrorMsg.classList.add("hidden");
  });

  // Cancelar verificación
  btnVerifyCancel.addEventListener("click", () => {
    verificationForm.classList.add("hidden");
    lockedStateEl.classList.remove("hidden");
    verificationForm.reset();
    verifyErrorMsg.classList.add("hidden");
  });

  // Cancelar edición
  btnEditCancel.addEventListener("click", () => {
    editForm.classList.add("hidden");
    lockedStateEl.classList.remove("hidden");
    editForm.reset();
    editErrorMsg.classList.add("hidden");
    editSuccessMsg.classList.add("hidden");
  });

  // --- SUBMIT VERIFICACIÓN ---
  verificationForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    verifyErrorMsg.classList.add("hidden");

    const currentPassword = currentPasswordInput.value;

    // Mostrar estado cargando
    btnVerifySubmit.disabled = true;
    const verifySpinner = btnVerifySubmit.querySelector(".spinner");
    const verifyBtnText = btnVerifySubmit.querySelector(".btn-text");
    if (verifyBtnText) verifyBtnText.textContent = "Verificando...";
    if (verifySpinner) verifySpinner.classList.remove("hidden");

    try {
      // Re-autenticar al usuario para verificar la contraseña actual de forma aislada
      const { success, error: signInError } = await verificarPassword(
        session.user.email,
        currentPassword
      );

      if (!success) {
        throw new Error("Contraseña incorrecta. Inténtalo de nuevo.");
      }

      // Éxito: pasar a modo edición
      verificationForm.classList.add("hidden");
      editForm.classList.remove("hidden");
      
      // Rellenar campos de edición
      editNameInput.value = profileData?.name || "";
      editEmailInput.value = session.user.email;
      editNewPasswordInput.value = "";
      editConfirmPasswordInput.value = "";
      editNameInput.focus();

    } catch (err) {
      console.error("❌ Error de verificación:", err);
      verifyErrorMsg.textContent = err.message || "Error al verificar la contraseña.";
      verifyErrorMsg.classList.remove("hidden");
    } finally {
      btnVerifySubmit.disabled = false;
      if (verifyBtnText) verifyBtnText.textContent = "Verificar";
      if (verifySpinner) verifySpinner.classList.add("hidden");
    }
  });

  // --- SUBMIT EDICIÓN ---
  editForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    editErrorMsg.classList.add("hidden");
    editSuccessMsg.classList.add("hidden");

    const newName = editNameInput.value.trim();
    const newEmail = editEmailInput.value.trim();
    const newPassword = editNewPasswordInput.value;
    const confirmPassword = editConfirmPasswordInput.value;

    // Validar contraseñas si el usuario ingresó algo en la nueva contraseña
    if (newPassword || confirmPassword) {
      if (newPassword !== confirmPassword) {
        editErrorMsg.textContent = "Las nuevas contraseñas no coinciden.";
        editErrorMsg.classList.remove("hidden");
        return;
      }
      if (newPassword.length < 6) {
        editErrorMsg.textContent = "La nueva contraseña debe tener al menos 6 caracteres.";
        editErrorMsg.classList.remove("hidden");
        return;
      }
    }

    // Mostrar cargando
    btnEditSubmit.disabled = true;
    const editSpinner = btnEditSubmit.querySelector(".spinner");
    const editBtnText = btnEditSubmit.querySelector(".btn-text");
    if (editBtnText) editBtnText.textContent = "Guardando...";
    if (editSpinner) editSpinner.classList.remove("hidden");

    try {
      // 1. Guardar Nombre en profiles
      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({ name: newName })
        .eq('id', session.user.id);

      if (profileUpdateError) throw profileUpdateError;

      // 2. Evaluar cambios de correo o contraseña en Auth
      const authUpdates = {};
      let emailChanged = false;
      let passwordChanged = false;

      if (newEmail !== session.user.email) {
        authUpdates.email = newEmail;
        emailChanged = true;
      }

      if (newPassword) {
        authUpdates.password = newPassword;
        passwordChanged = true;
      }

      if (Object.keys(authUpdates).length > 0) {
        const { error: authUpdateError } = await supabase.auth.updateUser(authUpdates);
        if (authUpdateError) throw authUpdateError;
      }

      // Mensaje de éxito
      let msg = "Perfil actualizado con éxito.";
      if (emailChanged && passwordChanged) {
        msg = "Se ha enviado un email al correo nuevo, se requiere tu confirmación. Tu contraseña también ha sido actualizada; por favor, vuelve a iniciar sesión con tu nueva contraseña cuando confirmes el correo.";
      } else if (emailChanged) {
        msg = "Se ha enviado un email al correo nuevo, se requiere tu confirmación.";
      } else if (passwordChanged) {
        msg = "Contraseña actualizada con éxito. Iniciando sesión de nuevo...";
      }

      editSuccessMsg.textContent = msg;
      editSuccessMsg.classList.remove("hidden");
      editForm.reset();

      // Si cambió la contraseña, forzar cierre de sesión después de 3 segundos
      if (passwordChanged) {
        setTimeout(async () => {
          await supabase.auth.signOut();
          window.location.hash = '#/home';
        }, 3500);
      } else {
        // Si no se cambió la contraseña, recargar los datos en el perfil local y regresar al estado bloqueado
        await cargarDatosPerfil();
        setTimeout(() => {
          editForm.classList.add("hidden");
          lockedStateEl.classList.remove("hidden");
          editSuccessMsg.classList.add("hidden");
        }, 3000);
      }

    } catch (err) {
      console.error("❌ Error al guardar perfil:", err);
      editErrorMsg.textContent = err.message || "Ocurrió un error al guardar los cambios.";
      editErrorMsg.classList.remove("hidden");
    } finally {
      btnEditSubmit.disabled = false;
      if (editBtnText) editBtnText.textContent = "Guardar";
      if (editSpinner) editSpinner.classList.add("hidden");
    }
  });
}
