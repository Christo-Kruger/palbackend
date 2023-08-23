const jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {
  const bearerHeader = req.header("authorization");
  if (!bearerHeader)
    return res.status(401).send("Access denied. No token provided.");

  const token = bearerHeader.split(" ")[1]; // Get the token part after "Bearer"
  console.log("Extracted token:", token);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    next();
    // ... the try block
  } catch (exception) {
    console.error(exception); // Log the error for more details
    if (exception instanceof jwt.TokenExpiredError) {
      res.status(401).send("Token expired.");
    } else if (exception instanceof jwt.JsonWebTokenError) {
      res.status(400).send("Invalid token. " + exception.message);
    } else {
      res.status(400).send("Something went wrong. " + exception.message);
    }
  }
};
