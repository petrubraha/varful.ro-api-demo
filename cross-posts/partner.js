const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const dotenv = require("dotenv");
const express = require("express");
const cors = require("cors");

dotenv.config();

// --- Configuration Validation ---
const requiredEnv = [
  "CLIENT_ID",
  "CLIENT_SECRET",
  "REDIRECT_URI",
  "VARFUL_HOST",
];
const missingEnv = requiredEnv.filter((env) => !process.env[env]);
if (missingEnv.length > 0) {
  console.error(
    `FATAL: Missing required environment variables: ${missingEnv.join(", ")}`,
  );
  process.exit(1);
}

// Client and partner are synonyms.
const config = {
  clientPort: 3000,
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  redirectUri: process.env.REDIRECT_URI,
  varfulAuthorizeUrl: `${process.env.VARFUL_HOST}/o/authorize/`,
  varfulTokenUrl: `${process.env.VARFUL_HOST}/o/token/`,
  varfulApiUrl: `${process.env.VARFUL_HOST}/api/posts/`,
};

const app = express();

app.listen(config.clientPort, () => {
  console.log(`Mock Client running at http://localhost:${config.clientPort}`);
});

// --- Middleware ---
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Global Error Handler ---
app.use((err, req, res, next) => {
  console.error("[Global ErrorHandler]", err.message);
  res.status(500).json({
    status: "error",
    message: err.message || "Internal Server Error",
  });
});

// Internal storage (in-memory) to link authorization redirects with original data.
let codeVerifier;
let codeChallenge;
let postData;

// --- Route Handlers ---

/**
 * Initiates the OAuth2 PKCE flow.
 */
app.post("/api/partner/posts", (req, res) => {
  try {
    postData = req.body;
    console.log(
      "[POST /api/partner/posts] Storing pending post and generating PKCE.",
    );

    // Generate PKCE values.
    codeVerifier = crypto.randomBytes(64).toString("base64url");
    codeChallenge = crypto
      .createHash("sha256")
      .update(codeVerifier)
      .digest("base64url");

    // Redirect to remote authorization server.
    const authUrl = `${config.varfulAuthorizeUrl}?response_type=code&code_challenge=${codeChallenge}&code_challenge_method=S256&client_id=${config.clientId}&redirect_uri=${config.redirectUri}`;

    console.log(
      "[POST /api/partner/posts] Redirecting to authorization server.",
      authUrl,
    );

    res.set("Location", authUrl);
    res.status(302).send();
  } catch (error) {
    console.error("[POST Error]", error);
    res.status(500).send("Failed to initiate forward request.");
  }
});

/**
 * Either display the normal feed with latest posts, or handles the redirect from authorization server.
 */
app.get("/partner/posts", async (req, res, next) => {
  try {
    const { code, error: remoteError } = req.query;

    if (remoteError) {
      throw new Error(`Remote authorization error: ${remoteError}`);
    }

    // Normal feed with posts.
    if (!code) {
      console.log("[GET /partner/posts] Exchanging credentials for token...");
      const encodedCredentials = btoa(
        `${config.clientId}:${config.clientSecret}`,
      );
      const accessToken = await exchangeCredentialsForToken(encodedCredentials);

      // const posts = mockPosts();
      console.log("[GET /partner/posts] Retrieving posts with access token...");
      const posts = await fetchWithAccess(accessToken, "GET");
      const html = generateDynamicHtml(posts);
      return res.send(html);
    }

    if (!codeVerifier || !postData) {
      console.warn("[GET /partner/posts] Received code but lost session data.");
      return res
        .status(400)
        .send("Session expired or session lost. Please try again.");
    }

    console.log("[GET /partner/posts] Exchanging code for token...");
    const accessToken = await exchangeCodeForToken(code, codeVerifier);

    console.log("[GET /partner/posts] Forwarding post with access token...");
    const body = JSON.stringify(postData);
    const result = await fetchWithAccess(accessToken, "POST", body);

    // Clear data after use.
    console.log("[GET /partner/posts] Post forwarded successfully.", result);
    postData = null;
    codeVerifier = null;
    codeChallenge = null;

    res.send("Sync complete");
  } catch (error) {
    next(error);
  }
});

// --- HELPER FUNCTIONS ---

/**
 * Exchanges the code for an Access Token.
 */
async function exchangeCredentialsForToken(encodedCredentials) {
  const response = await fetch(config.varfulTokenUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${encodedCredentials}`,
      "Cache-Control": "no-cache",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token exchange failed (${response.status}): ${errorText}`);
  }

  const json = await response.json();
  return json.access_token;
}

/**
 * Exchanges the code for an Access Token.
 */
async function exchangeCodeForToken(code, codeVerifier) {
  const response = await fetch(config.varfulTokenUrl, {
    method: "POST",
    headers: {
      "Cache-Control": "no-cache",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      code_verifier: codeVerifier,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token exchange failed (${response.status}): ${errorText}`);
  }

  const json = await response.json();
  return json.access_token;
}

/**
 * Sends data to final destination with Bearer token.
 */
async function fetchWithAccess(accessToken, method, body = null) {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    ...(body && { "Content-Type": "application/json" }),
  };

  const response = await fetch(config.varfulApiUrl, {
    method: method,
    headers: headers,
    body: body,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Post forwarding failed (${response.status}): ${errorText}`,
    );
  }

  return await response.json();
}

/**
 * Generates dynamic HTML with posts.
 */
function generateDynamicHtml(posts) {
  const template = fs.readFileSync(path.join(__dirname, "user.html"), "utf8");
  const postsHtml = posts
    .map(
      (post) => `
    <div>
      <p>${post.location}</p>
      <p><strong>${post.user}</strong>: ${post.caption}</p>
      <img src="${post.image}" width="100" />
    </div>`,
    )
    .join("");

  return template.replace(
    "</body>",
    `<hr><h2>Latest Posts</h2>${postsHtml}</body>`,
  );
}

/**
 * Returns mock posts for testing.
 */
function mockPosts() {
  return [
    {
      user: "Andrei Popa",
      caption: "Morning sunrise at Moldoveanu peak. Simply breathtaking!",
      location: "Moldoveanu Peak, Făgăraș",
      image:
        "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400&q=80",
    },
    {
      user: "Elena Marinescu",
      caption:
        "Finally reached the top of Bucegi! The Sphinx looks even better in person.",
      location: "Bucegi Mountains",
      image:
        "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=400&q=80",
    },
    {
      user: "Radu Ionescu",
      caption:
        "Hiking through the clouds in Piatra Craiului. Challenging but rewarding.",
      location: "Piatra Craiului National Park",
      image:
        "https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=400&q=80",
    },
    {
      user: "Marta Stoica",
      caption: "A quiet moment by Bâlea Lake. Romania's gems are everywhere.",
      location: "Bâlea Lake, Transfăgărășan",
      image:
        "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=400&q=80",
    },
  ];
}
