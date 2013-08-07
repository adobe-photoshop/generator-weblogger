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

(function () {
    "use strict";
    
    var resolve = require("path").resolve,
        http = require("http"),
        connect = require("connect"),
        WebSocketServer = require("ws").Server;
        

    var _generator = null,
        _config = null,
        _connCount = 0;


    function handleMessage(message, conn) {
        console.log("received message: %s", message);
        try {
            var m = JSON.parse(message);
            if (m.hasOwnProperty("command") && m.hasOwnProperty("id")) {
                switch (m.command) {
                case "docinfo":
                    _generator.getDocumentInfo().then(function (info) {
                        conn.send(JSON.stringify({id: m.id, result: info}));
                    });
                    break;
                case "firstbounds":
                    _generator.getDocumentInfo().then(function (info) {
                        _generator.getPixmap(info.id, info.layers[0].id, {boundsOnly: true}).then(function (bounds) {
                            conn.send(JSON.stringify({id: m.id, result: bounds}));
                        });
                    });
                    break;
                default:
                    conn.send(JSON.stringify({id: m.id, error: "unknown command '" + m.command + "'"}));
                }
            } else {
                conn.send(JSON.stringify({error: "message format error"}));
            }
        } catch (e) {
            conn.send(JSON.stringify({error: "message parse error"}));
            console.error("Couldn't handle message %s: %s", message, e);
        }
    }

    function handleWebSocketConnection(conn) {
        var id = _connCount++;

        console.log("Accepted websocket connection with ID %d", id);

        conn.on("error", function (err) {
            console.error("WebSocket connection with ID %d had error, closing: %s", err);
            conn.close();
        });

        conn.on("close", function () {
            console.log("WebSocket connection with ID %d closed", id);
        });

        conn.on("message", function (message) {
            handleMessage(message, conn);
        });
    }

    function init(generator, config) {
        _generator = generator;
        _config = config || {};

        var app = connect();

        app.use(connect.logger("dev"))
            .use(connect.static(resolve(__dirname, "www")));

        var server = http.createServer(app);

        var wss = new WebSocketServer({server: server});

        wss.on("connection", handleWebSocketConnection);

        server.listen(49495);
    }

    exports.init = init;

}());
