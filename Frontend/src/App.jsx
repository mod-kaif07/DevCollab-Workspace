import React from "react";
import AppRoutes from "./routes/AppRoutes";
import { UserProvider } from "./context/UserContext";
const App = () => {
  return (
    <div className="min-h-screen bg-gray-100">
      <UserProvider>
        <AppRoutes />
      </UserProvider>
    </div>
  );
};

export default App;
