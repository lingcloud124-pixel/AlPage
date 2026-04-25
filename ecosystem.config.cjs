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
      restart_delay: 3000,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
