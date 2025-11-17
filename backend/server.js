// backend/server.js
const http = require("http");
const app = require("./app");
const { setupChat } = require("./chat"); // <-- logique WebSocket du chat

const PORT = process.env.PORT || 8000;

// Crée le serveur HTTP à partir de ton app Express
const server = http.createServer(app);

// Attache le chat WebSocket sur le même serveur HTTP
setupChat(server);

// Démarre le serveur complet (API + WebSocket)
server.listen(PORT, () => {
  console.log(`🚀 Backend HTTP + WebSocket running on http://localhost:${PORT}`);
  console.log(`💬 Chat disponible sur ws://localhost:${PORT}/chat`);
});