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
//
// GUI creation/updation
//
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


//
// API
//

/*---*\
  API
\*---*/
const fetchSuggestions = ()=>fetch("/api/titles/").then(r=>r.json());
const updateSuggestions = async()=>{
    const suggestions = await fetchSuggestions();
    suggestions.forEach(createOrUpdateRow);
};

//
// GUI events
//

/*----------*\
  GUI events
\*----------*/
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

document.addEventListener("DOMContentLoaded", updateSuggestions)
