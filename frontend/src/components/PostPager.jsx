/**
 * PostPager — reusable fullscreen paging feed.
 * Used by both Feed (all posts) and UserProfile (single-user posts).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { getAssetUrl } from "../utils/api";
import { apiRequest } from "../utils/api";
import { useAuth } from "../hooks/useAuth";

/* ── Constants ── */
export const REACTION_OPTIONS = [
  { key: "joy",          icon: "\u{1F923}" },
  { key: "love",        icon: "\u{1F60D}" },
  { key: "yellow_heart", icon: "\u{1F49B}" },
  { key: "sad",          icon: "\u{1F622}" },
  { key: "wow",          icon: "\u{1F62E}" },
  { key: "fire",         icon: "\u{1F525}" },
  { key: "like",         icon: "\u{1F44D}" },
  { key: "clap",         icon: "\u{1F44F}" },
];
const QUICK_REACTIONS = REACTION_OPTIONS.slice(0, 5);

export function getReactionIcon(key) {
  return REACTION_OPTIONS.find((r) => r.key === key)?.icon || key;
}

export function formatRelativeTime(dateString) {
  const diffMs = Math.max(Date.now() - new Date(dateString).getTime(), 0);
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  if (diffHours < 1) return "just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(dateString).toLocaleDateString();
}

function totalReactionCount(reactionTotals) {
  return reactionTotals.reduce((sum, item) => sum + Number(item.count || 0), 0);
}

/* ── Reaction Details Sheet ── */
export function ReactionDetailsSheet({ post, reactions, onClose }) {
  const byUser = useMemo(() => {
    const map = {};
    Object.entries(reactions || {}).forEach(([type, users]) => {
      users.forEach((u) => {
        if (!map[u.userId]) {
          map[u.userId] = { userId: u.userId, username: u.username, avatarUrl: u.avatarUrl, emojis: [] };
        }
        map[u.userId].emojis.push(getReactionIcon(type));
      });
    });
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
        <button className="round-icon-button round-icon-button--small" onClick={onClose} type="button">×</button>
      </div>

      {!byUser.length ? (
        <div className="sheet-empty"><p>No reactions yet.</p></div>
      ) : (
        <div className="reaction-compact-list">
          {byUser.map((u) => (
            <div className="reaction-compact-row" key={u.userId}>
              <div className="reaction-compact-row__user">
                {u.avatarUrl ? (
                  <img className="reaction-compact-row__avatar" src={getAssetUrl(u.avatarUrl)} alt={u.username} />
                ) : (
                  <div className="reaction-compact-row__avatar reaction-compact-row__avatar--placeholder">
                    {u.username?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                )}
                <span className="reaction-compact-row__name">@{u.username}</span>
              </div>
              <div className="reaction-compact-row__emojis">
                {u.emojis.map((icon, i) => <span key={i} className="reaction-compact-row__icon">{icon}</span>)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Single Post Slide ── */
export function PostSlide({
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
}) {
  const total = totalReactionCount(post.reactionTotals || []);
  const isOwnPost = Number(post.author.id) === Number(currentUserId);
  const isVerified = Boolean(post.proof?.isVerified);
  const isMinted = Boolean(post.nft?.isMinted);
  const isAdmin = currentUserRole === "admin";

  return (
    <div className="locket-slide">
      {/* ── Photo card ── */}
      <div className="locket-card">
        <img
          className="locket-card__image"
          src={getAssetUrl(post.imageUrl)}
          alt={post.caption || post.author.username}
          draggable={false}
        />

        {/* Caption overlay */}
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

        {/* Add friend button (top-right) */}
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

      {/* ── Author row ── */}
      <div className="locket-meta">
        <Link className="locket-meta__author" to={`/profile/${post.author.id}`}>
          {post.author.avatarUrl ? (
            <img className="locket-meta__avatar" src={getAssetUrl(post.author.avatarUrl)} alt={post.author.username} />
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

      {/* ── Reaction bar ── */}
      <div className="locket-reactions">
        <button className="locket-reactions__message-pill" type="button">
          💬 Send a message…
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
            className={`reaction-icon-button reaction-icon-button--more ${expandedPickerPostId === post.id ? "reaction-icon-button--active" : ""}`}
            onClick={() => onTogglePicker(post.id)}
            type="button"
            title="More reactions"
          >
            ＋
          </button>
        </div>
      </div>

      {/* Expanded picker */}
      {expandedPickerPostId === post.id && (
        <div className="reaction-picker">
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
      {total > 0 && (
        <div className="reaction-summary">
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

/* ── PostPager — the scrollable paging viewport ── */
export default function PostPager({ posts, currentUserId, onAddFriend, onReloadFeed }) {
  const { token, user } = useAuth();
  const currentUserRole = user?.role || "user";
  const [localPosts, setLocalPosts] = useState(posts);
  const [verifyingPostId, setVerifyingPostId] = useState(null);
  const [mintingPostId, setMintingPostId] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [expandedPickerPostId, setExpandedPickerPostId] = useState(null);
  const [reactionDetailsPost, setReactionDetailsPost] = useState(null);
  const [reactionDetails, setReactionDetails] = useState({});

  // Sync if parent posts change
  useEffect(() => { setLocalPosts(posts); setCurrentIndex(0); }, [posts]);

  const anySheetOpen = !!reactionDetailsPost || !!expandedPickerPostId;

  const touchStartY = useRef(null);
  const wheelAccum = useRef(0);
  const wheelTimer = useRef(null);

  const goToNext = useCallback(() => {
    if (isAnimating || anySheetOpen) return;
    setCurrentIndex((i) => {
      if (i >= localPosts.length - 1) return i;
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 420);
      return i + 1;
    });
  }, [isAnimating, anySheetOpen, localPosts.length]);

  const goToPrev = useCallback(() => {
    if (isAnimating || anySheetOpen) return;
    setCurrentIndex((i) => {
      if (i <= 0) return i;
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 420);
      return i - 1;
    });
  }, [isAnimating, anySheetOpen]);

  const handleWheel = useCallback((e) => {
    if (anySheetOpen) return;
    e.preventDefault();
    wheelAccum.current += e.deltaY;
    clearTimeout(wheelTimer.current);
    wheelTimer.current = setTimeout(() => {
      if (wheelAccum.current > 40) goToNext();
      else if (wheelAccum.current < -40) goToPrev();
      wheelAccum.current = 0;
    }, 80);
  }, [goToNext, goToPrev, anySheetOpen]);

  const handleTouchStart = useCallback((e) => { touchStartY.current = e.touches[0].clientY; }, []);
  const handleTouchEnd = useCallback((e) => {
    if (touchStartY.current === null) return;
    const delta = touchStartY.current - e.changedTouches[0].clientY;
    touchStartY.current = null;
    if (delta > 50) goToNext();
    else if (delta < -50) goToPrev();
  }, [goToNext, goToPrev]);

  const updatePost = (next) => setLocalPosts((cur) => cur.map((p) => (p.id === next.id ? next : p)));

  const handleToggleReaction = async (postId, type) => {
    try {
      const payload = await apiRequest(`/posts/${postId}/reactions`, {
        method: "POST", body: { type }, token,
      });
      updatePost(payload.post);
      if (reactionDetailsPost?.id === postId) {
        const details = await apiRequest(`/posts/${postId}/reactions`, { token });
        setReactionDetails(details.reactions);
      }
    } catch { /* silent */ }
  };

  const handleOpenReactions = async (post) => {
    try {
      const payload = await apiRequest(`/posts/${post.id}/reactions`, { token });
      setReactionDetailsPost(post);
      setReactionDetails(payload.reactions || {});
    } catch { /* silent */ }
  };

  const handleVerifyPost = async (postId) => {
    try {
      setVerifyingPostId(postId);
      const payload = await apiRequest(`/posts/${postId}/proof`, {
        method: "POST",
        token,
      });
      updatePost(payload.post);
      if (typeof onReloadFeed === "function") {
        onReloadFeed();
      }
    } catch {
      // noop: parent page already has its own global error UI
    } finally {
      setVerifyingPostId(null);
    }
  };

  const handleMintNFT = async (postId) => {
    try {
      setMintingPostId(postId);
      const payload = await apiRequest(`/posts/${postId}/mint`, {
        method: "POST",
        token,
      });
      updatePost(payload.post);
      if (typeof onReloadFeed === "function") {
        onReloadFeed();
      }
    } catch {
      // noop
    } finally {
      setMintingPostId(null);
    }
  };

  if (!localPosts.length) return null;

  return (
    <main
      className="locket-pager"
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className="locket-pager__track"
        style={{ transform: `translateY(calc(-${currentIndex} * 100%))` }}
      >
        {localPosts.map((post) => (
          <div className="locket-pager__page" key={post.id}>
            <PostSlide
              post={post}
              currentUserId={currentUserId}
              currentUserRole={currentUserRole}
              expandedPickerPostId={expandedPickerPostId}
              isVerifying={verifyingPostId === post.id}
              isMinting={mintingPostId === post.id}
              onToggleReaction={handleToggleReaction}
              onTogglePicker={(id) => setExpandedPickerPostId((cur) => (cur === id ? null : id))}
              onOpenReactions={handleOpenReactions}
              onAddFriend={onAddFriend}
              onVerifyPost={handleVerifyPost}
              onMintNFT={handleMintNFT}
            />
          </div>
        ))}
      </div>

      {/* Dot indicators */}
      {localPosts.length > 1 && (
        <div className="locket-pager__dots" aria-hidden="true">
          {localPosts.map((_, idx) => (
            <span
              key={idx}
              className={`locket-pager__dot ${idx === currentIndex ? "locket-pager__dot--active" : ""}`}
            />
          ))}
        </div>
      )}

      {/* Swipe hint */}
      {localPosts.length > 1 && currentIndex === 0 && (
        <div className="locket-pager__swipe-hint" aria-hidden="true">↓ swipe</div>
      )}

      <ReactionDetailsSheet
        post={reactionDetailsPost}
        reactions={reactionDetails}
        onClose={() => { setReactionDetailsPost(null); setReactionDetails({}); }}
      />
    </main>
  );
}
