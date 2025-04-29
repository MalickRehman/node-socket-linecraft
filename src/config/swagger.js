import express from "express";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load Swagger document
const swaggerDocument = YAML.load(path.join(__dirname, "../../swagger.yaml"));

// Swagger setup function
export const setupSwagger = (app) => {
  // Serve Swagger UI
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

  // Serve Swagger document as JSON
  app.get("/swagger.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerDocument);
  });

  // Redirect root to API docs for convenience
  app.get("/", (req, res) => {
    res.redirect("/api-docs");
  });
};
