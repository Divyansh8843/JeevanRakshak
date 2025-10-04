import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

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
          await fetch("/api/auth/google", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              googleId: decoded.sub,
              name: decoded.name,
              email: decoded.email,
              picture: decoded.picture,
            }),
          });
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
