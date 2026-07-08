# Varful Hikes Partner API Demo

## Purpose

This project is a mock Node.js server demonstrating how a partner can securely retrieve our hikes data in JSON format. It utilizes the OAuth2 Client Credentials flow for secure server-to-server communication with the Varful API.

> Don't create a new access token for each API call. Instead, cache and reuse it; one single access token lasts for 10 hours.

## Input and Output

### Input Queries

You can optionally filter the retrieved hikes by specifying a circular search area using query parameters:

- **`start_longitude`**: The longitude of the search area center (must be a number between `-180` and `180`).
- **`start_latitude`**: The latitude of the search area center (must be a number between `-90` and `90`).
- **`start_radius`**: The radius of the search area in kilometers (must be a positive number).

**Important Validation Rules:**

- If you want to filter by location, **both** `start_longitude` and `start_latitude` must be provided together.
- The `start_radius` parameter can only be used if both coordinates are provided.
- If coordinates are provided but `start_radius` is omitted, the radius defaults to **100 km**.

### Output

The API responds with a JSON array containing the hike objects that match your filters. Each object includes detailed information about the hike, such as its title, track details, scheduled dates, and other metadata.

## Setup Instructions

To run this demo locally, follow these steps:

1. **Obtain Credentials:** Contact the Varful team to receive your unique `CLIENT_ID` and `CLIENT_SECRET`.
2. **Configure Environment:** Create a `.env` file in the root of this directory (`hikes/.env`) and populate it with your credentials:
   ```env
   CLIENT_ID=your_client_id_here
   CLIENT_SECRET=your_client_secret_here
   VARFUL_HOST=https://varful.ro
   ```
3. **Install Dependencies:**
   ```bash
   npm i
   ```
4. **Run the Demo:**
   ```bash
   npm run dev
   ```

## References

- [Our Website](https://varful.ro)
- [Our Terms and Conditions](https://varful.ro/termeni-si-conditii/)
- [OAuth 2.0 Client Credentials Grant](https://oauth.net/2/grant-types/client-credentials/)
