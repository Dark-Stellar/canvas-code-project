import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// Plugin to make CSS non-render-blocking
function nonBlockingCss(): Plugin {
  return {
    name: 'non-blocking-css',
    transformIndexHtml(html) {
      // Transform CSS links to use media="print" with onload trick
      return html.replace(
        /<link rel="stylesheet" crossorigin href="([^"]+\.css)">/g,
        '<link rel="stylesheet" crossorigin href="$1" media="print" onload="this.media=\'all\'">' +
        '<noscript><link rel="stylesheet" href="$1"></noscript>'
      );
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    mode === "production" && nonBlockingCss(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React bundle
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // UI framework
          'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-popover', '@radix-ui/react-select', '@radix-ui/react-tabs', '@radix-ui/react-tooltip'],
          // Charts - loaded only when needed
          'vendor-charts': ['recharts'],
          // Date utilities
          'vendor-date': ['date-fns'],
          // Supabase
          'vendor-supabase': ['@supabase/supabase-js'],
        },
      },
    },
  },
}));
