"use client";

import { useState } from "react";

interface PasswordInputProps {
  id: string;
  label: string;
  name: string;
  placeholder?: string;
}

export default function PasswordInput({
  id,
  label,
  name,
  placeholder,
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="form-group">
      <label htmlFor={id}>{label}</label>

      <div className="password-wrapper">
        <input
          id={id}
          name={name}
          type={showPassword ? "text" : "password"}
          placeholder={placeholder}
          required
        />

        <button
          type="button"
          className="password-toggle"
          onClick={() => setShowPassword(!showPassword)}
          aria-label={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? "◉" : "◎"}
        </button>
      </div>
    </div>
  );
}