// frontend/src/hooks/useAuth.js
import { jwtDecode } from "jwt-decode";

const useAuth = () => {
  const token = localStorage.getItem("token");
  let user = null;

  if (token) {
    try {
      const decodedToken = jwtDecode(token);

      // --- NOSSO ESPIÃO ---
      // Esta linha vai nos mostrar o conteúdo do token no console do navegador.
      console.log("TOKEN DECODIFICADO DENTRO DO useAuth:", decodedToken);
      // --------------------

      user = decodedToken;
    } catch (error) {
      console.error("Token inválido:", error);
      localStorage.removeItem("token");
    }
  }

  return { user };
};

export default useAuth;
