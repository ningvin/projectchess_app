/**
 * A network player eceiving its moves via the socket.io API
 * @constructor
 * @param {string} color - The color this player uses
 * @param {App} app
 */
var NetworkPlayer = function(color, app) {
    
    var _callback;
    var _active = false;
    
    var _handleMove = function(msg) {
        if (!_active)
            // TODO: queue moves if not active
            return;
        
        if (msg.move.color !== color)
            // Something went wrong
            return;
        
        _active = false;
        _callback(msg.move);
        
        _callback = null;
        
    };
    
    app.on('move', _handleMove);
    
    return {
        /**
         * Select the next move for this player
         * @param {moveSelecetedCallback} callback
         */
        selectMove: function(callback) {
            _callback = callback;
            _active = true;
        },
        
        /**
         * Dispose of this player, freeing all ressources
         */
        dispose: function() {
            app.removeListener('move', _handleMove);
        }
    };
};