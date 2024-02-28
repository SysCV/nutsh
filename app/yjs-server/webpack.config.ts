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
};

// eslint-disable-next-line import/no-default-export -- fine
export default config;
