import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { apiRequest, getAssetUrl } from "../utils/api";
import { InboxSheet, MessageThreadSheet } from "../components/MessageSheets";

const REACTION_OPTIONS = [
  { key: "joy", icon: "\u{1F923}" },
  { key: "love", icon: "\u{1F60D}" },
  { key: "yellow_heart", icon: "\u{1F49B}" },
  { key: "sad", icon: "\u{1F622}" },
  { key: "wow", icon: "\u{1F62E}" },
  { key: "fire", icon: "\u{1F525}" },
  { key: "like", icon: "\u{1F44D}" },
  { key: "clap", icon: "\u{1F44F}" },
];
const QUICK_REACTIONS = REACTION_OPTIONS.slice(0, 4);

function getReactionIcon(reactionKey) {
  return REACTION_OPTIONS.find((r) => r.key === reactionKey)?.icon || reactionKey;
}

function formatRelativeTime(dateString) {
  const diffMs = Math.max(Date.now() - new Date(dateString).getTime(), 0);
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  if (diffHours < 1) return "just now";
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return new Date(dateString).toLocaleDateString();
}

function totalReactionCount(reactionTotals) {
  return reactionTotals.reduce((sum, item) => sum + Number(item.count || 0), 0);
}

/* ─────────────── Reaction Details Sheet ─────────────── */
function ReactionDetailsSheet({ post, reactions, onClose }) {
  // Re-group by USER instead of by reaction type
  // Input:  { "joy": [{userId, username, avatarUrl}, ...], "like": [...] }
  // Output: [{ userId, username, avatarUrl, emojis: ["🤣","👍"] }, ...]
  const byUser = useMemo(() => {
    const map = {};
    Object.entries(reactions || {}).forEach(([reactionType, users]) => {
      users.forEach((u) => {
        if (!map[u.userId]) {
          map[u.userId] = {
            userId: u.userId,
            username: u.username,
            avatarUrl: u.avatarUrl,
            emojis: [],
          };
        }
        map[u.userId].emojis.push(getReactionIcon(reactionType));
      });
    });
    // Sort by number of emojis desc, then username asc
    return Object.values(map).sort(
      (a, b) => b.emojis.length - a.emojis.length || a.username.localeCompare(b.username)
    );
  }, [reactions]);

  return (
    <div className={`bottom-sheet ${post ? "bottom-sheet--open" : ""}`}>
      <div className="bottom-sheet__header">
        <div>
          <p className="eyebrow eyebrow--light">Reactions</p>
          <h2>{post ? `@${post.author.username}` : "Post reactions"}</h2>
        </div>
        <button className="round-icon-button round-icon-button--small" onClick={onClose} type="button">
          ×
        </button>
      </div>

      {!byUser.length ? (
        <div className="sheet-empty">
          <p>No one has reacted to this post yet.</p>
        </div>
      ) : (
        <div className="reaction-compact-list">
          {byUser.map((u) => (
            <div className="reaction-compact-row" key={u.userId}>
              {/* Avatar + name */}
              <div className="reaction-compact-row__user">
                {u.avatarUrl ? (
                  <img
                    className="reaction-compact-row__avatar"
                    src={getAssetUrl(u.avatarUrl)}
                    alt={u.username}
                  />
                ) : (
                  <div className="reaction-compact-row__avatar reaction-compact-row__avatar--placeholder">
                    {u.username?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                )}
                <span className="reaction-compact-row__name">@{u.username}</span>
              </div>

              {/* All emojis this user sent — inline */}
              <div className="reaction-compact-row__emojis">
                {u.emojis.map((icon, i) => (
                  <span key={i} className="reaction-compact-row__icon">{icon}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}



/* ─────────────── Discover Card ─────────────── */
function DiscoverCard({ profile, onAddFriend }) {
  return (
    <article className="sheet-card">
      <Link className="sheet-card__identity" to={`/profile/${profile.id}`}>
        {profile.avatarUrl ? (
          <img className="sheet-card__avatar" src={getAssetUrl(profile.avatarUrl)} alt={profile.username} />
        ) : (
          <div className="sheet-card__avatar sheet-card__avatar--placeholder">
            {profile.username?.charAt(0)?.toUpperCase() || "U"}
          </div>
        )}
        <div>
          <strong>@{profile.username || "new-user"}</strong>
          <p>{profile.bio || "Add this friend to pull their moments into your feed."}</p>
        </div>
      </Link>
      <div className="sheet-card__meta">
        <span>{profile.postCount || 0} posts</span>
        <span>{profile.friendCount || 0} friends</span>
      </div>
      <button className="sheet-button" onClick={() => onAddFriend(profile.id)} type="button">
        Add friend
      </button>
    </article>
  );
}

/* ─────────────── Full-Screen Post Slide ─────────────── */
function PostSlide({
  post,
  currentUserId,
  currentUserRole,
  expandedPickerPostId,
  isVerifying,
  isMinting,
  onToggleReaction,
  onTogglePicker,
  onOpenReactions,
  onAddFriend,
  onVerifyPost,
  onMintNFT,
  onOpenMessages,
}) {
  const totalReactions = totalReactionCount(post.reactionTotals || []);
  const isOwnPost = Number(post.author.id) === Number(currentUserId);
  const isVerified = Boolean(post.proof?.isVerified);
  const isMinted = Boolean(post.nft?.isMinted);

  const isAdmin = currentUserRole === "admin";

  return (
    <div className="locket-slide">
      {/* ── Rounded photo card ── */}
      <div className="locket-card">
        <img
          className="locket-card__image"
          src={getAssetUrl(post.imageUrl)}
          alt={post.caption || post.author.username}
          draggable={false}
        />

        {/* Caption overlay at bottom of card */}
        {post.caption ? (
          <div className="locket-card__caption-overlay">
            <p className="locket-card__caption">{post.caption}</p>
          </div>
        ) : null}

        {/* Top-left badges on the card — clickable for admin */}
        <div className="locket-card__top-badges">
          {isVerified && (
            isAdmin && post.proof?.explorerUrl ? (
              <a className="card-badge card-badge--verified" href={post.proof.explorerUrl} target="_blank" rel="noreferrer" title="View proof on Etherscan">
                <span className="card-badge__icon">✓</span>
                Verified
              </a>
            ) : (
              <span className="card-badge card-badge--verified">
                <span className="card-badge__icon">✓</span>
                Verified
              </span>
            )
          )}
          {isMinted && (
            isAdmin && post.nft?.explorerUrl ? (
              <a className="card-badge card-badge--nft" href={post.nft.explorerUrl} target="_blank" rel="noreferrer" title="View NFT on Etherscan">
                <span className="card-badge__icon">💎</span>
                NFT #{post.nft.tokenId}
              </a>
            ) : (
              <span className="card-badge card-badge--nft">
                <span className="card-badge__icon">💎</span>
                NFT #{post.nft.tokenId}
              </span>
            )
          )}
        </div>

        {/* Add friend badge top-right of card */}
        {post.author.id !== currentUserId && !post.isFriendAuthor && (
          <button
            className="locket-card__add-friend-btn"
            onClick={() => onAddFriend(post.author.id)}
            type="button"
          >
            + Add
          </button>
        )}
      </div>

      {/* ── Author row — below card ── */}
      <div className="locket-meta">
        <Link className="locket-meta__author" to={`/profile/${post.author.id}`}>
          {post.author.avatarUrl ? (
            <img
              className="locket-meta__avatar"
              src={getAssetUrl(post.author.avatarUrl)}
              alt={post.author.username}
            />
          ) : (
            <div className="locket-meta__avatar locket-meta__avatar--placeholder">
              {post.author.username?.charAt(0)?.toUpperCase() || "U"}
            </div>
          )}
          <div className="locket-meta__info">
            <span className="locket-meta__name">{post.author.username}</span>
            <span className="locket-meta__time">{formatRelativeTime(post.createdAt)}</span>
          </div>
        </Link>

        {/* Compact verify/mint buttons — only for own posts */}
        {isOwnPost && (
          <div className="locket-meta__actions">
            {!isVerified && (
              <button
                className="action-btn action-btn--verify action-btn--compact"
                disabled={isVerifying}
                onClick={() => onVerifyPost(post.id)}
                type="button"
              >
                {isVerifying ? "⟳" : "🔏"}
              </button>
            )}
            {!isMinted && (
              <button
                className="action-btn action-btn--mint action-btn--compact"
                disabled={isMinting}
                onClick={() => onMintNFT(post.id)}
                type="button"
              >
                {isMinting ? "⟳" : "💎"}
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Reaction bar — below author ── */}
      <div className="locket-reactions">
        <button className="locket-reactions__message-pill" onClick={() => onOpenMessages(post)} type="button">
          Send a message…
        </button>

        <div className="reaction-quickbar">
          {QUICK_REACTIONS.map((rt) => {
            const isActive = (post.currentUserReactions || []).includes(rt.key);
            return (
              <button
                key={`${post.id}-${rt.key}`}
                className={`reaction-icon-button ${isActive ? "reaction-icon-button--active" : ""}`}
                onClick={() => onToggleReaction(post.id, rt.key)}
                type="button"
              >
                {rt.icon}
              </button>
            );
          })}
          <button
            className={`reaction-icon-button ${expandedPickerPostId === post.id ? "reaction-icon-button--active" : ""}`}
            onClick={() => onTogglePicker(post.id)}
            type="button"
          >
            😊
          </button>
        </div>
      </div>

      {/* Expanded picker */}
      {expandedPickerPostId === post.id && (
        <div className="reaction-picker" style={{ padding: "0 20px 10px" }}>
          {REACTION_OPTIONS.map((rt) => {
            const isActive = (post.currentUserReactions || []).includes(rt.key);
            return (
              <button
                key={`${post.id}-picker-${rt.key}`}
                className={`reaction-picker__item ${isActive ? "reaction-picker__item--active" : ""}`}
                onClick={() => onToggleReaction(post.id, rt.key)}
                type="button"
              >
                {rt.icon}
              </button>
            );
          })}
        </div>
      )}

      {/* Reaction summary chips */}
      {totalReactions > 0 && (
        <div className="reaction-summary" style={{ padding: "0 20px 6px" }}>
          {post.reactionTotals.map((item) => {
            const isActive = (post.currentUserReactions || []).includes(item.type);
            return (
              <button
                key={`${post.id}-summary-${item.type}`}
                className={`reaction-chip ${isActive ? "reaction-chip--active" : ""}`}
                onClick={() => onOpenReactions(post)}
                type="button"
              >
                <span>{getReactionIcon(item.type)}</span>
                <strong>{item.count}</strong>
              </button>
            );
          })}
          <button className="reaction-link-button" onClick={() => onOpenReactions(post)} type="button">
            View all
          </button>
        </div>
      )}
    </div>
  );
}


/* ─────────────── Main Feed Component ─────────────── */
export default function Feed() {
  const navigate = useNavigate();
  const { token, user, logout, updateCurrentUser } = useAuth();

  const [posts, setPosts] = useState([]);
  const [friends, setFriends] = useState([]);   // already friends
  const [people, setPeople] = useState([]);      // not yet friends (discover)
  const [verifyingPostId, setVerifyingPostId] = useState(null);
  const [mintingPostId, setMintingPostId] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [expandedPickerPostId, setExpandedPickerPostId] = useState(null);
  const [reactionDetailsPost, setReactionDetailsPost] = useState(null);
  const [reactionDetails, setReactionDetails] = useState({});
  const [showFriendsSheet, setShowFriendsSheet] = useState(false);  // existing friends
  const [showPeopleSheet, setShowPeopleSheet] = useState(false);    // discover new friends
  const [showMenuSheet, setShowMenuSheet] = useState(false);
  const [showInboxSheet, setShowInboxSheet] = useState(false);
  const [messageThreadTarget, setMessageThreadTarget] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // For swipe / wheel detection
  const touchStartY = useRef(null);
  const wheelAccum = useRef(0);
  const wheelTimer = useRef(null);
  const anySheetOpen =
    showFriendsSheet ||
    showPeopleSheet ||
    showMenuSheet ||
    showInboxSheet ||
    !!messageThreadTarget ||
    !!reactionDetailsPost ||
    !!expandedPickerPostId;

  /* ── Data loading ── */
  const loadFeed = useCallback(async () => {
    setError("");
    setIsLoading(true);
    try {
      const [feedPayload, peoplePayload] = await Promise.all([
        apiRequest("/feed", { token }),
        apiRequest("/profiles", { token }),
      ]);
      setPosts(feedPayload.posts);
      setFriends(peoplePayload.profiles.filter((p) => p.isFriend));
      setPeople(peoplePayload.profiles.filter((p) => !p.isFriend));
    } catch (err) {
      setError(err.message || "Unable to load your feed.");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  /* ── Navigation helpers ── */
  const goToNext = useCallback(() => {
    if (isAnimating || anySheetOpen) return;
    setCurrentIndex((i) => {
      if (i >= posts.length - 1) return i;
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 420);
      return i + 1;
    });
  }, [isAnimating, anySheetOpen, posts.length]);

  const goToPrev = useCallback(() => {
    if (isAnimating || anySheetOpen) return;
    setCurrentIndex((i) => {
      if (i <= 0) return i;
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 420);
      return i - 1;
    });
  }, [isAnimating, anySheetOpen]);

  /* ── Wheel handler (desktop) ── */
  const handleWheel = useCallback(
    (e) => {
      if (anySheetOpen) return;
      e.preventDefault();
      wheelAccum.current += e.deltaY;

      clearTimeout(wheelTimer.current);
      wheelTimer.current = setTimeout(() => {
        if (wheelAccum.current > 40) goToNext();
        else if (wheelAccum.current < -40) goToPrev();
        wheelAccum.current = 0;
      }, 80);
    },
    [goToNext, goToPrev, anySheetOpen]
  );

  /* ── Touch handlers (mobile) ── */
  const handleTouchStart = useCallback((e) => {
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback(
    (e) => {
      if (touchStartY.current === null) return;
      const delta = touchStartY.current - e.changedTouches[0].clientY;
      touchStartY.current = null;
      if (delta > 50) goToNext();
      else if (delta < -50) goToPrev();
    },
    [goToNext, goToPrev]
  );

  /* ── Post state helpers ── */
  const updatePostState = (nextPost) => {
    setPosts((cur) => cur.map((p) => (p.id === nextPost.id ? nextPost : p)));
    setReactionDetailsPost((cur) => (cur?.id === nextPost.id ? nextPost : cur));
  };

  const handleAddFriend = async (targetId) => {
    try {
      await apiRequest(`/profiles/${targetId}/friend`, { method: "POST", token });
      updateCurrentUser({ ...user, friendCount: Number(user?.friendCount || 0) + 1 });
      setPeople((cur) => cur.filter((p) => p.id !== targetId));
      setShowPeopleSheet(false);
      await loadFeed();
    } catch (err) {
      setError(err.message || "Unable to add this friend right now.");
    }
  };

  const handleToggleReaction = async (postId, reactionType) => {
    try {
      const payload = await apiRequest(`/posts/${postId}/reactions`, {
        method: "POST",
        body: { type: reactionType },
        token,
      });
      updatePostState(payload.post);
      if (reactionDetailsPost?.id === postId) {
        const details = await apiRequest(`/posts/${postId}/reactions`, { token });
        setReactionDetails(details.reactions);
      }
    } catch (err) {
      setError(err.message || "Unable to save this reaction.");
    }
  };

  const handleOpenReactions = async (post) => {
    try {
      const payload = await apiRequest(`/posts/${post.id}/reactions`, { token });
      setReactionDetailsPost(post);
      setReactionDetails(payload.reactions || {});
    } catch (err) {
      setError(err.message || "Unable to load reaction details.");
    }
  };

  const handleCloseReactions = () => {
    setReactionDetailsPost(null);
    setReactionDetails({});
  };

  const handleVerifyPost = async (postId) => {
    try {
      setError("");
      setVerifyingPostId(postId);
      const payload = await apiRequest(`/posts/${postId}/proof`, {
        method: "POST",
        token,
      });
      updatePostState(payload.post);
    } catch (err) {
      setError(err.message || "Unable to record blockchain proof.");
    } finally {
      setVerifyingPostId(null);
    }
  };

  const handleMintNFT = async (postId) => {
    try {
      setError("");
      setMintingPostId(postId);
      const payload = await apiRequest(`/posts/${postId}/mint`, {
        method: "POST",
        token,
      });
      updatePostState(payload.post);
    } catch (err) {
      setError(err.message || "Unable to mint NFT.");
    } finally {
      setMintingPostId(null);
    }
  };

  const handleOpenMessages = (post) => {
    setExpandedPickerPostId(null);
    setReactionDetailsPost(null);

    if (Number(post.author.id) === Number(user?.id)) {
      setShowInboxSheet(true);
      setShowMenuSheet(false);
      return;
    }

    setMessageThreadTarget({
      peerId: Number(post.author.id),
      peerUsername: post.author.username,
      peerAvatarUrl: post.author.avatarUrl,
      postId: Number(post.id),
      postCaption: post.caption || "",
    });
  };

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  /* ── Render ── */
  return (
    <div className="mobile-stage">
      <div
        className="phone-shell phone-shell--feed"
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Toolbar */}
        <header className="phone-toolbar phone-toolbar--overlay">
          <Link className="round-icon-button" to={`/profile/${user?.id}`} aria-label="My profile">
            {user?.avatarUrl ? (
              <img className="round-icon-button__image" src={getAssetUrl(user.avatarUrl)} alt={user.username} />
            ) : (
              <span>{user?.username?.charAt(0)?.toUpperCase() || "Y"}</span>
            )}
          </Link>

          <button
            className="toolbar-pill"
            onClick={() => { setShowFriendsSheet((v) => !v); setShowPeopleSheet(false); setShowMenuSheet(false); }}
            type="button"
          >
            All friends {friends.length > 0 ? `(${friends.length})` : ""}
          </button>

          <button
            className="round-icon-button"
            onClick={() => { setShowMenuSheet((v) => !v); setShowPeopleSheet(false); }}
            type="button"
            aria-label="Open menu"
          >
            ⋯
          </button>
        </header>

        {/* ── Paging viewport ── */}
        <main className="locket-pager">
          {error && <p className="error-text error-text--floating locket-pager__error">{error}</p>}

          {isLoading ? (
            <div className="empty-phone-state">
              <h2>Loading moments…</h2>
            </div>
          ) : posts.length === 0 ? (
            <div className="empty-phone-state">
              <h2>No moments yet</h2>
              <p>Upload your first post or add friends to populate your feed.</p>
              <div className="empty-phone-state__actions">
                <button className="sheet-button" onClick={() => navigate("/upload")} type="button">
                  Upload a moment
                </button>
                <button
                  className="sheet-button sheet-button--secondary"
                  onClick={() => setShowPeopleSheet(true)}
                  type="button"
                >
                  Discover friends
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Slides track — translate based on currentIndex */}
              <div
                className="locket-pager__track"
                style={{ transform: `translateY(calc(-${currentIndex} * 100%))` }}
              >
                {posts.map((post, idx) => (
                  <div className="locket-pager__page" key={post.id}>
                    <PostSlide
                      post={post}
                      currentUserId={user?.id}
                      currentUserRole={user?.role}
                      expandedPickerPostId={expandedPickerPostId}
                      isVerifying={verifyingPostId === post.id}
                      isMinting={mintingPostId === post.id}
                      onToggleReaction={handleToggleReaction}
                      onTogglePicker={(id) =>
                        setExpandedPickerPostId((cur) => (cur === id ? null : id))
                      }
                      onOpenReactions={handleOpenReactions}
                      onAddFriend={handleAddFriend}
                      onVerifyPost={handleVerifyPost}
                      onMintNFT={handleMintNFT}
                      onOpenMessages={handleOpenMessages}
                    />
                  </div>
                ))}
              </div>

              {/* Dot indicators */}
              {posts.length > 1 && (
                <div className="locket-pager__dots" aria-hidden="true">
                  {posts.map((_, idx) => (
                    <span
                      key={idx}
                      className={`locket-pager__dot ${idx === currentIndex ? "locket-pager__dot--active" : ""}`}
                    />
                  ))}
                </div>
              )}

              {/* Swipe hint — floating pill above dock, fades out after first swipe */}
              {posts.length > 1 && currentIndex === 0 && (
                <div className="locket-pager__swipe-hint" aria-hidden="true">
                  ↓ swipe
                </div>
              )}
            </>
          )}
        </main>

        {/* Bottom dock */}
        <footer className="bottom-dock">
          <button className="dock-button" onClick={() => { setShowPeopleSheet(true); setShowFriendsSheet(false); }} type="button" aria-label="Discover people">
            ⠿
          </button>
          <button className="camera-button" onClick={() => navigate("/upload")} type="button" aria-label="Upload">
            <span />
          </button>
          <button className="dock-button" onClick={() => setShowMenuSheet(true)} type="button" aria-label="More">
            ⋯
          </button>
        </footer>

        {/* ── Bottom sheets ── */}
        {/* ── Friends sheet (already friends) ── */}
        <div className={`bottom-sheet ${showFriendsSheet ? "bottom-sheet--open" : ""}`}>
          <div className="bottom-sheet__header">
            <div>
              <p className="eyebrow eyebrow--light">Your circle</p>
              <h2>All friends</h2>
            </div>
            <button className="round-icon-button round-icon-button--small" onClick={() => setShowFriendsSheet(false)} type="button">
              ×
            </button>
          </div>
          {friends.length === 0 ? (
            <div className="sheet-empty">
              <p>You haven't added any friends yet. Use the ⠿ button to discover people.</p>
            </div>
          ) : (
            <div className="sheet-list">
              {friends.map((profile) => (
                <article key={profile.id} className="sheet-card">
                  <Link className="sheet-card__identity" to={`/profile/${profile.id}`} onClick={() => setShowFriendsSheet(false)}>
                    {profile.avatarUrl ? (
                      <img className="sheet-card__avatar" src={getAssetUrl(profile.avatarUrl)} alt={profile.username} />
                    ) : (
                      <div className="sheet-card__avatar sheet-card__avatar--placeholder">
                        {profile.username?.charAt(0)?.toUpperCase() || "U"}
                      </div>
                    )}
                    <div>
                      <strong>@{profile.username}</strong>
                      <p>{profile.bio || "No bio yet."}</p>
                    </div>
                  </Link>
                </article>
              ))}
            </div>
          )}
        </div>

        {/* ── Discover sheet (not yet friends) ── */}
        <div className={`bottom-sheet ${showPeopleSheet ? "bottom-sheet--open" : ""}`}>
          <div className="bottom-sheet__header">
            <div>
              <p className="eyebrow eyebrow--light">People you may know</p>
              <h2>Discover</h2>
            </div>
            <button className="round-icon-button round-icon-button--small" onClick={() => setShowPeopleSheet(false)} type="button">
              ×
            </button>
          </div>
          {people.length === 0 ? (
            <div className="sheet-empty">
              <p>You have already added everyone available right now.</p>
            </div>
          ) : (
            <div className="sheet-list">
              {people.map((profile) => (
                <DiscoverCard key={profile.id} profile={profile} onAddFriend={handleAddFriend} />
              ))}
            </div>
          )}
        </div>

        <div className={`bottom-sheet ${showMenuSheet ? "bottom-sheet--open" : ""}`}>
          <div className="bottom-sheet__header">
            <div>
              <p className="eyebrow eyebrow--light">Quick actions</p>
              <h2>{user?.username || "Your account"}</h2>
            </div>
            <button className="round-icon-button round-icon-button--small" onClick={() => setShowMenuSheet(false)} type="button">
              ×
            </button>
          </div>
          <div className="sheet-actions">
            <button className="sheet-button" onClick={() => navigate(`/profile/${user?.id}`)} type="button">
              View profile
            </button>
            <button
              className="sheet-button"
              onClick={() => {
                setShowMenuSheet(false);
                setShowInboxSheet(true);
              }}
              type="button"
            >
              Messages
            </button>
            <button className="sheet-button" onClick={() => navigate("/upload")} type="button">
              Upload new post
            </button>
            <button className="sheet-button sheet-button--danger" onClick={handleLogout} type="button">
              Log out
            </button>
          </div>
        </div>

        <ReactionDetailsSheet
          post={reactionDetailsPost}
          reactions={reactionDetails}
          onClose={handleCloseReactions}
        />

        <InboxSheet
          isOpen={showInboxSheet}
          token={token}
          onClose={() => setShowInboxSheet(false)}
          onOpenThread={(threadTarget) => {
            setShowInboxSheet(false);
            setMessageThreadTarget(threadTarget);
          }}
        />

        <MessageThreadSheet
          threadTarget={messageThreadTarget}
          token={token}
          onClose={() => setMessageThreadTarget(null)}
        />
      </div>
    </div>
  );
}
