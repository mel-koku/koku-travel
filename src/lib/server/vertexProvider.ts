import "server-only";
import { createVertex } from "@ai-sdk/google-vertex";

function buildVertexProvider() {
  const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

  return createVertex({
    project:
      process.env.GOOGLE_VERTEX_PROJECT ?? "project-8a1fb823-4da8-40e4-958",
    location: process.env.GOOGLE_VERTEX_LOCATION ?? "us-central1",
    ...(credentialsJson && {
      googleAuthOptions: {
        credentials: JSON.parse(credentialsJson),
      },
    }),
  });
}

export const vertex = buildVertexProvider();
