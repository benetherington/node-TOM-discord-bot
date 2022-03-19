const params = new URLSearchParams(document.location.search);
if (params.has("auth")) {
    const message = document.getElementById("message");
    message.innerText = params.get("auth");
}