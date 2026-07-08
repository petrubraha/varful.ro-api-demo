# Varful Hikes Partner API Demo

## Purpose

This project is a mock Node.js server demonstrating how a partner can securely retrieve our hikes data in JSON format. It utilizes the OAuth2 Client Credentials flow for secure server-to-server communication with the Varful API.

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
