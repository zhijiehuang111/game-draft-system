module.exports = {
  apps: [
    {
      name: "server",
      cwd: __dirname,
      script: "./apps/server/dist/index.js",
      interpreter: process.execPath,
      node_args: "--env-file=.env",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      max_memory_restart: "300M",
    },
  ],
};
