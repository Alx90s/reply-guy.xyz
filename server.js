const express = require("express");
const path = require("path");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.WEB_PORT || 8080;

// Serve static files
app.use(express.static(path.join(__dirname, "/")));

// Route all requests to index.html for client-side routing
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Web application running on http://localhost:${PORT}`);
});
