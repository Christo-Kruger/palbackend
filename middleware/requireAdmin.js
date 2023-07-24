// middleware/requireAdmin.js
module.exports = function (req, res, next) {
    // Check if the user is an admin
    if (req.user.role !== 'admin') {
        return res.status(403).send('Access denied. Admin rights required.');
    }
    next();
};
