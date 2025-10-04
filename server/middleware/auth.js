const jwt = require('jsonwebtoken');
const User = require('../models/User-model');
const JWT_SECRET = process.env.JWT_SECRET || 'change_me';

// Middleware to verify JWT token and attach minimal identity to req
exports.verifyToken = (req, res, next) => {
    // Check for token in multiple locations (header, cookies)
    const token = req.header('x-auth-token') || req.cookies?.auth_token || req.cookies?.token;
    
    if (!token) {
        return res.status(401).json({ 
            error: 'Authentication required', 
            code: 'NO_TOKEN',
            message: 'Please log in to access this resource'
        });
    }
    
    try {
        // Verify token with strict algorithm enforcement
        const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
        
        // Support both payload shapes: { googleId } or { user: { id/googleId } }
        const googleId = decoded.googleId || decoded.user?.googleId || decoded.user?.id;
        
        if (!googleId) {
            return res.status(401).json({ 
                error: 'Invalid token format', 
                code: 'INVALID_TOKEN_FORMAT',
                message: 'Your session is invalid. Please log in again.'
            });
        }
        
        // Check token expiration explicitly
        if (decoded.exp && Date.now() >= decoded.exp * 1000) {
            return res.status(401).json({ 
                error: 'Token expired', 
                code: 'TOKEN_EXPIRED',
                message: 'Your session has expired. Please log in again.'
            });
        }
        
        // Check if token is about to expire (less than 15 minutes)
        if (decoded.exp && (decoded.exp * 1000 - Date.now()) < 900000) {
            // Token is about to expire, set a flag for downstream handlers
            // They can use this to issue a new token if needed
            req.tokenNearExpiry = true;
        }
        
        // Attach minimal identity. isAuthenticated will hydrate full user.
        req.auth = { 
            googleId, 
            role: decoded.role || 'user',
            email: decoded.email,
            exp: decoded.exp
        };
        
        // For backward compatibility
        req.userId = googleId;
        
        next();
    } catch (err) {
        console.error('Token verification failed:', err.message);
        
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                error: 'Token expired', 
                code: 'TOKEN_EXPIRED',
                message: 'Your session has expired. Please log in again.'
            });
        } else if (err.name === 'JsonWebTokenError') {
            return res.status(401).json({ 
                error: 'Invalid token', 
                code: 'INVALID_TOKEN',
                message: 'Your session is invalid. Please log in again.'
            });
        } else if (err.name === 'NotBeforeError') {
            return res.status(401).json({ 
                error: 'Token not active', 
                code: 'TOKEN_NOT_ACTIVE',
                message: 'Your session is not yet active. Please try again later.'
            });
        }
        
        res.status(401).json({ 
            error: 'Authentication failed', 
            code: 'AUTH_FAILED',
            message: 'Authentication failed. Please log in again.'
        });
    }
};

// Middleware to check if user is a counselor
exports.isCounselor = async (req, res, next) => {
    try {
        // Prefer hydrated user if present
        let user = req.user;
        
        if (!user) {
            // Get token from multiple possible locations
            const token = req.header('x-auth-token') || req.cookies?.auth_token || req.cookies?.token;
            
            if (!token) {
                return res.status(401).json({ 
                    error: 'Authentication required', 
                    code: 'NO_TOKEN',
                    message: 'Please log in to access this resource'
                });
            }
            
            try {
                const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
                const googleId = decoded.googleId || decoded.user?.googleId || decoded.user?.id;
                
                if (!googleId) {
                    return res.status(401).json({ 
                        error: 'Invalid token format', 
                        code: 'INVALID_TOKEN_FORMAT',
                        message: 'Your session is invalid. Please log in again.'
                    });
                }
                
                user = await User.findOne({ googleId });
                
                if (!user) {
                    return res.status(404).json({ 
                        error: 'User not found', 
                        code: 'USER_NOT_FOUND',
                        message: 'User account not found. Please log in again.'
                    });
                }
            } catch (tokenError) {
                console.error('Token verification failed in isCounselor:', tokenError.message);
                
                if (tokenError.name === 'TokenExpiredError') {
                    return res.status(401).json({ 
                        error: 'Token expired', 
                        code: 'TOKEN_EXPIRED',
                        message: 'Your session has expired. Please log in again.'
                    });
                } else {
                    return res.status(401).json({ 
                        error: 'Authentication failed', 
                        code: 'AUTH_FAILED',
                        message: 'Authentication failed. Please log in again.'
                    });
                }
            }
        }

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check if user is a counselor
        if (!user.isCounselor) {
            // Check if user is on the allowlist for automatic counselor assignment
            const email = user.email?.toLowerCase();
            if (email) {
                const allow = (process.env.COUNSELOR_ALLOWLIST || "").split(/[\s,]+/).map(s => s.toLowerCase()).filter(Boolean);
                if (allow.includes(email)) {
                    // Auto-enable counselor status for allowlisted users
                    user.isCounselor = true;
                    await user.save();
                    console.log(`Auto-enabled counselor status for allowlisted user: ${email}`);
                } else {
                    return res.status(403).json({ 
                        error: 'Access denied. User is not a counselor', 
                        code: 'NOT_COUNSELOR',
                        message: 'You do not have counselor privileges. Please contact an administrator.'
                    });
                }
            } else {
                return res.status(403).json({ 
                    error: 'Access denied. User is not a counselor', 
                    code: 'NOT_COUNSELOR',
                    message: 'You do not have counselor privileges. Please contact an administrator.'
                });
            }
        }

        // Attach user to request for downstream handlers
        req.user = user; // ensure hydrated user
        req.counselor = user;
        next();
    } catch (err) {
        console.error('Counselor verification failed:', err);
        res.status(500).json({ 
            error: 'Server error during authorization', 
            code: 'AUTH_SERVER_ERROR',
            message: 'An error occurred while verifying your counselor status.'
        });
    }
};

// Middleware to check if user is authenticated and hydrate req.user
exports.isAuthenticated = async (req, res, next) => {
    try {
        const token = req.header('x-auth-token') || req.cookies?.auth_token;
        if (!token) {
            return res.status(401).json({ error: 'Authentication required', code: 'AUTH_REQUIRED' });
        }
        
        const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
        const googleId = decoded.googleId || decoded.user?.googleId || decoded.user?.id;
        
        if (!googleId) {
            return res.status(401).json({ error: 'Invalid token payload', code: 'INVALID_PAYLOAD' });
        }
        
        // Check token expiration explicitly
        if (decoded.exp && Date.now() >= decoded.exp * 1000) {
            return res.status(401).json({ error: 'Token has expired', code: 'TOKEN_EXPIRED' });
        }
        
        const user = await User.findOne({ googleId });
        if (!user) {
            return res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
        }
        
        // Check if user account is active
        if (user.status === 'inactive' || user.status === 'suspended') {
            return res.status(403).json({ error: 'Account is inactive or suspended', code: 'ACCOUNT_INACTIVE' });
        }
        
        req.user = user; // hydrate full user document
        req.auth = { googleId, role: user.isCounselor ? 'counselor' : 'user' };
        next();
    } catch (err) {
        console.error('Authentication failed:', err.message);
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token has expired', code: 'TOKEN_EXPIRED' });
        } else if (err.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Invalid token', code: 'INVALID_TOKEN' });
        }
        res.status(401).json({ error: 'Authentication failed', code: 'AUTH_FAILED' });
    }
};
