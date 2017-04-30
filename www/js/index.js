(function() {
    var app;
    
    var pages = {
        
        'main-menu': (function() {
            
            return {
                init: function(page) {
                    page.querySelector('#loginbtn').onclick = function() {
                        document.querySelector('#navigator')
                                .pushPage('pages/login.html');
                    };

                    page.querySelector('#regbtn').onclick = function() {
                        document.querySelector('#navigator')
                                .pushPage('pages/register.html');
                    };
                },
                
                show: function(page) {
                    
                },
                
                hide: function(page) {
                    
                },
                
                destroy: function(page) {
                    
                }
            }
            
        })(),
        
        'register-page': (function() {
            
            return {
                init: function(page) {
                    page.querySelector('ons-toolbar .center').innerHTML = 'Register';
                    page.querySelector('#cancel-btn').onclick = function() {
                        document.querySelector('#navigator').popPage();
                    };
                },
                
                show: function(page) {
                    
                },
                
                hide: function(page) {
                    
                },
                
                destroy: function(page) {
                    
                }
            }
            
        })(),
        
        'login-page': (function() {
            
            var _page;
            
            var _handleLogin = function() {
                var data = {
                    alias: _page.querySelector('#username').value,
                    password: _page.querySelector('#password').value
                };
                console.log(data);
                ons.createDialog('dialogs/login_progress_dialog.html')
                    .then(function(dialog) {
                        dialog.show();
                        app.login(data, function(result) {
                            dialog.hide();
                            if (result) {
                                document.querySelector('#navigator')
                                        .pushPage('pages/lobby.html');
                            } else {
                                ons.notification.alert('Login failed!');
                            }
                        });
                    });
            };
            
            return {
                init: function(page) {
                    _page = page;
                    page.querySelector('ons-toolbar .center').innerHTML = 'Login';
                    page.querySelector('#cancel-btn').onclick = function() {
                        document.querySelector('#navigator').popPage();
                    };
                    page.querySelector('#loginbtn').onclick = _handleLogin;
                },
                
                show: function(page) {
                    
                },
                
                hide: function(page) {
                    
                },
                
                destroy: function(page) {
                    
                }
            }
            
        })(),
        
        'game-page': (function() {
            
            return {
                init: function(page) {
                    page.querySelector('ons-toolbar .center').innerHTML = 'Game';
                    var rendererParent = document.getElementById("renderer_parent");
                        
                    var game = new Chess();
                    var board = new BoardView(game, rendererParent, startGame);
                    var currentColor = 'w';
                    
                    function startGame() {
                        board.selectMoveForColor(currentColor, performMove);
                    }
                    
                    function performMove(move) {
                        game.move(move);
                        board.animateMove(move, onFinishedAnimating);
                    }
                    
                    function onFinishedAnimating() {
                        nextColor();
                        board.selectMoveForColor(currentColor, performMove);
                    }
                    
                    function nextColor() {
                        currentColor = (currentColor === 'w') ? 'b' : 'w';
                    }
                    
                    var camControls = new CameraControls(board, rendererParent);
                },
                
                show: function(page) {
                    
                },
                
                hide: function(page) {
                    
                },
                
                destroy: function(page) {
                    
                }
            }
            
        })(),
        
        'lobby-page': (function() {
            
            var _dialog;
            var _players = [];
            var _list;
            
            var _acceptInvite = function(userId) {
                ons.createDialog('dialogs/login_progress_dialog.html')
                    .then(function(dialog) {
                        _dialog = dialog;
                        dialog.querySelector('.dialog-caption')
                                .innerHTML = 'Waiting for opponent...';
                        dialog.show();
                        app.acceptInvite(userId);
                    });
            };
            
            var _handleGameInvite = function(msg) {
                ons.notification.confirm({
                    message: 'Invitation from ' + msg.userId,
                    buttonLabels: ['Decline', 'Accept'],
                    callback: function(selected) {
                        if (selected == 1) {
                            _acceptInvite(msg.userId);
                        } else {
                            app.declineInvite(msg.userId);
                        }
                    }
                });
            };
            
            var _handleGameLaunch = function(msg) {
                console.log('game_launch received');
                _dialog.hide();
                _dialog = null;
                document.querySelector('#navigator')
                        .pushPage('pages/game.html');
            };
            
            var _handleGameResponse = function(msg) {
                console.log('Response:');
                console.log(msg);
                if (msg.accepted) {
                    app.launchGame();
                    document.querySelector('#navigator')
                            .pushPage('pages/game.html');
                } else {
                    ons.notification.alert(msg.id + 'declined your invitation!');
                }
            };
            
            var _handleJoinLobby = function(msg) {
                _players.push(msg.id);
                _list.refresh();
            };
            
            var _handleLeaveLobby = function(msg) {
                var i = _players.indexOf(msg.id);
                if (i != -1)
                    _players.splice(i, 1);
                _list.refresh();
            };
            
            var _reloadList = function() {
                app.queryPlayersInLobby(function(users) {
                    if (users != null) {
                        console.log(users.length);
                        _players = users;
                        _list.refresh();
                    } else {
                        console.log('no users');
                    }
                    
                    app.joinLobby();
                });
            };
            
            var _listDelegate = {
                createItemContent: function(i) {
                    var id = _players[i];
                    var item = ons._util.createElement(
                        '<ons-list-item tappable="">\
                            <div class="left">\
                                <ons-icon icon="md-face"\
                                    class="list-item__icon">\
                                </ons-icon>\
                            </div>\
                            <div class="center">'
                                + id +
                            '</div>\
                        </ons-list-item>'
                    );
                    
                    item.onclick = function() {
                        app.sendInvite(id);
                    };
                    
                    return item;
                },
                
                countItems: function() {
                    return _players.length;
                }
            };
            
            return {
                init: function(page) {
                    _list = page.querySelector('#lobby-player-list');
                    _list.delegate = _listDelegate;
                },
                
                show: function(page) {
                    _reloadList();
                    app.on('game_invite', _handleGameInvite);
                    app.on('game_launch', _handleGameLaunch);
                    app.on('game_response', _handleGameResponse);
                    app.on('join_lobby', _handleJoinLobby);
                    app.on('leave_lobby', _handleLeaveLobby);
                },
                
                hide: function(page) {
                    app.removeListener('game_invite', _handleGameInvite);
                    app.removeListener('game_launch', _handleGameLaunch);
                    app.removeListener('game_response', _handleGameResponse);
                    app.removeListener('join_lobby', _handleJoinLobby);
                    app.removeListener('leave_lobby', _handleLeaveLobby);
                    app.leaveLobby();
                },
                
                destroy: function(page) {
                }
            }
            
        })(),
    };

    ons.ready(function() {
        app = new App();
    });
    
    /*
    document.addEventListener('init', function(event) {
        var page = event.target;
        if (pageInitializers.hasOwnProperty(page.id)) {
            pageInitializers[page.id](page);
        }
    });
    */
    
    document.addEventListener('init', function(event) {
        var page = event.target;
        if (pages.hasOwnProperty(page.id) && pages[page.id].init != null) {
            pages[page.id].init(page);
        }
    });
    
    document.addEventListener('show', function(event) {
        var page = event.target;
        if (pages.hasOwnProperty(page.id) && pages[page.id].show != null) {
            pages[page.id].show(page);
        }
    });
    
    document.addEventListener('hide', function(event) {
        var page = event.target;
        if (pages.hasOwnProperty(page.id) && pages[page.id].hide != null) {
            pages[page.id].hide(page);
        }
    });
    
    document.addEventListener('destroy', function(event) {
        var page = event.target;
        if (pages.hasOwnProperty(page.id) && pages[page.id].destroy != null) {
            pages[page.id].destroy(page);
        }
    });
})();