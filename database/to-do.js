// const logger = require('../logger');
let db;

/*-------*\
  DB INIT
\*-------*/
const initDB = async () => {
    db = await require('./public');
};
initDB();

/*---------*\
  FUNCTIONS
\*---------*/
const toDoTemplate = [
    {
        name: 'Start Recording',
        done: false,
        default: true,
    },
    {
        name: 'Clap',
        done: false,
        default: true,
    },
    {
        name: 'Confirm TWSF clue/date',
        done: false,
        default: true,
    },
    {
        name: 'Post TWSF clue',
        done: false,
        default: true,
    },
];

module.exports.getToDoList = async () => {
    const currentEpisode = await db.get(
        `SELECT
            episodeId,
            epNum,
            toDo
        FROM Episodes
        ORDER BY created_at DESC
        LIMIT 1;`,
    );
    const {episodeId, epNum} = currentEpisode;
    const toDo = currentEpisode.toDo
        ? JSON.parse(currentEpisode.toDo)
        : toDoTemplate;

    return {episodeId, epNum, toDo};
};

const updateEpisodeToDo = (episodeId, toDoObject) => {
    // Encode data
    const toDo = JSON.stringify(toDoObject);

    // UPDATE Episode
    return db.exec(
        `UPDATE Episodes
        SET toDo = ?
        WHERE episodeId = ?`,
        toDo,
        episodeId,
    );
};

module.exports.toggleToDoItem = async (idx) => {
    // SELECT Episode
    const {episodeId, toDo} = await this.getToDoList();

    // Change data
    const item = toDo[idx];
    item.done = !item.done;

    // UPDATE Episode
    return updateEpisodeToDo(episodeId, toDo);
};

module.exports.appendToDoItem = async (name) => {
    // SELECT Episode
    const {episodeId, toDo} = await this.getToDoList();

    // Change, encode data
    const item = {name, done: false, default: true};
    toDo.push(item);

    // UPDATE Episode
    return updateEpisodeToDo(episodeId, toDo);
};

module.exports.insertToDoItem = async (name, idx) => {
    // SELECT Episode
    const {episodeId, toDo} = await this.getToDoList();

    // Change, encode data
    const item = {name, done: false, default: true};
    toDo.splice(idx, 0, item);

    // UPDATE Episode
    return updateEpisodeToDo(episodeId, toDo);
};

module.exports.deleteToDoItem = async (idx) => {
    // SELECT Episode
    const {episodeId, toDo} = await this.getToDoList();

    // Change, encode data
    toDo.splice(idx, 1);

    // UPDATE Episode
    return updateEpisodeToDo(episodeId, toDo);
};
