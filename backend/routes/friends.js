const express = require('express');
const { statements } = require('../database');
const logger = require('../logger');

const router = express.Router();

// Middleware to check authentication
const requireAuth = (req, res, next) => {
    if (req.user && req.user.id && !req.session.userId) {
        req.session.userId = req.user.id;
    }
    if (!req.session.userId && !(req.isAuthenticated && req.isAuthenticated())) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    next();
};

// Add a friend
router.post('/add', requireAuth, (req, res) => {
    try {
        const userId = req.session.userId;
        const { username } = req.body;
        logger.info('Friend add attempt', { userId, targetUsername: username });
        if (!username) {
            logger.warn('Friend add failed: username missing', { userId });
            return res.status(400).json({ error: 'Username is required' });
        }
        // Get friend user
        const friendUser = statements.getUserByUsername.get(username);
        if (!friendUser) {
            logger.warn('Friend add failed: user not found', { userId, targetUsername: username });
            return res.status(404).json({ error: 'User not found' });
        }
        // Can't add yourself as friend
        if (friendUser.id === userId) {
            logger.warn('Friend add failed: cannot add self', { userId });
            return res.status(400).json({ error: 'You cannot add yourself as a friend' });
        }
        // Check if already friends (both directions)
        const alreadyFriend1 = statements.isFriend.get(userId, friendUser.id);
        const alreadyFriend2 = statements.isFriend.get(friendUser.id, userId);
        if (alreadyFriend1.count > 0 || alreadyFriend2.count > 0) {
            logger.warn('Friend add failed: already friends', { userId, friendUserId: friendUser.id });
            return res.status(400).json({ error: 'Already friends with this user' });
        }
        // Add friend (bidirectional)
        statements.addFriend.run(userId, friendUser.id);
        statements.addFriend.run(friendUser.id, userId);
        logger.info('Friend added successfully', { userId, friendUserId: friendUser.id, friendUsername: username });
        res.json({
            message: 'Friend added successfully',
            friend: {
                id: friendUser.id,
                username: friendUser.username,
                display_name: friendUser.display_name,
                avatar_path: friendUser.avatar_path
            }
        });
    } catch (error) {
        logger.error('Add friend error', { userId: req.session.userId, targetUsername: req.body.username, error: error.message });
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Remove a friend
router.delete('/remove', requireAuth, (req, res) => {
    try {
        const userId = req.session.userId;
        const { username } = req.body;

        logger.info('Friend remove attempt', { userId, targetUsername: username });

        if (!username) {
            logger.warn('Friend remove failed: username missing', { userId });
            return res.status(400).json({ error: 'Username is required' });
        }

        // Get friend user
        const friendUser = statements.getUserByUsername.get(username);
        if (!friendUser) {
            logger.warn('Friend remove failed: user not found', { userId, targetUsername: username });
            return res.status(404).json({ error: 'User not found' });
        }

        // Remove friend (bidirectional)
        statements.removeFriend.run(userId, friendUser.id);
        statements.removeFriend.run(friendUser.id, userId);
        statements.removeFriend.run(friendUser.id, userId);

        logger.info('Friend removed successfully', { userId, friendUserId: friendUser.id, friendUsername: username });
        res.json({ message: 'Friend removed successfully' });

    } catch (error) {
        logger.error('Remove friend error', { userId: req.session.userId, targetUsername: req.body.username, error: error.message });
        console.error('Remove friend error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get friends list
router.get('/list', requireAuth, (req, res) => {
    try {
        const userId = req.session.userId;
        logger.info('Friends list requested', { userId });
        const friends = statements.getFriends.all(userId);

        logger.info('Friends list retrieved', { userId, friendCount: friends.length });
        res.json({ friends });

    } catch (error) {
        logger.error('Get friends error', { userId: req.session.userId, error: error.message });
        console.error('Get friends error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Check if user is friend
router.get('/check/:username', requireAuth, (req, res) => {
    try {
        const userId = req.session.userId;
        const { username } = req.params;

        logger.info('Friend check requested', { userId, targetUsername: username });
        const friendUser = statements.getUserByUsername.get(username);
        if (!friendUser) {
            logger.warn('Friend check failed: user not found', { userId, targetUsername: username });
            return res.status(404).json({ error: 'User not found' });
        }

        const isFriend = statements.isFriend.get(userId, friendUser.id);

        logger.info('Friend check result', { userId, targetUserId: friendUser.id, isFriend: isFriend.count > 0 });
        res.json({ isFriend: isFriend.count > 0 });

    } catch (error) {
        logger.error('Check friend error', { userId: req.session.userId, targetUsername: req.params.username, error: error.message });
        console.error('Check friend error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;