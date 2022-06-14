/*---*\
  API
\*---*/
const getAuthors = (offset, limit=20) => {
    const params = new URLSearchParams();
    if (offset) params.append('offset', offset);
    if (limit) params.append('limit', limit);
    return fetch(`/api/authors?${params}`).then((r) => r.json());
};

/*-----------*\
  GUI Helpers
\*-----------*/
const getSocialElement = (username, displayName) => {
    const socialElement = document.createElement("div");
    
    const iconEl = document.createElement('div');
    iconEl.classList.add('icon');
    socialElement.append(iconEl)

    const usernameEl = document.createElement('div');
    usernameEl.classList.add('username');
    usernameEl.textContent = username ? "@"+username: "";
    socialElement.append(usernameEl)

    const displayNameEl = document.createElement('div');
    displayNameEl.classList.add('display-name');
    displayNameEl.textContent = displayName;
    socialElement.append(displayNameEl)

    return socialElement;
};
const addAuthorRow = ({
    authorId,
    callsign,
    username,
    displayName,
    twitterUsername,
    twitterDisplayName,
    emailAddress,
    emailName,
    notes,
}) => {
    const rolodex = document.createElement('div');
    rolodex.classList.add('rolodex', `author-${authorId}`);
    rolodex.title = `${authorId}`;

    const callsignEl = document.createElement('div');
    callsignEl.classList.add('callsign');
    callsignEl.textContent = callsign;
    rolodex.append(callsignEl);

    const infoEl = document.createElement('div');
    infoEl.classList.add('info');
    rolodex.append(infoEl);

    const discordEl = getSocialElement(username, displayName);
    discordEl.classList.add('discord');
    infoEl.append(discordEl);

    const twitterEl = getSocialElement(twitterUsername, twitterDisplayName);
    twitterEl.classList.add('twitter');
    infoEl.append(twitterEl);

    const emailEl = getSocialElement(emailAddress, emailName);
    emailEl.classList.add('email');
    infoEl.append(emailEl);

    const notesEl = document.createElement('textarea');
    notesEl.classList.add('notes');
    notesEl.placeholder = 'No listener notes yet...';
    notesEl.value = notes;
    rolodex.append(notesEl);

    document.getElementById('data-table').append(rolodex);
};

/*-----------*\
  GUI Setters
\*-----------*/
const loadAuthors = async () => {
    const authors = await getAuthors();
    authors.forEach(addAuthorRow);
};

document.addEventListener("DOMContentLoaded", loadAuthors)
