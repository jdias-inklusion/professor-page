// scripts/core/audio.js
import * as THREE from "three";

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

export function createAudioManager({
  camera,
  enabled = true,
  master = 0.9,
} = {}) {
  // Listener (Three) — ok manter, mas o ctx só “arranca” após gesto
  const listener = new THREE.AudioListener();
  camera.add(listener);

  const ctx = listener.context;

  const state = {
    enabled,
    master,
    muted: !enabled,
    unlocked: false,
  };

  // ---------------- Routing (WebAudio) ----------------
  const masterGain = ctx.createGain();
  masterGain.gain.value = state.enabled ? state.master : 0;

  const groups = {
    ambience: { gain: ctx.createGain() },
    candles: { gain: ctx.createGain() },
    magic: { gain: ctx.createGain() },
    sfx: { gain: ctx.createGain() },
  };

  for (const g of Object.values(groups)) g.gain.connect(masterGain);
  masterGain.connect(ctx.destination);

  function setMaster(v) {
    state.master = v;
    if (!state.muted) masterGain.gain.value = v;
  }

  function setEnabled(v) {
    state.enabled = v;
    state.muted = !v;
    masterGain.gain.value = v ? state.master : 0;
  }

  // ---------------- Unlock policy ----------------
  function unlock() {
    if (state.unlocked) return Promise.resolve(true);

    try {
      // ⚠️ IMPORTANT: chamar resume() imediatamente (sem await)
      const p = ctx.state === "suspended" ? ctx.resume() : Promise.resolve();

      return p
        .then(() => {
          state.unlocked = ctx.state === "running";
          return state.unlocked;
        })
        .catch((err) => {
          console.warn("[audio] unlock falhou:", err);
          return false;
        });
    } catch (err) {
      console.warn("[audio] unlock erro:", err);
      return Promise.resolve(false);
    }
  }

  // ---------------- Buffer loading (para one-shots) ----------------
  async function loadBuffer(url) {
    try {
      const res = await fetch(url);
      const arr = await res.arrayBuffer();
      return await ctx.decodeAudioData(arr);
    } catch (e) {
      console.warn("[audio] decodeAudioData falhou:", url, e);
      return null;
    }
  }

  // ---------------- Loops via WebAudio buffer (opcional) ----------------
  function makeLoop({
    buffer,
    group = "ambience",
    volume = 0.2,
    playbackRate = 1.0,
    detune = 0,
  } = {}) {
    if (!buffer) {
      console.warn("[audio] makeLoop: buffer inválido.");
      // no-op
      return {
        start() {},
        stop() {},
        setVolume() {},
        setRate() {},
        isValid: false,
      };
    }

    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    src.playbackRate.value = playbackRate;
    src.detune.value = detune;

    const gain = ctx.createGain();
    gain.gain.value = volume;

    src.connect(gain);
    gain.connect(groups[group]?.gain ?? masterGain);

    let started = false;

    return {
      start(when = 0) {
        if (started) return;
        started = true;
        try {
          src.start(when);
        } catch {}
      },
      stop(when = 0) {
        try {
          src.stop(when);
        } catch {}
      },
      setVolume(v) {
        gain.gain.value = v;
      },
      setRate(v) {
        src.playbackRate.value = v;
      },
      node: src,
      gain,
      isValid: true,
    };
  }

  // ---------------- Loops via HTMLAudioElement (resolve EncodingError) ----------------
  function makeMediaLoop({
    url,
    group = "ambience",
    volume = 0.2,
    playbackRate = 1.0,
    loop = true,
    preload = "auto",
    crossOrigin = "anonymous",
  } = {}) {
    if (!url) {
      console.warn("[audio] makeMediaLoop: url em falta.");
      return {
        start() {},
        stop() {},
        setVolume() {},
        setRate() {},
        update() {},
        isValid: false,
      };
    }

    const el = new Audio(url);
    el.preload = preload;
    el.loop = !!loop;
    el.crossOrigin = crossOrigin;
    el.playbackRate = playbackRate;

    // liga o elemento ao WebAudio (para controlar volumes por grupo)
    const src = ctx.createMediaElementSource(el);
    const gain = ctx.createGain();
    gain.gain.value = volume;

    src.connect(gain);
    gain.connect(groups[group]?.gain ?? masterGain);

    let started = false;

    return {
      async start() {
        if (started) return;
        started = true;
        try {
          // play() só funciona mesmo depois do unlock + gesto
          await el.play();
        } catch (e) {
          // não rebenta: apenas avisa
          console.warn("[audio] play() bloqueado/erro:", e);
        }
      },
      stop() {
        try {
          el.pause();
        } catch {}
        try {
          el.currentTime = 0;
        } catch {}
      },
      setVolume(v) {
        gain.gain.value = v;
      },
      setRate(v) {
        el.playbackRate = v;
      },
      node: el,
      gain,
      isValid: true,
    };
  }

  // ---------------- Seamless loop com crossfade (para ambience “não seamless”) ----------------
  // Usa 2 <audio> alternados e faz crossfade nos últimos fadeSec segundos
  function makeSeamlessMediaLoop({
    url,
    group = "ambience",
    volume = 0.18,
    playbackRate = 1.0,
    fadeSec = 2.5,
    preload = "auto",
    crossOrigin = "anonymous",
  } = {}) {
    if (!url) {
      console.warn("[audio] makeSeamlessMediaLoop: url em falta.");
      return {
        start() {},
        stop() {},
        setVolume() {},
        setRate() {},
        update() {},
        isValid: false,
      };
    }

    const makeEl = () => {
      const el = new Audio(url);
      el.preload = preload;
      el.loop = false; // nós controlamos o loop
      el.crossOrigin = crossOrigin;
      el.playbackRate = playbackRate;
      return el;
    };

    const elA = makeEl();
    const elB = makeEl();

    const srcA = ctx.createMediaElementSource(elA);
    const srcB = ctx.createMediaElementSource(elB);

    const gainA = ctx.createGain();
    const gainB = ctx.createGain();

    gainA.gain.value = volume;
    gainB.gain.value = 0;

    srcA.connect(gainA);
    srcB.connect(gainB);

    gainA.connect(groups[group]?.gain ?? masterGain);
    gainB.connect(groups[group]?.gain ?? masterGain);

    let started = false;
    let active = "A"; // A ou B
    let baseVolume = volume;

    function getActiveEl() {
      return active === "A" ? elA : elB;
    }
    function getInactiveEl() {
      return active === "A" ? elB : elA;
    }
    function getActiveGain() {
      return active === "A" ? gainA : gainB;
    }
    function getInactiveGain() {
      return active === "A" ? gainB : gainA;
    }

    async function safePlay(el) {
      try {
        await el.play();
      } catch (e) {
        console.warn("[audio] play() erro:", e);
      }
    }

    return {
      async start() {
        if (started) return;
        started = true;

        // começa A
        gainA.gain.value = baseVolume;
        gainB.gain.value = 0;
        active = "A";
        await safePlay(elA);
      },

      stop() {
        try {
          elA.pause();
          elA.currentTime = 0;
        } catch {}
        try {
          elB.pause();
          elB.currentTime = 0;
        } catch {}
        gainA.gain.value = baseVolume;
        gainB.gain.value = 0;
        active = "A";
        started = false;
      },

      setVolume(v) {
        baseVolume = v;
        // mantém relação conforme quem está ativo
        const ag = getActiveGain();
        const ig = getInactiveGain();
        ag.gain.value = v;
        ig.gain.value = 0;
      },

      setRate(v) {
        elA.playbackRate = v;
        elB.playbackRate = v;
      },

      // chama no teu loop
      async update() {
        if (!started) return;
        const aEl = getActiveEl();
        const bEl = getInactiveEl();
        const aGain = getActiveGain();
        const bGain = getInactiveGain();

        const dur = aEl.duration;
        if (!dur || !isFinite(dur)) return;

        const t = aEl.currentTime;
        const remaining = dur - t;

        // entra em crossfade
        if (remaining <= fadeSec) {
          // garante que o “B” está a tocar do início
          if (bEl.paused) {
            try {
              bEl.currentTime = 0;
            } catch {}
            bGain.gain.value = 0;
            await safePlay(bEl);
          }

          const x = clamp(1 - remaining / fadeSec, 0, 1);
          aGain.gain.value = baseVolume * (1 - x);
          bGain.gain.value = baseVolume * x;

          // terminou: troca
          if (remaining <= 0.05) {
            try {
              aEl.pause();
              aEl.currentTime = 0;
            } catch {}
            // swap
            active = active === "A" ? "B" : "A";
          }
        }
      },

      isValid: true,
    };
  }

  // ---------------- One-shot SFX (buffers) ----------------
  function playOneShot({
    buffer,
    group = "sfx",
    volume = 0.35,
    playbackRate = 1.0,
    detune = 0,
    randomPitch = 0.0,
  } = {}) {
    if (!buffer) return;

    const src = ctx.createBufferSource();
    src.buffer = buffer;

    const rp = randomPitch ? 1 + (Math.random() * 2 - 1) * randomPitch : 1;
    src.playbackRate.value = playbackRate * rp;
    src.detune.value = detune;

    const gain = ctx.createGain();
    gain.gain.value = volume;

    src.connect(gain);
    gain.connect(groups[group]?.gain ?? masterGain);

    src.start(0);
    src.onended = () => {
      try {
        src.disconnect();
        gain.disconnect();
      } catch {}
    };
  }

  function setGroupVolume(group, v) {
    if (!groups[group]) return;
    groups[group].gain.gain.value = v;
  }

  return {
    listener,
    context: ctx,
    state,
    unlock,
    loadBuffer,

    makeLoop, // buffer loop
    makeMediaLoop, // media element loop
    makeSeamlessMediaLoop, // crossfade loop

    playOneShot,

    setEnabled,
    setMaster,
    setGroupVolume,
    groups,
  };
}
