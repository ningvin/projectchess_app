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
        selectMove: function(callback) {
            _callback = callback;
            boardView.selectMoveForColor(color, _onMoveSelected);
        },
        
        dispose: function() {
        }
    };
    
};