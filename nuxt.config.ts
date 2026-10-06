export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  extends: ['../DECODE'],
  css: ['~/assets/css/main.css'],
  // useKirbyPageAnyTemplate makes two sequential `useKql` calls (each
  // calling `useRuntimeConfig()`) inside one useAsyncData callback —
  // without this, the Nuxt instance context is lost after the first
  // `await`, and the second composable call fails outside dev (where Nuxt
  // otherwise tolerates it via a fallback instance).
  experimental: {
    asyncContext: true,
  },
  runtimeConfig: {
    // Server-only — optional Basic Auth for the KQL endpoint. Leave unset
    // locally: DECODE.cms/site/config/config.php has `kql.auth` disabled.
    kqlUser: '',
    kqlPassword: '',
    public: {
      // Base URL of the DECODE.cms Kirby instance, e.g. http://decode-cms.test
      cmsUrl: '',
    },
  },
})
