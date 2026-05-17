import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { apiRequest, getAssetUrl } from "../utils/api";

export default function ProfileSetup() {
  const navigate = useNavigate();
  const { token, user, updateCurrentUser } = useAuth();
  const [username, setUsername] = useState(user?.username || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [avatarFile, setAvatarFile] = useState(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const previewUrl = useMemo(() => {
    if (avatarFile) {
      return URL.createObjectURL(avatarFile);
    }

    return user?.avatarUrl ? getAssetUrl(user.avatarUrl) : "";
  }, [avatarFile, user?.avatarUrl]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("username", username);
      formData.append("bio", bio);

      if (avatarFile) {
        formData.append("avatar", avatarFile);
      }

      const payload = await apiRequest("/profiles/me", {
        method: "PUT",
        body: formData,
        token,
      });

      updateCurrentUser(payload.profile);
      navigate("/feed", { replace: true });
    } catch (caughtError) {
      setError(caughtError.message || "Unable to save profile.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card auth-card--wide">
        <p className="eyebrow">Profile setup</p>
        <h1>Build your social identity</h1>
        <p className="auth-copy">
          Pick a username and optional avatar before you start posting. This is
          the conventional social layer that you can later anchor to blockchain.
        </p>

        <form className="stack" onSubmit={handleSubmit}>
          <label className="field">
            <span>Username</span>
            <input
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="shiro"
              required
            />
          </label>

          <label className="field">
            <span>Bio</span>
            <textarea
              rows={4}
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              placeholder="What should people know about your photo stream?"
            />
          </label>

          <label className="field">
            <span>Avatar</span>
            <input
              type="file"
              accept="image/*"
              onChange={(event) => setAvatarFile(event.target.files?.[0] || null)}
            />
          </label>

          {previewUrl ? (
            <img className="avatar-preview" src={previewUrl} alt="Avatar preview" />
          ) : null}

          <button className="primary-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving profile..." : "Finish setup"}
          </button>
        </form>

        {error ? <p className="error-text">{error}</p> : null}
      </div>
    </div>
  );
}
