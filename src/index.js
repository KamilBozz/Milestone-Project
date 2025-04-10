const http = require("http");
const handler = require("./handler.js");

const PORT = process.env.PORT || 3000;

http
  .createServer(handler)
  .listen(PORT, () => console.log(`Server is running at ${PORT}`));