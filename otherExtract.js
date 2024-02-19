const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const OpenAIApi = require("openai");
const mongoose = require("mongoose");

let db = connectToDB();

const openai = new OpenAIApi({
    apiKey: "sk-YourApiKeyHere",
});

const DEFAULT_OPTIONS = {
    max: 2,//option to only extract text from the first two pages
}
// Function to read all PDF files in a folder and extract text from the first two pages
async function extractTextFromPDFs(folderName) {
    var numReqTextFound = 0;
    const folderPath = path.join(__dirname, folderName);// Get the absolute path of the folder
    const files = fs.readdirSync(folderPath);// Read all files in the folder
    
    let finishedPdfsID = new mongoose.Types.ObjectId('65d2e7261e8a2dfbfeb3efa4');

    for (const file of files) {
        let pdfsDone = await db.collection("PDFsFinished").findOne({_id: finishedPdfsID});//get the finishedSet from the mongodb collection
        pdfsDone = pdfsDone.finishedSet;
        // console.log(pdfsDone);
        if(pdfsDone.includes(file)){//skip the file if it is already in the finishedSet
            continue;
        }

        const filePath = path.join(folderPath, file);
        const dataBuffer = fs.readFileSync(filePath);// Read the PDF file
        
        pdfParse(dataBuffer,DEFAULT_OPTIONS).then(async function(data) {
            var jsonText = await getResponse(data.text);//ask GPT-3.5 for the required textbooks from pdf scraped outline
            var jsonTextObj = JSON.parse(jsonText);
            jsonTextObj['PDF File'] = file;//add file name to json object

            if(jsonTextObj['List of Required Textbooks'].length > 0){
                numReqTextFound++;

                await db.collection('HasTextbooksList').insertOne(jsonTextObj);//add pdf textbooks object to a mongodb collection
                console.log("Inserted to HasTextbooksList");
            }else{//no textbooks were found
                await db.collection('NoTextbooksList').insertOne(jsonTextObj);//add pdf textbooks object to a mongodb collection
                console.log("Inserted to NoTextbooksList");
            }

            pdfsDone.push(file);//add file to finishedSet
            await db.collection('PDFsFinished').updateOne({_id: finishedPdfsID}, {$set: {finishedSet: pdfsDone}});//add file to finishedSet
            console.log("Updated PDFsFinished: ",file," added to finishedSet.");
        });

        console.log("Num PDF Text Found: " + numReqTextFound);
        await sleep(20);//rate limit to request every 20 seconds, 3 requests per minute for GPT-3.5
        // break; // Remove this line to process all PDFs in the folder
    }
    db.close();
}

// Function to get a response from OpenAI
async function getResponse(prompt) {
    const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo-0125",
        messages: [
            { role: "user", content: "What are the Required Textbooks from this given outline? and output it in this given JSON format { Course:, Term:,List of Required Textbooks:[{ title:, authors:, isbn:}]} and ONLY that: " + prompt },
            
            { role: "system", content: "You are a helpful assistant." }
        ],
        temperature: 0,
        max_tokens: 1000,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
        
    });
    console.log(response.choices[0].message.content);
    return response.choices[0].message.content;
};

function sleep(seconds) {
    let ms = seconds * 1000;
    return new Promise(resolve => setTimeout(resolve, ms));
}

function connectToDB() {
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

// Call the function with the folder name
const folderName = 'allPDFs';
extractTextFromPDFs(folderName);
