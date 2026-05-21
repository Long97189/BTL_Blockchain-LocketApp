const express = require("express");
const { query } = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

function serializePeer(row) {
  return {
    id: Number(row.peer_id || row.id),
    username: row.peer_username || row.username || "user",
    avatarUrl: row.peer_avatar_url || row.avatar_url || "",
  };
}

function serializeMessage(row, currentUserId) {
  return {
    id: Number(row.id),
    body: row.body || "",
    createdAt: row.created_at,
    readAt: row.read_at || null,
    isOwn: Number(row.sender_id) === Number(currentUserId),
    sender: {
      id: Number(row.sender_id),
      username: row.sender_username || "user",
      avatarUrl: row.sender_avatar_url || "",
    },
    recipient: {
      id: Number(row.recipient_id),
      username: row.recipient_username || "user",
      avatarUrl: row.recipient_avatar_url || "",
    },
    linkedPost: row.post_id
      ? {
          id: Number(row.post_id),
          caption: row.post_caption || "",
          imageUrl: row.post_image_url || "",
        }
      : null,
  };
}

async function findUserById(userId) {
  const result = await query(
    `
      SELECT id, username, avatar_url
      FROM users
      WHERE id = $1
    `,
    [userId]
  );

  return result.rows[0] || null;
}

router.get("/conversations", requireAuth, async (request, response) => {
  const result = await query(
    `
      WITH scoped_messages AS (
        SELECT
          m.id,
          m.body,
          m.created_at,
          CASE
            WHEN m.sender_id = $1 THEN m.recipient_id
            ELSE m.sender_id
          END AS peer_id,
          CASE
            WHEN m.sender_id = $1 THEN recipient.username
            ELSE sender.username
          END AS peer_username,
          CASE
            WHEN m.sender_id = $1 THEN recipient.avatar_url
            ELSE sender.avatar_url
          END AS peer_avatar_url,
          ROW_NUMBER() OVER (
            PARTITION BY CASE
              WHEN m.sender_id = $1 THEN m.recipient_id
              ELSE m.sender_id
            END
            ORDER BY m.created_at DESC, m.id DESC
          ) AS row_number
        FROM messages m
        JOIN users sender ON sender.id = m.sender_id
        JOIN users recipient ON recipient.id = m.recipient_id
        WHERE m.sender_id = $1 OR m.recipient_id = $1
      ),
      unread_counts AS (
        SELECT
          sender_id AS peer_id,
          COUNT(*)::int AS unread_count
        FROM messages
        WHERE recipient_id = $1 AND read_at IS NULL
        GROUP BY sender_id
      )
      SELECT
        scoped_messages.peer_id,
        scoped_messages.peer_username,
        scoped_messages.peer_avatar_url,
        scoped_messages.body AS last_body,
        scoped_messages.created_at AS last_created_at,
        COALESCE(unread_counts.unread_count, 0) AS unread_count
      FROM scoped_messages
      LEFT JOIN unread_counts ON unread_counts.peer_id = scoped_messages.peer_id
      WHERE scoped_messages.row_number = 1
      ORDER BY scoped_messages.created_at DESC, scoped_messages.peer_id ASC
    `,
    [request.user.id]
  );

  return response.json({
    conversations: result.rows.map((row) => ({
      peer: serializePeer(row),
      lastBody: row.last_body || "",
      lastCreatedAt: row.last_created_at,
      unreadCount: Number(row.unread_count || 0),
    })),
  });
});

router.get("/with/:userId", requireAuth, async (request, response) => {
  const currentUserId = Number(request.user.id);
  const peerId = Number(request.params.userId);

  if (!Number.isInteger(peerId) || peerId <= 0) {
    return response.status(400).json({
      message: "Recipient is invalid.",
    });
  }

  if (peerId === currentUserId) {
    return response.status(400).json({
      message: "You cannot message yourself.",
    });
  }

  const peer = await findUserById(peerId);

  if (!peer) {
    return response.status(404).json({
      message: "Recipient was not found.",
    });
  }

  await query(
    `
      UPDATE messages
      SET read_at = NOW()
      WHERE sender_id = $1
        AND recipient_id = $2
        AND read_at IS NULL
    `,
    [peerId, currentUserId]
  );

  const messages = await query(
    `
      SELECT
        m.id,
        m.body,
        m.created_at,
        m.read_at,
        m.sender_id,
        m.recipient_id,
        sender.username AS sender_username,
        sender.avatar_url AS sender_avatar_url,
        recipient.username AS recipient_username,
        recipient.avatar_url AS recipient_avatar_url,
        p.id AS post_id,
        p.caption AS post_caption,
        p.image_url AS post_image_url
      FROM messages m
      JOIN users sender ON sender.id = m.sender_id
      JOIN users recipient ON recipient.id = m.recipient_id
      LEFT JOIN posts p ON p.id = m.post_id
      WHERE (m.sender_id = $1 AND m.recipient_id = $2)
         OR (m.sender_id = $2 AND m.recipient_id = $1)
      ORDER BY m.created_at ASC, m.id ASC
    `,
    [currentUserId, peerId]
  );

  return response.json({
    peer: {
      id: Number(peer.id),
      username: peer.username || "user",
      avatarUrl: peer.avatar_url || "",
    },
    messages: messages.rows.map((row) => serializeMessage(row, currentUserId)),
  });
});

router.post("/", requireAuth, async (request, response) => {
  const currentUserId = Number(request.user.id);
  const recipientId = Number(request.body?.recipientId);
  const postId = request.body?.postId ? Number(request.body.postId) : null;
  const body = String(request.body?.body || "").trim();

  if (!Number.isInteger(recipientId) || recipientId <= 0) {
    return response.status(400).json({
      message: "Recipient is invalid.",
    });
  }

  if (recipientId === currentUserId) {
    return response.status(400).json({
      message: "You cannot send a message to yourself.",
    });
  }

  if (!body) {
    return response.status(400).json({
      message: "Message cannot be empty.",
    });
  }

  if (body.length > 1000) {
    return response.status(400).json({
      message: "Message is too long.",
    });
  }

  const recipient = await findUserById(recipientId);

  if (!recipient) {
    return response.status(404).json({
      message: "Recipient was not found.",
    });
  }

  if (postId) {
    const post = await query(
      `
        SELECT id, user_id
        FROM posts
        WHERE id = $1
      `,
      [postId]
    );

    if (post.rowCount === 0) {
      return response.status(404).json({
        message: "Referenced post was not found.",
      });
    }

    if (Number(post.rows[0].user_id) !== recipientId) {
      return response.status(400).json({
        message: "You can only attach a message to the recipient's post.",
      });
    }
  }

  const inserted = await query(
    `
      INSERT INTO messages (sender_id, recipient_id, post_id, body)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `,
    [currentUserId, recipientId, postId, body]
  );

  const message = await query(
    `
      SELECT
        m.id,
        m.body,
        m.created_at,
        m.read_at,
        m.sender_id,
        m.recipient_id,
        sender.username AS sender_username,
        sender.avatar_url AS sender_avatar_url,
        recipient.username AS recipient_username,
        recipient.avatar_url AS recipient_avatar_url,
        p.id AS post_id,
        p.caption AS post_caption,
        p.image_url AS post_image_url
      FROM messages m
      JOIN users sender ON sender.id = m.sender_id
      JOIN users recipient ON recipient.id = m.recipient_id
      LEFT JOIN posts p ON p.id = m.post_id
      WHERE m.id = $1
    `,
    [inserted.rows[0].id]
  );

  return response.status(201).json({
    message: serializeMessage(message.rows[0], currentUserId),
  });
});

module.exports = router;
