module.exports = {
  apps: [
    {
      name: 'server',
      script: './server.js',
      env: {
        USE_HTTPS: 'true',
        PORT: 443,
        NODE_ENV: 'production'
      }
    }
  ]
};
