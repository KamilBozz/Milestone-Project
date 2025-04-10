const formidable = require("formidable");
const { parse } = require("url");
const { DEFAULT_HEADER } = require("./util/util.js");
const controller = require("./controller");
const fs = require("fs");
const path = require("path");
const ejs = require("ejs");

const allRoutes = {
  // GET: localhost:3000
  "/:get": (request, response) => {
    const dataFilePath = path.join(__dirname, "..", "database", "data.json");
    const templateFilePath = path.join(__dirname, "views", "homePage.ejs");

    fs.readFile(dataFilePath, "utf8", (err, jsonData) => {
      if (err) {
        response.writeHead(500, DEFAULT_HEADER);
        response.end("Error loading user data.");
        return;
      }

      const users = JSON.parse(jsonData);

      ejs.renderFile(templateFilePath, { users }, (err, html) => {
        if (err) {
          response.writeHead(500, DEFAULT_HEADER);
          response.end("Error rendering the page.");
          return;
        }

        response.writeHead(200, DEFAULT_HEADER);
        response.end(html);
      });
    });
  },

  // GET: localhost:3000/photos?user={username}&image={filename}
  "/photos:get": (request, response) => {
    const { query } = parse(request.url, true);
    const { user, image } = query;

    if (!user || !image) {
      response.writeHead(400, { "Content-Type": "text/plain" });
      response.end("Missing user or image parameter.");
      return;
    }

    const imagePath = path.join(__dirname, "..", "src", "photos", user, image);

    fs.readFile(imagePath, (err, data) => {
      if (err) {
        response.writeHead(404, { "Content-Type": "text/plain" });
        response.end("Image not found.");
        return;
      }

      response.writeHead(200, { "Content-Type": "image/jpeg" });
      response.end(data);
    });
  },

  // GET: localhost:3000/form
  "/form:get": (request, response) => {
    controller.getFormPage(request, response);
  },

  // POST: localhost:3000/form
  "/form:post": (request, response) => {
    controller.sendFormData(request, response);
  },

  // POST: localhost:3000/images
"/images:post": (request, response) => {
  const fs = require("fs");
  const path = require("path");
  const { IncomingForm } = require("formidable");

  const uploadDir = path.join(__dirname, "..", "uploads");
  const dataFilePath = path.join(__dirname, "..", "database", "data.json");


  const form = new IncomingForm({
    uploadDir,
    keepExtensions: true,
    maxFileSize: 5 * 1024 * 1024,
    filter: ({ mimetype }) => mimetype && mimetype.startsWith("image/png"),
  });

  form.parse(request, (err, fields, files) => {
    if (err) {
      console.error("Error parsing the upload:", err);
      response.writeHead(500, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ error: "Internal server error!" }));
      return;
    }


    const username = fields.user[0];
    const uploadedFile = files.image[0];

    if (!username || !uploadedFile) {
      console.error("Missing username or file in the form data.");
      response.writeHead(400, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ error: "Missing username or file." }));
      return;
    }


    const newFileName = `${Date.now()}_${uploadedFile.originalFilename}`;
    const userFolder = path.join(__dirname, "..", "src", "photos", username);

    const newFilePath = path.join(userFolder, newFileName);

    fs.rename(uploadedFile.filepath, newFilePath, (renameErr) => {
      if (renameErr) {
        console.error("Error moving file:", renameErr);
        response.writeHead(500, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ error: "Failed to save the image." }));
        return;
      }


      fs.readFile(dataFilePath, "utf8", (readErr, data) => {
        if (readErr) {
          console.error("Error reading data.json:", readErr);
          response.writeHead(500, { "Content-Type": "application/json" });
          response.end(JSON.stringify({ error: "Failed to update the user data." }));
          return;
        }


        const users = JSON.parse(data);
        const user = users.find((u) => u.username === username);

        if (user) {
          user.photos.push(newFileName);

          fs.writeFile(dataFilePath, JSON.stringify(users, null, 2), (writeErr) => {
            if (writeErr) {
              console.error("Error updating data.json:", writeErr);
              response.writeHead(500, { "Content-Type": "application/json" });
              response.end(JSON.stringify({ error: "Failed to update the user data." }));
              return;
            }

            response.writeHead(200, { "Content-Type": "application/json" });
            response.end(JSON.stringify("Image uploaded successfully." ));
          });
        } else {
          console.error("User not found in data.json.");
          response.writeHead(404, { "Content-Type": "application/json" });
          response.end(JSON.stringify({ error: "User not found." }));
        }
      });
    });
  });
},



  // GET: localhost:3000/feed
  "/feed:get": (request, response) => {
    controller.getFeed(request, response);
  },

  // 404 routes
  default: (request, response) => {
    const templateFilePath = path.join(__dirname, "views", "404.ejs");

    // Render the EJS template for 404
    ejs.renderFile(templateFilePath, {}, (err, html) => {
      if (err) {
        response.writeHead(500, DEFAULT_HEADER);
        response.end("Error rendering the 404 page.");
        return;
      }

      response.writeHead(404, DEFAULT_HEADER);
      response.end(html);
    });
  },
};

function handler(request, response) {
  const { url, method } = request;

  const { pathname } = parse(url, true);

  const key = `${pathname}:${method.toLowerCase()}`;
  const chosen = allRoutes[key] || allRoutes.default;

  return Promise.resolve(chosen(request, response)).catch(
    handlerError(response)
  );
}


function handlerError(response) {
  return (error) => {
    console.error("Something bad has happened", error.stack);
    response.writeHead(500, DEFAULT_HEADER);
    response.write(
      JSON.stringify({
        error: "Internal server error!",
      })
    );
    return response.end();
  };
}

module.exports = handler;