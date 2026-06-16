import supabase from "../config/supabase.js";
import { cargarVoces } from "../services/hymnService.js";
import { setDefaultVoice } from "../main.js";

export async function initProfileView(session, role) {
  if (!session) return;

  // Poblar datos del usuario
  const emailEl = document.getElementById("profile-email");
  const roleEl = document.getElementById("profile-role-badge");
  const avatarEl = document.getElementById("profile-avatar-initial");

  if (emailEl) emailEl.textContent = session.user.email;
  if (avatarEl) avatarEl.textContent = session.user.email.charAt(0).toUpperCase();

  if (roleEl) {
    let roleText = 'Miembro';
    if (role === 'admin') roleText = 'Administrador';
    if (role === 'special') roleText = 'Usuario Especial';
    roleEl.textContent = roleText;
  }

  // Lógica del selector de voz por defecto
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

      // Consultar la voz por defecto actual del usuario
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('defauld_voice_id')
        .eq('id', session.user.id)
        .single();

      if (!profileError && profileData?.defauld_voice_id) {
        voiceSelect.value = profileData.defauld_voice_id;
      }

      // Guardar cambio
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

  // Lógica de cambio de contraseña
  const form = document.getElementById("password-change-form");
  const newPasswordInput = document.getElementById("new-password");
  const confirmPasswordInput = document.getElementById("confirm-password");
  const errorMsg = document.getElementById("password-error");
  const successMsg = document.getElementById("password-success");
  const submitBtn = document.getElementById("btn-password-submit");
  const btnText = submitBtn?.querySelector(".btn-text");
  const spinner = submitBtn?.querySelector(".spinner");

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    errorMsg.classList.add("hidden");
    successMsg.classList.add("hidden");

    if (newPassword !== confirmPassword) {
      errorMsg.textContent = "Las contraseñas no coinciden.";
      errorMsg.classList.remove("hidden");
      return;
    }

    if (newPassword.length < 6) {
      errorMsg.textContent = "La contraseña debe tener al menos 6 caracteres.";
      errorMsg.classList.remove("hidden");
      return;
    }

    // Mostrar cargando
    submitBtn.disabled = true;
    if (btnText) btnText.textContent = "Actualizando...";
    if (spinner) spinner.classList.remove("hidden");

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      successMsg.textContent = "Contraseña actualizada con éxito. Por favor, inicia sesión nuevamente.";
      successMsg.classList.remove("hidden");
      form.reset();

      // Forzar cierre de sesión después de 3 segundos
      setTimeout(async () => {
        await supabase.auth.signOut();
        window.location.hash = '#/home';
      }, 3000);

    } catch (error) {
      console.error("❌ Error al actualizar contraseña:", error);
      errorMsg.textContent = error.message || "Ocurrió un error al actualizar la contraseña.";
      errorMsg.classList.remove("hidden");
    } finally {
      submitBtn.disabled = false;
      if (btnText) btnText.textContent = "Actualizar Contraseña";
      if (spinner) spinner.classList.add("hidden");
    }
  });
}
