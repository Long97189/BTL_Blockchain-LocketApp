const express = require("express");
const bcrypt = require("bcryptjs");
const { query } = require("../db");
const { requireAuth } = require("../middleware/auth");
const { serializeUser } = require("../utils/serializers");
const { signAccessToken } = require("../utils/tokens");

const router = express.Router();

const currentUserSelect = `
  SELECT
    u.id,
    u.email,
    u.username,
    u.bio,
    u.avatar_url,
    u.role,
    u.created_at,
    (SELECT COUNT(*) FROM follows WHERE follower_id = u.id) AS friend_count,
    (SELECT COUNT(*) FROM posts WHERE user_id = u.id) AS post_count
  FROM users u
  WHERE u.id = $1
`;

router.post("/register", async (request, response) => {
  const email = String(request.body.email || "").trim().toLowerCase();
  const password = String(request.body.password || "");

  if (!email || !password) {
    return response.status(400).json({
      message: "Email and password are required.",
    });
  }

  if (password.length < 6) {
    return response.status(400).json({
      message: "Password must be at least 6 characters.",
    });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const createdUser = await query(
      `
        INSERT INTO users (email, password_hash)
        VALUES ($1, $2)
        RETURNING id, email
      `,
      [email, passwordHash]
    );

    const completeUser = await query(currentUserSelect, [createdUser.rows[0].id]);
    const user = serializeUser(completeUser.rows[0]);
    const token = signAccessToken(user);

    return response.status(201).json({ token, user });
  } catch (error) {
    if (error.code === "23505") {
      return response.status(409).json({
        message: "This email is already registered.",
      });
    }

    return response.status(500).json({
      message: "Unable to create account right now.",
    });
  }
});

router.post("/login", async (request, response) => {
  const email = String(request.body.email || "").trim().toLowerCase();
  const password = String(request.body.password || "");

  if (!email || !password) {
    return response.status(400).json({
      message: "Email and password are required.",
    });
  }

  const existingUser = await query(
    `
      SELECT id, email, password_hash
      FROM users
      WHERE email = $1
    `,
    [email]
  );

  if (existingUser.rowCount === 0) {
    return response.status(401).json({
      message: "Invalid email or password.",
    });
  }

  const passwordMatches = await bcrypt.compare(
    password,
    existingUser.rows[0].password_hash
  );

  if (!passwordMatches) {
    return response.status(401).json({
      message: "Invalid email or password.",
    });
  }

  const currentUser = await query(currentUserSelect, [existingUser.rows[0].id]);
  const user = serializeUser(currentUser.rows[0]);
  const token = signAccessToken(user);

  return response.json({ token, user });
});

router.get("/me", requireAuth, async (request, response) => {
  const result = await query(currentUserSelect, [request.user.id]);

  if (result.rowCount === 0) {
    return response.status(404).json({
      message: "User not found.",
    });
  }

  return response.json({
    user: serializeUser(result.rows[0]),
  });
});

module.exports = router;
