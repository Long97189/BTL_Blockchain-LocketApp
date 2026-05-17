const { verifyAccessToken } = require("../utils/tokens");

function requireAuth(request, response, next) {
  const authorization = request.headers.authorization || "";
  const [scheme, token] = authorization.split(" ");

  if (scheme !== "Bearer" || !token) {
    return response.status(401).json({
      message: "Authentication required.",
    });
  }

  try {
    const payload = verifyAccessToken(token);
    request.user = {
      id: payload.id,
      email: payload.email,
    };
    return next();
  } catch (error) {
    return response.status(401).json({
      message: "Session expired. Please sign in again.",
    });
  }
}

module.exports = {
  requireAuth,
};
