const dotenv = require("dotenv");
const fs = require("fs").promises;
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
}).catch((error) => {
  console.error(error);
});

/**
 * We recommend to NOT create an access token for each API call.
 * Instead cache and reuse it, one single access token lasts for 30 days.
 * Reading from file system is convinient for the demo, use a better caching mechanism in production.
 */
async function main() {
  const encodedCredentials = btoa(`${config.clientId}:${config.clientSecret}`);
  let accessToken = null;

  try {
    accessToken = (await fs.readFile(".token", "utf8")).trim();
  } catch (error) {
    console.log("Exchanging credentials and caching access token...");
    accessToken = await exchangeCredentialsForToken(encodedCredentials);
    await fs.writeFile(".token", accessToken);
  }

  try {
    console.log("Retrieving hikes with access token...");
    return await fetchWithAccess(accessToken, "GET");
  } catch (error) {
    if (error.status !== 401) {
      throw error;
    }

    console.log("Refreshing and caching a new access token...");
    accessToken = await exchangeCredentialsForToken(encodedCredentials);
    await fs.writeFile(".token", accessToken);

    console.log("Retrieving hikes with the new access token...");
    return await fetchWithAccess(accessToken, "GET");
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
    const error = new Error(
      `Fetch failed (${response.status}): ${errorText}`,
    );
    error.status = response.status;
    throw error;
  }

  return await response.json();
}
