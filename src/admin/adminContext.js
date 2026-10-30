import { createContext, useContext } from "react";

export const AdminContext = createContext(null);

export const useAdmin = () => {
  const value = useContext(AdminContext);
  if (!value) throw new Error("useAdmin must be used inside <AdminStore>");
  return value;
};
