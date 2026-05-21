import React, { useEffect, useRef, useState } from "react";
import { apiRequest, getAssetUrl } from "../utils/api";

function formatThreadTime(dateString) {
  if (!dateString) {
    return "";
  }

  const date = new Date(dateString);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();

  if (sameDay) {
    return date.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
}

export function InboxSheet({ isOpen, token, onClose, onOpenThread }) {
  const [conversations, setConversations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadConversations = async () => {
      if (!isOpen || !token) {
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        const payload = await apiRequest("/messages/conversations", { token });
        setConversations(payload.conversations || []);
      } catch (loadError) {
        setError(loadError.message || "Unable to load messages.");
      } finally {
        setIsLoading(false);
      }
    };

    loadConversations();
  }, [isOpen, token]);

  return (
    <div className={`bottom-sheet bottom-sheet--messages ${isOpen ? "bottom-sheet--open" : ""}`}>
      <div className="bottom-sheet__header">
        <div>
          <p className="eyebrow eyebrow--light">Inbox</p>
          <h2>Your messages</h2>
        </div>
        <button className="round-icon-button round-icon-button--small" onClick={onClose} type="button">
          x
        </button>
      </div>

      {isLoading ? (
        <div className="sheet-empty">
          <p>Loading conversations...</p>
        </div>
      ) : error ? (
        <div className="sheet-empty">
          <p>{error}</p>
        </div>
      ) : conversations.length === 0 ? (
        <div className="sheet-empty">
          <p>No messages yet. Start chatting from a friend's post.</p>
        </div>
      ) : (
        <div className="sheet-list">
          {conversations.map((conversation) => (
            <button
              key={conversation.peer.id}
              className="conversation-card"
              onClick={() => onOpenThread({
                peerId: conversation.peer.id,
                peerUsername: conversation.peer.username,
                peerAvatarUrl: conversation.peer.avatarUrl,
              })}
              type="button"
            >
              <div className="conversation-card__identity">
                {conversation.peer.avatarUrl ? (
                  <img
                    className="conversation-card__avatar"
                    src={getAssetUrl(conversation.peer.avatarUrl)}
                    alt={conversation.peer.username}
                  />
                ) : (
                  <div className="conversation-card__avatar conversation-card__avatar--placeholder">
                    {conversation.peer.username?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                )}
                <div className="conversation-card__body">
                  <div className="conversation-card__topline">
                    <strong>@{conversation.peer.username}</strong>
                    <span>{formatThreadTime(conversation.lastCreatedAt)}</span>
                  </div>
                  <p>{conversation.lastBody || "Start your conversation."}</p>
                </div>
              </div>
              {conversation.unreadCount > 0 ? (
                <span className="conversation-card__badge">{conversation.unreadCount}</span>
              ) : null}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function MessageThreadSheet({ threadTarget, token, onClose }) {
  const [peer, setPeer] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const scrollerRef = useRef(null);

  useEffect(() => {
    const loadThread = async () => {
      if (!threadTarget || !token) {
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        const payload = await apiRequest(`/messages/with/${threadTarget.peerId}`, { token });
        setPeer(payload.peer);
        setMessages(payload.messages || []);
      } catch (loadError) {
        setError(loadError.message || "Unable to load this conversation.");
      } finally {
        setIsLoading(false);
      }
    };

    loadThread();
  }, [threadTarget, token]);

  useEffect(() => {
    if (!threadTarget || !scrollerRef.current) {
      return;
    }

    scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
  }, [threadTarget, messages]);

  const handleSendMessage = async () => {
    if (!threadTarget || !draft.trim() || isSending) {
      return;
    }

    setIsSending(true);
    setError("");

    try {
      const payload = await apiRequest("/messages", {
        method: "POST",
        token,
        body: {
          recipientId: threadTarget.peerId,
          postId: threadTarget.postId || null,
          body: draft.trim(),
        },
      });

      setMessages((currentMessages) => [...currentMessages, payload.message]);
      setDraft("");
    } catch (sendError) {
      setError(sendError.message || "Unable to send your message.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className={`bottom-sheet bottom-sheet--thread ${threadTarget ? "bottom-sheet--open" : ""}`}>
      <div className="bottom-sheet__header">
        <div>
          <p className="eyebrow eyebrow--light">Direct message</p>
          <h2>{peer ? `@${peer.username}` : "Conversation"}</h2>
          {threadTarget?.postCaption ? (
            <p className="thread-context">About: {threadTarget.postCaption}</p>
          ) : null}
        </div>
        <button className="round-icon-button round-icon-button--small" onClick={onClose} type="button">
          x
        </button>
      </div>

      {isLoading ? (
        <div className="sheet-empty">
          <p>Loading conversation...</p>
        </div>
      ) : (
        <>
          <div className="message-thread" ref={scrollerRef}>
            {messages.length === 0 ? (
              <div className="sheet-empty">
                <p>No messages yet. Say hi.</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`message-bubble-row ${message.isOwn ? "message-bubble-row--own" : ""}`}
                >
                  <div className={`message-bubble ${message.isOwn ? "message-bubble--own" : ""}`}>
                    {message.linkedPost ? (
                      <div className="message-bubble__post-link">
                        <strong>Moment</strong>
                        <span>{message.linkedPost.caption || "Shared from a post"}</span>
                      </div>
                    ) : null}
                    <p>{message.body}</p>
                    <span className="message-bubble__time">{formatThreadTime(message.createdAt)}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {error ? <p className="error-text error-text--compact">{error}</p> : null}

          <div className="message-composer">
            <textarea
              className="message-composer__input"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Write a message..."
              rows={1}
            />
            <button
              className="message-composer__send"
              disabled={isSending || !draft.trim()}
              onClick={handleSendMessage}
              type="button"
            >
              {isSending ? "..." : "Send"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
