# Bus Time Table Management

## MongoDB and Flutter API

The Flutter app reads and writes data through the Node API; it must not connect directly to MongoDB. Copy `.env.example` to `.env`, replace the MongoDB username, password, and Atlas connection string, then start the API from the project root:

```bash
npm install
npm start
```

The Flutter API URL is configured at the top of `flutter_app/lib/main.dart` in `baseUrl`. For a local API, use `http://10.0.2.2:8000/api` on the Android emulator, `http://localhost:8000/api` on desktop, or your computer's LAN address on a physical phone.

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

Open index.html in a browser, or serve the folder with a simple static server:

```bash
python -m http.server 8000
```

Then browse to http://localhost:8000.
