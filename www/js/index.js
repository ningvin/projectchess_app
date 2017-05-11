(function() {
    var app;
    
    /*
     * Controllers for the different pages. Each controller has to
     * expose the functions 'init', 'show', 'hide' and 'destroy'
     * corresponding to the Onsen UI lifecycle events
     */
    var pages = {
        
        'main-menu': (function() {
            
            return {
                init: function(page) {
                    page.querySelector('#lobby-btn').onclick = function() {
                        var nav = document.querySelector('#navigator');
                        if (app.isLoggedIn()) {
                            nav.pushPage('pages/lobby.html');
                        } else {
                            nav.pushPage('pages/login.html',
                                {
                                    data: {
                                        target: 'pages/lobby.html'
                                    }
                                }
                            );
                        }
                    };

                    page.querySelector('#local-btn').onclick = function() {
                        document.querySelector('#navigator')
                                .pushPage('pages/create_game.html',
                                    {
                                        data: {
                                            isLocalGame: true
                                        }
                                    }
                                );
                    };
                    
                    /*
                    page.querySelector('#regbtn').onclick = function() {
                        document.querySelector('#navigator')
                                .pushPage('pages/register.html');
                    };
                    */
                },
                
                show: function(page) {
                    if (!app.isLoggedIn()) {
                        console.log('not logged in');
                        document.querySelector('#account-mgmt-icon')
                            .setAttribute('icon', 'ion-ios-person-outline, material:md-account-o');
                    } else {
                        console.log('logged in');
                        document.querySelector('#account-mgmt-icon')
                            .setAttribute('icon', 'ion-ios-person, material:md-account');
                    }
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
                                if (_page.data != null) {
                                    document.querySelector('#navigator')
                                        .replacePage(_page.data.target);
                                    _page.data = null;
                                } else {
                                    console.log(_page);
                                    document.querySelector('#navigator')
                                        .pushPage('pages/main_menu.html');
                                }
                                
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
        
        'create-game-page': (function() {
            
            var _players;
            var _infoCards;
            
            var _gameSettings;
            var _isLocalGame;
            
            var _applyColors = function() {
                _infoCards[0].color.innerHTML = _players[0].color;
                _infoCards[1].color.innerHTML = _players[1].color;
            };
            
            var _swapColors = function() {
                var c = _players[0].color;
                _players[0].color = _players[1].color;
                _players[1].color = c;
                
                _applyColors();
            };
            
            var _createLocalPlayerData = function(index, color) {
                return {
                    name: 'Player ' + (index + 1).toString(),
                    color: color,
                    type: 'local'
                };
            };
            
            var _createOnlinePlayerData = function(color, alias, id) {
                return {
                    name: alias,
                    color: color,
                    id: id,
                    type: 'network'
                };
            };
            
            var _setupInfoCard = function(page, index) {
                var prefix = 'player' + (index + 1).toString();
                var card = {};
                
                card.color = page.querySelector('#' + prefix + '-color');
                card.type = page.querySelector('#' + prefix + '-type');
                var swapBtn = page.querySelector('#' + prefix + '-swap-btn');
                
                if (_isLocalGame) {
                    card.type.innerHTML = 'Local Player';
                    card.name = page.querySelector('#' + prefix + '-name-input');
                    card.name.value = _players[index].name;
                    page.querySelector('#' + prefix + '-name').style.display = 'none';
                    swapBtn.onclick = _swapColors;
                } else {
                    card.type.innerHTML = 'Online Player';
                    card.name = page.querySelector('#' + prefix + '-name');
                    card.name.innerHTML = _players[index].name;
                    page.querySelector('#' + prefix + '-name-input').style.display = 'none';
                    
                    if (app.isHost()) {
                        swapBtn.onclick = function() {
                            if (app.swapColors()) {
                                _swapColors();
                            }
                        };
                    } else {
                        swapBtn.style.display = 'none';
                    }
                }
                
                return card;
            };
            
            var _setupInfoCards = function(page) {
                _infoCards.push(_setupInfoCard(page, 0));
                _infoCards.push(_setupInfoCard(page, 1));
            };
            
            var _initializePlayerData = function(data) {
                if (_isLocalGame) {
                    _players.push(_createLocalPlayerData(0, 'white'));
                    _players.push(_createLocalPlayerData(1, 'black'));
                } else {
                    _players.push(_createOnlinePlayerData('white'
                            , data.users[0].alias
                            , data.users[0].id));
                    _players.push(_createOnlinePlayerData('black'
                            , data.users[1].alias
                            , data.users[1].id));
                }
            };
            
            var _launchGame = function() {
                document.querySelector('#navigator')
                        .replacePage('pages/game.html',
                            {
                                data: {
                                    players: _players,
                                    isLocalGame: _isLocalGame
                                }
                            }
                        );
            };
            
            return {
                init: function(page) {
                    var startButton;
                    page.querySelector('ons-toolbar .center').innerHTML = 'Create Game';
                    
                    _isLocalGame = page.data.isLocalGame;
                    _players = [];
                    _infoCards = [];
                    
                    startButton = page.querySelector('#start-btn');
                    startButton.disabled = !_isLocalGame && !app.isHost();
                    startButton.onclick = function() {
                        if (!_isLocalGame)
                            app.launchGame();
                        _launchGame();
                    };
                    
                    _initializePlayerData(page.data);
                    _setupInfoCards(page);
                },
                
                show: function(page) {
                    app.on('game_launch', _launchGame);
                    app.on('swap_colors', _swapColors);
                },
                
                hide: function(page) {
                    app.removeListener('game_launch', _launchGame);
                    app.removeListener('swap_colors', _swapColors);
                },
                
                destroy: function(page) {
                }
            }
            
        })(),
        
        'game-page': (function() {
            
            var _game;
            
            var _onFinished = function(result) {
                
            };
            
            return {
                init: function(page) {
                    page.querySelector('ons-toolbar .center').innerHTML = 'Game';
                    page.querySelector('#quit-game-btn').onclick = function() {
                        document.querySelector('#navigator')
                                .pushPage('pages/game_end_win.html');
                    };
                    var rendererParent = document.getElementById("renderer_parent");
                    var players = page.data.players;
                    var whiteIndex = (players[0].color === 'white') ? 0 : 1;
                    var blackIndex = 1 - whiteIndex;
                    if (!page.data.isLocalGame) {
                        // Online Game, but one of the players is us
                        if (app.isHost()) {
                            players[0].type = 'local';
                        } else {
                            players[1].type = 'local';
                        }
                    }
                    var settings = {
                        rendererParent: rendererParent,
                        players: {
                            white: players[whiteIndex],
                            black: players[blackIndex]
                        }
                    };
                    
                    _game = new Game(app, settings, _onFinished);
                    _game.run();
                },
                
                show: function(page) {
                    
                },
                
                hide: function(page) {
                    
                },
                
                destroy: function(page) {
                    _game.dispose();
                    _game = null;
                }
            }
            
        })(),

        'select-mode-page':(function(){

            return {
                init: function(page) {
                    page.querySelector('#real-match-btn').onclick = function() {
                        document.querySelector('#navigator')
                                .pushPage('pages/lobby.html');
                    };

                    page.querySelector('#practice-match-btn').onclick = function() {
                        document.querySelector('#navigator')
                                .pushPage('pages/game.html');
                    };
                    document.getElementById('user-id').appendChild(app.getUser().id);
                },
                
                show: function(page) {
                    
                },
                
                hide: function(page) {
                    
                },
                
                destroy: function(page) {
                    
                }
            }
            
        })(),

        'game-end-win-page':(function(){
           
            return {
                init: function(page) {
                    page.querySelector('#go-main-btn').onclick = function() {
                        document.querySelector('#navigator')
                                .pushPage('pages/select_mode.html');
                    };

                    page.querySelector('#go-lobby-btn').onclick = function() {
                        document.querySelector('#navigator')
                                .pushPage('pages/lobby.html');
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

        'game-end-lose-page':(function(){
           
            return {
                init: function(page) {
                    page.querySelector('#go-main-btn').onclick = function() {
                        document.querySelector('#navigator')
                                .pushPage('pages/select_mode.html');
                    };

                    page.querySelector('#go-lobby-btn').onclick = function() {
                        document.querySelector('#navigator')
                                .pushPage('pages/lobby.html');
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
                    message: 'Invitation from ' + msg.alias,
                    buttonLabels: ['Decline', 'Accept'],
                    callback: function(selected) {
                        if (selected == 1) {
                            _acceptInvite(msg.id);
                        } else {
                            app.declineInvite(msg.id);
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
                    //app.launchGame();
                    app.createGame();
                    document.querySelector('#navigator')
                            .pushPage('pages/create_game.html', {
                                data: _createGameData()
                            });
                } else {
                    ons.notification.alert(msg.id + ' declined your invitation!');
                }
            };
            
            var _handleJoinLobby = function(msg) {
                _players.push(msg);
                _list.refresh();
            };
            
            var _findPlayerInLobby = function(id) {
                var i = 0;
                while (i < _players.length && _players[i].id !== id)
                    i++;
                if (i >= _players.length) {
                    return -1;
                } else {
                    return i;
                }
            };
            
            var _handleLeaveLobby = function(msg) {
                var i = _findPlayerInLobby(msg.id);
                if (i != -1)
                    _players.splice(i, 1);
                _list.refresh();
            };
            
            var _handleGameCreate = function(msg) {
                console.log('Handle  game creat');
                _dialog.hide();
                _dialog = null;
                document.querySelector('#navigator')
                        .pushPage('pages/create_game.html', {
                            data: _createGameData()
                        });
            };
            
            var _createGameData = function() {
                var user = app.getUser();
                var opponent = app.getOpponent();
                var users = [];
                if (app.isHost()) {
                    users[0] = user;
                    users[1] = opponent;
                } else {
                    users[0] = opponent;
                    users[1] = user;
                }
                var data = {
                    isLocalGame: false,
                    users: users
                };
                console.log(data);
                return data;
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
            
            var _sendInvite = function(player) {
                app.cancelInvite();
                app.sendInvite(player);
                var invited = document.querySelector('#invited-player');
                invited.querySelector('.center').innerHTML = player.alias;
                invited.style.display = 'inline';
            };
            
            var _sendCancelInvite = function() {
                app.cancelInvite();
                document.querySelector('#invited-player')
                        .style.display = 'none';
            };
            
            var _listDelegate = {
                createItemContent: function(i) {
                    var player = _players[i];
                    var item = ons._util.createElement(
                        '<ons-list-item tappable="">\
                            <div class="left">\
                                <ons-icon icon="md-face"\
                                    class="list-item__icon">\
                                </ons-icon>\
                            </div>\
                            <div class="center">'
                                + ((player != null) ? player.alias : "")  +
                            '</div>\
                            <ons-button class="right">\
                                Invite\
                            </ons-button>\
                        </ons-list-item>'
                    );
                    
                    item.querySelector('ons-button')
                        .onclick = function() {
                            _sendInvite(player);
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
                    page.querySelector('#invited-player').style.display = 'none';
                },
                
                show: function(page) {
                    _reloadList();
                    app.on('game_create', _handleGameCreate);
                    app.on('game_invite', _handleGameInvite);
                    app.on('game_launch', _handleGameLaunch);
                    app.on('game_response', _handleGameResponse);
                    app.on('join_lobby', _handleJoinLobby);
                    app.on('leave_lobby', _handleLeaveLobby);
                },
                
                hide: function(page) {
                    app.removeListener('game_create', _handleGameCreate);
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

    /*
     * Called when Onsen UI is ready
     */
    ons.ready(function() {
        app = new App();
    });
    
    /*
     * Handle Onsen UI page lifecycle
     */
    
    /*
     * Called after a page was attached to the DOM
     */
    document.addEventListener('init', function(event) {
        var page = event.target;
        if (pages.hasOwnProperty(page.id) && pages[page.id].init != null) {
            pages[page.id].init(page);
        }
    });
    
    /*
     * Called before a page is destroyed and removed from the DOM
     */
    document.addEventListener('show', function(event) {
        var page = event.target;
        if (pages.hasOwnProperty(page.id) && pages[page.id].show != null) {
            pages[page.id].show(page);
        }
    });
    
    /*
     * Called when a page comes into view
     */
    document.addEventListener('hide', function(event) {
        var page = event.target;
        if (pages.hasOwnProperty(page.id) && pages[page.id].hide != null) {
            pages[page.id].hide(page);
        }
    });
    
    /*
     * Called when a page disappears from view
     */
    document.addEventListener('destroy', function(event) {
        var page = event.target;
        if (pages.hasOwnProperty(page.id) && pages[page.id].destroy != null) {
            pages[page.id].destroy(page);
        }
    });
})();