import { APP_VERSION } from "@/lib/app-version";

export function getOpenApiDocument() {
  return {
    openapi: "3.1.0",
    info: {
      title: "AI Commerce Discoverability Optimizer API",
      version: APP_VERSION,
      description:
        "Evidence-backed merchant audits and generated fix assets for AI commerce discoverability.",
    },
    servers: [{ url: "/" }],
    paths: {
      "/api/health": {
        get: {
          summary: "Health check",
          operationId: "getHealth",
          responses: {
            "200": {
              description: "Service is healthy",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: [
                      "status",
                      "service",
                      "version",
                      "timestamp",
                      "redis",
                    ],
                    properties: {
                      status: { type: "string", example: "ok" },
                      service: {
                        type: "string",
                        example: "commerce-optimizer",
                      },
                      version: { type: "string", example: APP_VERSION },
                      timestamp: {
                        type: "string",
                        format: "date-time",
                      },
                      redis: {
                        type: "string",
                        enum: ["configured", "missing"],
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/api/audit": {
        post: {
          summary: "Run audit",
          operationId: "postAudit",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["url"],
                  properties: {
                    url: {
                      type: "string",
                      format: "uri",
                      example: "https://www.allbirds.com",
                    },
                    turnstileToken: {
                      type: "string",
                      description:
                        "Cloudflare Turnstile token when ENABLE_TURNSTILE=true",
                    },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Audit completed",
            },
            "400": {
              description: "Invalid request",
            },
            "403": {
              description: "Turnstile verification failed or domain not supported",
            },
            "422": {
              description:
                "Domain failed ecommerce eligibility validation (scanStatus: invalid_non_ecommerce_site)",
            },
            "429": {
              description: "Rate limit exceeded",
            },
            "500": {
              description: "Audit failed",
            },
          },
        },
      },
      "/api/generate-fixes": {
        post: {
          summary: "Generate fixes",
          operationId: "postGenerateFixes",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["url"],
                  properties: {
                    url: {
                      type: "string",
                      format: "uri",
                      example: "https://www.allbirds.com",
                    },
                    turnstileToken: {
                      type: "string",
                      description:
                        "Cloudflare Turnstile token when ENABLE_TURNSTILE=true",
                    },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Fix assets generated",
            },
            "400": {
              description: "Invalid request",
            },
            "403": {
              description: "Turnstile verification failed or domain not supported",
            },
            "429": {
              description: "Rate limit exceeded",
            },
            "500": {
              description: "Fix generation failed",
            },
          },
        },
      },
    },
  };
}
