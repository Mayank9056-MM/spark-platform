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
    {
      name: 'spark-worker',
      cwd: '/home/ubuntu/apps/spark-platform/apps/api',
      script: 'dist/workers/worker.bootstrap.js',
      interpreter: 'node',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
