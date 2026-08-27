/* Josh Miller — audiobook narration
 *
 * One small player, used by both the hero and the samples list. No library,
 * no default <audio> chrome. Samples come from audio/samples.json so adding
 * one never means touching index.html.
 */

(function () {
  "use strict";

  var MANIFEST = "audio/samples.json";
  var AUDIO_DIR = "audio/";
  var SEEK_STEP = 5; // seconds, arrow keys
  var SEEK_LEAP = 10; // seconds, page keys

  var GLYPH_PLAY = "M8 5.5v13l11-6.5z";
  var GLYPH_PAUSE = "M7.4 5.5h3.5v13H7.4zM13.1 5.5h3.5v13h-3.5z";

  var players = [];

  var calm = window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)")
    : null;

  /* --- helpers --------------------------------------------------------- */

  function clock(seconds) {
    if (!isFinite(seconds) || seconds < 0) seconds = 0;
    var m = Math.floor(seconds / 60);
    var s = Math.floor(seconds % 60);
    return m + ":" + (s < 10 ? "0" : "") + s;
  }

  function seconds(text) {
    if (typeof text !== "string") return NaN;
    var parts = text.split(":").map(Number);
    if (parts.some(function (n) { return !isFinite(n); })) return NaN;
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return parts[0];
  }

  function el(tag, className, attrs) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (attrs) Object.keys(attrs).forEach(function (k) {
      node.setAttribute(k, attrs[k]);
    });
    return node;
  }

  function keyButton(label) {
    var button = el("button", "key", { type: "button", "aria-label": label });
    button.innerHTML =
      '<svg class="key-glyph" viewBox="0 0 24 24" aria-hidden="true" ' +
      'focusable="false"><path d="' + GLYPH_PLAY + '"/></svg>';
    return button;
  }

  /* A relative url() inside a custom property is resolved against the
     stylesheet that consumes it, not the document — so "img/wave-x.svg" would
     become "/css/img/wave-x.svg". Hand the property an absolute URL instead.
     Going through document.baseURI (rather than "/") keeps the site working
     when it's served from a subpath, e.g. a *.github.io project page. */
  function assetURL(path) {
    try {
      return new URL(path, document.baseURI).href;
    } catch (e) {
      return path;
    }
  }

  function meterFor(sample, live) {
    var meter = el("div", "meter" + (live ? " meter--live" : ""));
    if (sample.waveform) {
      meter.style.setProperty("--wave", 'url("' + assetURL(sample.waveform) + '")');
    } else {
      meter.classList.add("meter--plain");
    }
    meter.appendChild(el("div", "meter-layer meter-base"));
    meter.appendChild(el("div", "meter-layer meter-played"));
    meter.appendChild(el("div", "meter-head"));
    return meter;
  }

  /* --- the player ------------------------------------------------------ */

  function Player(root, sample) {
    this.root = root;
    this.sample = sample;
    this.key = root.querySelector(".key");
    this.meter = root.querySelector(".meter");
    this.readout = root.querySelector(".readout");
    this.played = this.readout.querySelector(".played");
    this.total = this.readout.querySelector(".total");
    this.duration = seconds(sample.duration);
    this.audio = null;
    this.raf = 0;
    this.scrubbing = false;

    this.key.addEventListener("click", this.toggle.bind(this));

    this.meter.setAttribute("role", "slider");
    this.meter.setAttribute("tabindex", "0");
    this.meter.setAttribute("aria-label", "Seek within " + sample.title);
    this.meter.setAttribute("aria-valuemin", "0");
    this.meter.setAttribute("aria-orientation", "horizontal");
    this.paint(0);

    this.meter.addEventListener("pointerdown", this.grab.bind(this));
    this.meter.addEventListener("pointermove", this.drag.bind(this));
    this.meter.addEventListener("pointerup", this.release.bind(this));
    this.meter.addEventListener("pointercancel", this.release.bind(this));
    this.meter.addEventListener("keydown", this.keydown.bind(this));

    players.push(this);
  }

  /* The <audio> element is only built on first interaction, so a visitor who
     never presses play never downloads an MP3. */
  Player.prototype.load = function () {
    if (this.audio) return this.audio;

    var audio = new Audio();
    audio.preload = "metadata";
    audio.src = assetURL(AUDIO_DIR + this.sample.file);
    this.audio = audio;

    var self = this;

    audio.addEventListener("loadedmetadata", function () {
      if (isFinite(audio.duration) && audio.duration > 0) {
        self.duration = audio.duration;
        if (self.total) self.total.textContent = clock(audio.duration);
      }
      self.paint(audio.currentTime);
    });

    audio.addEventListener("play", function () {
      players.forEach(function (other) {
        if (other !== self) other.pause();
      });
      self.setState("playing");
      self.follow();
    });

    audio.addEventListener("pause", function () { self.setState("paused"); });
    audio.addEventListener("ended", function () {
      self.setState("paused");
      audio.currentTime = 0;
      self.paint(0);
    });

    audio.addEventListener("timeupdate", function () {
      if (!self.scrubbing) self.paint(audio.currentTime);
    });

    audio.addEventListener("error", function () { self.fail(); });

    return audio;
  };

  Player.prototype.fail = function () {
    this.stopFollowing();
    this.setState("paused");
    this.key.disabled = true;
    this.key.setAttribute("aria-label", "Sample unavailable");
    var note = this.root.querySelector(".stage-note, .track-note");
    if (note) note.textContent = "This sample could not be loaded.";
  };

  Player.prototype.toggle = function () {
    var audio = this.load();
    if (audio.paused) {
      var attempt = audio.play();
      if (attempt && attempt.catch) attempt.catch(function () { /* user gesture rules */ });
    } else {
      audio.pause();
    }
  };

  Player.prototype.pause = function () {
    if (this.audio && !this.audio.paused) this.audio.pause();
  };

  Player.prototype.setState = function (state) {
    var playing = state === "playing";
    this.key.dataset.state = state;
    this.meter.dataset.state = state;
    this.key.querySelector("path").setAttribute(
      "d", playing ? GLYPH_PAUSE : GLYPH_PLAY
    );
    this.key.setAttribute(
      "aria-label", (playing ? "Pause " : "Play ") + this.sample.title
    );
    if (!playing) this.stopFollowing();
  };

  /* timeupdate fires about four times a second, which reads as a stutter on
     a waveform this wide. Drive the fill from rAF while it's actually
     playing, and stop the moment it isn't.

     Under prefers-reduced-motion we skip the rAF entirely and let the four-
     times-a-second timeupdate carry it. The fill still tracks playback — it
     just steps instead of glides, which is the point. */
  Player.prototype.follow = function () {
    var self = this;
    this.stopFollowing();
    if (calm && calm.matches) return;
    (function step() {
      if (!self.audio || self.audio.paused) return;
      if (!self.scrubbing) self.paint(self.audio.currentTime);
      self.raf = requestAnimationFrame(step);
    })();
  };

  Player.prototype.stopFollowing = function () {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  };

  Player.prototype.paint = function (time) {
    var total = this.duration;
    var ratio = total > 0 ? Math.min(1, Math.max(0, time / total)) : 0;
    this.meter.style.setProperty("--played", (ratio * 100).toFixed(3) + "%");
    if (this.played) this.played.textContent = clock(time);
    this.meter.setAttribute("aria-valuemax", total > 0 ? total.toFixed(0) : "0");
    this.meter.setAttribute("aria-valuenow", time.toFixed(0));
    this.meter.setAttribute(
      "aria-valuetext", clock(time) + " of " + clock(total)
    );
  };

  Player.prototype.seekTo = function (time) {
    var audio = this.load();
    var total = this.duration;
    if (!(total > 0)) return;
    var next = Math.min(total, Math.max(0, time));
    this.paint(next);
    if (isFinite(audio.duration) && audio.duration > 0) {
      audio.currentTime = next;
    } else {
      var self = this;
      audio.addEventListener("loadedmetadata", function once() {
        audio.removeEventListener("loadedmetadata", once);
        audio.currentTime = Math.min(self.duration, Math.max(0, next));
      });
    }
  };

  Player.prototype.timeAt = function (event) {
    var box = this.meter.getBoundingClientRect();
    if (!box.width) return 0;
    var ratio = (event.clientX - box.left) / box.width;
    return Math.min(1, Math.max(0, ratio)) * this.duration;
  };

  Player.prototype.grab = function (event) {
    if (event.button !== 0 && event.pointerType === "mouse") return;
    this.load();
    if (!(this.duration > 0)) return;
    this.scrubbing = true;
    this.meter.setPointerCapture(event.pointerId);
    var time = this.timeAt(event);
    this.paint(time);
    event.preventDefault();
  };

  Player.prototype.drag = function (event) {
    if (!this.scrubbing) return;
    this.paint(this.timeAt(event));
  };

  Player.prototype.release = function (event) {
    if (!this.scrubbing) return;
    this.scrubbing = false;
    if (this.meter.hasPointerCapture(event.pointerId)) {
      this.meter.releasePointerCapture(event.pointerId);
    }
    this.seekTo(this.timeAt(event));
  };

  Player.prototype.keydown = function (event) {
    var now = this.audio ? this.audio.currentTime : 0;
    var handled = true;

    switch (event.key) {
      case "ArrowRight": this.seekTo(now + SEEK_STEP); break;
      case "ArrowLeft": this.seekTo(now - SEEK_STEP); break;
      case "ArrowUp": this.seekTo(now + SEEK_STEP); break;
      case "ArrowDown": this.seekTo(now - SEEK_STEP); break;
      case "PageUp": this.seekTo(now + SEEK_LEAP); break;
      case "PageDown": this.seekTo(now - SEEK_LEAP); break;
      case "Home": this.seekTo(0); break;
      case "End": this.seekTo(this.duration); break;
      case " ":
      case "Enter":
        this.toggle();
        break;
      default: handled = false;
    }

    if (handled) event.preventDefault();
  };

  /* --- building the two surfaces --------------------------------------- */

  function buildHero(root, sample) {
    root.textContent = "";

    var readout = el("p", "readout");
    readout.innerHTML =
      '<span class="played">0:00</span> / <span class="total"></span>';
    readout.querySelector(".total").textContent =
      sample.duration || clock(NaN);

    var stage = el("div", "stage");

    var title = el("p", "stage-title");
    title.textContent = sample.title;
    stage.appendChild(title);

    if (sample.note) {
      var note = el("p", "stage-note");
      note.textContent = sample.note;
      stage.appendChild(note);
    }

    root.appendChild(keyButton("Play " + sample.title));
    root.appendChild(el("div", "rule", { "aria-hidden": "true" }));
    root.appendChild(meterFor(sample, true));
    root.appendChild(stage);
    root.appendChild(readout);

    new Player(root, sample);
  }

  function buildTrack(list, sample) {
    var item = el("li", "track");

    var head = el("div", "track-head");
    var title = el("p", "track-title");
    title.textContent = sample.title;
    head.appendChild(title);
    if (sample.note) {
      var note = el("p", "track-note");
      note.textContent = sample.note;
      head.appendChild(note);
    }

    var readout = el("p", "readout");
    readout.innerHTML =
      '<span class="played">0:00</span> / <span class="total"></span>';
    readout.querySelector(".total").textContent = sample.duration || "";

    item.appendChild(keyButton("Play " + sample.title));
    item.appendChild(head);
    item.appendChild(meterFor(sample, true));
    item.appendChild(readout);
    list.appendChild(item);

    new Player(item, sample);
  }

  /* --- go -------------------------------------------------------------- */

  function start(samples) {
    samples = samples.filter(function (s) {
      return s && typeof s.file === "string" && s.file && s.title;
    });
    if (!samples.length) return; // the resting hero copy is already correct

    var featured = samples.filter(function (s) { return s.featured; })[0]
      || samples[0];

    var hero = document.querySelector("[data-hero]");
    if (hero) buildHero(hero, featured);

    var rest = samples.filter(function (s) { return s !== featured; });
    var section = document.getElementById("samples");
    var list = section && section.querySelector("[data-tracks]");
    if (list && rest.length) {
      rest.forEach(function (s) { buildTrack(list, s); });
      section.hidden = false;
    }
  }

  fetch(MANIFEST, { cache: "no-cache" })
    .then(function (response) {
      if (!response.ok) throw new Error(response.status);
      return response.json();
    })
    .then(function (data) {
      start(Array.isArray(data) ? data : (data && data.samples) || []);
    })
    .catch(function () {
      /* Leave the resting state exactly as the HTML shipped it. */
    });
})();
