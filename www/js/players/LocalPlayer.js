/**
 * A local player selecting moves via the 3D BoardView
 * @constructor
 * @param {string} color - The color this player uses
 * @param {App} app
 * @param {BoardView} boardView
 * @param {boolean} isNetworkedGame
 */
var LocalPlayer = function(color, app, boardView, isNetworkedGame) {
    
    var _callback;
    var _onMoveSelected = function(move) {
        if (isNetworkedGame)
            // TODO: let app handle decision?
            app.sendMove(move);
        _callback(move);
        _callback = null;
    };
    
    return {
        /**
         * Let the user select a move for this player
         * @param {moveSelecetedCallback} callback
         */
        selectMove: function(callback) {
            _callback = callback;
            boardView.selectMoveForColor(color, _onMoveSelected);
        },
        
        /**
         * Dispose of this player, freeing all ressources
         */
        dispose: function() {
        }
    };
    
};

/**
 * Called after a chess move has been selected
 * @callback moveSelecetedCallback
 * @param {Object} move - The selected move, a valid chess.js move object
 */