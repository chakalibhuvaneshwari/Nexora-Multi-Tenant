
import jwt from "jsonwebtoken";

export function authenticateToken(req, res, next) {
  // 1. Get the Authorization header
  const authHeader = req.headers.authorization;

  // 2. Check whether token exists
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Access denied. Token is required."
    });
  }

  // 3. Extract token
  const token = authHeader.split(" ")[1];

  try {
    // 4. Verify JWT token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    // 5. Attach user details to request
    req.user = decoded;

    // 6. Allow the request to continue
    next();

  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token"
    });
  }
}
