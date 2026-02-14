import vue from "@vitejs/plugin-vue";
import path from "path";
import AutoImport from "unplugin-auto-import/vite";
import Components from "unplugin-vue-components/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    vue(),
    Components({
      deep: true,
      dirs: ["src/shared/ui"],
      dts: true
    }),
    AutoImport({
      imports: ["vue", "vue-router"],
      include: [
        /\.[tj]sx?$/,
        /\.vue$/,
        /\.vue\?vue/
      ],
      dts: true
    })
  ],
  define: {
    global: "globalThis",
    "process.env": {},
    "process.browser": true,
    "process.version": JSON.stringify(""),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@app": path.resolve(__dirname, "./src/app"),
      "@pages": path.resolve(__dirname, "./src/pages"),
      "@widgets": path.resolve(__dirname, "./src/widgets"),
      "@features": path.resolve(__dirname, "./src/features"),
      "@entities": path.resolve(__dirname, "./src/entities"),
      "@shared": path.resolve(__dirname, "./src/shared"),
      buffer: "buffer",
      stream: "stream-browserify",
    }
  }
});
