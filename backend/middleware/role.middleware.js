
export function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {

    // Check whether user is authenticated
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    // Check whether user's role is permitted
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to perform this action"
      });
    }

    // Allow authorized user
    next();
  };
}
