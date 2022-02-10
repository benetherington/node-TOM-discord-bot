/*-----------*\
  GUI cration
\*-----------*/
const createAuthorGridItem = (suggestion, author)=>{
    const authorElement = document.createElement("p");
    authorElement.id = `author-${suggestion.suggestionId}`
    authorElement.classList.add("author")
    authorElement.textContent = author.displayName || author.username;
    return authorElement
}
const createSuggestionGridItem = (suggestion)=>{
    const suggestionElement = document.createElement("p");
    suggestionElement.id = `suggestion-${suggestion.suggestionId}`
    suggestionElement.classList.add("suggestion")
    suggestionElement.textContent = suggestion.text;
    return suggestionElement
}
const createVoteCountGridItem = (suggestion, voteCount)=>{
    const votesElement = document.createElement("p");
    votesElement.id = `votes-${suggestion.suggestionId}`
    votesElement.classList.add("votes")
    votesElement.textContent = voteCount;
    return votesElement
}
const createDeleteGridItem = (suggestion)=>{
    const deleteElement = document.createElement("button");
    deleteElement.id = `delete-${suggestion.suggestionId}`
    deleteElement.classList.add("suggestion-delete")
    deleteElement.onclick = removeSuggestion;
    return deleteElement
}

const createRow = ({suggestion, author, voteCount})=>{
    const row = document.createElement("div");
    row.classList.add("row-container")
    row.append(createAuthorGridItem(suggestion, author))
    row.append(createSuggestionGridItem(suggestion))
    row.append(createVoteCountGridItem(suggestion, voteCount))
    row.append(createDeleteGridItem(suggestion))
    
    document.querySelector("#suggestions").append(row)
};

/*------------*\
  GUI updation
\*------------*/
const updateRowVoteCount = ({suggestion, voteCount})=>{
    document.querySelector(`#votes-${suggestion.suggestionId}`)
            .textContent = voteCount;
};
const createOrUpdateRow = (countedSuggestion)=>{
    const displayed = document.querySelector(
        `*[id$='-${countedSuggestion.suggestion.suggestionId}']`
    )
    
    if (displayed) updateRowVoteCount(countedSuggestion)
    else createRow(countedSuggestion)
};
const removeRow = (element)=>{
    const rowContainer = element.closest(".row-container");
    rowContainer.addEventListener(
        "transitionend",
        rowContainer.remove
    );
    rowContainer.classList.add("deleted")
}


/*---*\
  API
\*---*/
const getSuggestions   = (  )=>fetch("/api/titles/").then(r=>r.json());
const deleteSuggestion = (id)=>fetch(`/api/titles/${id}`, {method:"DELETE"});
const postVoteRequest  = (  )=>fetch("/api/vote", {method: "POST"});

/*----------*\
  GUI events
\*----------*/
// suggestion rows
async function removeSuggestion(e) {
    const id = e.target.id.match(/\d+/)[0];
    if (!id) console.error(e);
    removeRow(e.target);
}
// bottom toolbar
var updateIntervalId;
const autoButton = document.querySelector("button#autoUpdate")
const autoUpdate = ()=>{
    if (autoButton.classList.toggle("depressed")) {
        updateSuggestions()
        updateIntervalId = setInterval(updateSuggestions, 1000);
    } else {
        clearInterval(updateIntervalId)
    }
};
const updateSuggestions = async()=>{
    getSuggestions()
        .catch(console.error)
        .then(suggestions=>suggestions.forEach(createOrUpdateRow));
};
const addSuggestion = ()=>{};
const callVote = ()=>postVoteRequest().catch(console.error);

document.addEventListener("DOMContentLoaded", updateSuggestions)
