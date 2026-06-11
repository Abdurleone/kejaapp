import { once } from "node:events";
import { PassThrough, Writable } from "node:stream";
import app from "../../app.js";

class MockResponse extends Writable {
  constructor() {
    super();
    this.bodyChunks = [];
    this.headers = new Map();
    this.statusCode = 200;
    this.headersSent = false;
    this.setHeader = (name, value) => {
      this.headers.set(name.toLowerCase(), value);
    };
    this.getHeader = (name) => this.headers.get(name.toLowerCase());
    this.getHeaders = () => Object.fromEntries(this.headers);
    this.removeHeader = (name) => {
      this.headers.delete(name.toLowerCase());
    };
    this.writeHead = (statusCode, headers = {}) => {
      this.statusCode = statusCode;
      this.headersSent = true;

      for (const [name, value] of Object.entries(headers)) {
        this.setHeader(name, value);
      }
    };
    this.write = (chunk) => {
      if (chunk) {
        this.bodyChunks.push(Buffer.from(chunk));
      }

      return true;
    };
    this.end = (chunk) => {
      if (chunk) {
        this.bodyChunks.push(Buffer.from(chunk));
      }

      this.headersSent = true;
      this.emit("finish");
      this.emit("close");
    };
  }

  _write(chunk, encoding, callback) {
    this.bodyChunks.push(Buffer.from(chunk));
    callback();
  }

}

const request = async (path, options = {}) => {
  const req = new PassThrough();
  const res = new MockResponse();
  const body = options.body || "";
  const socket = new PassThrough();

  req.method = options.method || "GET";
  req.url = path;
  req.originalUrl = path;
  req.headers = Object.entries({
    host: "127.0.0.1",
    ...(body ? { "content-type": "application/json" } : {}),
    ...(body ? { "content-length": Buffer.byteLength(body) } : {}),
    ...(options.headers || {}),
  }).reduce((headers, [name, value]) => {
    headers[name.toLowerCase()] = value;
    return headers;
  }, {});
  req.connection = socket;
  req.socket = socket;

  for (const method of [
    "_destroy",
    "_final",
    "_flush",
    "_read",
    "_transform",
    "_write",
    "destroy",
    "emit",
    "end",
    "on",
    "once",
    "pause",
    "pipe",
    "read",
    "resume",
    "unpipe",
    "write",
  ]) {
    if (typeof req[method] === "function") {
      req[method] = req[method].bind(req);
    }
  }

  const finished = once(res, "finish");
  app.handle(req, res);
  req.end(body);

  await finished;

  const text = Buffer.concat(res.bodyChunks).toString("utf8");

  return {
    body: text ? JSON.parse(text) : null,
    headers: res.getHeaders(),
    status: res.statusCode,
  };
};

export default request;
