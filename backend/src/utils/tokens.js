const jwt = require("jsonwebtoken");
const config = require("../config");

function signAccessToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
    },
    config.jwtSecret,
    {
      expiresIn: "7d",
    }
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, config.jwtSecret);
}

module.exports = {
  signAccessToken,
  verifyAccessToken,
};
