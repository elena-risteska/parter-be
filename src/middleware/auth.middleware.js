import jwt from "jsonwebtoken";

export const protect = (req, res, next) => {
  let token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({ message: "Not authorized" });
  }

  // remove "Bearer " if you sent token as "Bearer <token>"
  if (token.startsWith("Bearer ")) {
    token = token.split(" ")[1];
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // contains id, email, or whatever you put in payload
    next();
  } catch (err) {
    res.status(401).json({ message: "Token invalid" });
  }
};
