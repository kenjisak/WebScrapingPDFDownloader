const OpenAIApi = require("openai");
const mongoose = require("mongoose");

const openai = new OpenAIApi({
  apiKey: "sk-YourApiKeyHere",
});

async function getResponse(prompt) {
  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
        { role: "user", content: "What are the Required Textbooks from this given outline? and output it in this given JSON format { Course:, Term:,List of Required Textbooks:[{ title:, authors:, isbn:}]} and ONLY that, DO NOT ADD ANY ``` or json in the response: " + prompt },

        { role: "system", content: "You are a helpful assistant." },
    ],
    temperature: 0,
    max_tokens: 300,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
  });
  console.log(response.choices[0].message.content);
}

let testPrompt = `
REQUIRED TEXTS 
 
1. Stephen Tasson, Rebecca Bromwich, Jane Dickson, Vincent Kazmierski, Bettina Appel Kuzmarov, 
Sébastien Malette, Umut Öszu (eds.), Introduction to Legal Studies: Foundations and Rights 
Protection (vol.1) Canadian Legal Studies Series (Concord: Captus Press, 2080); ISBN 978-1-
55322-375-7. 
 
 2. Rick Ruddell, George Pavlich, Exploring Criminal Justice in Canada - Law and Society Redefined, 
Carleton University Custom Edition (Oxford University Press, 2016 & 2011); ISBN: 9780199015658.  
 
Both of these texts are available at the Carleton University Bookstore. You may be able to purchase 
second hand copies at (very) reduced pricesf the texts at Haven Books (43 Seneca Street, Ottawa (tel. 
613-730-9888) or at the Carleton Bookstore. Please be sure you are purchasing the correct books - 
checking the ISBN number is the best way to be certain.  
 
Copies of the Course Reader and the Ruddell-Pavlich text have also been placed on reserve at the 
MacOdrum Library, and are available for 2-hour periods on a first come, first served, basis. 
LAWS 1001 A/T  FALL - 2019 
`;

async function connectToDB() {
    let databaseName = "PDFTextbooksScraper";
    mongoose.connect("mongodb://127.0.0.1:27017/" + databaseName);
    mongoose.connection.on("error", (err) => {
      console.log("err", err);
    });
    mongoose.connection.on("connected", (err, res) => {
      console.log("mongoose is connected");
    });
    console.log("Connected to MongoDB");
    return mongoose.connection;
}

async function addToTextbooksList() {
    let db = await connectToDB();
    await getResponse(testPrompt)
   // let resObj = JSON.parse(await getResponse(testPrompt));

    //await db.collection("TextbooksList").insertOne(resObj);
}

addToTextbooksList();