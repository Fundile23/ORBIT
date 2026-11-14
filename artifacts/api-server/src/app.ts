import express, { type Express, type ErrorRequestHandler } from "express";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import { CLERK_PROXY_PATH, clerkProxyMiddleware, getClerkProxyHost } from "./middlewares/clerkProxyMiddleware";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());
app.use(express.json({ limit: "128kb" }));
app.use(express.urlencoded({ extended: true }));
app.use(clerkMiddleware((req) => ({
  publishableKey: publishableKeyFromHost(getClerkProxyHost(req) ?? "", process.env.CLERK_PUBLISHABLE_KEY),
})));
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "same-origin");
  next();
});

app.use("/api", router);

const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (res.headersSent) { res.end(); return; }
  // Validation errors include private input; never log the error or its payload.
  if (err?.name === "ZodError" || err?.type === "entity.parse.failed") {
    res.status(400).json({ error: "Some fields are invalid. Please check your input." }); return;
  }
  if (err?.type === "entity.too.large") {
    res.status(413).json({ error: "This request is too large." }); return;
  }
  req.log.error("Request failed; sensitive error details omitted");
  res.status(500).json({ error: "ORBIT couldn't complete that request. Please try again." });
};
app.use(errorHandler);

export default app;
