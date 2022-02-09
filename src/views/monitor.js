//
// GUI creation/updation
//

const createRow = ({suggestion, author, voteCount})=>{
    const row = document.createElement("tr")
    row.id = "s" + suggestion.suggestionId;

    const authorTd = document.createElement("td");
    authorTd.classList.add("author")
    authorTd.textContent = author.displayName || author.username;
    row.append(authorTd)
    
    const textTd = document.createElement("td");
    textTd.classList.add("suggestion")
    textTd.textContent = suggestion.text;
    row.append(textTd)
    
    const votesTd = document.createElement("td");
    votesTd.classList.add("votes")
    votesTd.textContent = voteCount;
    row.append(votesTd)
    
    const deleteButton = document.createElement("button");
    deleteButton.classList.add("suggestion-delete")
    row.append(deleteButton)
    
    return row;
};

const updateRowVoteCount = (row, {voteCount})=>{
    row.querySelector(`td.votes`).textContent = voteCount;
};

const createOrUpdateRow = (countedSuggestion)=>{
    const row = document.querySelector(
        "tr#s" + countedSuggestion.suggestion.suggestionId
    )
    
    if (row) updateRowVoteCount(row, countedSuggestion)
    else { document.querySelector("#suggestions").append(
            createRow(countedSuggestion)
        )
    }
};


//
// API
//

const fetchSuggestions = ()=>fetch("/api/titles/").then(r=>r.json());

const updateSuggestions = async()=>{
    const suggestions = await fetchSuggestions();
    suggestions.forEach(createOrUpdateRow);
};

//
// GUI events
//

var updateIntervalId;
const autoUpdate = (e)=>{
    const autoButton = document.querySelector("button#autoUpdate")
    if (autoButton.classList.toggle("depressed")) {
        updateSuggestions()
        updateIntervalId = setInterval(updateSuggestions, 1000)
    } else {
        clearInterval(updateIntervalId)
    }
};

// document.addEventListener("DOMContentLoaded", startRegularUpdates)
