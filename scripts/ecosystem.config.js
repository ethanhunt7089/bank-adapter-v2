module.exports = {
  apps: [
    {
      name: "payonex-token-refresh",
      script: "./refresh-payonex-tokens.js",
      instances: 1,
      exec_mode: "fork",
      cron_restart: "0 */20 * * *", // ทุก 20 ชั่วโมง
      autorestart: false, // ไม่ restart อัตโนมัติ เพราะเป็น cron job
      exec_interpreter: "node",
      kill_timeout: 5000,
      watch: false,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "production",
        TZ: "Asia/Bangkok",
      },
      env_development: {
        NODE_ENV: "development",
        TZ: "Asia/Bangkok",
      },
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      out_file: "../logs/payonex-refresh-out.log",
      error_file: "../logs/payonex-refresh-error.log",
      log_file: "../logs/payonex-refresh-combined.log",
      merge_logs: true,
    },
  ],
};
