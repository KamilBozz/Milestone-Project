const fs = require("fs");
const path = require("path");
const ejs = require("ejs");
const { DEFAULT_HEADER } = require("./util/util");

const controller = {
  getFormPage: (request, response) => {
    response.writeHead(200, DEFAULT_HEADER);
    response.end(`
      <h1>Hello World</h1>
      <style> h1 { color: red; } </style>
      <form action="/form" method="post">
        <input type="text" name="username" /><br />
        <input type="text" name="password" /><br />
        <input type="submit" value="Upload" />
      </form>
    `);
  },

  sendFormData: (request, response) => {
    let body = "";

    request.on("data", (data) => {
      body += data;
    });

    request.on("end", () => {
      const post = new URLSearchParams(body);
      console.log(Object.fromEntries(post));
      response.writeHead(200, DEFAULT_HEADER);
      response.end("Form data received!");
    });
  },

  getFeed: (request, response) => {
    const query = new URL(request.url, `http://${request.headers.host}`).searchParams;
    const username = query.get("username");

    if (!username) {
      response.writeHead(400, DEFAULT_HEADER);
      response.end("Username is required.");
      return;
    }

    const dataFilePath = path.join(__dirname, "../database/data.json");

    fs.readFile(dataFilePath, "utf8", (err, data) => {
      if (err) {
        console.error("Error reading data.json:", err);
        response.writeHead(500, DEFAULT_HEADER);
        response.end("Error loading user data.");
        return;
      }

      const users = JSON.parse(data);
      const user = users.find((u) => u.username === username);

      if (!user) {
        response.writeHead(404, DEFAULT_HEADER);
        response.end("User not found.");
        return;
      }

      const feedPagePath = path.join(__dirname, "views", "feedPage.ejs");
      ejs.renderFile(
        feedPagePath,
        {
          user,
        },
        (err, renderedHtml) => {
          if (err) {
            console.error("Error rendering feedPage.ejs:", err);
            response.writeHead(500, DEFAULT_HEADER);
            response.end("Error rendering feed page.");
            return;
          }

          response.writeHead(200, DEFAULT_HEADER);
          response.end(renderedHtml);
        }
      );
    });
  },

  uploadImages: (request, response) => {
    response.writeHead(200, DEFAULT_HEADER);
    response.end("Image upload functionality not implemented yet.");
  },
};

module.exports = controller;

