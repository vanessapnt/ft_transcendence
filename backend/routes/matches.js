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

// Save a match
router.post('/save', requireAuth, (req, res) => {
    try {
        const { player2_username, winner_username, player1_score, player2_score, match_type } = req.body;
        const player1_id = req.session.userId;
        logger.info('Match save attempt', { player1_id, player2_username, match_type, player1_score, player2_score });
        if (!player2_username) {
            logger.warn('Match save failed: player2_username missing', { player1_id });
            return res.status(400).json({ error: 'Player 2 username is required' });
        }
        // Get player 2 ID
        const player2 = statements.getUserByUsername.get(player2_username);
        if (!player2) {
            logger.warn('Match save failed: player2 not found', { player1_id, player2_username });
            return res.status(404).json({ error: 'Player 2 not found' });
        }
        let winner_id = null;
        if (winner_username) {
            const winner = statements.getUserByUsername.get(winner_username);
            if (winner) {
                winner_id = winner.id;
            }
        }
        // Save the match
        statements.saveMatch.run(
            player1_id,
            player2.id,
            winner_id,
            player1_score || 0,
            player2_score || 0,
            match_type || 'duel'
        );
        logger.info('Match saved successfully', { player1_id, player2_id: player2.id, winner_id, player1_score, player2_score, match_type });
        res.json({
            message: 'Match saved successfully',
            match: {
                player1_id,
                player2_id: player2.id,
                winner_id,
                player1_score,
                player2_score
            }
        });
    } catch (error) {
        logger.error('Save match error', { player1_id: req.session.userId, error: error.message });
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get matches for a user
router.get('/user/:userId', (req, res) => {
    try {
        const { userId } = req.params;
        logger.info('User matches requested', { requestedUserId: userId });
        const matches = statements.getUserMatches.all(parseInt(userId), parseInt(userId));
        logger.info('User matches retrieved', { requestedUserId: userId, matchCount: matches.length });
        res.json({ matches });
    } catch (error) {
        logger.error('Get user matches error', { requestedUserId: req.params.userId, error: error.message });
        console.error('Get user matches error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get match stats for a user
router.get('/stats/:userId', (req, res) => {
    try {
        const { userId } = req.params;
        const userId_int = parseInt(userId);
        logger.info('User match stats requested', { requestedUserId: userId });
        const stats = statements.getUserMatchStats.get(userId_int, userId_int, userId_int, userId_int);
        logger.info('User match stats retrieved', { requestedUserId: userId, stats });
        res.json({ stats });
    } catch (error) {
        logger.error('Get match stats error', { requestedUserId: req.params.userId, error: error.message });
        console.error('Get match stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
