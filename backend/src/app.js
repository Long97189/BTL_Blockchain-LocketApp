const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");
const config = require("./config");
const authRoutes = require("./routes/auth");
const profileRoutes = require("./routes/profiles");
const postRoutes = require("./routes/posts");
const feedRoutes = require("./routes/feed");
const milestoneRoutes = require("./routes/milestones");
const messageRoutes = require("./routes/messages");

const app = express();
const allowedOrigins = new Set(config.frontendOrigins);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`Origin ${origin} is not allowed by CORS.`));
    },
    credentials: true,
  })
);
app.use(morgan("dev"));
app.use(express.json());
app.use("/uploads", express.static(path.resolve(config.uploadsDirectory)));

app.get("/api/health", (_request, response) => {
  response.json({
    status: "ok",
    service: "locket-social-api",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/profiles", profileRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/feed", feedRoutes);
app.use("/api/milestones", milestoneRoutes);
app.use("/api/messages", messageRoutes);

app.use((error, _request, response, _next) => {
  console.error(error);

  if (error.code === "LIMIT_FILE_SIZE") {
    return response.status(400).json({
      message: "The selected file is too large.",
    });
  }

  if (error.message === "Only image uploads are supported.") {
    return response.status(400).json({
      message: error.message,
    });
  }

  return response.status(500).json({
    message: "Something went wrong on the server.",
  });
});

module.exports = app;
