document.getElementById('fab-home-login').onclick =  function(e) {
    e.preventDefault();
    if (document.forms['form-home-login'].roomname.value != "") {
        document.getElementById('form-home-login').submit();
    }
};