export function requireRole(role, message) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ code: 'FORBIDDEN', message });
    }
    next();
  };
}
