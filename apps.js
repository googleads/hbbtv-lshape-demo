/**
 * Copyright 2014 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
*/

/* Note: some device might need an absolute path */
var STREAM_EVENT_URL = 'stream_events_declaration.xml';

/**
 * How long the creative should be displayed for (in seconds).
 * Used as default value if no duration is set in the stream event.
 */
var CREATIVE_DISPLAY_DURATION = 10;

/* Google Ad Manager ad unit that your line item(s) target */
var AD_UNIT = '/6353/hbbtv_lshape_demo/';

var app;
var debugView;
var showAdTimer;
var creativeHideTimer;

/** Debug console to prompt console log visibly on the screen. */
var DebugConsole = function() {
  this.debugConsole = document.getElementById('console');
};

/**
 * Prompts debug message on the screen.
 * @param {string} message
 */
DebugConsole.prototype.log = function(message) {
  console.log(message);
  if (this.debugConsole) {
    var line = this.getTime() + ' ' + message;
    this.debugConsole.innerHTML = line + '<br/>' + this.debugConsole.innerHTML;
  }
};

/**
 * Prompts error message on the screen.
 * @param {string} message
 */
DebugConsole.prototype.error = function(message) {
  if (this.debugConsole) {
    var line = '<span class=\'error\'>' + this.getTime() + ' ' + message +
        '</span><br/>';
    this.debugConsole.innerHTML = line + this.debugConsole.innerHTML;
  }
};

/**
 * Returns the current time with ms precision.
 * @return {string} current timestamp.
 */
DebugConsole.prototype.getTime = function() {
  var d = new Date();

  return ('0' + d.getHours()).slice(-2) + ':' +
      ('0' + d.getMinutes()).slice(-2) + ':' +
      ('0' + d.getSeconds()).slice(-2);
};

/**
 * Clears the debug console.
 */
DebugConsole.prototype.clear =
    function() {
  if (this.debugConsole) {
    this.debugConsole.innerHTML = '';
  }
}


/**
 * Creates the main HbbTV application.
 */
var HbbTVApp = function() {
  this.broadcastAppManager = document.getElementById('application-manager');
  this.broadcastContainer = document.getElementById('broadcast-video');
  this.adsContainer = document.getElementById('ads-wrapper');
  this.lastStreamEventReceived = '';

  try {
    this.applicationManager =
        this.broadcastAppManager.getOwnerApplication(document);

    // this.applicationManager.privateData.keyset represents the user input
    // events sent to the app.
    // The Keyset object permits applications to define which key events they
    // request to receive.
    // setValue() Sets the value of the keyset which this
    // application requests to receive
    // RED 0x1 Used to identify the VK_RED key event.
    // GREEN 0x2 Used to identify the VK_GREEN key event.
    // YELLOW 0x4 Used to identify the VK_YELLOW key event.
    // BLUE	0x8 Used to identify the VK_BLUE key event.
    // NAVIGATION 0x10 Used to identify the VK_UP, VK_DOWN,
    // VK_LEFT, VK_RIGHT, VK_ENTER and VK_BACK key events.
    // This app only reacts to GREEN and BLUE
    this.applicationManager.privateData.keyset.setValue(0x2 + 0x8);

    /** makes the HbbTV app visible to the end user */
    this.applicationManager.show();

    /** plays the current TV channel in the 'video/broadcast' object */
    this.broadcastContainer.bindToCurrentChannel();

    /** subscribes to the stream events */
    this.broadcastContainer.addStreamEventListener(
        STREAM_EVENT_URL, 'eventItem', function(event) {
          this.onStreamEvent(event);
        }.bind(this));
    debugView.log('HbbTV App loaded');
  } catch (e) {
    debugView.error('error - Cannot create HbbTV Application');
	// create app in HTML5 context
  }
}

/**
* Callback for HbbTV stream event.
* @param {!Event} event Stream event payload. (JSON object)
* example:
* {
*   'type':'adBreakTrigger',
*   'duration': 20,
*   'targeting': {
*     'key1':'value1',
*     'key2':'value2'
*   }
* }
* if event type is 'adBreakTrigger', then trigger
* an ad request to AM360
*/
HbbTVApp.prototype.onStreamEvent = function(event) {
  if (event.text) {
    /** prevents for flooding with not-changed SE */
    if (event.text == this.lastStreamEventReceived) {
      return;
    }
    this.lastStreamEventReceived = event.text;

    /**
     * Parse the event.text to get the key-value to send along in
     * the ad request.
     */
    var eventData = JSON.parse(event.text);
    debugView.log('Received stream event: ' + event.text);

    if (eventData.type == 'adBreakTrigger') {
      debugView.log('Ad request sent to Google Ad Manager');
      app.displayAd(eventData);
    }
  }
};

/**
 * Creates the GPT slot and makes the ad request.
 *
 * @param {String} keyword Keyword to use as custom value in the ad request
 */
HbbTVApp.prototype.displayAd = function(data) {
  /** Reset the stream event for the next ad break. */
  this.lastStreamEventReceived = '';
  /** debugView.log('request the ads targeted to ' + data.keyword);*/

  /** Creates the GPT slot. */
  app.createAdSlot(data.targeting);
  /** Makes the actual ac request. */
  app.fetchAndDisplayAd(data.duration);
}

/**
* Defines the GPT ad slot.
* @param {object} targeting JSON object that contains all key:value pairs
*/
HbbTVApp.prototype.createAdSlot = function(targeting) {
  window.googletag = window.googletag || {cmd: []};
  googletag.cmd.push(function() {
    googletag.defineSlot(AD_UNIT, [1, 1], 'lshape')
        .addService(googletag.pubads());
  });

  /** Clears targeting from previous ad request. */
  googletag.cmd.push(function() {
    googletag.pubads().clearTargeting();
  });

  if (targeting && Object.keys(targeting).length > 0) {
    for (let key in targeting) {
      googletag.cmd.push(function() {
        googletag.pubads().setTargeting(key, targeting[key]);
      });
    }
  }

  googletag.cmd.push(function() {
    googletag.enableServices();
  });
};

/**
 * Makes the ad request to AM360 for the slot 'lshape'.
 * If AM360 returns an ad:
 *   - shrink the broadcast object
 *   - display the L-Shape banner
 */
HbbTVApp.prototype.fetchAndDisplayAd = function(duration) {
  googletag.cmd.push(function() {
    googletag.display('lshape');
  });

  /**
   * when the ad has been rendered:
   * 1) check it is the correct slot (lshape) and the slot is not empty
   * 2) call the 'show' method after 100 ms that shrinks the broadcast object to
   * make space for the l-shape
   */
  googletag.pubads().addEventListener(
    'slotRenderEnded', function handler(event) {
      if (event.slot.getSlotElementId() === 'lshape' && !event.isEmpty) {
        showAdtimer = setTimeout(function() {
          app.show(duration);
        }, 100);
      } else {
        /**
         * No ads received.
         * Clear the ad and remove the slot object from the internal state
         * maintained by GPT to start fresh for the next ad request.
         */
        debugView.error('no ad received');
        app.hideCreative();
      }

      /**
       * Remove the event listener to start fresh when the next streamEvent
       * occurs.
       */
      googletag.pubads().removeEventListener('slotRenderEnded', handler);
    }
  );
}

/**
* Shrinks the broadcast container.
* TODO: add listeners to postMessage from the creative to make creatives
* interactives
*/
HbbTVApp.prototype.show = function(duration = CREATIVE_DISPLAY_DURATION) {
  debugView.log('show the creative for ' + duration + ' seconds');
  /* Add the css class 'resize' to the video object.
   * This shrinks the video object from 1280x720 to 1030x580 with a smooth
   * transition. It is much better to do this with CSS than JS performance-wise.
   */
  app.broadcastContainer.classList.add('resize');
  /** Make the ad container visible. */
  app.adsContainer.classList.add('show');

  /** Listen to postMessage from the creative. */
  window.addEventListener('message', app.onIframeMessageReceived);

  /** Hide the creative after the time set in the stream event.  */
  creativeHideTimer = setTimeout(function() {
    app.hideCreative();
  }, duration * 1000);
}

/**
* Reacts to messages sent from the creative.
*/
HbbTVApp.prototype.onIframeMessageReceived = function(event) {
  if (event.data === 'CLOSE') {
    debugView.log('Creative asked to be closed earlier !!');
    /** don't need the creativeHideTimer any more */
    clearTimeout(creativeHideTimer);
    /** remove listener for messages from the creative */
    window.removeEventListener('message', app.onIframeMessageReceived);
    /** close the creative right now */
    app.hideCreative();
  }
}

/**
* Resizes the broadcast container to its original size (full
* screen), hides the L-Shape ad destroys the GPT ad slot to be able
* to create a new one with the next stream event.
*/
HbbTVApp.prototype.hideCreative = function() {
  debugView.log('Hide the creative');
  clearTimeout(showAdTimer);
  clearTimeout(creativeHideTimer);

  this.broadcastContainer.classList.remove('resize');
  this.broadcastContainer.classList.remove('inner_resize');
  setTimeout(function() {
    app.adsContainer.classList.remove('show');
    googletag.destroySlots();
  }, 750);
}

/**
 * Hooks up TV remote buttons to do certain actions.
 */
var TV_REMOTE_BUTTON_BLUE = 406;
var TV_REMOTE_BUTTON_GREEN = 404;

function hookTvRemoteButtons() {
  document.addEventListener('keydown', function(event) {
    switch (event.keyCode) {
      /** BLUE clears the debug log. */
      case TV_REMOTE_BUTTON_BLUE:
        debugView.clear();
        break;

      /** GREEN closes the ad immediately. */
      case TV_REMOTE_BUTTON_GREEN:
        debugView.log('GREEN => force close the creative');
        app.hideCreative();
        break;

      default:
        break;
    }
  });
};

/**
 * Redirects console log error message to debug console.
 */
window.onerror = function(message, source, lineNumber) {
  console.error(message, source, lineNumber);
  debugView.error(message + ' (' + lineNumber + ')');
};

/**
 * Start the HbbTV application when the DOM is ready.
 */
document.addEventListener('DOMContentLoaded', function() {
  hookTvRemoteButtons();
  debugView = new DebugConsole();
  app = new HbbTVApp();
});
