const path = require('path');
const fs = require('fs');

// Get all task directories
const tasksDir = path.resolve(__dirname, 'extension/tasks');
const taskDirs = fs.existsSync(tasksDir) 
  ? fs.readdirSync(tasksDir).filter(f => {
      const fullPath = path.join(tasksDir, f);
      return fs.statSync(fullPath).isDirectory() && f !== 'common';
    })
  : [];

// Create entry points for each task
const entries = {};
taskDirs.forEach(taskDir => {
  const taskTsPath = path.join(tasksDir, taskDir, 'task.ts');
  if (fs.existsSync(taskTsPath)) {
    entries[`tasks/${taskDir}/index`] = taskTsPath;
  }
});

module.exports = {
  target: 'node',
  entry: entries,
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    libraryTarget: 'commonjs2'
  },
  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
      'common': path.resolve(__dirname, 'extension/tasks/common')
    }
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  externals: {
    'azure-pipelines-task-lib': 'commonjs azure-pipelines-task-lib',
    'azure-devops-node-api': 'commonjs azure-devops-node-api'
  },
  mode: 'production',
  devtool: 'source-map'
};

