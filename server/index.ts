import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import ConnectPgSimple from "connect-pg-simple";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { startCronScheduler } from "./cron";

const app = express();

// ✅ Health check endpoint - SAMO /health
// Root endpoint '/' je rezervisan za React aplikaciju
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// ✅ 2. Session validation check
if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
  console.error('FATAL: SESSION_SECRET must be set and at least 32 characters long');
  console.error('Generate a strong secret with: openssl rand -base64 32');
  process.exit(1);
}

// ✅ 3. Session middleware (nakon health check!)
const PgSession = ConnectPgSimple(session);
app.use(
  session({
    store: new PgSession({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Secure cookies in production (HTTPS)
      sameSite: "lax",
    },
  })
);

// Extend session type
declare module "express-session" {
  interface SessionData {
    userId: string;
    userRole: string;
  }
}

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}

// ✅ 4. Ostali middleware
app.use(express.json({
  limit: '50mb',
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// ✅ 5. Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// ✅ 6. Register routes i start server
(async () => {
  const server = await registerRoutes(app);

  // Error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Vite ili static serving
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const PORT = Number(process.env.PORT) || 5000;
  
  // ❌ NE OVAKO (pre server.listen)
  // await initializeDatabase();
  // startCronScheduler();
  
  // ✅ OVAKO (nakon server.listen)
  server.listen({
    port: PORT,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`Server running on port ${PORT}`);
    
    // ✅ Delay cron scheduler to ensure health checks pass first
    if (process.env.NODE_ENV === 'production') {
      console.log('[STARTUP] Delaying cron scheduler initialization for 10 seconds...');
      setTimeout(() => {
        console.log('[STARTUP] Starting cron scheduler now...');
        startCronScheduler();
      }, 10000); // 10 second delay
    }
  });
})();
