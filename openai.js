require('dotenv').config();
const fetch = require('node-fetch');

const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${process.env.OPEN_AI_KEY}`,
};

const listModels = async () => {
    const url = 'https://api.openai.com/v1/models';
    const resp = await fetch(url, {headers});
    const jsn = await resp.json();

    console.log(jsn);
    return jsn;
};

const generateImage = async (prompt) => {
    const url = 'https://api.openai.com/v1/images/generations';
    const method = 'POST';
    const body = JSON.stringify({
        prompt,
        n: 1,
        size: '256x256',
    });
    const resp = await fetch(url, {method, headers, body});
    const jsn = await resp.json();
    console.log(JSON.stringify(jsn));
    return jsn;
};

generateImage('These Engines Go to 11');

// 'These Engines Go to 11' https://oaidalleapiprodscus.blob.core.windows.net/private/org-sBbtuabVZwBpVB0Oo7ex1emP/user-yaeCG5uOkrlxb56hqukzfkjV/img-3ZfNOI5FQwGvA0CdoyNlwrv1.png?st=2022-12-05T16%3A03%3A30Z&se=2022-12-05T18%3A03%3A30Z&sp=r&sv=2021-08-06&sr=b&rscd=inline&rsct=image/png&skoid=6aaadede-4fb3-4698-a8f6-684d7786b067&sktid=a48cca56-e6da-484e-a814-9c849652bcb3&skt=2022-12-05T12%3A15%3A20Z&ske=2022-12-06T12%3A15%3A20Z&sks=b&skv=2021-08-06&sig=gKNTKdnBsXPGeoJJ71w4TLNlj%2BnSUv5dfgOwL28PBEc%3D
// 'NASA Cuts Carbs' https://oaidalleapiprodscus.blob.core.windows.net/private/org-sBbtuabVZwBpVB0Oo7ex1emP/user-yaeCG5uOkrlxb56hqukzfkjV/img-LN9za2s9QCDTjwakuE690f6b.png?st=2022-12-05T16%3A00%3A53Z&se=2022-12-05T18%3A00%3A53Z&sp=r&sv=2021-08-06&sr=b&rscd=inline&rsct=image/png&skoid=6aaadede-4fb3-4698-a8f6-684d7786b067&sktid=a48cca56-e6da-484e-a814-9c849652bcb3&skt=2022-12-05T12%3A48%3A31Z&ske=2022-12-06T12%3A48%3A31Z&sks=b&skv=2021-08-06&sig=h2Cr9mVeS4YEROFsS5hms5Pt%2Bz70d7HDewIJS91a7GQ%3D
