<template>
  <footer class="site-footer">
    <span class="footer-brand">DECODE</span>
    <span class="footer-tagline text-12">
      DE.CO.DE IS AN OPEN MULTIMEDIA GUIDE EXPLORING DISINFORMATION
    </span>
  </footer>
</template>

<style scoped>
.site-footer {
  position: relative;
  height: var(--footer-height);
  width: 100vw;
  border-top: 2px solid grey;
}

.footer-brand {
  /* Deliberately not Martian Mono (the body/tagline font) — no specific
     brand font was given, so a plain sans-serif stack stands in for now. */
  font-family: Arial, Helvetica, sans-serif;
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
}

.footer-tagline {
  /* Absolutely centered on the viewport width, not just the remaining
     space next to .footer-brand (a 1fr/auto/1fr grid looked centered but
     wasn't: the empty right track and the DECODE-sized left track aren't
     actually equal, so the middle column drifts off true center). */
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  text-transform: uppercase;
  font-weight: 400;
  white-space: nowrap;
}
</style>
