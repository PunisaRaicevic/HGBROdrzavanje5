import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import ConnectPgSimple from "connect-pg-simple";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { startCronScheduler } from "./cron";

const app = express();

// Validate SESSION_SECRET on startup
if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
  console.error('FATAL: SESSION_SECRET must be set and at least 32 characters long');
  console.error('Generate a strong secret with: openssl rand -base64 32');
  process.exit(1);
}

// Session store setup
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
app.use(express.json({
  limit: '50mb',
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

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

// ✅ Health check endpoints MUST be registered FIRST (before routes and static serving)
// This ensures Replit deployment can verify the server is running quickly
app.get('/health', (req, res) => {
  // NE koristi database ovde!
  res.status(200).json({ status: 'ok' });
});

// Smart health check middleware for / endpoint
// Returns JSON for health checks, but allows HTML/static serving for browsers
app.get('/', (req, res, next) => {
  // Check if this is a health check request (not a browser)
  const acceptHeader = req.headers.accept || '';
  const userAgent = req.headers['user-agent'] || '';
  
  // If Accept header prefers JSON or is generic (*/*), and not a browser
  const isHealthCheck = (
    (acceptHeader.includes('application/json') || acceptHeader === '*/*') &&
    !acceptHeader.includes('text/html')
  );
  
  if (isHealthCheck) {
    // Respond immediately for health checks
    return res.status(200).json({ 
      status: 'ok',
      message: 'Server is running'
    });
  }
  
  // Otherwise, continue to static file serving (React app)
  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
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
    
    // ✅ Pokreni cron scheduler OVDE (nakon što server počne da sluša)
    if (process.env.NODE_ENV === 'production') {
      startCronScheduler();
    }
  });
})();
