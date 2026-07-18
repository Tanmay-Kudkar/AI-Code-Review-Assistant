const jwt = require('jsonwebtoken');
const prisma = require('../utils/prisma');

/**
 * 🛡️ Authentication Middleware
 * 
 * Acts as a bouncer for our API! It intercepts incoming requests to protected routes,
 * checks if the user has a valid VIP pass (JWT Access Token), and either lets them in
 * or kicks them out with a 401 Unauthorized error.
 */
const authenticate = async (req, res, next) => {
  try {
    // 1️⃣ Check if they even brought their VIP pass
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // 2️⃣ Extract the actual token string (removing the "Bearer " prefix)
    const token = authHeader.split(' ')[1];
    
    // 3️⃣ Verify the token signature mathematically using our secret key
    // If it's expired or forged, this throws an error that drops down to the catch block!
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    // 4️⃣ Fetch the user from the database to ensure they haven't been deleted
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, name: true, email: true, avatar: true }, // Don't fetch the password!
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // 5️⃣ Success! Attach the user object to the request so the controller can use it
    req.user = user;
    
    // 🚦 Open the gate! Let the request proceed to the next middleware or controller
    next();
  } catch (err) {
    // 💥 Token was expired, malformed, or tampered with
    next(err);
  }
};

module.exports = { authenticate };
