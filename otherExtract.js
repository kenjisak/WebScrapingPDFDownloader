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
function extractTextFromPDFs(folderName) {
    try {
        // Get the absolute path of the folder
        const folderPath = path.join(__dirname, folderName);

        // Read all files in the folder
        const files = fs.readdirSync(folderPath);
        var numReqTextFound = 0;

        // Loop through each file
        for (const file of files) {
            // Check if the file is a PDF
            const filePath = path.join(folderPath, file);

            // Read the PDF file
            const dataBuffer = fs.readFileSync(filePath);
            
            
            pdfParse(dataBuffer,DEFAULT_OPTIONS).then(async function(data) {
                
                var jsonText = await getResponse(data.text);
                
                var jsonTextObj = JSON.parse(jsonText);
                if(jsonTextObj['List of Required Textbooks'].length > 0){
                    numReqTextFound++;
                    console.log("Num PDF Text Found: " + numReqTextFound);
                    // console.log(jsonTextObj);
                    //append this json format object to a json file, make it a list of json objects

                    let rawdata = fs.readFileSync('foundTexts.json');
                    let foundTexts = JSON.parse(rawdata);

                    foundTexts.push(jsonTextObj);
                    fs.writeFileSync('foundTexts.json', JSON.stringify(foundTexts),function(err){
                        if(err) throw err;
                    });
                }

            });
            break; // Remove this line to process all PDFs in the folder
        }
        
    } catch (error) {
        console.error('Error:', error);
    }
}


const getResponse = async (prompt) => {
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

// Call the function with the folder name
const folderName = 'allPDFs';
extractTextFromPDFs(folderName);
