// components/LogoutButton.jsx

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCurrentUser } from "../api/auth";

export default function LogoutButton() {
  const { logout } = useCurrentUser();
  const navigate = useNavigate();
  const [working, setWorking] = useState(false);

  async function handleClick() {
    setWorking(true);
    try {
      await logout();
    } finally {
      navigate("/login", { replace: true });
    }
  }

  return (
    <button onClick={handleClick} disabled={working}>
      {working ? "Logging out…" : "Log out"}
    </button>
  );
}

