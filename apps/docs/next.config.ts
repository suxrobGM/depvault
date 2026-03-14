import nextra from "nextra";

const withNextra = nextra({});

export default withNextra({
  output: "standalone",
  turbopack: {
    resolveAlias: {
      "next-mdx-import-source-file": "./mdx-components.tsx",
    },
  },
});
