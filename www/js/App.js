/**
 * Holds the state of the application and handles
 * communication with the master server.
 * @constructor
 */
function App() {
    
    //=====================================
    // Constants ==========================
    //=====================================
    
    var REST_URL = 'http://127.0.0.1:8080/';
    
    var STATES = {
        INITIAL:            0,
        LOGGED_IN:          1,
        LOBBY:              2,
        PLAYER_INVITED:     3,
        PENDING_LAUNCH:     4,
        INVITE_ACCEPTED:    5,
        GAME_SETUP:         6,
        GAME:               7,
        GAME_RESULTS:       8
    };
    
    //=====================================
    // Member variables ===================
    //=====================================
    
    var _socket;
    var _user;
    var _invited;
    
    var _isHost;
    var _opponent;
    
    var _receivedInvites = [];
    
    var _state = STATES.INITAL;
    
    var _listeners = {
        'join_lobby': [],
        'leave_lobby': [],
        'game_invite': [],
        'game_invite_withdraw': [],
        'game_response': [],
        'chat': [],
        'move': [],
        'disconnect': [],
        'game_launch': [],
        'game_launch_cancel': [],
        'game_start': []
    };
    
    //=====================================
    // Member functions ===================
    //=====================================
    
    function _callListeners(id, arg) {
        var i, l = _listeners[id];
        for (i = 0; i < l.length; i++) {
            l[i](arg);
        }
    }
    
    function _expectState() {
        var i;
        for (i = 0; i < arguments.length; i++) {
            if (_state == arguments[i])
                return true;
        }
        
        return false;
    }
    
    function get(url, callback) {
        var req = new XMLHttpRequest();
        req.onreadystatechange = function() {
            if (this.readyState == 4) {
                callback({
                    status: this.status,
                    data: this.responseText
                });
            }
        }
        req.open('GET', url, true);
        req.send();
    }
    
    function post(url, data, callback) {
        var req = new XMLHttpRequest();
        req.onreadystatechange = function() {
            if (this.readyState == 4) {
                console.log(this.status);
                callback({
                    status: this.status,
                    data: this.responseText
                });
            }
        }
        req.open('POST', url, true);
        req.setRequestHeader("Content-type", "application/json");
        req.send(JSON.stringify(data));
    }
    
    function _removeFromArray(array, element) {
        var i = array.indexOf(element);
        if (i != -1) {
            array.splice(i, 1);
        }
    }
    
    function _setupSocket(s) {
        
        s.on('connect_error', function(err) {
            console.log(err);
        });
        
        s.on('join_lobby', function(msg) {
            if (_expectState(STATES.LOBBY))
                _callListeners('join_lobby', msg);
        });
        
        s.on('leave_lobby', function(msg) {
            if (_expectState(STATES.LOBBY))
                _callListeners('leave_lobby', msg);
        });
        
        s.on('game_invite', function(msg) {
            if (!_expectState(STATES.LOBBY, STATES.LOGGED_IN))
                return;
            
            if (_receivedInvites.indexOf(msg.id) != -1)
                return;
            
            _receivedInvites.push(msg.id);
            
            _callListeners('game_invite', msg);
        });
        
        s.on('game_invite_withdraw', function(msg) {
            _removeFromArray(_receivedInvites, msg.id);
            
            _callListeners('game_invite_withdraw', msg);
        });
        
        s.on('game_launch', function(msg) {
            _opponent = msg.id;
            _isHost = false;
            _callListeners('game_launch', msg);
        });
        
        s.on('game_response', function(msg) {
            _callListeners('game_response', msg);
        });
        
        s.on('move', function(msg) {
            _callListeners('move', msg);
        });
    }
    
    return {
        
        /**
         * Trigger login
         * @param {Object} data - Credentials to use for the login
         * @param {statusCallback} callback
         */
        login: function(data, callback) {
            var token, data;
            
            post(REST_URL + 'login', data, function(res) {
                if (res.status == 200) {
                    data = JSON.parse(res.data);
                    _user = data.user;
                    _socket = io.connect('127.0.0.1:8080', {
                        query: 'auth_token=' + _user.token,
                        forceNew: true
                    });
                    
                    _setupSocket(_socket);
                    
                    _state = STATES.LOGGED_IN;
                    
                    callback(true);
                } else {
                    callback(false);
                }
            });
        },
        
        /**
         * Trigger logout
         * @param {statusCallback} callback
         */
        logout: function(callback) {
            _socket.disconnect();
            _user = null;
            _state = STATES.INITIAL;
        },
        
        /**
         * Trigger registration of a new user
         * @param {Object} data - 
         * @param {statusCallback} callback
         */
        register: function(data, callback) {
            post(REST_URL + 'register', data, function(res) {
                if (res.status == 200) {
                    callback(true);
                } else {
                    callback(false);
                }
            });
        },
        
        /**
         * Join the lobby.
         * Requires the user to be logged in
         */
        joinLobby: function() {
            _socket.emit('join_lobby', {
                id: _user.id
            });
            
            _state = STATES.LOBBY;
        },
        
        /**
         * Leave the lobby.
         * Requires the user to be logged in
         */
        leaveLobby: function() {
            _socket.emit('leave_lobby', {
                id: _user.id
            });
            
            _state = STATES.LOGGED_IN;
        },
        
        /**
         * Invite another user to a game.
         * Requires the user to be logged in
         * @param {string} opponent - Id of the user to invite
         */
        sendInvite: function(opponent) {
            _invited = opponent;
            _socket.emit('game_invite', {
                id: opponent
            });
        },
        
        /**
         * Withdraw the invite previously sent to another user.
         * Requires the user to be logged in
         */
        cancelInvite: function() {
            _socket.emit('game_invite_withdraw', {
                id: _invited
            });
            invited = null;
        },
        
        /**
         * Accept the invite of a another user.
         * Requires the user to be logged in
         * @param {string} opponent - Id of the user that sent the invite
         */
        acceptInvite: function(opponent) {
            _socket.emit('game_response', {
                id: opponent,
                accepted: true
            });
        },
        
        /**
         * Decline the invite of a another user.
         * Requires the user to be logged in
         * @param {string} opponent - Id of the user that sent the invite
         */
        declineInvite: function(opponent) {
            var i = _receivedInvites.indexOf(opponent) != -1;
            if (i != -1) {
                _receivedInvites.splice(i, 1);
            }
            
            _socket.emit('game_response', {
                id: opponent,
                accepted: false
            });
        },
        
        /**
         * Tell the opponent to launch the game.
         * This function is called by the user that initially sent the invite,
         * after the opponent accepted it.
         * Requires the user to be logged in
         */
        launchGame: function() {
            console.log(_invited);
            _opponent = _invited;
            _isHost = true;
            _socket.emit('game_launch', {
                id: _invited
            });
        },
        
        /**
         * Transmit a chess move to the opponent.
         * @param {Object} move - Move object directly processable by chess.js
         */
        sendMove: function(move) {
            _socket.emit('move', {
                id: _opponent,
                move: move
            });
        },
        
        /**
         * Check if this instance initially sent the invite (aka 'is the host').
         * @return {boolean} - true if this instance is the host, otherwise false
         */
        isHost: function() {
            return _isHost;
        },
        
        /**
         * Query all user in the lobby.
         * @param {App~playerListCallback} callback
         */
        queryPlayersInLobby: function(callback) {
            var data;
            get(REST_URL + 'api/users?token=' + _user.token, function(res) {
                if (res.status == 200) {
                    data = JSON.parse(res.data);
                    callback(data.users);
                } else {
                    callback(null);
                }
            });
        },
        
        /**
         * 
         */
        createGame: function() {
            
        },
        
        /**
         * Register an event listener to an event fired by the App
         * identified by its Id.
         * @param {string} id - The event's id
         * @param {eventListenerCallback} listener
         */
        on: function(id, listener) {
            if (_listeners.hasOwnProperty(id)) {
                _listeners[id].push(listener);
            }
        },
        
        /**
         * Remove an event listener from an event fired by the App
         * identified by its Id.
         * @param {string} id - The event's id
         * @param {eventListenerCallback} listener
         */
        removeListener: function(id, listener) {
            var idListeners = _listeners[id];
            if (idListeners != null) {
                _removeFromArray(idListeners, listener);
            }
        }
        
    }
}

/**
 * Callback receiving an array of user ids
 * @callback App~playerListCallback
 * @param {string[]} userIds
 */

/**
 * Callback receiving the status (success or failure)
 * of a previously triggered operation.
 * @callback statusCallback
 * @param {boolean} success
 */
 
/**
 * Eventlistener function.
 * @callback eventListenerCallback
 * @param {Object} data - Data passed by this event
 */