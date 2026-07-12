"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { FormEvent, useState } from "react";

import AuthLayout from "@/components/auth/AuthLayout";
import PasswordInput from "@/components/auth/PasswordInput";
import { apiClient, ApiError } from "@/lib/api-client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await apiClient<{ access_token: string, employee: any }>("/api/v1/auth/login", {
        data: { email, password },
      });
      
      localStorage.setItem("access_token", response.access_token);
      localStorage.setItem("employee", JSON.stringify(response.employee));
      
      router.push("/dashboard");
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="AssetFlow - Login">
      <form className="auth-form" onSubmit={handleSubmit}>
        {error && (
          <div className="mb-4 rounded bg-red-500/10 p-3 text-sm text-red-500 border border-red-500/20">
            {error}
          </div>
        )}
        <div className="form-group">
          <label htmlFor="email">Email Address</label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="Enter your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />
        </div>

        <PasswordInput
          id="password"
          name="password"
          label="Password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={loading}
        />

        <div className="forgot-password">
          <Link href="#">Forgot Password?</Link>
        </div>

        <button className="auth-button" type="submit" disabled={loading}>
          {loading ? "SIGNING IN..." : "SIGN IN"}
        </button>

        <div className="auth-switch">
          <span>New here?</span>
          <Link href="/signup">Create Account</Link>
        </div>
      </form>
    </AuthLayout>
  );
}