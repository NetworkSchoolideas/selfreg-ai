"use client";

import { useState } from "react";
import { signInWithEmail, signUpWithEmail } from "@/lib/supabase-auth";

interface EmailAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: "ru" | "en";
}

export function EmailAuthModal({ isOpen, onClose, lang }: EmailAuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      if (isLogin) {
        const { error } = await signInWithEmail(email, password);
        if (error) throw error;
        setSuccess(lang === "en" ? "Successfully signed in!" : "Успешный вход!");
      } else {
        const { error } = await signUpWithEmail(email, password, fullName || undefined);
        if (error) throw error;
        setSuccess(lang === "en" 
          ? "Account created! Check your email for verification." 
          : "Аккаунт создан! Проверьте email для подтверждения.");
      }
      
      // Close modal after success
      setTimeout(() => {
        onClose();
        setEmail("");
        setPassword("");
        setFullName("");
      }, 1500);
    } catch (err: any) {
      setError(err.message || (lang === "en" ? "Authentication failed" : "Ошибка аутентификации"));
    } finally {
      setIsLoading(false);
    }
  };

  const ui = {
    title: isLogin 
      ? (lang === "en" ? "Sign in" : "Вход")
      : (lang === "en" ? "Create account" : "Регистрация"),
    email: lang === "en" ? "Email" : "Email",
    emailPlaceholder: lang === "en" ? "you@example.com" : "you@example.com",
    password: lang === "en" ? "Password" : "Пароль",
    passwordPlaceholder: lang === "en" ? "Min. 6 characters" : "Мин. 6 символов",
    fullName: lang === "en" ? "Full name (optional)" : "ФИО (необязательно)",
    fullNamePlaceholder: lang === "en" ? "Ivan Ivanov" : "Иван Иванов",
    submit: isLogin 
      ? (lang === "en" ? "Sign in" : "Войти")
      : (lang === "en" ? "Create account" : "Создать аккаунт"),
    loading: lang === "en" ? "Processing..." : "Обработка...",
    switchToLogin: lang === "en" ? "Already have an account? Sign in" : "Уже есть аккаунт? Войти",
    switchToSignup: lang === "en" ? "Don't have an account? Sign up" : "Нет аккаунта? Зарегистрироваться",
    close: lang === "en" ? "Close" : "Закрыть",
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "white",
          borderRadius: 12,
          padding: 24,
          width: "100%",
          maxWidth: 400,
          maxHeight: "90vh",
          overflow: "auto",
          position: "relative",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            background: "transparent",
            border: "none",
            fontSize: 24,
            cursor: "pointer",
            color: "var(--muted)",
          }}
        >
          ×
        </button>

        <h2 style={{ margin: "0 0 16px 0", fontSize: 20 }}>{ui.title}</h2>

        {/* Success message */}
        {success && (
          <div style={{ background: "#d4edda", border: "1px solid #c3e6cb", borderRadius: 6, padding: "8px 12px", marginBottom: 16, fontSize: 13, color: "#155724" }}>
            {success}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div style={{ background: "#f8d7da", border: "1px solid #f5c6cb", borderRadius: 6, padding: "8px 12px", marginBottom: 16, fontSize: 13, color: "#721c24" }}>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", marginBottom: 6, fontSize: 14, fontWeight: 500 }}>
                {ui.fullName}
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={ui.fullNamePlaceholder}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: 6,
                  border: "1px solid var(--line)",
                  fontSize: 14,
                  boxSizing: "border-box",
                }}
              />
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 6, fontSize: 14, fontWeight: 500 }}>
              {ui.email}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={ui.emailPlaceholder}
              required
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: 6,
                border: "1px solid var(--line)",
                fontSize: 14,
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", marginBottom: 6, fontSize: 14, fontWeight: 500 }}>
              {ui.password}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={ui.passwordPlaceholder}
              minLength={6}
              required
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: 6,
                border: "1px solid var(--line)",
                fontSize: 14,
                boxSizing: "border-box",
              }}
            />
          </div>

          <button
            type="submit"
            className="button"
            disabled={isLoading}
            style={{ width: "100%", padding: "10px", fontSize: 14 }}
          >
            {isLoading ? ui.loading : ui.submit}
          </button>
        </form>

        {/* Switch mode */}
        <div style={{ marginTop: 16, textAlign: "center", fontSize: 13 }}>
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
              setSuccess(null);
            }}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--accent)",
              cursor: "pointer",
              fontSize: 13,
              textDecoration: "underline",
            }}
          >
            {isLogin ? ui.switchToSignup : ui.switchToLogin}
          </button>
        </div>
      </div>
    </div>
  );
}
