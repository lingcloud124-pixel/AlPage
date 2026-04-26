module.exports = {
  apps: [
    {
      name: 'theme-studio',
      cwd: './server',
      script: './node_modules/.bin/tsx',
      args: 'src/index.ts',
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      watch: false,
      max_memory_restart: '512M',
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
