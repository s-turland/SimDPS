/* SimDPS project page -- audio demos.
 *
 * Every listening panel is a trackswitch.js player configured with exclusive
 * solo: all conditions for one excerpt share a single transport, so a listener
 * can switch method mid-playback without losing their place. One player is
 * mounted at a time, and audio is fetched only once the player is clicked.
 */

const AUDIO_ROOT = "static/audio/";
const LT_ROOT = "static/listening_tests/";
const LATENT_SR = 48000; // sample rate of the exported latent-domain excerpts

const FEATURES = {
  exclusiveSolo: true,
  muteOtherPlayerInstances: true,
  globalVolume: true,
  looping: true,
  repeat: true,
  seekBar: true,
  timer: true,
  keyboard: true,
};

const WAVEFORM_UI = {
  type: "waveform",
  height: 100,
  waveformBarWidth: 2,
  maxZoom: 8,
};

/* trackswitch.js renders into a shadow root, so its palette cannot be reached
   from the page stylesheet. Re-point the accent tokens at the page link colour
   so the player does not arrive in its default orange. */
const ACCENT = "37,99,235"; // --primary-color, #2563eb
const ACCENT_CSS = `.trackswitch{
  --ts-color-accent:rgb(${ACCENT});
  --ts-color-accent-soft-06:rgba(${ACCENT},.06);
  --ts-color-accent-soft-08:rgba(${ACCENT},.08);
  --ts-color-accent-soft-10:rgba(${ACCENT},.10);
  --ts-color-accent-soft-15:rgba(${ACCENT},.12);
  --ts-color-accent-soft-20:rgba(${ACCENT},.20);
  --ts-color-accent-soft-30:rgba(${ACCENT},.25);
  --ts-color-accent-soft-32:rgba(${ACCENT},.32);
  --ts-color-accent-soft-45:rgba(${ACCENT},.45);
  --ts-color-accent-soft-50:rgba(${ACCENT},.50);
  --ts-color-accent-soft-55:rgba(${ACCENT},.55);
  --ts-color-accent-shadow:rgba(${ACCENT},.18);
}`;

/* ------------------------------------------------------------------ conditions */

/* Further-examples browser. Keys are the file keys in static/audio/manifest.json. */
const LATENT_CONDITIONS = [
  { key: "masked", label: "Masked input" },
  { key: "latent_interp", label: "Latent-Interp" },
  { key: "latent_sim", label: "Latent-Sim" },
  { key: "re_postprocessed_paint", label: "RePaint" },
  { key: "euler_heun_fixed_dps_100_latent", label: "Latent DPS" },
  { key: "euler_heun_sim_100_latent", label: "SimDPS-Solo (proposed)" },
  { key: "euler_heun_sim_100_latent_spectral_relaxed", label: "SimDPS-Multi (proposed)" },
];

/* Listening test I -- latent diffusion on general music (MUSDB18-HQ). */
const TEST_LATENT = {
  root: LT_ROOT + "latent/",
  items: ["Country", "Electro-Rock", "Folk", "Metal", "Pop", "Reggae"],
  conditions: [
    { key: "Reference", label: "Reference" },
    { key: "Masked", label: "Masked input" },
    { key: "Latent-Interp", label: "Latent-Interp" },
    { key: "Latent-Sim", label: "Latent-Sim" },
    { key: "RePaint", label: "RePaint" },
    { key: "DPS", label: "DPS" },
    { key: "SimDPS-Solo", label: "SimDPS-Solo (proposed)" },
    { key: "SimDPS-Multi", label: "SimDPS-Multi (proposed)" },
  ],
  initial: "Masked",
};

/* Listening test II -- waveform diffusion on piano (MAESTRO). */
const TEST_PIANO = {
  root: LT_ROOT + "piano/",
  items: ["Piano-1", "Piano-2", "Piano-3", "Piano-4", "Piano-5", "Piano-6"],
  conditions: [
    { key: "Original", label: "Original" },
    { key: "Degraded", label: "Degraded" },
    { key: "LPC", label: "LPC" },
    { key: "Sim", label: "Sim" },
    { key: "DPS", label: "DPS" },
    { key: "SimDPS-Relaxed", label: "SimDPS-Relaxed (proposed)" },
    { key: "SimDPS-Strict", label: "SimDPS-Strict (proposed)" },
  ],
  initial: "Degraded",
};

/* ---------------------------------------------------------------------- helpers */

function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  return node;
}

function brandPlayer(player) {
  const root = player.shadowRoot;
  if (!root) {
    requestAnimationFrame(() => brandPlayer(player));
    return;
  }
  if (root.querySelector("style[data-simdps-accent]")) return;
  const style = document.createElement("style");
  style.setAttribute("data-simdps-accent", "");
  style.textContent = ACCENT_CSS;
  root.appendChild(style);
}

/* Build the trackswitch track list for one excerpt. `resolve` maps a condition to
   a URL, or to null when that condition was not exported for this excerpt. */
function buildTracks(conditions, resolve, initialKey) {
  const tracks = [];
  const missing = [];
  conditions.forEach((cond) => {
    const src = resolve(cond);
    if (!src) {
      missing.push(cond.label);
      return;
    }
    tracks.push({
      title: cond.label,
      solo: cond.key === initialKey,
      sources: [{ src: src }],
    });
  });
  if (tracks.length && !tracks.some((track) => track.solo)) tracks[0].solo = true;
  return { tracks: tracks, missing: missing };
}

function mountPlayer(host, tracks) {
  host.replaceChildren();
  const player = document.createElement("trackswitch-player");
  player.className = "ts-host";
  // Connect first so the shadow root exists, restyle it, and only then hand over
  // the config -- the placeholder waveform is drawn as soon as the config lands,
  // and it picks its colour up from the stylesheet at that moment.
  host.appendChild(player);
  brandPlayer(player);
  player.config = {
    features: FEATURES,
    ui: [WAVEFORM_UI, { type: "trackGroup", trackGroup: tracks }],
  };
  // The placeholder waveform samples its colour as it is first painted, which can
  // land before the injected accent stylesheet takes effect; nudge one redraw.
  requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
  return player;
}

/* A row of selector buttons; calls onSelect(index) and keeps the active state. */
function buildChips(host, labels, onSelect) {
  host.replaceChildren();
  const buttons = labels.map((label, index) => {
    const button = el("button", "demo-chip", label);
    button.type = "button";
    button.addEventListener("click", () => {
      buttons.forEach((other, i) => other.classList.toggle("is-active", i === index));
      onSelect(index);
    });
    host.appendChild(button);
    return button;
  });
  if (buttons.length) buttons[0].click();
  return buttons;
}

/* -------------------------------------------------------- further-examples browser */

function renderLatentExample(example) {
  const caption = document.getElementById("examples-caption");
  const host = document.getElementById("examples-player");

  const built = buildTracks(
    LATENT_CONDITIONS,
    (cond) => {
      const file = example.files && example.files[cond.key];
      return file ? AUDIO_ROOT + file : null;
    },
    "masked"
  );

  const meta = example.meta || {};
  let text = "MUSDB18-HQ id " + example.id;
  if (typeof meta.mask_start === "number" && typeof meta.mask_end === "number") {
    const start = (meta.mask_start / LATENT_SR).toFixed(2);
    const end = (meta.mask_end / LATENT_SR).toFixed(2);
    text += ", gap " + start + "–" + end + " s";
  }
  caption.replaceChildren(document.createTextNode(text));
  if (built.missing.length) {
    caption.appendChild(
      el("span", "demo-missing", " (not exported: " + built.missing.join(", ") + ")")
    );
  }

  if (!built.tracks.length) {
    host.replaceChildren(el("p", "demo-error", "No audio available for this excerpt."));
    return;
  }
  mountPlayer(host, built.tracks);
}

function initLatentExamples() {
  const chips = document.getElementById("examples-chips");
  const host = document.getElementById("examples-player");
  if (!chips || !host) return;

  fetch(AUDIO_ROOT + "manifest.json")
    .then((response) => {
      if (!response.ok) throw new Error(String(response.status));
      return response.json();
    })
    .then((data) => {
      const examples = (data && data.examples) || [];
      if (!examples.length) throw new Error("empty manifest");
      buildChips(
        chips,
        examples.map((_, i) => String(i + 1)),
        (index) => renderLatentExample(examples[index])
      );
    })
    .catch((error) => {
      host.replaceChildren(
        el(
          "p",
          "demo-error",
          "Could not load static/audio/manifest.json — serve the page over http rather than opening the file directly."
        )
      );
      console.error(error);
    });
}

/* ------------------------------------------------------------- listening tests */

function initListeningTest(config, chipsId, hostId) {
  const chips = document.getElementById(chipsId);
  const host = document.getElementById(hostId);
  if (!chips || !host) return;

  buildChips(chips, config.items, (index) => {
    const built = buildTracks(
      config.conditions,
      (cond) => config.root + config.items[index] + "/" + cond.key + ".flac",
      config.initial
    );
    mountPlayer(host, built.tracks);
  });
}

/* ------------------------------------------------------------------------ boot */

function boot() {
  initListeningTest(TEST_LATENT, "test-latent-chips", "test-latent-player");
  initListeningTest(TEST_PIANO, "test-piano-chips", "test-piano-player");
  initLatentExamples();
}

function reportPlayerUnavailable() {
  ["test-latent-player", "test-piano-player", "examples-player"].forEach((id) => {
    const host = document.getElementById(id);
    if (host) {
      host.replaceChildren(
        el("p", "demo-error", "The audio player failed to load (static/js/trackswitch.js).")
      );
    }
  });
}

/* The <trackswitch-player> class must be registered before we assign .config:
   an own property set on a not-yet-upgraded element would shadow the setter. */
if (window.customElements && customElements.whenDefined) {
  let booted = false;
  const start = () => {
    if (booted) return;
    booted = true;
    boot();
  };
  customElements.whenDefined("trackswitch-player").then(start);
  window.setTimeout(() => {
    if (!booted) {
      booted = true;
      reportPlayerUnavailable();
    }
  }, 8000);
} else {
  reportPlayerUnavailable();
}
