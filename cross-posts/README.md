# Oauth2 Example

user.html - represents the end user
client.js - represents our business partners/collaborators/affiliates

## Build

- start varful.ro's python server
- navigate to http://127.0.0.1:8000/o/applications/ to create a new application
- update the .env file with the client id and secret

```bash
python manage.py runserver
```

Start the "OAuth2 client" server.

```bash
npm install
npm run start
```

Open http://127.0.0.1:3000/partner/posts in your browser to start the simulation.
