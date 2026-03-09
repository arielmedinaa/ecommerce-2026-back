import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "schemas/prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["MARIA_DB_URL"],
  },
});
