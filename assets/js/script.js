/**
 * PrompterNG v1.0.0 - Browser-based Prompter with Remote Control
 * Based on TelePrompter v1.2.2 by Peter Schmalfeldt (https://github.com/manifestinteractive/teleprompter)
 * (c) 2026 Mohammed Besar
 * License: https://github.com/mmBesar/PrompterNG/blob/master/LICENSE
 */
var PrompterNG = (function() {
  /**
   * ==================================================
   * Prompter NG App Settings
   * ==================================================
   */

  /* DOM Elements used by App */
  var $elm = {};

  /* App Settings */
  var emitTimeout,
    debug = false,
    initialized = false,
    isPlaying = false,
    remote,
    scrollDelay,
    socket,
    modalOpen = false,
    timeout,
    timer,
    timerExp = 10,
    timerURL,
    version = 'v1.0.0';

  /* Default App Settings */
var defaultConfig = {
    backgroundColor: '#141414',
    dimControls: true,
    flipX: false,
    flipY: false,
    fontSize: 60,
    pageSpeed: 35,
    pageScrollPercent: 0,
    textColor: '#ffffff',
    textWidth: 90
  };

  /* Custom App Settings */
  var config = Object.assign({}, defaultConfig);

  /**
   * ==================================================
   * PrompterNG Init Functions
   * ==================================================
   */

  /**
   * Bind Events to DOM Elements
   */
  function bindEvents() {
    // Cache DOM Elements
    $elm.article = $('article');
    $elm.backgroundColor = $('#background-color');
    $elm.body = $('body');
    $elm.buttonDimControls = $('.button.dim-controls');
    $elm.buttonFlipX = $('.button.flip-x');
    $elm.buttonFlipY = $('.button.flip-y');
    $elm.buttonPlay = $('.button.play');
    $elm.buttonRemote = $('.button.remote');
    $elm.buttonReset = $('.button.reset');
    $elm.closeModal = $('.close-modal');
    $elm.fontSize = $('.font_size');
    $elm.header = $('header');
    $elm.headerContent = $('header h1, header nav');
    $elm.markerOverlay = $('.marker, .overlay');
    $elm.modal = $('#modal');
    $elm.remoteID = $('.remote-id');
    $elm.remoteURL = $('.remote-url');
    $elm.remoteControlModal = $('#remote-control-modal');
    $elm.speed = $('.speed');
    $elm.teleprompter = $('#teleprompter');
    $elm.textColor = $('#text-color');
    $elm.window = $(window);
    $elm.markdownEditor = $('#markdown-editor');
    $elm.buttonEditToggle = $('.button.edit-toggle');
    $elm.buttonFullscreen = $('.button.fullscreen-toggle');

    // Bind Events
    $elm.buttonEditToggle.on('click.prompterng', handleEditToggle);
    $elm.buttonFullscreen.on('click.prompterng', handleFullscreen);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.getElementById('fullscreen-exit-btn').addEventListener('click', handleFullscreen);
    $elm.backgroundColor.on('change.prompterng', handleBackgroundColor);
    $elm.buttonDimControls.on('click.prompterng', handleDim);
    $elm.buttonFlipX.on('click.prompterng', handleFlipX);
    $elm.buttonFlipY.on('click.prompterng', handleFlipY);
    $elm.buttonPlay.on('click.prompterng', handlePlay);
    $elm.buttonRemote.on('click.prompterng', handleRemote);
    $elm.buttonReset.on('click.prompterng', handleReset);
    $elm.closeModal.on('click.prompterng', handleCloseModal);
    $elm.textColor.on('change.prompterng', handleTextColor);

    // Listen for Key Presses
    $elm.teleprompter.keyup(updateDisplay);
    $elm.body.keydown(navigate);
  }

  /**
   * Initialize PrompterNG App
   */
  function init() {
    // Exit if already started
    if (initialized) {
      return;
    }

    // Initialize marked with bidi support for Arabic/English mixed text
    marked.use(markedBidi());
    marked.setOptions({ breaks: true });

    // Startup App
    bindEvents();
    initSettings();
    initUI();
    initRemote();

    // Track that PrompterNG has started
    initialized = true;

    if (debug) {
      console.log('[TP]', 'PrompterNG Initialized');
    }
  }

  /**
   * Initialize Remote
   */
  function initRemote() {
    // Connect to Remote if Provided
    var currentRemote = localStorage.getItem('prompterng_remote_id');
    if (currentRemote && currentRemote.length === 6) {
      // Wait a second for socket to load
      setTimeout(function(){
        remoteConnect(currentRemote);
      }, 1000);
    }

    if (debug) {
      console.log('[TP]', 'Remote Initialized', currentRemote ? '( Remote ID: ' + currentRemote + ' )' : '( No Remote )');
    }
  }

  /**
   * Initialize Settings ( Pull from URL First, then Local Storage )
   */
  function initSettings() {
    // Check if there are already URL Params
    var urlParams = getUrlVars();
    if (urlParams) {
      // Update Background Color if Present, otherwise Set to Default since Not Present
      if (urlParams.backgroundColor) {
        config.backgroundColor = decodeURIComponent(urlParams.backgroundColor);
        localStorage.setItem('prompterng_background_color', config.backgroundColor);
      } else {
        config.backgroundColor = defaultConfig.backgroundColor;
        localStorage.removeItem('prompterng_background_color');
      }

      // Update Dim Controls if Present, otherwise Set to Default since Not Present
      if (urlParams.dimControls) {
        config.dimControls = (decodeURIComponent(urlParams.dimControls) === 'true');
        localStorage.setItem('prompterng_dim_controls', config.dimControls);
      } else {
        config.dimControls = defaultConfig.dimControls;
        localStorage.removeItem('prompterng_dim_controls');
      }

      // Update Flip X if Present, otherwise Set to Default since Not Present
      if (urlParams.flipX) {
        config.flipX = (decodeURIComponent(urlParams.flipX) === 'true');
        localStorage.setItem('prompterng_flip_x', config.flipX);
      } else {
        config.flipX = defaultConfig.flipX;
        localStorage.removeItem('prompterng_flip_x');
      }

      // Update Flip Y if Present, otherwise Set to Default since Not Present
      if (urlParams.flipY) {
        config.flipY = (decodeURIComponent(urlParams.flipY) === 'true');
        localStorage.setItem('prompterng_flip_y', config.flipY);
      } else {
        config.flipY = defaultConfig.flipY;
        localStorage.removeItem('prompterng_flip_y');
      }

      // Update Font Size if Present, otherwise Set to Default since Not Present
      if (urlParams.fontSize) {
        config.fontSize = parseInt(decodeURIComponent(urlParams.fontSize));
        localStorage.setItem('prompterng_font_size', config.fontSize);
      } else {
        config.fontSize = defaultConfig.fontSize;
        localStorage.removeItem('prompterng_font_size');
      }

      // Update Page Speed if Present, otherwise Set to Default since Not Present
      if (urlParams.pageSpeed) {
        config.pageSpeed = parseInt(decodeURIComponent(urlParams.pageSpeed));
        localStorage.setItem('prompterng_speed', config.pageSpeed);
      } else {
        config.pageSpeed = defaultConfig.pageSpeed;
        localStorage.removeItem('prompterng_speed');
      }

      // Update Text Color if Present, otherwise Set to Default since Not Present
      if (urlParams.textColor) {
        config.textColor = decodeURIComponent(urlParams.textColor);
        localStorage.setItem('prompterng_text_color', config.textColor);
      } else {
        config.textColor = defaultConfig.textColor;
        localStorage.removeItem('prompterng_text_color');
      }
    }

    // Check if we've been here before and made changes
    if (localStorage.getItem('prompterng_background_color')) {
      config.backgroundColor = localStorage.getItem('prompterng_background_color');

      // Update UI with Custom Background Color
      $elm.backgroundColor.val(config.backgroundColor);
      $elm.article.css('background-color', config.backgroundColor);
      $elm.body.css('background-color', config.backgroundColor);
      $elm.teleprompter.css('background-color', config.backgroundColor);
    } else {
      cleanDisplay();
    }

    if (localStorage.getItem('prompterng_dim_controls')) {
      config.dimControls = localStorage.getItem('prompterng_dim_controls') === 'true';

      // Update Indicator
      if (config.dimControls) {
        $elm.buttonDimControls.removeClass('icon-eye-open').addClass('icon-eye-close');
      } else {
        $elm.buttonDimControls.removeClass('icon-eye-close').addClass('icon-eye-open');
      }
    }

    if (localStorage.getItem('prompterng_flip_x')) {
      config.flipX = localStorage.getItem('prompterng_flip_x') === 'true';

      // Update Indicator
      if (config.flipX) {
        $elm.buttonFlipX.addClass('active');
      }
    }

    if (localStorage.getItem('prompterng_flip_y')) {
      config.flipY = localStorage.getItem('prompterng_flip_y') === 'true';

      // Update Indicator
      if (config.flipY) {
        $elm.buttonFlipY.addClass('active');
      }
    }

    if (localStorage.getItem('prompterng_font_size')) {
      config.fontSize = localStorage.getItem('prompterng_font_size');
    }

    if (localStorage.getItem('prompterng_speed')) {
      config.pageSpeed = localStorage.getItem('prompterng_speed');
    }

    if (localStorage.getItem('prompterng_markdown')) {
      var savedMarkdown = localStorage.getItem('prompterng_markdown');
      $elm.markdownEditor.val(savedMarkdown);
      $elm.teleprompter.html(marked.parse(savedMarkdown.replace(/^[\u200B\u200C\u200D\u200E\u200F\uFEFF]/g, '')));
    } else if (localStorage.getItem('prompterng_text')) {
      // Legacy: migrate old HTML content
      var legacyText = localStorage.getItem('prompterng_text');
      $elm.teleprompter.html(legacyText);
    }

    if (localStorage.getItem('prompterng_text_color')) {
      config.textColor = localStorage.getItem('prompterng_text_color');
      $elm.textColor.val(config.textColor);
      $elm.teleprompter.css('color', config.textColor);
    }

    if (localStorage.getItem('prompterng_text_width')) {
      config.textWidth = parseInt(localStorage.getItem('prompterng_text_width'));
    } else {
      config.textWidth = defaultConfig.textWidth;
    }
    $elm.teleprompter.css('max-width', config.textWidth + '%');

    if (debug) {
      console.log('[TP]', 'Settings Initialized', urlParams ? urlParams : '( No URL Params )');
    }
  }

  /**
   * Initialize UI
   */
  function initUI() {
    // Create Timer
    timer = $('.clock').timer({
      stopVal: 10000,
      onChange: function(time) {
        if (socket && remote) {
          socket.emit('clientCommand', 'updateTime', time);
        }
      }
    });

    // Update Flip text if Present
    if (config.flipX && config.flipY) {
      $elm.teleprompter.addClass('flip-xy');
    } else if (config.flipX) {
      $elm.teleprompter.addClass('flip-x');
    } else if (config.flipY) {
      $elm.teleprompter.addClass('flip-y');
    }

    // Setup GUI
    $elm.article.stop().animate({
      scrollTop: 0
    }, 100, 'linear', function() {
      $elm.article.clearQueue();
    });

    // Set Overlay and Display Defaults
    $elm.markerOverlay.fadeOut(0);
    $elm.teleprompter.css({
      'padding-bottom': Math.ceil($elm.window.height() - $elm.header.height()) + 'px'
    });

    // Add proper touch support for mobile sliders
    function addTouchSupport(slider) {
      var el = slider[0];

      el.addEventListener('touchstart', function(e) {
        e.preventDefault();
        var touch = e.touches[0];
        el.dispatchEvent(new MouseEvent('mousedown', {
          bubbles: true,
          cancelable: true,
          clientX: touch.clientX,
          clientY: touch.clientY
        }));
      }, { passive: false });

      el.addEventListener('touchmove', function(e) {
        e.preventDefault();
        var touch = e.touches[0];
        document.dispatchEvent(new MouseEvent('mousemove', {
          bubbles: true,
          cancelable: true,
          clientX: touch.clientX,
          clientY: touch.clientY
        }));
      }, { passive: false });

      el.addEventListener('touchend', function(e) {
        e.preventDefault();
        document.dispatchEvent(new MouseEvent('mouseup', {
          bubbles: true,
          cancelable: true
        }));
      }, { passive: false });
    }

    // Create Font Size Slider
    $elm.fontSize.slider({
      min: 12,
      max: 100,
      value: config.fontSize,
      orientation: 'horizontal',
      range: 'min',
      animate: true,
      slide: function() {
        updateFontSize(true);
      },
      change: function() {
        updateFontSize(true);
      }
    });

    // Create Speed Slider
    $elm.speed.slider({
      min: 0,
      max: 50,
      value: config.pageSpeed,
      orientation: 'horizontal',
      range: 'min',
      animate: true,
      slide: function() {
        updateSpeed(true);
      },
      change: function() {
        updateSpeed(true);
      }
    });

    // Apply touch support to sliders
    addTouchSupport($elm.fontSize);
    addTouchSupport($elm.speed);

    // Run initial configuration on sliders
    if (config.fontSize !== defaultConfig.fontSize) {
      updateFontSize(false);
    }

    if (config.pageSpeed !== defaultConfig.pageSpeed) {
      updateSpeed(false);
    }

    // Clean up Empty Paragraph Tags
    $('p:empty', $elm.teleprompter).remove();

    // Update UI with Ready Class
    $elm.teleprompter.addClass('ready');

    if (debug) {
      console.log('[TP]', 'UI Initialized');
    }
  }

  /**
   * ==================================================
   * Core Functions
   * ==================================================
   */

  /**
   * Clean Display
   */
  function cleanDisplay() {
    var text = $elm.teleprompter.html();
    text = text.replace(/<br>+/g, '@@').replace(/@@@@/g, '</p><p>');
    text = text.replace(/@@/g, '<br>');
    text = text.replace(/([a-z])\. ([A-Z])/g, '$1.&nbsp;&nbsp; $2');
    text = text.replace(/<p><\/p>/g, '');

    if (text && text.substr(0, 3) !== '<p>') {
      text = '<p>' + text + '</p>';
    }

    $elm.teleprompter.html(text);
    $('p:empty', $elm.teleprompter).remove();
  }
  /**
   * Get App Config
   * @param {String} key
   * @returns Object
   */
  function getConfig(key) {
    return key ? config[key] : config;
  }

  /**
   * Get URL Params
   */
  function getUrlVars() {
    var paramCount = 0;
    var vars = {};

    window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m, key, value) {
      paramCount++;
      vars[key] = value;
    });

    if (debug) {
      console.log('[TP]', 'URL Params:', paramCount > 0 ? vars : null);
    }

    return (paramCount > 0) ? vars : null;
  }

  /**
   * Handle Background Color
   */
  function handleBackgroundColor() {
    config.backgroundColor = $elm.backgroundColor.val();

    $elm.teleprompter.css('background-color', config.backgroundColor);
    $elm.article.css('background-color', config.backgroundColor);
    $elm.body.css('background-color', config.backgroundColor);
    localStorage.setItem('prompterng_background_color', config.backgroundColor);

    if (socket && remote) {
      clearTimeout(emitTimeout);
      emitTimeout = setTimeout(function(){
        socket.emit('clientCommand', 'updateConfig', config);
      }, timerExp);
    }

    if (debug) {
      console.log('[TP]', 'Background Color Changed:', config.backgroundColor);
    }

    // Update URL Params
    clearTimeout(timerURL);
    timerURL = setTimeout(updateURL, timerExp);
    updateURL();
  }

  /**
   * Handle Closing Modal
   */
  function handleCloseModal() {
    // Reset Focus on Remote Button if needed
    if ($elm.remoteControlModal.is(':visible')) {
      $elm.buttonRemote.focus();
    }

    $elm.modal.hide();
    $elm.remoteControlModal.hide();

    modalOpen = false;
  }

  /**
   * Handle Dimming Layovers
   * @param {Object} evt
   * @param {Boolean} skipUpdate
   */
  function handleDim(evt, skipUpdate) {
    if (config.dimControls) {
      config.dimControls = false;
      $elm.buttonDimControls.removeClass('icon-eye-close').addClass('icon-eye-open');
      $elm.headerContent.fadeTo('slow', 1);
      $elm.markerOverlay.fadeOut('slow');
    } else {
      config.dimControls = true;
      $elm.buttonDimControls.removeClass('icon-eye-open').addClass('icon-eye-close');

      if (isPlaying) {
        $elm.headerContent.fadeTo('slow', 0.15);
        $elm.markerOverlay.fadeIn('slow');
      }
    }

    localStorage.setItem('prompterng_dim_controls', config.dimControls);

    if (socket && remote && !skipUpdate) {
      clearTimeout(emitTimeout);
      emitTimeout = setTimeout(function(){
        socket.emit('clientCommand', 'updateConfig', config);
      }, timerExp);
    }

    if (debug) {
      console.log('[TP]', 'Dim Control Changed:', config.dimControls);
    }

    // Update URL Params
    clearTimeout(timerURL);
    timerURL = setTimeout(updateURL, timerExp);
  }

  /**
   * Handle Flipping Text Horizontally
   * @param {Object} evt
   * @param {Boolean} skipUpdate
   */
  function handleFlipX(evt, skipUpdate) {
    timer.resetTimer();

    if (socket && remote) {
      socket.emit('clientCommand', 'updateTime', '00:00:00');
    }

    // Remove Flip Classes
    $elm.teleprompter.removeClass('flip-x').removeClass('flip-xy');

    if (config.flipX) {
      config.flipX = false;

      $elm.buttonFlipX.removeClass('active');
    } else {
      config.flipX = true;

      $elm.buttonFlipX.addClass('active');

      if (config.flipY) {
        $elm.teleprompter.addClass('flip-xy');
      } else {
        $elm.teleprompter.addClass('flip-x');
      }
    }

    localStorage.setItem('prompterng_flip_x', config.flipX);

    if (socket && remote && !skipUpdate) {
      clearTimeout(emitTimeout);
      emitTimeout = setTimeout(function(){
        socket.emit('clientCommand', 'updateConfig', config);
      }, timerExp);
    }

    if (debug) {
      console.log('[TP]', 'Flip X Changed:', config.flipX);
    }

    // Update URL Params
    clearTimeout(timerURL);
    timerURL = setTimeout(updateURL, timerExp);
    updateURL();
  }

  /**
   * Handle Flipping Text Vertically
   * @param {Object} evt
   * @param {Boolean} skipUpdate
   */
  function handleFlipY(evt, skipUpdate) {
    timer.resetTimer();

    if (socket && remote) {
      socket.emit('clientCommand', 'updateTime', '00:00:00');
    }

    // Remove Flip Classes
    $elm.teleprompter.removeClass('flip-y').removeClass('flip-xy');

    if (config.flipY) {
      config.flipY = false;

      $elm.buttonFlipY.removeClass('active');
    } else {
      config.flipY = true;

      $elm.buttonFlipY.addClass('active');

      if (config.flipX) {
        $elm.teleprompter.addClass('flip-xy');
      } else {
        $elm.teleprompter.addClass('flip-y');
      }
    }

    localStorage.setItem('prompterng_flip_y', config.flipY);

    if (config.flipY) {
      $elm.article.stop().animate({
        scrollTop: $elm.teleprompter.height() + 100
      }, 250, 'swing', function() {
        $elm.article.clearQueue();
      });
    } else {
      $elm.article.stop().animate({
        scrollTop: 0
      }, 250, 'swing', function() {
        $elm.article.clearQueue();
      });
    }

    if (socket && remote && !skipUpdate) {
      clearTimeout(emitTimeout);
      emitTimeout = setTimeout(function(){
        socket.emit('clientCommand', 'updateConfig', config);
      }, timerExp);
    }

    if (debug) {
      console.log('[TP]', 'Flip Y Changed:', config.flipY);
    }

    // Update URL Params
    clearTimeout(timerURL);
    timerURL = setTimeout(updateURL, timerExp);
    updateURL();
  }

  /**
   * Handle Updating Text Color
   */
  function handleTextColor() {
    config.textColor = $elm.textColor.val();

    $elm.teleprompter.css('color', config.textColor);
    localStorage.setItem('prompterng_text_color', config.textColor);

    if (socket && remote) {
      clearTimeout(emitTimeout);
      emitTimeout = setTimeout(function(){
        socket.emit('clientCommand', 'updateConfig', config);
      }, timerExp);
    }

    if (debug) {
      console.log('[TP]', 'Text Color Changed:', config.textColor);
    }

    // Update URL Params
    clearTimeout(timerURL);
    timerURL = setTimeout(updateURL, timerExp);
    updateURL();
  }

  /**
   * Handle Play Button Press
   */
  function handlePlay() {
    if (!isPlaying) {
      startPrompter();
    } else {
      stopPrompter();
    }
  }

  /**
   * Handle Remote Button Press
   */
  function handleRemote() {
    if (!socket && !remote) {
      var currentRemote = localStorage.getItem('prompterng_remote_id');
      remoteConnect(currentRemote);
    }

    $elm.modal.css('display', 'flex');
    $elm.remoteControlModal.show();
    $elm.buttonRemote.blur();
    modalOpen = true;

    if (debug) {
      console.log('[TP]', 'Remote Button Pressed');
    }
  }

  /**
   * Handle Reset Button Press
   */
  function handleReset() {
    stopPrompter();
    timer.resetTimer();

    config.pageScrollPercent = 0;

    $elm.article.stop().animate({
      scrollTop: 0
    }, 100, 'linear', function() {
      $elm.article.clearQueue();
    });

    if (socket && remote) {
      socket.emit('clientCommand', 'updateTime', '00:00:00');
      clearTimeout(emitTimeout);
      emitTimeout = setTimeout(function(){
        socket.emit('clientCommand', 'updateConfig', config);
      }, timerExp);
    }

    if (debug) {
      console.log('[TP]', 'Reset Button Pressed');
    }
  }

  /**
   * Listen for Keyboard Navigation
   * @param {Object} evt
   * @returns Boolean
   */
  function navigate(evt) {
    var space = 32,
      escape = 27,
      left = 37,
      up = 38,
      right = 39,
      down = 40,
      page_up = 33,
      page_down = 34,
      b_key = 66,
      e_key = 69,
      f_key = 70,
      f5_key = 116,
      period_key = 190,
      tab = 9,
      speed = $elm.speed.slider('value'),
      font_size = $elm.fontSize.slider('value');

    // Allow text edit inside display div or tab key press
    if (evt.target.id === 'teleprompter' || evt.keyCode === tab) {
      return;
    }

    // Allow text edit if we're inside the markdown editor textarea
    if (evt.target.id === 'markdown-editor') {
      // Only allow Escape to blur the textarea
      if (evt.keyCode === escape) {
        $elm.markdownEditor.blur();
        evt.preventDefault();
        evt.stopPropagation();
        return false;
      }
      return;
    }

    // Check if Escape Key and Modal Open
    if (evt.keyCode == escape && modalOpen) {
      if ($elm.remoteControlModal.is(':visible')) {
        $elm.buttonRemote.focus();
      }
      $elm.modal.hide();
      modalOpen = false;
      evt.preventDefault();
      evt.stopPropagation();
      return false;
    }

    // Skip if UI element or Modal Open
    if (modalOpen || evt.target.nodeName === 'INPUT' || evt.target.nodeName === 'BUTTON' || evt.target.nodeName === 'A' || evt.target.nodeName === 'SPAN' || evt.target.nodeName === 'TEXTAREA') {
      return;
    }

    // Alt + F — Toggle Fullscreen
    if (evt.altKey && evt.keyCode == f_key) {
      handleFullscreen();
      evt.preventDefault();
      evt.stopPropagation();
      return false;
    }

    // Alt + E — Toggle Edit/Preview
    if (evt.altKey && evt.keyCode == e_key) {
      handleEditToggle();
      evt.preventDefault();
      evt.stopPropagation();
      return false;
    }

    // Alt + Up — Increase Font Size
    if (evt.altKey && evt.keyCode == up) {
      $elm.fontSize.slider('value', font_size + 1);
      evt.preventDefault();
      evt.stopPropagation();
      return false;
    }

    // Alt + Down — Decrease Font Size
    if (evt.altKey && evt.keyCode == down) {
      $elm.fontSize.slider('value', font_size - 1);
      evt.preventDefault();
      evt.stopPropagation();
      return false;
    }

    // Skip remaining hotkeys if Alt is held (avoid browser conflicts)
    if (evt.altKey) {
      return;
    }

    // Reset GUI
    if (evt.keyCode == escape) {
      $elm.buttonReset.trigger('click');
      evt.preventDefault();
      evt.stopPropagation();
      return false;
    }
    // Start / Stop Scrolling
    else if (evt.keyCode == space || [b_key, f5_key, period_key].includes(evt.keyCode)) {
      $elm.buttonPlay.trigger('click');
      evt.preventDefault();
      evt.stopPropagation();
      return false;
    }
    // Decrease Speed
    else if (evt.keyCode == left || evt.keyCode == page_up) {
      $elm.speed.slider('value', speed - 1);
      evt.preventDefault();
      evt.stopPropagation();
      return false;
    }
    // Increase Speed
    else if (evt.keyCode == right || evt.keyCode == page_down) {
      $elm.speed.slider('value', speed + 1);
      evt.preventDefault();
      evt.stopPropagation();
      return false;
    }
    // Scroll Up manually
    else if (evt.keyCode == up) {
      var lineHeight = parseInt($elm.teleprompter.css('line-height'));
      $elm.article.stop().animate({
        scrollTop: '-=' + Math.round(lineHeight * 0.6) + 'px'
      }, 200, 'swing', function() {
        $elm.article.clearQueue();
      });
      evt.preventDefault();
      evt.stopPropagation();
      return false;
    }
    // Scroll Down manually
    else if (evt.keyCode == down) {
      var lineHeight = parseInt($elm.teleprompter.css('line-height'));
      $elm.article.stop().animate({
        scrollTop: '+=' + Math.round(lineHeight * 0.6) + 'px'
      }, 200, 'swing', function() {
        $elm.article.clearQueue();
      });
      evt.preventDefault();
      evt.stopPropagation();
      return false;
    }
    // Decrease text width [
    else if (evt.keyCode == 219) {
      config.textWidth = Math.max(30, (config.textWidth || 90) - 5);
      $elm.teleprompter.css('max-width', config.textWidth + '%');
      localStorage.setItem('prompterng_text_width', config.textWidth);
      evt.preventDefault();
      evt.stopPropagation();
      return false;
    }
    // Increase text width ]
    else if (evt.keyCode == 221) {
      config.textWidth = Math.min(100, (config.textWidth || 90) + 5);
      $elm.teleprompter.css('max-width', config.textWidth + '%');
      localStorage.setItem('prompterng_text_width', config.textWidth);
      evt.preventDefault();
      evt.stopPropagation();
      return false;
    }
  }

  /**
   * Manage Scrolling
   */
  function pageScroll() {
    var offset = 1;
    var animate = 0;

    if (config.pageSpeed == 0) {
      $elm.article.stop().clearQueue();
      clearTimeout(scrollDelay);
      scrollDelay = setTimeout(pageScroll, 500);
      return;
    }

    clearTimeout(scrollDelay);
    scrollDelay = setTimeout(pageScroll, Math.floor(50 - config.pageSpeed));

    if ($elm.teleprompter.hasClass('flip-y')) {
      $elm.article.stop().animate({
        scrollTop: '-=' + offset + 'px'
      }, animate, 'linear', function() {
        $elm.article.clearQueue();
      });

      // We're at the bottom of the document, stop
      if ($elm.article.scrollTop() === 0) {
        stopPrompter();
        setTimeout(function() {
          $elm.article.stop().animate({
            scrollTop: $elm.teleprompter.height() + 100
          }, 500, 'swing', function() {
            $elm.article.clearQueue();
          });
        }, 500);
      }
    } else {
      $elm.article.stop().animate({
        scrollTop: '+=' + offset + 'px'
      }, animate, 'linear', function() {
        $elm.article.clearQueue();
      });

      // We're at the bottom of the document, stop
      if ($elm.article.scrollTop() >= (($elm.article[0].scrollHeight - $elm.window.height()) - 100)) {
        stopPrompter();
        setTimeout(function() {
          $elm.article.stop().animate({
            scrollTop: 0
          }, 500, 'swing', function() {
            $elm.article.clearQueue();
          });
        }, 500);
      }
    }

    // Update pageScrollPercent
    clearTimeout(timeout);
    timeout = setTimeout(function() {
      $elm.win = $elm.article[0];
      var scrollHeight = $elm.win.scrollHeight;
      var scrollTop = $elm.win.scrollTop;
      var clientHeight = $elm.win.clientHeight;

      config.pageScrollPercent = Math.round(((scrollTop / (scrollHeight - clientHeight)) + Number.EPSILON) * 100);

      if (socket && remote) {
        clearTimeout(emitTimeout);
        emitTimeout = setTimeout(function(){
          socket.emit('clientCommand', 'updateConfig', config);
        }, timerExp);
      }
    }, animate);
  }

  /**
   * Create Random String for Remote
   * @returns string
   */
  function randomString() {
    var chars = '3456789ABCDEFGHJKLMNPQRSTUVWXY';
    var length = 6;
    var string = '';

    for (var i = 0; i < length; i++) {
      var num = Math.floor(Math.random() * chars.length);
      string += chars.substring(num, num + 1);
    }

    return string;
  }

  /**
   * Connect to Remote
   * @param {String} currentRemote Current Remote ID
   */
  function remoteConnect(currentRemote) {
    if (typeof io === 'undefined') {
      $elm.buttonRemote.removeClass('active');
      localStorage.removeItem('prompterng_remote_id');
      return;
    }

    socket = io.connect(window.location.protocol + '//' + window.location.host, {
      path: '/socket.io'
    });

    remote = (currentRemote) ? currentRemote.replace('REMOTE_', '') : randomString();

    socket.on('connect', function() {
      var $code = document.getElementById('qr-code');
      $code.innerHTML = '';
      socket.emit('connectToRemote', 'REMOTE_' + remote);

      $elm.remoteURL.text(window.location.protocol + '//' + window.location.host + '/remote');

      var url = window.location.protocol + '//' + window.location.host + '/remote?id=' + remote;

      new QRCode($code, url);
      $elm.remoteID.text(remote);

      if (debug) {
        console.log('[IO]', 'Socket Connected');
      }
    });

    socket.on('disconnect', function() {
      $elm.buttonRemote.removeClass('active');
      localStorage.removeItem('prompterng_remote_id');

      if (debug) {
        console.log('[IO]', 'Socket Disconnected');
      }
    });

    socket.on('connectedToRemote', function() {
      localStorage.setItem('prompterng_remote_id', remote);
      $elm.buttonRemote.addClass('active');

      clearTimeout(emitTimeout);
      emitTimeout = setTimeout(function(){
        socket.emit('clientCommand', 'updateConfig', config);
      }, timerExp);

      if (debug) {
        console.log('[IO]', 'Remote Connected:', remote);
      }
    });

    socket.on('remoteControl', function(command, value) {
      if (debug) {
        console.log('[TP]', 'remoteControl', command, value);
      }

      switch (command) {
        case 'reset':
          handleReset();
          break;

        case 'power':
          remoteDisconnect();
          break;

        case 'play':
          $elm.buttonPlay.trigger('click');
          break;

        case 'hideModal':
          $elm.modal.hide();
          break;

        case 'getConfig':
          if (socket && remote) {
            clearTimeout(emitTimeout);
            emitTimeout = setTimeout(function(){
              socket.emit('clientCommand', 'updateConfig', config);
            }, timerExp);
          }
          break;

        case 'updateConfig':
          clearTimeout(emitTimeout);
          remoteUpdate(config, value);
          break;

        case 'updateText':
          if (value) {
            var clean = value.replace(/^[\u200B\u200C\u200D\u200E\u200F\uFEFF]/g, '');
            var parsed = marked.parse(clean);
            $elm.markdownEditor.val(clean);
            $elm.teleprompter.html(parsed);
            localStorage.setItem('prompterng_markdown', clean);
            localStorage.setItem('prompterng_text', $elm.teleprompter.html());
            // Switch to preview mode if in edit mode
            if ($elm.body.hasClass('edit-mode')) {
              $elm.body.removeClass('edit-mode');
              $elm.buttonEditToggle.removeClass('active');
            }
          }
          break;
      }
    });
  }

  /**
   * Handle Edit / Preview Toggle
   */
  function handleEditToggle() {
    if ($elm.body.hasClass('edit-mode')) {
      // Switch to preview — parse markdown and render
      var markdown = $elm.markdownEditor.val().replace(/^[\u200B\u200C\u200D\u200E\u200F\uFEFF]/g, '');
      if (markdown.trim()) {
        var parsed = marked.parse(markdown);
        $elm.teleprompter.html(parsed);
        localStorage.setItem('prompterng_markdown', markdown);
        localStorage.setItem('prompterng_text', $elm.teleprompter.html());
      }
      $elm.body.removeClass('edit-mode');
      $elm.buttonEditToggle.removeClass('active');
    } else {
      // Switch to edit — load raw markdown into textarea
      var currentMarkdown = localStorage.getItem('prompterng_markdown') || '';
      $elm.markdownEditor.val(currentMarkdown);
      $elm.body.addClass('edit-mode');
      $elm.buttonEditToggle.addClass('active');
      $elm.markdownEditor.focus();
    }

    if (debug) {
      console.log('[TP]', 'Edit Toggle');
    }
  }

  /**
   * Handle Fullscreen Toggle
   */
  function handleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(function(err) {
        console.warn('Fullscreen error:', err);
      });
    } else {
      document.exitFullscreen();
    }

    if (debug) {
      console.log('[TP]', 'Fullscreen Toggle');
    }
  }

  /**
   * Handle Fullscreen Change (catches ESC, back gesture, and button)
   */
  function handleFullscreenChange() {
    if (document.fullscreenElement) {
      $elm.body.addClass('fullscreen-mode');
      $elm.buttonFullscreen.removeClass('icon-fullscreen').addClass('icon-fullscreen-exit');
    } else {
      $elm.body.removeClass('fullscreen-mode');
      $elm.buttonFullscreen.removeClass('icon-fullscreen-exit').addClass('icon-fullscreen');
    }
  }

  /**
   * Disconnect from Remote
   */
  function remoteDisconnect() {
    if (socket && remote) {
      socket.disconnect();
      remote = null;
    }

    if (debug) {
      console.log('[IO]', 'Remote Disconnected');
    }
  }

  /**
   * Handle Updates from Remote
   * @param {Object} oldConfig
   * @param {Object} newConfig
   */
  function remoteUpdate(oldConfig, newConfig) {
    if (debug) {
      console.log('[IO]', 'Remote Update');
      console.log('[IO]', 'Old Config:', oldConfig);
      console.log('[IO]', 'New Config:', newConfig);
    }

    if (oldConfig.dimControls !== newConfig.dimControls) {
      handleDim(null, true);
    }

    if (oldConfig.flipX !== newConfig.flipX) {
      handleFlipX(null, true);
    }

    if (oldConfig.flipY !== newConfig.flipY) {
      handleFlipY(null, true);
    }

    if (oldConfig.fontSize !== newConfig.fontSize) {
      $elm.fontSize.slider('value', newConfig.fontSize);
      updateFontSize(true, true);
    }

    if (oldConfig.pageSpeed !== newConfig.pageSpeed) {
      $elm.speed.slider('value', newConfig.pageSpeed);
      updateSpeed(true, true);
    }

    if (oldConfig.textWidth !== newConfig.textWidth) {
      config.textWidth = newConfig.textWidth;
      $elm.teleprompter.css('max-width', config.textWidth + '%');
      localStorage.setItem('prompterng_text_width', config.textWidth);
    }

    if (oldConfig.pageScrollPercent !== newConfig.pageScrollPercent) {
      config.pageScrollPercent = newConfig.pageScrollPercent;

      stopPrompter();

      $elm.win = $elm.article[0];
      var scrollHeight = $elm.win.scrollHeight;
      var clientHeight = $elm.win.clientHeight;

      var maxScrollStop = (scrollHeight - clientHeight);
      var percent = parseInt(config.pageScrollPercent) / 100;
      var newScrollTop = maxScrollStop * percent

      $elm.article.stop().animate({
        scrollTop: newScrollTop + 'px'
      }, 0, 'linear', function() {
        $elm.article.clearQueue();
      });
    }

    // Update URL Params
    clearTimeout(timerURL);
    timerURL = setTimeout(updateURL, timerExp);
    updateURL();
  }

  /**
   * Start Prompter
   */
  function startPrompter() {
    // Check if Already Playing
    if (isPlaying) {
      return;
    }

    if (socket && remote) {
      socket.emit('clientCommand', 'play');
    }

    $elm.teleprompter.attr('contenteditable', false);
    $elm.body.addClass('playing');
    $elm.buttonPlay.removeClass('icon-play').addClass('icon-pause');

    if (config.dimControls) {
      $elm.headerContent.fadeTo('slow', 0.15);
      $elm.markerOverlay.fadeIn('slow');
    }

    timer.startTimer();

    pageScroll();

    isPlaying = true;

    if (debug) {
      console.log('[TP]', 'Starting PrompterNG');
    }
  }

  /**
   * Stop Prompter
   */
  function stopPrompter() {
    // Check if Already Stopped
    if (!isPlaying) {
      return;
    }

    if (socket && remote) {
      socket.emit('clientCommand', 'stop');
    }

    clearTimeout(scrollDelay);
    $elm.teleprompter.attr('contenteditable', true);

    if (config.dimControls) {
      $elm.headerContent.fadeTo('slow', 1);
      $elm.markerOverlay.fadeOut('slow');
    }

    $elm.buttonPlay.removeClass('icon-pause').addClass('icon-play');
    $elm.body.removeClass('playing');

    timer.stopTimer();

    isPlaying = false;

    if (debug) {
      console.log('[TP]', 'Stopping PrompterNG');
    }
  }

  /**
   * Manage Font Size Change
   * @param {Boolean} save
   * @param {Boolean} skipUpdate
   */
  function updateFontSize(save, skipUpdate) {
    config.fontSize = $elm.fontSize.slider('value');

    $elm.teleprompter.css({
      'font-size': config.fontSize + 'px',
      'line-height': Math.ceil(config.fontSize * 1.5) + 'px',
      'padding-bottom': Math.ceil($elm.window.height() - $elm.header.height()) + 'px'
    });

    $('p', $elm.teleprompter).css({
      'padding-bottom': Math.ceil(config.fontSize * 0.25) + 'px',
      'margin-bottom': Math.ceil(config.fontSize * 0.25) + 'px'
    });

    $('label.font_size_label > span').text('(' + config.fontSize + ')');

    if (save) {
      localStorage.setItem('prompterng_font_size', config.fontSize);
    }

    if (socket && remote && !skipUpdate) {
      clearTimeout(emitTimeout);
      emitTimeout = setTimeout(function(){
        socket.emit('clientCommand', 'updateConfig', config);
      }, timerExp);
    }

    if (debug) {
      console.log('[TP]', 'Font Size Changed:', config.fontSize);
    }

    // Update URL Params
    clearTimeout(timerURL);
    timerURL = setTimeout(updateURL, timerExp);
    updateURL();
  }

  /**
   * Manage Speed Change
   * @param {Boolean} save
   * @param {Boolean} skipUpdate
   */
  function updateSpeed(save, skipUpdate) {
    config.pageSpeed = $elm.speed.slider('value');
    $('label.speed_label > span').text('(' + $elm.speed.slider('value') + ')');

    if (save) {
      localStorage.setItem('prompterng_speed', $elm.speed.slider('value'));
    }

    if (socket && remote && !skipUpdate) {
      clearTimeout(emitTimeout);
      emitTimeout = setTimeout(function(){
        socket.emit('clientCommand', 'updateConfig', config);
      }, timerExp);
    }

    if (debug) {
      console.log('[TP]', 'Page Speed Changed:', config.pageSpeed);
    }

    // Update URL Params
    clearTimeout(timerURL);
    timerURL = setTimeout(updateURL, timerExp);
    updateURL();
  }

  /**
   * Update Display Text
   * @param {Object} evt
   * @returns Boolean
   */
  function updateDisplay(evt) {
    if (evt.keyCode == 27) {
      $elm.teleprompter.blur();
      evt.preventDefault();
      evt.stopPropagation();
      return false;
    }

    localStorage.setItem('prompterng_text', $elm.teleprompter.html());
    $('p:empty', $elm.teleprompter).remove();
    localStorage.setItem('prompterng_markdown', $elm.markdownEditor.val());

    if (debug) {
      console.log('[TP]', 'Script Text Updated');
    }
  }

  /**
   * Push Config Params into URL for Sharable Configuration
   */
  function updateURL() {
    var custom = Object.assign({}, config);
    var keys = Object.keys(custom);

    keys.forEach(function(key) {
      // Remove Default Settings from URL
      if (custom[key] === defaultConfig[key]) {
        delete custom[key];
      }
    });

    if (Object.keys(custom).length > 0) {
      var urlParams = new URLSearchParams(custom);
      window.history.pushState(custom, 'PrompterNG', '/?' + urlParams);
    } else {
      window.history.pushState(null, 'PrompterNG', '/');
    }

    if (debug) {
      console.log('[TP]', 'URL Updated:', custom);
    }
  }

  /* Expose Public API */
  return {
    version: version,
    init: init,
    getConfig: getConfig,
    start: startPrompter,
    stop: stopPrompter,
    reset: handleReset,
    setDebug: function(bool) {
      debug = !!bool;
      return this;
    },
    setSpeed: function(speed) {
      speed = Math.min(50, Math.max(0, speed));
      $elm.speed.slider('value', parseInt(speed));
      return this;
    },
    setFontSize: function(size) {
      size = Math.min(100, Math.max(12, size));
      $elm.fontSize.slider('value', parseInt(size));
      return this;
    },
    setDim: function(bool) {
      config.dimControls = !bool;
      handleDim();
      return this;
    },
    setFlipX: function(bool) {
      config.flipX = !bool;
      handleFlipX();
      return this;
    },
    setFlipY: function(bool) {
      config.flipY = !bool;
      handleFlipY();
      return this;
    }
  }
})();
