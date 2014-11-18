var fabHomeLogin = document.getElementById('fab-home-login');
var loginForm = document.getElementById('form-home-login');

fabHomeLogin.onclick =  function(e) {
    e.preventDefault();

    if (document.forms['form-home-login'].username.value != "") {
        loginForm.submit();
    }
};

console.log(fabHomeLogin);