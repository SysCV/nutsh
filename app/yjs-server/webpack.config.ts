import path from "node:path";
import type { Configuration } from "webpack";

const config: Configuration = {
  target: "node",
  mode: "production",
  entry: path.resolve(__dirname, "src", "index.ts"),
  output: {
    path: path.join(__dirname, "dist"),
    filename: "yjs-server.js",
    clean: true,
  },
  resolve: {
    extensions: [".ts", ".js"],
    alias: {
      "@@frontend": path.resolve(__dirname, "../frontend/src/"),
    },
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  externals: {
    // Node native addons need to be packed specially. Also check `pkg.json`
    // https://stackoverflow.com/questions/46465037/how-to-package-sqlite3-in-node-js-executable-packages
    // https://github.com/TryGhost/node-sqlite3/issues/698#issuecomment-354129269
    sqlite3: "commonjs sqlite3",
  },
};

// eslint-disable-next-line import/no-default-export -- fine
export default config;
