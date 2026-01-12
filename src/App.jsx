import React, { useCallback, useState } from "react";
import Login from "./components/Login.jsx";
import TaskDashboard from "./components/TaskDashboard.jsx";
import Toast from "./components/Toast.jsx";
import { clearStoredAuth, getStoredAuth, storeAuth } from "./utils/auth.js";

const initialAuth = getStoredAuth();

export default function App() {
  const [auth, setAuth] = useState(initialAuth);
  const [toast, setToast] = useState("");

  const handleLogin = useCallback((payload) => {
    storeAuth(payload);
    setAuth(payload);
  }, []);

  const handleLogout = useCallback(() => {
    clearStoredAuth();
    setAuth(null);
  }, []);

  return (
    <div className="app-shell">
      {auth ? (
        <TaskDashboard
          auth={auth}
          onLogout={handleLogout}
          onToast={setToast}
        />
      ) : (
        <Login onLogin={handleLogin} onToast={setToast} />
      )}
      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}
