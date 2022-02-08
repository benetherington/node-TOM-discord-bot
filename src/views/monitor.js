const addSuggestionToView = ({suggestion, author, voteCount})=>{
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
    
    document.querySelector("#suggestions").append(row)
}

const updateVoteCount = ({suggestion, author, voteCount})=>{
    document
        .querySelector(`tr#s${suggestion.suggestionId} > td.votes`)
        .textContent = voteCount;
}

const fetchSuggestions = async()=>{
    const countedSuggestions = await fetch("/api/titles/").then(r=>r.json());
    countedSuggestions.forEach(countedSuggestion=>{
        if (document.querySelector("tr#s"+countedSuggestion.suggestion.suggestionId)) {
            updateVoteCount(countedSuggestion)
        } else {
            addSuggestionToView(countedSuggestion)
        }
    })
}

const startRegularUpdates = ()=>{
    fetchSuggestions()
    setInterval(fetchSuggestions, 1000)
};

document.addEventListener("DOMContentLoaded", startRegularUpdates)
