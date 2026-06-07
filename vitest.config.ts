import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        // 讓 @app/shared 解析到 src(對齊 server dev 的 --conditions=development),
        // 不必先 build dist 就能測。
        resolve: {
          conditions: ["development"],
        },
        test: {
          name: "server",
          root: "./apps/server",
          environment: "node",
          include: ["src/**/*.{test,spec}.ts"],
          env: {
            JWT_SECRET: "test-secret-do-not-use-in-prod",
          },
        },
      },
    ],
  },
});
