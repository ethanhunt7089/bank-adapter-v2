module.exports = {
  apps: [
    {
      name: "bank-adapter-v2",
      script: "npm",
      args: "run start:prod", // ใช้ start:prod แทน start:dev
      exec_mode: "fork",
      cwd: ".",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        TZ: "Asia/Bangkok",
      },
      env_production: {
        NODE_ENV: "production",
        TZ: "Asia/Bangkok",
      },
    },
  ],
};
