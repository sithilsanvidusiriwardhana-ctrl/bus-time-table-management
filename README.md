# Bus Time Table Management

## MongoDB, Netlify Functions, and Flutter API

The repository is arranged as one Netlify site with a static frontend and an Express API function:

```text
foundend/                 static website
netlify/functions/api.js  Netlify Function entry point
backend/                  API routes, controllers, and MongoDB models
server.js                 shared Express app and local development entry point
```

The Flutter app reads and writes data through the API; it must not connect directly to MongoDB. Copy `.env.example` to `.env`, replace the MongoDB connection string, then start the API locally:

```bash
npm install
npm start
```

For Netlify, configure `MONGODB_URI` and `GOOGLE_MAPS_API_KEY` in **Site configuration > Environment variables**. Enable the Google Maps JavaScript API and restrict the browser key to your site’s referrers. Do not upload `.env` or put MongoDB credentials in Flutter. Netlify automatically publishes `foundend` and deploys `netlify/functions/api.js` according to `netlify.toml`.

The Flutter API URL is configured at the top of `flutter_app/lib/main.dart` through `API_BASE_URL`. For the deployed app, build with your Netlify site URL:

```bash
flutter run --dart-define=API_BASE_URL=https://YOUR-SITE.netlify.app/api
```

For local development, use `http://10.0.2.2:8000/api` on the Android emulator, `http://localhost:8000/api` on desktop, or your computer's LAN address on a physical phone.

The API endpoints used by Flutter are:

- `POST /api/users/login`
- `POST /api/passengers/register`
- `GET /api/shedulle`
- `POST /api/shedulle/register`
- `DELETE /api/shedulle/:id`
- `GET /api/drivers`
- `POST /api/drivers/register`

This project is a simple web-based bus timetable management site with three roles:

- Admin: add, edit, and delete schedules
- Driver: view assigned trips and update trip status
- Passenger: search available buses and view schedules

## Run locally

The login and other data features require the Express API. Do not open the HTML files directly with `file://` or serve them with a static-only server.

```bash
npm install
npm start
```

Set `MONGODB_URI` and `GOOGLE_MAPS_API_KEY` in `.env` before starting the server. Enable the Google Maps JavaScript API and restrict the browser key to your site’s referrers. Restart the server after changing `.env`. Then open http://localhost:8000/login.html in any browser. The frontend and API must use the same origin.
