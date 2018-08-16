/* eslint-disable */

$(() => {

  if (performance.navigation.type == 1) {
    window.history.replaceState(null, null, '/login');
  }
  var userInfo = {}
  var socket = io();

  $('.login ').show();
  $('.signout').hide();

  $('.signout').on('click', function() {
    location.reload();
  })

  $('.group-nav').on('click', function(e) {
    var tab_name = $(this).find('p').text();
    var room = $(this).data('room')
    var room_div = tab_name.replace(/ .*/,'').toLowerCase();
    if(!!userInfo.name) {
    removeActive();
    $(this).find('.group').addClass('active')
    $('.login').hide();
    $('.chat-room').find('h3').text(tab_name)
    $('.chat-online').show();
    window.history.replaceState(null, null, tab_name.toLowerCase());
    if(location.pathname !== '/general') {
      $('.chat-settings').show();
    } else {
      $('.chat-settings').hide();
    }
    hideDivs();
    const data = {
      room: room
    }
    socket.emit('join room', data)
    $('.room-'+room_div).show();
    $('.user-'+room_div).show();
    } else {
      $('.msg-notice').css({color: 'red'})
      $('.msg-notice').text("Login first to chat in " + tab_name +'.')
    }
    return false;
  })

  $('#login-form').submit(function(){
    userInfo.name = $('#login').val();
    if(userInfo.name !== '') {
      var room = "general";
      var loginInfo = {
        name: userInfo.name,
        room: room,
      }
      socket.emit('new user', loginInfo);
      window.history.replaceState(null, null, '/general');
      $('.login').hide()
      $('.chat-room').find('h3').text("General")
      $('.chat-room').show();
      $('.chat-online').show();
      $('.signout').text(userInfo.name + ": Sign out")
      $('.signout').show();
    }

    $('#login').val('');
    return false;
  });

  $('#chat-form').keypress(function(e){
    socket.emit('message typing', userInfo.name);
    if (e.keyCode == 13 && !e.shiftKey) {
      var msg = $('#composer').val();
      if(msg) {
        var room = location.pathname.substr(1).replace(/%20/g, " ").replace(/ .*/,'');
        var type = "private"
        if(room === 'general' || room === 'socketio' || room === 'news') {
          type = "group"
        }
        var messageDetails = {
          room,
          name: userInfo.name,
          message: msg,
          type,
        }
        console.log(messageDetails)
        socket.emit('send message', messageDetails);
        $('#composer').val('');
      }
      return false;
    }
  });

  $('#composer').blur(function(e){
    socket.emit('message not typing', userInfo.name);
    $('.chat-typing').hide();
  })

  $('.chat-header').on('click', '.chat-settings', function(){
    $( "#dialog" ).dialog({
      modal: true,
      resizable: false,
      draggable: false,
      closeOnEscape: true,
      title: "Confirm",
      open: function(event, ui) {
        $(".ui-dialog-titlebar-close", ui.dialog | ui).hide();
      },
      buttons: {
        Confirm: function() {
          const data = {
            room: location.pathname.substr(1).replace(/%20/g, " ").replace(/ .*/,''),
          }
          socket.emit('user left', data, function(response) {
            console.log(data)
            hideDivs();
            removeActive();
            var room_div = "general"
            var tab_name = "General"
            $('.group-list').find('[data-room="' + room_div + '"]').find('p').addClass('active');
            $('.chat-room').find('h3').text(tab_name)
            window.history.replaceState(null, null, tab_name.toLowerCase());
            $('.room-'+room_div).show();
            $('.room-'+data.room).children().remove();
            $('.user-'+room_div).show();
          });
          $(this).dialog( "close" );
        },
        Cancel: function() {
          $('#dialog').dialog( "close" );
        }
      }
    })
    $('.modal-message').text("Are you sure you want to leave?")
  })

  // receiving events

  // notify on new user joined.
  socket.on('new user joined notify', function(data){
    var room_div = data.room
    $('.room-'+room_div).append('<p class="chat-msg new">'+data.name+' '+data.message+'</div>');
    $('.room-'+room_div).scrollTop($('.chat-box')[0].scrollHeight);
  });

  // notify to new app user.
  socket.on('welcome new user notify', function(data){
    console.log(data)
    var room_div = data.room
    $('.room-'+room_div).show();
    $('.room-'+room_div).append('<p class="chat-msg new">'+data.name+', '+data.message+'</div>');
    $('.room-'+room_div).scrollTop($('.room-'+room_div)[0].scrollHeight);
  });

  // notify on leave
  socket.on('user left notify', function(data){
    var room_div = data.room
    $('.room-'+room_div).append('<p class="chat-msg leave">'+data.message+'</div>');
    $('.room-'+room_div).scrollTop($('.room-'+room_div)[0].scrollHeight);
  });

  // receive message .
  socket.on('new message', function(data){
    let user = 'them';
    let username = data.name + ': '

    if(data.name === userInfo.name) {
      user = 'me'
      username = ''
    }
    console.log(data)
    $('.room-'+data.room).append('<p class="chat-msg '+user+'"><strong>'+username+'</strong>'+data.message + '</div>');
    $('.room-'+data.room).scrollTop($('.room-'+data.room)[0].scrollHeight);
  });

  // receive message .
  socket.on('group new member', function(data){
    $( "#dialog" ).dialog({
      modal: true,
      resizable: false,
      draggable: false,
      closeOnEscape: true,
      title: "Welcome " + data.name +"!",
      open: function(event, ui) {
        $(".ui-dialog-titlebar-close", ui.dialog | ui).hide();
      },
      buttons: {
        Ok: function() {
          $( this ).dialog( "close" );
        }
      }
    })
    $('.modal-message').text(data.message)
  });

  // left app.
  socket.on('user left app', function(data){
    console.log(data)
    $('.room-'+data.room).append('<p class="chat-msg leave">'+data.message+'</div>');
    $('.room-'+data.room).scrollTop($('.chat-box')[0].scrollHeight);
  });

  // update room users.
  socket.on('update room users', function(data){
    console.log(data)
    hideDivs();
    $('.room-'+data.room).show();
    $('.user-'+data.room).show();
    let html = '';
    let private_chat_room = '';
    for(i = 0; i < data.users.length; i++) {
      html += '<div class="private-chat" ><p class="user" data-id="'+data.users[i].socketId+'">'+data.users[i].name+'</p></div>'
      if(data.room === "general") {
        removeDivs()
        private_chat_room += '<div class="chat-box private-chat-box room-'+data.users[i].socketId+'" style="display: none; color: #000" data-name="'+data.users[i].name+'"></div>'
      }
    }
    $('.user-'+data.room).html(html).show()
    $('.chat-main').prepend(private_chat_room)
  });

  // left app.
  socket.on('group new member notify other', function(data){
    console.log(data)
    var room_div = data.room
    $('.room-'+room_div).show();
    $('.room-'+room_div).append('<p class="chat-msg new">'+data.message+'</div>');
    $('.room-'+room_div).scrollTop($('.room-'+room_div)[0].scrollHeight);
  });


  function hideDivs(type) {
    if(!type){
      $('.chat-main').find('.chat-box').hide();
      $('.chat-online').find('.user-list').hide();
    } else {
      $('.chat-main').find('.chat-box').hide();
    }
  }

  function removeDivs() {
    $('.chat-main').find('.private-chat-box').remove();
  }

  function removeActive() {
    $('.group').removeClass('active')
  }

  $('.user-list').on('click', '.private-chat', function() {
    console.log("click")
    var id = $(this).find(".user").data("id")
    var name = $(this).find(".user").text()
    window.history.replaceState(null, null, id);
    hideDivs("private")
    $('.chat-room').find('h3').text(name)
    $('.room-'+id).show();
  })
})

