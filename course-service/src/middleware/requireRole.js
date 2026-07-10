export function requireRole(allowedRole) {
  const targetRole = allowedRole.toLowerCase();
  return (req, res, next) => {
    if (!req.user || req.user.role !== targetRole) {
      return res.status(403).json({
        code: 'FORBIDDEN',
        message: `Only ${allowedRole}s can create draft courses.`
      });
    }
    next();
  };
}
