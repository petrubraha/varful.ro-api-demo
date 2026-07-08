const dotenv = require("dotenv");
dotenv.config();

// --- Configuration Validation ---
const requiredEnv = [
  "CLIENT_ID",
  "CLIENT_SECRET",
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
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  varfulTokenUrl: `${process.env.VARFUL_HOST}/o/token/`,
  varfulApiUrl: `${process.env.VARFUL_HOST}/api/drumetii/`,
};

main().then((hikes) => {
  console.log(hikes);
});

async function main() {
  try {
    console.log("Exchanging credentials for token...");
    const encodedCredentials = btoa(
      `${config.clientId}:${config.clientSecret}`,
    );
    const accessToken = await exchangeCredentialsForToken(encodedCredentials);
    console.log("Retrieving posts with access token...");
    return await fetchWithAccess(accessToken, "GET");
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

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
      scope: "read",
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
async function fetchWithAccess(accessToken, method) {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
  };

  const response = await fetch(config.varfulApiUrl, {
    method: method,
    headers: headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Fetch failed (${response.status}): ${errorText}`,
    );
  }

  return await response.json();
}
