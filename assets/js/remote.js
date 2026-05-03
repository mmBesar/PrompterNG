/**
 * PrompterNG v1.0.0 - Browser-based Prompter with Remote Control
 * Based on TelePrompter v1.2.2 by Peter Schmalfeldt (https://github.com/manifestinteractive/teleprompter)
 * (c) 2026 Mohammed Besar
 * License: https://github.com/mmBesar/PrompterNG/blob/master/LICENSE
 */
 var PrompterNGRemote = (function() {
  /**
   * ==================================================
   * Prompter NG Settings
   * ==================================================
   */

  /* DOM Elements used by App */
  var $elm = {};

  var socket, remote;

  /* Store Connection */
  var connected = false;

  /* Support Press & Hold for Remote Buttons */
  var timerID;
  var timeout;
  var pressHoldEvent = new CustomEvent('pressHold');
  var isPressing = false;
  var debounce = 5;
  var count = 0;

  /* Default App Settings */
  var defaultConfig = {
	  backgroundColor: '#141414',
    dimControls: true,
    flipX: false,
    flipY: false,
    fontSize: 60,
    pageSpeed: 35,
    pageScrollPercent: 0,
    textColor: '#ffffff'
  };

  /* Custom App Settings */
  var config = Object.assign({}, defaultConfig);

  /**
   * ==================================================
   * PrompterNG Init Function
   * ==================================================
   */

  function init() {
    var currentRemote = localStorage.getItem('prompterng_remote_id');
    var urlParamID = getRemoteId();

    if (urlParamID) {
      remote = 'REMOTE_' + urlParamID.toUpperCase();
      clientConnect(remote);
    } else if (currentRemote && currentRemote.length === 6) {
      remote = 'REMOTE_' + currentRemote;
      clientConnect(remote);
    }

    $elm.control = document.getElementById('remote-control');
    $elm.dim = document.getElementById('button-dim');
    $elm.down = document.getElementById('button-down');
    $elm.faster = document.getElementById('button-faster');
    $elm.flipX = document.getElementById('button-flip-x');
    $elm.flipY = document.getElementById('button-flip-y');
    $elm.input = document.getElementsByClassName('remote-id')[0];
    $elm.play = document.getElementById('button-play');
    $elm.power = document.getElementById('button-power');
    $elm.reset = document.getElementById('button-reset');
    $elm.setup = document.getElementById('remote-setup');
    $elm.slider = document.getElementById('slider');
    $elm.sliderSelect = document.getElementById('slider-select');
    $elm.slower = document.getElementById('button-slower');
    $elm.up = document.getElementById('button-up');
    $elm.sendText = document.getElementById('send-text');
    $elm.remoteText = document.getElementById('remote-text');
    $elm.toggleTextSender = document.getElementById('toggle-text-sender');
    $elm.cancelText = document.getElementById('cancel-text');

    document.addEventListener('focusout', function(e) {
      if (!socket && !remote) {
        handleInput();
      }
    });

    /* Dim Button */
    $elm.dim.addEventListener('click', function(e) {
      e.preventDefault();

      config.dimControls = !config.dimControls;
      updateUI('dim');

      if (socket && remote) {
        socket.emit('sendRemoteControl', 'updateConfig', config);
      }
    });

    /* Scroll Down Button */
    $elm.down.addEventListener('mousedown', pressingDown, false);
    $elm.down.addEventListener('touchstart', pressingDown, false);
    $elm.down.addEventListener('mouseup', notPressingDown, false);
    $elm.down.addEventListener('mouseleave', notPressingDown, false);
    $elm.down.addEventListener('touchend', notPressingDown, false);
    $elm.down.addEventListener('pressHold', handleDownPress, false);
    $elm.down.addEventListener('click', handleDownPress, false);

    /* Faster Button */
    $elm.faster.addEventListener('mousedown', pressingDown, false);
    $elm.faster.addEventListener('touchstart', pressingDown, false);
    $elm.faster.addEventListener('mouseup', notPressingDown, false);
    $elm.faster.addEventListener('mouseleave', notPressingDown, false);
    $elm.faster.addEventListener('touchend', notPressingDown, false);
    $elm.faster.addEventListener('pressHold', handleFasterPress, false);
    $elm.faster.addEventListener('click', handleFasterPress, false);

    /* Flip X Button */
    $elm.flipX.addEventListener('click', function(e) {
      e.preventDefault();

      config.flipX = !config.flipX;
      updateUI('flip-x');

      if (socket && remote) {
        socket.emit('sendRemoteControl', 'updateConfig', config);
      }
    });

    /* Flip Y Button */
    $elm.flipY.addEventListener('click', function(e) {
      e.preventDefault();

      config.flipY = !config.flipY;
      updateUI('flip-y');

      if (socket && remote) {
        socket.emit('sendRemoteControl', 'updateConfig', config);
      }
    });

    /* Remote ID Input */
    $elm.input.addEventListener('keyup', function(e) {
      $elm.input.classList.remove('error');
      $elm.input.classList.remove('success');

      if (e.keyCode == 13) {
        handleInput();
      }
    });

    /* Play Button */
    $elm.play.addEventListener('click', function(e) {
      e.preventDefault();
      if (socket && remote) {
        socket.emit('sendRemoteControl', 'play');
      }
    });

    /* Power Button */
    $elm.power.addEventListener('click', function(e) {
      e.preventDefault();
      if (socket && remote && confirm('Are you sure you want to quit the Remote?')) {
        socket.emit('sendRemoteControl', 'power');
        clientDisconnect();
      }
    });

    /* Cancel Text Button */
    $elm.cancelText.addEventListener('click', function(e) {
      e.preventDefault();
      document.getElementById('text-sender').classList.remove('visible');
      $elm.toggleTextSender.classList.remove('active');
      $elm.toggleTextSender.textContent = '✏️ Edit Script';
    });

    /* Toggle Text Sender */
    $elm.toggleTextSender.addEventListener('click', function(e) {
      e.preventDefault();
      var sender = document.getElementById('text-sender');
      var isVisible = sender.classList.contains('visible');
      if (isVisible) {
        sender.classList.remove('visible');
        $elm.toggleTextSender.classList.remove('active');
        $elm.toggleTextSender.textContent = '✏️ Edit Script';
      } else {
        sender.classList.add('visible');
        $elm.toggleTextSender.classList.add('active');
        $elm.toggleTextSender.textContent = '✕ Close';
        $elm.remoteText.focus();
      }
    });

    /* Send Text Button */
    $elm.sendText.addEventListener('click', function(e) {
      e.preventDefault();
      var text = $elm.remoteText.value.replace(/^[\u200B\u200C\u200D\u200E\u200F\uFEFF]/g, '').trim();
      if (socket && remote && text) {
        socket.emit('sendRemoteControl', 'updateText', text);
        $elm.remoteText.value = '';
        // Auto-hide after sending
        document.getElementById('text-sender').classList.remove('visible');
        $elm.toggleTextSender.classList.remove('active');
        $elm.toggleTextSender.textContent = '✏️ Edit Script';
      }
    });

    /* Reset Button */
    $elm.reset.addEventListener('click', function(e) {
      e.preventDefault();
      if (socket && remote) {
        socket.emit('sendRemoteControl', 'reset');
      }
    });

    /* Slider Change While Dragging */
    $elm.slider.addEventListener('input', function(e) {
      clearTimeout(timeout);

      var control = $elm.sliderSelect.value;
      var val = parseInt(e.target.value);

      document.getElementById('slider-value').textContent = val;

      if (control === 'font') {
        config.fontSize = val;
      } else if (control === 'scroll') {
        config.pageScrollPercent = val;
      } else if (control === 'speed') {
        config.pageSpeed = val;
      } else if (control === 'width') {
        config.textWidth = val;
      }

      if (socket && remote) {
        timeout = setTimeout(function(){
          socket.emit('sendRemoteControl', 'updateConfig', config);
        }, 100)
      }
    });

    /* Slider Select Change */
    $elm.sliderSelect.addEventListener('change', function(e) {
      var val = e.target.value;

      if (val === 'font') {
        $elm.slider.setAttribute('min', 12);
        $elm.slider.setAttribute('max', 100);
        $elm.slider.value = config.fontSize;
      } else if (val === 'scroll') {
        $elm.slider.setAttribute('min', 0);
        $elm.slider.setAttribute('max', 100);
        $elm.slider.value = config.pageScrollPercent;
      } else if (val === 'speed') {
        $elm.slider.setAttribute('min', 0);
        $elm.slider.setAttribute('max', 50);
        $elm.slider.value = config.pageSpeed;
      } else if (val === 'width') {
        $elm.slider.setAttribute('min', 30);
        $elm.slider.setAttribute('max', 100);
        $elm.slider.value = config.textWidth || 90;
      }

      document.getElementById('slider-value').textContent = $elm.slider.value;

      $elm.sliderSelect.blur();
    });

    /* Slower Button */
    $elm.slower.addEventListener('mousedown', pressingDown, false);
    $elm.slower.addEventListener('touchstart', pressingDown, false);
    $elm.slower.addEventListener('mouseup', notPressingDown, false);
    $elm.slower.addEventListener('mouseleave', notPressingDown, false);
    $elm.slower.addEventListener('touchend', notPressingDown, false);
    $elm.slower.addEventListener('pressHold', handleSlowerPress, false);
    $elm.slower.addEventListener('click', handleSlowerPress, false);

    /* Scroll Up Button */
    $elm.up.addEventListener('mousedown', pressingDown, false);
    $elm.up.addEventListener('touchstart', pressingDown, false);
    $elm.up.addEventListener('mouseup', notPressingDown, false);
    $elm.up.addEventListener('mouseleave', notPressingDown, false);
    $elm.up.addEventListener('touchend', notPressingDown, false);
    $elm.up.addEventListener('pressHold', handleUpPress, false);
    $elm.up.addEventListener('click', handleUpPress, false);

    // Initialize keyboard shortcuts
    initKeyboard();
  }

  /**
   * Keyboard Navigation for Remote
   */
  function initKeyboard() {
    document.addEventListener('keydown', function(evt) {
      var space = 32,
        left = 37,
        up = 38,
        right = 39,
        down = 40,
        f_key = 70,
        tab = 9;

      // Never intercept tab
      if (evt.keyCode === tab) return;

      // Never intercept when textarea is focused
      if (evt.target.nodeName === 'TEXTAREA' || evt.target.nodeName === 'INPUT') return;

      // Alt + F — Toggle fullscreen on remote page
      if (evt.altKey && evt.keyCode === f_key) {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(function(err) {
            console.warn('Fullscreen error:', err);
          });
        } else {
          document.exitFullscreen();
        }
        evt.preventDefault();
        evt.stopPropagation();
        return false;
      }

      // Alt + Up — Font size up
      if (evt.altKey && evt.keyCode === up) {
        config.fontSize = Math.min(100, config.fontSize + 2);
        if (socket && remote) {
          socket.emit('sendRemoteControl', 'updateConfig', config);
        }
        evt.preventDefault();
        evt.stopPropagation();
        return false;
      }

      // Alt + Down — Font size down
      if (evt.altKey && evt.keyCode === down) {
        config.fontSize = Math.max(12, config.fontSize - 2);
        if (socket && remote) {
          socket.emit('sendRemoteControl', 'updateConfig', config);
        }
        evt.preventDefault();
        evt.stopPropagation();
        return false;
      }

      // Skip remaining if alt held
      if (evt.altKey) return;

      // Space — Play / Pause
      if (evt.keyCode === space) {
        if (socket && remote) {
          socket.emit('sendRemoteControl', 'play');
        }
        evt.preventDefault();
        evt.stopPropagation();
        return false;
      }

      // Left — Speed down
      if (evt.keyCode === left) {
        config.pageSpeed = Math.max(0, config.pageSpeed - 1);
        if (socket && remote) {
          socket.emit('sendRemoteControl', 'updateConfig', config);
        }
        evt.preventDefault();
        evt.stopPropagation();
        return false;
      }

      // Right — Speed up
      if (evt.keyCode === right) {
        config.pageSpeed = Math.min(50, config.pageSpeed + 1);
        if (socket && remote) {
          socket.emit('sendRemoteControl', 'updateConfig', config);
        }
        evt.preventDefault();
        evt.stopPropagation();
        return false;
      }

      // Up — Scroll up
      if (evt.keyCode === up) {
        config.pageScrollPercent = Math.max(0, config.pageScrollPercent - 5);
        if (socket && remote) {
          socket.emit('sendRemoteControl', 'updateConfig', config);
        }
        evt.preventDefault();
        evt.stopPropagation();
        return false;
      }

      // Down — Scroll down
      if (evt.keyCode === down) {
        config.pageScrollPercent = Math.min(100, config.pageScrollPercent + 5);
        if (socket && remote) {
          socket.emit('sendRemoteControl', 'updateConfig', config);
        }
        evt.preventDefault();
        evt.stopPropagation();
        return false;
      }
    });
  }

  /**
   * ==================================================
   * Core Functions
   * ==================================================
   */

  /**
   * Connect Client to Remote using Remote ID
   * @param {String} remote Remote ID
   */
  function clientConnect(remote) {
    socket = io.connect(window.location.protocol + '//' + window.location.host, {
      path: '/socket.io'
    });


    socket.on('connect', function() {
      socket.emit('connectToRemote', remote);
    });

    /* On Remote Connect, do initial setup and config */
    socket.on('connectedToRemote', function(id) {
      if (connected) {
        return;
      }

      $elm.setup.style.display = 'none';
      $elm.control.style.display = 'flex';

      localStorage.setItem('prompterng_remote_id', remote.replace('REMOTE_', ''));
      document.getElementById('remote-id').innerHTML = remote.replace('REMOTE_', 'REMOTE:&nbsp; ');

      $elm.input.value = '';
      $elm.input.classList.remove('error');
      $elm.input.classList.remove('success');

      socket.emit('sendRemoteControl', 'hideModal');
      socket.emit('sendRemoteControl', 'getConfig');

      connected = true;
    });

    /* Listen for Commands from Client */
    socket.on('clientCommand', function(command, value) {
      switch (command) {
        case 'play':
          $elm.play.classList.remove('icon-play');
          $elm.play.classList.add('icon-pause');
          break;

        case 'stop':
          $elm.play.classList.remove('icon-pause');
          $elm.play.classList.add('icon-play');
          break;

        case 'updateTime':
          document.getElementById('current-time').innerHTML = value;
          break;

        case 'updateConfig':
          config = value;
          clearTimeout(timeout);
          timeout = setTimeout(function(){
            updateUI();
          }, 100);
          break;
      }
    });
  }

  /**
   * Disconnect Client from Remote
   */
  function clientDisconnect() {
    if (socket) {
      socket.disconnect();
    }

    socket = null;
    remote = null;

    localStorage.removeItem('prompterng_remote_id');

    $elm.setup.style.display = 'flex';
    $elm.control.style.display = 'none';

    connected = false;
  }

  /**
   *  Pull Remote ID from URL if present
   * @returns {String} Remote ID
   */
  function getRemoteId() {
    if (window.location.href.indexOf('id') > -1) {
      return getUrlVars()['id'];
    }

    return null;
  }

  /**
   * Get URL Parameters
   * @returns Object
   */
  function getUrlVars() {
    var paramCount = 0;
    var vars = {};

    window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m, key, value) {
      paramCount++;
      vars[key] = value;
    });

    return (paramCount > 0) ? vars : null;
  }

  /**
   * Handle Down Press
   * @param {Object} e Event
   */
  function handleDownPress(e) {
    e.preventDefault();

    config.pageScrollPercent += 1;

    if (config.pageScrollPercent > 100) {
      config.pageScrollPercent = 100;
    }

    updateUI('slider');

    if (socket && remote) {
      socket.emit('sendRemoteControl', 'updateConfig', config);
    }
  }

  /**
   * Handle Faster Press
   * @param {Object} e Event
   */
  function handleFasterPress(e) {
    e.preventDefault();

    config.pageSpeed += 1;

    if (config.pageSpeed > 50) {
      config.pageSpeed = 50;
    }

    updateUI('slider');

    if (socket && remote) {
      socket.emit('sendRemoteControl', 'updateConfig', config);
    }
  }

  /**
   * Handle Remote ID Input
   */
  function handleInput() {
    if ($elm.input.value && $elm.input.value.length === 6) {
      $elm.input.blur();
      $elm.input.classList.add('success');
      remote = 'REMOTE_' + $elm.input.value.toUpperCase();
      clientConnect(remote);
    } else {
      $elm.input.classList.add('error');
    }
  }

  /**
   * Handle Slower Press
   * @param {Object} e Event
   */
  function handleSlowerPress(e) {
    e.preventDefault();

    config.pageSpeed -= 1;

    if (config.pageSpeed < 0) {
      config.pageSpeed = 0;
    }

    updateUI('slider');

    if (socket && remote) {
      socket.emit('sendRemoteControl', 'updateConfig', config);
    }
  }

  /**
   * Handle Up Press
   * @param {Object} e Event
   */
  function handleUpPress(e) {
    e.preventDefault();

    config.pageScrollPercent -= 1;

    if (config.pageScrollPercent < 0) {
      config.pageScrollPercent = 0;
    }

    updateUI('slider');

    if (socket && remote) {
      socket.emit('sendRemoteControl', 'updateConfig', config);
    }
  }

  /**
   * Check if Mouse Down or Touch Down is no longer Active
   * @param {Object} e Event
   */
  function notPressingDown(e) {
    isPressing = false;
    cancelAnimationFrame(timerID);
  }

  /**
   * Check if Mouse Down or Touch Down Active
   * @param {Object} e Event
   */
  function pressingDown(e) {
    count = 0;
    isPressing = true;
    var target = e.target;
    requestAnimationFrame(function() {
      timer(target);
    });
    e.preventDefault();
  }

  /**
   * Handle Long Presses
   * @param {Object} target DOM Element
   */
  function timer(target) {
    if (isPressing) {
      count++;
      // Debounce how quickly this runs
      if (count === debounce) {
        count = 0;
        timerID = requestAnimationFrame(function() {
          target.dispatchEvent(pressHoldEvent);
          timer(target);
        });
      } else {
        // Don't Dispatch Event, but Keep Running
        timerID = requestAnimationFrame(function() {
          timer(target);
        });
      }
    }
  }

  /**
   * Update UI
   * @param {String} controller What is being controlled
   */
  function updateUI(controller) {
    clearTimeout(timeout);

    // Update Dim Control
    if (!controller || controller === 'dim') {
      if (config.dimControls) {
        $elm.dim.classList.remove('icon-eye-open');
        $elm.dim.classList.add('icon-eye-close');
      } else {
        $elm.dim.classList.remove('icon-eye-close');
        $elm.dim.classList.add('icon-eye-open');
      }
    }

    // Update Flip X Indicator
    if (!controller || controller === 'flip-x') {
      if (config.flipX) {
        $elm.flipX.classList.add('active');
      } else {
        $elm.flipX.classList.remove('active');
      }
    }

    // Update Flip Y Indicator
    if (!controller || controller === 'flip-y') {
      if (config.flipY) {
        $elm.flipY.classList.add('active');
      } else {
        $elm.flipY.classList.remove('active');
      }
    }


    // Update Slider Values
    if (!controller || controller === 'slider') {
      var control = $elm.sliderSelect.value;

      if (control === 'font') {
        $elm.slider.value = config.fontSize;
      } else if (control === 'scroll') {
        $elm.slider.value = config.pageScrollPercent;
      } else if (control === 'speed') {
        $elm.slider.value = config.pageSpeed;
      } else if (control === 'width') {
        $elm.slider.value = config.textWidth || 90;
      }
    }

    document.getElementById('slider-value').textContent = $elm.slider.value;
  }

  /* Expose Public API */
  return {
    init: init
  }
})();
