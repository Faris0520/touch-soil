const SPROUT = 'M16 27c0-7 0-10-8-15 0 9 3 13 8 15zm0 0c0-7 0-10 8-15 0 9-3 13-8 15z'

interface SproutSpec {
  x: number
  baseY: number
  height: number
  delay: number
}

const SPROUTS: SproutSpec[] = [
  { x: 205, baseY: 197, height: 52, delay: 0 },
  { x: 385, baseY: 188, height: 74, delay: 1.4 },
  { x: 555, baseY: 201, height: 44, delay: 2.6 },
]

function sproutTransform({ x, baseY, height }: SproutSpec) {
  const scale = height / 27
  return `translate(${x - 16 * scale} ${baseY - 27 * scale}) scale(${scale})`
}

/**
 * Hero cover: a quiet night/day garden drawn in the app's own language
 * (hairline contours, flat surfaces, the sprout motif). Theme-aware: the
 * disc reads as a moon in dark mode and a rayed sun in light mode.
 */
export default function CoverScene() {
  return (
    <svg
      viewBox="0 0 760 240"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
    >
      {/* far mound */}
      <path
        d="M0 204 C 170 176, 300 170, 395 172 C 505 174, 640 186, 760 206 L 760 240 L 0 240 Z"
        fill="var(--color-obsidian)"
        stroke="var(--color-smoke)"
        strokeWidth="1"
      />
      {/* near mound */}
      <path
        d="M0 224 C 150 202, 330 194, 480 198 C 590 201, 690 210, 760 222 L 760 240 L 0 240 Z"
        fill="var(--color-carbon)"
        stroke="var(--color-graphite)"
        strokeWidth="1"
      />
      {/* contour hairlines on the near mound */}
      <path
        d="M60 216 C 220 198, 420 192, 700 214"
        fill="none"
        stroke="var(--color-graphite)"
        strokeWidth="1"
      />
      <path
        d="M120 230 C 260 214, 460 208, 660 226"
        fill="none"
        stroke="var(--color-graphite)"
        strokeWidth="1"
        opacity="0.6"
      />
      {/* seeds */}
      <circle cx="300" cy="224" r="2" fill="var(--color-fog)" opacity="0.45" />
      <circle cx="326" cy="228" r="2" fill="var(--color-fog)" opacity="0.35" />
      <circle cx="478" cy="226" r="2" fill="var(--color-fog)" opacity="0.45" />
      <circle cx="506" cy="230" r="2" fill="var(--color-fog)" opacity="0.35" />
      {/* moon (dark) / sun (light, via CSS rays) */}
      <g className="cover-disc">
        <circle cx="618" cy="66" r="26" fill="var(--color-lime)" opacity="0.9" />
        <g className="cover-rays" stroke="var(--color-lime)" strokeWidth="2" strokeLinecap="round">
          <path d="M618 26v-8M618 106v8M658 66h8M578 66h-8M646 38l6-6M590 94l-6 6M646 94l6 6M590 38l-6-6" />
        </g>
      </g>
      {/* sprouts */}
      {SPROUTS.map((s) => (
        <g key={s.x} className="cover-sprout" style={{ animationDelay: `${s.delay}s` }}>
          <g transform={sproutTransform(s)}>
            <path d={SPROUT} fill="var(--color-lime)" />
          </g>
        </g>
      ))}
    </svg>
  )
}
