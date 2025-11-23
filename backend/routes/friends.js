const express = require('express');
const { statements } = require('../database');

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

        if (!username) {
            return res.status(400).json({ error: 'Username is required' });
        }

        // Get friend user
        const friendUser = statements.getUserByUsername.get(username);
        if (!friendUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Can't add yourself as friend
        if (friendUser.id === userId) {
            return res.status(400).json({ error: 'You cannot add yourself as a friend' });
        }

        // Check if already friends
        const alreadyFriend = statements.isFriend.get(userId, friendUser.id);
        if (alreadyFriend.count > 0) {
            return res.status(400).json({ error: 'Already friends with this user' });
        }

        // Add friend (bidirectional)
        statements.addFriend.run(userId, friendUser.id);
        statements.addFriend.run(friendUser.id, userId);

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
        console.error('Add friend error:', error);
        if (error.message.includes('UNIQUE constraint')) {
            return res.status(400).json({ error: 'Already friends with this user' });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Remove a friend
router.delete('/remove', requireAuth, (req, res) => {
    try {
        const userId = req.session.userId;
        const { username } = req.body;

        if (!username) {
            return res.status(400).json({ error: 'Username is required' });
        }

        // Get friend user
        const friendUser = statements.getUserByUsername.get(username);
        if (!friendUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Remove friend (bidirectional)
        statements.removeFriend.run(userId, friendUser.id);
        statements.removeFriend.run(friendUser.id, userId);

        res.json({ message: 'Friend removed successfully' });

    } catch (error) {
        console.error('Remove friend error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get friends list
router.get('/list', requireAuth, (req, res) => {
    try {
        const userId = req.session.userId;
        const friends = statements.getFriends.all(userId);

        res.json({ friends });

    } catch (error) {
        console.error('Get friends error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Check if user is friend
router.get('/check/:username', requireAuth, (req, res) => {
    try {
        const userId = req.session.userId;
        const { username } = req.params;

        const friendUser = statements.getUserByUsername.get(username);
        if (!friendUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        const isFriend = statements.isFriend.get(userId, friendUser.id);

        res.json({ isFriend: isFriend.count > 0 });

    } catch (error) {
        console.error('Check friend error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
