module.exports = [
"[turbopack-node]/transforms/postcss.ts?config=[project]/landing/postcss.config.mjs { CONFIG => \"[project]/landing/postcss.config.mjs [postcss] (ecmascript)\" } [postcss] (ecmascript, async loader)", ((__turbopack_context__) => {

__turbopack_context__.v((parentImport) => {
    return Promise.all([
  "chunks/0s7c_1xn90jh._.js",
  "chunks/[root-of-the-server]__14v_72x._.js"
].map((chunk) => __turbopack_context__.l(chunk))).then(() => {
        return parentImport("[turbopack-node]/transforms/postcss.ts?config=[project]/landing/postcss.config.mjs { CONFIG => \"[project]/landing/postcss.config.mjs [postcss] (ecmascript)\" } [postcss] (ecmascript)");
    });
});
}),
];