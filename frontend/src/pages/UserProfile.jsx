import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { apiRequest, getAssetUrl } from "../utils/api";
import PostPager from "../components/PostPager";

const MILESTONE_ICONS = {
  0: "🤝",
  1: "📸",
  2: "🔥",
  3: "🎉",
  4: "💯",
  5: "🎂",
};

/* ── Achievement Showcase component ── */
function AchievementShowcase({ achievements, profileUsername }) {
  const { milestones = [], collectibles = [], totalCount = 0 } = achievements || {};

  if (totalCount === 0) {
    return (
      <div className="achievement-showcase">
        <div className="achievement-showcase__empty">
          <p style={{ fontSize: "2.4rem" }}>🏆</p>
          <h3>No achievements yet</h3>
          <p>Verify posts, mint NFTs, and earn friendship milestones to build your showcase!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="achievement-showcase">
      {/* Milestones section */}
      {milestones.length > 0 && (
        <section className="achievement-section">
          <h3 className="achievement-section__title">
            <span>🏅</span> Friendship Milestones
          </h3>
          <div className="achievement-grid">
            {milestones.map((m, i) => (
              <div className="achievement-tile achievement-tile--milestone" key={`m-${i}`}>
                <div className="achievement-tile__icon">
                  {MILESTONE_ICONS[m.milestoneType] || "🏅"}
                </div>
                <div className="achievement-tile__body">
                  <strong>{m.label}</strong>
                  <span className="achievement-tile__friend">with @{m.friendName}</span>
                </div>
                {m.explorerUrl ? (
                  <a
                    className="achievement-tile__link"
                    href={m.explorerUrl}
                    target="_blank"
                    rel="noreferrer"
                    title="View on Etherscan"
                  >
                    ↗
                  </a>
                ) : null}
                {m.tokenId && (
                  <span className="achievement-tile__token">#{m.tokenId}</span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Collectible NFTs section */}
      {collectibles.length > 0 && (
        <section className="achievement-section">
          <h3 className="achievement-section__title">
            <span>💎</span> Collectible Moments
          </h3>
          <div className="achievement-nft-grid">
            {collectibles.map((c) => (
              <div className="achievement-nft-card" key={c.postId}>
                <div className="achievement-nft-card__image-wrap">
                  <img
                    className="achievement-nft-card__image"
                    src={getAssetUrl(c.imageUrl)}
                    alt={c.caption || "NFT"}
                  />
                  <span className="achievement-nft-card__badge">#{c.tokenId}</span>
                </div>
                <div className="achievement-nft-card__info">
                  <p className="achievement-nft-card__caption">
                    {c.caption || "Untitled moment"}
                  </p>
                  {c.explorerUrl ? (
                    <a
                      className="achievement-nft-card__link"
                      href={c.explorerUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View tx ↗
                    </a>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default function UserProfile() {
  const { userId } = useParams();
  const { token, user, updateCurrentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // View mode: "posts" or "achievements"
  const [viewMode, setViewMode] = useState("posts");

  // Achievements
  const [achievements, setAchievements] = useState(null);
  const [loadingAchievements, setLoadingAchievements] = useState(false);

  // Milestones (claim sheet)
  const [showMilestoneSheet, setShowMilestoneSheet] = useState(false);
  const [milestones, setMilestones] = useState([]);
  const [loadingMilestones, setLoadingMilestones] = useState(false);
  const [claimingType, setClaimingType] = useState(null);

  const loadProfile = async () => {
    setError("");
    setIsLoading(true);
    try {
      const [profilePayload, postsPayload] = await Promise.all([
        apiRequest(`/profiles/${userId}`, { token }),
        apiRequest(`/posts/user/${userId}`, { token }),
      ]);
      setProfile(profilePayload.profile);
      setPosts(postsPayload.posts);
    } catch (e) {
      setError(e.message || "Unable to load this profile.");
    } finally {
      setIsLoading(false);
    }
  };

  const loadAchievements = async () => {
    setLoadingAchievements(true);
    try {
      const payload = await apiRequest(`/profiles/${userId}/achievements`, { token });
      setAchievements(payload.achievements);
    } catch (e) {
      setError(e.message || "Unable to load achievements.");
    } finally {
      setLoadingAchievements(false);
    }
  };

  useEffect(() => {
    loadProfile();
    setViewMode("posts");
    setAchievements(null);
  }, [userId]);

  // Load achievements when tab switches
  useEffect(() => {
    if (viewMode === "achievements" && !achievements) {
      loadAchievements();
    }
  }, [viewMode]);

  const handleFriendToggle = async () => {
    if (!profile) return;
    try {
      if (profile.isFriend) {
        await apiRequest(`/profiles/${userId}/friend`, { method: "DELETE", token });
        setProfile((p) => ({ ...p, isFriend: false, friendCount: Math.max(Number(p.friendCount || 1) - 1, 0) }));
        updateCurrentUser({ ...user, friendCount: Math.max(Number(user?.friendCount || 1) - 1, 0) });
      } else {
        await apiRequest(`/profiles/${userId}/friend`, { method: "POST", token });
        setProfile((p) => ({ ...p, isFriend: true, friendCount: Number(p.friendCount || 0) + 1 }));
        updateCurrentUser({ ...user, friendCount: Number(user?.friendCount || 0) + 1 });
      }
    } catch (e) {
      setError(e.message || "Unable to update friend state.");
    }
  };

  const handleAddFriend = async (targetId) => {
    try {
      await apiRequest(`/profiles/${targetId}/friend`, { method: "POST", token });
      updateCurrentUser({ ...user, friendCount: Number(user?.friendCount || 0) + 1 });
      await loadProfile();
    } catch (e) {
      setError(e.message || "Unable to add friend.");
    }
  };

  // Load milestones (claim sheet)
  const loadMilestones = async () => {
    setLoadingMilestones(true);
    try {
      const payload = await apiRequest(`/milestones/${userId}`, { token });
      setMilestones(payload.milestones || []);
    } catch (e) {
      setError(e.message || "Unable to load milestones.");
    } finally {
      setLoadingMilestones(false);
    }
  };

  const handleOpenMilestones = () => {
    setShowMilestoneSheet(true);
    loadMilestones();
  };

  const handleClaimMilestone = async (milestoneType) => {
    try {
      setClaimingType(milestoneType);
      setError("");
      await apiRequest(`/milestones/${userId}/claim`, {
        method: "POST",
        body: { milestoneType },
        token,
      });
      await loadMilestones();
      // Also refresh achievements if already loaded
      if (achievements) loadAchievements();
    } catch (e) {
      setError(e.message || "Unable to claim milestone.");
    } finally {
      setClaimingType(null);
    }
  };

  const isOwnProfile = Number(user?.id) === Number(userId);
  const isFriend = profile?.isFriend;
  const achievementCount = achievements?.totalCount || 0;

  return (
    <div className="mobile-stage">
      <div className="phone-shell phone-shell--feed">

        {/* ── Overlay status bar ── */}
        <div className="phone-statusbar phone-statusbar--overlay">
          <span>4:30</span>
        </div>

        {/* ── Overlay toolbar ── */}
        <header className="phone-toolbar phone-toolbar--overlay">
          <Link className="round-icon-button" to="/feed" aria-label="Back to feed">←</Link>

          <div className="toolbar-pill toolbar-pill--static">
            {profile ? `@${profile.username}` : "Profile"}
          </div>

          {!isOwnProfile ? (
            <button
              className={`round-icon-button ${profile?.isFriend ? "round-icon-button--active" : ""}`}
              onClick={handleFriendToggle}
              type="button"
              aria-label="Toggle friend"
            >
              {profile?.isFriend ? "✓" : "+"}
            </button>
          ) : (
            <div className="round-icon-button round-icon-button--ghost" />
          )}
        </header>

        {error && <p className="error-text error-text--floating locket-pager__error">{error}</p>}

        {/* ── Tab switcher: Posts / Achievements ── */}
        {!isLoading && (
          <div className="profile-tab-bar">
            <button
              className={`profile-tab ${viewMode === "posts" ? "profile-tab--active" : ""}`}
              onClick={() => setViewMode("posts")}
              type="button"
            >
              📷 Posts {posts.length > 0 ? `(${posts.length})` : ""}
            </button>
            <button
              className={`profile-tab ${viewMode === "achievements" ? "profile-tab--active" : ""}`}
              onClick={() => setViewMode("achievements")}
              type="button"
            >
              🏆 Achievements {achievementCount > 0 ? `(${achievementCount})` : ""}
            </button>
          </div>
        )}

        {/* ── Content area ── */}
        {isLoading ? (
          <div className="empty-phone-state"><h2>Loading…</h2></div>
        ) : viewMode === "posts" ? (
          /* Posts view */
          posts.length === 0 ? (
            <div className="empty-phone-state">
              <p style={{ fontSize: "2rem" }}>📷</p>
              <h2>No moments yet</h2>
              <p>{isOwnProfile ? "Upload your first moment." : "This friend hasn't posted yet."}</p>
            </div>
          ) : (
            <PostPager
              posts={posts}
              currentUserId={user?.id}
              onAddFriend={handleAddFriend}
              onReloadFeed={loadProfile}
            />
          )
        ) : (
          /* Achievements view */
          <main className="locket-pager" style={{ overflow: "auto" }}>
            {loadingAchievements ? (
              <div className="empty-phone-state"><h2>Loading achievements…</h2></div>
            ) : (
              <AchievementShowcase
                achievements={achievements}
                profileUsername={profile?.username}
              />
            )}
          </main>
        )}

        {/* ── Bottom dock ── */}
        <footer className="bottom-dock">
          <div className="dock-button" />
          {/* Milestone button — only for friends (not own profile) */}
          {!isOwnProfile && isFriend ? (
            <button
              className="camera-button camera-button--milestone"
              onClick={handleOpenMilestones}
              type="button"
              aria-label="Milestones"
            >
              <span>🏆</span>
            </button>
          ) : (
            <div className="camera-button camera-button--ghost" />
          )}
          <div className="dock-button" />
        </footer>

        {/* ── Milestones Bottom Sheet ── */}
        <div className={`bottom-sheet ${showMilestoneSheet ? "bottom-sheet--open" : ""}`}>
          <div className="bottom-sheet__header">
            <div>
              <p className="eyebrow eyebrow--light">Friendship</p>
              <h2>Milestones with @{profile?.username}</h2>
            </div>
            <button
              className="round-icon-button round-icon-button--small"
              onClick={() => setShowMilestoneSheet(false)}
              type="button"
            >
              ×
            </button>
          </div>

          {loadingMilestones ? (
            <div className="sheet-empty"><p>Loading milestones…</p></div>
          ) : milestones.length === 0 ? (
            <div className="sheet-empty"><p>No milestones available yet.</p></div>
          ) : (
            <div className="milestone-list">
              {milestones.map((m) => (
                <div
                  className={`milestone-card ${m.claimed ? "milestone-card--claimed" : ""} ${m.eligible && !m.claimed ? "milestone-card--eligible" : ""}`}
                  key={m.type}
                >
                  <div className="milestone-card__icon">
                    {MILESTONE_ICONS[m.type] || "🏅"}
                  </div>
                  <div className="milestone-card__info">
                    <strong>{m.label}</strong>
                    <p>{m.description}</p>
                    {m.claimed && m.onChain?.explorerUrl ? (
                      <a
                        className="milestone-card__link"
                        href={m.onChain.explorerUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View on Etherscan ↗
                      </a>
                    ) : null}
                  </div>
                  <div className="milestone-card__action">
                    {m.claimed ? (
                      <span className="milestone-badge milestone-badge--claimed">
                        ✓ Claimed
                      </span>
                    ) : m.eligible ? (
                      <button
                        className="milestone-claim-btn"
                        disabled={claimingType === m.type}
                        onClick={() => handleClaimMilestone(m.type)}
                        type="button"
                      >
                        {claimingType === m.type ? "Minting…" : "Claim"}
                      </button>
                    ) : (
                      <span className="milestone-badge milestone-badge--locked">
                        🔒
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
