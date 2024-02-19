const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const OpenAIApi = require("openai");

const openai = new OpenAIApi({
    apiKey: "sk-YourApiKeyHere",
});

const DEFAULT_OPTIONS = {
    max: 2,
}
// Function to read all PDF files in a folder and extract text from the first two pages
async function extractTextFromPDFs(folderName) {
    
    var numReqTextFound = 0;
    const folderPath = path.join(__dirname, folderName);// Get the absolute path of the folder
    const files = fs.readdirSync(folderPath);// Read all files in the folder
    
    for (const file of files) {

        const filePath = path.join(folderPath, file);
        const dataBuffer = fs.readFileSync(filePath);// Read the PDF file
        
        pdfParse(dataBuffer,DEFAULT_OPTIONS).then(async function(data) {
            
            var jsonText = await getResponse(data.text);
            var jsonTextObj = JSON.parse(jsonText);

            if(jsonTextObj['List of Required Textbooks'].length > 0){
                numReqTextFound++;
                console.log("Num PDF Text Found: " + numReqTextFound);
                // console.log(jsonTextObj);
                
                let rawdata = fs.readFileSync('foundTexts.json');
                let foundTexts = JSON.parse(rawdata);
                foundTexts.push(jsonTextObj);

                fs.writeFileSync('foundTexts.json', JSON.stringify(foundTexts),function(err){//add pdf textbooks object to a json file
                    if(err) throw err;
                });
            }
        });
        await sleep(20);//rate limit to request every 20 seconds, 3 requests per minute for GPT-3
        break; // Remove this line to process all PDFs in the folder
    }
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
        max_tokens: 300,
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

// Call the function with the folder name
const folderName = 'allPDFs';
extractTextFromPDFs(folderName);
