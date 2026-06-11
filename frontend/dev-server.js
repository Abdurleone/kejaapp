import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const preferredPort = Number(process.env.PORT || 5173);
const maxAttempts = 20;

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

const send = (res, statusCode, body, headers = {}) => {
  res.writeHead(statusCode, headers);
  res.end(body);
};

const sendFile = async (res, filePath) => {
  const body = await fs.readFile(filePath);
  const contentType = mimeTypes[path.extname(filePath)] || "application/octet-stream";
  send(res, 200, body, { "Content-Type": contentType });
};

const createServer = () =>
  http.createServer(async (req, res) => {
    try {
      const requestPath = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
      const safePath = path.normalize(requestPath).replace(/^(\.\.[/\\])+/, "");
      const filePath = path.join(root, safePath === "/" ? "index.html" : safePath);
      const relative = path.relative(root, filePath);

      if (relative.startsWith("..") || path.isAbsolute(relative)) {
        send(res, 403, "Forbidden");
        return;
      }

      await sendFile(res, filePath);
    } catch (error) {
      if (error.code === "ENOENT") {
        const requestPath = decodeURIComponent(new URL(req.url, "http://localhost").pathname);

        if (!path.extname(requestPath)) {
          await sendFile(res, path.join(root, "index.html"));
          return;
        }

        send(res, 404, "Not found");
        return;
      }

      send(res, 500, "Server error");
    }
  });

const listen = (port, attempt = 0) => {
  const server = createServer();

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE" && attempt < maxAttempts) {
      listen(port + 1, attempt + 1);
      return;
    }

    console.error(error.message);
    process.exit(1);
  });

  server.listen(port, () => {
    console.log(`KejaApp frontend running at http://localhost:${port}`);

    if (port !== preferredPort) {
      console.log(`Port ${preferredPort} was busy, so ${port} was selected.`);
    }
  });
};

listen(preferredPort);
