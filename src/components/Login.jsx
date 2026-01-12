import React, { useEffect, useRef } from "react";
import { decodeJwt } from "../utils/auth.js";

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function Login({ onLogin, onToast }) {
  const buttonRef = useRef(null);

  useEffect(() => {
    if (!clientId) {
      onToast("Missing Google Client ID in .env");
      return;
    }

    let canceled = false;
    let attempts = 0;
    const maxAttempts = 25;
    const intervalMs = 200;

    const tryInitialize = () => {
      if (canceled) {
        return;
      }

      if (!window.google || !window.google.accounts || !window.google.accounts.id) {
        attempts += 1;
        if (attempts >= maxAttempts) {
          onToast("Google Identity Services failed to load.");
          return;
        }
        setTimeout(tryInitialize, intervalMs);
        return;
      }

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => {
          const payload = decodeJwt(response.credential);
          if (!payload || !payload.email) {
            onToast("Google sign-in failed: email not available.");
            return;
          }

          const displayName = payload.name || payload.given_name || "";
          onLogin({
            idToken: response.credential,
            email: payload.email,
            name: displayName
          });
        }
      });

      if (buttonRef.current) {
        window.google.accounts.id.renderButton(buttonRef.current, {
          type: "standard",
          theme: "filled_blue",
          size: "large",
          shape: "pill",
          text: "signin_with",
          width: 260
        });
      }
    };

    tryInitialize();

    return () => {
      canceled = true;
    };
  }, [onLogin, onToast]);

  return (
    <main className="login-screen">
      <div className="login-card">
        <div>
          <div className="brand-title">NT Woods Checklist</div>
          <p className="brand-subtitle">
            Sign in to view your pending tasks and mark them complete in real time.
          </p>
        </div>
        <div className="login-button-wrap" ref={buttonRef}></div>
      </div>
    </main>
  );
}
