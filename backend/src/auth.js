import jwt from "jsonwebtoken";

export function requireAuth(req, res, next) {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ error: "unauthorized" });

    const payload = jwt.verify(token, process.env.JWT_SECRET || "dev_secret");

    // IMPORTANT: login signe { uid: user._id }, on lit EXACTEMENT 'uid'
    const uid = payload?.uid;
    if (!uid) return res.status(401).json({ error: "unauthorized" });

    req.auth = { uid }; // ex: "68f932097630f767845262a2"
    next();
  } catch (e) {
    return res.status(401).json({ error: "unauthorized" });
  }
}
