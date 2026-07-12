"use client";

import { useRouter } from "next/navigation";



import Link from "next/link";
import { FormEvent } from "react";

import AuthLayout from "@/components/auth/AuthLayout";
import PasswordInput from "@/components/auth/PasswordInput";

export default function LoginPage() {
  const router = useRouter();
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
  event.preventDefault();

  router.push("/dashboard");
};
  /* const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    console.log("Login submitted");
  }; */

  return (
    <AuthLayout title="AssetFlow - Login">
      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">Email Address</label>

          <input
            id="email"
            name="email"
            type="email"
            placeholder="Enter your email address"
            required
          />
        </div>

        <PasswordInput
          id="password"
          name="password"
          label="Password"
          placeholder="Enter your password"
        />

        <div className="forgot-password">
          <Link href="#">Forgot Password?</Link>
        </div>

        <button className="auth-button" type="submit">
          SIGN IN
        </button>

        <div className="auth-switch">
          <span>New here?</span>

          <Link href="/signup">Create Account</Link>
        </div>
      </form>
    </AuthLayout>
  );
}