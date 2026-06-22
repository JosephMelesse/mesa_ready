import { createApp } from "./app.js";
import { connectDB } from "./config/db.js";
import { ensureSchema } from "./config/schema.js";

const PORT = Number(process.env.PORT) || 3001;

async function start() {
  await connectDB();
  await ensureSchema();
  const app = createApp();
  app.listen(PORT, "0.0.0.0", () =>
    console.log(`Server listening on port ${PORT}`),
  );
}

start().catch((err) => {
  console.error("Failed to connect to the database", err);
  process.exit(1);
});
