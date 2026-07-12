"use client";

import Link from "next/link";
import { FormEvent } from "react";

import AuthLayout from "@/components/auth/AuthLayout";
import PasswordInput from "@/components/auth/PasswordInput";

export default function SignupPage() {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    console.log("Create account submitted");
  };

  return (
    <AuthLayout title="AssetFlow - Create Account">
      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="fullName">Full Name</label>

          <input
            id="fullName"
            name="fullName"
            type="text"
            placeholder="Enter your full name"
            required
          />
        </div>

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
          placeholder="Create a password"
        />

        <PasswordInput
          id="confirmPassword"
          name="confirmPassword"
          label="Confirm Password"
          placeholder="Confirm your password"
        />

        <button className="auth-button" type="submit">
          CREATE ACCOUNT
        </button>

        <div className="auth-switch">
          <span>Already have an account?</span>

          <Link href="/login">Sign In</Link>
        </div>
      </form>
    </AuthLayout>
  );
}