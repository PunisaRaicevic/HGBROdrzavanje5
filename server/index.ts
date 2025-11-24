import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import ConnectPgSimple from "connect-pg-simple";
import cors from "cors";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { startCronScheduler } from "./cron";
import { initializeFirebase } from "./services/firebase";

const app = express();

// GLOBAL LOGGING - hvata SVE zahtjeve
app.use((req, res, next) => {
  if (req.path.includes('fcm-token')) {
    console.log(`[GLOBAL MIDDLEWARE] ${req.method} ${req.path} - Auth: ${req.headers.authorization ? 'YES' : 'NO'}`);
  }
  next();
});

// ==========================================
// 1. CORS MORA BITI PRVI (Pre Session i JSON)
// ==========================================
app.use(cors({
  origin: true, // Dozvoli svim izvorima (bitno za mobilne app)
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  exposedHeaders: ['Set-Cookie']
}));

// Explicit OPTIONS handler za pre-flight zahteve
app.options('*', cors());

// Validate SESSION_SECRET on startup
if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
  // U produkciji ovo ne bi trebalo da ruši server ako je secret malo kraći, ali za warning je ok
  console.warn('WARNING: SESSION_SECRET should be at least 32 characters long');
}

// Session store setup
const PgSession = ConnectPgSimple(session);
app.use(
  session({
    store: new PgSession({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET || "default-dev-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      httpOnly: true,
      secure: false, // False je OBAVEZNO za Replit/Development/Hibridne app
      sameSite: "lax",
    },
  })
);

// Extend session type
declare module "express-session" {
  interface SessionData {
    userId: string;
    userRole: string;
    username?: string;
    fullName?: string;
  }
}

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}

// ==========================================
// 2. BODY PARSERI (JSON & URL)
// ==========================================
app.use(express.json({
  limit: '50mb',
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));

app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// Logging Middleware
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

(async () => {
  // Inicijalizuj Firebase za push notifikacije
  initializeFirebase();

  const server = await registerRoutes(app);

  // ==========================================
  // 3. GLOBAL ERROR HANDLER (Popravljen)
  // ==========================================
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    // Ignoriši greške "stream not readable" da ne ruše logove bezveze
    if (err.code === 'stream is not readable' || err.type === 'stream.not.readable') {
      console.warn("Network interruption detected (client disconnected during upload)");
      return res.status(400).json({ message: "Bad Request - Connection Interrupted" });
    }

    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Server Error:", err); // Loguj grešku u konzolu da vidiš šta je
    res.status(status).json({ message });
    // OBRISANO: throw err; -> Ovo je rušilo server!
  });

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
    startCronScheduler();
  });
})();