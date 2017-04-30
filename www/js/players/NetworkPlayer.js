var NetworkPlayer = function(color, app) {
    
    var _callback;
    var _active = false;
    
    var _handleMove = function(msg) {
        if (!_active)
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
        selectMove: function(callback) {
            _callback = callback;
            _active = true;
        },
        
        dispose: function() {
            app.removeListener('move', _handleMove);
        }
    };
};