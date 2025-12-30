// scripts/features/alchemyAudio.js
export async function createAlchemyAudio(
  audio,
  {
    ambienceUrl = "/audio/ambience.mp3",
    candleUrl = "/audio/candle_loop.mp3",
    magicUrl = "/audio/magic_hum.mp3",
    owlUrl = "/audio/owl.mp3",
  } = {}
) {
  const rand = (a, b) => a + Math.random() * (b - a);

  // ✅ Para ambience/candles/magic: usar MediaElement (evita decodeAudioData EncodingError)
  const ambience = audio.makeSeamlessMediaLoop({
    url: ambienceUrl,
    group: "ambience",
    volume: 0.18,
    playbackRate: 1.0,
    fadeSec: 2.5,
  });

  // 2 loops de vela com rates diferentes para não “phasarem”
  const candleA = audio.makeMediaLoop({
    url: candleUrl,
    group: "candles",
    volume: 0.08,
    playbackRate: 0.98,
    loop: true,
  });
  const candleB = audio.makeMediaLoop({
    url: candleUrl,
    group: "candles",
    volume: 0.06,
    playbackRate: 1.03,
    loop: true,
  });

  const magic = audio.makeMediaLoop({
    url: magicUrl,
    group: "magic",
    volume: 0.03,
    playbackRate: 1.0,
    loop: true,
  });

  // ✅ Coruja: one-shot (buffer). Se falhar decode, ainda podes trocar para MediaElement one-shot depois.
  const owlBuffer = await audio.loadBuffer(owlUrl).catch(() => null);

  const params = {
    ambience: { enabled: true, volume: 0.18, fadeSec: 2.5 },
    candles: { enabled: true, volume: 0.14 },
    magic: { enabled: true, volume: 0.03 },

    owl: {
      enabled: true,
      volume: 0.35,
      minDelay: 18,
      maxDelay: 45,
      randomPitch: 0.04,
    },
  };

  let started = false;
  let owlTimer = null;

  function apply() {
    ambience.setVolume(params.ambience.enabled ? params.ambience.volume : 0);

    const candleVol = params.candles.enabled ? params.candles.volume : 0;
    candleA.setVolume(candleVol * 0.55);
    candleB.setVolume(candleVol * 0.45);

    magic.setVolume(params.magic.enabled ? params.magic.volume : 0);
  }

  function clearOwlTimer() {
    if (owlTimer) clearTimeout(owlTimer);
    owlTimer = null;
  }

  function playOwl() {
    if (!started) return;
    if (!params.owl.enabled) return;
    if (!owlBuffer) return;

    audio.playOneShot({
      buffer: owlBuffer,
      group: "sfx",
      volume: params.owl.volume,
      randomPitch: params.owl.randomPitch,
    });
  }

  function scheduleNextOwl() {
    clearOwlTimer();
    if (!started) return;
    if (!params.owl.enabled) return;
    if (!owlBuffer) return;

    const delayMs = rand(params.owl.minDelay, params.owl.maxDelay) * 1000;
    owlTimer = setTimeout(() => {
      playOwl();
      scheduleNextOwl();
    }, delayMs);
  }

  async function start() {
    if (started) return;
    started = true;

    await ambience.start();
    await candleA.start();
    await candleB.start();
    await magic.start();

    apply();
    scheduleNextOwl();
  }

  // micro-life (barato)
  let t = 0;
  async function update(dt) {
    if (!started) return;
    t += dt;

    // crossfade do ambience
    await ambience.update?.();

    // drift suave nas velas (±3%)
    const wob = 0.03;
    candleA.setRate(0.98 + wob * Math.sin(t * 0.35));
    candleB.setRate(1.03 + wob * Math.sin(t * 0.27 + 1.2));

    // magic subtil
    magic.setRate(1.0 + 0.01 * Math.sin(t * 0.2));
  }

  function refreshSchedulers() {
    apply();
    scheduleNextOwl();
  }

  function stopAll() {
    clearOwlTimer();
    ambience.stop?.();
    candleA.stop?.();
    candleB.stop?.();
    magic.stop?.();
    started = false;
  }

  return { start, update, params, apply, playOwl, refreshSchedulers, stopAll };
}
