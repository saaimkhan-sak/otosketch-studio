export function AtlasIllustrationDefs({ idPrefix }: { idPrefix: string }) {
  const id = (name: string) => `${idPrefix}-atlas-${name}`;
  return (
    <defs>
      <radialGradient id={id("paper")} cx="48%" cy="44%" r="67%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="72%" stopColor="#fffdfb" />
        <stop offset="100%" stopColor="#f7eee9" />
      </radialGradient>
      <radialGradient id={id("field-glow")} cx="50%" cy="48%" r="54%">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
        <stop offset="72%" stopColor="#eab1aa" stopOpacity="0.14" />
        <stop offset="100%" stopColor="#d97c78" stopOpacity="0" />
      </radialGradient>
      <linearGradient id={id("skin")} gradientUnits="userSpaceOnUse" x1="160" y1="54" x2="790" y2="470">
        <stop offset="0%" stopColor="#fff0e8" />
        <stop offset="22%" stopColor="#f4b7ac" />
        <stop offset="58%" stopColor="#d98780" />
        <stop offset="82%" stopColor="#f3b2a8" />
        <stop offset="100%" stopColor="#fff2eb" />
      </linearGradient>
      <linearGradient id={id("canal")} gradientUnits="userSpaceOnUse" x1="205" y1="60" x2="720" y2="455">
        <stop offset="0%" stopColor="#f8c4b8" />
        <stop offset="38%" stopColor="#c97974" />
        <stop offset="64%" stopColor="#8f4e53" />
        <stop offset="100%" stopColor="#edaaa0" />
      </linearGradient>
      <radialGradient id={id("tm")} cx="44%" cy="38%" r="70%">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.97" />
        <stop offset="26%" stopColor="#e9edf7" stopOpacity="0.92" />
        <stop offset="58%" stopColor="#cfd5e5" stopOpacity="0.9" />
        <stop offset="82%" stopColor="#aeb3c7" stopOpacity="0.92" />
        <stop offset="100%" stopColor="#70768d" stopOpacity="0.96" />
      </radialGradient>
      <linearGradient id={id("tm-side")} gradientUnits="userSpaceOnUse" x1="120" y1="80" x2="650" y2="420">
        <stop offset="0%" stopColor="#fffefe" />
        <stop offset="42%" stopColor="#dfe7ee" />
        <stop offset="66%" stopColor="#aebbc8" />
        <stop offset="100%" stopColor="#f9fbfc" />
      </linearGradient>
      <linearGradient id={id("bone")} gradientUnits="userSpaceOnUse" x1="125" y1="42" x2="850" y2="474">
        <stop offset="0%" stopColor="#fffdf3" />
        <stop offset="28%" stopColor="#f6e6c9" />
        <stop offset="62%" stopColor="#d9b789" />
        <stop offset="84%" stopColor="#f2ddba" />
        <stop offset="100%" stopColor="#fffaf0" />
      </linearGradient>
      <linearGradient id={id("bone-cut")} gradientUnits="userSpaceOnUse" x1="250" y1="70" x2="830" y2="450">
        <stop offset="0%" stopColor="#fff6e7" />
        <stop offset="42%" stopColor="#e1b887" />
        <stop offset="68%" stopColor="#9e6859" />
        <stop offset="100%" stopColor="#f4d9b7" />
      </linearGradient>
      <linearGradient id={id("ossicle")} gradientUnits="userSpaceOnUse" x1="300" y1="105" x2="700" y2="410">
        <stop offset="0%" stopColor="#fff8e8" />
        <stop offset="28%" stopColor="#f5d69f" />
        <stop offset="58%" stopColor="#c58a4b" />
        <stop offset="82%" stopColor="#f2c982" />
        <stop offset="100%" stopColor="#9a6033" />
      </linearGradient>
      <radialGradient id={id("cavity")} cx="52%" cy="46%" r="63%">
        <stop offset="0%" stopColor="#d29a8c" />
        <stop offset="50%" stopColor="#9b5a59" />
        <stop offset="86%" stopColor="#633944" />
        <stop offset="100%" stopColor="#3e2935" />
      </radialGradient>
      <linearGradient id={id("mucosa")} gradientUnits="userSpaceOnUse" x1="260" y1="90" x2="760" y2="430">
        <stop offset="0%" stopColor="#f7c6b9" />
        <stop offset="26%" stopColor="#d58f86" />
        <stop offset="58%" stopColor="#9f5f63" />
        <stop offset="82%" stopColor="#d4938a" />
        <stop offset="100%" stopColor="#f3c2b3" />
      </linearGradient>
      <linearGradient id={id("bone-deep")} gradientUnits="userSpaceOnUse" x1="350" y1="95" x2="760" y2="430">
        <stop offset="0%" stopColor="#f7d8b4" />
        <stop offset="38%" stopColor="#c79269" />
        <stop offset="72%" stopColor="#80544f" />
        <stop offset="100%" stopColor="#4b343f" />
      </linearGradient>
      <radialGradient id={id("perforation")} cx="48%" cy="55%" r="58%">
        <stop offset="0%" stopColor="#a95759" />
        <stop offset="58%" stopColor="#783740" />
        <stop offset="100%" stopColor="#3f202a" />
      </radialGradient>
      <linearGradient id={id("fascia")} x1="12%" y1="5%" x2="86%" y2="94%">
        <stop offset="0%" stopColor="#f4e7ce" stopOpacity="0.94" />
        <stop offset="34%" stopColor="#cfb889" stopOpacity="0.9" />
        <stop offset="62%" stopColor="#ae9568" stopOpacity="0.92" />
        <stop offset="100%" stopColor="#eadbb8" stopOpacity="0.96" />
      </linearGradient>
      <linearGradient id={id("cartilage")} x1="8%" y1="0%" x2="90%" y2="100%">
        <stop offset="0%" stopColor="#e9d7a4" />
        <stop offset="45%" stopColor="#bfa868" />
        <stop offset="74%" stopColor="#8f793f" />
        <stop offset="100%" stopColor="#dac58b" />
      </linearGradient>
      <linearGradient id={id("fat")} x1="10%" y1="5%" x2="88%" y2="94%">
        <stop offset="0%" stopColor="#fff5b8" />
        <stop offset="44%" stopColor="#e8c665" />
        <stop offset="100%" stopColor="#c99b35" />
      </linearGradient>
      <linearGradient id={id("metal")} x1="6%" y1="0%" x2="92%" y2="100%">
        <stop offset="0%" stopColor="#f7fdff" />
        <stop offset="20%" stopColor="#a9d9e8" />
        <stop offset="48%" stopColor="#4b93ad" />
        <stop offset="68%" stopColor="#d8f3f8" />
        <stop offset="100%" stopColor="#326f87" />
      </linearGradient>
      <linearGradient id={id("cement")} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ffe0a4" />
        <stop offset="46%" stopColor="#d28a39" />
        <stop offset="74%" stopColor="#9b5826" />
        <stop offset="100%" stopColor="#f2b968" />
      </linearGradient>
      <radialGradient id={id("cholesteatoma")} cx="36%" cy="28%" r="72%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="40%" stopColor="#fffdf1" />
        <stop offset="78%" stopColor="#d7ccb9" />
        <stop offset="100%" stopColor="#8f7a70" />
      </radialGradient>
      <linearGradient id={id("nerve")} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fff9a5" />
        <stop offset="48%" stopColor="#efca42" />
        <stop offset="100%" stopColor="#ba8424" />
      </linearGradient>
      <linearGradient id={id("sinus")} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#c7dded" />
        <stop offset="52%" stopColor="#779ab8" />
        <stop offset="100%" stopColor="#49677f" />
      </linearGradient>
      <radialGradient id={id("cochlea")} cx="42%" cy="38%" r="70%">
        <stop offset="0%" stopColor="#fff8e7" />
        <stop offset="42%" stopColor="#ebcfa4" />
        <stop offset="76%" stopColor="#ba8b68" />
        <stop offset="100%" stopColor="#774f4c" />
      </radialGradient>
      <linearGradient id={id("balloon")} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#e8fbfb" stopOpacity="0.82" />
        <stop offset="42%" stopColor="#7ec9c7" stopOpacity="0.72" />
        <stop offset="100%" stopColor="#2e8587" stopOpacity="0.8" />
      </linearGradient>
      <pattern id={id("fascia-fibers")} width="94" height="82" patternUnits="userSpaceOnUse" patternTransform="rotate(-12)">
        <path d="M-8 14 C18 4 44 23 102 8 M-12 38 C24 25 57 47 108 31 M-6 64 C31 48 63 73 103 57" stroke="#756246" strokeOpacity="0.22" strokeWidth="1.25" fill="none" />
        <path d="M6 24 C33 17 65 31 91 20 M18 75 C47 64 71 78 102 68" stroke="#fff9eb" strokeOpacity="0.34" strokeWidth="1.05" fill="none" />
      </pattern>
      <pattern id={id("bone-speckle")} width="112" height="94" patternUnits="userSpaceOnUse">
        <path d="M8 19 C18 9 31 12 35 21 C38 31 28 39 17 35 C8 32 4 25 8 19 Z M62 13 C71 7 83 11 84 20 C85 28 75 33 67 29 C60 26 57 18 62 13 Z M39 58 C48 48 63 52 66 63 C68 73 56 80 46 75 C37 71 33 64 39 58 Z M83 65 C93 56 108 61 109 72 C110 82 97 87 88 82 C80 78 77 70 83 65 Z" fill="#a8785f" fillOpacity="0.18" />
        <path d="M18 24 C25 19 31 21 33 25 M47 63 C54 58 62 61 64 66 M89 70 C96 65 103 68 106 74" stroke="#fff8e7" strokeOpacity="0.4" strokeWidth="1.3" fill="none" />
      </pattern>
      <pattern id={id("cartilage-hatch")} width="74" height="68" patternUnits="userSpaceOnUse" patternTransform="rotate(18)">
        <path d="M-5 12 C18 5 42 19 79 9 M-4 35 C23 25 48 44 80 30 M-7 58 C21 46 49 67 81 53" stroke="#66552f" strokeOpacity="0.19" strokeWidth="1.25" fill="none" />
      </pattern>
      <pattern id={id("cancellous")} width="108" height="92" patternUnits="userSpaceOnUse">
        <path d="M5 24 C22 7 42 9 51 25 C60 41 49 55 33 57 C15 59 1 44 5 24 Z M59 18 C74 7 94 14 101 30 C106 43 95 54 80 53 C64 52 53 34 59 18 Z M45 61 C60 49 82 55 87 70 C91 84 78 92 62 89 C47 86 38 72 45 61 Z" fill="none" stroke="#8f6056" strokeOpacity="0.24" strokeWidth="2.2" />
        <path d="M28 56 L47 65 M51 25 L61 22 M83 53 L75 58" stroke="#fff4dc" strokeOpacity="0.45" strokeWidth="1.5" />
      </pattern>
      <pattern id={id("mucosal-vessels")} width="132" height="104" patternUnits="userSpaceOnUse">
        <path d="M-5 83 C26 77 30 43 55 39 C79 35 76 13 102 7 M53 40 C68 52 85 55 103 48 M29 75 C45 84 54 95 61 107" fill="none" stroke="#a8464f" strokeOpacity="0.22" strokeWidth="1.4" />
        <path d="M8 89 C35 82 38 57 54 54" fill="none" stroke="#f7d2c8" strokeOpacity="0.34" strokeWidth="1" />
      </pattern>
      <filter id={id("soft-shadow")} x="-25%" y="-25%" width="150%" height="160%">
        <feDropShadow dx="0" dy="3" stdDeviation="4.5" floodColor="#4a2730" floodOpacity="0.2" />
      </filter>
      <filter id={id("small-shadow")} x="-40%" y="-40%" width="180%" height="190%">
        <feDropShadow dx="0" dy="1.5" stdDeviation="2" floodColor="#3c2530" floodOpacity="0.26" />
      </filter>
      <filter id={id("inner-soften")} x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="3" />
      </filter>
      <filter id={id("pearl-glow")} x="-45%" y="-45%" width="190%" height="190%">
        <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#6f5a54" floodOpacity="0.35" />
        <feDropShadow dx="-2" dy="-2" stdDeviation="2" floodColor="#ffffff" floodOpacity="0.75" />
      </filter>
    </defs>
  );
}
