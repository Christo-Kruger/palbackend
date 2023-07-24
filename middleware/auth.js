const jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {
  const token = req.header("x-auth-token");
  if (!token) return res.status(401).send("Access denied. No token provided.");

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; 
    next();
  } catch (exception) {
    if (exception instanceof jwt.TokenExpiredError) {
      // Token is expired
      // You could potentially check for a valid refresh token here and return a new JWT if valid.
      res.status(401).send("Token expired.");
    } else if (exception instanceof jwt.JsonWebTokenError) {
      // Token is invalid
      res.status(400).send("Invalid token.");
    } else {
      // Something else went wrong
      res.status(400).send("Something went wrong.");
    }
  }
};
