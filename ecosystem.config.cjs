module.exports = {
  apps: [
    {
      name: 'spark-api',
      cwd: '/home/ubuntu/apps/spark-platform/apps/api',
      script: 'dist/server.js',
      interpreter: 'node',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
