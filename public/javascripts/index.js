var fabHomeLogin = document.getElementById('fab-home-login');
var loginForm = document.getElementById('form-home-login');

fabHomeLogin.onclick =  function(e) {
    e.preventDefault();

    if (document.forms['form-home-login'].roomname.value != "") {
        loginForm.submit();
    }
};

getTurnServer("https://computeengineondemand.appspot.com/turn?username=hoot&key=1830");


function getTurnServer(turn_url) {
    console.log('Getting TURN server from ', turn_url);
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function(){
        if (xhr.readyState === 4 && xhr.status === 200) {
            var turnServer = JSON.parse(xhr.responseText);
            console.log('Got TURN server: ', turnServer);
            console.log(turnServer.username + " + + + " + turnServer.turn  + " / / / " + turnServer.password);
        }
    };
    xhr.open('GET', turn_url, true);
    xhr.send();
}