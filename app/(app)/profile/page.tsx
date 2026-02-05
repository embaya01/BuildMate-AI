"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  updateProfile,
} from "firebase/auth";
import { useAuth } from "@/context/AuthContext";
import { getUserProfile, saveUserProfile } from "@/lib/firestoreHelpers";
import type { AreaUnit, UserProfile } from "@/lib/types";

const UNIT_OPTIONS: AreaUnit[] = ["sq ft", "sq m"];

const makeEmptyProfile = (email: string | null): UserProfile => ({
  fullName: "",
  companyName: "",
  email: email ?? "",
  phone: "",
  address: "",
  photoUrl: "",
  defaultPricePerSqFt: 0,
  defaultUnit: "sq ft",
});

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile>(() => makeEmptyProfile(user?.email ?? ""));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [passwordCurrent, setPasswordCurrent] = useState("");
  const [passwordNew, setPasswordNew] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [passwordStatus, setPasswordStatus] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaving, setPasswordSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      if (!user) { setLoading(false); return; }
      try {
        const stored = await getUserProfile(user.uid);
        if (!isMounted) return;
        const merged = {
          ...makeEmptyProfile(user.email ?? ""),
          ...stored,
          fullName: stored.fullName || user.displayName || "",
          email: stored.email || user.email || "",
        };
        setProfile(merged);
      } catch (err) {
        console.error(err);
        if (isMounted) setError("Could not load profile information.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    load();
    return () => { isMounted = false; };
  }, [user?.uid, user?.displayName, user?.email]);

  const handleProfileChange = <Field extends keyof UserProfile>(field: Field, value: UserProfile[Field]) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
    setError(null);
    setMessage(null);
  };

  const handleSaveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) { setError("You must be signed in to update your profile."); return; }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const payload: UserProfile = {
        ...profile,
        email: profile.email || user.email || "",
        defaultPricePerSqFt: Number(profile.defaultPricePerSqFt) || 0,
      };
      await saveUserProfile(user.uid, payload);
      if (payload.fullName && (payload.fullName !== user.displayName || payload.photoUrl !== user.photoURL)) {
        await updateProfile(user, { displayName: payload.fullName, photoURL: payload.photoUrl || undefined });
      }
      setMessage("Profile saved.");
    } catch (err) {
      console.error(err);
      setError("Could not save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const passwordResetDisabled = useMemo(() => {
    return passwordSaving || !passwordCurrent.trim() || !passwordNew || passwordNew !== passwordConfirm;
  }, [passwordSaving, passwordCurrent, passwordNew, passwordConfirm]);

  const handlePasswordChange = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || !user.email) { setPasswordError("Re-authentication required."); return; }
    if (passwordNew !== passwordConfirm) { setPasswordError("New passwords do not match."); return; }
    setPasswordSaving(true);
    setPasswordError(null);
    setPasswordStatus(null);
    try {
      const credential = EmailAuthProvider.credential(user.email, passwordCurrent);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, passwordNew);
      setPasswordCurrent("");
      setPasswordNew("");
      setPasswordConfirm("");
      setPasswordStatus("Password updated.");
    } catch (err: unknown) {
      console.error(err);
      const msg =
        err instanceof Error && "code" in err
          ? (err as { code: string }).code === "auth/weak-password"
            ? "Password should be at least 6 characters."
            : (err as { code: string }).code === "auth/wrong-password"
            ? "Current password is incorrect."
            : (err as { code: string }).code === "auth/requires-recent-login"
            ? "Recent sign-in required. Sign out and sign in again before changing password."
            : "Could not update password."
          : "Could not update password.";
      setPasswordError(msg);
    } finally {
      setPasswordSaving(false);
    }
  };

  if (loading) {
    return (
      <section className="profile">
        <div className="panel">
          <div className="panel__body">
            <div className="panel__placeholder">Loading profile...</div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="profile">
      <header className="page-header">
        <div>
          <h2>Profile</h2>
          <p>Manage your account details, defaults, and credentials.</p>
        </div>
      </header>

      <form className="panel profile__details" onSubmit={handleSaveProfile}>
        <header className="panel__header">
          <div>
            <h3>Contact information</h3>
            <p>Update the details used on your estimates.</p>
          </div>
        </header>
        <div className="panel__body profile__grid">
          {error ? <div className="form-error">{error}</div> : null}
          {message ? <div className="form-message">{message}</div> : null}
          <label className="field">
            <span>Full name</span>
            <input className="input" value={profile.fullName} onChange={(e) => handleProfileChange("fullName", e.target.value)} placeholder="Jordan Smith" />
          </label>
          <label className="field">
            <span>Company name</span>
            <input className="input" value={profile.companyName} onChange={(e) => handleProfileChange("companyName", e.target.value)} placeholder="ScopeSmart Builders" />
          </label>
          <label className="field">
            <span>Email</span>
            <input className="input" value={profile.email} readOnly />
          </label>
          <label className="field">
            <span>Phone</span>
            <input className="input" value={profile.phone} onChange={(e) => handleProfileChange("phone", e.target.value)} placeholder="(555) 123-4567" />
          </label>
          <label className="field field--full">
            <span>Address</span>
            <textarea className="textarea" rows={3} value={profile.address} onChange={(e) => handleProfileChange("address", e.target.value)} placeholder="123 Main St, Seattle, WA" />
          </label>
          <label className="field">
            <span>Profile photo URL</span>
            <input className="input" value={profile.photoUrl} onChange={(e) => handleProfileChange("photoUrl", e.target.value)} placeholder="https://example.com/photo.jpg" />
          </label>
          {profile.photoUrl ? (
            <div className="profile__photo-preview">
              <img src={profile.photoUrl} alt="Profile preview" />
            </div>
          ) : null}
        </div>
        <div className="panel__body profile__defaults">
          <h4>Estimator defaults</h4>
          <div className="profile__defaults-grid">
            <label className="field">
              <span>Default price per sq unit</span>
              <input className="input align-right" type="number" min={0} step={0.25} value={profile.defaultPricePerSqFt} onChange={(e) => handleProfileChange("defaultPricePerSqFt", Number(e.target.value) || 0)} />
            </label>
            <label className="field">
              <span>Default unit</span>
              <select className="input" value={profile.defaultUnit} onChange={(e) => handleProfileChange("defaultUnit", e.target.value as AreaUnit)}>
                {UNIT_OPTIONS.map((unit) => (
                  <option key={unit} value={unit}>{unit}</option>
                ))}
              </select>
            </label>
          </div>
        </div>
        <footer className="panel__footer">
          <button className="button" type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save profile"}
          </button>
        </footer>
      </form>

      <form className="panel profile__password" onSubmit={handlePasswordChange}>
        <header className="panel__header">
          <div>
            <h3>Password</h3>
            <p>Update your password for a more secure account.</p>
          </div>
        </header>
        <div className="panel__body profile__password-grid">
          {passwordError ? <div className="form-error">{passwordError}</div> : null}
          {passwordStatus ? <div className="form-message">{passwordStatus}</div> : null}
          <label className="field">
            <span>Current password</span>
            <input className="input" type="password" value={passwordCurrent} onChange={(e) => setPasswordCurrent(e.target.value)} required />
          </label>
          <label className="field">
            <span>New password</span>
            <input className="input" type="password" value={passwordNew} onChange={(e) => setPasswordNew(e.target.value)} required />
          </label>
          <label className="field">
            <span>Confirm new password</span>
            <input className="input" type="password" value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} required />
          </label>
        </div>
        <footer className="panel__footer">
          <button className="button" type="submit" disabled={passwordResetDisabled}>
            {passwordSaving ? "Updating..." : "Change password"}
          </button>
        </footer>
      </form>
    </section>
  );
}
