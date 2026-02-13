import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { setAuthToken } from "../lib/auth";

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

const Login = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => {
      window.google?.accounts?.id?.initialize({
        client_id: clientId,
        callback: async (credentialResponse) => {
          const decoded = jwtDecode(credentialResponse.credential);
          // Send user info to backend
          const res = await fetch("/api/auth/google", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id_token: credentialResponse.credential,
            }),
          });
          const data = await res.json();
          if (data.token) {
            setAuthToken(data.token);
          }
          // Redirect to profile page
          navigate("/profile");
        },
        auto_select: true,
        cancel_on_tap_outside: false,
        ux_mode: "popup",
      });
      window.google.accounts.id.prompt();
    };
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, [navigate]);

  return null;
};

export default Login;
