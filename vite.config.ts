import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { handlePlaces } from "./api/places";

function localPlacesApi(environment: Record<string, string>): Plugin {
  const run = (
    req: {
      url?: string;
      method?: string;
      headers: Record<string, string | string[] | undefined>;
    },
    res: {
      statusCode: number;
      setHeader(name: string, value: string): void;
      end(body?: string): void;
    },
    next: (error?: unknown) => void,
  ) => {
    let url: URL;
    try {
      url = new URL(
        req.url ?? "/",
        `http://${req.headers.host ?? "localhost"}`,
      );
    } catch {
      next();
      return;
    }
    if (url.pathname !== "/api/places") {
      next();
      return;
    }
    const outgoing = {
      status(code: number) {
        res.statusCode = code;
        return this;
      },
      setHeader(name: string, value: string) {
        res.setHeader(name, value);
      },
      json(value: unknown) {
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify(value));
      },
    };
    void handlePlaces(
      {
        method: req.method,
        query: Object.fromEntries(url.searchParams),
        headers: req.headers,
      },
      outgoing,
      environment,
    ).catch(next);
  };
  return {
    name: "local-places-api",
    configureServer(server) {
      server.middlewares.use((rawReq, rawRes, next) =>
        run(
          rawReq as unknown as Parameters<typeof run>[0],
          rawRes as unknown as Parameters<typeof run>[1],
          next,
        ),
      );
    },
    configurePreviewServer(server) {
      server.middlewares.use((rawReq, rawRes, next) =>
        run(
          rawReq as unknown as Parameters<typeof run>[0],
          rawRes as unknown as Parameters<typeof run>[1],
          next,
        ),
      );
    },
  };
}

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, ".", "");
  return {
    plugins: [
      react(),
      localPlacesApi({
        GEOAPIFY_API_KEY: environment.GEOAPIFY_API_KEY,
        ALLOWED_ORIGIN: environment.ALLOWED_ORIGIN,
      }),
      VitePWA({
        registerType: "prompt",
        includeAssets: ["icon-192.png", "icon-512.png"],
        manifest: {
          name: "Travel OS",
          short_name: "Travel OS",
          description: "Sua viagem, em um só lugar.",
          lang: "pt-BR",
          start_url: "/",
          scope: "/",
          display: "standalone",
          background_color: "#061321",
          theme_color: "#061321",
          icons: [
            {
              src: "/icon-192.png",
              sizes: "192x192",
              type: "image/png",
              purpose: "any",
            },
            {
              src: "/icon-512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any maskable",
            },
          ],
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,png,jpg,woff2,ttf}"],
          navigateFallback: "/index.html",
          navigateFallbackDenylist: [/^\/api\//],
          maximumFileSizeToCacheInBytes: 4000000,
        },
      }),
    ],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("/leaflet/")) return "maps";
            if (id.includes("/react/") || id.includes("/react-dom/"))
              return "react";
          },
        },
      },
    },
    server: { host: "0.0.0.0", watch: { usePolling: true, interval: 500 } },
  };
});
