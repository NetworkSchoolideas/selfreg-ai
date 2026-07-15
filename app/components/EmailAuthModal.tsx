"use client";

import { useState } from "react";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth-config";
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
  const [showPassword, setShowPassword] = useState(false);
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
    passwordPlaceholder: isLogin
      ? (lang === "en" ? "Enter your password" : "Введите пароль")
      : (lang === "en" ? "At least 8 characters" : "Минимум 8 символов"),
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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Close button */}
        <button onClick={onClose} className="modal-close">
          ×
        </button>

        <h2 className="m-0 mb-16 fs-20">{ui.title}</h2>

        {/* Success message */}
        {success && (
          <div className="success-box-sm">
            {success}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="error-box-sm">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="modal-form-group">
              <label className="modal-form-label">
                {ui.fullName}
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={ui.fullNamePlaceholder}
                className="modal-form-input"
              />
            </div>
          )}

          <div className="modal-form-group">
            <label className="modal-form-label">
              {ui.email}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={ui.emailPlaceholder}
              required
              className="modal-form-input"
            />
          </div>

          <div className="modal-form-group" style={{ marginBottom: 20 }}>
            <label className="modal-form-label">
              {ui.password}
            </label>
            <div className="password-input-row">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={ui.passwordPlaceholder}
                minLength={isLogin ? undefined : MIN_PASSWORD_LENGTH}
                required
                className="modal-form-input"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={
                  showPassword
                    ? lang === "en" ? "Hide password" : "Скрыть пароль"
                    : lang === "en" ? "Show password" : "Показать пароль"
                }
              >
                {showPassword ? (lang === "en" ? "Hide" : "Скрыть") : (lang === "en" ? "Show" : "Показать")}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="button w-full"
            disabled={isLoading}
            style={{ padding: "10px", fontSize: 14 }}
          >
            {isLoading ? ui.loading : ui.submit}
          </button>
        </form>

        {/* Switch mode */}
        <div className="mt-16 text-center fs-13">
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
              setSuccess(null);
            }}
            className="switch-mode-btn"
          >
            {isLogin ? ui.switchToSignup : ui.switchToLogin}
          </button>
        </div>
      </div>
    </div>
  );
}
