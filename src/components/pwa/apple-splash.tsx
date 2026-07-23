// Splash screens do iOS (apple-touch-startup-image). O React 19 iça os <link> pro <head>.
// Manter DEVICES em sync com scripts/gen-pwa-splash.mjs.
const DEVICES = [
  { w: 375, h: 667, dpr: 2 },
  { w: 414, h: 896, dpr: 2 },
  { w: 414, h: 896, dpr: 3 },
  { w: 375, h: 812, dpr: 3 },
  { w: 360, h: 780, dpr: 3 },
  { w: 390, h: 844, dpr: 3 },
  { w: 428, h: 926, dpr: 3 },
  { w: 393, h: 852, dpr: 3 },
  { w: 430, h: 932, dpr: 3 },
];

export function AppleSplash() {
  return (
    <>
      {DEVICES.map((d) => {
        const pw = d.w * d.dpr;
        const ph = d.h * d.dpr;
        const media = `(device-width: ${d.w}px) and (device-height: ${d.h}px) and (-webkit-device-pixel-ratio: ${d.dpr}) and (orientation: portrait)`;
        return (
          <link
            key={`${pw}x${ph}`}
            rel="apple-touch-startup-image"
            media={media}
            href={`/splash/splash-${pw}x${ph}.png`}
          />
        );
      })}
    </>
  );
}
