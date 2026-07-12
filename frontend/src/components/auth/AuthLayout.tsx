import { ReactNode } from "react";

interface AuthLayoutProps {
  title: string;
  children: ReactNode;
}

export default function AuthLayout({
  title,
  children,
}: AuthLayoutProps) {
  return (
    <main className="auth-page">
      <section className="auth-brand-panel">
        <div className="brand-content">
          <div className="brand-logo">AF</div>

          <h1>AssetFlow</h1>

          <p>Enterprise Asset & Resource Management System</p>

          <div className="brand-divider" />

          <span>Track. Allocate. Maintain. Audit.</span>
        </div>
      </section>

      <section className="auth-form-panel">
        <div className="auth-form-container">
          <h2 className="auth-title">{title}</h2>

          <div className="mobile-brand">
            <div className="brand-logo">AF</div>
            <h1>AssetFlow</h1>
          </div>

          {children}
        </div>
      </section>
    </main>
  );
}