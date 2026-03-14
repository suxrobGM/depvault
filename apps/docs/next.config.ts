import nextra from "nextra";

const withNextra = nextra({});

export default withNextra({
  basePath: "/docs",
  output: "standalone",
  turbopack: {
    resolveAlias: {
      "next-mdx-import-source-file": "./mdx-components.tsx",
    },
  },
});
