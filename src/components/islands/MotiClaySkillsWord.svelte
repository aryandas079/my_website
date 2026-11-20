<script lang="ts">
  interface Props {
    buildProgress: number;
    dissolveProgress: number;
  }

  let { buildProgress = 0, dissolveProgress = 0 }: Props = $props();

  // Combined visibility: builds in from binary rain (0..1), then dissolves/glides out as skills list builds on left
  let revealAlpha = $derived(
    Math.max(0, Math.min(1, (buildProgress - 0.25) / 0.55)) *
      Math.max(0, 1 - dissolveProgress * 1.45)
  );

  let scaleVal = $derived(
    0.88 +
      Math.max(0, Math.min(1, buildProgress)) * 0.12 -
      dissolveProgress * 0.14
  );

  let translateY = $derived(
    (1 - Math.max(0, Math.min(1, buildProgress))) * 26 - dissolveProgress * 38
  );
</script>

<!--
  "MOTI WRITING" (Black & White Sculpted 3D Clay / Pillowy Block Typography)
  Inspired directly by /public/assets/aistudio/image_99863d21.png:
  Chunky, hand-molded matte black 3D clay letterforms with organic crease textures
  and soft volumetric rim lighting on a stark monochrome canvas.
-->
<div
  class="pointer-events-none relative flex flex-col items-center justify-center select-none will-change-transform"
  style="opacity: {revealAlpha.toFixed(3)}; transform: translate3d(0, {translateY.toFixed(1)}px, 0) scale({scaleVal.toFixed(3)});"
>
  <svg
    viewBox="0 0 560 440"
    class="h-auto w-[min(72vw,58dvh,560px)] drop-shadow-[0_24px_38px_rgba(0,0,0,0.22)]"
    aria-label="SKILLS in 3D sculpted black clay typography"
  >
    <defs>
      <!-- Sculpted 3D Matte-Black Clay Filter with Organic Creases & Soft Studio Specular -->
      <filter id="moti-clay-3d" x="-12%" y="-12%" width="124%" height="124%" color-interpolation-filters="sRGB">
        <!-- 1. Round & plump the letter silhouettes into thick moti pillow blocks -->
        <feMorphology operator="dilate" radius="6.5" in="SourceAlpha" result="dilated" />
        <feGaussianBlur stdDeviation="5.5" in="dilated" result="softSil" />
        <feColorMatrix
          in="softSil"
          type="matrix"
          values="
            1 0 0 0 0
            0 1 0 0 0
            0 0 1 0 0
            0 0 0 24 -9"
          result="clayMask"
        />

        <!-- 2. Organic hand-molded clay surface folds & micro-creases -->
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.022 0.038"
          numOctaves="3"
          seed="14"
          result="clayNoise"
        />
        <feDisplacementMap
          in="clayMask"
          in2="clayNoise"
          scale="6.5"
          xChannelSelector="R"
          yChannelSelector="G"
          result="warpedClayMask"
        />

        <!-- 3. 3D Volumetric Cushion Height Map from the Clay Silhouette -->
        <feGaussianBlur in="warpedClayMask" stdDeviation="9.5" result="pillowDome" />
        <feComposite
          in="pillowDome"
          in2="clayNoise"
          operator="arithmetic"
          k1="0"
          k2="0.88"
          k3="0.16"
          k4="0"
          result="bumpyDome"
        />

        <!-- 4. Top-Left Soft Studio Specular Highlight (Matte-Satin Black Clay Sheen) -->
        <feSpecularLighting
          in="bumpyDome"
          surfaceScale="11"
          specularConstant="0.62"
          specularExponent="18"
          lighting-color="#ffffff"
          result="specLight"
        >
          <feDistantLight azimuth="235" elevation="48" />
        </feSpecularLighting>
        <feComposite in="specLight" in2="warpedClayMask" operator="in" result="clippedSpec" />

        <!-- 5. Subtle Rim & Crease Diffuse Shading -->
        <feDiffuseLighting
          in="bumpyDome"
          surfaceScale="8"
          diffuseConstant="0.22"
          lighting-color="#ffffff"
          result="diffLight"
        >
          <feDistantLight azimuth="65" elevation="35" />
        </feDiffuseLighting>
        <feComposite in="diffLight" in2="warpedClayMask" operator="in" result="clippedDiff" />

        <!-- 6. Deep Charcoal-Black Clay Base (#111111) -->
        <feFlood flood-color="#0f0f0f" result="blackBase" />
        <feComposite in="blackBase" in2="warpedClayMask" operator="in" result="clayBody" />

        <!-- 7. Combine Black Clay Body + Diffuse Volume + Crisp Clay Crease Specular -->
        <feComposite
          in="clayBody"
          in2="clippedDiff"
          operator="arithmetic"
          k1="0"
          k2="1"
          k3="0.32"
          k4="0"
          result="litClay"
        />
        <feComposite
          in="litClay"
          in2="clippedSpec"
          operator="arithmetic"
          k1="0"
          k2="1"
          k3="0.68"
          k4="0"
          result="finalMotiClay"
        />
      </filter>
    </defs>

    <!-- Stacked 2-Row "MOTI" Block Layout (SKI / LLS) matching the reference composition -->
    <g filter="url(#moti-clay-3d)">
      <!-- ROW 1: S K I -->
      <!-- Thick Pillowy 'S' -->
      <path
        d="M 155 72 C 155 48, 72 46, 72 86 C 72 124, 158 114, 158 158 C 158 202, 68 196, 68 162"
        fill="none"
        stroke="#0f0f0f"
        stroke-width="46"
        stroke-linecap="round"
        stroke-linejoin="round"
      />

      <!-- Thick Pillowy 'K' -->
      <path
        d="M 228 56 L 228 182 M 308 60 L 236 122 L 312 182"
        fill="none"
        stroke="#0f0f0f"
        stroke-width="48"
        stroke-linecap="round"
        stroke-linejoin="round"
      />

      <!-- Thick Pillowy 'I' -->
      <path
        d="M 398 56 L 398 182 M 374 56 L 422 56 M 374 182 L 422 182"
        fill="none"
        stroke="#0f0f0f"
        stroke-width="48"
        stroke-linecap="round"
        stroke-linejoin="round"
      />

      <!-- ROW 2: L L S -->
      <!-- Thick Pillowy 'L' #1 -->
      <path
        d="M 88 248 L 88 376 L 166 376"
        fill="none"
        stroke="#0f0f0f"
        stroke-width="48"
        stroke-linecap="round"
        stroke-linejoin="round"
      />

      <!-- Thick Pillowy 'L' #2 -->
      <path
        d="M 232 248 L 232 376 L 310 376"
        fill="none"
        stroke="#0f0f0f"
        stroke-width="48"
        stroke-linecap="round"
        stroke-linejoin="round"
      />

      <!-- Thick Pillowy 'S' #2 -->
      <path
        d="M 454 264 C 454 240, 370 238, 370 278 C 370 316, 456 306, 456 350 C 456 394, 366 388, 366 354"
        fill="none"
        stroke="#0f0f0f"
        stroke-width="46"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </g>
  </svg>
</div>
