import jsonServer from "json-server";
import { readFileSync } from "node:fs";

const server = jsonServer.create();
const router = jsonServer.router("mock/db.json");
const middlewares = jsonServer.defaults();

// Basic middlewares
server.use(middlewares);
server.use(jsonServer.bodyParser);

// Rewrite /api/* to json-server's root routes (e.g. /api/users -> /users)
server.use(
  jsonServer.rewriter({
    "/api/*": "/$1"
  })
);

// Optional: fake login at POST /api/users/login
server.post("/api/users/login", (req, res) => {
  const { username, password } = req.body || {};
  const db = JSON.parse(readFileSync("mock/db.json", "utf-8"));
  const user = (db.users || []).find((u) => u.username === username);

  // Super simple check: accept password "demo123"
  if (user && password === "demo123") {
    return res.jsonp({
      token: "mock-token-abc",
      user: { id: user.id, username: user.username, email: user.email }
    });
  }
  return res.status(401).jsonp({ error: "Invalid credentials" });
});

// Mount all default REST routes (/users, /users/:id, etc.)
server.use(router);

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Mock API running on http://localhost:${PORT} (with /api/*)`);
});
