import { createRequire } from "module";
import path from "path";

globalThis.__tw_resolve = (id, base) => {
  // Use process.cwd() to resolve from the real physical folder instead of Turbopack's virtual [project] path
  const realBase = path.join(process.cwd(), "package.json");
  const req = createRequire(realBase);
  return req.resolve("tailwindcss/index.css");
};

const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
