/**
 * Represents a game of chess. A Game keeps track of its
 * state and enforces the order in which players make moves.
 * @constructor
 * @param {App} app 
 * @param {Object} settings
 * @param {Callback} onFinished
 */
var Game = function(app, settings, onPlayerTurn, onFinished) {
    
    var _players = [];
    var _currentPlayerIndex;
    var _currentPlayer;
    var _cameraControls;
    var _chess;
    var _board;
    
    var _delegatePlayer = function() {
        if (_chess.game_over()) {
            if (_chess.in_checkmate()) {
                onFinished('win_' + (_chess.turn() === 'w') ? 'black' : 'white');
            } else {
                onFinished('draw');
            }
            return;
        }
        onPlayerTurn((_currentPlayerIndex == 0) ? 'white' : 'black');
        _currentPlayer.selectMove(_onMoveSelected);
    };
    
    var _onMoveSelected = function(move) {
        _chess.move(move);
        _board.animateMove(move, _onFinishedAnimating);
    };
    
    var _onFinishedAnimating = function() {
        _nextPlayer();
        _delegatePlayer();
    };
    
    var _nextPlayer = function() {
        _currentPlayerIndex = (_currentPlayerIndex + 1) % 2;
        _currentPlayer = _players[_currentPlayerIndex];
    };
    
    var _getCurrentPlayerIndex = function() {
        return (_chess.turn() === 'w') ? 0 : 1;
    };
    
    var _createPlayers = function() {
        _players.push(_createPlayer('w', settings.players.white.type));
        _players.push(_createPlayer('b', settings.players.black.type));
        _currentPlayerIndex = _getCurrentPlayerIndex();
        _currentPlayer = _players[_currentPlayerIndex];
        _delegatePlayer();
    };
    
    var _isLocalGame = function() {
        return settings.players.white.type === 'local'
                && settings.players.black.type === 'local';
    };
    
    var _createPlayer = function(color, type) {
        if (type === 'local') {
            return new LocalPlayer(color, app, _board, !_isLocalGame());
        } else if (type === 'network') {
            return new NetworkPlayer(color, app);
        }
    };
    
    return {
        /**
         * Initialize and run the game. Players will select moves alternately
         * and the BoardView will be updated accordingly.
         */
        run: function(pgn) {
            var parent = settings.rendererParent;
            _chess = new Chess();
            if (pgn != null) {
                _chess.load(pgn);
            }
            _board = new BoardView(_chess, parent, _createPlayers);
            _camControls = new CameraControls(_board, parent);
        },
        
        fitRenderer: function() {
            _board.fitRenderer();
        },
        
        /**
         * Remove any registered event listeners.
         */
        dispose: function() {
            var i;
            for (i = 0; i < _players.length; i++) {
                _players[i].dispose();
                _players[i] = null;
            }
        }
    };
};