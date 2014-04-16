/*
 * Copyright (c) 2013 Adobe Systems Incorporated. All rights reserved.
 *  
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"), 
 * to deal in the Software without restriction, including without limitation 
 * the rights to use, copy, modify, merge, publish, distribute, sublicense, 
 * and/or sell copies of the Software, and to permit persons to whom the 
 * Software is furnished to do so, subject to the following conditions:
 *  
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *  
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING 
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER 
 * DEALINGS IN THE SOFTWARE.
 * 
 */

/* jshint node: false, browser: true, jquery: true */
/* global define, alert */

require.config({
    paths: {
        "text"      : "vendor/require-text"
    }
});

define(function () { // require) {
    "use strict";

    var CONNECTION_RETRY_DELAY = 1000;

    var _ws = null,
        _commandId = 0,
        _deferreds = [];

    function sendCommand(command) {
        if (_ws.readyState !== WebSocket.OPEN) {
            alert("Not connected");
            return;
        }
        var id = _commandId++,
            deferred = $.Deferred();

        _ws.send(JSON.stringify({id: id, command: command}));
        _deferreds[id] = deferred;

        deferred.always(function () {
            delete _deferreds[id];
        });

        deferred.fail(function (err) {
            $("#results").prepend("<p>Error: " + err + "</p>");
        });

        return deferred.promise();
    }

    function displayStatus(status) {
        $("#websocket-status").text(status);
    }

    function receiveMessage(message) {
        var result = JSON.parse(message.data);
        if (result.hasOwnProperty("id") && _deferreds[result.id]) {
            if (result.hasOwnProperty("result")) {
                _deferreds[result.id].resolve(result.result);
            } else if (result.hasOwnProperty("error")) {
                _deferreds[result.id].reject(result.error);
            } else {
                _deferreds[result.id].reject("no result body");
            }
        } else {
            $("#results").prepend("<p>Error: don't know what to do with message: " + message + "</p>");
        }
    }

    function createWebSocketConnection() {
        displayStatus("connecting...");

        var wsUrl = window.location.protocol === "https:" ?
            "wss://" + window.location.host + "/" :
            "ws://" + window.location.host + "/";

        // create the websocket and immediately bind handlers
        _ws = new WebSocket(wsUrl);

        _ws.onopen = function () { displayStatus("connected"); };
        _ws.onmessage = receiveMessage;
        _ws.onclose = function () {
            displayStatus("closed");
            setTimeout(createWebSocketConnection, CONNECTION_RETRY_DELAY);
        };
    }

    function initUI() {
        $("#op-doc-info").on("click", function () {
            sendCommand("docinfo").then(function (docinfo) {
                var $docinfo = $("<pre></pre>");
                $docinfo.text(JSON.stringify(docinfo, null, "  "));
                $("#results").prepend($docinfo);
            });
        });

        $("#op-first-bounds").on("click", function () {
            sendCommand("firstbounds").then(function (bounds) {
                var $bounds = $("<pre></pre>");
                $bounds.text(JSON.stringify(bounds, null, "  "));
                $("#results").prepend($bounds);
            });
        });

        $("#op-first-shape").on("click", function () {
            sendCommand("firstshape").then(function (shape) {
                var $shape = $("<pre></pre>");
                $shape.text(JSON.stringify(shape, null, "  "));
                $("#results").prepend($shape);
            });
        });

        $("#op-set-doc-settings").on("click", function () {
            sendCommand("setdocsettings").then(function (result) {
                var $result = $("<pre></pre>");
                $result.text(JSON.stringify(result, null, "  "));
                $("#results").prepend($result);
            });
        });

        $("#op-clear").on("click", function () {
            $("#results").html("");
        });
    }

    function init() {
        initUI();
        createWebSocketConnection();
    }
    
    $(init);

});
