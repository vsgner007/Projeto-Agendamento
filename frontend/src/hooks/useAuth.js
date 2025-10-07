import { useMemo } from "react";
import { jwtDecode } from "jwt-decode";

const useAuth = () => {
  const token = localStorage.getItem("token");

  // useMemo "memoriza" o resultado. O código aqui dentro só será
  // executado novamente se o 'token' mudar.
  const user = useMemo(() => {
    if (!token) {
      return null;
    }
    try {
      // Decodifica o token para ler os dados do payload
      return jwtDecode(token);
    } catch (error) {
      console.error("Token inválido:", error);
      localStorage.removeItem("token"); // Limpa o token inválido
      return null;
    }
  }, [token]);

  return { user };
};

export default useAuth;
