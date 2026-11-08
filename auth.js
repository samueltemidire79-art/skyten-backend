const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const router = express.Router();

// Rate limiting specifically for auth routes to prevent brute-forcing
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 requests per window
    message: { error: 'Too many requests from this IP, please try again after 15 minutes.' }
});

router.use('/register', authLimiter);
router.use('/login', authLimiter);

// Middleware to check admin role
const requireAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'ADMIN') {
        return next();
    }
    return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
};

// Middleware for verifying JWT
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// 1. REGISTER: Creates user with status: PENDING (No token issued)
router.post('/register', async (req, res) => {
    try {
        const { email, password, fullName, jobTitle } = req.body;
        
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered.' });
        }

        const hashedPassword = await bcrypt.hash(password, 12); // Salt rounds = 12

        await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                fullName,
                jobTitle: jobTitle || 'Team Member',
                status: 'PENDING'
            }
        });

        return res.status(201).json({ message: 'Account created — pending approval from an admin.' });
    } catch (err) {
        return res.status(500).json({ error: 'Internal server error during registration.' });
    }
});

// 2. LOGIN: Checks approval status before issuing token, generic error message
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const user = await prisma.user.findUnique({ where: { email } });
        
        // Use generic error message to prevent user enumeration
        const genericError = { error: 'Invalid email or password.' };
        
        if (!user) return res.status(401).json(genericError);

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(401).json(genericError);

        // Check if approved by admin
        if (user.status === 'PENDING') {
            return res.status(403).json({ error: 'Your account is pending approval.' });
        }
        if (user.status === 'REJECTED') {
            return res.status(403).json({ error: 'This account was not approved.' });
        }

        // Issue JWT token with explicit expiry (e.g., 7d)
        const tokenPayload = { userId: user.id, role: user.role, jobTitle: user.jobTitle };
        const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '7d' });

        return res.json({ message: 'Login successful', token, role: user.role, jobTitle: user.jobTitle });
    } catch (err) {
        return res.status(500).json({ error: 'Internal server error during login.' });
    }
});

// 3. ADMIN ENDPOINTS: View pending queue, approve, or reject users
router.get('/pending', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const pendingUsers = await prisma.user.findMany({
            where: { status: 'PENDING' },
            select: { id: true, email: true, fullName: true, jobTitle: true, createdAt: true }
        });
        return res.json(pendingUsers);
    } catch (err) {
        return res.status(500).json({ error: 'Failed to fetch pending approvals.' });
    }
});

router.patch('/:id/approve', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { jobTitle, role } = req.body; // Optional overrides by admin

        const updatedUser = await prisma.user.update({
            where: { id },
            data: {
                status: 'ACTIVE',
                ...(jobTitle && { jobTitle }),
                ...(role && { role })
            }
        });

        return res.json({ message: `User ${updatedUser.email} has been approved.`, user: updatedUser });
    } catch (err) {
        return res.status(500).json({ error: 'Failed to approve user.' });
    }
});

router.patch('/:id/reject', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const updatedUser = await prisma.user.update({
            where: { id },
            data: { status: 'REJECTED' }
        });

        return res.json({ message: `User ${updatedUser.email} has been rejected.`, user: updatedUser });
    } catch (err) {
        return res.status(500).json({ error: 'Failed to reject user.' });
    }
});

module.exports = router;