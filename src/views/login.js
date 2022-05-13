const params = new URLSearchParams(document.location.search);
if (params.has('auth')) {
    const message = document.getElementById('message');
    const status = params.get('auth');

    if (status === 'none') {
        message.innerText = 'You must log in to do that.';
    } else if (status === 'failed') {
        message.innerText = 'Wrong username or password.';
    } else if (status === 'expired') {
        message.innerText = 'Your credentials expired. Please log in again.';
    }
}
