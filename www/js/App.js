/**
 * Holds the state of the application and handles
 * communication with the master server.
 * @constructor
 */
function App() {
    
    //=====================================
    // Constants ==========================
    //=====================================
    
    var SOCKET_URL  = '127.0.0.1:8080';
    var REST_URL    = 'http://127.0.0.1:8080/';
    
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
    var _user = null;
    var _token;
    var _invited;
    
    var _isHost;
    var _opponent;
    
    var _receivedInvites = [];
    
    var _state = STATES.INITIAL;
    
    var _listeners = {
        'join_lobby': [],
        'leave_lobby': [],
        'game_invite': [],
        'game_invite_withdraw': [],
        'game_response': [],
        'chat': [],
        'move': [],
        'disconnect': [],
        'game_create': [],
        'game_launch': [],
        'game_launch_cancel': [],
        'game_start': [],
        'swap_colors': [],
        'surrender': []
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
    
    function _stateToString(state) {
        var prop;
        for (prop in STATES) {
            if (STATES.hasOwnProperty(prop)
                    && STATES[prop] == state) {
                return prop;
            }
        }
        return 'NULL';
    }
    
    function _statesToString(states) {
        var i;
        var str = '(';
        for (i = 0; i < states.length; i++) {
            str += _stateToString(states[i]);
            if (i < (states.length - 1)) {
                str += '|';
            }
        }
        return str + ')';
    }
    
    function _isState() {
        var i;
        fail = (typeof fail !== 'undefined') ? fail : false;
        for (i = 0; i < arguments.length; i++) {
            if (_state == arguments[i])
                return true;
        }
        
        return false;
    }
    
    function _expectState() {
        var i;
        fail = (typeof fail !== 'undefined') ? fail : false;
        for (i = 0; i < arguments.length; i++) {
            if (_state == arguments[i])
                return;
        }
        
        throw ('[App] - Invalid state: expected '
                + _statesToString(arguments)
                + ', got '
                + _stateToString(_state));
    }
    
    function _get(url, callback) {
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
    
    function _post(url, data, callback) {
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
    
    function _queryUser(userId, callback) {
        _get(REST_URL + 'api/users/' + userId + '?token=' + _token,
            function(result) {
                if (result.status == 200) {
                    callback(JSON.parse(result.data).user);
                } else {
                    callback(null);
                }
            });
    }
    
    function _setupSocket(s) {
        
        s.on('connect_error', function(err) {
            console.log(err);
        });
        
        s.on('join_lobby', function(msg) {
            if (_isState(STATES.LOBBY, STATES.PLAYER_INVITED,
                    STATES.PENDING_LAUNCH))
                _callListeners('join_lobby', msg);
        });
        
        s.on('leave_lobby', function(msg) {
            if (_isState(STATES.LOBBY, STATES.PLAYER_INVITED,
                    STATES.PENDING_LAUNCH))
                _callListeners('leave_lobby', msg);
        });
        
        s.on('game_invite', function(msg) {
            if (!_isState(STATES.LOBBY, STATES.LOGGED_IN,
                    STATES.PLAYER_INVITED, STATES.PENDING_LAUNCH)) {
                console.log('discarding game invite: state');
                return;
            }
            
            if (_receivedInvites.indexOf(msg.id) != -1) {
                console.log('discarding game invite: already');
                return;
            }
            
            _receivedInvites.push(msg.id);
            
            _callListeners('game_invite', msg);
        });
        
        s.on('game_invite_withdraw', function(msg) {
            
            if (!_isState(STATES.LOBBY, STATES.LOGGED_IN,
                    STATES.PLAYER_INVITED, STATES.PENDING_LAUNCH))
                return;
            
            _removeFromArray(_receivedInvites, msg.id);
            
            _callListeners('game_invite_withdraw', msg);
        });
        
        s.on('game_create', function(msg) {
            _invited = null;
            _receivedInvites = [];
            _opponent = {
                id: msg.id,
                alias: msg.alias
            };
            _isHost = false;
            console.log('[s]: game_create');
            _callListeners('game_create', msg);
        });
        
        s.on('game_launch', function(msg) {
            
            /*
            if (!_isState(STATES.PENDING_LAUNCH))
                return;
            */
            _state = STATES.GAME;
            
            /*
            _opponent = {
                id: msg.id,
                alias: msg.alias
            };
            _isHost = false;
            */
            _callListeners('game_launch', msg);
        });
        
        s.on('game_response', function(msg) {
            
            if (!_isState(STATES.PLAYER_INVITED))
                return;
            
            _callListeners('game_response', msg);
        });
        
        s.on('move', function(msg) {
            
            if (!_isState(STATES.GAME))
                return;
            
            _callListeners('move', msg);
        });
        
        s.on('surrender', function(msg) {
            
            _state = (_user != null) ? STATES.LOGGED_IN : STATES.INITIAL;
            
            _callListeners('surrender', msg);
        });
        
        s.on('swap_colors', function(msg) {
            console.log('[s] swap colors');
            _callListeners('swap_colors', msg);
        });
    }
    
    return {
        
        /**
         * Trigger login
         * @param {Object} data - Credentials to use for the login
         * @param {statusCallback} callback
         */
        login: function(loginData, callback) {
            _expectState(STATES.INITIAL);
            
            _post(REST_URL + 'login', loginData, function(res) {
                if (res.status == 200) {
                    var data = JSON.parse(res.data);
                    console.log(data);
                    //_user = data.user;
                    _token = data.token;
                    
                    _queryUser('me', function(user) {
                        if (user != null) {
                            _user = user;
                            _socket = io.connect(SOCKET_URL, {
                                query: 'auth_token=' + _token,
                                forceNew: true
                            });
                            
                            _setupSocket(_socket);
                            
                            _state = STATES.LOGGED_IN;
                            
                            callback(true);
                        } else {
                            callback(false);
                        }
                    });
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
            
            _expectState(STATES.LOGGED_IN);
            
            _socket.disconnect();
            _user = null;
            _token = null;
            
            _state = STATES.INITIAL;
        },
        
        /**
         * Trigger registration of a new user
         * @param {Object} data - 
         * @param {statusCallback} callback
         */
        register: function(data, callback) {
            
            _expectState(STATES.INITIAL);
            
            _post(REST_URL + 'register', data, function(res) {
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
            
            _expectState(STATES.LOGGED_IN);
            
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
            
            _expectState(STATES.LOBBY, STATES.PLAYER_INVITED, STATES.PENDING_LAUNCH);
            
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
            
            _expectState(STATES.LOBBY, STATES.PLAYER_INVITED);
            
            _invited = opponent;
            _socket.emit('game_invite', {
                id: opponent.id
            });
            
            _state = STATES.PLAYER_INVITED;
        },
        
        /**
         * Withdraw the invite previously sent to another user.
         * Requires the user to be logged in
         */
        cancelInvite: function() {
            
            if (_invited == null) {
                return;
            }
            
            _expectState(STATES.PLAYER_INVITED);
            
            _socket.emit('game_invite_withdraw', {
                id: _invited.id
            });
            _invited = null;
            
            _state = STATES.LOBBY;
        },
        
        /**
         * Accept the invite of a another user.
         * Requires the user to be logged in
         * @param {string} opponent - Id of the user that sent the invite
         */
        acceptInvite: function(opponent) {
            
            _expectState(STATES.LOBBY, STATES.PLAYER_INVITED);
            
            _state = STATES.PENDING_LAUNCH;
            
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
            var i;
            
            _expectState(STATES.LOBBY, STATES.PLAYER_INVITED);
            
            i = _receivedInvites.indexOf(opponent) != -1;
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
            
            //_expectState(STATES.PLAYER_INVITED);
            
            _state = STATES.GAME;
            
            //_opponent = _invited;
            //_isHost = true;
            _socket.emit('game_launch', {
                id: _opponent.id
            });
        },
        
        /**
         * Transmit a chess move to the opponent.
         * @param {Object} move - Move object directly processable by chess.js
         */
        sendMove: function(move) {
            
            _expectState(STATES.GAME);
            
            _socket.emit('move', {
                id: _opponent.id,
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
        
        swapColors: function() {
            if (_isState(STATES.INITIAL)) {
                return true;
            } else {
                _socket.emit('swap_colors', {
                    id: _opponent.id
                });
                return _isHost;
            }
        },
        
        isLoggedIn: function() {
            return _user != null;
        },
        
        getUser: function() {
            return _user;
        },
        
        surrender: function() {
            _state = (_user != null) ? STATES.LOGGED_IN : STATES.INITIAL;
            _socket.emit('surrender', {
                id: _opponent.id
            });
        },
        
        /*
        queryOpponent: function(callback) {
            _get(REST_URL + 'api/users/' + _opponent + '?token=' + _token,
            function(result) {
                if (result.status == 200) {
                    callback(JSON.parse(result.data).user);
                } else {
                    callback(null);
                }
            });
        },
        */
        
        getOpponent: function() {
            return _opponent;
        },
        
        queryUser: function(userId, callback) {
            _queryUser(userId, callback);
        },
        
        /**
         * Query all user in the lobby.
         * @param {App~playerListCallback} callback
         */
        queryPlayersInLobby: function(callback) {
            var data;
            
            _get(REST_URL + 'api/users?token=' + _token, function(res) {
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
            _opponent = _invited;
            _invited = null;
            _receivedInvites = [];
            _isHost = true;
            _socket.emit('game_create', {
                id: _opponent.id
            });
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