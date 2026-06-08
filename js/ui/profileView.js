import supabase from "../config/supabase.js";

export function initProfileView(session, role) {
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
