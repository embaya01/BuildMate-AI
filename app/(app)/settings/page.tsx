"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme, setTheme } = useTheme();
  const [copied, setCopied] = useState(false);

  const handleToggle = () => {
    toggleTheme();
  };

  const handleCopyId = async () => {
    if (!user?.uid) return;
    try {
      await navigator.clipboard.writeText(user.uid);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <section className="settings">
      <header className="page-header">
        <div>
          <h2>Settings</h2>
          <p>Control appearance and manage your ScopeSmart account.</p>
        </div>
      </header>

      <div className="panel">
        <header className="panel__header">
          <div>
            <h3>Appearance</h3>
            <p>Choose the color theme that works best for you.</p>
          </div>
        </header>
        <div className="panel__body settings__appearance">
          <div className="theme-toggle">
            <span>Theme</span>
            <div className="theme-toggle__options" role="group" aria-label="Theme selection">
              <label className={theme === "light" ? "theme-option theme-option--active" : "theme-option"}>
                <input type="radio" name="theme" value="light" checked={theme === "light"} onChange={() => setTheme("light")} />
                Light
              </label>
              <label className={theme === "dark" ? "theme-option theme-option--active" : "theme-option"}>
                <input type="radio" name="theme" value="dark" checked={theme === "dark"} onChange={() => setTheme("dark")} />
                Dark
              </label>
              <button type="button" className="button button--ghost" onClick={handleToggle}>
                Toggle theme
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="panel">
        <header className="panel__header">
          <div>
            <h3>Account</h3>
            <p>Review your profile details.</p>
          </div>
        </header>
        <div className="panel__body settings__account">
          <dl>
            <div>
              <dt>Name</dt>
              <dd>{user?.displayName ?? "ScopeSmart Pro"}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{user?.email ?? "Not available"}</dd>
            </div>
            <div>
              <dt>User ID</dt>
              <dd>
                <span>{user?.uid ?? "N/A"}</span>
                {user?.uid ? (
                  <button type="button" className="link-button" onClick={handleCopyId}>
                    {copied ? "Copied!" : "Copy"}
                  </button>
                ) : null}
              </dd>
            </div>
          </dl>
          <button type="button" className="button button--danger" onClick={signOut}>
            Sign out
          </button>
        </div>
      </div>
    </section>
  );
}
